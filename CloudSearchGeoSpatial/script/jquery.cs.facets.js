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
 * Amazon CloudSearch Facet Plugin
 * Requires: csSearchHelper
 */
(function( $, undefined ) {
    "use strict";

    var csFacets = {};

    $.widget( "cs.Facets", {
        version: "0.0.1beta",
        validSoring: ['alpha', 'count', 'max', 'sum', '-max'],
        options: {
            disabled: false
            , searchId: null
            , title: null
            , field: null
            , topN: null
            , constraints: null
            , sort: null

            , facets: null
            , render: function(event, data) {
                $(this).Facets("render");
            }
            , click: function(event, data) {
                var search = $.getSearchElement($(data.facetEl).Facets('option', 'searchId'));
                if (search && search[0]) {
                    $(search[0]).SearchInput("search");
                }
            }
        },

        _create: function() {
            var self = this, o = this.options, el = this.element;

            if ( !csSearchHelper ) {
                throw "csSearchHelper is required. Please include csSearchHelper.js before jquery.cs.facets.js plugin.";
            }
            // set searchId - a reference id for all the other components
            o.searchId = o.searchId || $(el).data('searchId') || $(el).attr('id');
            self.widgetEventPrefix = o.searchId + '.facet.';

            o.title = o.title || $(el).data('title') || $(el).attr('title');
            o.field = o.field || $(el).data('field');

            if ( !o.field ) {
                throw "Facet cannot be cretaed without field name.";
            }

            self._setOption('topN', $(el).data('topN'));
            self._setOption('constraints', $(el).data('constraints'));
            self._setOption('sort', $(el).data('sort'));

            self._reset();

            $('body').on(o.searchId + ".search.success", function(event, data){
                self.setFacets(data.response.facets);
                self._trigger('render', event, data);
            });

            self._trigger("created");
        },

        _init: function() {
            var self = this, o = this.options, el = this.element;
            $.addFacetElement(el, o.searchId);
            self._trigger("initFacets");
        },

        setFacets: function( result ) {
            var self = this, o = this.options, el = this.element;
            o.facets = null;
            if ( !result ) return;
            if ( result.facets ) {
                o.facets = result.facets[o.field] ? result.facets[o.field] : null;
            } else if( result[o.field] ) {
                o.facets = result[o.field];
            } else if ( result.constraints ) {
                o.facets = result;
            }
        },

        getParams: function(){
            var self = this, o = this.options, el = this.element;
            var facetObj = new csSearchHelper.csFacet({
                constraints: o.constraints,
                topN: o.topN,
                sort: o.sort,
                field: o.field
            });
            return facetObj.params();
        },

        getConstraintsString: function() {
            var self = this, o = this.options, el = this.element;
            var arr = [];
            var type = typeof o.constraints;
            if ( type === "string") {
                o.constraints = o.constraints.split(",");
            } else if ( type === "undefined" ) {
                return arr;
            }
            $.each( o.constraints, function(index, constraint){
                if ( constraint ) {
                    if ( constraint.indexOf("..") < 0 ) {
                        arr.push("'" + constraint + "'");
                    } else {
                        arr.push(constraint);
                    }
                }
            });
            return arr;
        },

        bq: function() {
            var self = this, o = this.options, el = this.element;
            var bq = null;
            var arrConstraints = self.getConstraintsString();
            if (typeof arrConstraints === "object") {
                if ( arrConstraints.length == 1 ) {
                    bq = "(and "+ o.field +":" + arrConstraints[0] + ")";
                } else if (arrConstraints.length > 1){
                    var vals = o.field + ":" + arrConstraints.join(": "+ o.field);
                    bq = "(and (or " + vals + "))";
                }
            }
            return bq;
        },

        widget: function() {
            return this.element;
        },

        _destroy: function() {
            var self = this, o = this.options, el = this.element;
            // TODO: remove everything
            $(el).empty();
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

                case "facets":
                    if ( value ) {
                        self.setFacets(value);
                    }
                    return o.facets;
                    break;

                case "topN":
                    if ( value && !isNaN( value ) ) {
                        o.topN = value;
                    }
                    return o.topN;
                    break;

                case "sort":
                    if (value && $.inArray(value, self.validSoring) > -1) {
                        o.sort = value;
                    }
                    return o.sort;
                    break;

                case "constraints":
                    if ( value ) {
                        if ( typeof value === "string" ) {
                            o.constraints = value.split(",");
                        } else {
                            o.constraints = $.trim(value);
                        }
                        if (typeof o.constraints === "object") {
                            $.each(o.constraints, function(index){
                                o.constraints[index] = $.trim(o.constraints[index]);
                            });
                        }
                    }
                    return o.constraints;
                    break;

                default:
                    throw "Invalid option " + key;
            };
        },

        _getFacetItem: function(constraint){
            var self = this, o = this.options, el = this.element;
            var li = $("<li></li>");
            var link = $("<a></a>").text(constraint.value).attr("href", "#").data('constraints', constraint.value);
            var countlbl = $("<div></div>").text(constraint.count).addClass("count");
            if ($.inArray(constraint.value, o.constraints) > -1) {
                countlbl.text('remove').addClass('removefacet');
            }
            self._hoverable(li);
            li.on('click', function(event){
                event.preventDefault();
                var constraint = $('.value a', this).data('constraints');
                var pos = $.inArray(constraint, o.constraints);
                if (pos > -1) {
                    delete(o.constraints[pos]);
                } else {
                    self._setOption('constraints', constraint);
                }
                self._trigger('click', event, {facetEl: el});
                return false;
            });
            li.append($("<div></div>").addClass("value").append(link));
            li.append(countlbl);
            return li;
        },
        render: function () {
            var self = this, o = this.options, el = this.element;
            var title = $("<div></div>").addClass("sectionheading").text(o.title);
            $(el).empty();
            if (o.title) {
                $(el).append(title);
            }
            if (o.facets) {
                var ul = $("<ul></ul>").addClass("facetlist");
                for (var i= 0, l= o.facets.constraints.length; i<l; i++){
                    ul.append(self._getFacetItem(o.facets.constraints[i]));
                }
                $('ul', el).remove();
                $(el).append(ul);
            }
        },
        _reset: function() {
            var self = this, o = this.options, el = this.element;
            $(el).addClass("cs-searchfacet");
            self._trigger('render');
        }
    });

    $.extend({
        getFacetElements: function(searchId) {
            return csFacets[searchId];
        },
        addFacetElement: function(element, searchId) {
            csFacets[searchId] = csFacets[searchId] || [];
            if ( $.inArray(element, csFacets[searchId]) < 0 ) {
                csFacets[searchId].push(element);
            }
        }
    });
    $(function(){
        $(".csFacet").Facets();
    });
}( jQuery ) );

