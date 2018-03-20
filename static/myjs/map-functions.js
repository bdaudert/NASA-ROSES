/* MAP Utils*/
var MAP_APP = MAP_APP || {};
MAP_APP = {
    set_polyStyle: function(){
        var polyOptions = {
            strokeWeight: 0,
            fillOpacity: 0.45,
            editable: true,
            draggable:true,
            fillColor: "#1E90FF",
            strokeColor: "#0c3966"
        };
        return polyOptions;
    },
    set_featureStyle: function(year){
        var featureStyle,
            fillColor = js_statics.featureStyleByYear[year][0],
            strokeColor = js_statics.featureStyleByYear[year][1];
        featureStyle = {
            fillColor: fillColor,
            fillOpacity: 0.1,
            strokeColor: strokeColor,
            stokeOpacity: 0.5,
            strokeWeight: 0.5
        };
        return featureStyle;
    },
    setDrawingManager: function(){
        var mkrOptions = MAP_APP.setMarkerOptions();
        var polyOptions = MAP_APP.setPolyOptions();
        var drawingManager = new google.maps.drawing.DrawingManager({
            drawingModes: [
                google.maps.drawing.OverlayType.MARKER,
                google.maps.drawing.OverlayType.RECTANGLE,
                google.maps.drawing.OverlayType.POLYGON
            ],
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [
                    google.maps.drawing.OverlayType.MARKER,
                    google.maps.drawing.OverlayType.RECTANGLE,
                    google.maps.drawing.OverlayType.POLYGON
                ]
            },
            markerOptions: mkrOptions,
            rectangleOptions: polyOptions,
            polygonOptions: polyOptions
        });
        return drawingManager;
    },
    get_fusiontable_id: function(region, field_year){
        var ft_id = null;
        if (field_year){
            ft_id = statics.fusiontables[region][field_year];
        }
        return ft_id;
    },
    set_fusiontableBounds: function(query) {
        if (!query || !query.getDataTable()) {
          return;
        }
        var bounds =  new google.maps.LatLngBounds(),
            data = query.getDataTable(),
            num_rows = data.getNumberOfRows(),
            row_idx, lon_bounds, lat_bounds,
            ll_NE, ll_SW, kml, geoXml;

        for (row_idx = 0; row_idx < num_rows; row_idx++) {
            kml = query.getDataTable().getValue(row_idx, 0);
            geoXml = new geoXML3.parser({});
            geoXml.parseKmlString('<Placemark>' + kml + '</Placemark>');
            lon_bounds = geoXml.docs[0].internals.bounds.b;
            lat_bounds = geoXml.docs[0].internals.bounds.f;
            ll_NE = new google.maps.LatLng(String(lat_bounds.b), String(lon_bounds.b));
            ll_SW = new google.maps.LatLng(String(lat_bounds.f), String(lon_bounds.f));
            bounds.extend(ll_NE);
            bounds.extend(ll_SW);
        }
        window.map.fitBounds(bounds);
        /*
        WEIRD: on sharelink request the zoom
        somehow is 0 after the fitBounds call
        so we need to save the zoom beforehand and reset
        it after
        */
        /*
        mapZoom = window.map.getZoom();
        //note: fitBounds happens asynchronously
        window.map.fitBounds(bounds);
        google.maps.event.addListenerOnce(window.map, 'bounds_changed', function(event) {
            if(mapZoom) {
                window.map.setZoom(mapZoom);
            }
        });
        */
    },
    zoomToFusiontable: function(queryText) {
        var g_url = 'http://www.google.com/fusiontables/gvizdata?tq=';
        var query = new google.visualization.Query(g_url  + queryText);
        //set the callback function
        query.send(MAP_APP.set_fusiontableBounds);
    },
    get_fusiontableQuery: function(ft_id, columnname, subchoice, needExact) {
        var query = null,
            where_text = null;

        if (needExact) {
            where_text = "'" + columnname + "' = '" + subchoice + "'";
        } else {
            if (subChoice && columnname) {
                where_text = "'" + columnname + "' CONTAINS '" + subchoice + "'";
            }
        }
        query = {
            select: 'geometry',
            from: ft_id
        };

        if (where_text) {
            query['where'] = where_text;
        }
        return query;
    },
    get_fusiontableQueryText: function(ft_id, columnname, subChoice, needExact) {
        var queryText = '';
        if (needExact) { //plot exactly 1 region
            queryText = "SELECT 'geometry' FROM " + ft_id + " WHERE '" + columnname + "' = '" + subchoice + "'";
        } else {
            if (subChoice && columnname) { //plot lots of regions w/ filter
                queryText = "SELECT 'geometry' FROM " + ft_id + " WHERE '" + columnname + "' CONTAINS '" + subchoice + "'";
            } else {
                queryText = "SELECT 'geometry' FROM " + ft_id;
            }
        }
        queryText = encodeURIComponent(queryText);
        return queryText;
    },
    populate_dataModalFromFT: function(e){
        // e is the click event
        var col_name, col_names = [],
            v, t_res, m_idx, m_str, c_idx, data_val,
            html, data_div = $('#modal_data');
        //Clear out old modal content
        $('#dataModal_title').html('');
        $('#dataModal_data').html('');
        v = $('#variable').val();
        t_res = $('#t_res').val();
        html = '';
        //Title
        for (c_idx = 0; c_idx < statics.title_cols.length; c_idx++){
            col_name = statics.title_cols[c_idx];
            html += '<b>' + col_name + '</b>'+ ': ';
            html += e.row[col_name].value + '<br>';
        }
        html += '<b>' + v + '</b>';
        if ($('#form-field_year').css('display') != 'none'){
            html += '<b>Year ' + $('#field_year').val() + '</b>:';
        }
        $('#dataModal_title').append(html);
        html = '';
        //Populate the columnnames
        col_names = statics.stats_by_var_res[v][t_res];
        //populate html with data
        for (c_idx = 0; c_idx < col_names.length; c_idx++){
            col_name = col_names[c_idx];
            data_val = e.row[col_name].value;
            html += col_name + ': ' + data_val + '<br>'
        }
        $('#dataModal_data').append(html);
    },
    initialize_dataModal: function(e){
        // e is the click event
        var prop_name, prop_names = [],
            v, t_res, m_idx, m_str, c_idx, data_val,
            html, data_div = $('#modal_data'), 
            year_idx,year;
        //NOTE: currently we only allow one field for fields
        //var years = $('#field_years').val();
        var years = [$('#field_year').val()];
        //Clear out old modal content
        $('#dataModal_title').html('');
        $('#dataModal_data').html('');
        v = $('#variable').val();
        t_res = $('#t_res').val();
        html = '';
        //Title
        for (c_idx = 0; c_idx < statics.title_cols.length; c_idx++){
            prop_name = statics.title_cols[c_idx];
            html += '<b>' + prop_name + '</b>'+ ': ';
            html += e.feature.getProperty(prop_name) + '<br>';
        }
        html += '<b>Variable</b>: ' + v + '<br>';
        html += '<b>Years</b>: ' + years + '<br>';
        $('#dataModal_title').append(html);
    },
    add_dataToModal: function(e){
        var feat_ID= e.feature.getProperty('OBJECTID'),
            year, year_idx, 
            data, prop_names, prop_name, c_idx, html,
            v = $('#variable').val(),
            t_res = $('#t_res').val();

        //NOTE: currently we only allow one field for fields
        //var years = $('#field_years').val();
        var years = [$('#field_year').val()];
        for (year_idx = 0; year_idx < years.length; year_idx++){
            y = years[year_idx];
            y_idx = $.inArray(y, statics.all_field_years);
            data = window.layers[y_idx];
            data.forEach(function(feat) {
                if (feat.getProperty('OBJECTID') != feat_ID){
                    //Continue to next feature
                    return;
                }
                html = '';
                html = 'Year: ' + year + '<br>';
                //Populate the columnnames
                prop_names = statics.stats_by_var_res[v][t_res];
                //populate html with data
                for (c_idx = 0; c_idx < prop_names.length; c_idx++){
                    prop_name = prop_names[c_idx].toUpperCase();
                    data_val = feat.getProperty(prop_name);
                    html += prop_name + ': ' + data_val + '<br>'
                }
                html += '<br>';
            });
            $('#dataModal_data').append(html);
        }
    },
    populate_layerInfoModalFromGeojson: function(e){
        // used on mouseover of a layer
        // e is the mouseover event
        var html, c_idx, prop_name;
        html = '';
        //Clear out old modal content
        $('#layerInfoModal_data').html('');
        //Title
        for (c_idx = 0; c_idx < statics.title_cols.length; c_idx++){
            prop_name = statics.title_cols[c_idx].toUpperCase();
            html += '<b>' + prop_name + '</b>'+ ': ';
            html += e.feature.getProperty(prop_name) + '<br>';
        }
        $('#layerInfoModal_data').append(html);
    },
    get_ft_map_layer: function(ft_id, region){
        var layer = new google.maps.FusionTablesLayer({
            query: {
                select: 'geometry',
                from: ft_id
            },
            options: js_statics.ft_styles[region],
            suppressInfoWindows: true
        });
        google.maps.event.addListener(layer, 'click', function(e) {
            //Hide old data modal
            $('#dataModal').modal('hide');
            MAP_APP.populate_dataModalFromFT(e);
            $('#dataModal').modal('toggle');
        });
        return layer;
    },
    set_ft_map_layer: function(idx){
        //Get the map layer
        var region = $('#region').val(),
            field_year = null;
        if (region.is_in(['US_fields', 'Mason'])) {
            field_year = $('#field_year').val();
        }
        var ft_id = MAP_APP.get_fusiontable_id(region, field_year);
        var layer = MAP_APP.get_ft_map_layer(ft_id, region);

        //Set the map layer
        layer.setMap(window.map);
        window.layers[idx - 1] = layer;
        //Zoom to layer
        queryText = MAP_APP.get_fusiontableQueryText(ft_id, null, null, null);
        MAP_APP.zoomToFusiontable(queryText);
    },
    set_geojson_map_layer: function(year_idx){
         function processPoints(geometry, callback, thisArg) {
            if (geometry instanceof google.maps.LatLng) {
                callback.call(thisArg, geometry);
            } else if (geometry instanceof google.maps.Data.Point) {
                callback.call(thisArg, geometry.get());
            } else {
                geometry.getArray().forEach(function(g) {
                    processPoints(g, callback, thisArg);
                });
            }
        }

        var year_list = statics.all_field_years,
            field_year = year_list[year_idx],
            featureStyle, data, bounds;

        data = new google.maps.Data();

        /*
        LOAD THE DATA FROM THE TEMPLATE VARIABLE
        json_data global var that hold et data and 
        geometry info,  defined in scripts.html
        */
        if (Object.keys(json_data).length != 0){
            data.addGeoJson(json_data);
            console.log(data);
            
        }
        else{
            /*
            No data could be pulled from the db, read data from 
            statics dir for now
            FIX ME: we should always have data from the db
            stored in tv var json_data
            */
            f_name = 'static/geojson/Mason_' + field_year + '.geojson';
            data.loadGeoJson(f_name);
        }
        //Only show data that are in current map bound
        setTimeout(function() {
            count = 0;
            data.forEach(function(feature) {
                count+=1;
                console.log(count)
                var feat_bounds = new google.maps.LatLngBounds();
                processPoints(feature.getGeometry(), feat_bounds.extend, feat_bounds);
                var sw = feat_bounds.getSouthWest();
                var ne = feat_bounds.getNorthEast();
                if(!window.map.getBounds().contains(sw) || !window.map.getBounds().contains(ne)) {
                    data.remove(feature);
                }
            });
        }, 500);
        

        featureStyle = MAP_APP.set_featureStyle(field_year);
        data.setStyle(featureStyle);

        /*
        // zoom to show all the features
        bounds = new google.maps.LatLngBounds();
        data.addListener('addfeature', function(e) {
            processPoints(e.feature.getGeometry(), bounds.extend, bounds);
            window.map.fitBounds(bounds);
        });
        */

        data.setMap(window.map);
        window.layers[year_idx] = data;
        /*
        FIX ME: not working right
        //onmouseover show layer info
        data.addListener('mouseover', function(e) {
            console.log('MOUSOVER');
            //Hide old info modal
            $('#layerInfoModal').modal('hide');
            MAP_APP.populate_layerInfoModalFromGeojson(e);
            $('#layerInfoModal').modal('toggle');
        });
        data.addListener('mouseout', function(e) {
            //Hide the info modal
            $('#layerInfoModal').modal('hide');
        });
        */
        // onclick populate dataModal
        //window.map.data.addListener('click', function(e) {
        data.addListener('click', function(e) {
            /*
            var bounds = new google.maps.LatLngBounds();
            processPoints(e.feature.getGeometry(), bounds.extend, bounds);
            map.fitBounds(bounds);
            */
            //Hide old data modal
            $('#dataModal').modal('hide');
            //MAP_APP.populate_dataModalFromGeojson(e, year_idx);
            MAP_APP.initialize_dataModal(e);
            MAP_APP.add_dataToModal(e);
            $('#dataModal').modal('toggle');
        });
    },
    set_geojson_map_layers: function(){
        var region = $('#region').val(),
            field_years, field_year, y_idx,
            featureStyle, bounds, data,
            //data = new google.maps.Data(),
            featureGeoJSON, idx;

        //NOTE: currently we only allow single years for fields
        field_years = [$('#field_year').val()];
        //field_years = $('#field_years').val();
        for (idx = 0; idx < field_years.length; idx++){
            field_year = field_years[idx]
            y_idx = $.inArray(field_year, statics.all_field_years);
            MAP_APP.set_geojson_map_layer(y_idx);
        }
    },
    delete_layer: function(idx){
        if (window.layers.length && window.layers[idx] != null){
            window.layers[idx].setMap(null);
            window.layers[idx] = null;
        }
    },
    delete_layers: function(){
        var idx;
        for (idx = 0; idx < window.layers.length; idx++){
            MAP_APP.delete_layer(idx);
        }
    }
}

// Initialize the Google Map and add our custom layer overlay.
var initialize_map = function() {
    if ($('#app_name').val() == 'databaseTask'){
        return;
    }
    //Set the map zoom dependent on region
    var mapZoom = 10;
    if ($('#region').val().not_in(['US_fields', 'Mason'])){
        mapZoom = 4;
    }
    // Map
    window.map = new google.maps.Map(document.getElementById('main-map'), {
        center: {lat: 38.96, lng:-119.16},
        zoom: mapZoom,
        mapTypeId: 'satellite'
    });
    //Need to set global vars for zooming and listeners
    window.layers = [];
    for (var i = 0; i < statics.all_field_years.length; i++){
        window.layers.push(null);
    }
    if (mapZoom >=8){
        //MAP_APP.set_ft_map_layer(1);
        MAP_APP.set_geojson_map_layers();
    }


    /* Only show fields at certain zoom level */
    google.maps.event.addListener(window.map, 'zoom_changed', function() {
        var zoom = window.map.getZoom();
        if (zoom >=8){
            //MAP_APP.set_ft_map_layer(1);
            MAP_APP.set_geojson_map_layers();
        }
        else{
            MAP_APP.delete_layers();
        }
    });
}
