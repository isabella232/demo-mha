$(window).load(function(){

// Client + Helper initialization
var APPLICATION_ID = '8RN20T1NDJ';
var SEARCH_ONLY_API_KEY = 'c9c14a2d9e24d14d85d2ae0a2ee235df';
var INDEX_NAME = 'nycwell_052317';
var PARAMS = { 
	hitsPerPage: 4,
	facets: ['county', 'specialPopulations', 'insurancesAccepted', 'ageGroup', 'type'] 
};

var algolia = algoliasearch(APPLICATION_ID, SEARCH_ONLY_API_KEY);
var algoliaHelper = algoliasearchHelper(algolia, INDEX_NAME, PARAMS);
var index = algolia.initIndex(INDEX_NAME)


var $results_container = $(".algolia-results");
var $inputfield = $(".algolia-input-search");
var $pagination = $(".algolia-pagination");
var $facets = $('.algolia-facets');
$facets.on('click', handleFacetClick);

var result_data = [];

//if url param is defined, set state || otherwise, search around 8km================
if (window.location.search) {
	var qs = window.location.search.substring(1)
	algoliaHelper.setState(algoliasearchHelper.url.getStateFromQueryString(qs)).search();
	$inputfield.val(algoliaHelper.getState().query);
}
else {
	algoliaHelper.setQueryParameter('minimumAroundRadius', 8000).search();	
}

function updateUrl(){
	var state = algoliaHelper.getState();
	var qs = algoliasearchHelper.url.getQueryStringFromState(state);
	history.pushState(null, null, '?'+qs);
}

//Search ==============================================================
algoliaHelper.on('result', searchCallback);

$inputfield.keyup(function(e) {
	var query = $inputfield.val()
	algoliaHelper.setQuery(query).search()
	updateUrl()
});

function searchCallback (content, state) {
  	if (content.hits.length === 0) {
	    // If there is no result we display a friendly message, instead of an empty page.
	    $results_container.empty().html("No results");
	    $pagination.empty();
	    return;
	 }
	renderResults($results_container, content);
	renderFacets($facet_container, content);
	displayRefinements()

	$('.numHits').html(content.nbHits)
	$('.processTime').html(content.processingTimeMS)

}


// Render Results=======================================================================


function renderResults ($results_container, results_data) {

	var results =  results_data.hits.map(function renderHit(hit, j) {
		//cache result sets
		result_data = results_data.hits
		// result_data.push(hit)

		var highlighted = hit._highlightResult;
		
		//highlighted specialty
		var sortedSpecialty = hit._highlightResult.specialties.sort(function(a,b) { return (a.matchLevel !== 'none')?  -1 : 1; })
		var sortedSpecialtySliced = sortedSpecialty.splice(0,6)
		var displaySpecialty = [];
		for (var i=0; i < sortedSpecialtySliced.length; i++) {
			displaySpecialty.push(sortedSpecialtySliced[i].value)
		}
		var highlightedSpecialties = displaySpecialty.join(', ')
		//----------------------

		var address = hit.street !== ' ' ? hit.street+'  '+hit.city+'  '+hit.state+'  '+hit.zip : ''
		return (
			'<div class="algolia-result" data-toggle="modal" data-target="#myModal" >'+
			    '<div class="algolia-result-share-container" data-hit="'+j+'">'+
			        '<img class="algolia-result-share-icon" src="share-icon.png">'+
			    '</div>'+
			    '<div class="algolia-result-content" data-hit="'+j+'">'+
			        '<p class="algolia-result-content-name"data-hit="'+j+'" >'+highlighted.programName.value+'</p>'+
			        '<p class="algolia-result-content-address" data-hit="'+j+'">'+
			            '<span data-hit="'+j+'">'+address+'</span>'+    
			        '</p>'+
			        '<p class="algolia-result-content-tel" data-hit="'+j+'">'+
			            '<span><a href="'+hit.website+'">'+hit.website+'</a></span>'+
			        '</p>'+
			        '<p data-hit="'+j+'"><b>Specialties include: </b>'+highlightedSpecialties+
			        ' [..]</p>'+
			    '</div>'+
			'</div>'
		);
	})

	var currPage = algoliaHelper.getPage()

	var previousPage = currPage ? '<li class="page-item" id="previousPage">'+
'      <a class="page-link" href="#" aria-label="Previous"> Previous'+
'      </a>'+
'    </li>' : '';
	
	var nextPage = '';
	
	// var totalPagesAvail = results_data.nbHits/3

	if (results_data.hits.length == 4) {
		nextPage = '<li class="page-item" id="nextPage">'+
	'      <a class="page-link" href="#" aria-label="Next"> Next'+
	'      </a>'+
	'    </li>';
	}
	
	var pagination = '<nav aria-label="Page navigation example">'+
'  <ul class="pagination">'+  previousPage + nextPage +
'  </ul>'+
'</nav>';
	
	// var pagination = '<button class="btn btn-primary" id="showMore">Show More</button>';

	$results_container.html(results);
	$pagination.html(pagination);

	$('#showMore').on('click', showMore)
	$('#previousPage').on('click', getPreviousPage)
	$('#nextPage').on('click', getNextPage)

	$('.algolia-showMore').on('click', showMore)
	$('.algolia-result').on('click', fillResultModal)
}

// Render Modal=======================================================================

function fillResultModal(e) {
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

function showMore() {
	
}

function getNextPage() {
	var currPage = algoliaHelper.getPage()
	algoliaHelper.setPage(currPage).nextPage().search()
}

function getPreviousPage() {
	var currPage = algoliaHelper.getPage()
	algoliaHelper.setPage(currPage).previousPage().search()
}

//markers=============================================================================================== 
var fitMapToMarkersAutomatically = true;
algoliaHelper.on('result', function(content, state) {
	//initialize map
	var map = new google.maps.Map(document.getElementById('map'), { streetViewControl: false, mapTypeControl: false, zoom: 2, minZoom: 5, maxZoom: 20 });
	var markers = [];
    
	// Add the markers to the map
	for (var i = 0; i < content.hits.length; ++i) {
		var hit = content.hits[i];
		if (content.hits[i]._geoloc) {
		    var marker = new google.maps.Marker({
		      position: {lat: hit._geoloc.lat, lng: hit._geoloc.lng},
		      map: map
		    });
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
		algoliaHelper.setQueryParameter('aroundLatLng', [map.getCenter().lat(),map.getCenter().lng()].join(', ')).search();
    });

});

//refinement========================================================================
function displayRefinements() {

	var facets = ['ageGroup', 'county', 'insurancesAccepted', 'specialPopulations'];
	var refinements = {}
	var totalRefine = 0;

	for (var i=0; i < facets.length; i++) {

		var refine = algoliaHelper.getRefinements(facets[i]);
		totalRefine += refine.length;

		//display count of refinements on facet
		if (refine.length > 0) {
			$('.filter-label').show()	
			$('#'+facets[i]+'-refinement-count').html('('+refine.length+')')	
		} else {
			$('#'+facets[i]+'-refinement-count').html('')
		}

		if (totalRefine == 0) {
			$('.filter-label').hide();
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
		filter_html += '<span class="algolia-facet-selected-chip"><span>'+value+'<span class="glyphicon glyphicon-remove" aria-hidden="true"></span></span></span>';
	}

	$('.filter-chips').html(filter_html)
	
	$('.algolia-facet-selected-chip').on('click', function(e){
		e.preventDefault();

		var target = e.target;
		var value = $(target).text();
		var attribute = refinements[value]
		
		if(!attribute || !value) return;
		algoliaHelper.toggleRefine(attribute, value).search();

		updateUrl()
	})

}

// faceting==============================================================================
var $facet_container = $('.algolia-facets-container')

function handleFacetClick(e) {
	e.preventDefault();

	var target = e.target;
	var attribute = target.dataset.attribute;
	var value = target.dataset.value;
	if(!attribute || !value) return;
  	
	algoliaHelper.toggleRefine(attribute, value).search();

	updateUrl()
	displayRefinements()
}

//Render facet values==========================================================================
function renderFacets($facet_container, results) {

  var facet_html_arr = [];

  var facets = results.facets.map(function(facet) {
    var name = facet.name;

    //handle facet clicks
    // $('#btn-'+name+'-dropdown-menu').on('click', handleFacetClick);
	
    var facetValues = results.getFacetValues(name)

    var facetsValuesList = $.map(facetValues, function(facetValue) {
      var facetValueClass = facetValue.isRefined ? 'refined'  : '';

      var valueAndCount = '<a data-attribute="' + name + '" data-value="' + facetValue.name + '" href="#">' + facetValue.name + ' (' + facetValue.count + ')' + '</a>';

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

});