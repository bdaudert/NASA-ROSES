#!/usr/bin/env python
"""MAIN script for OpenET connecting to Earth Engine using App Engine."""



# Works in the local development environment and when deployed.
# If successful, shows a single web page with the SRTM DEM
# displayed in a Google Map.  See accompanying README file for
# instructions on how to set up authentication.

import config

import datetime
import httplib2
import json
import logging
import os
import time
from copy import deepcopy as deepcopy

import ee
from google.appengine.api import urlfetch
from google.appengine.ext import ndb
import jinja2
import webapp2

import JinjaFilters
import templateMethods

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


def runApp(self, appName, defaultOrNot, method):
    try:
        tv = templateMethods.set_initial_template_values(
            self, appName, method)
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
    tv : template_variables
    '''
    ee.Initialize(config.EE_CREDENTIALS)
    ee.data.setDeadline(180000)

    def get(self):
        if not self.request.arguments():
            # Initial page load
            tv = runApp(self, self.appName, 'GET')
            tv['method'] = 'GET'
        else:
            """Loading the main page or a sharelink will trigger a GET"""
            try:
                tv = runApp(self, self.appName, 'shareLink')
                tv['method'] = 'shareLink'
            except Exception as e:
                tv = runApp(self, self.appName, 'GET')
                tv['error'] = str(e)
                tv['method'] = 'shareLink'

        self.tv_logging(tv, 'GET')
        template = JINJA_ENVIRONMENT.get_template(self.appHTML)
        self.response.out.write(template.render(tv))

    def post(self):
        """Calling Get Map or Get TimeSeries will trigger a POST"""
        tv = runApp(self, self.appName, 'notDefault', 'POST')
        if 'method' not in tv.keys():
            tv['method'] = 'POST'
        self.tv_logging(tv, 'POST')
        self.generateResponse(tv)

    def generateResponse(self, tv):
        """Extract the template values associated with each response variable

        If an error was set in the template_values, generate an error response
        """
        dataobj = {}
        if ('error' in tv.keys() and
                tv['error']):
            dataobj['error'] = tv['error']
            if 'method' in tv.keys():
                dataobj['method'] = tv['method']
        else:
            for tVar in dataStore.responseVars[tv['toolAction']]:
                try:
                    dataobj[tVar] = tv[tVar]
                except KeyError:
                    # template variable does not exist,
                    # e.g. timeSeriesTextData2 when only 1 variable,
                    dataobj[tVar] = []
        self.response.out.write(json.dumps(dataobj))

    def handle_exception(self, exception, debug):
        """This catches unhandled Python exceptions in GET requests
        """
        logging.exception(exception)
        appName = self.appName
        tv = runApp(self, appName, 'default', 'GET')
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
            k: v for k, v in tv.items() if not k.startswith('form')
        }
        # Log all values at once
        logging.info('{}'.format(log_values))


class MainPage(webapp2.RequestHandler):
    def get(self):
        """Request an image from Earth Engine and render it to a web page."""
        ee.Initialize(config.EE_CREDENTIALS)
        mapid = ee.Image('srtm90_v4').getMapId({'min': 0, 'max': 1000})
        tv = runApp(self, 'Open-ET-1', 'default', 'pageLoad')
        tv['GMAP_API_KEY'] = config.GMAP_API_KEY
        template = JINJA_ENVIRONMENT.get_template('open-et-1.html')
        self.response.out.write(template.render(tv))

class OpenET(defaultApplication):
    appName = 'Open-ET-1'
    appHTML = 'open-et-1.html'

app = webapp2.WSGIApplication([
        ('/', MainPage)
    ],
    debug=True
)
