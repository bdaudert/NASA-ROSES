<<<<<<< HEAD
function change_inRegion(region){
	// We ned to recompute the template vars
	//geodata, etdata
	ajax_update_data();
    //Delete old layer
    MAP_APP.delete_map_layers();
	if (region.is_in(['US_fields', 'Mason'])){
        //Field data
		$('#form-field_year').css('display', 'inline');
		$('#form-field_years').css('display', 'none');
        //Not clear if/when this will be used
		//$('#form-aggregation_area').css('display', 'inline');
        //Set new map layer
        MAP_APP.set_map_layer();
	}else if (region == 'ee_map'){
		//Maps
		$('#form-field_years').css('display', 'none');
		$('#form-field_year').css('display', 'none');
=======
function change_inRegion(region, auto_set_region=false){
	/*
	auto_set_region = true: we change the region according to zoom level
	aut_region = false: region is only determiined by region value, not by zoom level
	*/
	// Clear the feature indices
	$('#feat_indices').val('');
	// Hide the popup window
	if (window.popup_layer) {
        window.popup_layer.setPosition(undefined);
    }
    if (window.selectedFeatures){
		 window.selectedFeatures.clear();
	}

	if (region != $('#region').val()){
		// Zoom level was changed
		// We need to change the region value
		$('#region').val(region);
	}
    // Delete old layer
    // MAP_APP.delete_map_layers();
	OL_MAP_APP.delete_map_layer(window.main_map_layer);
	//Set the new map_layer
	if (region == "ee_map"){
		// Generate a dynamic map with EE
		// ajax_get_ee_map();
	}else{
		// We ned to recompute the template vars
		// geodata, etdata and set the new map layer
		ajax_update_etdata_and_map(auto_set_region=auto_set_region);
	}

	if (region.is_in(['US_fields', 'Mason'])){
		// If mutiple years are displayed, switch to single year
		if ($('#years').val().length != 1){
			$('#year').val($('#years').val()[0]);
			$('#years').val([$('#year').val()]);
		}
        // Field data
		$('#form-year').css('display', 'inline');
		$('#form-years').css('display', 'none');
        //Not clear if/when this will be used
		//$('#form-aggregation_area').css('display', 'inline')
	}else if (region == 'ee_map'){
		//Maps
		$('#form-years').css('display', 'none');
		$('#form-year').css('display', 'none');
>>>>>>> central
		//Not clear if/when this will be used
		//$('#form-aggregation_area').css('display', 'none');
	}else{
		//Predefined aggregation areas
<<<<<<< HEAD
		$('#form-field_years').css('display', 'inline');
		$('#form-field_year').css('display', 'none');
		//MAP_APP.set_map_layer();
	}
}

function change_inYear(field_year){
	//Delete old layer
	MAP_APP.delete_map_layers();
	// We ned to recompute the template vars
	//geodata, etdata
	ajax_update_data();
	MAP_APP.set_map_layer();
=======
		$('#form-years').css('display', 'inline');
		$('#form-year').css('display', 'none');
	}
}

function change_inYear(year){
	//couple years field
    $('#years').val([year]);
	//Clear the feature indices
	$('#feat_indices').val('');
	// Hide the popup window
	if (window.popup_layer) {
        window.popup_layer.setPosition(undefined);
    }
    if (window.selectedFeatures){
		 window.selectedFeatures.clear();
	}
	//Delete old layer
	OL_MAP_APP.delete_map_layer(window.main_map_layer);
	// We ned to recompute the template vars
	//geodata, etdata
	ajax_update_etdata_and_map(auto_set_region=false);
	window.main_map_layer = OL_MAP_APP.get_choropleth_layer();
	OL_MAP_APP.set_map_layer(window.main_map_layer);
}

function change_inYears(years){
    //Clear the featuer indices
	$('#feat_indices').val('');// Hide the popup window
	if (window.popup_layer) {
        window.popup_layer.setPosition(undefined);
    }
    if (window.selectedFeatures){
		 window.selectedFeatures.clear();
	}
	//Delete old layer
	OL_MAP_APP.delete_map_layer(window.main_map_layer);
	if (years.length != 1){
		//$('#form-timeperiod-statistic').css('display', 'block');
		window.main_map_layer = OL_MAP_APP.get_default_map_layer();
		OL_MAP_APP.set_map_layer(window.main_map_layer);
	} else{
		//New map layer is set inside ajax call (async issue)
		ajax_update_etdata_and_map(auto_set_region=false);
		//$('#form-timeperiod-statistic').css('display', 'none');
	}
	//Couple year field to be first year of selection
    $('#year').val($('#years').val()[0])
>>>>>>> central
}


function change_inVariable(variable){
	//Clear the featuer indices
	$('#feat_indices').val('');
	// Hide the popup window
	if (window.popup_layer) {
        window.popup_layer.setPosition(undefined);
    }
    if (window.selectedFeatures){
		 window.selectedFeatures.clear();
	}

	if ($('#region').val().is_in(['US_fields', 'Mason'])){
    	//Set new dataModal

    }
    if ($('#region').val() == 'ee_map'){
    	//Get the map from db
    }

	//Set dataset
	var datasets = statics.dataset_by_var[variable], 
		ds, option;
	$('#dataset > option').remove();
	if (datasets.length == 0){
		$('#form-dataset').css('display', 'none');
	}
	else{
		$('#form-dataset').css('display', 'inline');
		for (var i = 0; i < datasets.length; i++){
			ds =  datasets[i];
			option = '<option value="' + ds + '">' + statics.all_dataset[ds];
	        option+='</option>';
	        $('#dataset').append(option);
		}
	}
	//Show or hide et-models
    if (variable.not_in(['ET', 'ETRF'])){
        $('#form-model').css('display', 'none');
    }
    else{
        $('#form-model').css('display', 'inline');
    }
}

function change_inTRes(resolution){
<<<<<<< HEAD
    var tps, tp, tp_name, option, key;
    if (resolution.is_in(['annual'])){
        $('#form-timeperiod').css('display','none');
        $('#form-statistic').css('display','none');
        $('#time_period').val($('#field_year').val());
        $('#time_period_statistic').val('none');
        tps = {}
        //Set the time period to the field year for filed region
        if ($('#region').val().is_in(['US_fields', 'Mason'])) {
            key = $('#field_year').val();
            tps[key] = key;
=======
    var tps, tp, tp_name, option, key, key_list = [];

    //Clear the featuere indices
	$('#feat_indices').val('');
    // Hide the popup window
	if (window.popup_layer) {
        window.popup_layer.setPosition(undefined);
    }
    if (window.selectedFeatures){
		 window.selectedFeatures.clear();
	}

    if (resolution.is_in(['annual'])){
        $('#form-timeperiod').css('display','none');
        $('#form-timeperiod-statistic').css('display', 'none');
        if ($('#years').css('display') !=  'none'){
        	//Mutiple years
			var year_list = $('#years').val();
			//Set time_period option to the year list
			tps = {}
			for (var i=0; i< year_list.length; i++ ){
        		tps[year_list[i]] = year_list[i];
			}
		}
		else {
        	//Only one year is displayed
            $('#form-timeperiod-statistic').css('display', 'none');
            $('#time_period').val($('#year').val());
            $('#time_period_statistic').val('none');
            tps = {};
            //Set the time period to the field year for region
            if ($('#region').val() != 'ee_map') {
                key = $('#year').val();
                tps[key] = key;
            }
>>>>>>> central
        }
    }
    else{
        $('#form-timeperiod').css('display','block');
<<<<<<< HEAD
        $('#form-statistic').css('display','block');
=======
        $('#form-timeperiod-statistic').css('display','block');
>>>>>>> central
        tps = statics.time_period_by_res[resolution];
    }

    //Set new timeseries options
	$('#time_period > option').remove();
	for (key in tps){
		key_list.push(key);
		tp =  key;
		tp_name = tps[key]
		option = '<option value="' + tp + '">' + tp_name;
        option+='</option>';
        $('#time_period').append(option);
	}
<<<<<<< HEAD
=======
	$('#time_period').val(key_list);
>>>>>>> central
    if ($('#region').val() == 'ee_map'){
    	//Get the map from db
    }
    // Update the map layer
    OL_MAP_APP.update_map_layer();
}

<<<<<<< HEAD


function set_dataModalHeader(idx){
	var v = $('#variable').val(),
		year = $('#field_year').val(),
		prop_name, html= '', c_idx;
	//Title
	for (c_idx = 0; c_idx < statics.title_cols.length; c_idx++){
		prop_name = statics.title_cols[c_idx];
		html += '<b>' + prop_name + '</b>'+ ': ';
		if (DATA.etdata[idx][prop_name]) {
			html += DATA.etdata[idx][prop_name] + '<br>'
		}
	}
	html += '<b>Variable</b>: ' + v + '<br>';
	html += '<b>Year</b>: ' + year + '<br>';
	return html;
}

function set_dataModalPropertyNames(v, t_res, time_period, stat) {
    var new_prop_names = [], periods = '', p,
		old_prop_names = statics.stats_by_var_res[v][t_res];
    if (t_res == 'annual'){
        new_prop_names.push(time_period[0]);
        return new_prop_names;
    }

    for (var t_idx = 0; t_idx < time_period.length; t_idx++) {
        p = statics.time_period_by_res[t_res][time_period[t_idx]];
        periods += p;
        if (t_idx < time_period.length - 1) {
            periods += ', ';
        }
        if (stat == 'none') {
            new_prop_names.push(p)
        }
    }
    if (stat == 'none') {
        return new_prop_names;
    }
    if (stat == 'sum'){
        new_prop_names.push('Total over ' + periods);
    }
    if (stat == 'mean'){
        new_prop_names.push('Mean over ' + periods);
    }
    return new_prop_names;
}

function set_dataModalValList(v, t_res, time_period, stat, idx){
	var	val_list = [], v_idx, s, tp,
		prop_names = statics.stats_by_var_res[v][t_res];
	for (v_idx = 0; v_idx < prop_names.length; v_idx++) {
		if (t_res == "annual"){
			tp = time_period[0];
		}
		else if (t_res == "monthly") {
			s = prop_names[v_idx].split('_');
			tp = s[s.length -1].slice(-2);
			if (tp.substring(0, 1) == '0') {
				tp = tp.substring(1, 2);
			}
		}
		else{
			//FIX ME NEED STUFF HERE FOR SESONAL DATA
		}
		if (tp.is_in(time_period)) {
			val_list.push(DATA.etdata[idx][prop_names[v_idx]]);
		}
	}
	val_list = compute_time_period_stat(val_list, stat, time_period);
	return val_list
}

function set_dataModalData(val_list, new_prop_names){
	var html, v_idx,
		year = $('#field_year').val(),
        html = 'Year: ' + year + '<br>';
	for (v_idx = 0; v_idx < val_list.length; v_idx++) {
		prop_name = new_prop_names[v_idx];
		html += '<b>' +  prop_name  + '</b>: ' + val_list[v_idx] + '<br>';
	}
	return html;
}
=======
function change_inTimePeriod(time_period){
    // Hide the popup window
	if (window.popup_layer) {
        window.popup_layer.setPosition(undefined);
    }
    if (window.selectedFeatures){
		 window.selectedFeatures.clear();
	}
	if (time_period.length == 1) {
        // Set monthly summary to none
        $('#time_period_statistic').val('none');
    	$('#form-timeperiod-statistic').css('display', 'none');
	}else{
		$('#form-timeperiod-statistic').css('display', 'block');
	}

    // Update the map layer
    OL_MAP_APP.update_map_layer();
}

function change_inTimePeriodStat(time_period_stat){
    // Hide the popup window
	if (window.popup_layer) {
        window.popup_layer.setPosition(undefined);
    }
    if (window.selectedFeatures){
		 window.selectedFeatures.clear();
	}
	// Update the map layer
    OL_MAP_APP.update_map_layer();
}

function get_feat_index_from_featdata(year) {
    var f_idx_list = $('#feat_indices').val().replace(', ', ',').split(','), indices = [];

    $.each(window.DATA.featsgeomdata[year]['features'], function(idx, feat_data){
        if (f_idx_list.includes(String(feat_data['properties']['idx']))) {
            indices.push(String(idx));
        }
    });
    return indices;
}


>>>>>>> central
