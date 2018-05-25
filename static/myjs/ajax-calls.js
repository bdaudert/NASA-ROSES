function clearOut_URL() {
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



function ajax_update_data(){
    var tool_action = 'update_data',
        url = clearOut_URL(),
        form_data, jqXHR,
        err_code, r, method = 'ajax', error, cause, i, tv_var;
    //Update the tool_action
    $('#tool_action').val(tool_action);
    //Get the form data
    form_data = $("#form_all").serialize();
    var msg = 'Switching region';
    start_progressbar(mgs=msg);
    jqXHR = $.ajax({
        url: url,
        method: "POST",
        timeout: 60 * 5 * 1000,
        data: form_data,

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
            window.DATA[tv_var] = $.parseJSON(r[tv_var]);

        }
        //Set new map layer
        MAP_APP.set_choropleth_layer();
        end_progressbar();
    }) // successfully got JSON response
    .fail(function(jqXHR) {
        err_code = jqXHR.status;
        error = 'Server request failed with code ' + String(err_code) + '!'
        set_error(error, '', '', method)
        end_progressbar();
    });
}

function ajax_get_feat_data(){
    var tool_action = 'get_feat_data',
        url = clearOut_URL(),
        form_data, jqXHR,
        err_code, r, method = 'ajax', error, cause, i, tv_var;
    //Update the tool_action
    $('#tool_action').val(tool_action);
    //Get the form data
    form_data = $("#form_all").serialize();
    var msg = 'Obtaining feature data';
    start_progressbar(mgs=msg);
    jqXHR = $.ajax({
        url: url,
        method: "POST",
        timeout: 60 * 5 * 1000,
        data: form_data,

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
            window.DATA[tv_var] = $.parseJSON(r[tv_var]);

        }
        end_progressbar();
    }) // successfully got JSON response
    .fail(function(jqXHR) {
        err_code = jqXHR.status;
        error = 'Server request failed with code ' + String(err_code) + '!'
        set_error(error, '', '', method)
        end_progressbar();
    });
}
