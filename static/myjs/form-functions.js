function change_inRegion(region){
	if (region != $('#region').val()){
		//Zoom level was changed
		//We need to change the reggion value
		$('#region').val(region);
	}
    //Delete old layer
    MAP_APP.delete_map_layers();
    //Set the new map_layer
	if (region == "ee_map"){
		//Generate a dynamic map with EE
		//ajax_get_ee_map();
	}else{
		// We ned to recompute the template vars
		//geodata, etdata and set the new map layer
		ajax_update_data();
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
	MAP_APP.delete_map_layers();
	// We ned to recompute the template vars
	//geodata, etdata
	ajax_update_data();
	MAP_APP.set_choropleth_layer();
	//couple years field
    $('#years').val([$('#year').val()]);
}

function change_inYears(years){
	MAP_APP.delete_map_layers();
	if (years.length != 1){
		MAP_APP.set_map_overlay();
		$('#form-statistic').css('display', 'block');
	} else{
		MAP_APP.set_choropleth_layer();
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


function set_dataModalHeader(idx){
	var v = $('#variable').val(),
		year = $('#year').val(),
		years = $('#years').val(),
		prop_name, html= '', c_idx,
		region = $('#region').val();
	//Title
	for (c_idx = 0; c_idx < statics.geo_meta_cols[region].length; c_idx++){
		prop_name = statics.geo_meta_cols[region][c_idx];
		html += '<b>' + prop_name + '</b>'+ ': ';
		if (DATA.geomdata[year].features[idx]['properties'][prop_name]) {
			html += DATA.geomdata[year].features[idx]['properties'][prop_name];
		}
		html+= '<br>';
	}
	html += '<b>Variable</b>: ' + v + '<br>';
	return html;
}


function set_singleYear_singleFeat_valList(year, variable, t_res, time_period, stat, f_data){
    /*
	Sets the value list for a single year and single feature with data f_data
	NOTE: stat is computed here, is that rght? FIX ME
    */
    var prop_names = statics.stats_by_var_res[variable][t_res],
        prop_name, p_idx, s, tp, val_list = [];
    for (p_idx = 0; p_idx < prop_names.length; p_idx++) {
        prop_name = prop_names[p_idx];
        if (t_res != 'monthly'){
            if (Math.abs(f_data['properties'][prop_name] + 9999) > 0.0001) {
                val_list.push(f_data['properties'][prop_name]);
            }
        }else{
            s = prop_names[p_idx].split('_');
            tp = s[s.length - 1].slice(-2);
            if (tp.substring(0, 1) == '0') {
                tp = tp.substring(1, 2);
            }
            if (tp.is_in(time_period)) {
            	if (Math.abs(f_data['properties'][prop_name] + 9999) > 0.0001) {
                    val_list.push(f_data['properties'][prop_name]);
                }
            }
        }
    }
    val_list = compute_time_period_stat(val_list, stat, time_period);
    return val_list;
}

function set_singleYear_multiFeat_valList(year, variable, t_res, time_period, stat, featdata){
    /*
	Sets the value list for a single year and multiple features
	NOTE: stat is computed over each feature
    */

    var val_list = [], d;
    d = $.map(featdata.features, function (f_data) {
    	return set_singleYear_singleFeat_valList(year, variable, t_res, time_period, stat, f_data);
    });
    val_list = val_list.concat(d);
    return val_list
}

function set_multiYear_multiFeat_valList(years, variable, t_res, time_period, stat, featdata){
	var val_list, d;
	d = $.map(years, function(year) {
		return set_singleYear_multiFeat_valList(year, variable, t_res, time_period, stat, featdata);
	});
	val_list = val_list.concat(d);
    return val_list
}



function set_dataModalValList_multiYear(years, variable, t_res, time_period, stat, feat_indices){
	//Sets the values for the dataModal over muliple years
    var v_dict_year, val_dict = {}, val_list = [], y_idx, year, f_data_list, featdata;
    //Lopp over the years
    for (y_idx = 0; y_idx < years.length; y_idx++){
        year = years[y_idx];
        if (DATA.etdata.hasOwnProperty(year)){
        	featdata = { type: 'FeatureCollection', features: []};
        	f_data_list = $.map(DATA.etdata[year]['features'], function(f_data){
        		if (feat_indices.includes(f_data['properties']['idx'])) {
                    return f_data;
                }
            });
			featdata['features'] = f_data_list;
        }else {
            ajax_get_feat_data();
            featdata = window.DATA.featdata;
        }
        val_list = set_singleYear_multiFeat_valList(year, variable, t_res, time_period, stat, featdata);
        val_dict[year] = val_list;
    }
	return val_dict;
}


function set_dataModalPropertyNames(v, t_res, time_period, stat) {
    var new_prop_names = [], periods = '', p,
		old_prop_names = statics.stats_by_var_res[v][t_res];
    if (t_res == 'annual'){
        new_prop_names.push(statics.stats_by_var_res[v][t_res]);
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

function set_dataModalData(val_dict, new_prop_names){
	var html = '', v_idx, val_list = [], year;
	for (year in val_dict) {
	    html += 'Year: ' + year + '<br>';
	    val_list = val_dict[year];
	    for (v_idx=0; v_idx < val_list.length; v_idx++) {
            prop_name = new_prop_names[v_idx];
            html += '<b>' + prop_name + '</b>: ' + val_list[v_idx] + '<br>';
        }
	}
	return html;
}