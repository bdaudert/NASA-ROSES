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
        # Replace python None values with empty strings for javascript
        geomdata = json.loads(json.dumps(json.load(urlopen(url))).replace('null', '""'))
    except Exception as e:
        logging.error(e)
        raise Exception(e)
    return geomdata

def get_study_area_geojson_from_bukcet():
    gjson = {}
    regions = list(statics['study_area_properties'].keys())
    regions.remove('study_areas')
    for r in regions:
        geoFName = statics['study_area_properties'][r]['geojson']
        gjson[r] = read_geomdata_from_bucket(geoFName)
    return gjson

def get_field_boundary_region_geojson_from_bucket(region):
    geoFName = statics['study_area_properties'][region]['field_boundaries']
    gjson = read_geomdata_from_bucket(geoFName)
    return gjson

def set_fake_data(template_variables, geomdata):
    region = template_variables['variables']['region']
    variable = template_variables['variables']['variable']
    if region == 'study_areas':
       return {}

    map_geojson = {
        'type': 'FeatureCollection',
        'features': []
    }
    # Loop over features
    data_min = 9999999
    data_max = -9999999
    for feat_idx, feat in enumerate(geomdata['features']):
        feat_data = copy.deepcopy(feat)
        feat_data['properties']['feature_index'] = feat_idx
        months = list(statics['all_months'].keys())
        months.remove('all')
        for m in months:
            val = round(random.uniform(0.0, 100.0), 4)
            if val < data_min:
                data_min = val
            if val > data_max:
                data_max = val
            feat_data['properties'][variable + '_' + m] = val
        map_geojson['features'].append(feat_data)
    # return json.dumps(map_geojson, ensure_ascii=False)
    return map_geojson, data_min, data_max

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
        tv['map_geojson'] = get_study_area_geojson_from_bukcet()

    elif tv['variables']['tool_action'] == 'switch_to_fields':
        geomdata = get_field_boundary_region_geojson_from_bucket(region)
        if db_type == 'FAKE':
            map_geojson, tv['data_min'], tv['data_max'] = set_fake_data(tv, geomdata)
            tv['map_geojson'] = {region: map_geojson}
        else:
            tv['map_geojson'] = {region: {}}
            tv['data_min'] =  -9999
            tv['data_max'] = -9999
    return tv
