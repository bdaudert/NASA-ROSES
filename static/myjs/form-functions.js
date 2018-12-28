function clear_mapLayer_and_data(){
	window.map.closePopup();
	// Delete old layer
	LF_MAP_APP.delete_mapLayers();
	LF_MAP_APP.hide_mapColorbar('#colorbar');
	// Delete old data
	if (window.DATA['etdata'] ) {
        window.DATA['etdata'] = {};
    }
}

function set_new_mapLayer(){
	//Set the new map_layer
	if ($('#region').val() == 'study_areas') {
        LF_MAP_APP.set_landing_page_mapLayer();
    } else{
		LF_MAP_APP.set_choropleth_mapLayer();
	}
}

function change_inVariable(variable){
	var datasets = statics.dataset_by_var[variable],
		ds, li, ds_name;
	$('#form-dataset').find('li').remove();
	for (var i = 0; i < datasets.length; i++){
		ds =  datasets[i];
		ds_name = statics.all_dataset[ds];
		if (i == 0) {
			$('#dataset').text(ds_name);
		} else {
			li = "<li><a onclick="+"change_inDataset(variable);jumpto('dataset','" + statics.all_dataset[ds] + "');"+">" + ds_name + "</a></li>";
			$('#form-dataset').append(li);
		}
	}

	clear_mapLayer_and_data();
	set_new_mapLayer();
}

function change_inDataset(dataset){
	var vars = statics.var_by_dataset[datset],
		v, li, var_name;

	$('#form-variable').find('li').remove();

	for (var i = 0; i < vars.length; i++){
		v =  vars[i];
		var_name = statics.all_variables[v];
		if (i == 0) {
			$('#variabe').text(var_name);
		} else {
			li = "<li><a onclick="+"change_inVariable(v);jumpto('variable','" + statics.all_variable[v] + "');"+">" + var_name + "</a></li>";
			$('#form-dataset').append(li);
		}
	}

	clear_mapLayer_and_data();
	set_new_mapLayer();
}

function change_inYear(year){
	clear_mapLayer_and_data();
	set_new_mapLayer();
}






