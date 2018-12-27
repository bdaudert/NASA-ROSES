#!/usr/bin/env python
# import statics

import os
import json
import logging
import operator
from copy import deepcopy
from urllib.request import urlopen
import random

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

def get_map_geojson_from_bucket(region):
    map_geojson = {}

    if region != 'study_areas':
        regions = [region]
    else:
        regions = list(statics['study_area_properties'].keys())
        regions.remove('study_areas')

    for r in regions:
        geoFName = statics['study_area_properties'][r]['geojson']
        url = GEO_BUCKET_URL + geoFName
        try:
            # Replace python None values with empty strings for javascript
            map_geojson[r] = json.loads(json.dumps(json.load(urlopen(url))).replace('null', '""'))
        except:
            map_geojson[r] = {}
    return map_geojson

def set_fake_data(template_variables):
    region = template_variables['variables']['region']
    variable = template_variables['variables']['variable']
    if region == 'study_areas':
       return {}
    geomdata = template_variables['map_geojson'][region]
    etdata = {}

    for year in statics.all_year[template_variables['variables']['dataset']]:
        etdata['year'] = {
            'type': 'FeatureCollection',
            'features': []
        }
    # Loop over features
    for feat in geomdata['features']:
        feat_data = {}
        for year in statics.all_year[template_variables['variables']['dataset']]:
            for m in statics.all_months.keys()[1:]:
                feat_data[variable + '_' + m] = random.uniform(0.0, 100.0)
            etdata[year]['features'].append(feat_data)
    return etdata

def set_etdata_from_test_server(template_variables, db_engine):
    '''
    Sets geondata, etdata, featsgeomdata, featsdata from Jordan's db
    :param template_variablesv: dict of template variables
    :param feat_index_list: list of feature indices to to be displayed on map
    :return: tv: updated template variables
    FIXME: we don't use geomdata, currently as set the map_geojson
           by reading geojson from the nasa-roses bucket
           see get_mapgeojson_from_bucket
    '''
    feat_index_list = ['all']
    tv = deepcopy(template_variables)
    DU = databaseMethods.postgis_Util(tv['variables'], db_engine)
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

def set_etdata(template_variables, db_type, db_engine):
    if db_type == 'FAKE':
        etdata= set_fake_data(template_variables)
    elif db_type == 'TEST_SERVER':
        feat_index_list = ['all']
        etdata = set_etdata_from_test_server(template_variables, db_engine)
    return etdata

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

    tv['map_geojson'] = get_map_geojson_from_bucket(tv['variables']['region'])
    if tv['variables']['region'] != 'study_areas':
        tv['etdata'] = set_etdata(tv, db_type, db_engine)
    return tv
