function change_inRegion(region){
	//Delete old layer
	 MAP_APP.delete_layers();
	if (region.is_in(['US_fields', 'Mason'])){
		var field_year, y_idx;
        //Field data
		$('#form-field_years').css('display', 'inline');
		$('#form-field_year').css('display', 'inline')
        $('#form-aggregation_area').css('display', 'inline');
        //Set new layer
        //MAP_APP.set_ft_map_layer(1);
        field_year = $('#field_year').val();
        y_idx = $.inArray(field_year, statics.all_field_years);
        MAP_APP.set_geojson_map_layer(y_idx);
	}
	if (region == 'ee_map'){
		//Maps
		$('#form-field_years').css('display', 'none');
        $('#form-field_year').css('display', 'none');
		$('#form-aggregation_area').css('display', 'none');
		//Get the map from db
	}
}

function change_inYear(field_year){
	// We ned to recompute the template vars
	//geodata, metadata, etdata
	ajax_update_data();
	//Delete old layer
	var year_idx, year,
		year_list = statics.all_field_years;
	for (year_idx = 0; year_idx < year_list.length; year_idx++){
		year = year_list[year_idx];
		if (field_year === year){
			MAP_APP.set_geojson_map_layer(year_idx);
		}
		else{
			MAP_APP.delete_layer(year_idx);
		}
	}
}

function change_inVariable(variable){
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
	var tps = statics.time_period_by_res[resolution], 
		tp, tp_name, option;
	$('#time_period > option').remove();
	for (key in tps){
		tp =  key;
		tp_name = tps[key]
		option = '<option value="' + tp + '">' + tp_name;
        option+='</option>';
        $('#time_period').append(option);
	}
    if ($('#region').val().is_in(['US_fields', 'Mason'])){
    	//Set new dataModals

    }
    if ($('#region').val() == 'ee_map'){
    	//Get the map from db
    }
}

function change_inTimePeriod(time_period){

}
