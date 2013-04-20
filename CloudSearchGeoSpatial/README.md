This project demonstrates using Amazon CloudSearch from HTML/JavaScript. 

The demo is a simple application that allows the user to search through a CloudSearch domain via Ajax. You can run the demo just by opening index.html in a browser. 

The demo does depend on the sample cloudsearch domain geonames26 that is currently (2013/04/1) running. We make no guarantees about the domain's uptime or existence. The purpose of this project is to help you build interfaces to your own CloudSearch domains.

You can search for items in the search box, and you can drill down with the facets. You can also move the map, as you would expect, and the displayed results will be updated. 

There is a slider under the map, which controls the relative importance of "text relevance" vs. "distance". Try it, and see what happens. 


About:

This demo  uses JQuery compoenents which you can re-use in your applications (see the license agreement for details). There are components to handle input, submit search requestst, display search results and facets.  It uses Ajax to query CloudSearch, and uses Google Maps to display the resuilts. It uses CloudSearch's GeoSpatial capabilities to select items to display.

The domain contains geographic features from geonames.org. You can find the data at http://www.geonames.org/export/ 

Yahoo YQL is currently configured as a proxy, to allow Cross Origin Resource Sharing.

Use of Google's and Yahoo's APIs are subject to their terms of service. You are responsible for conforming to their terms of service, if you use them.

====================================================================================

Frequently Asked Questions

Q. What is "search-id", and how do I use it?
A. "search-id" is common name shared by different UI components in this demo. It allows them to bind to the same set of results. The value used for "search-id" does not have to have the same name as your domain. But if you are querying multiple domains from one page, using the domain name may make it easier to keep track.

Q. How do I use my own search domain with this sample code?
A. Replace "geoname26" with your search domain name. Also change the "data-endpoint" and "data-param-return-fields" in the search
   input control.
   You provide the search endpoint only for the search input control.

   <input
      data-search-id="geoname26"
      data-endpoint="search-geoname26-ovxydpa6l6tadt3wwwkqb2tmte.us-east-1.cloudsearch.amazonaws.com"
      data-param-return-fields="asciiname,countrycode,population,geo,latitude,longitude,alternatenames"
      type="search"
      class="searchinput cloudsearchInput" />

   The Search input control will create custom events for successful and failed search using "search-id".
   Search request successful:
      <search-id>.search.success
   Search request failed:
      <search-id>.search.failed

   You can use the <search-id>.search.before event to do something just before search happens (eg. change param values,
   log request etc.) Returning false to <search-id>.search.before event will prevent search request.

Q. How does the Facet UI widget work?
A. The Facet container has a css class name of "csFacet" so Facet widget will be applied to the container. Now since this facet widget is
   bound to same search-id as search input, whenever a search happens this widget will update the facet contents.

   <div id="countryFacet" class="csFacet" data-search-id="geoname26" data-field="country" data-top-n="10" data-title="COUNTRY"></div>

   You can configure facet fields as shown above.


Q. How do I customize search result listing?
A. For demo purpose the listing code is part of index.html - feel free to change it the way you want it. All the CSS is
   available in cs-demo-common.css. You may also want to change the fields returned. See "data-param-return-fields", above.
