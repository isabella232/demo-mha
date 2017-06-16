$(window).load(function(){
// INITIALIZATION
// ==============

// Replace with your own App info
var APPLICATION_ID = '8RN20T1NDJ';
var SEARCH_ONLY_API_KEY = 'c9c14a2d9e24d14d85d2ae0a2ee235df';
var INDEX_NAME = 'nycwell_052317';
var HITS_PER_PAGE = 10
var PARAMS = { 
	hitsPerPage: HITS_PER_PAGE,
	facets: ['specialPopulations', 'insurancesAccepted', 'ageGroup', 'county'] 
};
//Map facets to facet buttons
var facetLabelMap = {
	specialPopulations: 'Special Population',
	insurancesAccepted: 'Insurance',
	ageGroup: 'Age',
	county: 'Borough'
}
//Order the attributes with highlighting to display in the result
var orderedHighlightedAttr = ['specialties', 'parentAgency', 'description']

// Client + Helper initialization
var algolia = algoliasearch(APPLICATION_ID, SEARCH_ONLY_API_KEY);
var algoliaHelper = algoliasearchHelper(algolia, INDEX_NAME, PARAMS);
var index = algolia.initIndex(INDEX_NAME)

// DOM BINDING
var hits = [];
var facets = [];

var $stats = $('.algolia-stats');
var $results = $(".algolia-results");
var $inputfield = $(".algolia-input-search");
var $pagination = $(".algolia-pagination");
var $facets = $('.algolia-facets');
var $filterChips = $('.algolia-refinement-chips');
var $refinement = $(".algolia-refinements")
var $facetsContainer = $('.algolia-facets-container');

// Hogan templates binding
var statsTemplate = Hogan.compile($('#stats-template').text());
var resultTemplate = Hogan.compile($('#results-template').text());
var paginationTemplate = Hogan.compile($('#pagination-template').text());
var resultModalTemplate = Hogan.compile($('#result-modal-template').text());
var refinementTemplate = Hogan.compile($('#refinement-template').text());
var facetTemplate = Hogan.compile($('#facet-template').text());


// Initial search
//=====================
if (window.location.search) {
	//set state if url param is defined
	var qs = window.location.search.substring(1)
	algoliaHelper.setState(algoliasearchHelper.url.getStateFromQueryString(qs)).search();
	$inputfield.val(algoliaHelper.getState().query);
} else {
	//search around users location
	algoliaHelper.setQueryParameter('aroundLatLngViaIP', true).setQueryParameter('minimumAroundRadius', 8000).search();	
}

//SEARCH BINDING
//================

algoliaHelper.on('result', searchCallback);

function searchCallback (content, state) {
	hits = content.hits;
	facets = content.facets;
	renderStats(content);
	renderHits(content);
	renderMap(content);
	renderPaginations(content);
	renderFacets($facetsContainer, content);
	renderRefinements();
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

//HITS
function renderHits(content) {
	if (content.hits.length === 0) {
		//No Results
	    $results.html("");
	    $pagination.empty();
	    $stats.html('No Clinics Found');

	 } else {
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
			var objectID = $(this).data('objectid');
			toggleMapMarkerInfoWindow(objectID);
		})
	 }
}

function highlightResult(objectID) {
	$('.algolia-active-result').removeClass("algolia-active-result");
	$('#algolia-result-'+objectID).addClass("algolia-active-result");
	showResultDetailsButton(objectID);
}

function scrollResultIntoView(objectID) {
	var element = $('#algolia-result-'+objectID);
    element[0].scrollIntoView();
}

function showResultDetailsButton(objectID) {
	$('.algolia-result-details-btn-active').removeClass('algolia-result-details-btn-active');
	$('#algolia-result-details-btn-'+objectID).addClass('algolia-result-details-btn-active')
	$('.algolia-result-details-btn').click(renderModal)
}

//HIGHLIGHTS SNIPPETS
function renderHighlightsSnippets(hit){
	var results = '';
	var highlighted = getHighlightSnippets(hit);

	//parse relevant highlights
	for (var i=0; i < orderedHighlightedAttr.length; i++) {
		if (results.indexOf('<em>') < 0) {
			var attr = orderedHighlightedAttr[i];

			if (highlighted[attr]) {
				if (attr == 'specialties') {
					displaySpecialty = limitArrayOfHighlightedResults(highlighted[attr], 2);
					results = '<b>Specialties: </b>'+ displaySpecialty.join(', ') +
				        ' ..';
				}

				if (attr == 'parentAgency') {
					results = '<b>Parent Agency: </b>'+ highlighted[attr].value +
				        ' ..';
				}

				if (attr == 'description') {
					results = '<b>Description: </b>'+'..'+highlighted[attr].value+
				        ' ..';
				}
			}
		}
	}
	return results;
}

function getHighlightSnippets (hit) {
	var output = {}
	
	var highlighted = hit._highlightResult;
	var snippet = hit._snippetResult;

	for (var key in highlighted) {
		if (highlighted[key].matchLevel !== 'none') {
			output[key] = highlighted[key];
		}
	}

	for (var key in snippet) {
		if (snippet[key].matchLevel !== 'none') {
			output[key] = snippet[key];
		}
	}

	return output
}

function limitArrayOfHighlightedResults (highlightResult, limit) {
	var output = [];
	//sort results based on matching words
	var sortedResult = highlightResult.sort(function(a,b) { return (a.matchLevel !== 'none')?  -1 : 1; })	
	//limit results 
	var sliced = sortedResult.splice(0, limit)	
	//extract result values
	for (var i=0; i < sliced.length; i++) {
		output.push(sliced[i].value)
	}
	return output
}

//PAGINATION
function renderPaginations (content) {
	var pagination = {
		nextPage: content.hits.length == HITS_PER_PAGE,
		currPage: algoliaHelper.getPage()
	};
	$pagination.html(paginationTemplate.render(pagination));

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

//RESULT DETAIL MODAL
function renderModal(e) {
	var hitIndex = $(e.target).data( "hit" );
	var data = hits[hitIndex]; 
	var result = {
		programName: data.programName,
		parentAgency: data.parentAgency,
		address: data.street + ' ' + data.state + ' ' + data.zip,
		website: data.website,
		email: data.email,
		tel: data.phone.join(', '),
		fax: data.fax,
		specialties: data.specialties.join(', '),
		description: data.description,
		specialPop: data.specialPopulations.join(', '),
		walkins: data.walkIns.join(', '),
		walkinhour: data.walkInHours,
		samedayappoint: data.sameDayAppointments,
		slidingScale: data.slidingScale.join(', '),
		freeServices: data.freeServices.join(', '), 
		eligibility: data.eligibility, 
		insurance: data.insurancesAccepted.join(', '),
		language: data.languages.join(', '),
		hours: data.hours.join('<br>'),
		disability: data.wheelchair
	}
	$('#result-modal').html(resultModalTemplate.render(result));
}

//REFINEMENT
function renderRefinements() {

	var refinements = {};
	var content = {}
	content['chips'] = [];
	content['hasRefine'] = false;

	//format refinement filters
	for (var i=0; i < facets.length; i++) {
		algoliaHelper.getRefinements(facets[i].name).map(function(r){
			refinements[r.value] = facets[i].name
			content['hasRefine'] = true;
		})
	}

	//get all refinement chips value
	for (var value in refinements) {
		content.chips.push({refinedValue: value})
	}
	
	$refinement.html(refinementTemplate.render(content));

	//Bind click event to refinement chips
	$('.algolia-facet-selected-chip').on('click', function(e){
		e.preventDefault();

		var value = $(this).data('value') //refined value
		var attribute = refinements[value] //refined attribute 
		
		if(!attribute || !value) return;
		algoliaHelper.toggleRefine(attribute, value).search();

	})
}

//MAP & MARKERS
var lastOpenedInfoWindow; 
var fitMapToMarkersAutomatically = true;
var markerResultMap = {};

function renderMap (content) {
	// Initialize map
	var map = new google.maps.Map(document.getElementById('map'), { streetViewControl: false, mapTypeControl: false, zoom: 2, minZoom: 1, maxZoom: 15 });
	var markers = [];
    
	// Add the markers to the map
	for (var i = 0; i < content.hits.length; ++i) {
		var hit = content.hits[i];
		if (hit._geoloc) {
		    var marker = createMarker(map, hit);
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

	// Trigger search when map is dragged
	google.maps.event.addListener(map, "dragend", function() {
		algoliaHelper.setQueryParameter('aroundLatLng', [map.getCenter().lat(),map.getCenter().lng()].join(', ')).setQueryParameter('aroundLatLngViaIP', false).search();
    });
}

function createMarkerInfoWindow(hit) {
	var contentString = '<div id="content">'+
    '<h5 class="markerHeading" data-lat="'+hit._geoloc.lat+'" data-lng="'+hit._geoloc.lng+'">'+hit.programName+'</h5>'+
    '<div class="markerBody">'+
    '<p>'+hit.address+'</p>'+
    '<a href="http://'+hit.website+'">'+hit.website+'</a>'+
    '</div>';

    var infowindow = new google.maps.InfoWindow({
      content: contentString
    });

    return infowindow;
}

function createMarker(map, hit) {
	var infowindow = createMarkerInfoWindow(hit);

    var marker = new google.maps.Marker({
      position: {lat: hit._geoloc.lat, lng: hit._geoloc.lng},
      map: map,
      program: hit.programName
    });

    marker.addListener('click', function(){
    	//add info window 
		closeLastOpenedInfoWindow()
    	infowindow.open(map, this);
    	lastOpenedInfoWindow = infowindow;

    	//highlight result
    	var objectID = hit.objectID;
		scrollResultIntoView(objectID);
		highlightResult(objectID);
    });

    return marker;
}

function closeLastOpenedInfoWindow() {
	if (lastOpenedInfoWindow) {
		lastOpenedInfoWindow.close();
	}
}

function toggleMapMarkerInfoWindow(objectID) {
	var markerSelected = markerResultMap[objectID];
	google.maps.event.trigger(markerSelected, 'click');
} 

//FACETS
function renderFacets($facet_container, results) {
	var content = {facets: []}
	results.facets.map(function(facet) {
		data = {}
		data['facetButtonLabel'] = facetLabelMap[facet.name];
		data['facetAttrName'] = facet.name;
		data['facetValueList'] = results.getFacetValues(facet.name);
	    content.facets.push(data)
	});

  	$facetsContainer.html(facetTemplate.render(content));
	$('.facet-selection').on('click', handleFacetClick);
}

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