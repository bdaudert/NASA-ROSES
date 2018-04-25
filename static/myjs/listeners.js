$(document).ready(function () {
    //Activate  Modal window
    //NOTE: if we omit this, models won't show
    //Make modal draggable and resizable
    $('.modal-content').resizable();
    $('.modal-dialog').draggable();

    //-------------------------
    // Date Picker
    //-------------------------
    /*
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
    */
    
    $('#region').on('change', function(){
        change_inRegion($(this).val());

    });

    $('#field_year').on('change', function(){
        change_inYear($(this).val());
    });
    $('#variable').on('change', function(){
        change_inVariable($(this).val());
    });
    $('#t_res').on('change', function(){
        change_inTRes($(this).val());
    });
     $('#time_period').on('change', function(){
        change_inTimePeriod($(this).val());
    });
});
