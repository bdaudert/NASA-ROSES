/* MAP Utils*/

// General map utils (google map api and openlayers)
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
        val_list = MAP_APP.set_singleYear_allFeat_valList(featdata);
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
    set_singleYear_singleFeat_valList: function(featdata){
        /*
        Sets the value list for a single year and single feature
        featdata is the feature data for a single year
        */

        var prop_name, p_idx, s, tp, val_list = [],
            stat  = $('#time_period_statistic').val(),
            t_res = $('#t_res').val(),
            time_period = $('#time_period').val(),
            prop_names = statics.stats_by_var_res[$('#variable').val()][t_res];
        for (p_idx = 0; p_idx < prop_names.length; p_idx++) {
            prop_name = prop_names[p_idx];
            if (t_res != 'monthly'){
                if (Math.abs(featdata['properties'][prop_name] + 9999) > 0.0001) {
                    val_list.push(featdata['properties'][prop_name]);
                }
            }else{
                // Monthly property names are in format var_m<month_number>, e.g. et0_m06
                // We need to extract the month number from teh property name
                s = prop_names[p_idx].split('_');
                tp = s[s.length - 1].slice(-2);
                if (tp.substring(0, 1) == '0') {
                    tp = tp.substring(1, 2);
                }
                // Check that the month is picked in time_period
                if (tp.is_in(time_period)) {
                    if (Math.abs(featdata['properties'][prop_name] + 9999) > 0.0001) {
                        val_list.push(featdata['properties'][prop_name]);
                    }
                }
            }
        }
        if ($('#form-timeperiod-statistic').css('display') != 'none') {
            //Comnpute stats over month
            val_list = compute_stat(val_list, stat);
        }
        return val_list
    },
    set_singleYear_allFeat_valList: function(featdata){
        /*
        Used to set colorbar
        Sets the value list for a single year and multiple features
        NOTE: stat is computed over each feature
        */
        var val_list = [], d;
        // Return data for each feature separately
        d = $.map(featdata['features'], function (f_data) {
            return MAP_APP.set_singleYear_singleFeat_valList(f_data);
        });
        val_list = val_list.concat(d);
        return val_list;
    },
    set_singleYear_areaAveraged_valList: function(featsdata){
        /*
        Sets the value list by area averaging over the features in featdata
        */
        var val_lists = [], d, total_area = 0, f_area, feat_areas = [], feat_vals = [],
            v_idx, val_list = [],d,
            area_param = statics.area_param[$('#region').val()];

        // Return data for each feature separately
        $.map(featsdata['features'], function (f_data) {
            val_lists.push(MAP_APP.set_singleYear_singleFeat_valList(f_data));
            f_area = f_data['properties'][area_param]
            feat_areas.push(f_area);
            total_area += f_area;
        });
        // Area average over features
        for (v_idx = 0; v_idx < val_lists[0].length; v_idx ++) {
            d = $.map(feat_areas, function (feat_area, f_idx) {
                return val_lists[f_idx][v_idx] * feat_area / total_area;
            });
            val_list.push(myRound(d.sum(), 4));
        }
        return val_list;
    },
    set_multiYear_singleFeat_valDict: function(featdata){
        /*
        Sets the value list for multiple years and single feature
        and stores result in dict with year keys
        featdata is the feature data for a multiple years
        */
        var val_dict = {}, val_list = [], y_idx, year,
            years = $('#years').val();

        for (y_idx = 0; y_idx < years.length; y_idx++){
            year = years[y_idx];
            val_list = MAP_APP.set_singleYear_singleFeat_valList(featdata[year]);
            val_dict[year] = val_list;
        }
        return val_dict;
    },
    set_multiYear_multiFeat_valDict: function(featsdata){
         /*
        Sets the value dict for multiple years and multiple feature
        and computes area averaged summaries if area_ave=true
        featdata is the feature data for a multiple years
        Return list of val_dicts of each feature
        */
        var f_idx, featdata = {}, y_idx, val_dict_list = [],
            years = $('#years').val(), yr = years[0], year;

        for (f_idx = 0; f_idx < featsdata[yr]['features'].length; f_idx++) {
            featdata = {}
            for (y_idx = 0; y_idx < years.length; y_idx++) {
                year = years[y_idx];
                featdata[year] = featsdata[year]['features'][f_idx];
            }
            val_dict_list.push(MAP_APP.set_multiYear_singleFeat_valDict(featdata));
        }
        return val_dict_list;
    },
    set_multiYear_areaAveraged_valList: function(featsdata){
        /*
        Sets the area averaged val_dict for each year and all feats in featdata
        Summarizes over years if year_statistic is defined and displayed in form
        */
        var years = $('#years').val(), y_idx, val_dict = {}, val_list = null, year;

        if ($('#form-years-statistic').css('display') != 'none') {
            if ($('#years_statistic').val() != 'none') {
                // Summarize over the years
                val_list = []
                for (year in val_dict) {
                    val_list.concat(val_dict[year]);
                }
                val_list = compute_stat(val_list, $('#years_statistic').val());
                val_dict[$('#years').val().join(', ')] = val_list
            }
        }else{
            for (y_idx = 0; y_idx < years.length; y_idx++) {
                val_dict[years[y_idx]] = MAP_APP.set_singleYear_areaAveraged_valList(featsdata[years[y_idx]]);
            }
        }
        return val_dict;
    },
    set_dataModalVals: function(featsdata, area_ave=false) {
        //Sets the values for the dataModal over muliple years
        var val_dict = {}, val_dict_list = [], val_lists = [], y_idx, year,
            years = $('#years').val();
        if (area_ave) {
           val_dict =  MAP_APP.set_multiYear_areaAveraged_valList(featsdata);
           val_dict_list = [val_dict];
        } else {
            // Each feature has a list of values
            val_dict_list = MAP_APP.set_multiYear_multiFeat_valDict(featsdata);

        }
        return val_dict_list;
    },
    set_dataModalRowNames: function(v, t_res, time_period, period_stat) {
        var row_names = [], periods = [], p,
            var_name = statics.all_variable[v], month_name, row_names = [];
        // Annual data
        if (t_res == 'annual'){
            row_names = [var_name + ' Annual'];
        }else {
            // Sub-Annual, pick the right time periods
            if (period_stat == 'none'){
                    for (var t_idx = 0; t_idx < time_period.length; t_idx++) {
                        month_name = statics.time_period_by_res[t_res][time_period[t_idx]];
                        row_names.push(var_name + ' ' + month_name);
                    }

            }else{
                row_names = [var_name];
            }
        }
        return row_names;
    },
    write_data_table: function(row_names, val_dict){
        /*
        val_dict may have values for multiple years
        multi-year sumnmaries
        */
        var html = '<table border="1" cellpadding="5">', p_idx, y_idx, val_list = [], year;
        // Table Header
        html+='<tr><th>Variable</th>';
        // Check if we have summaries over years
        for (year in val_dict) {
            html += '<th>' + year + '</th>';
        }
        html += '</tr>';
        for (p_idx=0; p_idx < row_names.length; p_idx++) {
            html += '<tr><td>' + row_names[p_idx] + '</td>';
            for (year in val_dict) {
                val_list = val_dict[year];
                html += '<td>' + val_list[p_idx] + '</td>';
            }
            html += '</tr>'
        }
        html += '</table>';
        return html;
    },
    set_dataModalData: function(vals, row_names){
        var html = '', f_idx, br = '<br>';
        if (Array.isArray(vals)){
            // Multiple features each separate
            for (f_idx = 0; f_idx < vals.length; f_idx ++){
                html += MAP_APP.write_data_table(row_names, vals[f_idx]) + br;
            }
        }else {
            // Single feature or area averaged data
            // Dictionary with yearly values or year_statistic summarized data
            html += MAP_APP.write_data_table(row_names, vals);
        }
        return html;
    },
    set_feature_data: function(years, feats){
        /*
        Given feats from dragbox event, we extract the relevant geomdata and featdata from
        the template variables
        */
        var f_idx, y_idx, year, feat_idx,
            featdata = {}, geomdata = {}, gf_data;
        for (y_idx = 0; y_idx < years.length; y_idx++) {
            year = years[y_idx];
            featdata[year] = {type: 'FeatureCollection', features: []};
            geomdata[year] = {type: 'FeatureCollection', features: []};
            for (f_idx = 0; f_idx < feats.length; f_idx++) {
                feat_idx = feats[f_idx].get('idx');
                featdata[year]['features'].push(window.DATA.etdata[year]['features'][feat_idx]);
                geomdata[year]['features'].push(window.DATA.geomdata[year]['features'][feat_idx]);
            }
        }
        gf_data = {
            'geomdata': geomdata,
            'featdata': featdata
        }
        return gf_data;
    }
}

var OL_MAP_APP = OL_MAP_APP || {};
OL_MAP_APP = {
    styleFunction: function(feature) {
        /*
        Sets the feature styles for Choropleth map
        */
        var year = $('#years').val()[0],
            idx = feature.get('idx'),
            v = $('#variable').val(),
            t_res = $('#t_res').val(),
            et_var = statics.stats_by_var_res[v][t_res][0], color, i;

        var data_val = DATA.etdata[year].features[idx]['properties'][et_var];
        //Find the right bin
        for (i = 0; i < window.bins.length; i++) {
            if (window.bins[i][0] <= data_val && data_val <= window.bins[i][1]) {
                color = window.feat_colors[i];
                break;
            }
        }
        var
    style = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'black',
                width: 2
            }),
            fill: new ol.style.Fill({
                color: color
            })
        });
        return style;
    },
    defaultStyleFunction: function(feature){
        /*
        Sets the default feature styles for non-choropleth map layers
        e.g., mutliple years
        */
        var style = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'black',
                // lineDash: [4],
                width: 2
            }),
            fill: new ol.style.Fill({
                color: 'rgba(0, 0, 255, 0.1)'
            })
        });
        return style;
    },
    delay : function( timeout, id, callback ){
        /*
        Delay needed for zooming to work properly
        */
        this.delays = this.delays || [];
        var delay = this.delays[ id ];
        if ( delay )
        {
                clearTimeout ( delay );
        }
        delay = setTimeout ( callback, timeout );
        this.delays[ id ] = delay;
    },
    on_zoom_change_region: function(evt){
        /*
        Change the region at different zoom levels
        when user zooms on map (auto_set_region = true)
        */
        var zoom = window.map.getView().getZoom();
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
            try {
                window.map.un('moveend', OL_MAP_APP.on_zoom_change_region);
            }catch(e){}
        }else{
            // Show different regions at different zoom levels
            window.map.on('moveend', OL_MAP_APP.on_zoom_change_region);
            /*
            window.map.on('moveend', function onMoveEnd(evt) {
                OL_MAP_APP.on_zoom_change_region(evt);
            });
            */
        }
    },
    zoom_to_layer_extent: function(vectorSource){
        /*
        Zoom to the extent of the current map layer
        */
        if (vectorSource.getState() === 'ready') {
            OL_MAP_APP.delay(500, "uniqueId", function() {
                window.map.getView().fit(vectorSource.getExtent(), window.map.getSize());
            });
        }
    },
    set_vector_source: function(year){
        /*
        Set global variable vectorSource
        from geojson
        */
        var vectorSource = new ol.source.Vector({
            features: (new ol.format.GeoJSON()).readFeatures(DATA.geomdata[year],
                {featureProjection: window.map.getView().getProjection()})
        });
        window.vectorSource = vectorSource;
    },
    set_ol_raster: function(){
        /*
        Sets default openlayer basemap raster
        FIX ME: there might be a better looking obne, e.g. satellite base
        */
        var raster = new ol.layer.Tile({
            source: new ol.source.OSM()
        });
        return raster;
    },
    get_choropleth_layer: function(){
        /*
        Sets the Choropleth map layer from the vectorSource
        */
        OL_MAP_APP.set_vector_source($('#years').val()[0]);
        var geojsonLayer = new ol.layer.Vector({
            source: window.vectorSource,
            style: OL_MAP_APP.styleFunction,
        });
        return geojsonLayer;
    },
    get_default_map_layer: function(){
        /*
        Gets the dafault map layer (not choropleth) for multiple years
        */
        OL_MAP_APP.set_vector_source($('#years').val()[0]);
        var geojsonLayer = new ol.layer.Vector({
            source: window.vectorSource,
            style: OL_MAP_APP.defaultStyleFunction,
        });
        return geojsonLayer;
    },
    set_map_layer: function(layer){
        /*
        Set the map Layer on the map
        */
        window.map.addLayer(layer);
    },
    delete_map_layer: function(layer){
        /*
        Delete the map layer from the map
        */
        window.map.removeLayer(layer)
    },
    initialize_popup_window: function(container, closer) {
        var overlay = new ol.Overlay({
            element: container,
            autoPan: true,
            autoPanAnimation: {
                duration: 250
            }
        });
        closer.onclick = function() {
            overlay.setPosition(undefined);
            closer.blur();
            return false;
        };
        return overlay;
    },
    set_popup_header: function(geomdata){
        //var geom_meta_cols = statics.geo_meta_cols[$('#region').val()],
        var i, j, key, br = '<br>', html = '<b>Regions</b>: ' + br,
            year = $('#years').val()[0], years_str;
        if ($('#region').val() == 'Mason' ){
            geom_meta_cols = ['OBJECTID'];
        }else{
            geom_meta_cols = ['NAME'];
        }
        for (j = 0; j < geomdata[year]['features'].length; j++) {
            //html += 'Feature ' + String(j + 1) + ':' + br;
            for (i = 0; i < geom_meta_cols.length; i++) {
                key = geom_meta_cols[i];
                try {
                    if (key != 'NAME' && key != 'OBJECTID') {
                        html += key + ': ' + geomdata[year]['features'][j]['properties'][key] + ',';
                    }else {
                        html += geomdata[year]['features'][j]['properties'][key] + ',';
                    }
                } catch (e) {}
            }
        }
        html += br;
        if (geomdata[year]['features'].length != 1) {
            // Multiple features
            html +=  '<b>Area weighted means over regions</b>' + br;
        }
        if ($('#years').val().length != 1){
            // Multiple Years
            years_str = $('#years').val().join(', ');
            if ($('#form-years-statistic').css('display') != 'none'){
                html += '<b>Annual Statistic</b>: ' + br;
                html += $('#years_statistic  option:selected').html() + ' over ' + years_str + br;
            }
        }
        if ($('#form-timeperiod-statistic').css('display') != 'none' && $('#time_period_statistic').val() != 'none'){
            var time_period = $('#time_period').val(), t_idx, periods = [];
            for (t_idx = 0; t_idx < time_period.length; t_idx++) {
                periods.push(statics.time_period_by_res[$('#t_res').val()][time_period[t_idx]]);
            }
            html += '<b>Time Period Statistic</b>: ' + br;
            html +=  $('#time_period_statistic option:selected').html() + ' over ' + periods.join(', ') + br;
        }
        return html;
    },
    set_popup_data: function(featsdata, area_ave=false){
        var y_idx, year, years,
            html, vals, row_names, val_dict,
            et_var = $('#variable').val(),
            t_res = $('#t_res').val(),
            time_period = $('#time_period').val(),
            stat = $('#time_period_statistic').val(),
            years = $('#years').val();

        if ($.type(time_period) == 'string') {
            time_period = [time_period];
        }
        //Populate the data modal
        vals = MAP_APP.set_dataModalVals(featsdata, area_ave=area_ave);
        row_names = MAP_APP.set_dataModalRowNames(et_var, t_res, time_period, stat);
        html = MAP_APP.set_dataModalData(vals, row_names);
        return html;
    },
    set_popup_window_single_feat: function(evt) {
        /*
        Sets the popup window when user clicks on a layer
        */
        var popup_content = document.getElementById('popup-content'),
            feats = [], feat_idx, feat_indices = [], html = '', featdata = {},
            i, years = $('#years').val(), year, coordinate, geomdata;

        //get the features that where clicked on
        window.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
            feats.push(feature);
            feat_indices.push(feature.get('idx'));
        });

        if (feats.length == 0) {
            $('#feat_indices').val('');
            return;
        }

        $('#feat_indices').val(feat_indices.join(','));
        if (years.length != 1) {
            //Multiple years, we need to query the database to get data for each year
            ajax_set_featdata_on_feature_click(evt);
        }else{
            var gf_data = MAP_APP.set_feature_data(years, feats);
            html += OL_MAP_APP.set_popup_header(gf_data['geomdata']);
            // Only show data if single year
            // Else only show header on click
            if ($('#years').val().length == 1) {
                html += OL_MAP_APP.set_popup_data(gf_data['featdata']);
            }
            coordinate = evt.coordinate;
            popup_content.innerHTML = html;
            window.popup_layer.setPosition(coordinate);
        }
    },
    update_map_layer: function(auto_set_region=false){
        /*
        Updates the map and sets up the popup window for click on single feature
        */

        //Set the choropleth or default layer
        if ($('#years').val().length == 1) {
            //Set the colors for Choropleth map
            var year = $('#years').val()[0],
                start_color = MAP_APP.set_start_color(),
                cb = MAP_APP.set_feat_colors(start_color, 'darken', year),
                geojsonLayer;
            window.feat_colors = cb['colors'];
            window.bins = cb['bins'];
            //Add the geojson layer
            window.main_map_layer = OL_MAP_APP.get_choropleth_layer();
            OL_MAP_APP.set_map_layer(window.main_map_layer);
            MAP_APP.drawMapColorbar(cb['colors'], cb['bins'], start_color);
        }else{
            window.main_map_layer = OL_MAP_APP.get_default_map_layer();
            OL_MAP_APP.set_map_layer(window.main_map_layer);
        }
        //Only zoom if auto_set_region is turned off
        if (!auto_set_region) {
            OL_MAP_APP.zoom_to_layer_extent(window.vectorSource);
        }
        //Add the click event to the map
        window.map.on('click', function(evt) {
            OL_MAP_APP.set_popup_window_single_feat(evt);
        });
    },
    set_dragbox: function(){
        /*
        Allows selection of mutliple features via dragbox
        Use Ctrl+Drag (Command+Drag on Mac) to draw boxes
        */
        // a normal select interaction to handle click
        var select = new ol.interaction.Select();
        window.map.addInteraction(select);

        window.selectedFeatures = select.getFeatures();

        // a DragBox interaction used to select features by drawing boxes
        var dragBox = new ol.interaction.DragBox({
            condition: ol.events.condition.platformModifierKeyOnly
        });
        window.map.addInteraction(dragBox);

        dragBox.on('boxend', function() {
            // features that intersect the box are added to the collection of
            // selected features
            var extent = dragBox.getGeometry().getExtent(),
                feat_index_list = [];
            window.vectorSource.forEachFeatureIntersectingExtent(extent, function(feature) {
                window.selectedFeatures.push(feature);
                feat_index_list.push(feature.get('idx'));
            });
            //Update feat_indices hidden template variable
            $('#feat_indices').val(feat_index_list.join(','));
            // Update the fetadata and featgeomdata template variables
            // And set the popup box
            ajax_set_featdata_on_dragbox(window.selectedFeatures);
        });

        // clear selection when drawing a new box and when clicking on the map
        dragBox.on('boxstart', function() {
            window.selectedFeatures.clear();
        });

        /*
        selectedFeatures.on(['add', 'remove'], function() {
            var names = window.selectedFeatures.getArray().map(function(feature) {
                return feature.get('name');
            });
        });
        */
    }
}


var initialize_ol_map = function() {
    var region = $('#region').val();
    //Set the map zoom dependent on region
    var mapZoom = js_statics.map_zoom_by_region[region],
        mapCenter = js_statics.map_center_by_region[region];

    //Set the basic map
    var raster = OL_MAP_APP.set_ol_raster();
    window.map = new ol.Map({
        target: 'main-map',
        projection:"EPSG:4326",
        layers: [raster],
        view: new ol.View({
            center: ol.proj.fromLonLat([mapCenter.lng, mapCenter.lat]),
            zoom: mapZoom
        })
    });

    var popup_container = document.getElementById('popup'),
        popup_content = document.getElementById('popup-content'),
        popup_closer = document.getElementById('popup-closer');
    //Initialize popover
    window.popup_layer = OL_MAP_APP.initialize_popup_window(popup_container, popup_closer);
    window.map.addOverlay(window.popup_layer);

    if (region == "ee_map"){
        //ajax_get_ee_map();
    }else {
        //
        OL_MAP_APP.update_map_layer(auto_set_region=true);
        OL_MAP_APP.set_dragbox();
    }
    //Set the map so that it changes region at differnet zoom levels
    OL_MAP_APP.set_map_zoom_pan_listener(auto_set_region=true);
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
                change_inRegion(new_region, auto_set_region=true);
            }
        }
    });
}
