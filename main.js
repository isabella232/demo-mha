$(window).load(function(){
// INITIALIZATION
// ==============

// Replace with your own App details
var APPLICATION_ID = '8RN20T1NDJ';
var SEARCH_ONLY_API_KEY = 'c9c14a2d9e24d14d85d2ae0a2ee235df';
var INDEX_NAME = 'nycwell_052317';
var HITS_PER_PAGE = 10
var PARAMS = { 
	hitsPerPage: HITS_PER_PAGE,
	facets: ['county', 'specialPopulations', 'insurancesAccepted', 'ageGroup', 'type'] 
};

// Client + Helper initialization
var algolia = algoliasearch(APPLICATION_ID, SEARCH_ONLY_API_KEY);
var algoliaHelper = algoliasearchHelper(algolia, INDEX_NAME, PARAMS);
var index = algolia.initIndex(INDEX_NAME)

// DOM BINDING
var result_data = [];
var $stats = $('#stats');
var $results = $(".algolia-results");
var $inputfield = $(".algolia-input-search");
var $pagination = $(".algolia-pagination");
var $facets = $('.algolia-facets');
var $facet_container = $('.algolia-facets-container')

$facets.on('click', handleFacetClick);

// Hogan templates binding
var statsTemplate = Hogan.compile($('#stats-template').text());
var resultTemplate = Hogan.compile($('#results-template').text());

// Initial search
//=====================
if (window.location.search) {
	//set state if url param is defined
	var qs = window.location.search.substring(1)
	algoliaHelper.setState(algoliasearchHelper.url.getStateFromQueryString(qs)).search();
	$inputfield.val(algoliaHelper.getState().query);
} else {
	//search around a lat lng
	algoliaHelper.setQueryParameter('aroundLatLngViaIP', true).setQueryParameter('minimumAroundRadius', 8000).search();	
}

//SEARCH BINDING
//================

algoliaHelper.on('result', searchCallback);

function searchCallback (content, state) {
  	if (content.hits.length === 0) {
	    // If there is no result we display a friendly message, instead of an empty page.
	    $results.empty().html("No results");
	    $pagination.empty();
	    renderStats(content)
	    return;
	 }

	renderStats(content)
	renderHits(content)
	renderMap(content)
	renderPaginations($results, content);
	renderFacets($facet_container, content);
	renderRefinements()
}

//Input binding
$inputfield.keyup(function(e) {
	var query = $inputfield.val()
	algoliaHelper.setQuery(query).search()
});

// Update URL
algoliaHelper.on('change', function () {
    updateUrl();
});

function updateUrl(){
	var state = algoliaHelper.getState();
	var qs = algoliasearchHelper.url.getQueryStringFromState(state);
	history.pushState(null, null, '?'+qs);
}

// RENDER SEARCH COMPONENTS
// ========================
function renderStats(content) {
	var resultStart = (content.page * content.hitsPerPage) + 1;
	var resultEnd = 0;

	if (content.hits.length < content.hitsPerPage) {
		resultEnd = (content.page * content.hitsPerPage) + content.hits.length;	
	} else {
		resultEnd = (content.page * content.hitsPerPage) + content.hitsPerPage;
	}

	var stats = {
	  nbHits: content.nbHits,
	  nbHits_plural: content.nbHits !== 1,
	  processingTimeMS: content.processingTimeMS,
	  resultStart: resultStart,
	  resultEnd: resultEnd
	};

	$stats.html(statsTemplate.render(stats));
}

function renderHits(content) {
	var hits = content.hits;
	//cache result hits
	result_data = hits

	//add more result details
	for (var i=0; i < hits.length; i++) {
		var hit = hits[i];
		var highlighted = hit._highlightResult;

		content.hits[i].index = i;
		content.hits[i].highlightSnippetAttributes = renderHighlightsSnippets(hit);
		content.hits[i].address = hit.street !== ' ' ? hit.street+'  '+highlighted.county.value+'  '+hit.state+'  '+hit.zip : '';
	}

	$results.html(resultTemplate.render(content));

	$('.algolia-result').click(function(){
		//open info window of marker
		var objectID = $(this).data('objectid');
		var markerSelected = markerResultMap[objectID];
		google.maps.event.trigger(markerSelected, 'click');

		//show More Detail Button
		$('.algolia-result-details-btn-active').removeClass('algolia-result-details-btn-active');
		$('#algolia-result-details-btn-'+objectID).addClass('algolia-result-details-btn-active')
		$('.algolia-result-details-btn').click(renderModal)
	})
}

//specify attributes to exclude 
//grab all related values {attr: <em>xxx</em>}
//order these obj based on importance of attr

//display results with labels 
	//specialty trimmed 

function renderHighlightsSnippets(hit){
	//render highlights/snippets from searchable attributes 
	var highlighted = hit._highlightResult;
	var snippet = hit._snippetResult
	var results = '';

	//order: specialties > parentAgency > description
	//parse relevant specialties
	var displaySpecialty = [];
	var sortedSpecialty = highlighted.specialties.sort(function(a,b) { return (a.matchLevel !== 'none')?  -1 : 1; })	
	var sortedSpecialtySliced = sortedSpecialty.splice(0,2)	
	for (var i=0; i < sortedSpecialtySliced.length; i++) {
		displaySpecialty.push(sortedSpecialtySliced[i].value)
	}
	results += '<b>Specialties include: </b>'+ displaySpecialty.join(', ') +
			        ' ..';

	//parse relevant parentAgency
	if (results.indexOf('<em>') < 0) {
		var parentAgency = highlighted.parentAgency
		if (parentAgency.matchLevel !== 'none') {
			results = '<b>Parent Agency: </b>'+' '+parentAgency.value;
		}
	}

	//parse relevant desc snippets
	if (results.indexOf('<em>') < 0) {
		var snippet = hit._snippetResult
		for (var key in snippet) {
			if (snippet[key].matchLevel !== 'none') {
				results = '<b>Description: </b>'+'..'+snippet[key].value+
			        ' ..';
			}
		}
	}

	return results;
}

function renderPaginations ($results_container, results_data) {

	var currPage = algoliaHelper.getPage()

	var previousPage = currPage ? '<li class="page-item" id="previousPage">'+
'      <a class="page-link" href="#search-container" aria-label="Previous"> Previous'+
'      </a>'+
'    </li>' : '';
	
	var nextPage = '';

	if (results_data.hits.length == HITS_PER_PAGE) {
		nextPage = '<li class="page-item" id="nextPage">'+
	'      <a class="page-link" href="#search-container" aria-label="Next"> Next'+
	'      </a>'+
	'    </li>';
	}
	
	var pagination = '<nav aria-label="Page navigation example">'+
'  <ul class="pagination">'+  previousPage + nextPage +
'  </ul>'+
'</nav>';

	$pagination.html(pagination);

	$('#previousPage').on('click', getPreviousPage)
	$('#nextPage').on('click', getNextPage)
}

function getNextPage() {
	var currPage = algoliaHelper.getPage()
	algoliaHelper.setPage(currPage).nextPage().search()
}

function getPreviousPage() {
	var currPage = algoliaHelper.getPage()
	algoliaHelper.setPage(currPage).previousPage().search()
}

function renderModal(e) {
	var hitIndex = $(e.target).data( "hit" );
	var data = result_data[hitIndex]; 

	$('.modal-programName').html(data.programName)
	$('.modal-parentAgency').html(data.parentAgency)	 
	$('.modal-address').html(data.street + ' ' + data.state + ' ' + data.zip)
	$('.modal-website').html('<a href="'+data.website+'">'+data.website+'</a>')
	$('.modal-email').html('<a>'+data.email +'</a>')
	$('.modal-tel').html('<a>'+data.phone.join(', ')+'</a>')
	$('.modal-fax').html('<a>'+ data.fax +'</a>')
	$('.modal-specialties').html(data.specialties.join(', '))
	$('.modal-description').html(data.description)
	$('.modal-special-population').html(data.specialPopulations.join(', '))
	$('.modal-walkins').html(data.walkIns.join(', '))
	$('.modal-walkinhour').html(data.walkInHours)
	$('.modal-samedayappoint').html(data.sameDayAppointments)
	$('.modal-slidingScale').html(data.slidingScale.join(', '))
	$('.modal-freeServices').html(data.freeServices.join(', '))
	$('.modal-eligibility').html(data.eligibility)
	$('.modal-insurance').html(data.insurancesAccepted.join(', '))
	$('.modal-language').html(data.languages.join(', '))
	$('.modal-hours').html(data.hours.join('<br>'))
	$('.modal-disability').html(data.wheelchair)
}

function renderRefinements() {

	var facets = ['ageGroup', 'county', 'insurancesAccepted', 'specialPopulations'];
	var refinements = {}
	var totalRefine = 0;

	for (var i=0; i < facets.length; i++) {

		var refine = algoliaHelper.getRefinements(facets[i]);
		totalRefine += refine.length;

		//show filter label
		if (totalRefine == 0) {
			$('.filter-label').hide();
		} else {
			$('.filter-label').show()	
		}

		//format refinement filters
		for (var j=0; j < refine.length; j++) {
			var refineVal = refine[j].value
			refinements[refineVal] = facets[i]
		}
	}

	var filter_html = ''
	for (var key in refinements) {
		var attribute = refinements[key];
		var value = key;
		filter_html += '<div class="algolia-facet-selected-chip" data-value="'+value+'"><div>'+value+'<span class="glyphicon glyphicon-remove" aria-hidden="true"></span></div></div>';
	}

	$('.filter-chips').html(filter_html)
	
	$('.algolia-facet-selected-chip').on('click', function(e){
		e.preventDefault();

		var value = $(this).data('value')
		var attribute = refinements[value]
		
		if(!attribute || !value) return;
		algoliaHelper.toggleRefine(attribute, value).search();

	})
}

function createMarker(map, hit, i) {
	var contentString = '<div id="content">'+
    '<h5 class="markerHeading" data-lat="'+hit._geoloc.lat+'" data-lng="'+hit._geoloc.lng+'">'+hit.programName+'</h5>'+
    '<div class="markerBody">'+
    '<p>'+hit.address+'</p>'+
    '<a href="http://'+hit.website+'">'+hit.website+'</a>'+
    '</div>';

    var infowindow = new google.maps.InfoWindow({
      content: contentString
    });

    var marker = new google.maps.Marker({
      position: {lat: hit._geoloc.lat, lng: hit._geoloc.lng},
      map: map,
      program: hit.programName
    });

    //add info window & scroll result into view
    marker.addListener('click', function(){
		closeLastOpenedInfoWindow()
    	infowindow.open(map, this);
    	lastOpenedInfoWindow = infowindow;
		scrollResultIntoView(hit.objectID);
    });

    return marker;
}

function scrollResultIntoView(objectID){
	$('.algolia-active-result').removeClass("algolia-active-result");
	var element = $('#algolia-result-'+objectID);
    element[0].scrollIntoView();
    element.addClass("algolia-active-result");

    $('.algolia-result-details-btn-active').removeClass('algolia-result-details-btn-active');
	$('#algolia-result-details-btn-'+objectID).addClass('algolia-result-details-btn-active')
}

function closeLastOpenedInfoWindow() {
	if (lastOpenedInfoWindow) {
		lastOpenedInfoWindow.close();
	}
}

//Render markers on map
var lastOpenedInfoWindow; 
var fitMapToMarkersAutomatically = true;
var markerResultMap = {};

function renderMap (content) {
	//initialize map
	var map = new google.maps.Map(document.getElementById('map'), { streetViewControl: false, mapTypeControl: false, zoom: 2, minZoom: 1, maxZoom: 15 });
	var markers = [];
    
	// Add the markers to the map
	for (var i = 0; i < content.hits.length; ++i) {
		var hit = content.hits[i];
		if (hit._geoloc) {
		    var marker = createMarker(map, hit, i);
		    markerResultMap[hit.objectID] = marker;
		    markers.push(marker);
		}
	}

	// Automatically fit the map zoom and position to see the markers
	if (fitMapToMarkersAutomatically) {
		var mapBounds = new google.maps.LatLngBounds();
		for (i = 0; i < markers.length; i++) {
		  mapBounds.extend(markers[i].getPosition());
		}
		map.fitBounds(mapBounds);
	}

	//retrieve center
	google.maps.event.addListener(map, "dragend", function() {
		algoliaHelper.setQueryParameter('aroundLatLng', [map.getCenter().lat(),map.getCenter().lng()].join(', ')).setQueryParameter('aroundLatLngViaIP', false).search();
    });
}
algoliaHelper.on('result', function(content, state) {
	

});

//Render facet values
function renderFacets($facet_container, results) {

  var facets = results.facets.map(function(facet) {
    var name = facet.name;
  	$('#btn-'+name+'-dropdown-menu').html('');

    //handle facet clicks
    // $('#btn-'+name+'-dropdown-menu').on('click', handleFacetClick);
	
    var facetValues = results.getFacetValues(name)

    var facetsValuesList = $.map(facetValues, function(facetValue) {
      var facetValueClass = facetValue.isRefined ? 'refined'  : '';

      var valueAndCount = '<a class="facet-selection" data-attribute="' + name + '" data-value="' + facetValue.name + '" href="#">' + facetValue.name + ' (' + facetValue.count + ')' + '</a>';

      return '<li class="' + facetValueClass + '">' + valueAndCount + '</li>';
      
    })

  //   $('.facet-checkbox').click(function(){
  //   	if ($(this).is(':checked')) {
		// 	$(this).parent().fadeTo('slow', 0.5);
		// 	$(this).attr('checked'); //This line
		// }else{

		// 	$(this).parent().fadeTo('slow', 1);
		// 	$(this).removeAttr('checked');
		// }
  //   })

    var facetList = facetsValuesList.join('')

    $('#btn-'+name+'-dropdown-menu').html(facetList)
  });

}

// faceting
function handleFacetClick(e) {
	e.preventDefault();

	var target = e.target;
	var attribute = target.dataset.attribute;
	var value = target.dataset.value;
	if(!attribute || !value) return;
  	
	algoliaHelper.toggleRefine(attribute, value).search();

	renderRefinements()
}



});