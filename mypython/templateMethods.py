#!/usr/bin/env python
# import statics

import os
import json
import logging
import operator
from copy import deepcopy
from urllib.request import urlopen

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
    elif tv_vars['region'] == 'landing_page':
        return 'landing_page'
    else:
        return 'choropleth'

    return 'landing_page'




def read_geomdata_from_bucket(geoFName):
    url = GEO_BUCKET_URL + geoFName
    try:
        geomdata = json.load(urlopen(url))
    except Exception as e:
        logging.error(e)
        raise Exception(e)
    return geomdata


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
    tv['variables']['map_type'] = determine_map_type(tv['variables'])

    if app_name == 'dataBaseTasks':
        return tv
    if  tv['variables']['region'] in ['ee_map']:
        return tv

    return tv
