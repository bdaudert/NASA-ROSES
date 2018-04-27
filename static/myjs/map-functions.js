/* MAP Utils*/
var MAP_APP = MAP_APP || {};
MAP_APP = {
    LightenDarkenColor: function(col, amt) {
        //Darken amnt = negative number
        var usePound = false;
        if ( col[0] == "#" ) {
            col = col.slice(1);
            usePound = true;
        }
        var num = parseInt(col,16);
        var r = (num >> 16) + amt;

        if ( r > 255 ) r = 255;
        else if  (r < 0) r = 0;

        var b = ((num >> 8) & 0x00FF) + amt;

        if ( b > 255 ) b = 255;
        else if  (b < 0) b = 0;

        var g = (num & 0x0000FF) + amt;

        if ( g > 255 ) g = 255;
        else if  ( g < 0 ) g = 0;
        return (usePound?"#":"") + (g | (b << 8) | (r << 16)).toString(16);
    },
    set_feat_colors: function(start_color, DOrL){
        var v = $('#variable').val(),
            t_res = $('#t_res').val(),
            et_vars = statics.stats_by_var_res[v][t_res],
            et_var, i, j, colors = [], data, mn, mx, bins = [], step, amt,
            num_colors = 10, cb = {'colors':[], 'bins':[]}, new_color ;
        et_var = et_vars[0];
        data = $.map(DATA.etdata, function(feat) {
            if (Math.abs(feat[et_var] + 9999) > 0.0001) {
                return feat[et_var];
            }
        });
        if (!data) {
            return cb;
        }
        mn = Math.floor(Math.min.apply(null, data));
        mx = Math.ceil(Math.max.apply(null, data));
        step = (mx - mn) / num_colors;
        if ((mx - mn) % num_colors != 0){
            mx = mx + step;
        }
        amt = 0, j = mn;
        while (j < mx) {
            new_color = MAP_APP.LightenDarkenColor(start_color, amt);
            colors.push(new_color);
            bins.push([j, j + step]);
            if (DOrL != 'darken') {
                amt += 10;
            } else {
                amt -= 10;
            }
            j += step;
        }
        cb = {'colors': colors, 'bins': bins}
        return cb;
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
    drawMapColorbar: function(colors, bins){
        var palette = '', ticks= [], myScale, colorbar, i;
        for (i = 0; i < colors.length; i++) {
            palette += colors[i].replace(/#/g, '');
            if (i < colors.length - 1){
                palette += ','
            }
            ticks.push(myRound(bins[i][0],1));
        }
        ticks.push(myRound(bins[bins.length - 1][1],1))
        myScale =  d3.scale.quantize().range(colors).domain(d3.range(colors.length + 1));
        myScale.type = 'QUANTIZE';
        myScale.ticks = ticks;
        colorbar = Colorbar()
            .thickness(40)
            .barlength(800)
            .orient("horizontal")
            .scale(myScale);
        colorbarObject = d3.select("#colorbar").call(colorbar);
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
        //idx is the feature index in etdata
        var html,
            idx = e.feature.getProperty('idx');
        //Clear out old modal content
        $('#dataModal_title').html('');
        $('#dataModal_data').html('');
        html = set_dataModalHeader(idx);
        $('#dataModal_title').append(html);
    },
    add_dataToModal: function(e) {
        var idx = e.feature.getProperty('idx'),
            html, val_list, new_prop_names,
            v = $('#variable').val(),
            t_res = $('#t_res').val(),
            time_period = $('#time_period').val(),
            stat = $('#time_period_statistic').val();

        if ($.type(time_period) == 'string'){
            time_period = [time_period];
        }
        //Populate the columnnames
        val_list = set_dataModalValList(v, t_res, time_period, stat, idx);
        new_prop_names = set_dataModalPropertyNames(v, t_res, time_period, stat);
        html = set_dataModalData(val_list, new_prop_names);
        $('#dataModal_data').append(html);
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
        //Sanity check
        if ( Object.keys(DATA.geomdata).length == 0 ) {
            return;
        }

        var year_list = statics.all_field_year[$('#region').val()],
            field_year = year_list[year_idx],
            featureStyle, data, bounds;

        /*
        LOAD THE DATA FROM THE TEMPLATE VARIABLE
        etdata global var that hold et data and
        geometry info,  defined in scripts.html
        */
        data = new google.maps.Data();
        data.addGeoJson(DATA.geomdata);
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

        featureStyle = MAP_APP.set_featureStyle(field_year);
        //data.setStyle(featureStyle);
        var start_color = '#9bc2cf';
        var cb = MAP_APP.set_feat_colors(start_color, 'darken');
        var feat_colors = cb['colors'], bins = cb['bins'];
        data.setStyle(function(feature) {
            var idx, v, t_res, et_vars, et_var, data_val, i, color,
                idx = feature.getProperty('idx'),
                v = $('#variable').val(),
                t_res = $('#t_res').val(),
                et_vars = statics.stats_by_var_res[v][t_res],
                et_var = et_vars[0],
                data_val = DATA.etdata[idx][et_var],
                color = start_color;
            //Find the right bin
            for (i = 0; i < bins.length; i++){
                if (bins[i][0] <= data_val && data_val <= bins[i][1]){
                    color = feat_colors[i];
                    break;
                }
            }
            props = {
                fillColor: color,
                fillOpacity: 0.5,
                strokeColor: '#000000',
                stokeOpacity: 0.8,
                strokeWeight: 0.5
            };
            return props;
        });
        //Draw the colorbar
        MAP_APP.drawMapColorbar(cb['colors'], cb['bins']);

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
            field_year, y_idx,
            featureStyle, bounds, data,
            //data = new google.maps.Data(),
            featureGeoJSON, idx;

        //NOTE: currently we only allow single years for fields
        field_year = $('#field_year').val();
        y_idx = $.inArray(field_year, statics.all_field_year[$('#region').val()]);
        MAP_APP.set_geojson_map_layer(y_idx);
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
    window.layers.push(null);
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
