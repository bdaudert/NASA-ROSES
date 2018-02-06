/* MAP Utils*/
var MAP_APP = MAP_APP || {};
MAP_APP = {
    setMarkerOptions: function(){
        var mkrOptions = {
            draggable: true
        };
        return mkrOptions;
    },
    setMarkerListeners: function(marker, shape_idx){
        google.maps.event.addListener(marker, 'dragend', function (event) {
            var new_lat = precise_round(event.latLng.lat(),2).toString();
            var new_lon = precise_round(event.latLng.lng(),2).toString();
            var loc = new_lon + ',' + new_lat
            //Update formfield
            $('#point_' + String(shape_idx)).val(loc);
            //var myLatlng = new google.maps.LatLng(parseFloat(new_lat),parseFloat(new_lon));
            //map.panTo(myLatlng);
        });
    },
    setPolyOptions: function(){
        var opacity = 0.45;
        /*
        if (window.map.overlayMapTypes && window.map.overlayMapTypes.length >= 1){
            opacity = 0;
        }
        */
        var polyOptions = {
            strokeWeight: 0,
            fillOpacity: opacity,
            editable: true,
            draggable:true,
            fillColor: "#1E90FF",
            strokeColor: "#0c3966"
        };
        return polyOptions;
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
        t_res = $('#temporal_resolution').val();
        html = '';
        //Title
        for (c_idx = 0; c_idx < statics.title_columns.length; c_idx++){
            col_name = statics.title_columns[c_idx];
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
        col_names = statics.ft_cols[v][t_res];
        //populate html with data
        for (c_idx = 0; c_idx < col_names.length; c_idx++){
            col_name = col_names[c_idx];
            data_val = e.row[col_name].value;
            html += col_name + ': ' + data_val + '<br>'
        }
        $('#dataModal_data').append(html);
    },
    populate_dataModalFromGeojson: function(e){
        // e is the click event
        var prop_name, prop_names = [], 
            v, t_res, m_idx, m_str, c_idx, data_val,
            html, data_div = $('#modal_data');
        //Clear out old modal content
        $('#dataModal_title').html('');
        $('#dataModal_data').html('');
        v = $('#variable').val();
        t_res = $('#temporal_resolution').val();
        html = '';
        //Title
        for (c_idx = 0; c_idx < statics.title_columns.length; c_idx++){
            prop_name = statics.title_columns[c_idx];
            html += '<b>' + prop_name + '</b>'+ ': ';
            html += e.feature.getProperty(prop_name) + '<br>';
        }
        html += '<b>' + v + '</b>';
        if ($('#form-field_year').css('display') != 'none'){
            html += '<b>Year ' + $('#field_year').val() + '</b>:';
        }
        $('#dataModal_title').append(html);
        html = '';
        //Populate the columnnames
        prop_names = statics.ft_cols[v][t_res];
        //populate html with data
        for (c_idx = 0; c_idx < prop_names.length; c_idx++){
            prop_name = prop_names[c_idx];
            data_val = e.feature.getProperty(prop_name);
            html += prop_name + ': ' + data_val + '<br>'
        }
        $('#dataModal_data').append(html);
    },
    populate_layerInfoModalFromGeojson: function(e){
        // used on mouseover of a layer
        // e is the click event
        var html, c_idx, prop_name;
        html = '';
        //Clear out old modal content
        $('#layerInfoModal_data').html('');
        //Title
        for (c_idx = 0; c_idx < statics.title_columns.length; c_idx++){
            prop_name = statics.title_columns[c_idx];
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
            options: statics.ft_styles[region],
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
        if (region == 'fields'){
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
    set_geojson_map_layer: function(idx){
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
        var region = $('#region').val(), field_year = null, 
            featureStyle, bounds,
            data = new google.maps.Data(), 
            featureGeoJSON;

        featureGeoJSON = 'static/geojson/test.geojson';
        if (region == 'fields'){
            field_year = $('#field_year').val();
            featureGeoJSON = 'static/geojson/Mason_' + field_year + '.geojson';
        }
        //Load the geojson
        data.loadGeoJson(featureGeoJSON);
        featureStyle = {
            fillColor: '#ADFF2F',
            fillOpacity: 0.1,
            strokeColor: '#002800',
            stokeOpacity: 0.5,
            strokeWeight: 0.5
        };
        data.setStyle(featureStyle);
        // zoom to show all the features
        bounds = new google.maps.LatLngBounds();

        //window.map.data.addListener('addfeature', function(e) {
        data.addListener('addfeature', function(e) {
            processPoints(e.feature.getGeometry(), bounds.extend, bounds);
            window.map.fitBounds(bounds);
        });
        data.setMap(window.map);
        window.layers[idx -1] = data;
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
            MAP_APP.populate_dataModalFromGeojson(e);
            $('#dataModal').modal('toggle');
        });
        //Load mapdata via geoJson
        //var featureGeoJSON = 'static/geojson/Mason_' + field_year + '.geojson' ;
        //featureGeoJSON defined in templates/scripts.html
        //window.map.data.loadGeoJson(featureGeoJSON);
    },
    delete_layer: function(idx){
        if (window.layers.length && window.layers[idx - 1] != null){
            window.layers[idx - 1].setMap(null);
            window.layers[idx - 1] = null;
        }
    },
}

// Initialize the Google Map and add our custom layer overlay.
var initialize_map = function() {
    // Map
    window.map = new google.maps.Map(document.getElementById('main-map'), {
        center: {lat: 39.23, lng:-116.94},
        zoom: 7,
        mapTypeId: 'satellite'
    });
    //Need to set global vars for zooming and listeners
    window.layers = [null];
    // Drawing Manager
    /*
    var drawingManager = MAP_APP.setDrawingManager();
    drawingManager.setMap(map);
    */
    //MAP_APP.set_ft_map_layer(1);
    MAP_APP.set_geojson_map_layer(1);
}
