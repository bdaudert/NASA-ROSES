function set_ajaxURL() {
    var new_url = window.location.href.split('?')[0];
    //clears out the query string stuff in URL, but doesn't reload hte page
    if (history.pushState) {
        window.history.pushState({ path: new_url }, '', new_url);
    }
    return new_url;
}

function start_progressbar(msg=null, msg_sub=null) {
    //Progress Bars after Buttons are Pushed
    /*********************************
     *     DEFAULT MESSAGE            *
     *********************************/
    //default processing message
    var p_msg = 'Processing Request',
        p_msg_sub = '',
        opts = {
            dialogSize: 'sm',
            progressType: 'warning'
        };

    if (msg){
        p_msg = msg;
    }
    if (msg_sub){
        p_msg_sub = msg_sub;
    }
    waitingDialog.show(p_msg, p_msg_sub, opts);
}

function end_progressbar(){
    waitingDialog.hide();
}

function set_error(error, cause, resolution, method) {
    var generalErrorMessage = error,
        generalCauseMessage = cause,
        generalResolutionMessage = resolution;
    if (cause === ""){
        //use default message defined in dataStore
        if (js_statics.default_generalCauseMessage.hasOwnProperty(method)){
            generalCauseMessage = js_statics.default_generalCauseMessage[method];
        }
    }
    if (resolution === ""){
        //use default message defined in dataStore
        if (js_statics.default_generalResolutionMessage.hasOwnProperty(method)){
            generalResolutionMessage = js_statics.default_generalResolutionMessage[method];
        }
    }
    //Show error dialog
    $('#generalErrorMessage').html(generalErrorMessage);
    $('#generalCauseMessage').html(generalCauseMessage);
    $('#generalResolutionMessage').html(generalResolutionMessage);
    $('#generalErrorModal').modal('show');
}

function set_form_data(){
    var form_data = 'region=' + $('#region').val();
    form_data += '&tool_action=' + $('#tool_action').val();
    form_data += '&variable=' + $('#variable').attr('data-id');
    form_data += '&dataset=' +  $('#dataset').attr('data-id');
    form_data += '&year=' +  String($('#year').attr('data-id'));
    return form_data;
}

function make_ajax_request(tool_action){
    //NOTE: this is only a template, we can't use this because we need to run
    //async ajax call fro the UI not to freeexe (no progresbar)
    // And therefor we need to execute specific code for each tool_action in the .done section
    //General ajax request
    var form_data = set_form_data(),
        msg = js_statics.msg_for_tool_action[tool_action],
        method = 'ajax',
        url = set_ajaxURL(),
        jqXHR, err_code, r, error, cause, i, tv_var;

    start_progressbar(msg);
    jqXHR = $.ajax({
        url: url,
        method: "POST",
        timeout: 60 * 5 * 1000,
        //async: false,
        data: form_data
    })
    .done(function(response) {
        r = $.parseJSON(response);
        if (r.hasOwnProperty('error')) {
            error = r.error;
            set_error( error, '', '', method);
            end_progressbar();
        }
        //Set the new template variables
        for (i=0; i < statics.response_vars[tool_action].length; i++){
            tv_var = statics.response_vars[tool_action][i];
            window.DATA[tv_var] = r[tv_var];
        }
        end_progressbar();
    })
    .fail(function(jqXHR) {
        end_progressbar();
        err_code = jqXHR.status;
        error = 'Server request failed with code ' + String(err_code) + '!'
        set_error(error, '', '', method)
    });
    // return jqXHR;
}


function ajax_switch_to_study_areas(){
    $('#region').val('study_areas');
    var tool_action = 'switch_to_study_areas';
    $('#tool_action').val(tool_action);

    var form_data = set_form_data(),
        msg = js_statics.msg_for_tool_action[tool_action],
        method = 'ajax',
        url = set_ajaxURL(),
        jqXHR, err_code, r, error, cause, i, tv_var;

    start_progressbar(msg);
    jqXHR = $.ajax({
        url: url,
        method: "POST",
        timeout: 60 * 5 * 1000,
        //async: false,
        data: form_data
    })
    .done(function(response) {
        r = $.parseJSON(response);
        if (r.hasOwnProperty('error')) {
            error = r.error;
            set_error( error, '', '', method);
            end_progressbar();
        }
        //Set the new template variables
        for (i=0; i < statics.response_vars[tool_action].length; i++){
            tv_var = statics.response_vars[tool_action][i];
            window.DATA[tv_var] = r[tv_var];
        }
        LF_MAP_APP.show_study_areas();
        end_progressbar();
    })
    .fail(function(jqXHR) {
        end_progressbar();
        err_code = jqXHR.status;
        error = 'Server request failed with code ' + String(err_code) + '!'
        set_error(error, '', '', method)
    });
    // return jqXHR;
}

function ajax_switch_to_fields(){
    var tool_action = 'switch_to_fields';
    $('#tool_action').val(tool_action);

    var form_data = set_form_data(),
        msg = js_statics.msg_for_tool_action[tool_action],
        method = 'ajax',
        url = set_ajaxURL(),
        jqXHR, err_code, r, error, cause, i, tv_var;

    start_progressbar(msg);
    jqXHR = $.ajax({
        url: url,
        method: "POST",
        timeout: 60 * 5 * 1000,
        //async: false,
        data: form_data
    })
    .done(function(response) {
        r = $.parseJSON(response);
        if (r.hasOwnProperty('error')) {
            error = r.error;
            set_error( error, '', '', method);
            end_progressbar();
        }
        //Set the new template variables
        for (i=0; i < statics.response_vars[tool_action].length; i++){
            tv_var = statics.response_vars[tool_action][i];
            window.DATA[tv_var] = r[tv_var];
        }
        LF_MAP_APP.show_field_choropleth();

        end_progressbar();
    })
    .fail(function(jqXHR) {
        end_progressbar();
        err_code = jqXHR.status;
        error = 'Server request failed with code ' + String(err_code) + '!'
        set_error(error, '', '', method)
    });

}


