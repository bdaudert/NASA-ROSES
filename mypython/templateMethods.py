#!/usr/bin/env python
# import statics

import os
import json
import logging
import operator
from config import statics
from config import GMAP_API_KEY as GMAP_API_KEY
import databaseMethods


def set_form_options(variables):
    form_options = {}
    for var_key, dflt in variables.iteritems():
        if var_key in statics['form_option_keys']:
            # form_options[var_key] = statics['all_' + var_key]
            fo = statics['all_' + var_key]
            if isinstance(fo, dict):
                # Sort by dict values
                sorted_fo = dict(sorted(fo.items(), key=operator.itemgetter(1)))
                form_options[var_key] = sorted_fo
            else:
                form_options[var_key] = fo

    # Override default form options if needed
    var = variables['variable']
    region = variables['region']
    dataset = variables['dataset']
    # Set the year form options
    form_options['year'] = statics['all_year'][dataset]
    form_options['years'] = statics['all_years'][dataset]
    # Set the time_period according to t_res
    if variables['t_res'] == 'annual':
        form_options['time_period'] = {variables['year']: variables['year']}
    else:
        periods = statics['time_period_by_res'][variables['t_res']]
        keys = sorted(periods.keys())
        form_options['time_period'] = {}
        for key in keys:
            form_options['time_period'][key] = periods[key]

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

def set_database_util(year, tv):
    # Load the data from the database
    rgn = tv['variables']['region']
    yr = year
    ds = tv['variables']['dataset']
    m = tv['variables']['et_model']
    DU = databaseMethods.Datastore_Util(rgn, yr, ds, m)
    return DU

def set_map_type(tv):
    if (tv['variables']['region'] == 'ee_map'):
        return 'ee_map'

    # Multi year
    if len(tv['variables']['years']) != 1:
        return 'default'

    # Single Year
    if tv['variables']['t_res'] == 'annual':
        return 'Choropleth'

    # Sub Annual
    if  len(tv['variables']['time_period']) == 1:
        return 'Choropleth'

    # Multiple time periods
    if tv['variables']['time_period_statistic'] != 'none':
        return 'Choropleth'

    return 'default'

def set_template_values(RequestHandler, app_name, method):
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
        'method': method,
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
                if isinstance(dflt, list):
                    tv['variables'][var_key] = RequestHandler.request.get_all(var_key, dflt)
                else:
                    tv['variables'][var_key] = RequestHandler.request.get(var_key, dflt)

    # Set dates
    dates = set_dates()
    tv['variables'].update(dates)
    # Set form options
    tv['form_options'] = set_form_options(tv['variables'])

    # Set the map type
    tv['variables']['map_type'] = set_map_type(tv)

    # Get the etdata and geometry from the geo database
    tv['etdata'] = {}
    tv['geomdata'] = {}
    tv['featsdata'] = {}
    tv['featsgeomdata'] = {}
    if app_name == 'dataBaseTasks':
        return tv
    if  tv['variables']['region'] in ['ee_map']:
        return tv

    feat_index_list = []
    if 'feat_indices' in tv['variables'].keys() and tv['variables']['feat_indices']:
        feat_index_list = tv['variables']['feat_indices'].replace(', ', ',').split(',')

    for year in tv['variables']['years']:
        DU = set_database_util(year, tv)
        # Get the feature data by index
        geomdata = DU.read_geometries_from_bucket()
        tv['featsgeomdata'][year] = {
            'type': 'FeatureCollection',
            'features': []
        }
        if feat_index_list:
            if os.getenv('SERVER_SOFTWARE', '').startswith('Google App Engine/'):
                # Running in production environment, read data from db
                tv['featsdata'][year] = DU.read_feat_data_from_db(feat_index_list)
            else:
                # Running in development environment
                # Read data from bucket
                tv['featsdata'][year] = DU.read_feat_data_from_bucket(feat_index_list)
            for feat_idx in feat_index_list:
                tv['featsgeomdata'][year]['features'].append(geomdata['features'][int(feat_idx)])
    # Get all data for the first year in year_list
    yr = tv['variables']['years'][0]
    if os.getenv('SERVER_SOFTWARE', '').startswith('Google App Engine/'):
        # Running in production environment, read data from db
        etdata = DU.read_data_from_db()
    else:
        # etdata = DU.read_data_from_local()
        etdata = DU.read_data_from_bucket()
    # NOTE, need a json.dumps here so we can read data into global js vars in scripts.html
    tv['etdata'] = json.dumps({yr: etdata}, ensure_ascii=False).encode('utf8')
    tv['geomdata'] = json.dumps({yr: geomdata}, ensure_ascii=False).encode('utf8')
    return tv
