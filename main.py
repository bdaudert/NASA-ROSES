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


import ee
import jinja2
import flask


from mypython import templateMethods
from mypython import databaseMethods
from mypython import JinjaFilters





# SET STATICS
httplib2.Http(timeout=180000)

'''
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
'''

app = flask.Flask(__name__)
# Set the template filters
from inspect import getmembers, isfunction
template_filters = {name: function
                for name, function in getmembers(JinjaFilters)
                if isfunction(function)}
app.jinja_env.filters.update(template_filters)

#####################################################
#   RUN APP - RUNS THE APPLICATION AND SETS WEBPAGE
####################################################


def runApp(req_args, app_name, method):
    try:
        tv = templateMethods.set_template_values(req_args, app_name, method)
    except Exception as e:
        # This will trigger a hard 500 error
        # We can't set error and load the default page
        raise
    return tv

@app.route('/', methods=['GET', 'POST'])
def home():
    '''
    defaultApplication, defines:
        - get and post responses
        - error handling
        - logging
    tv: template_variables
    '''
    ee.Initialize(config.EE_CREDENTIALS)
    ee.data.setDeadline(180000)
    app_name = 'main'
    method = flask.request.method
    if method == 'POST':
        req_args = flask.request.form
    if method == 'GET':
        req_args = flask.request.args
        if req_args:
            method =  'shareLink'

    try:
        tv = runApp(req_args, app_name, method)
    except Exception as e:
        tv = runApp(req_args, app_name, 'GET')
        tv['error'] = str(e)

    if method in ['GET', 'shareLink']:
        return flask.render_template('nasa-roses.html', **tv)
    else:
        # Ajax requests
        response = {}
        # Only pick the relevant template variables
        if ('error' in tv.keys() and tv['error']):
            response['error'] = tv['error']
        else:
            for var in config.statics['response_vars'][tv['variables']['tool_action']]:
                try:
                    response[var] = tv[var]
                except KeyError:
                    response[var] = []
        return json.dumps(response, ensure_ascii=False)

        #return json.dumps(tv, ensure_ascii=False)

    def handle_exception(exception, debug):
        """This catches unhandled Python exceptions in GET requests
        """
        logging.exception(exception)
        tv = runApp(None, app_name, 'GET')
        tv['error'] = str(exception)
        # override method
        tv['method'] = 'POST'
        return flask.render_template('nasa-roses.html', **tv)

    def tv_logging(tv, method):
        """Log important template values
        These values are will be written to the appEngine logger
          so that we can tracks what page requests are being made
        """
        # Skip form values and maxDates
        log_values = {
            k: v for k, v in tv.items()
            if not k.startswith('form') and
            not k.startswith('etdata') and
            not k.startswith('metadata') and
            not k.startswith('geomdata') and
            not k.startswith('featsgeomdata') and
            not k.startswith('featsdata')
        }
        # Log all values at once
        logging.info('{}'.format(log_values))


'''
# FIX ME: we need to replace the users module withsomething that
# is supported with Python 3.7
from google.appengine.api import users
class AdminPage(webapp2.RequestHandler):
    def get(self):
        user = users.get_current_user()
        if user:
            if users.is_current_user_admin():
                self.response.write('You are an administrator.')
            else:
                self.response.write('You are not an administrator.')
        else:
            self.response.write('You are not logged in.')

class LogInPage(webapp2.RequestHandler):
    def get(self):
        # [START user_details]
        user = users.get_current_user()
        if user:
            nickname = user.nickname()
            logout_url = users.create_logout_url('/')
            greeting = 'Welcome, {}! (<a href="{}">sign out</a>)'.format(
                nickname, logout_url)
        else:
            login_url = users.create_login_url('/')
            greeting = '<a href="{}">Sign in</a>'.format(login_url)
        # [END user_details]
        self.response.write(
            '<html><body>{}</body></html>'.format(greeting))
'''
@app.route('/databaseTasks', methods=['GET'])
def databaseTasks():
    app_name = 'databaseTask'
    ee.Initialize(config.EE_CREDENTIALS)
    ee.data.setDeadline(180000)
    req_args = flask.request.args
    tv = templateMethods.set_template_values(
        req_args, 'databaseTask', 'GET')
    tv['json_data'] = {}
    for region in ['US_states_west_500k', 'Mason', 'US_counties_west_500k']:
        for year in ['2003']:
            logging.info('PROCESSING Region/Year ' + region + '/' + year)
            for ds in ['MODIS']:
                for et_model in ['SSEBop']:
                    DU = databaseMethods.Datatstore_Util(region, year, ds, et_model)
                    DU.add_to_db()
            logging.info(region + '/' + year + ' PROCESSED!')
    return flask.render_template('databaseTasks.html', **tv)


if __name__ == '__main__':
    # This is used when running locally. Gunicorn is used to run the
    # application on Google App Engine. See entrypoint in app.yaml.
    app.run(host='127.0.0.1', port=8080, debug=True, use_reloader=False)