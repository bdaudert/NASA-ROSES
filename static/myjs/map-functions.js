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
    initialize_dataModal: function(e){

        // e is the click event
        var prop_name, v, t_res, c_idx, html,years,
            idx = e.feature.getProperty('idx');
        //NOTE: currently we only allow one field for fields
        years = [$('#field_year').val()];
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
            if (metadata[idx][prop_name]) {
                html += metadata[idx][prop_name] + '<br>'
            }
        }
        html += '<b>Variable</b>: ' + v + '<br>';
        html += '<b>Years</b>: ' + years + '<br>';
        $('#dataModal_title').append(html);
    },
    add_dataToModal: function(e) {
        var idx = e.feature.getProperty('idx'),
            year, year_idx, prop_names, prop_name, c_idx, html, data_val,
            v = $('#variable').val(),
            t_res = $('#t_res').val();

        //NOTE: currently we only allow one field for fields
        var years = [$('#field_year').val()];
        html = '';
        html = 'Year: ' + year + '<br>';
        //Populate the columnnames
        prop_names = statics.stats_by_var_res[v][t_res];
        //populate html with data
        for (year_idx = 0; year_idx < years.length; year_idx++) {
            year = years[year_idx];
            html = '';
            html = 'Year: ' + String(year) + '<br>';
            for (c_idx = 0; c_idx < prop_names.length; c_idx++) {
                prop_name = prop_names[c_idx];
                data_val = etdata[idx][prop_name];
                html += prop_name + ': ' + data_val + '<br>'
            }
            html += '<br>';
        }
        $('#dataModal_data').append(html);
    },
    populate_layerInfoModalFromGeojson: function(e) {
        // used on mouseover of a layer
        // e is the mouseover event
        var html, c_idx, prop_name,
            idx = e.feature.getProperty('idx');
        html = '';
        //Clear out old modal content
        $('#layerInfoModal_data').html('');
        //Title
        for (c_idx = 0; c_idx < statics.title_cols.length; c_idx++) {
            prop_name = statics.title_cols[c_idx].toUpperCase();
            html += '<b>' + prop_name + '</b>' + ': ';
            html += metadata[idx][prop_name] + '<br>';
        }
        $('#layerInfoModal_data').append(html);

        for (year_idx = 0; year_idx < years.length; year_idx++) {
            year = years[year_idx];
            html = '';
            html = 'Year: ' + String(year) + '<br>';
            //Populate the columnnames
            prop_names = statics.stats_by_var_res[v][t_res];
            //populate html with data
            for (c_idx = 0; c_idx < prop_names.length; c_idx++) {
                data_val = etdata[idx][prop_name];
                html += prop_name + ': ' + String(data_val) + '<br>';
            }
        }
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
        etdata global var that hold et data and
        geometry info,  defined in scripts.html
        */

        if ( Object.keys(geomdata).length > 0 ) {
            data.addGeoJson(geomdata);

            //f_name = 'static/geojson/Mason_' + field_year + '.geojson';
            //data.loadGeoJson(f_name);

            //Only show data that are in current map bound
            setTimeout(function () {
                data.forEach(function (feature) {
                    var feat_bounds = new google.maps.LatLngBounds();
                    processPoints(feature.getGeometry(), feat_bounds.extend, feat_bounds);
                    var sw = feat_bounds.getSouthWest();
                    var ne = feat_bounds.getNorthEast();
                    if (!window.map.getBounds().contains(sw) || !window.map.getBounds().contains(ne)) {
                        data.remove(feature);
                    }
                });
            }, 500);
        }
        

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
            field_year = field_years[idx];
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
    var mapZoom = 11;
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
