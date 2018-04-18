#!/usr/bin/env python
import os, sys, socket
import logging
import json
import hashlib

# Needed to read data from datastore within app engine
from google.appengine.ext import ndb

from config import statics
from config import EE_PRIVATE_KEY_FILE

class DATA(ndb.Model):
    feat_idx = ndb.IntegerProperty()
    region = ndb.StringProperty()
    year = ndb.IntegerProperty()
    dataset = ndb.StringProperty()
    et_model = ndb.StringProperty()


class METADATA(ndb.Model):
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
        # FIX ME: not tested
        unique_str = ('-').join([self.region, self.dataset, self.et_model, str(self.year), str(feat_idx)])
        UNIQUE_ID = hashlib.md5(unique_str).hexdigest()
        query_data = ndb.Key('METADATA', UNIQUE_ID).get()
        if not query_data:
            return []
        logging.info('READING FROM DB: ' + UNIQUE_ID)
        metadata = json.dumps(query_data.to_dict())
        return metadata

    def read_feat_data_from_db(self, feat_idx):
        '''
        Reads one feature's data from db
        :param feat_idx: feature index (db property)
        :return: dict of data for the feature
        '''
        # FIX ME: not tested
        unique_str = ('-').join([self.region, self.dataset, self.et_model, str(self.year), str(feat_idx)])
        UNIQUE_ID = hashlib.md5(unique_str).hexdigest()
        query_data = ndb.Key('DATA', UNIQUE_ID).get()
        if not query_data:
            return []
        logging.info('READING FROM DB: ' + UNIQUE_ID)
        etdata = json.dumps(query_data.to_dict())
        return etdata

    def read_meta_from_db(self):
        '''
        Reads metadata for all features defined by
        region, dataset, et_model and year
        region, dataset, et_model and year
        :return: dict of metadata for the features
        '''
        metadata = []
        try:
            qry = ndb.Query(kind='METADATA').filter(METADATA.year == self.year,
                METADATA.region == self.region,
                METADATA.dataset == self.dataset,
                METADATA.et_model == self.et_model
            )
            query_data = qry.fetch()
        except:
            query_data = []

        if len(query_data) > 0:
            metadata = json.dumps([q.to_dict() for q in query_data])
            logging.info('SUCCESSFULLY READ METADATA FROM DB')
        else:
            logging.info('NO METADATA FOUND IN DB')
        return metadata

    def read_data_from_db(self):
        '''
        Reads data for all feaqtures defined by
        :return:  dict of data for the features
        '''
        data = []
        try:
            qry = ndb.Query(kind='DATA').filter(
                DATA.year==self.year,
                DATA.region==self.region,
                DATA.dataset==self.dataset,
                DATA.et_model==self.et_model
            )
            query_data = qry.fetch()
        except:
            query_data = []

        if len(query_data) > 0:
            data = json.dumps([q.to_dict() for q in query_data])
            logging.info('SUCCESSFULLY READ DATA FROM DB')
        else:
            logging.info('NO DATA FOUND IN DB')
        return data

    def read_from_db(self):
        '''
        Read metadata and data from db
        :return: metadata, data
        '''
        metadata = self.read_meta_from_db()
        data = self.read_data_from_db()
        return metadata, data



