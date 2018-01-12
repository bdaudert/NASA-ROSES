#!/usr/bin/env python
"""A simple example of connecting to Earth Engine using App Engine."""



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

# SET STATICS
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

class MainPage(webapp2.RequestHandler):

  def get(self):                             # pylint: disable=g-bad-name
    """Request an image from Earth Engine and render it to a web page."""
    ee.Initialize(config.EE_CREDENTIALS)
    mapid = ee.Image('srtm90_v4').getMapId({'min': 0, 'max': 1000})

    # These could be put directly into template.render, but it
    # helps make the script more readable to pull them out here, especially
    # if this is expanded to include more variables.
    template_values = {
        'mapid': mapid['mapid'],
        'token': mapid['token'],
        'GMAP_API_KEY': config.GMAP_API_KEY
    }
    template = JINJA_ENVIRONMENT.get_template('open-et-1.html')
    self.response.out.write(template.render(template_values))

app = webapp2.WSGIApplication([
        ('/', MainPage)
    ],
    debug=True
)
