$(window).load(function(){

var APPLICATION_ID = '8RN20T1NDJ';
var SEARCH_ONLY_API_KEY = 'c9c14a2d9e24d14d85d2ae0a2ee235df';
var INDEX_NAME = 'nycwell_052317';
var PARAMS = { 
	hitsPerPage: 4,
	facets: ['county', 'specialPopulations', 'insurancesAccepted', 'ageGroup', 'type'] 
};


// Client + Helper initialization
var algolia = algoliasearch(APPLICATION_ID, SEARCH_ONLY_API_KEY);
var algoliaHelper = algoliasearchHelper(algolia, INDEX_NAME, PARAMS);

var index = algolia.initIndex(INDEX_NAME)
index.getSettings(function(err, content) {
	console.log(err, content)
})

algoliaHelper.on('result', searchCallback);

algoliaHelper.setQueryParameter('minimumAroundRadius', 8000).search();

var $results_container = $(".algolia-results");
var $inputfield = $(".algolia-input-search");
var $pagination = $(".algolia-pagination");

var result_data = [];

$inputfield.keyup(function(e) {
  algoliaHelper.setQuery($inputfield.val()).search();
});

// Render Results
function renderResults ($results_container, results_data) {
	result_data = results_data.hits

	var results =  results_data.hits.map(function renderHit(hit, i) {

		var highlighted = hit._highlightResult;

		var address = hit.street !== ' ' ? hit.street+'  '+hit.city+'  '+hit.state+'  '+hit.zip : ''
		return (
			'<div class="algolia-result">'+
			    '<div class="algolia-result-share-container">'+
			        '<img class="algolia-result-share-icon" src="share-icon.png">'+
			    '</div>'+
			    '<div class="algolia-result-content" data-toggle="modal" data-target="#myModal">'+
			        '<p class="algolia-result-content-name" data-hit="'+i+'">'+highlighted.programName.value+'</p>'+
			        '<p class="algolia-result-content-address">'+
			            '<span>'+address+'</span>'+
			            
			        '</p>'+
			        '<p class="algolia-result-content-tel">'+
			            '<span><a href="'+hit.website+'">'+hit.website+'</a></span>'+
			        '</p>'+
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
	$('.algolia-result-content').on('click', fillResultModal)
}

function fillResultModal(e) {
	var hitIndex = $(e.target).data( "hit" );
	var data = result_data[hitIndex]; 
	console.log('jo',data)
	$('.modal-programName').html(data.programName)
	$('.modal-address').html(data.street + ' ' + data.state + ' ' + data.zip)
	$('.modal-website').html('<a href="'+data.website+'">'+data.website+'</a>')
	$('.modal-email').html('<a>'+data.email+'</a>')
	$('.modal-tel').html('<a>'+data.phone.join(', ')+'</a>')
	$('.modal-description').html(data.description)
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

function getSpecificPage(e) {
	var p = parseInt(e.target.innerHTML) - 1;
	algoliaHelper.setPage(p).search()
}

function searchCallback (content, state) {
  	if (content.hits.length === 0) {
	    // If there is no result we display a friendly message
	    // instead of an empty page.
	    $results_container.empty().html("No results");
	    $pagination.empty();
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
var facetValSelected = {insurancesAccepted: [], county: [], specialPopulations: [], ageGroup: [], type: []};
var facetValMap = {insurancesAccepted: 'Insurance', county: 'Borough', specialPopulations: 'Special Population', ageGroup: 'Age', type: []};

function handleFacetClick(e) {
  e.preventDefault();
  var target = e.target;
  var attribute = target.dataset.attribute;
  var value = target.dataset.value;
  if(!attribute || !value) return;
  if (facetValSelected[attribute].length > 0) {
  	
  	//If original value already selected --> clear facet
  	if (value == facetValSelected[attribute][0]) {
  		algoliaHelper.clearRefinements(attribute).search();
  		facetValSelected[attribute] = []
  		$('#btn-'+attribute+'-dropdown-name').html(facetValMap[attribute])

  	//Already selected facet --> toggle value
  	} else {
  		facetValSelected[attribute] = [value]
  		algoliaHelper.clearRefinements(attribute).toggleRefine(attribute, value).search();
  		$('#btn-'+attribute+'-dropdown-name').html(value)
  	}

  } else {
  	//Newly selected facet --> toggle value
  	algoliaHelper.toggleRefine(attribute, value).search();
  	facetValSelected[attribute].push(value)
  	$('#btn-'+attribute+'-dropdown-name').html(value)
  }

}

function renderFacets($facet_container, results) {
  var facet_html_arr = [];

  var facets = results.facets.map(function(facet) {
    var name = facet.name;
	
    var facetValues = results.getFacetValues(name).sort(function(a,b){
    	if (a.name < b.name) return -1;
    	if (a.name > b.name) return 1;
    	return 0;
    });

    var facetsValuesList = $.map(facetValues, function(facetValue) {
      var facetValueClass = facetValue.isRefined ? 'refined'  : '';
      return '<li class="facets '+facetValueClass+'" ><a data-attribute="' + name + '" data-value="' + facetValue.name + '">' + facetValue.name + '</a></li>';
      
    })

    var facetList = facetsValuesList.join('')

    $('#btn-'+name+'-dropdown-menu').html(facetList)
  });
  
}

});