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
 * This file contains following objects:
 *
 * csSearchHelper - helper for search queries
 * Document - helper for search result documents
 *
 */

/**
 * Helper for CloudSearch queries
 * csSearchHelper object can manage and build facets and (runtime) expressions used with Amazon CloudSearch queries.
 *
 * @returns {{facet: Function, expression: Function, params: Function}}
 */
var csSearchHelper = function(){

    var _params = {};
    var _facets = {};
    var _expr = {};

    var removeAllFacets = function() {
        _facets = {};
        return createFacet;
    };

    var getAllFacets = function() {
        return _facets;
    };

    var removeFacet = function( fieldName ) {
        delete( _facets[fieldName] );
        return createFacet;
    };

    var createFacet = function( facet ) {

        if ( typeof facet === "undefined" ) {
            return createFacet;
        }

        var facetField = null;
        var inputType = typeof facet;
        if ( inputType === "string" ) {
            facetField = facet;
        } else if ( inputType === "object" && facet.field ) {
            facetField = facet.field;
        } else {
            throw "Invalid value for facet.";
        }
        if (!_facets[facetField]) {
            _facets[facetField] = new csSearchHelper.csFacet( facet );
        }
        return _facets[facetField]
    };

    createFacet.removeAll = removeAllFacets;
    createFacet.getAll = getAllFacets;
    createFacet.remove = removeFacet;
    createFacet.add = createFacet;

    var getParams = function() {
        var params = {};
        $.extend(params, _params);

        // facets
        if ( _facets ) {
            var facetFields = [];
            for( var fieldName in _facets ) {
                facetFields.push(fieldName);
                $.extend(params, _facets[fieldName].params());
            }
            params.facet = facetFields.join(",");
        }

        // expressions
        if ( _expr ) {
            for( var exprname in _expr ) {
                $.extend(params, _expr[exprname].params());
            }
        }
        return params;
    };

    var createExpression = function( expr ) {
        var exprName = null;
        if ( expr && expr.name ) {
            exprName = expr.name;
        } else if ( typeof expr === "string" ) {
            exprName = expr;
        }
        if ( !_expr[exprName] ) {
            _expr[exprName] = csSearchHelper.csExpression( expr );
        }
        return _expr[exprName];
    };

    createExpression.remove = function( name ) {
        delete( _expr[name] );
        return createExpression;
    };

    return {
        facet: createFacet,
        expression: createExpression,
        params: getParams
    };

};

/**
 * Rank Expression factory
 * @param name
 * @param expression
 * @returns {{name: Function, expression: Function, params: Function}}
 */
csSearchHelper.csExpression = function( name, expression ) {

    if ( arguments.length === 1 && arguments[0].name && arguments[0].expression ) {
        expression = arguments[0].expression;
        name = arguments[0].name;
    }
    var getName = function() {
        return name;
    };
    var getParam = function(){
        var param = {}, key = 'rank-' + name;
        var val = (typeof expression === "function") ? expression() : expression;
        param[key] = val;
        return param;
    };
    var setExpression = function ( expr ) {
        expression = expr;
        return this;
    };
    return {name: getName, expression: setExpression, params: getParam};
};

/**
 * Facet factory
 * @param field
 * @param constraints
 * @param topN
 * @param sort
 * @returns {{constraints: Function, topN: Function, sort: Function, params: Function, fieldName: *}}
 */
csSearchHelper.csFacet = function(field, constraints, topN, sort){
    var desc = false;
    if ( arguments.length === 1 && arguments[0].field ) {
        constraints = arguments[0].constraints || [];
        topN = arguments[0].topN;
        sort = arguments[0].sort;
        field = arguments[0].field;
    }

    if ( typeof constraints === "string" ) {
        constraints = constraints.split(',');
    }

    function addConstraints( str ){
        if ( typeof str === "string" ) {
            str = str.split(',');
        }
        for (var i= 0,l=str.length; i<l; i++) {
            if ( !constraints ) constraints = [];
            var pos = $.inArray(str[i], constraints);
            if ( pos < 0 ) {
                constraints.push( str[i] );
            }
        }
        return this;
    }

    function removeConstraints( str ){
        if ( typeof str === "string" ) {
            str = str.split(',');
        }
        for (var i= 0,l=str.length; i<l; i++) {
            var pos = $.inArray(str[i], constraints);
            if ( pos > -1 ) {
                delete( constraints[pos] );
                var tmp = [];
                for (var j= 0, lj=constraints.length; j<lj; j++) {
                    if (typeof constraints[j] !== "undefined") {
                        tmp.push(constraints[j]);
                    }
                }
                constraints = tmp;
            }
        }
        return this;
    }

    function removeAllConstraints() {
        constraints = [];
        return this;
    }

    function setLimit( count ) {
        topN = count;
        return this;
    }

    function setSorting( type ) {
        var validSoring = ['alpha', 'count', 'max', 'sum', '-max'];
        if ($.inArray(type, validSoring) > -1) {
            if (type === '-max') {
                type = 'max';
                desc = true;
            }
            sort = type;
        }
        return this;
    }

    function getSearchParams() {
        var params = {facet: field};
        if ( constraints && constraints.length > 0 ) {
            params['facet-' + field + '-constraints'] = constraints.join(",");
            if (params['facet-' + field + '-constraints'] === ""){
                delete(params['facet-' + field + '-constraints']);
            }
        }
        if ( !isNaN(topN) ) {
            params['facet-' + field + '-top-n'] = topN;
        }
        if ( sort ) {
            params['facet-' + field + '-sort'] = (desc && sort==='max' ? '-' : '') + sort;
        }
        return params;
    }

    var facetConstraints = function ( str ) {
        if ( typeof str !== "undefined" ) {
            addConstraints( str );
        }
        return facetConstraints;
    };

    var getAllConstraints = function () {
        return constraints;
    };

    facetConstraints.add = addConstraints;
    facetConstraints.remove = removeConstraints;
    facetConstraints.removeAll = removeAllConstraints;
    facetConstraints.getAll = getAllConstraints;

    var facetObj = {
        constraints: facetConstraints,
        topN: setLimit,
        sort: setSorting,
        params: getSearchParams,
        fieldName: field
    };
    facetObj.topN.remove = function(){
        topN = null;
        return this;
    };
    facetObj.sort.desc = function() {
        desc = true;
        return this;
    };
    facetObj.sort.asc = function() {
        desc = false;
        return this;
    };
    facetObj.sortByCount = function() {
        sort = 'count';
        return this;
    };
    facetObj.sortByName = function() {
        sort = 'alpha';
        return this;
    };
    facetObj.sortByValue = function(sortType) {
        sort = 'max';
        if ( sortType && sortType.toUpperCase() === 'DESC' ) {
            sort = '-max';
        }
        return this;
    };
    return facetObj;
};
// End - Class Facet

/**
 * Extends search result document to provide extra methods.
 * @param doc
 * @returns {{id: (*|string|string), data: (*|function({data: (String|Blob|ArrayBuffer)})|string|string|string|CanvasPixelArray|Object[]|string), get: Function, getString: Function}}
 * @constructor
 */
var Document = function(doc) {

    /**
     * Get the field value or apply a method to it and get the value.
     * @param key search result field name
     * @param defaultValue default value can be a method
     * @returns {*}
     */
    function get( key, defaultValue ) {
        if ( doc.data[key] ) {
            if ( defaultValue && defaultValue.call ) {
                return defaultValue( doc.data[key] );
            } else {
                return doc.data[key];
            }
        } else {
            if ( defaultValue && defaultValue.call ) {
                return defaultValue( doc.data[key] );
            } else {
                return defaultValue;
            }
        }
    }

    /**
     * Converts field value to a string
     * @param key
     * @param delimiter
     * @returns {*}
     */
    function getString( key, delimiter ) {
        delimiter = delimiter || ", ";
        return get( key, function( value ){
            if ( value && value.length ) {
                return value.join( delimiter );
            }
            return "";
        });
    }

    return {id: doc.id,
        data: doc.data,
        get: get,
        getString: getString
    };
};
