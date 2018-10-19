#!/usr/bin/env python
# import statics

import os
import json
import logging
import operator
from copy import deepcopy

from config import statics
from mypython import databaseMethods


def set_form_options(variables):
    form_options = {}
    for var_key, dflt in variables.items():
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
    # Set the time_period according to temporal_resolution
    if variables['temporal_resolution'] == 'annual':
        form_options['time_period'] = {variables['year']: variables['year']}
    else:
        periods = statics['time_period_by_res'][variables['temporal_resolution']]
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

def set_map_type(tv):
    if (tv['variables']['region'] == 'ee_map'):
        return 'ee_map'

    # Multi year
    if len(tv['variables']['years']) != 1:
        return 'default'

    # Single Year
    if tv['variables']['temporal_resolution'] == 'annual':
        return 'Choropleth'

    # Sub Annual
    if  len(tv['variables']['time_period']) == 1:
        return 'Choropleth'

    # Multiple time periods
    if tv['variables']['time_period_statistic'] != 'none':
        return 'Choropleth'

    return 'default'

def set_etdata_from_datastore(template_variables, feat_index_list):
    '''
    Sets geomdata, etdata, featsgeomdata, featsdata from datastore (prodction)
    or local folder (local host developmet)
    :param template_variables:
    :param feat_index_list:
    :return: tv: updated template variables
    '''
    tv = deepcopy(template_variables)
    # Load the data from the database
    rgn = tv['variables']['region']
    ds = tv['variables']['dataset']
    tv['etdata'] = {}
    tv['geomdata'] = {}
    tv['featsdata'] = {}
    tv['featsgeomdata'] = {}
    for year in tv['variables']['years']:
        DU = databaseMethods.Datastore_Util(rgn, year, ds)
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
    year = tv['variables']['years'][0]
    DU = databaseMethods.Datastore_Util(rgn, year, ds)
    if os.getenv('SERVER_SOFTWARE', '').startswith('Google App Engine/'):
        # Running in production environment, read data from db
        etdata = DU.read_data_from_db()
    else:
        # etdata = DU.read_data_from_local()
        etdata = DU.read_data_from_bucket()

    # NOTE, need a json.dumps here so we can read data into global js vars in scripts.html
    # tv['etdata'] = json.dumps({yr: etdata}, ensure_ascii=False).encode('utf8')
    # tv['geomdata'] = json.dumps({yr: geomdata}, ensure_ascii=False).encode('utf8')
    tv['etdata'] = json.dumps({year: etdata}, ensure_ascii=False)
    tv['geomdata'] = json.dumps({year: geomdata}, ensure_ascii=False)
    return tv

def set_etdata_from_cloudSQL(template_variables, feat_index_list):
    # FIX ME: develop code for cloudSQL
    tv = deepcopy(template_variables)
    return tv

def determine_map_type(tv_vars):
    '''
    :param tv_vars: template variables tv['variables']
    :return: string map_type: Choropleth or default
    '''
    if len(tv_vars['years']) != 1:
        return 'default'

    # Single Year is chorpleth if temp res is annual or seasonal
    # or monthly ith a statistic
    if tv_vars['temporal_resolution'] in ['annual', 'seasonal']:
     return 'Choropleth'

    # Sub annual
    if len(tv_vars['time_period']) == 1:
        return 'Choropleth';

    # Multiple time periods
    if tv_vars['time_period_statistic'] != 'none':
        return 'Choropleth';
    return 'default'

def set_etdata_from_test_server(template_variables, feat_index_list, db_engine):
    '''
    Sets geondata, etdata, featsgeomdata, featsdata from Jordan's db
    :param template_variablesv: dict of template variables
    :param feat_index_list: list of feature indices to to be displayed on map
    :return: tv: updated template variables
    '''
    tv = deepcopy(template_variables)
    DU = databaseMethods.postgis_Util(tv['variables'], db_engine)
    if feat_index_list:
        tv['featsdata'], tv['featsgeomdata'] = DU.read_data_from_db(feature_index_list=feat_index_list)

    map_type = determine_map_type(template_variables['variables'])

    if map_type == "Choropleth" or len(tv['variables']['years']) == 1:
        tv['etdata'], tv['geomdata'] = DU.read_data_from_db(feature_index_list=['all'])
    else:
        # Reads only the geometry data to generate non-choropleth map
        tv['geomdata'] = DU.read_geomdata_from_db(9999)
        tv['etdata'] = json.dumps({}, ensure_ascii=False)
    return tv

def set_template_values(req_args, app_name, method, db_type, db_engine):
    '''
    Args:
    req_args: request arguments
    app_name: application name, e.g. OpenET-1
    method: GET, shareLink or POTS (ajax call)
    db_engine: database engine, options
               None
               DATASTORE
               cloudSQL
               <db engine object>: sqlaalchemy engine hooked up to Jordan's db
    Returns:
    tv: a dictionary of template variables
    '''

    tv = {
        'method': method,
        'app_name': app_name,
        'variables': statics['variable_defaults'],
        'form_options': {},
        'map_options': {},
        'ts_options': {}
    }
    if method == 'ERROR':
        tv['form_options'] = set_form_options(tv['variables'])
        return tv

    # Overrode default variables if not GET
    if method == 'POST' or method == 'shareLink':
        for var_key, dflt in tv['variables'].items():
            if isinstance(dflt, list):
                # LAME: can't enter default list as with get
                form_val = req_args.getlist(var_key)
                if not form_val:
                   form_val = dflt
            else:
                form_val = req_args.get(var_key, dflt)
            tv['variables'][var_key] = form_val

    # Set dates
    dates = set_dates()
    tv['variables'].update(dates)
    # Set form options
    tv['form_options'] = set_form_options(tv['variables'])

    # Set the map type
    tv['variables']['map_type'] = set_map_type(tv)

    if app_name == 'dataBaseTasks':
        return tv
    if  tv['variables']['region'] in ['ee_map']:
        return tv

    feat_index_list = ['all']
    if 'feature_indices' in tv['variables'].keys() and tv['variables']['feature_indices']:
        feat_index_list = tv['variables']['feature_indices'].replace(', ', ',').split(',')
        feat_index_list = [int(f_idx) for f_idx in feat_index_list]

    if db_type == 'DATASTORE':
        tv = set_etdata_from_datastore(tv, feat_index_list)
    elif db_type == 'cloudSQL':
        tv = set_etdata_from_cloudSQL(tv, feat_index_list)
    elif db_type == 'TEST_SERVER':
        tv = set_etdata_from_test_server(tv, feat_index_list, db_engine)
    else:
        pass
    return tv
