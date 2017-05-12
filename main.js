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

function renderResults ($results_container, results_data) {
	var results =  results_data.hits.map(function renderHit(hit) {
		return (
			'<div class="algolia-result">'+
			    '<div class="algolia-result-share-container">'+
			        '<img class="algolia-result-share-icon" src="share-icon.png">'+
			    '</div>'+
			    '<div class="algolia-result-content">'+
			        '<p class="algolia-result-content-type">Clinic</p>'+
			        '<p class="algolia-result-content-name">'+hit.programName+'</p>'+
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

	$results_container.html(results);
}

var map = new google.maps.Map(document.getElementById('map'), { streetViewControl: false, mapTypeControl: false, zoom: 4, minZoom: 3, maxZoom: 12 });

//marker 
var fitMapToMarkersAutomatically = true;
algoliaHelper.on('result', function(content, state) {
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
});
//--------------------------------

function searchCallback (content, state) {
  	
  	if (content.hits.length === 0) {
	    // If there is no result we display a friendly message
	    // instead of an empty page.
	    $results_container.empty().html("No results");
	    return;
	 }

	renderResults($results_container, content);
	renderFacets($facet_container, content);
}

//------------------------------------------------------------------------

// faceting
// helper.toggleRefine('Movies & TV Shows')
//       .toggleRefine('Free shipping')
//       .search();
var $facets = $('.facets');
var $facet_container = $('.algolia-facets-container')
// $facets.on('change', handleFacetClick);

function handleFacetClick(e) {
  e.preventDefault();
  var target = e.target;
  var attribute = target.dataset.attribute;
  var value = target.dataset.value;
  console.log(attribute,value)
  if(!attribute || !value) return;
  algoliaHelper.toggleRefine(attribute, value).search();
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

    // var header = '<h4>' + name + '</h4>';
    var facetValues = results.getFacetValues(name);

    var facetsValuesList = $.map(facetValues, function(facetValue) {
      var facetValueClass = facetValue.isRefined ? 'refined'  : '';
      return '<li class="facets '+facetValueClass+'" data-attribute="' + name + '" data-value="' + facetValue.name + '" onclick="handleFacetClick"><a>' + facetValue.name + '</a></li>';
      
    })
    // console.log(facetsValuesList.join('') )

    if (styles[name]) {
	  	
	  	var buttonHtml = '<div class="btn-group">'+
		  '<button type="button" class="btn btn-'+styles[name].style+'">'+styles[name].name+'</button>'+
		  '<button type="button" class="btn btn-'+styles[name].style+' dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">'+
		    '<span class="caret"></span>'+
		    '<span class="sr-only">Toggle Dropdown</span>'+
		  '</button>'+
		  '<ul class="dropdown-menu">'+
		    facetsValuesList.join('') +
		  '</ul>'+
		'</div>';

	    return buttonHtml;    	
    }


    // return header + '<select class="facets">' + facetsValuesList.join('') + '</select>';
  });

  $facet_container.html(facets);	
  // $facet_container.html(facets.join(''));
}






});