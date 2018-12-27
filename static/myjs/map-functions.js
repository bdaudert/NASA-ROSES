/* MAP Utils*/

var NOT_USED = NOT_USED || {}
NOT_USED = {
    set_feat_colors: function () {
        var i, j, mn, mx, bins = [], step, num_colors = 9, cb = {'colors': [], 'bins': []};
        // Colors taken from colorbrewer2.org
        var colors = ["#f7fcf0", "#e0f3db", "#ccebc5", "#a8ddb5", "#7bccc4", "#4eb3d3", "#2b8cbe", "#0868ac", "#084081"];
        // Alternative set with 10 diverging colors
        //var colors = ["#67001f", "#b2182b", "#d6604d", "#f4a582", "#fddbc7", "#e0e0e0", "#bababa", "#878787", "#4d4d4d", "#1a1a1a"];
        mn = window.DATA.minET;
        mx = window.DATA.maxET;
        step = myRound((mx - mn) / num_colors, 0);
        j = mn;
	    while (j <  mx) {
            bins.push([myRound(j,0), myRound(j + step, 0)]);
            j += step;
        }
        cb = {'colors': colors, 'bins': bins}
        return cb;
    },
    choroStyleFunction: function(et) {
        /*
        Sets the feature styles for Choropleth map
        */

        var i, color = '';
        for (i = 0; i < window.bins.length; i++) {
            if (window.bins[i][0] <= et && et <= window.bins[i][1]) {
                color = window.feat_colors[i];
                break;
            }
        }
        return color;
    },
    highlight_feature: function(e) {
        /*highlights feature on mouse over*/
        var style = {
            fillColor: 'black',
            fillOpacity: 0.7,
            fill: true,
            stroke: true,
            weight: 3,
            color: '#666'
        }
        window.main_map_layer.setFeatureStyle(e.layer.properties.SimsID, style);
    },
    reset_highlight: function(e) {
        /*Resets featue on mouseout*/
        window.main_map_layer.resetFeatureStyle(e.layer.properties.SimsID);
    },
        delay: function(timeout, id, callback){
        /*
        Delay needed for zooming to work properly
        */
        this.delays = this.delays || [];
        var delay = this.delays[ id ];
        if (delay){
            clearTimeout(delay);
        }
        delay = setTimeout(callback, timeout);
        this.delays[id] = delay;
    },
    set_mapGeoJson: function(geojson, map_type, region) {
        /*
        Set the map layer (geojson object) on the map
        */
        $('.popup').css("display", "none");
        window.main_map_layer = L.vectorGrid.slicer(geojson, {
            rendererFactory: L.canvas.tile,
            vectorTileLayerStyles: {
                sliced: function(properties, zoom) {
                return {
                    fillColor: LF_MAP_APP.get_color(map_type),
                    fillOpacity: 0.7,
                    stroke: true,
                    fill: true,
                    color: 'black',
                    weight: 0.5
                }
            }
          },
          interactive: true,
          getFeatureId: function(feature) {
              return feature.properties.region;
          }
        })
        /*.on ({
            mouseover: LF_MAP_APP.highlight_feature,
            mouseout: LF_MAP_APP.reset_highlight
        })*/
        .addTo(window.map);

        window.main_map_layer
        .on('click', function(e) {
                window.region = e.layer.properties.region;
                var zoom = js_statics.region_properties[window.region]['zoom'];
                var center = js_statics.region_properties[window.region]['center'];
                window.map.flyTo(center, zoom);
               LF_MAP_APP.update_mapLayer(null, 'choropleth', e.layer.properties.region);
        })
    },
     delete_mapLayer: function(){
        /*
        Delete the map layer (geojson layer) from the map
        */
        var i = 0; //FIXME: this is a hack, need better solution
        window.map.eachLayer(function (layer) {
             if (i != 0) { window.map.removeLayer(layer); }
             i++;
        });
        window.map.main_map_layer = null;
        LF_MAP_APP.hide_mapColorbar('.colorbar-container');
    },
     update_mapLayer: function(geojson=null, map_type, auto_set_region=false){
        /*
        Updates the map and sets up the popup window for click on single feature
        */
        // Delete old layer
        if (window.main_map_layer) {
            LF_MAP_APP.delete_mapLayer();
            LF_MAP_APP.hide_mapColorbar('.colorbar-container');
        }

        if (map_type == 'study_areas') {
            LF_MAP_APP.set_mapGeoJson(geojson, map_type);
        }

        if (map_type == 'choropleth') {
            //Set the colors for Choropleth map, draw colorbar
            // FIXME: replace hard-coded values with ajax call to database?
            window.DATA.maxET = 2510;
            window.DATA.minET = 0;
            $('.colorbar-container').css('display', 'block');
            var cb = LF_MAP_APP.set_choro_colors_and_bins();
            window.feat_colors = cb['colors'];
            window.bins = cb['bins'];
            LF_MAP_APP.draw_mapColorbar(cb['bins'], cb['colors'], '#colorbar');
            LF_MAP_APP.set_mapVectorTiles(map_type);
        }
    },
    on_zoom_change_region: function(){
        /*
        Change the region at different zoom levels
        when user zooms on map (auto_set_region = true)
        */
        var zoom = window.map.getZoom();
        if (js_statics.region_by_map_zoom.hasOwnProperty(String(zoom))) {
            var region = $('#region').val(),
                new_region = js_statics.region_by_map_zoom[String(zoom)];
            if (region != new_region) {
                change_inRegion(new_region, auto_set_region=true);
            }
        }
    },
    set_map_zoom_pan_listener: function(auto_set_region=false) {
        /*
        When aut_set_region = true we change region when user changes zoom on map
        via the moveend listener (detects pan and zoom)
        else (region was changed in the form), disbale the moveend listener
        */
        if (!auto_set_region) {
            //Disable the map listener that changes region on zoom
            try {
                window.map.off('moveend', LF_MAP_APP.on_zoom_change_region);
            }catch(e){}
        }else{
            // Show different regions at different zoom levels
            window.map.on('moveend', LF_MAP_APP.on_zoom_change_region);
        }
    }
}


var LF_MAP_APP = LF_MAP_APP || {};
LF_MAP_APP = {
    LightenDarkenColor: function (col, amt) {
        //Darkens or Lightens the color by the  amnt
        //amnt negative means darken, amnt positive means lighten
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
    set_choro_colors_and_bins: function (val_list, start_color, num_colors, DOrL) {
        /*
        Creates bins and colors for data in val_list
        Given a start color and DOrL value of 'darken' or 'lighten',
        colors
        */
        var j, colors = [], val_list, d, mn, mx,
            bins = [], step, amt, num_colors = 10, cb = {'colors': [], 'bins': []}, new_color;

        if (!val_list) {
            return cb;
        }
        mn = Math.floor(Math.min.apply(null, val_list));
        mx = Math.ceil(Math.max.apply(null, val_list));
        step = myRound((mx - mn) / num_colors, 2);
        if ((mx - mn) % num_colors != 0) {
            mx = mx + step;
        }
        amt = 0, j = mn;
        while (j < mx) {
            new_color = LF_MAP_APP.LightenDarkenColor(start_color, amt);
            colors.push(new_color);
            bins.push([myRound(j, 2), myRound(j + step, 2)]);
            if (DOrL != 'darken') {
                amt += 10;
            } else {
                amt -= 10;
            }
            j += step;
        }
        /*
        cb = {'colors': colors, 'bins': bins}
        return cb;
        */
        window.choro_colors = colors;
        window.choro_bins = bins;
    },
     draw_mapColorbar: function (bins, colors, div_id) {
        $(div_id).css('display', 'block');
        colorScale(bins, colors, div_id);
    },
    hide_mapColorbar: function(div_id){
        $(div_id).css('display', 'none');
    },
    choroStyleFunction: function(feature) {
        /*
        Sets the feature styles for Choropleth map
        */
        var year = $('#year').val(),
            idx = feature.properties['feature_index'],
            v = $('#variable').val(), color = null, i;

        // Note: for Choro, val_list is always of length 1
        var feat_data = window.DATA.etdata[year]['features'][idx]['properties'];
        // Get the monthly data
        var data_vals = [],  data_val = 0.0, mon = ''
        for (var i = 1; i < 12; i++){
            if (i < 10){
                mon = '0' + String(m);
            }else{
                mon = String(i);
            }
            data_vals.push(feat_data[v + '_' + mon]);
        }
        data_val = data_vals.sum;
        //Find the right bin
        for (i = 0; i < window.choro_bins.length; i++) {
            if (window.choro_bins[i][0] <= data_val && data_val <= window.choro_bins[i][1]) {
                color = window.choro_colors[i];
                break;
            }
        }
        var style = {
            fillColor: color,
            weight: 2,
            opacity: 1,
            color: 'black',
            dashArray: '3',
            fillOpacity: 0.7
        }
        return style;
    },
    determine_map_type: function(){
        /*
        Determines map type (choropleth or study_areas)
        from form inputs
        */
        if ($('#region').val() == "study_areas") {
            return 'study_areas';
        } else {
            return 'choropleth';
        }
    },
    set_lfRaster: function(){
        /*
        Sets default openlayer basemap raster
        FIX ME: there might be a better looking obne, e.g. satellite base
        */
        var layer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        });
        return layer;
    },
    delete_mapLayers: function(){
        //NEW
        var i = 0; //FIXME: this is a hack, need better solution, first layer is map itself
        window.map.eachLayer(function (layer) {
             if (i != 0) {
                 window.map.removeLayer(layer);
                 window.map_layers[i - 1] = null;
             }
             i++;

        });
    },
    update_geosjon_mapLayers: function() {
        //NEW
        var map_type = LF_MAP_APP.determine_map_type();
        if (map_type == 'choropleth') {
            LF_MAP_APP.set_choropleth_mapLayer();
        } else if (map_type == 'study_areas') {
            LF_MAP_APP.set_landing_page_mapLayer();
        }
    },
    set_landing_page_mapLayer: function(){
        if (! window.map_layers) {
            window.map_layers = [];
        }
        if (! window.regions){
            window.regions = [];
        }
        //Delete old map layers
        LF_MAP_APP.delete_mapLayers;

        var region = 'study_areas';
        var zoom = js_statics.region_properties[region]['zoom'];
        var center =  js_statics.region_properties[region]['center'];
        window.map.flyTo(center, zoom);
        for (var g_idx = 0; g_idx < Object.keys(window.DATA.map_geojson).length; g_idx++) {
            $('.popup').css("display", "none");
            var r = Object.keys(window.DATA.map_geojson)[g_idx];
            var geojson = window.DATA.map_geojson[r];
            var color = js_statics.region_properties[r]['color'];
            var style = {
                fillColor: color,
                fillOpacity: 0.7,
                stroke: true,
                fill: true,
                color: 'black',
                weight: 0.5
            };
            window.regions.push(r);
            window.map_layers[g_idx]  = L.geoJson(geojson, {
                style: style,
                onEachFeature: function(feature, layer) {
                    layer.on("click", function (e) {
                        //Zoom to the region and show the filed choropleth
                        var reg = feature.properties.region;
                        var z = js_statics.region_properties[reg]['zoom'];
                        var c = js_statics.region_properties[reg]['center'];
                        window.map.flyTo(c, z);
                        LF_MAP_APP.set_choropleth_mapLayer();
                    });
                }
            }).addTo(map);

            /*
            // FIX ME: not working
            //window.main_map_layer = L.vectorGrid.protobuf('http://localhost:8889/data/vector/{z}/{x}/{y}.pbf?debug=true', {
            window.map_layers[i] = L.vectorGrid.slicer(geojson, {
                rendererFactory: L.canvas.tile,
                vectorTileLayerStyles: {
                    sliced: function(properties, zoom) {
                        return style;
                    }
                },
                interactive: true,
                getFeatureId: function(f) {
		            return f.properties[Object.keys(f.properties)[0]];
	            }
            })
            .on('mouseover', function(e) {
                console.log(e.layer.properties);
            })
            .on('mouseout', function(e) {
                console.log('mouseover');
            })
            .on('click', function(e) {
                console.log('clicked');
                //Zoom to the region and show the filed choropleth
                var r = window.regions[i];
                var z = js_statics.region_properties[r]['zoom'];
                var c =  js_statics.region_properties[r]['center'];
                window.map.flyTo(c,z);
                LF_MAP_APP.set_choropleth_mapLayer();
            })
            .addTo(window.map);
            */

            /*
            // FIXME: Is there a way to do this with vector tiles?
            var geojsonLayer = L.geoJson(geojson)
            window.map.fitBounds(geojsonLayer.getBounds());
            */
        }

    },
    set_choropleth_mapLayer: function(){
        //NEW --> needs to be written
        LF_MAP_APP.delete_mapLayers();
        //Set the colors for Choropleth map, draw colorbar
        // FIXME: replace hard-coded values with ajax call to database?
        $('.colorbar-container').css('display', 'block');
        // Update window.DATA.etdata
        ajax_update_etdata();
        LF_MAP_APP.set_choro_colors_and_bins(window.DATA.etdata, '#e5f5f9', 10, 'darken');
        LF_MAP_APP.draw_mapColorbar(window.choro_bins, window.choro_colors, '#colorbar');
        window.map_layer[0] =  L.geoJson(window.DATA.map_geojson[0], {
            style: LF_MAP_APP.choroStyleFunct,
            onEachFeature: function(feature, layer) {
                layer.on("click", function (e) {
                    LF_MAP_APP.zoomToFeature(e);
                    LF_MAP_APP.set_popup_window_single_feat(e, feature, layer);
                })
            }
        }).addTo(window.map);

    }
}


var initialize_lf_map = function() {
    var region = $('#region').val();
    //Set the map zoom dependent on region
    var mapZoom = js_statics.region_properties[region]['zoom'],
        mapCenter = js_statics.region_properties[region]['center'];

    //Set the basic map
    window.map = L.map('main-map', {
        center: [mapCenter.lat, mapCenter.lng],
        zoom: mapZoom,
        zoomControl: false
    });
    // Set the base map
    LF_MAP_APP.set_lfRaster().addTo(window.map);
    L.control.zoom({
       position:'topright'
    }).addTo(window.map);
    LF_MAP_APP.hide_mapColorbar('.colorbar-container');

    // Set the map layers
    window.map_layers = [];
    window.regions = [];
    if (region == "ee_map"){
        //API call to CE
    }else {
        LF_MAP_APP.update_geosjon_mapLayers();
    }
}

