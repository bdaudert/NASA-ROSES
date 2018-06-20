function change_inRegion(region, auto_set_region=false){
	/*
	auto_set_region = true: we change the region according to zoom level
	aut_region = false: region is only determiined by region value, not by zoom level
	*/
	if (region != $('#region').val()){
		//Zoom level was changed
		//We need to change the region value
		$('#region').val(region);
	}
    //Delete old layer
    //MAP_APP.delete_map_layers();
	OL_MAP_APP.delete_map_layer(window.main_map_layer);
	//Set the new map_layer
	if (region == "ee_map"){
		//Generate a dynamic map with EE
		//ajax_get_ee_map();
	}else{
		// We ned to recompute the template vars
		//geodata, etdata and set the new map layer
		//ajax_update_data_and_map();
		ajax_update_ol_data_and_map(auto_set_region=auto_set_region);
	}
	if (region.is_in(['US_fields', 'Mason'])){
        //Field data
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
	//Delete old layer
	//MAP_APP.delete_map_layers();
	OL_MAP_APP.delete_map_layer(window.main_map_layer);
	// We ned to recompute the template vars
	//geodata, etdata
	//ajax_update_data_and_map();
	ajax_update_ol_data_and_map(auto_set_region=false);
	//MAP_APP.set_choropleth_layer();
	window.main_map_layer = OL_MAP_APP.get_choropleth_layer();
	OL_MAP_APP.set_map_layer(window.main_map_layer);
	//couple years field
    $('#years').val([$('#year').val()]);
}

function change_inYears(years){
    //MAP_APP.delete_map_layers();
	OL_MAP_APP.delete_map_layer(window.main_map_layer);
	if (years.length != 1){
		$('#form-statistic').css('display', 'block');
		window.main_map_layer = OL_MAP_APP.get_default_map_layer();
		OL_MAP_APP.set_map_layer(window.main_map_layer);
	} else{
		//New map layer is set inside ajax call (async issue)
		ajax_update_ol_data_and_map(auto_set_region=false);
		$('#form-statistic').css('display', 'none');
	}
	//Couple year field to be first year of selection
    $('#year').val($('#years').val()[0])
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
    var tps, tp, tp_name, option, key, key_list = [];
    if (resolution.is_in(['annual'])){
        $('#form-timeperiod').css('display','none');
        if ($('#years').css('display') !=  'none'){
        	//Mutiple years
			var year_list = $('#years').val();
        	if ($('#years').val().length != 1) {
				$('#form-statistic').css('display', 'block');
            }else{
        		$('#form-statistic').css('display', 'none');
			}
			//Set time_period option to the year list
			tps = {}
			for (var i=0; i< year_list.length; i++ ){
        		tps[year_list[i]] = year_list[i];
			}
		}
		else {
        	//Only one year is displayed
            $('#form-statistic').css('display', 'none');
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
        $('#form-statistic').css('display','block');
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
}

function get_feat_index_from_featdata(year) {
    var f_idx_list = $('#feat_indices').val().replace(', ', ',').split(','), indices = [];

    $.each(window.DATA.featgeomdata[year]['features'], function(idx, feat_data){
        if (f_idx_list.includes(String(feat_data['properties']['idx']))) {
            indices.push(String(idx));
        }
    });
    return indices;
}


