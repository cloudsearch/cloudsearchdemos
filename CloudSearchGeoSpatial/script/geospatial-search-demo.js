/*!
 * Copyright 2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with
 * the License. A copy of the License is located at
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */

/**
 * This file contains following objects,
 * Encoding - To encode latitude and longitude offsets
 * MapHelper - Provides geo query for CloudSearch /search endpoint, also works as a wrapper over map api to manipulate
 * markers.
 */

/**
 * Offset encoder factory.
 *
 * @param latitudeOffset
 * @param longitudeOffset
 * @param scale
 * @returns {{lat: Function, lon: Function}}
 * @constructor
 */
var Encoding = function(latitudeOffset, longitudeOffset, scale){
    "use strict";
    latitudeOffset = latitudeOffset || 90;
    longitudeOffset = longitudeOffset || 180;
    scale = scale || 100;

    function encodeLat(lat) {
        return Math.round((lat + latitudeOffset) * scale);
    }

    function encodeLon(lon) {
        return Math.round((lon + longitudeOffset) * scale);
    }

    return {
        lat: encodeLat,
        lon: encodeLon
    }
};

/**
 * MapHelper factory.
 * MapHelper provides bq and and rank expressions component required for geo spatial search with CloudSearch
 * @param eleId
 * @param options
 * @returns {{center: {}, distanceWeight: Function, gmap: google.maps.Map, getCenter: Function, setBounds: Function, getBoundaryQuery: Function, getRankExpression: Function, replaceMarkers: Function, addMarker: Function, removeAllMarkers: Function}}
 * @constructor
 */
var MapHelper = function( eleId, options ){
    "use strict";
    var options = options || {};
    var _encode = new Encoding();
    var _bounds = null;
    var center = {};
    var boundary = {};
    var distanceWeight = 100;
    var _markers = {};
    var _mapCenter = null;
    var _evets = true;
    var sfo = {lat: 37.7750, lon: -122.4183, zoom: 7};
    var userLocation = true;
    if (options.userLocation===false){
        userLocation = false;
    }
    var defaultPosition = options.defaultPosition || sfo;
    defaultPosition.zoom = defaultPosition.zoom || 7;
    var _mapOptions = {
        center: new google.maps.LatLng(defaultPosition.lat,defaultPosition.lon),
        zoom: defaultPosition.zoom,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var _map = new google.maps.Map(document.getElementById(eleId) , _mapOptions);
    var userPosition = null;

    // Try HTML5 geolocation
    if (navigator.geolocation && userLocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            userPosition = new google.maps.LatLng(position.coords.latitude,
                position.coords.longitude);
            _map.setZoom(3);
            _map.setCenter(userPosition);
            setTimeout(onMapReady, 1000);
        }, function() {
            // if user don't want to share location
            setTimeout(onMapReady, 1000);
        });
    }

    function onMapReady() {
        if ( _map.mapTypes !== null ) {
            setBounds(_map.getBounds());
        } else {
            setTimeout(onMapReady, 500);
        }
    }

    google.maps.event.addListener(_map, 'zoom_changed', function() {
        setBounds(_map.getBounds());
    });

    google.maps.event.addListener(_map, 'dragend', function() {
        setBounds(_map.getBounds());
    });

    // TODO: add public methods to set lat-lon columns of search domain
    var _degCols = {lat: 'latitude_90', lon: 'longitude_180'};

    center.lat = _encode.lat(0);
    center.lon = _encode.lon(0);

    function _updateCenter() {
        _mapCenter = _bounds.getCenter();
        center.lat = _encode.lat(_mapCenter.lat());
        center.lon = _encode.lon(_mapCenter.lng());
    }

    function _updateBoundaries() {
        var sw = _bounds.getSouthWest();
        var ne = _bounds.getNorthEast();

        var latMin = _encode.lat(sw.lat());
        var latMax = _encode.lat(ne.lat());
        var lngMin = _encode.lon(sw.lng());
        var lngMax = _encode.lon(ne.lng());

        boundary = {lat: {min: latMin, max: latMax},
            lon: {min: lngMin, max: lngMax}
        };
    }
    function _refresh() {
        _updateCenter();
        _updateBoundaries();
        if ( _evets ) $('#' + eleId).trigger('mapchanged');
    }

    function _getDistanceFormula() {
        var deg = _degCols;
        var distanceFormula = function(lat, lon) {
            return "Math.sqrt(Math.pow(Math.abs(" + deg.lat + " - (" + lat + ")),2) + Math.pow(Math.abs(" + deg.lon + " - (" + lon + ")),2))";
        };
        return distanceFormula(center.lat, center.lon);
    }

    function getBoundaryQuery(){
        var lon = boundary.lon;
        var lat = boundary.lat;
        var deg = _degCols;
        var bq = null;
        if ( lon.min <= lon.max ) {
            bq = "(and "+ deg.lat +":" + lat.min + ".." + lat.max + " "+ deg.lon +":" + lon.min + ".." + lon.max + ")";
        } else {
            var bq1 = "(and "+ deg.lat +":" + ".." + lat.max + " "+ deg.lon +":" + ".." + lon.max + ")";
            var bq2 = "(and "+ deg.lat +":" + lat.min + ".." + " "+ deg.lon +":" + lon.min + "..)";
            bq = "(or " + bq1 + " " + bq2 + ")";
        }
        return bq;
    }

    function getRankExpGeo() {
        var expr = null;
        var distanceFormula = _getDistanceFormula();
        if ( distanceWeight == 100) {
            return distanceFormula;
        }
        if ( distanceWeight == 0 ) {
            return "text_relevance";
        }
        // text_relevance is 0..1000. Currently distance is in degrees, so
        // max value is 254 = sqrt(180*180+180*180)
        // So let's bump distance up a bit.
        var distanceScale = 5;
        var textWeight = 100 - distanceWeight;
        distanceFormula = "(" + distanceScale + " * " + distanceFormula + ")";
        return "(" + textWeight + " * text_relevance ) + (" + distanceWeight + " * " + distanceFormula + ")/100";
    }

    function setBounds( bounds, recalculate ) {
        _bounds = bounds;
        if ( recalculate !== false && _bounds ) {
            _refresh();
        }
    }

    function addMarker(lat, lon, content) {
        if (_markers[lat.toString() + lon.toString() + content.title]) {
            return this;
        }

        var mark = new google.maps.Marker({
            position : new google.maps.LatLng(lat, lon),
            map : _map,
            title : content.title,
            content : content.desc,

        });
        var infowindow = new google.maps.InfoWindow({
            content: '<div class="info"><h3>'+ content.title + '</h3><p>' + content.desc + '</p></div>'
        });
        google.maps.event.addListener(mark, 'click', function() {
            infowindow.open(mark.get('map'), mark);
        });
        _markers[lat.toString() + lon.toString() + content.title] = mark;
        return this;
    }

    function replaceMarkers(arrMarkers) {
        removeAllMarkers();
        var bounds = new google.maps.LatLngBounds ();
        for(var i= 0, l=arrMarkers.length; i<l; i++) {
            var lat = arrMarkers[i].lat;
            var lon = arrMarkers[i].lon;
            var content = arrMarkers[i].content;
            if (_markers[lat.toString() + lon.toString() + content.title]) {
                return this;
            } else {
                addMarker(lat, lon, content);
                bounds.extend((new google.maps.LatLng (lat, lon)));
            }
        }
    }

    function removeAllMarkers(){
        $.each(_markers, function(key, mark){
            _markers[key].setMap(null);
        });
        _markers = {};
    }

    function getCenter(){
        return {lat: _mapCenter.lat(), lon: _mapCenter.lng()};
    }

    function setDistanceWeight( weight ) {
        if ( !isNaN(weight) ) {
            distanceWeight = weight;
            if ( _evets ) $('#' + eleId).trigger('weightchanged');
        }
        return distanceWeight;
    }

    return {
        center: center,
        distanceWeight: setDistanceWeight,
        gmap: _map,
        getCenter: getCenter,

        setBounds: setBounds,
        getBoundaryQuery: getBoundaryQuery,
        getRankExpression: getRankExpGeo,

        replaceMarkers: replaceMarkers,
        addMarker: addMarker,
        removeAllMarkers: removeAllMarkers
    }
};
