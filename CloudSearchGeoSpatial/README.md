CloudSearchGeoSpatial
=====================

This project demonstrates how to use Amazon CloudSearch 
from HTML/JavaScript by implementing a location based search solution. 

To run the demo, download the project and open the `index.html` file in a browser. 
You can enter search terms in the search field, and then drill down into the results 
using the facets. As you move the map, the results are automatically updated. 

The slider below the map controls the relative importance of `text relevance` versus 
`distance` when the results are ranked. Try it and see what happens. 

**Note**: This demo connects to the sample search domain `geonames26`, which is 
live as of 2013/04/1. We make no guarantees about the domain's uptime or existence. 
The purpose of this project is to help you build interfaces to your own Amazon 
CloudSearch domains.

For more information about location based searching with Amazon CloudSearch, see 
Searching and Ranking Results by Geographic Location 
in the Amazon CloudSearch Developer Guide and the Building Location-Based Search with Amazon CloudSearch webinar on youtube.

About the Implementation
------------------------

This demo uses Ajax to submit requests to Amazon CloudSearch and  Google Maps to display 
the results. Yahoo YQL is configured as a proxy to allow Cross Origin Resource Sharing.

The `geonames26` search domain contains geographic features from [geonames.org](http://www.geonames.org/export/). 
CloudSearch's GeoSpatial capabilities are used to select which items to display. 

You can re-use the JQuery components that handle input, submit search requests, and 
display search results and facets in your own applications (see the license 
agreement for details). 

**Note**: Use of the Google and Yahoo APIs is subject to their terms of service. If you 
use them in your own applications, you are responsible for complying with their terms 
of service.

Frequently Asked Questions
--------------------------

**Q. What is `search-id`, and how do I use it?**

`search-id` is common name shared by the different UI components in this demo. It allows 
them to bind to the same set of results. The value used for `search-id` does not have to 
have the same name as your search domain. However, if you are querying multiple domains from one 
page, using the domain name can make it easier to keep track.

**Q. How do I use my own search domain with this sample code?**

Replace `geoname26` with your search domain name and change the `data-endpoint` and 
`data-param-return-fields` in the search input control. (You provide the search endpoint 
only for the search input control.)

    <input data-search-id="geoname26" 
     data-endpoint="search-geoname26-ovxydpa6l6tadt3wwwkqb2tmte.us-east-1.cloudsearch.amazonaws.com"
     data-param-return-fields="asciiname,countrycode,population,geo,latitude,longitude,alternatenames"
     type="search"
     class="searchinput cloudsearchInput" />

The search input control creates custom events for successful and failed searches using 
`search-id`.

Search request successful:

    <search-id>.search.success
    
Search request failed:
    
    <search-id>.search.failed

You can use the `<search-id>.search.before` event to do something just before search 
happens, such as modifying the parameter values, logging the request, and so on. Returning 
false to the `<search-id>.search.before` event prevents the search request from being sent.

**Q. How does the Facet UI widget work?**

The facet container has a css class name of `csFacet` so the facet widget will be applied 
to the container. Since the facet widget is bound to the same `search-id` as search input, 
it will update the facet contents whenever a search happens.

    <div id="countryFacet" class="csFacet" data-search-id="geoname26" data-field="country" 
     data-top-n="10" data-title="COUNTRY"></div>

You can configure facet fields as shown above.

**Q. How do I customize how the search results are listed?**

For demo purposes the listing code is part of `index.html` - feel free to change it however 
you want. All of the CSS styles are defined in `cs-demo-common.css`. You can also change 
which fields are returned by modifying `data-param-return-fields`.

