$(document).ready(function () {
    //Activate  Modal window
    //NOTE: if we omit this, models won't show
    //Make modal draggable and resizable
    $('.modal-content').resizable();
    $('.modal-dialog').draggable();

    $('#region').on('change', function(){
        change_inRegion($(this).val(), auto_set_region=false);
    });

    $('#year').on('change', function(){
        change_inYear($(this).val());
    });

    $('#years').on('change', function() {
        change_inYears($(this).val());
    });
     $('#variable').on('change', function(){
        change_inVariable($(this).val());
    });

    $('#temporal_resolution').on('change', function(){
        change_inTRes($(this).val());
    });

    $('#time_period').on('change', function(){
        change_inTimePeriod($(this).val());
    });

    $('#time_period_statistic').on('change', function(){
        change_inTimePeriodStat($(this).val());
    });
});
