function change_inRegion(region, auto_set_region=false){
	/*
	auto_set_region = true: we change the region according to zoom level
	aut_region = false: region is only determiined by region value, not by zoom level
	*/
	ajax_update_region();

	// Clear the feature indices
	$('#feature_indices').val('');

	if (region != $('#region').val()){
		// Zoom level was changed
		// We need to change the region value
		$('#region').val(region);
	}

	clear_mapLayer_and_data();
	set_new_mapLayer();

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

	clear_mapLayer_and_data();
	set_new_mapLayer();
}

function change_inYears(years){
    // Clear the featuer indices
	$('#feature_indices').val('');// Hide the popup window
	//Couple year field to be first year of selection
    $('#year').val($('#years').val()[0]);
    clear_mapLayer_and_data();
	set_new_mapLayer();
}


function change_inVariable(variable){
	//Clear the featuer indices
	$('#feature_indices').val('');
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
    clear_mapLayer_and_data();
	set_new_mapLayer();
}

function change_inTRes(resolution){
    var tps, tp, tp_name, option, key, key_list = [];
    //Clear the feature indices
	$('#feature_indices').val('');

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
	clear_mapLayer_and_data();
	set_new_mapLayer();
}

function change_inTimePeriod(time_period){
	if (time_period.length == 1) {
        // Set monthly summary to none
        $('#time_period_statistic').val('none');
    	$('#form-timeperiod-statistic').css('display', 'none');
	}else{
		$('#form-timeperiod-statistic').css('display', 'block');
	}
	clear_mapLayer_and_data();
	set_new_mapLayer();
}

function change_inTimePeriodStat(time_period_stat){
	/*
	NOTE: statistic change does not affect the map,
	as the statistic is computed on the fly in js
	set_dataModalTable
	*/
	/*
	clear_mapLayer_and_data();
	set_new_mapLayer();
	*/
	window.map.closePopup();
}

function clear_mapLayer_and_data(){
	window.map.closePopup();
	// Delete old layer
	LF_MAP_APP.delete_mapLayer(window.main_map_layer);
	MAP_APP.hide_mapColorbar('#colorbar');
	// Delete old data
	if (window.DATA['etdata'] ) {
        window.DATA['etdata'] = {};
    }
    if (window.DATA['featsdata'] ) {
        window.DATA['featsdata'] = {};
    }
}

function set_new_mapLayer(){
	//Set the new map_layer
	if (region == "ee_map"){
		// Generate a dynamic map with EE
		// API call to CE
	}else{
		var geojson = MAP_APP.set_geojson();
		LF_MAP_APP.set_default_mapLayer(geojson);
	}
}

