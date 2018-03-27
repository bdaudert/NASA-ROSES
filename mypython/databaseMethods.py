#!/usr/bin/env python
import logging
import json
import hashlib

# Needed to read data from datastore within app engine
from google.appengine.ext import ndb

from config import statics


class DATA(ndb.Model):
    feat_idx = ndb.IntegerProperty()
    region = ndb.StringProperty()
    year = ndb.IntegerProperty()
    dataset = ndb.StringProperty()
    et_model = ndb.StringProperty()


class METADATA(ndb.Model):
    # times_requested = ndb.IntegerProperty('r')
    feat_idx = ndb.IntegerProperty()
    region = ndb.StringProperty()
    year = ndb.IntegerProperty()
    dataset = ndb.StringProperty()
    et_model = ndb.StringProperty()


class Datatstore_Util(object):
    '''
    Stores and reads data from
    google DATASTORE
    Method:
        - The base query is defined from relevant template values
    Args:
        :region Unique ID of geojson obbject, e.g. USFields
        :year year of geojson dataset, might be ALL if not USFields
            USField geojsons change every year
        :dataset MODSI, Landsat or gridMET
        :et_model Evapotranspiration modfel, e.g. SIMS, SSEBop, METRIC
    '''
    def __init__(self, region, year, dataset, et_model):
        self.region = region
        self.year = year
        self.dataset = dataset
        self.et_model = et_model


    def read_feat_meta_from_db(self, feat_idx):
        '''
        Reads one feature's metadata from db
        :param feat_idx: feature index (db property)
        :return: dict of metadata for the feature
        '''
        unique_str = ('-').join([self.region, self.dataset, self.et_model, self.year, str(feat_idx)])
        UNIQUE_ID = hashlib.md5(unique_str).hexdigest()
        data_obj = ndb.Key('METADATA', UNIQUE_ID).get()
        if not data_obj:
            return {}
        logging.info('READING FROM DB: ' + UNIQUE_ID)
        metadata = json.loads(data_obj)
        return metadata

    def read_feat_data_from_db(self, feat_idx):
        '''
        Reads one feature's data from db
        :param feat_idx: feature index (db property)
        :return: dict of data for the feature
        '''
        unique_str = ('-').join([self.region, self.dataset, self.et_model, self.year, str(feat_idx)])
        UNIQUE_ID = hashlib.md5(unique_str).hexdigest()
        data_obj = ndb.Key('DATA', UNIQUE_ID).get()
        if not data_obj:
            return {}
        logging.info('READING FROM DB: ' + UNIQUE_ID)
        et_data = json.loads(data_obj)
        return et_data

    def read_meta_from_db(self):
        '''
        Reads metadata for all features defined by
        region, dataset, et_model and year
        region, dataset, et_model and year
        :return: dict of data for the features
        '''
        json_data = {}
        qry = METADATA.query(METADATA.region == self.region,
                         METADATA.year == int(self.year),
                         METADATA.dataset == self.dataset,
                         METADATA.et_model == self.et_model)

        # Spits out a list of query results
        query_data = qry.fetch()
        print query_data
        if len(query_data) > 0:
            meta_data = json.loads(query_data)
        else:
            logging.info('NO DATA FOUND IN DB')
            return {}
        logging.info('READ DATA FROM DB')
        return meta_data

    def read_data_from_db(self):
        '''
        Reads data for all feaqtures defined by

        :return:
        '''
        json_data = {}
        qry = DATA.query(DATA.region == self.region,
                         DATA.year == int(self.year),
                         DATA.dataset == self.dataset,
                         DATA.et_model == self.et_model)

        # Spits out a list of query results
        query_data = qry.fetch()
        if len(query_data) > 0:
            json_data = json.loads(query_data)
        else:
            logging.info('NO DATA FOUND IN DB')
            return {}
        logging.info('READ DATA FROM DB')
        return json_data
