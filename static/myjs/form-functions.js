function change_inRegion(region, auto_set_region=false){
	/*
	auto_set_region = true: we change the region according to zoom level
	aut_region = false: region is only determiined by region value, not by zoom level
	*/
	// Clear the feature indices
	$('#feature_indices').val('');
	// Hide the popup window
	// Hide the popup window
	window.map.closePopup();

	if (region != $('#region').val()){
		// Zoom level was changed
		// We need to change the region value
		$('#region').val(region);
	}
    // Delete old layer
	LF_MAP_APP.delete_mapLayer(window.main_map_layer);
	//Set the new map_layer
	if (region == "ee_map"){
		// Generate a dynamic map with EE
		// API call to CE
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
		//Not clear if/when this will be used
		//$('#form-aggregation_area').css('display', 'none');
	}else{
		//Predefined aggregation areas
		$('#form-years').css('display', 'inline');
		$('#form-year').css('display', 'none');
	}
}

function change_inYear(year){
	//couple years field
    $('#years').val([year]);
	//Clear the feature indices
	$('#feature_indices').val('');
	// Hide the popup window
	window.map.closePopup();
	//Delete old layer
	LF_MAP_APP.delete_mapLayer(window.main_map_layer);
	// We ned to recompute the template vars
	//geodata, etdata for choropleth map
	ajax_update_etdata_and_map(auto_set_region=false);
	var geojsonLayer = DATA.geomdata[$('#years').val()[0]],
		styleFunct = LF_MAP_APP.chorostyleFunction;
	LF_MAP_APP.set_mapLayer(geojsonLayer, styleFunct);
}

function change_inYears(years){
    // Clear the featuer indices
	$('#feature_indices').val('');// Hide the popup window
	// Hide the popup window
	window.map.closePopup();
	// Delete old layer
	LF_MAP_APP.delete_mapLayer(window.main_map_layer);
	var geojsonLayer = DATA.geomdata[$('#years').val()[0]];
	// Delete old data
	if (window.DATA['etdata'] ) {
        window.DATA['etdata'] = {}
        window.DATA['geomdata'] = {}
    }
	if (years.length != 1){
		//$('#form-timeperiod-statistic').css('display', 'block')
		var styleFunct = LF_MAP_APP.defaultStyleFunction;
	} else{
		//New map layer is set inside ajax call (async issue)
		ajax_update_etdata_and_map(auto_set_region=false);
		//$('#form-timeperiod-statistic').css('display', 'none');
		var styleFunct = LF_MAP_APP.chorostyleFunction;
	}
	LF_MAP_APP.set_mapLayer(geojsonLayer, styleFunct);
	//Couple year field to be first year of selection
    $('#year').val($('#years').val()[0])
}


function change_inVariable(variable){
	//Clear the featuer indices
	$('#feature_indices').val('');
	// Hide the popup window
	window.map.closePopup();

	if ($('#region').val().is_in(['US_fields', 'Mason'])){
    	//Set new dataModal

    }
    if ($('#region').val() == 'ee_map'){
    	//Get the map from climate engine (API call)
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
    var tps, tp, tp_name, option, key, key_list = [];

    //Clear the feature indices
	$('#feature_indices').val('');
	// Hide the popup window
	window.map.closePopup();

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
        }
    }
    else{
        $('#form-timeperiod').css('display','block');
        $('#form-timeperiod-statistic').css('display','block');
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
	$('#time_period').val(key_list);
    if ($('#region').val() == 'ee_map'){
    	//Get the map from db
    }


    if ($('#years').val().length == 1) {
        ajax_update_etdata_and_map(auto_set_region = false);
    }
    // Update the map layer
	LF_MAP_APP.update_mapLayer();
}

function change_inTimePeriod(time_period){
    // Hide the popup window
	window.map.closePopup();
	if (time_period.length == 1) {
        // Set monthly summary to none
        $('#time_period_statistic').val('none');
    	$('#form-timeperiod-statistic').css('display', 'none');
	}else{
		$('#form-timeperiod-statistic').css('display', 'block');
	}

    // Update the map layer
    LF_MAP_APP.update_mapLayer();
}

function change_inTimePeriodStat(time_period_stat){
    // Hide the popup window
	window.map.closePopup();
	// Update the map layer
    LF_MAP_APP.update_mapLayer();
}

function get_feat_index_from_featdata(year) {
    var f_idx_list = $('#feature_indices').val().replace(', ', ',').split(','),
        indices = [];
    $.each(window.DATA.featsgeomdata[year]['features'], function(idx, feat_data){
        if (f_idx_list.includes(String(feat_data['properties']['feature_index']))) {
            indices.push(String(idx));
        }
    });
    return indices;
}