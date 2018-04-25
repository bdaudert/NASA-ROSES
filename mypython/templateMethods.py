#!/usr/bin/env python
# import statics

import logging
from config import statics
from config import GMAP_API_KEY as GMAP_API_KEY
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
    form_options['field_year'] = statics['all_field_year'][region]
    # Set the time_period according to t_res
    form_options['time_period'] = statics['time_period_by_res'][variables['t_res']]
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

def set_database_util(tv):
    # Load the data from the database
    rgn = tv['variables']['region']
    yr = tv['variables']['field_year']
    ds = tv['variables']['dataset']
    m = tv['variables']['et_model']
    DU = databaseMethods.Datatstore_Util(rgn, yr, ds, m)
    return DU


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
        'app_name': app_name,
        'variables': statics['variable_defaults'],
        'form_options': {},
        'map_options': {},
        'ts_options': {}
    }
    # Overrode default variables if not GET
    if method == 'POST' or method == 'shareLink':
        for var_key, dflt in tv['variables'].iteritems():
            if var_key in RequestHandler.request.arguments():
                tv['variables'][var_key] = RequestHandler.request.get(var_key, dflt)

    # Set dates
    dates = set_dates()
    tv['variables'].update(dates)
    # Set form options
    tv['form_options'] = set_form_options(tv['variables'])

    # Get the etdata and geometry from the geo database
    tv['etdata'] = []
    tv['geomdata'] = {}
    if app_name == 'dataBaseTasks':
        return tv
    if  tv['variables']['region'] in ['ee_map']:
        return tv
    # Get the relevant etdata
    DU = set_database_util(tv)
    tv['etdata'] = DU.read_from_db()
    tv['geomdata'] = DU.read_geometries_from_bucket()
    return tv

