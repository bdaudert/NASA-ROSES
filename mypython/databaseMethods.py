#!/usr/bin/env python
import os, sys, socket
import logging
import json
import hashlib
import urllib2

# Needed to read data from datastore within app engine
from google.appengine.ext import ndb

from config import statics
from config import EE_PRIVATE_KEY_FILE
from config import GEO_DIR
from config import GEO_BUCKET_URL

class DATA(ndb.Model):
    feat_idx = ndb.IntegerProperty()
    region = ndb.StringProperty()
    year = ndb.IntegerProperty()
    dataset = ndb.StringProperty()
    et_model = ndb.StringProperty()
    STATE = ndb.StringProperty()
    AREA = ndb.FloatProperty()
    OBJECTID = ndb.IntegerProperty(indexed=False)
    HUC8 = ndb.StringProperty()
    HUC8_NAME = ndb.StringProperty()
    PIXELCOUNT = ndb.IntegerProperty()


class Datatstore_Util(object):
    '''
    Stores and reads data from google DATASTORE
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
        self.year = int(year)
        self.dataset = dataset
        self.et_model = et_model
        self.geo_bucket_url = GEO_BUCKET_URL
        self.geoFName = region + '_' + year + '_GEOM'  '.geojson'

    def read_geometries_from_bucket(self):
        f = self.geo_bucket_url + self.geoFName
        d = json.load(urllib2.urlopen(f));
        geom_data = {
            "type": "FeatureCollection",
            'features': []
        }
        '''
        for idx in range(len(d)):
            unique_str = ('-').join([self.region, self.dataset, self.et_model, str(self.year), str(idx)])
            UNIQUE_ID = hashlib.md5(unique_str).hexdigest()
            feat_dict = {
                'type': 'Feature',
                'geometry': d[idx]['GEOM_COORDINATES'],
                'properties': {'idx': idx, 'UNIQUE_ID': UNIQUE_ID}
            }
            geom_data['features'].append(feat_dict)
        '''


        geom_data = {
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Polygon',
                        'coordinates': d[idx]['GEOM_COORDINATES']
                    },
                    'properties': {'idx': idx}
                } for idx in range(len(d))]
        }
        geom_data = json.dumps(geom_data, ensure_ascii=False).encode('utf8')
        return geom_data

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


    def read_data_from_db(self):
        '''
        Reads data for all feaqtures defined by
        :return:  dict of data for the features
        '''
        data = []
        '''
        qry = ndb.Query(kind='DATA').filter(
            DATA.year == self.year,
            DATA.region == self.region,
            DATA.dataset == self.dataset,
            DATA.et_model == self.et_model
        )
        '''
        qry = DATA.query(
            DATA.region == self.region,
            DATA.year == int(self.year),
            DATA.dataset == self.dataset,
            DATA.et_model == self.et_model
        )
        query_data = qry.fetch()
        if len(query_data) > 0:
            data = json.dumps([q.to_dict() for q in query_data])
            logging.info('SUCCESSFULLY READ DATA FROM DB')
        else:
            logging.info('NO DATA FOUND IN DB')
            logging.info('READING DATA FROM LOCAL FILE')
            file_name = GEO_DIR + self.region + '_' + str(self.year) + '_DATA.geojson'
            logging.info(file_name)
            with open(file_name) as f:
                data = json.dumps(json.load(f), ensure_ascii=False).encode('utf8')
        return data

    def read_from_db(self):
        '''
        Read data from db
        :return: data
        '''
        data = self.read_data_from_db()
        return data


    def add_data_to_db(self):
        '''

        :return:
        '''

    def add_to_db(self):
        '''

        :return:
        '''





