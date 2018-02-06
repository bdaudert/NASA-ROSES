function change_inRegion(region){
	//Delete old layer
	 MAP_APP.delete_layers();
	if (region == 'fields'){
		//Field data
		$('#form-field_years').css('display', 'inline');
		$('#form-aggregation_area').css('display', 'inline');
        //Set new layer
        //MAP_APP.set_ft_map_layer(1);
        MAP_APP.set_geojson_map_layers();
	}
	if (region == 'ee_map'){
		//Maps
		$('#form-field_years').css('display', 'none');
		$('#form-aggregation_area').css('display', 'none');
		//Get the map from db
	}
}

function change_inVariable(variable){
    if ($('#region').val() == 'fields'){
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

function change_inResolution(resolution){
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
    if ($('#region').val() == 'fields'){
    	//Set new dataModals

    }
    if ($('#region').val() == 'ee_map'){
    	//Get the map from db
    }
}
