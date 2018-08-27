#!/usr/bin/env python
import os, sys, socket
import logging
import json
import hashlib
import urllib2

# Needed to read data from datastore within app engine
from google.appengine.ext import ndb

import config

<<<<<<< HEAD
'''
class DATA(ndb.Model):
=======
class DATA(ndb.Expando):
>>>>>>> central
    feat_idx = ndb.IntegerProperty()
    region = ndb.StringProperty()
    year = ndb.IntegerProperty()
    dataset = ndb.StringProperty()
    et_model = ndb.StringProperty()
<<<<<<< HEAD
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
=======

class cloudSSQL_Util(object):
    '''
    reads data from google cloudSQL
    Method:
        - The base query is defined from relevant template values
    Args:
        :region Unique ID of geojson obbject, e.g. USFields
        :year year of geojson dataset, might be ALL if not USFields
            USField geojsons change every year
        :dataset MODSI, Landsat or gridMET
        :et_model Evapotranspiration modfel, e.g. SIMS, SSEBop, METRIC
    '''
    def __init__(self):
        pass



class Datastore_Util(object):
>>>>>>> central
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
<<<<<<< HEAD
        self.geo_bucket_url = GEO_BUCKET_URL
        # Used to read geometry data from buckets
        self.geoFName = region + '_' + year + '_GEOM'  '.geojson'
        # Only used to populate local DATASTORE @8000
        self.local_dataFName = 'static/geojson/' +  region + '_' + year + '_DATA'  '.geojson'

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
        return geomdata

    def read_feat_data_from_db(self, feat_idx):
        '''
        Reads one feature's data from db
=======
        self.geo_bucket_url = config.GEO_BUCKET_URL
        self.data_bucket_url = config.DATA_BUCKET_URL
        # Used to read geometry data from buckets
        if self.region in ['Mason', 'US_fields']:
            # Field boundaries depend on years
            self.geoFName = region + '_' + year + '_GEOM.geojson'
        else:
            self.geoFName = region + '_GEOM.geojson'
        # Only used to populate local DATASTORE @8000
        self.local_dataFName = config.LOCAL_DATA_DIR + self.et_model + '/' +  region + '_' + year + '_DATA'  '.json'
        self.bucket_dataFName = region + '_' + year + '_DATA'  '.json'


    def read_geometries_from_bucket(self):
        '''
        Curtrently all geometry data are stored in cloud buckets
        :return:
        '''
        url = self.geo_bucket_url + self.geoFName
        try:
            d = json.load(urllib2.urlopen(url))
        except Exception as e:
            logging.error(e)
            raise Exception(e)
        # geomdata = json.dumps(d, ensure_ascii=False).encode('utf8')
        geomdata = d
        return geomdata

    def read_feat_data_from_bucket(self, feat_index_list):
        '''
        Reads multiple feature data from roses-data bucket
        :param feat_index_list:
        :return:
        '''
        url = self.data_bucket_url + self.et_model + '/' + self.bucket_dataFName
        feature_data = {
            'type': 'FeatureCollection',
            'features': []
        }
        try:
            all_data = json.load(urllib2.urlopen(url))
        except Exception as e:
            logging.error(e)
            raise Exception(e)

        for feat_idx in feat_index_list:
            try:
                feature_data['features'].append(all_data['features'][int(feat_idx)])
            except:
                continue
        del all_data

        if not feature_data['features']:
            logging.error('NO FEATURE DATA IN BUCKET FILE')
        else:
            logging.info('SUCCESSFULLY READ FEATURE DATA FROM BUCKET')
        return feature_data

    def read_feat_data_from_db(self, feat_index_list):
        '''
        Reads multiple feature's data from db using unique indices
>>>>>>> central
        :param feat_idx: feature index (db property)
        :return: dict of data for the feature
        '''
        # FIX ME: not tested
<<<<<<< HEAD
        unique_str = ('-').join([self.region, self.dataset, self.et_model, str(self.year), str(feat_idx)])
        UNIQUE_ID = hashlib.md5(unique_str).hexdigest()
        query_data = ndb.Key('DATA', UNIQUE_ID).get()
        if not query_data:
            return []
        logging.info('READING FROM DB: ' + UNIQUE_ID)
        etdata = json.dumps(query_data.to_dict())
        return etdata

=======
        feature_data = {
            'type': 'FeatureCollection',
            'features': []
        }
        for feat_idx in feat_index_list:
            unique_str = ('-').join([self.region, self.dataset, self.et_model, str(self.year), str(feat_idx)])
            UNIQUE_ID = hashlib.md5(unique_str).hexdigest()
            query_data = ndb.Key('DATA', UNIQUE_ID).get()
            if not query_data:
                continue
            featdata = {'properties': query_data.to_dict()}
            feature_data['features'].append(featdata)

        if not feature_data['features']:
            logging.error('NO FEATURE DATA IN DATABASE')
        else:
            logging.info('SUCCESSFULLY READ FEATURE DATA FROM DATABASE')
        return feature_data

    def read_feat_data_from_local(self, feat_index_list):
        '''
        Reads multiple feature data from local file system
        :param feat_index_list:
        :return:
        '''
        file_name = self.local_dataFName
        feature_data = {
            'type': 'FeatureCollection',
            'features': []
        }
        with open(file_name) as f:
            all_data = json.load(f)

        for feat_idx in feat_index_list:
            try:
                feature_data['features'].append(all_data['features'][int(feat_idx)])
            except:
                continue

        del all_data

        if not feature_data['features']:
            logging.error('NO FEATURE DATA IN LOCAL FILE')
        else:
            logging.info('SUCCESSFULLY READ FEATURE DATA FROM LOCAL FILE')
        return feature_data

    def read_data_from_bucket(self):
        '''
        Reads all feature data from rose-data bucket
        :param feat_index_list:
        :return:
        '''
        url = self.data_bucket_url + self.et_model + '/' + self.bucket_dataFName
        feature_data = {
            'type': 'FeatureCollection',
            'features': []
        }
        try:
            all_data = json.load(urllib2.urlopen(url))
        except Exception as e:
            logging.error(e)
            raise Exception(e)

        if not all_data['features']:
            logging.error('NO DATA IN BUCKET FILE')
        else:
            logging.info('SUCCESSFULLY READ DATA FROM BUCKET')
        return all_data
>>>>>>> central

    def read_data_from_db(self):
        '''
        Reads all features for region, year, dataset, et_model
        :return:  dict of data for the features
        '''

<<<<<<< HEAD
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
                data = json.dumps([q.to_dict() for q in query_data])
                logging.info('SUCCESSFULLY READ DATA FROM DB')
            else:
                logging.info('NO DATA FOUND IN DB')
                logging.info('READING DATA FROM LOCAL FILE')
                file_name = GEO_DIR + self.region + '_' + str(self.year) + '_DATA.geojson'
                logging.info(file_name)
                with open(file_name) as f:
                    data = json.dumps(json.load(f), ensure_ascii=False).encode('utf8')
        else:
            # Local development server
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
=======
        all_data = {
            'type': 'FeatureCollection',
            'features': []
        }
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
            all_data['features'] = [{'properties': q.to_dict()} for q in query_data]
            logging.info('SUCCESSFULLY READ DATA FROM DB')
        else:
            logging.error('NO DATA FOUND IN DB')
        return all_data

    def read_data_from_local(self):
        # Local development server
        file_name = self.local_dataFName
        logging.info('READING LOCAL FILE ')
        logging.info(file_name)
        with open(file_name) as f:
            all_data = json.load(f)
            # data = json.dumps(json.load(f), ensure_ascii=False).encode('utf8')
        if 'features' in all_data.keys() and all_data['features']:
            logging.info('SUCCESSFULLY READ DATA FROM LOCAL FILE')
        else:
            logging.error('NO DATA IN LOCAL FILE')
        return all_data

    def add_to_db(self):
        '''
        NOTE:
            This only stores data to the LOCAL DATASTORE @8000/instances
            It does not work on project appspot/databaseTasks
            Only used in main.py databaseTasks
        To deploy data to project DATASTORE,
        we need to run ET_stats_cron.py in nasa-roses-db env
        :return:
        '''
        # etdata = self.read_data_from_local()
        etdata = self.read_data_from_bucket()
        db_entities = []
        for idx in range(len(etdata['features'])):
            feat = etdata['features'][idx]
            unique_str = ('-').join([self.region, self.dataset, self.et_model, str(self.year), str(idx)])
            UNIQUE_ID = hashlib.md5(unique_str).hexdigest()
            db_entity = DATA(
                feat_idx = idx,
>>>>>>> central
                region = self.region,
                year = self.year,
                dataset = self.dataset,
                et_model = self.et_model
            )
            db_entity.populate(**feat)
            db_entity.key = ndb.Key('DATA', UNIQUE_ID)
            db_entities.append(db_entity)
        db_keys = ndb.put_multi(db_entities)









