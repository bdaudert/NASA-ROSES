/* MAP Utils*/
var MAP_APP = MAP_APP || {};
MAP_APP = {
    set_start_color: function () {
        return '#9bc2cf';
    },
    LightenDarkenColor: function (col, amt) {
        //Darken amnt = negative number
        var usePound = false;
        if (col[0] == "#") {
            col = col.slice(1);
            usePound = true;
        }
        var num = parseInt(col, 16);
        var r = (num >> 16) + amt;

        if (r > 255) r = 255;
        else if (r < 0) r = 0;

        var b = ((num >> 8) & 0x00FF) + amt;

        if (b > 255) b = 255;
        else if (b < 0) b = 0;

        var g = (num & 0x0000FF) + amt;

        if (g > 255) g = 255;
        else if (g < 0) g = 0;
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
    },
    set_feat_colors: function (start_color, DOrL, year) {
        var et_var = $('#variable').val(),
            t_res = $('#t_res').val(),
            time_period = $('#time_period').val(),
            stat = $('#time_period_statistic').val(),
            et_stat, i, idx, featdata, j, colors = [], val_list, d, mn, mx,
            year = $('#year').val(),
            bins = [], step, amt, num_colors = 10, cb = {'colors': [], 'bins': []}, new_color,
            featdata = DATA.etdata[year];
        val_list = set_singleYear_allFeat_valList(year, et_var, t_res, time_period, stat, featdata);
        if (!val_list) {
            return cb;
        }
        mn = Math.floor(Math.min.apply(null, val_list));
        mx = Math.ceil(Math.max.apply(null, val_list));
        step = (mx - mn) / num_colors;
        if ((mx - mn) % num_colors != 0) {
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
    set_feat_styles: function (data, cb, start_color, year) {
        var feat_colors = cb['colors'], bins = cb['bins'];
        data.setStyle(function (feature) {
            var idx = feature.getProperty('idx'),
                v = $('#variable').val(),
                t_res = $('#t_res').val(),
                et_vars = statics.stats_by_var_res[v][t_res],
                et_var = et_vars[0];
            var data_val = DATA.etdata[year].features[idx]['properties'][et_var];
            var color = start_color, i;
            //Find the right bin
            for (i = 0; i < bins.length; i++) {
                if (bins[i][0] <= data_val && data_val <= bins[i][1]) {
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
    drawMapColorbar: function (colors, bins) {
        var palette = '', ticks = [], myScale, colorbar, i;
        for (i = 0; i < colors.length; i++) {
            palette += colors[i].replace(/#/g, '');
            if (i < colors.length - 1) {
                palette += ','
            }
            ticks.push(myRound(bins[i][0], 1));
        }
        ticks.push(myRound(bins[bins.length - 1][1], 1))
        myScale = d3.scale.quantize().range(colors).domain(d3.range(colors.length + 1));
        myScale.type = 'QUANTIZE';
        myScale.ticks = ticks;
        colorbar = Colorbar()
            .thickness(35)
            .barlength(800)
            .orient("horizontal")
            .scale(myScale);
        colorbarObject = d3.select("#colorbar").call(colorbar);
    },
    setDrawingManager: function () {
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
    initialize_dataModal: function (feat_idx) {
        // e is the click event
        //idx is the feature index in etdata
        var html;
        //Clear out old modal content
        $('#dataModal_title').html('');
        $('#dataModal_data').html('');
        html = set_dataModalHeader(feat_idx);
        $('#dataModal_title').append(html);
    },
    add_dataToModal: function (feat_idx, featdata) {
        var feat_indices = [feat_idx],
            y_idx, year, years,
            html, val_list, new_prop_names,
            et_var = $('#variable').val(),
            t_res = $('#t_res').val(),
            time_period = $('#time_period').val(),
            stat = $('#time_period_statistic').val();


        if ($.type(time_period) == 'string') {
            time_period = [time_period];
        }
        if ($('#years').css('display') != 'none'){
            years = $('#years').val();
        }else{
            years = [$('#year').val()];
        }
        //Populate the columnnames
        val_dict = set_dataModalValList_multiYear(years, et_var, t_res, time_period, stat, featdata, feat_indices);
        new_prop_names = set_dataModalPropertyNames(et_var, t_res, time_period, stat);
        html = set_dataModalData(val_dict, new_prop_names);
        $('#dataModal_data').append(html);
    },
    set_data_layer: function (data) {
        function processPoints(geometry, callback, thisArg) {
            if (geometry instanceof google.maps.LatLng) {
                callback.call(thisArg, geometry);
            } else if (geometry instanceof google.maps.Data.Point) {
                callback.call(thisArg, geometry.get());
            } else {
                geometry.getArray().forEach(function (g) {
                    processPoints(g, callback, thisArg);
                });
            }
        }

        /*
        LOAD THE DATA FROM THE TEMPLATE VARIABLE
        etdata global var that hold et data and
        geometry info,  defined in scripts.html
        */
        window.map.data = new google.maps.Data({
            map: window.map
        });

        window.map.data.addGeoJson(data);
        /*
        //Only show data that are in current map bound
        setTimeout(function () {
            var msg = 'Adding layers to map';
            start_progressbar(msg=msg);
            window.map.data.forEach(function (feature) {
                var feat_bounds = new google.maps.LatLngBounds();
                processPoints(feature.getGeometry(), feat_bounds.extend, feat_bounds);
                var sw = feat_bounds.getSouthWest();
                var ne = feat_bounds.getNorthEast();
                if (!window.map.getBounds().contains(sw) || !window.map.getBounds().contains(ne)) {
                    data.remove(feature);
                }
            });
            end_progressbar();
        }, 500);
        */

        /*
        // zoom to show all the features
        bounds = new google.maps.LatLngBounds();
        window.map.data.addListener('addfeature', function(e) {
            processPoints(e.feature.getGeometry(), bounds.extend, bounds);
            window.map.fitBounds(bounds);
        });
        */
        window.map.data.addListener('click', function (e) {
            var feat_idx =  e.feature.getProperty('idx'),
                y_idx, years = $('#years').val(), year;
            $('#feat_indices').val(feat_idx);

            if (years.length != 1) {
                ajax_set_feat_data();
            }else{
                MAP_APP.initialize_dataModal(window.DATA.geomdata[years[0]]['features'][feat_idx]);
                var featdata = {}
                for (y_idx = 0; y_idx < years.length; y_idx++) {
                    year = years[y_idx];
                    featdata[year] = {type: 'FeatureCollection', features: []};
                    featdata[year]['features'].push(window.DATA.etdata[year]['features'][feat_idx]);
                }
                MAP_APP.add_dataToModal(feat_idx, featdata);
                $('#dataModal').modal('toggle');
            }
        });
    },
    set_map_overlay: function(){
        //Sanity check
        start_progressbar(mgs='Adding layers to map');
        if (Object.keys(DATA.geomdata).length == 0) {
            return;
        }
        var region = $('#region').val(),
            region_zoom = js_statics.map_zoom_by_region[region],
            year = $('#year').val(),
            data = DATA.geomdata[year];

        MAP_APP.set_data_layer(data);
        if (window.map.getZoom() < region_zoom){
            window.map.setZoom(region_zoom);
        }
        end_progressbar();
    },
    set_choropleth_layer: function () {
        //Sanity check
        start_progressbar(mgs='Adding layers to map');
        if (Object.keys(DATA.geomdata).length == 0) {
            return;
        }
        //Set styles for chloropleth map
        var start_color = MAP_APP.set_start_color(),
            year = $('#years').val()[0],
            cb = MAP_APP.set_feat_colors(start_color, 'darken', year),
            region = $('#region').val(),
            region_zoom = js_statics.map_zoom_by_region[region],
            data = DATA.geomdata[year];

        MAP_APP.set_data_layer(data);
        MAP_APP.set_feat_styles(window.map.data, cb, start_color, year);
        //Draw the colorbar
        MAP_APP.drawMapColorbar(cb['colors'], cb['bins'], start_color);
        //Set the map zoom
        if (window.map.getZoom() < region_zoom){
            window.map.setZoom(region_zoom);
        }
        end_progressbar();
    },
    delete_map_layers: function () {
        if (window.map.data) {
            window.map.data.forEach(function (feature) {
                window.map.data.remove(feature);
                //window.map.data.setStyle(feature, {});
            });

            //window.map.data.setStyle({});
            window.map.data.setMap(null);
            //window.map.data = new google.maps.Data({});
        }
    }
}


// Initialize the Google Map and add our custom layer overlay.
var initialize_map = function() {
    if ($('#app_name').val() == 'databaseTask'){
        return;
    }
    var region = $('#region').val();
    //Set the map zoom dependent on region
    var mapZoom = js_statics.map_zoom_by_region[region],
        mapCenter = js_statics.map_center_by_region[region];
    // Map
    window.map = new google.maps.Map(document.getElementById('main-map'), {
        //center: {lat: 38.96, lng:-119.16},
        center: mapCenter,
        zoom: mapZoom,
        mapTypeId: 'satellite'
    });
    if (region == "ee_map"){
        //ajax_get_ee_map();
    }else {
        if ($('#years').val().length == 1) {
            MAP_APP.set_choropleth_layer();
        }else{
            set_map_overlay();
        }
    }

    /* Show different regions at different zoom levels */
    google.maps.event.addListener(window.map, 'zoom_changed', function() {
        var zoom = window.map.getZoom();
        if (js_statics.region_by_map_zoom.hasOwnProperty(String(zoom))) {
            var region = $('#region').val(),
                new_region = js_statics.region_by_map_zoom[String(zoom)];
            if (region != new_region) {
                change_inRegion(new_region);
            }
        }
    });
}
