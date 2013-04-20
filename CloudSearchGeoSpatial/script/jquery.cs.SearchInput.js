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
 * Amazon CloudSearch Query Plugin
 *
 * An easy interface to query Amazon CloudSearch domain from browser.
 * This plugin uses YQL to call your search endpoint. You can provide your own proxy instead.
 * If (in future) Amazon CloudSearch enables CORS support - this plugin can query your search domain directly from
 * user's browser.
 *
 * Requires: csSearchHelper
 */
(function( $, undefined ) {
    "use strict";
    var defaultParams = {
        "q":null
        , "return-fields": null
        , "results-type": "json"
        , "start": 0
        , "size": 10
        , "rank": "-text_relevance"
    };

    var validationError = {
        'returns-type': {'invalidValue': '"return-type" can have either "json" or "xml"'}
    };

    var searchIds = {};

    $.widget( "cs.SearchInput", {
        version: "0.0.1beta",
        _thresholds: {},
        _sortBy: [],
        _helper: null,
        _bq: {},
        options: {
              disabled: false
            , searchId: null
            , domainName: null
            , proxyUrl: null
            , searchEndpoint: null
            , matchEverything: true
            , autoSearch: false                // true: search automatically when options.params changes
            , useYQL: true
            , autocomplete: null

            , params: defaultParams
        },

        _create: function() {
            var self = this, o = this.options, el = this.element;
            if ( csSearchHelper() ) {
                self._helper = new csSearchHelper();
            } else {
                throw "csSearchHelper is required. Please include csSearchHelper.js before jquery.cs.facets.js plugin.";
            }
            var autoSearch = o.autoSearch;
            o.autoSearch = false;
            var elData = $(el).data();
            for(var i in elData) {
                if (i === "csSearchInput") {
                    continue;
                }
                if (i === "paramReturnFields") {
                    self.params("return-fields", elData[i]);
                }
            }
            // set search endpoint or proxy url - cannot perform search if both of them are not present.
            o.searchEndpoint = o.searchEndpoint || $(el).data('endpoint');
            o.proxyUrl = o.proxyUrl || $(el).data('proxy');
            if ( !o.searchEndpoint && !o.proxyUrl ) {
                throw "Either provide CloudSearch search endpoint or provide custome proxy url.";
            }

            // set searchId - a reference id for all the other components
            o.searchId = o.searchId || $(el).data('searchId') || $(el).attr('id');

            if ( !o.searchId ){
                throw "Can't live without searchId!";
            }

            self.widgetEventPrefix = o.searchId + '.search.';

            // set domain name if provided...
            o.domainName = o.domainName || $(el).data('domain');

            // or find domain name from search endpoint...
            if ( !o.domainName && o.searchEndpoint && /search\-[a-z][a-z0-9]+\-[a-z0-9]+\.[a-z0-9\-]+\.cloudsearch\.amazonaws\.com/.test(o.searchEndpoint) ) {
                o.domainName = (o.searchEndpoint.split("-"))[1];
            }

            // TODO: add autocomplete values
            // acQueryCallback
            // acResultCallback
            // acQueryFields
            // acResultFields

            $.addSearchElement(el, o.searchId, 'SearchInput');

            self._hoverable(el);
            self._focusable(el);

            this._on(el, {keydown: "_keydown"});

            self._trigger("created");
            o.autoSearch = autoSearch;
        },

        _init: function() {
            this._trigger("init");
        },

        search: function( event ) {
            var self = this, o = this.options;
            if (self._trigger("before", event, {param: o.params})) {
                self._doSearch( event );
            }
        },

        bq: function( name, bq ) {
            if ( bq ) {
                this._bq[name] = bq;
            }
            return this._bq[name];
        },

        removebq: function( name ) {
            var self = this, o = this.options, el = this.element;
            delete(self._bq[name]);
        },

        _autoSearch: function( event ) {
            var self = this, o = this.options, el = this.element;
            if ( o.autoSearch ) {
                self.search( event );
            }
        },

        _update: function(property, name, value) {
            var self = this, o = this.options, el = this.element;
            // TODO: add validation

            // get all
            if (typeof name === "undefined" && typeof value === "undefined") {
                return self[property];
            }

            // get one
            if (typeof value === "undefined" && self[property][name]) {
                return self[property][name];
            }

            // remove
            if (value === null && self[property][name]){
                delete(self[property][name]);
                return true;
            }

            switch(property) {
                case "_thresholds":
                    if (typeof value === "undefined") {
                        return false;
                    }
                    break;
            }
            if (name) {
                self[property][name] = value;
                return true;
            }
            return false;
        },

        threshold: function(name, value) {
            var self = this, o = this.options, el = this.element;
            if (typeof value === "object") {
                value.from = value.from || "";
                value.to = value.to || "";
                value = value.from + ".." + value.to;
            }
            return self._update("_thresholds", name, value);
        },

        facet: function( facet ) {
            var self = this, o = this.options, el = this.element;
            return self._helper.facet( facet );
        },

        expression: function( expr ) {
            var self = this, o = this.options, el = this.element;
            return self._helper.expression( expr );
        },


        sort: function(name, type) {
            var self = this, o = this.options, el = this.element;
            // TODO: add validation
            if (typeof name === "undefined" && typeof type === "undefined") {
                return self._sortBy;
            }
            if (name === null || name === "_default") {
                self._sortBy = [];
                return true;
            }
            if (type === null) {
                for (var i = 0, l = self._sortBy.length; i<l; i++) {
                    if (self._sortBy[i].name === name) {
                        delete(self._sortBy[i]);
                    }
                }
                return true;
            }
            if (typeof type === "undefined") type = "ASC";

            self._sortBy.push({name: name, type: type});
            return false;
        },

        params: function() {
            var self = this, o = this.options, el = this.element;
            if ( arguments.length === 0 ) {
                return o.params;
            } else if ( arguments.length > 1 ) {
                if ( self._processSearchParam.apply(self, arguments) ) {
                    if ( self._trigger("paramchanged") ) {
                        self._autoSearch();
                    }
                }
            }
            return o.params[arguments[0]];
        },

        widget: function() {
            return this.element;
        },

        _destroy: function() {

        },

        _setOption: function( key, value ) {
            var self = this, o = this.options, el = this.element;
            self._super( key, value );
            switch (key) {
                case "disabled":
                    if ( value ) {
                        el.prop( "disabled", true );
                    } else {
                        el.prop( "disabled", false );
                    }
                    return;
                break;

                case "params":
                    if ( value ) {
                        if ( typeof value === "object" && !value.hasOwnProperty("length") ) {
                            o.params = value;
                            if ( self._trigger("paramchanged") ) {
                                self._autoSearch();
                            }
                        }
                    }
                    return o.params;
                break;
            }
        },

        /**
         * Parse values from options.params and populate the private properties
         *
         * @private
         */
        _parseOptionParams: function() {
            var self = this, o = this.options, el = this.element;

        },

        _isValidParamName: function(paramName) {
            var paramNameRegEx = /^(bq|q|size|start|facet|facet-.+-constraints|facet-.+-top-n|facet-.+-sort|rank|rank-.+|results-type|return-fields|t-.+)$/;
            return paramNameRegEx.test(paramName);
        },

        _processSearchParam: function() {
            var self = this, o = this.options, el = this.element;
            var argc = arguments.length;
            var event = null;
            var paramName = $.trim(arguments[0].toLowerCase());
            var error = null;

            if ( !paramName || !self._isValidParamName(paramName)) {
                return false;
            }

            if ( arguments[argc - 1] && arguments[argc - 1].hasOwnProperty('target') && arguments[argc - 1].hasOwnProperty('relatedTarget') ) {
                event = arguments[argc];
                argc--;
            }

            switch(paramName) {
                case "q":
                    o.params.q = arguments[1];
                    el.val(o.params.q);
                    break;

                case "bq":
                    if ( typeof arguments[1] === "string" ) {
                        o.params.bq = $.trim(arguments[1]);
                    } else {
                        throw "TODO: support structured bq.";
                    }
                    break;

                case "returns-type":
                    var returnsType = $.trim(arguments[1].toLowerCase());
                    if ( returnsType === 'json' || returnsType === 'xml' ) {
                        o.params[paramName] = returnsType;
                    } else {
                        error = validationError[paramName].invalidValue;
                    }
                    break;

                case "start":
                    var start = $.trim(arguments[1]);
                    if ( start < 0 || isNaN(start) ) {
                        o.params.start = 0;
                    }
                    else {
                        o.params.start = start;
                    }
                    break;

                case 'size':
                    var size = $.trim(arguments[1]);
                    if ( size < 0 || isNaN(size) ) {
                        o.params.size = size;
                    }
                    else {
                        o.params.size = 0;
                    }
                    break;

                default:
                    if ( arguments[0] && arguments[1]) {
                        o.params[paramName] = arguments[1].toString();
                    }
                    break;
            }
            if ( error ) {
                throw error;
            }
            return true;
        },

        /**
         * Build search request params
         * "q":null
         * "bq": null
         * "return-fields": null
         * "result-type": "json"
         * "start": 0
         * "size": 10
         * "rank": "-text_relevance"

         * @returns object Search request object
         * @private
         */
        _getRequestParam: function() {
            var self = this, o = this.options, el = this.element;
            var request = {};
            o.q = $(el).val();

            if (!o.q && !o.bq && !o.matchEverything) {
                return request;
            }

            // pass only "q" or "bq"
            request.q = o.q || (o.matchEverything ? "-matcheseverything" : "");

            if ( o.bq ) {
                request.bq = o.bq;
                if ( !o.q ) delete(request.q);
            }


            if ( typeof o['return-fields'] === "string" ) {
                request['return-fields'] = o['return-fields'];
            } else if ( typeof o['return-fields'] === "object" ) {
                request['return-fields'] = o['return-fields'].join(",");
            }

            return request;
        },

        _getSearchRequest: function(param) {
            var self = this, o = this.options, el = this.element;
            var request = o.proxyUrl;
            if ( o.searchEndpoint ) {
                request = 'http://' + o.searchEndpoint + '/2011-02-01/search';
            }
            if (!request) {
                throw "SearchInput: Either searchEndpoint or url must be set to make a search request.";
            }
            return request + "?" + $.param(param);
        },
        _doSearch: function(event) {
            var self = this, o = this.options, el = this.element;
            var facetParams = {};
            var eleFacets = [];
            var bq = [];
            eleFacets = $.getFacetElements(o.searchId);
            for(var i= 0,l=eleFacets.length; i<l; i++) {
                if ( $(eleFacets[i]).data('csFacets') ) {
                    var fp = $(eleFacets[i]).Facets('getParams');
                    var fbq = $(eleFacets[i]).Facets('bq');
                    if (fbq) {
                        self.bq("facetbq" + $(eleFacets[i]).Facets('option', 'field'), fbq);
                    } else {
                        self.removebq("facetbq" + $(eleFacets[i]).Facets('option', 'field'));
                    }
                    $.extend(facetParams, fp);
                }
            }
            o.params.bq = "";
            $.each(self._bq, function(key, value) {
                o.params.bq = "(and " + o.params.bq + " " + value + ")";
            });

            var result = null;
            var url = self._getSearchRequest( $.extend(o.params, self._helper.params(), facetParams) );
            if ( o.useYQL ) {
                // lets fetch as html - YQL modifies the JSON
                var q = "select * from html where url=\"" + url + "\"";
                var yqlparams = {q: q, format: "json"};
                url = "http://query.yahooapis.com/v1/public/yql?" + $.param(yqlparams);
            }
            $(el).addClass('searching');
            $.getJSON(url,
                function (data) {
                    $(el).removeClass('searching');
                    if ( data.query.results ) {
                        data = JSON.parse(data.query.results.body.p);
                        self._trigger("success", event, {param: o.params, response: data});
                    } else {
                        self._trigger("failed", event, {param: o.params, response: data});
                    }
                }
            );
        },

        _keydown: function( event ) {
            var self = this, o = this.options, el = this.element;
            var keyCode = $.ui.keyCode;
            switch ( event.keyCode ) {
                case keyCode.ENTER:
                    self._processSearchParam("q", el.val(), event );
                    if ( !o.autoSearch ) self.search( event );
                    break;

                default:
                    if ( o.autocomplete ) {
                        // add autocomplete
                    }
                    break;
            }
        }
    });
    $.extend({
        getSearchElement: function(searchId, type) {
            type = type || 'SearchInput';
            return searchIds[searchId][type];
        },
        addSearchElement: function(element, searchId, type) {
            type = type || 'SearchInput';
            searchIds[searchId] = searchIds[searchId] || {};
            searchIds[searchId][type] = searchIds[searchId][type] || [];
            searchIds[searchId][type].push(element);
        }
    });
    $(function(){
        $(".cloudsearchInput").SearchInput();
    });
}( jQuery ) );
