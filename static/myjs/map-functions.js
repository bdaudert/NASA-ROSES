/* MAP Utils*/

// General map utils (google map api and openlayers)
var MAP_APP = MAP_APP || {};
MAP_APP = {
    determine_map_type: function(){
        /*
        Determines map type (choropleth or default)
        from form inputs
        */
        if ($('#years').val().length != 1) {
            return 'default';
        }


        // Single Year
        if ($('#t_res').val() == 'annual') {
            return 'Choropleth';
        }

        // Sub Annual
        if ($('#time_period').val().length == 1){
            return 'Choropleth';
        }

        // Multiple time periods
        if ($('#time_period_statistic').val() != 'none'){
            return 'Choropleth';
        }
        return 'default';
    },
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
            et_stat, i, idx, featsdata, j, colors = [], val_list, d, mn, mx,
            year = $('#year').val(),
            bins = [], step, amt, num_colors = 10, cb = {'colors': [], 'bins': []}, new_color,
            featsdata = DATA.etdata[year];
        val_list = MAP_APP.set_singleYear_allFeat_valList(featsdata);
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
            new_color = MAP_APP.LightenDarkenColor(start_color, amt);
            colors.push(new_color);
            bins.push([myRound(j,2), myRound(j + step, 2)]);
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
    draw_mapColorbar: function (bins, colors, div_id) {
        $(div_id).css('display', 'block');
        colorScale(bins, colors, div_id);
    },
    hide_mapColorbar: function(div_id){
        $(div_id).css('display', 'none');
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
    set_singleYear_allFeat_valList: function(featsdata){
        /*
        Used to set colorbar
        Sets the value list for a single year and multiple features
        NOTE: stat is computed over each feature
        */
        var val_list = [], d;
        // Return data for each feature separately
        d = $.map(featsdata['features'], function (f_data) {
            return MAP_APP.set_singleYear_singleFeat_valList(f_data);
        });
        val_list = val_list.concat(d);
        return val_list;
    },
    set_singleYear_areaAveraged_valList: function(featsdata){
        /*
        Sets the value list by area averaging over the features in featsdata
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
            val_list.push(myRound(d.sum(), 2));
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
    set_multiYear_multiFeat_valLists: function(featsdata){
         /*
        Sets the value dict for multiple years and multiple feature
        featsdata is the feature data for a multiple years
        Return list of val_dicts of each feature with keys of val_dict the years
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
    set_multiYear_areaAveraged_valDict: function(featsdata){
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
    set_dataModalTable: function(val_dict_list, row_names, col_names){
        /*
        val_dict may have values for multiple years
        multi-year sumnmaries
        */
        var html = '<table border="1" cellpadding="5">',
            f_idx, r_idx, c_idx, key;

        // Table Header
        html+='<tr><th>' + $('#variable option:selected').html() + '</th>', key;

        for (c_idx = 0; c_idx < col_names.length; c_idx++) {
            html += '<th>' + col_names[c_idx] + '</th>';
        }
        // Add average over cols
        html += '<th>Temporal Average</th>';
        html += '</tr>';

        // Table Body
        //Features Loop (rows)
        for (f_idx = 0; f_idx < val_dict_list.length; f_idx++) {
            var ave = 0.0, sm = 0.0, last_key;
            html += '<tr><td>' + row_names[f_idx] + '</td>';
            // Year or Multi-Year summary Loop (cols)
            for (key in val_dict_list[f_idx]) {
                last_key = key;
                if (val_dict_list[f_idx][key].length > 1) {
                    // Monthly Summary
                    for (c_idx = 0; c_idx < val_dict_list[f_idx][key].length; c_idx++) {
                        html += '<td>' + val_dict_list[f_idx][key][c_idx] + '</td>';
                        sm = sm +  parseFloat(val_dict_list[f_idx][key][c_idx]);
                    }
                }else{
                    html += '<td>' + val_dict_list[f_idx][key] + '</td>';
                    sm = sm +  parseFloat(val_dict_list[f_idx][key]);
                }
            }
            // Add average
            var ave = myRound(parseFloat(sm) / parseFloat(Object.keys(val_dict_list[f_idx]).length), 2);
            html += '<td>' + ave + '</td>';
            html += '</tr>';
        }
        return html;
    },
    set_dataModalHeader: function(){
        var br = '<br>',
        html = 'Dataset: ' + $('#dataset option:selected').html() + br;
        html += 'Variable: ' + $('#variable option:selected').html() + br;
        html += 'ET Model: ' + $('#et_model option:selected').html() + br;

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
    set_dataModalRowNames: function(geomdata) {
        /*
        Each feature is a row, summary stats over feats are listed in the bottom row
        */
        var geom_name_prop = statics.geom_name_prop[$('#region').val()],
            j, row_names = ['<b>Area average</b>'];
        for (j = 0; j < geomdata['features'].length; j++) {
            row_names.push(geomdata['features'][j]['properties'][geom_name_prop]);
        }
        return row_names;
    },
    set_dataModalColNames: function(){
        var col_name, col_names, tp_idx, tp, y_idx, years = $('#years').val();
        if ($('#form-years-statistic').css('display') != 'none' && $('#years_statistic').val() != 'none' ){
            // Summary over multiple years
            if ($('#t_res').val() == 'annual'){
                // Summary over multiple years
                col_names = [$('#years_statistic option:selected').html() + ' over years'];
            }else{
                if ($('#form-timeperiod-statistic').css('display') != 'none' && $('#time_period_statistic').val() != 'none' ){
                    col_name = $('#years_statistic option:selected').html() + ' over years, ';
                    col_name += $('#time_period_statistic option:selected').html() + ' over months';
                    col_names = [col_name];
                }else {
                    // Each month is processed separately
                    col_names = [];
                    tp = $('#time_period').val()
                    for (tp_idx = 0; tp_idx < tp.length; tp_idx++) {
                        col_names.push(statics.time_period_by_res[$('#t_res').val()][tp[tp_idx]]);
                    }
                }
            }
        }else {
            // Single years
            if ($('#t_res').val() == 'annual'){
                // Summary over multiple years
                col_names = years;
            }else {
                col_names = [], tp = $('#time_period').val();
                for (y_idx = 0; y_idx < years.length; y_idx++) {
                    if ($('#form-timeperiod-statistic').css('display') != 'none' && $('#time_period_statistic').val() != 'none') {
                        // Summary over multiple months
                        col_names.push(years[y_idx]);
                    } else {
                        for (tp_idx = 0; tp_idx < tp.length; tp_idx++) {
                            col_name = years[y_idx] + ', ' + statics.time_period_by_res[$('#t_res').val()][tp[tp_idx]];
                            col_names.push(col_name);
                        }
                    }
                }
            }
        }
        return col_names;
    },
    set_dataModalVals: function(featsdata) {
        /*
        Sets the values for the dataModal over muliple years
        */
        var val_dict = {}, val_dict_list = [], val_lists = [], key,
            years = $('#years').val();
        // Get the values for each feature
        val_dict_list = MAP_APP.set_multiYear_multiFeat_valLists(featsdata);
        //Get the Summary values
        val_dict =  MAP_APP.set_multiYear_areaAveraged_valDict(featsdata);
        // Append the area averaged Summaries
        val_dict_list = [val_dict].concat(val_dict_list);
        return val_dict_list;
    },
    set_feature_data: function(years, feats){
        /*
        Given feats from dragbox event, we extract the relevant geomdata and featsdata from
        the template variables
        */
        var f_idx, y_idx, year, feat_idx,
            featsdata = {}, featsgeomdata = {}, gf_data;
        for (y_idx = 0; y_idx < years.length; y_idx++) {
            year = years[y_idx];
            featsdata[year] = {type: 'FeatureCollection', features: []};
            featsgeomdata[year] = {type: 'FeatureCollection', features: []};
            for (f_idx = 0; f_idx < feats.length; f_idx++) {
                feat_idx = feats[f_idx].properties['idx'];
                featsdata[year]['features'].push(window.DATA.etdata[year]['features'][feat_idx]);
                featsgeomdata[year]['features'].push(window.DATA.geomdata[year]['features'][feat_idx]);
            }
        }
        gf_data = {
            'featsgeomdata': featsgeomdata,
            'featsdata': featsdata
        }
        return gf_data;
    },
    set_popup_data: function(featsdata, featsgeomdata){
        var y_idx, year, years, html, val_dict_list, row_names, col_names,
            years = $('#years').val();

        //Populate the data modal
        val_dict_list = MAP_APP.set_dataModalVals(featsdata);
        row_names = MAP_APP.set_dataModalRowNames(featsgeomdata[years[0]]);
        col_names = MAP_APP.set_dataModalColNames();
        html = MAP_APP.set_dataModalTable(val_dict_list, row_names, col_names);
        return html;
    },
}

var LF_MAP_APP = LF_MAP_APP || {};
LF_MAP_APP = {
    set_lfRaster: function(){
        /*
        Sets default openlayer basemap raster
        FIX ME: there might be a better looking obne, e.g. satellite base
        */
        var layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });
        return layer;
    },
    choroStyleFunction: function(feature) {
        /*
        Sets the feature styles for Choropleth map
        */
        var year = $('#years').val()[0],
            idx = feature.properties['idx'],
            v = $('#variable').val(),
            t_res = $('#t_res').val(),
            et_var = statics.stats_by_var_res[v][t_res][0], color = null, i;

        var f_data = {'properties': DATA.etdata[year].features[idx]['properties']},
            val_list = MAP_APP.set_singleYear_singleFeat_valList(f_data);
        // Note: for Choro, val_list is always of length 1
        var data_val = val_list[0];
        //Find the right bin
        for (i = 0; i < window.bins.length; i++) {
            if (window.bins[i][0] <= data_val && data_val <= window.bins[i][1]) {
                color = window.feat_colors[i];
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
    defaultStyleFunction: function(feature){
        /*
        Sets the default feature styles for non-choropleth map layers
        e.g., mutliple years
        */
        var style = {
            fillColor: '#ddd1e7',
            weight: 2,
            opacity: 1,
            color: 'black',
            dashArray: '3',
            fillOpacity: 0.7
        };
        return style;
    },
    highlightFeature: function(e) {
        /*highlights feature on mouse over*/
        var layer = e.target;
        layer.setStyle({
            weight: 5,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.7
        });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    },
    resetHighlight: function(e) {
        /*Resets featue on mouseout*/
        window.geojson_map_layer.resetStyle(e.target);
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
    zoom_toFeature: function(e) {
        window.map.fitBounds(e.target.getBounds());
    },
    set_popup_window_single_feat: function(e, feat, layer){
        /*
        Sets popup window when user clicks on a single feature
        e click event
        feat geosjon feature
        layer leaflet layer
         */
        // Close all open popups
        window.map.closePopup();

        var years = $('#years').val(),
            feats = [feat];
        // Get the html content for the popup
        if (years.length != 1) {
            //Multiple years, we need to query the database to get data for each year
            //Sets window.popup_html global var
            $('#feat_indices').val(String(feat.properties['idx']));
            ajax_set_featdata_on_feature_click(feat, layer);
        }else {
            var gf_data = MAP_APP.set_feature_data(years, feats);
            window.popup_html = MAP_APP.set_dataModalHeader();
            // Only show data if single year
            // Else only show header on click
            window.popup_html += MAP_APP.set_popup_data(gf_data['featsdata'], gf_data['featsgeomdata']);
            layer.bindPopup(window.popup_html).openPopup();
        }
    },
    onEachFeature: function(feature, layer) {
        layer.on({
            mouseover: LF_MAP_APP.highlightFeature,
            mouseout: LF_MAP_APP.resetHighlight
        });
        layer.on("click", function (e) {
            // FIX ME: this will cause region change
            //LF_MAP_APP.zoom_toFeature(e);
            LF_MAP_APP.set_popup_window_single_feat(e, feature, layer);
        });
    },
    set_mapLayer: function(geojson, styleFunct) {
        /*
        Set the map layer (geojson object) on the map
        */

        // Add latlng function to polygons
        L.Polygon.addInitHook(function () {
            this._latlng = this._bounds.getCenter();
        });

        L.Polygon.include({
            getLatLng: function () {
                return this._latlng;
            },
            setLatLng: function () {}
        });

        geoJsonStructure = L.geoJson(geojson, {
            style: styleFunct,
            onEachFeature: LF_MAP_APP.onEachFeature
        })

        window.geoJson = geoJsonStructure._layers;

        window.main_map_layer = L.markerClusterGroup({disableClusteringAtZoom: 8}).addTo(window.map);
        window.geojson_map_layer = L.geoJson(
            {
                "type": "FeatureCollection",
                "features": []
            },
            {
            style: styleFunct,
            onEachFeature: LF_MAP_APP.onEachFeature
        });
        LF_MAP_APP.filter_mapLayer();

        window.main_map_layer.addLayer(window.geojson_map_layer);
        window.map.fitBounds(window.geojson_map_layer.getBounds());

        LF_MAP_APP.set_map_zoom_pan_listener(auto_set_region=false);
    },
    filter_mapLayer: function() {
        var bounds = window.map.getBounds();
        for (polygon in window.geoJson) {
            if (bounds.contains(window.geoJson[polygon]._bounds.getNorthEast()) || bounds.contains(window.geoJson[polygon]._bounds.getNorthWest()) || bounds.contains(window.geoJson[polygon]._bounds.getSouthEast()) || bounds.contains(window.geoJson[polygon]._bounds.getSouthWest())) {
                window.geojson_map_layer.addLayer(window.geoJson[polygon]);
            }
        }
    },
    delete_mapLayer: function(geojsonLayer){
        /*
        Delete the map layer (geojson layer) from the map
        */
        window.map.removeLayer(geojsonLayer);
        window.map.main_map_layer = null;
        MAP_APP.hide_mapColorbar('#colorbar');
    },
    update_mapLayer: function(auto_set_region=false){
        /*
        Updates the map and sets up the popup window for click on single feature
        */
        // Delete old layer
        if (window.main_map_layer) {
            LF_MAP_APP.delete_mapLayer(window.main_map_layer);
        }
        // Find the new map type and set the map layer
        var map_type = MAP_APP.determine_map_type(),
            styleFunct = LF_MAP_APP.defaultStyleFunction;
        //Set the choropleth or default layer
        var geojson = DATA.geomdata[$('#years').val()[0]];
        if (map_type == 'Choropleth') {
            styleFunct = LF_MAP_APP.choroStyleFunction;
            //Set the colors for Choropleth map, draw colorbar
            var year = $('#years').val()[0],
                start_color = MAP_APP.set_start_color(),
                cb = MAP_APP.set_feat_colors(start_color, 'darken', year);
            window.feat_colors = cb['colors'];
            window.bins = cb['bins'];
            MAP_APP.draw_mapColorbar(cb['bins'], cb['colors'], '#colorbar');
        }
        LF_MAP_APP.set_mapLayer(geojson, styleFunct);
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
    on_zoom_filter_data: function(){
        window.main_map_layer.clearLayers();
        window.geojson_map_layer._layers = {};
        LF_MAP_APP.filter_mapLayer();
        window.main_map_layer.addLayer(window.geojson_map_layer);
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
            window.map.on('moveend', LF_MAP_APP.on_zoom_filter_data);
        }else{
            // Show different regions at different zoom levels
            window.map.on('moveend', LF_MAP_APP.on_zoom_change_region);
        }
    }
}


var initialize_lf_map = function() {
    var region = $('#region').val();
    //Set the map zoom dependent on region
    var mapZoom = js_statics.map_zoom_by_region[region],
        mapCenter = js_statics.map_center_by_region[region];

    //Set the basic map
    window.map = L.map('main-map', {
        center: [mapCenter.lat, mapCenter.lng],
        zoom: mapZoom
    });
    LF_MAP_APP.set_lfRaster().addTo(window.map);

    if (region == "ee_map"){
        //API call to CE
    }else {
        LF_MAP_APP.update_mapLayer(auto_set_region = true);
    }
    window.map.on("boxzoomend", function(e) {
        var bounds, feat_indices = [], layers = [], feat_idx;
        window.map.eachLayer(function(layer) {
            try {
                bounds = layer.getBounds();
            }catch(e){
                return;
            }
            if (e.boxZoomBounds.intersects(bounds)) {
                try {
                   feat_idx =  layer.feature.properties['idx'];
                }catch(e){
                    return;
                }
                feat_indices.push(feat_idx);
                layers.push(layer);
            }
        });
        $('#feat_indices').val(feat_indices.join(','));
        if (feat_indices.length > 0){
            ajax_set_featdata_on_dragbox(layers);
        }
    });
    //Set the map so that it changes region at different zoom levels
    //LF_MAP_APP.set_map_zoom_pan_listener(auto_set_region=true);
}

