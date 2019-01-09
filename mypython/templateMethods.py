#!/usr/bin/env python
# import statics

import os
import json
import logging
import operator
from copy import deepcopy
from urllib.request import urlopen
import random
import copy

from config import statics
from config import GEO_BUCKET_URL
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

    # Set the years
    form_options['year'] = statics['all_year'][variables['dataset']]
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

def determine_map_type(tv_vars):
    if tv_vars['region'] == 'ee_map':
        return 'ee_map'
    elif tv_vars['region'] == 'study_areas':
        return 'study_areas'
    else:
        return 'choropleth'
    return 'study_areas'


def read_geomdata_from_bucket(geoFName):
    url = GEO_BUCKET_URL + geoFName
    try:
        geomdata = json.load(urlopen(url))
    except Exception as e:
        logging.error(e)
        raise Exception(e)
    return geomdata

def get_map_geojson_from_bucket(region, type):
    map_geojson = {}
    if region != 'study_areas':
        regions = [region]
    else:
        regions = list(statics['study_area_properties'].keys())
        regions.remove('study_areas')

    for r in regions:
        if type == 'study_areas':
            geoFName = statics['study_area_properties'][r]['geojson']
        if type == 'field_boundaries':
            geoFName = statics['study_area_properties'][r]['field_boundaries']
        url = GEO_BUCKET_URL + geoFName

        try:
            # Replace python None values with empty strings for javascript
            map_geojson[r] = json.loads(json.dumps(json.load(urlopen(url))).replace('null', '""'))
        except:
            map_geojson[r] = {}
        
    return map_geojson

def set_fake_data(template_variables, geomdata):
    region = template_variables['variables']['region']
    variable = template_variables['variables']['variable']
    if region == 'study_areas':
       return {}
    etdata = {
        'type': 'FeatureCollection',
        'features': []
    }
    ds = template_variables['variables']['dataset']
    # Loop over features
    for feat_idx, feat in enumerate(geomdata['features']):
        feat_data = copy.deepcopy(feat)
        feat_data['properties']['feature_index'] = feat_idx
        months = list(statics['all_months'].keys())
        months.remove('all')
        for m in months:
            feat_data['properties'][variable + '_' + m] = round(random.uniform(0.0, 100.0), 4)
        etdata['features'].append(feat_data)
    # return json.dumps(etdata, ensure_ascii=False)
    return etdata

def set_etdata_from_test_server(template_variables, db_engine):
    '''
    Sets geondata, etdata, featsgeomdata, featsdata from Jordan's db
    :param template_variablesv: dict of template variables
    :param feat_index_list: list of feature indices to to be displayed on map
    :return: tv: updated template variables
    FIXME: NEED to check that read_map_geojson works as expected, neeeds to match output from fake data
    '''
    feat_index_list = ['all']
    tv = deepcopy(template_variables)
    DU = databaseMethods.postgis_Util(tv['variables'], db_engine)
    map_geojson = DU.read_map_geojson_from_db(feature_index_list=feat_index_list)
    '''
    tv['featsdata'], tv['featsgeomdata'] = {}, {}
    if len(feat_index_list) >= 1 and feat_index_list[0] != 'all':
        tv['featsdata'], tv['featsgeomdata'] = DU.read_data_from_db(feature_index_list=feat_index_list)
    map_type = determine_map_type(template_variables['variables'])

    if map_type == "Choropleth" or len(tv['variables']['years']) == 1:
        tv['etdata'], tv['geomdata'] = DU.read_data_from_db(feature_index_list=['all'])
    else:
        # Reads only the geometry data to generate non-choropleth map
        tv['geomdata'] = DU.read_geomdata_from_db(9999)
        tv['etdata'] = json.dumps({}, ensure_ascii=False)
    return tv['etdata']
    '''
    return map_geojson

def set_template_values(req_args, app_name, method, db_type, db_engine):
    '''
    Args:
    req_args: request arguments
    app_name: application name, e.g. OpenET-1
    method: GET, shareLink or POST (ajax call)
    db_type: database engine, options
               FAKE,
               DATASTORE
               TEST_SERVER (postgreSQL + postgis)
    db_engine: None or postgreSQL database engine

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
    tv['variables']['map_type'] = determine_map_type(tv['variables'])

    if app_name == 'dataBaseTasks':
        return tv
    if  tv['variables']['region'] in ['ee_map']:
        return tv

    # Set the map_geojson file(s)
    region = tv['variables']['region']


    if tv['variables']['tool_action'] in ['None', 'switch_to_study_areas']:
        # Only geojsons area stored
        tv['map_geojson'] = get_map_geojson_from_bucket(region, 'study_areas')

    elif tv['variables']['tool_action'] == 'switch_to_fields':
        # geojson + etdata stored
        geomdata = get_map_geojson_from_bucket(region, 'field_boundaries')[region]
        if db_type == 'FAKE':
            tv['map_geojson'] = {region: set_fake_data(tv, geomdata)}
        else:
            tv['map_geojson'] = {region: set_etdata_from_test_server(tv, db_engine)}
    return tv
