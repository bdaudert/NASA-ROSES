#!/usr/bin/env python
import logging

from google.appengine.ext import ndb

import eeMethods


class DATA(ndb.Model):
    data = ndb.JsonProperty(compressed=True)
    date_added = ndb.DateTimeProperty(auto_now_add=True)

class METADATA(ndb.Model):
    times_requested = ndb.IntegerProperty('r')
    # years = ndb.StringProperty('n')  # comma separated list of years

class Datatstore_Util(object):
    '''
    Stores and reads data from
    google DATASTORE
    Method:
        - The base query is defined from relevant template values
    '''
    def __init__(self, dataset, et_model, t_res, geojson, year):
        self.dataset = dataset
        self.et_model = et_model
        self.t_res = t_res  # temporal resolution
        self.geojson = geojson
        self.year = year

    def write_et_json(self, out_file):
        '''
        Stores geojson info and et data a json object and
        writes data to out_file
        :param out_fil
        :return
        '''
        ET_helper = eeMethods.ET_Util(
            self.geojson, self.dataset, self.et_model, self.year)
        ee_stats = ET_helper.get_et_stats()

    def add_to_db(self):
    	pass