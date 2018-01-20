#!/usr/bin/env python
# import statics
import json

from config import statics


def set_form_options(variables):
    form_options = {}
    for var_key, dflt in variables.iteritems():
        form_options[var_key] = statics['all_' + var_key]
    # Override default form options if needed
    var = variables['variable']
    # Set field year form option
    if var == 'fields':
        years = statics['Fusiontables'].fields.keys()
        form_options['field_year'] = years
    # Set datasets
    form_ds = {}
    for ds in statics['dataset_by_var'][var]:
        form_ds[ds] = statics['all_dataset'][ds]
    form_options['dataset'] = form_ds
    return form_options


def set_initial_template_values(RequestHandler, app_name, method):
    '''
    Args:
    RequestHandler: webapp2.RequestHandler object
    appName: application name, e.g. OpenET-1
    dOn: default or not; if dOn =  default
    default values are used
    otherwisee we try to get the variable
    values from the request object

    Returns:
    tv: a dictionary of template variables
    '''
    tv = {
        'app_name': app_name,
        'variables': statics['variable_defaults'],
        'form_options': {},
        'map_options': {},
        'ts_options': {},
    }

    # Overrode default variables if not GET
    if method != 'GET':
        for var_key, dflt in tv['variables'].iteritems():
            RequestHandler.request.get(var_key, dflt)

    # Set form options
    tv['form_options'] = set_form_options(tv['variables'])
    return tv
