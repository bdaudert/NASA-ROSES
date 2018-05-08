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

'''
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
'''
class DATA(ndb.Expando):
    feat_idx = ndb.IntegerProperty()
    region = ndb.StringProperty()
    year = ndb.IntegerProperty()
    dataset = ndb.StringProperty()
    et_model = ndb.StringProperty()

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
        # Used to read geometry data from buckets
        if self.year is not None:
            # Field boundaries depend on years
            self.geoFName = region + '_' + year + '_GEOM'  '.geojson'
            # Only used to populate local DATASTORE @8000
            self.local_dataFName = 'static/json/' +  region + '_' + year + '_DATA'  '.json'
        else:
            self.geoFName = region + '_GEOM'  '.geojson'
            # Only used to populate local DATASTORE @8000
            self.local_dataFName = 'static/json/' + region + '_DATA'  '.json'
    def read_etdata_from_local(self):
        '''
        Used to read the etdata from local storage
        :return:
        '''
        with open(self.local_dataFName) as f:
            return json.load(f)

    def read_geometries_from_bucket(self):
        '''
        Curtrently all geometry data are stored in cloud buckets
        :return:
        '''
        f = self.geo_bucket_url + self.geoFName
        d = json.load(urllib2.urlopen(f))
        '''
        geomdata = {
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Polygon',
                        'coordinates': d[idx]['coordinates']
                    },
                    'properties': {'idx': idx}
                } for idx in range(len(d))]
        }
        geomdata = json.dumps(geomdata, ensure_ascii=False).encode('utf8')
        '''
        geomdata = json.dumps(d, ensure_ascii=False).encode('utf8')
        return geomdata

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
        Reads all features for region, year, dataset, et_model
        :return:  dict of data for the features
        '''

        data = []
        if os.getenv('SERVER_SOFTWARE', '').startswith('Google App Engine/'):
            # Production
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
                data = {
                    'type': 'FeatureCollection'
                }
                data['features'] = json.dumps([q.to_dict() for q in query_data])
                # data = json.dumps([q.to_dict() for q in query_data])
                logging.info('SUCCESSFULLY READ DATA FROM DB')
            else:
                logging.info('NO DATA FOUND IN DB')
                logging.info('READING DATA FROM LOCAL FILE')
                file_name = self.local_dataFName
                logging.info(file_name)
                with open(file_name) as f:
                    data = json.dumps(json.load(f), ensure_ascii=False).encode('utf8')
        else:
            # Local development server
            logging.info('READING DATA FROM LOCAL FILE')
            file_name = self.local_dataFName
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


    def add_to_db(self):
        '''
        Used to store data LOCAL DATASTORE
        to mirror project DATASTORE
        Only used in main.py databaseTasks
        :return:
        '''
        etdata = self.read_etdata_from_local()
        db_entities = []
        for idx in range(len(etdata)):
            feat = etdata[idx]
            unique_str = ('-').join([self.region, self.dataset, self.et_model, str(self.year), str(idx)])
            UNIQUE_ID = hashlib.md5(unique_str).hexdigest()
            db_entity = DATA(
                feat_idx=idx,
                region = self.region,
                year = self.year,
                dataset = self.dataset,
                et_model = self.et_model
            )
            db_entity.populate(**feat)
            db_entity.key = ndb.Key('DATA', UNIQUE_ID)
            db_entities.append(db_entity)
        db_keys = ndb.put_multi(db_entities)









