$(window).load(function(){

var APPLICATION_ID = '8RN20T1NDJ';
var SEARCH_ONLY_API_KEY = 'c9c14a2d9e24d14d85d2ae0a2ee235df';
var INDEX_NAME = 'nycwell_050117';
var PARAMS = { 
	hitsPerPage: 10,
	facets: ['insurancesAccepted', 'specialPopulations', 'coverage', 'county', 'categories'] 
};

// Client + Helper initialization
var algolia = algoliasearch(APPLICATION_ID, SEARCH_ONLY_API_KEY);
var algoliaHelper = algoliasearchHelper(algolia, INDEX_NAME, PARAMS);

algoliaHelper.on('result', searchCallback);

algoliaHelper.setQueryParameter('minimumAroundRadius', 8000).search();

var $results_container = $(".algolia-results");
var $inputfield = $(".algolia-input-search");

$inputfield.keyup(function(e) {
  algoliaHelper.setQuery($inputfield.val()).search();
});

// Render Results
function renderResults ($results_container, results_data) {
	var results =  results_data.hits.map(function renderHit(hit) {
		var highlighted = hit._highlightResult;
		return (
			'<div class="algolia-result">'+
			    '<div class="algolia-result-share-container">'+
			        '<img class="algolia-result-share-icon" src="share-icon.png">'+
			    '</div>'+
			    '<div class="algolia-result-content">'+
			        '<p class="algolia-result-content-type">Clinic</p>'+
			        '<p class="algolia-result-content-name">'+highlighted.programName.value+'</p>'+
			        '<p class="algolia-result-content-address">'+
			            '<span>'+hit.street+'</span>'+
			            '<span>'+hit.city+' , '+hit.state+' '+hit.zip+'</span>'+
			        '</p>'+
			        '<p class="algolia-result-content-tel">'+
			            '<span>Tel: </span><span>'+hit.phone+'</span>'+
			        '</p>'+
			        '<p class="algolia-result-content-availability">'+
			            '<span class="open">Open</span>'+
			        '</p>'+
			    '</div>'+
			'</div>'
		);
	})

	var currPage = algoliaHelper.getPage()

	var previousPage = currPage ? '<li class="page-item" id="previousPage">'+
'      <a class="page-link" href="#" aria-label="Previous">'+
'        <span aria-hidden="true">&laquo;</span>'+
'        <span class="sr-only">Previous</span>'+
'      </a>'+
'    </li>' : '';

	var nextPage = '<li class="page-item" id="nextPage">'+
'      <a class="page-link" href="#" aria-label="Next">'+
'        <span aria-hidden="true">&raquo;</span>'+
'        <span class="sr-only">Next</span>'+
'      </a>'+
'    </li>';

	var pagination = '<nav aria-label="Page navigation example">'+
'  <ul class="pagination">'+  previousPage + nextPage +
'  </ul>'+
'</nav>';

	$results_container.html(results);

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

function searchCallback (content, state) {
  	if (content.hits.length === 0) {
	    // If there is no result we display a friendly message
	    // instead of an empty page.
	    $results_container.empty().html("No results");
	    return;
	 }
	renderResults($results_container, content);
	renderFacets($facet_container, content);
	var $facets = $('.facets');
	$facets.on('click', handleFacetClick);
}

//marker 
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

// faceting
var $facet_container = $('.algolia-facets-container')
var facetValSelected = {insurancesAccepted: [], county: [], categories: []};

function handleFacetClick(e) {
  e.preventDefault();
  var target = e.target;
  var attribute = target.dataset.attribute;
  var value = target.dataset.value;
  if(!attribute || !value) return;
  if (facetValSelected[attribute].length > 0) {
  	if (value == facetValSelected[attribute][0]) {
  		algoliaHelper.clearRefinements(attribute).search();
  		facetValSelected[attribute] = []
  	} else {
  		facetValSelected[attribute] = [value]
  		algoliaHelper.clearRefinements(attribute).toggleRefine(attribute, value).search();
  	}
  } else {
  	algoliaHelper.toggleRefine(attribute, value).search();
  	facetValSelected[attribute].push(value)
  }
}

function renderFacets($facet_container, results) {
  var facets = results.facets.map(function(facet) {
    var name = facet.name;
	
  	// button style
  	var styles = {
  		insurancesAccepted: {name: 'Insurance', style: 'danger'},
  		county: {name: 'Borough', style: 'warning'},
  		categories: {name: 'Special Populations', style: 'success'},
  	}

    var facetValues = results.getFacetValues(name).sort(function(a,b){
    	return a.name - b.name
    });

    var facetsValuesList = $.map(facetValues, function(facetValue) {
      var facetValueClass = facetValue.isRefined ? 'refined'  : '';
      return '<li class="facets '+facetValueClass+'" ><a data-attribute="' + name + '" data-value="' + facetValue.name + '">' + facetValue.name + '</a></li>';
      
    })

    if (styles[name]) {
	  	var button_selected_html = ''; 

	  	selectedAtt = facetValSelected[name]
	  	if (selectedAtt.length > 0) {
	  		button_selected_html = facetValSelected[name][0];
	  	} else {
	  		button_selected_html = styles[name].name
	  	}

	  	var buttonHtml = '<div class="btn-group algolia-facets-item">'+
		  '<button type="button" class="btn btn-'+styles[name].style+' '+name+'">'+button_selected_html+'</button>'+
		  '<button type="button" class="btn btn-'+styles[name].style+' dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">'+
		    '<span class="caret"></span>'+
		    '<span class="sr-only">Toggle Dropdown</span>'+
		  '</button>'+
		  '<ul class=" dropdown-menu">'+
		    facetsValuesList.join('') +
		  '</ul>'+
		'</div>';

	    return buttonHtml;    	
    }
  });
  $facet_container.html(facets);	
}

});