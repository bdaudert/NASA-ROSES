function change_inRegion(region){
	if (region == 'fields'){
		$('#form-field_year').css('display', 'inline');
	}
	else{
		$('#form-field_year').css('display', 'none');
	}
}

function change_inVariable(variable){
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
}
