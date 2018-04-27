function change_inRegion(region){
	// We ned to recompute the template vars
	//geodata, metadata, etdata
	ajax_update_data();
    //Delete old layer
    MAP_APP.delete_layers();
	if (region.is_in(['US_fields', 'Mason'])){
		var field_year, y_idx;
        //Field data
		$('#form-field_year').css('display', 'inline')
        $('#form-aggregation_area').css('display', 'inline');
        //Set new layer
        //MAP_APP.set_ft_map_layer(1);
        field_year = $('#field_year').val();
        y_idx = $.inArray(field_year, statics.all_field_year[$('#region').val()]);
        MAP_APP.set_geojson_map_layer(y_idx);
	}
	if (region == 'ee_map'){
		//Maps
        $('#form-field_year').css('display', 'none');
		$('#form-aggregation_area').css('display', 'none');
		//Get the map from db
	}
}

function change_inYear(field_year){
	// We ned to recompute the template vars
	//geodata, etdata
	ajax_update_data();
	//Delete old layer
	var year_idx, year,
		year_list = statics.all_field_year[$('#region').val()];
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
    var tps, tp, tp_name, option, key;
    if (resolution.is_in(['annual'])){
        $('#form-timeperiod').css('display','none');
        $('#form-statistic').css('display','none');
        $('#time_period').val($('#field_year').val());
        $('#time_period_statistic').val('none');
        tps = {}
        key = $('#field_year').val();
        tps[key] =  key;
    }
    else{
        $('#form-timeperiod').css('display','block');
        $('#form-statistic').css('display','block');
        tps = statics.time_period_by_res[resolution];
    }

    //Set new timeseries options
	$('#time_period > option').remove();
	for (key in tps){
		tp =  key;
		tp_name = tps[key]
		option = '<option value="' + tp + '">' + tp_name;
        option+='</option>';
        $('#time_period').append(option);
	}
    if ($('#region').val() == 'ee_map'){
    	//Get the map from db
    }
}

function change_inTimePeriod(time_period){
    //Summarize the data over the time period

}


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