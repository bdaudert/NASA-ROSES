#!/usr/bin/env python
# import statics
import json

from config import statics
from config import GMAP_API_KEY as GMAP_API_KEY
from config import GEO_DIR as GEO_DIR

import databaseMethods


def set_form_options(variables):
    form_options = {}
    for var_key, dflt in variables.iteritems():
        if var_key in statics['form_option_keys']:
            form_options[var_key] = statics['all_' + var_key]
    # Override default form options if needed
    var = variables['variable']
    region = variables['region']
    # Set field years form option
    if region in ['US_fields', 'Mason']:
        form_options['field_years'] = statics['all_field_years']
        form_options['field_year'] = statics['all_field_year']
    # Set datasets
    form_ds = {}
    for ds in statics['dataset_by_var'][var]:
        form_ds[ds] = statics['all_dataset'][ds]
    form_options['dataset'] = form_ds
    return form_options


def set_dates():
    min_date = '2000-01-01'
    max_date = '2009-12-31'
    dates = {
        'start_date': '2009-01-01',
        'end_date': '2009-12-31',
        'min_date': min_date,
        'max_date': max_date
    }
    return dates


def get_et_data_from_db(tv):
    rgn = tv['variables']['region']
    if rgn in ['ee_map']:
        return {}
    # Load the data from the database
    yr = tv['variables']['field_year']
    ds = tv['variables']['dataset']
    m = tv['variables']['et_model']
    DU = databaseMethods.Datatstore_Util(rgn, yr, ds, m)
    # db_key = DU.set_db_key()
    # return DU.read_from_db(db_key)
    json_data = DU.read_from_db()
    return json_data


def set_initial_template_values(RequestHandler, app_name, method):
    '''
    Args:
    RequestHandler: webapp2.RequestHandler object
    app_name: application name, e.g. OpenET-1
    dOn: default or not; if dOn =  default
    default values are used
    otherwisee we try to get the variable
    values from the request object

    Returns:
    tv: a dictionary of template variables
    '''

    tv = {
        'GMAP_API_KEY': GMAP_API_KEY,
        'GEO_DIR': GEO_DIR,
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

    # Set dates
    dates = set_dates()
    tv['variables'].update(dates)
    # Set form options
    tv['form_options'] = set_form_options(tv['variables'])
    # Get the et_data from the geo database
    if app_name != 'dataBaseTasks':
        tv['json_data'] = get_et_data_from_db(tv)
    else:
        tv['json_data'] = {}
    return tv

