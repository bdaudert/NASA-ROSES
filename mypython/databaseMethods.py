#!/usr/bin/env python
import logging
import json
import hashlib

# Needed to read data from datastore within app engine
from google.appengine.ext import ndb

from config import statics

import socket
print(socket.gethostname())
if str(socket.gethostname()).startswith('localhost'):
    from google.appengine.ext.remote_api import remote_api_stub
    '''
    try:
        import dev_appserver
        dev_appserver.fix_sys_path()
    except ImportError:
        print('Please make sure the App Engine SDK is in your PYTHONPATH.')
        raise
    '''

    remote_api_stub.ConfigureRemoteApiForOAuth(
        '{}.appspot.com'.format('open-et-1'),
        '/_ah/remote_api')



'''
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
'''



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
        metadata = []
        '''
        qry = METADATA.query(METADATA.region == self.region,
                         METADATA.year == int(self.year),
                         METADATA.dataset == self.dataset,
                         METADATA.et_model == self.et_model)
        '''

        '''
        qry = ndb.Query(kind = 'METADATA',
                        filters=ndb.AND(
                            # METADATA.region == self.region,
                            METADATA.year == int(self.year)
                            # METADATA.dataset == self.dataset,
                            # METADATA.et_model == self.et_model
                        ))
        '''

        try:
            qry = ndb.Query(kind = 'METADATA')
            query_data = qry.fetch(10)
        except:
            query_data = []

        if len(query_data) > 0:
            metadata = json.loads(query_data)
            logging.info('SUCCESSFULLY READ METADATA FROM DB')
        else:
            logging.info('NO METADATA FOUND IN DB')
            return metadata

        return metadata

    def read_data_from_db(self):
        '''
        Reads data for all feaqtures defined by

        :return:
        '''
        data = []
        '''
        qry = DATA.query(DATA.region == self.region,
                         DATA.year == int(self.year),
                         DATA.dataset == self.dataset,
                         DATA.et_model == self.et_model)
        '''

        '''
        qry = ndb.Query(kind = 'DATA',
                        filters = ndb.AND(
                            # DATA.region == self.region,
                            DATA.year == int(self.year)
                            # DATA.dataset == self.dataset,
                            # DATA.et_model == self.et_model
                        ))
        '''
        try:
            qry = ndb.Query(kind = 'DATA')
            query_data = qry.fetch(10)
        except:
            query_data = []

        if len(query_data) > 0:
            data = json.loads(query_data)
            logging.info('SUCCESSFULLY READ DATA FROM DB')
        else:
            logging.info('NO DATA FOUND IN DB')
            return data
        return data
