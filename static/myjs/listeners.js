$(document).ready(function () {

    //Activate  Modal window
    //NOTE: if we omit this, models won't show
    //$('#dataModal').modal('toggle');
    //$('#modalError').modal('toggle');
    //Make modal draggable and resizable
    $('.modal-content').resizable();
    $('.modal-dialog').draggable();

    //-------------------------
    // Date Picker
    //-------------------------
    $( "#start_date" ).datepicker({
        showOn: "button",
        buttonImage: "media/img/calendar_logo.gif",
        buttonImageOnly: true,
        buttonText: "Open Calendar",
        changeMonth: true,
        changeYear: true,
        numberOfMonths: 3,
        minDate: $('#min_date').val(),
        maxDate: $('#max_date').val(),
        yearRange: $('#min_date').val().slice(0,4) + ":" + $('#max_date').val().slice(0,4),
        dateFormat: "yy-mm-dd",
        onClose: function( selectedDate ) {
            $( "#end_date" ).datepicker( "option", "minDate", selectedDate);
        }
    });

    $( "#end_date" ).datepicker({
        showOn: "button",
        buttonImage: "media/img/calendar_logo.gif",
        buttonImageOnly: true,
        buttonText: "Open Calendar",
        changeMonth: true,
        changeYear: true,
        numberOfMonths: 3,
        minDate: $('#min_date').val(),
        maxDate: $('#max_date').val(),
        yearRange: $('#min_date').val().slice(0,4) + ":" + $('#max_date').val().slice(0,4),
        dateFormat: "yy-mm-dd",
        onClose: function( selectedDate ) {
            $( "#start_date" ).datepicker( "option", "maxDate", selectedDate);
        }
    });

    
    $('#region').on('change', function(){
        change_inRegion($(this).val());

    });
    $('#field_years').on('change', function(){
    	//Delete old layer
        var years = $(this).val(), year_idx, year, 
            year_list = Object.keys(statics.all_field_years);
        for (year_idx = 0; year_idx < year_list.length; year_idx++){
            year = year_list[year_idx];
            if (year.is_in(years)){
                MAP_APP.set_geojson_map_layer(year_idx);
            }
            else{
                MAP_APP.delete_layer(year_idx);
            }
        }
    });
    $('#variable').on('change', function(){
        change_inVariable($(this).val());
    });
    $('#temporal_resolution').on('change', function(){
        change_inResolution($(this).val());
    });
    
});
