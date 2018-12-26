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
	}else if (region == 'ee_map'){
		//Maps
		$('#form-years').css('display', 'none');
		$('#form-year').css('display', 'none');
	}else{
		//Predefined regions
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

function change_inVariable(variable){
	var datasets = statics.dataset_by_var[variable],
		ds, li;
	$('#form-dataset').find('li').remove();
	if (datasets.length == 0){
		$('#form-dataset').css('display', 'none');
	}
	else{
		for (var i = 0; i < datasets.length; i++){
		    ds =  datasets[i];
			if (i == 0) {
				$('#dataset').text(statics.all_dataset[ds]);
			} else {
				li = "<li><a onclick="+"jumpto('dataset','" + statics.all_dataset[ds] + "');"+">" + ds + "</a></li>";
				$('#form-dataset').append(li);
			}
		}
	}
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
	if ($('#region').val() == 'landing_page') {
        LF_MAP_APP.set_landing_page_mapLayer();
    }
}

