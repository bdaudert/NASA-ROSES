#!/usr/bin/env python
"""MAIN script for OpenET connecting to Earth Engine using App Engine."""



# Works in the local development environment and when deployed.
# If successful, shows a single web page with the SRTM DEM
# displayed in a Google Map.  See accompanying README file for
# instructions on how to set up authentication.

import config
import httplib2
import json
import logging
import os
import glob

import ee
from google.appengine.api import urlfetch
# from google.appengine.ext import ndb
import jinja2
import webapp2

from config import statics
from config import p_statics
import JinjaFilters
import templateMethods
import databaseMethods


# SET STATICS
'''
# Load the statics file
static_dir = config.STATIC_BASE_DIR
static_file = config.STATIC_FILE
with open(static_file, 'rb') as fin:
    statics = json.loads(fin)
'''
urlfetch.set_default_fetch_deadline(180000)
httplib2.Http(timeout=180000)


# Set the JINJA_ENVIRONMENT
template_dir = os.path.join(os.path.dirname(__file__), 'templates')
JINJA_ENVIRONMENT = jinja2.Environment(
    autoescape=True,
    loader=jinja2.FileSystemLoader(template_dir),
    extensions=['jinja2.ext.with_'])

# Register custom filters
JINJA_ENVIRONMENT.filters['is_in'] = JinjaFilters.is_in
JINJA_ENVIRONMENT.filters['not_in'] = JinjaFilters.not_in
JINJA_ENVIRONMENT.filters['make_string_range'] = JinjaFilters.make_string_range
JINJA_ENVIRONMENT.filters['make_int_range'] = JinjaFilters.make_int_range
JINJA_ENVIRONMENT.filters['divisibleby'] = JinjaFilters.divisibleby


#####################################################
#   RUN APP - RUNS THE APPLICATION AND SETS WEBPAGE
####################################################


def runApp(self, app_name, method):
    try:
        tv = templateMethods.set_initial_template_values(
            self, app_name, method)
        tv['method'] = method
    except Exception as e:
        # This will trigger a hard 500 error
        # We can't set error and load the default page
        raise
    return tv


class defaultApplication(webapp2.RequestHandler):
    '''
    defaultApplication, defines:
        - get and post responses
        - error handling
        - logging
    tv: template_variables
    '''
    ee.Initialize(config.EE_CREDENTIALS)
    ee.data.setDeadline(180000)

    def get(self):
        if not self.request.arguments():
            # Initial page load
            tv = runApp(self, self.app_name, 'GET')
            tv['method'] = 'GET'
        else:
            """Loading the main page or a sharelink will trigger a GET"""
            try:
                tv = runApp(self, self.app_name, 'shareLink')
                tv['method'] = 'shareLink'
            except Exception as e:
                tv = runApp(self, self.app_name, 'GET')
                tv['error'] = str(e)
                tv['method'] = 'shareLink'

        self.tv_logging(tv, 'GET')
        template = JINJA_ENVIRONMENT.get_template(self.appHTML)

        self.response.out.write(template.render(tv))

    def post(self):
        """Calling Get Map or Get TimeSeries will trigger a POST"""
        tv = runApp(self, self.app_name, 'POST')
        if 'method' not in tv.keys():
            tv['method'] = 'POST'
        self.tv_logging(tv, 'POST')
        self.generateResponse(tv)

    def generateResponse(self, tv):
        """Extract the template values associated with each response variable
        If an error was set in the template_values, generate an error response
        """
        dataobj = {}
        if ('error' in tv.keys() and tv['error']):
            dataobj['error'] = tv['error']
            if 'method' in tv.keys():
                dataobj['method'] = tv['method']
        else:
            for var in statics.response_vars[tv['tool_action']]:
                try:
                    dataobj[var] = tv[var]
                except KeyError:
                    dataobj[var] = []
        self.response.out.write(json.dumps(dataobj))

    def handle_exception(self, exception, debug):
        """This catches unhandled Python exceptions in GET requests
        """
        logging.exception(exception)
        app_name = self.app_name
        tv = runApp(self, app_name, 'GET')
        tv['error'] = str(exception)
        tv['method'] = 'POST'
        self.generateResponse(tv)

    def tv_logging(self, tv, method='GET'):
        """Log important template values
        These values are will be written to the appEngine logger
          so that we can tracks what page requests are being made
        """
        tv['method'] = method

        # Skip form values and maxDates
        log_values = {
            k: v for k, v in tv.items()
            if not k.startswith('form') and
            not k.startswith('json_data')
        }
        # Log all values at once
        logging.info('{}'.format(log_values))


class OpenET(defaultApplication):
    app_name = 'Open-ET-1'
    appHTML = 'open-et-1.html'


class databaseTasks(webapp2.RequestHandler):
    def get(self):
        ee.Initialize(config.EE_CREDENTIALS)
        ee.data.setDeadline(180000)
        tv = templateMethods.set_initial_template_values(
            self, 'databaseTask', 'GET')
        tv['json_data'] = {}
        # FIX ME: only do 2003 for testing
        # geo_files = filter(os.path.isfile, glob.glob(geo_dir + '*.geojson'))
        # for geoFName in geo_files:
        for region in ['Mason']:
            for year in ['2003']:
                logging.info('PROCESSING Region/Year ' + region + '/' + year)
                for ds in ['MODIS']:
                    for et_model in ['SSEBop']:
                        DU = databaseMethods.Datatstore_Util(
                            region, year, ds, et_model)
                        name_l = [region, year, ds, et_model]
                        tv_name = ('_').join(name_l)
                        logging.info('PROCESSING ' + tv_name)
                        json_data = DU.get_et_json_data()
                        tv['json_data'][tv_name] = json_data
                        DU.add_to_db(json_data)
                logging.info(region + '/' + year + ' PROCESSED!')
        template = JINJA_ENVIRONMENT.get_template('databaseTasks.html')
        self.response.out.write(template.render(tv))


app = webapp2.WSGIApplication([
    ('/', OpenET),
    ('/databaseTasks', databaseTasks)
],
    debug=True
)
