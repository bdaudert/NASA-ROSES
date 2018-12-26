/* MAP Utils*/

// General map utils (google map api and openlayers)
var MAP_APP = MAP_APP || {};
MAP_APP = {
    determine_map_type: function(){
        /*
        Determines map type (choropleth or landing_page)
        from form inputs
        */
        if (window.region == "landing_page") {
            return 'landing_page';
        } else {
            return 'choropleth';
        }
    },
    set_geojson: function(region) {
        var geojson = null;

        try{
           geojson = window.map_geojson;
        }catch(e){}
        return geojson;
    },
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
            temporal_resolution = $('#temporal_resolution').val(),
            time_period = $('#time_period').val(),
            prop_names = statics.stats_by_var_res[$('#variable').val()][temporal_resolution];
        for (p_idx = 0; p_idx < prop_names.length; p_idx++) {
            prop_name = prop_names[p_idx];
            if (temporal_resolution != 'monthly'){
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
    set_singleYear_areaAveraged_valList: function(featsdata){
        /*
        Sets the value list by area averaging over the features in featsdata
        */
        var val_lists = [], d, total_area = 0, f_area, feat_areas = [], feat_vals = [],
            v_idx, val_list = [],d;

        // Return data for each feature separately
        $.map(featsdata['features'], function (f_data) {
            val_lists.push(MAP_APP.set_singleYear_singleFeat_valList(f_data));
            f_area = f_data['properties']['geom_area']
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
            featdata = {};
            for (y_idx = 0; y_idx < years.length; y_idx++) {
                year = String(years[y_idx]);
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
                periods.push(statics.time_period_by_res[$('#temporal_resolution').val()][time_period[t_idx]]);
            }
            html += '<b>Time Period Statistic</b>: ' + br;
            html +=  $('#time_period_statistic option:selected').html() + ' over ' + periods.join(', ') + br;
        }
        return html;
    },
    set_dataModalRowNames: function(featsdata) {
        /*
        Each feature is a row, summary stats over feats are listed in the bottom row
        */
        var j, row_names = ['<b>Area average</b>'], name, id;
        for (j = 0; j < featsdata['features'].length; j++) {
            name = featsdata['features'][j]['properties']['geom_name'];
            id = featsdata['features'][j]['properties']['geom_id'];
            row_names.push(name  + ', ID: ' + String(id));
        }
        return row_names;
    },
    set_dataModalColNames: function(){
        var col_name, col_names, tp_idx, tp, y_idx, years = $('#years').val();
        if ($('#form-years-statistic').css('display') != 'none' && $('#years_statistic').val() != 'none' ){
            // Summary over multiple years
            if ($('#temporal_resolution').val() == 'annual'){
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
                        col_names.push(statics.time_period_by_res[$('#temporal_resolution').val()][tp[tp_idx]]);
                    }
                }
            }
        }else {
            // Single years
            if ($('#temporal_resolution').val() == 'annual'){
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
                            col_name = years[y_idx] + ', ' + statics.time_period_by_res[$('#temporal_resolution').val()][tp[tp_idx]];
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
    set_popup_data: function(featsdata){
        var y_idx, year, years, html, val_dict_list, row_names, col_names,
            years = $('#years').val();
        //Populate the data modal
        if (typeof featsdata === 'string' || featsdata instanceof String){
            featsdata = JSON.parse(featsdata);
        }
        val_dict_list = MAP_APP.set_dataModalVals(featsdata);
        row_names = MAP_APP.set_dataModalRowNames(featsdata[String(years[0])]);
        col_names = MAP_APP.set_dataModalColNames();
        html = MAP_APP.set_dataModalTable(val_dict_list, row_names, col_names);
        return html;
    },
    set_feature_data: function(feat_indices){
        /*
        Sets global vars featsdata and featsgeomdata for each year and feature index
        Results are json objects
        */
        // Sanity check
        if (Object.keys(window.DATA.geomdata).length === 0 || Object.keys(window.DATA.etdata).length === 0 ){
            return {};
        }

        // FIXME: Would like to remove this
        // Check if feature data already exists
        /*if (window.DATA.hasOwnProperty('featsgeomdata') && window.DATA.hasOwnProperty('featsdata')) {
            if (Object.keys(window.DATA.featsgeomdata).length != 0 && Object.keys(window.DATA.featsdata).length != 0) {
                return {
                    'featsdata': window.DATA.featsdata,
                    'featsgeomdata': window.DATA.featsgeomdata
                };
            }
        }*/


        var featsdata = {}, featsgeomdata = {},
            i, year, geom_year = '9999',
            featsdata = {}, featsgeomdata = {},
            data_indices = [], i, j, d;

        if ($('#region').val().is_in(statics.regions_changing_by_year)){
            geom_year = $('#years').val()[0];
        }
        featsgeomdata[geom_year] = {
            'type': 'FeatureCollection',
            'features': []
        }
        // Find the indices in the features
        $(window.DATA.geomdata[geom_year]['features']).each(function(data_index, feat){
            feat_indices.forEach(function(idx){
                if ( parseInt(feat['properties']['feature_index']) == idx ) {
                    var feature = {};
                    feature['type'] = "Feature";
                    feature['properties'] = feat['properties'];
                    featsgeomdata[geom_year]['features'].push(feature);
                    data_indices.push(data_index);
                }
            });
        });

        for (i = 0; i < $('#years').val().length; i++) {
            year = $('#years').val()[i];
            if (geom_year != '9999' && i >0){
                featsgeomdata[year] = {
                    'type': 'FeatureCollection',
                    'features': []
                }
            }
            featsdata[year] = {
                'type': 'FeatureCollection',
                'features': []
            }
            for (j = 0; j < data_indices.length; j++){
                if (geom_year != '9999' && i >0) {
                    d = window.DATA.geomdata['features'][data_indices[j]];
                    featsgeomdata[year]['features'].push(d);
                }
                d = window.DATA.etdata[year]['features'][data_indices[j]];
                featsdata[year]['features'].push(d);
            }

        }
        return {
            'featsdata': featsdata,
            'featsgeomdata': featsgeomdata
        };
    }
}

var LF_MAP_APP = LF_MAP_APP || {};
LF_MAP_APP = {
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
            fillColor: e.layer.options.fillColor,
            fillOpacity: 0.7,
            fill: true,
            stroke: true,
            weight: 3,
            color: '#666',
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
    zoom_toFeature: function(e) {
        window.map.fitBounds(e.target.getBounds());
    },
    set_popup_window_single_feat: function(e){
        /*
        Sets popup window when user clicks on a single feature
        e click event
        */
        var text = "ET DATA:" +  e.layer.properties.et_2017;
        $('.popup').empty();
        $('.popup').css("display", "block");
        $('.popup').append("<p>"+ text + "</p>");

    },
    get_color: function(id = null, map_type) {
        return map_type == "choropleth" ? LF_MAP_APP.choroStyleFunction(id) : '#98bd28';
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
                window.map.flyTo(js_statics.map_center_by_region[e.layer.properties.region], js_statics.map_zoom_by_region[e.layer.properties.region]);
               LF_MAP_APP.update_mapLayer(null, 'choropleth', e.layer.properties.region);
        })
    },
    set_mapVectorTiles: function(map_type, region) {
        /*
        Set the map layer (vector tiles protobuf) on the map
        */
        window.main_map_layer = L.vectorGrid.protobuf('http://roses.dri.edu:8080/data/vector/{z}/{x}/{y}.pbf?debug=true', {
            rendererFactory: L.canvas.tile,
            vectorTileLayerStyles: {
                cv_data_all: function(properties, zoom) {
                var et = properties.et_2017;
                return {
                    fillColor: LF_MAP_APP.get_color(et, map_type),
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
              return feature.properties.SimsID;
          }
        })
        .on ({
            mouseover: LF_MAP_APP.highlight_feature,
            mouseout: LF_MAP_APP.reset_highlight
        })
        .addTo(window.map);

        window.main_map_layer
        .on('click', function(e) {
            LF_MAP_APP.set_popup_window_single_feat(e);
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
        MAP_APP.hide_mapColorbar('.colorbar-container');
    },
    update_mapLayer: function(geojson=null, map_type, auto_set_region=false){
        /*
        Updates the map and sets up the popup window for click on single feature
        */
        // Delete old layer
        if (window.main_map_layer) {
            LF_MAP_APP.delete_mapLayer();
            MAP_APP.hide_mapColorbar('.colorbar-container');
        }

        if (map_type == 'landing_page') {
            LF_MAP_APP.set_mapGeoJson(geojson, map_type);
        }

        if (map_type == 'choropleth') {
            //Set the colors for Choropleth map, draw colorbar
            // FIXME: replace hard-coded values with ajax call to database?
            window.DATA.maxET = 2510;
            window.DATA.minET = 0;
            $('.colorbar-container').css('display', 'block');
            var cb = MAP_APP.set_feat_colors();
            window.feat_colors = cb['colors'];
            window.bins = cb['bins'];
            MAP_APP.draw_mapColorbar(cb['bins'], cb['colors'], '#colorbar');
            LF_MAP_APP.set_mapVectorTiles(map_type);
        }
    },
    set_landing_page_mapLayer: function(){
        var region = 'landing_page';
        var geojson = MAP_APP.set_geojson(region);
        console.log(geojson);
        LF_MAP_APP.delete_mapLayer();
        window.map.flyTo(js_statics.map_center_by_region[region], js_statics.map_zoom_by_region[region]);
        LF_MAP_APP.set_mapGeoJson(geojson, region);
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


var initialize_lf_map = function() {
    window.region = 'landing_page';
    //Set the map zoom dependent on region
    var mapZoom = js_statics.map_zoom_by_region[window.region],
        mapCenter = js_statics.map_center_by_region[window.region];

    //Set the basic map
    window.map = L.map('main-map', {
        center: [mapCenter.lat, mapCenter.lng],
        zoom: mapZoom,
        zoomControl: false
    });
    LF_MAP_APP.set_lfRaster().addTo(window.map);

    L.control.zoom({
       position:'topright'
    }).addTo(window.map);
            
    MAP_APP.hide_mapColorbar('.colorbar-container');

    if (region == "ee_map"){
        //API call to CE
    }else {
        var map_type = MAP_APP.determine_map_type();
        var geojson = MAP_APP.set_geojson(map_type);
        LF_MAP_APP.update_mapLayer(geojson, map_type,  auto_set_region = true);
    }
}

