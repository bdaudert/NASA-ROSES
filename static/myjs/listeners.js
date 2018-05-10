$(document).ready(function () {
    //Activate  Modal window
    //NOTE: if we omit this, models won't show
    //Make modal draggable and resizable
    $('.modal-content').resizable();
    $('.modal-dialog').draggable();

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

});
