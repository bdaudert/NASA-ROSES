/* MAP Utils*/
var MAP_APP = MAP_APP || {};
MAP_APP = {
    set_start_color: function(){
      return '#9bc2cf';
    },
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
    set_featureStyle: function(data, cb, start_color){
        var feat_colors = cb['colors'], bins = cb['bins'];

        data.setStyle(function(feature) {
            var idx = feature.getProperty('idx'),
                v = $('#variable').val(),
                t_res = $('#t_res').val(),
                et_vars = statics.stats_by_var_res[v][t_res],
                et_var = et_vars[0],
                data_val = DATA.etdata[idx][et_var],
                color = start_color, i;
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
            .thickness(35)
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
    set_data_layer: function(){
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
        /*
        LOAD THE DATA FROM THE TEMPLATE VARIABLE
        etdata global var that hold et data and
        geometry info,  defined in scripts.html
        */
        var data = new google.maps.Data();
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
         /*
        // zoom to show all the features
        bounds = new google.maps.LatLngBounds();
        data.addListener('addfeature', function(e) {
            processPoints(e.feature.getGeometry(), bounds.extend, bounds);
            window.map.fitBounds(bounds);
        });
        */
         data.addListener('click', function(e) {
            //Hide old data modal
            $('#dataModal').modal('hide');
            MAP_APP.initialize_dataModal(e);
            MAP_APP.add_dataToModal(e);
            $('#dataModal').modal('toggle');
         });
         return data;
    },
    set_map_layer: function(){
        //Sanity check
        if ( Object.keys(DATA.geomdata).length == 0 ) {
            return;
        }
        var data = MAP_APP.set_data_layer();
        data.setMap(window.map);
        //Set styles for chloropleth map
        var start_color = MAP_APP.set_start_color(),
            cb = MAP_APP.set_feat_colors(start_color, 'darken');
        MAP_APP.set_featureStyle(data, cb);
        //Draw the colorbar
        MAP_APP.drawMapColorbar(cb['colors'], cb['bins'], start_color);
    },
    set_map_layers: function() {
        var region = $('#region').val();
        if (region != 'ee_map') {
            MAP_APP.set_map_layer();
        }
    },
    delete_map_layer: function(feature){
        window.map.data.remove(feature);
    },
    delete_map_layers: function() {
        window.map.data.forEach(function (feature) {
            window.map.data.remove(feature);
        });
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
    if (mapZoom >=8){
        MAP_APP.set_map_layers();
    }


    /* Only show fields at certain zoom level */
    google.maps.event.addListener(window.map, 'zoom_changed', function() {
        var zoom = window.map.getZoom(),
            region = $('#region').val();
        if (zoom >=8 && region.is_in(['US_fields', 'Mason'])){
            MAP_APP.set_map_layer();
        }
    });
}
