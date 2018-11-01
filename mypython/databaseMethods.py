#!/usr/bin/env python
import os, sys, socket
import logging
import json
import hashlib
import datetime as dt
import urllib.request as urllib2
from copy import deepcopy

# Needed to read data from datastore within app engine
# from google.appengine.ext import ndb
from google.cloud import datastore

# Needed to query Jordan's postgreSQL + postgis
import sqlalchemy as db
from sqlalchemy.orm import session as session_module
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import inspect
from sqlalchemy.orm import relationship
# from shapely.geometry import asShape
from shapely.geometry import mapping
# from shapely.geometry.multipolygon import MultiPolygon
from geoalchemy2.shape import from_shape, to_shape
from geoalchemy2.types import Geometry
import geojson


import config

# TEST SERVER MODELS
Base = declarative_base()
# schema='openet geodatabase'
schema = 'test'
# schema = 'public'
Base.metadata = db.MetaData(schema=schema)

#######################################
# OpenET database tables
#######################################
class Region(Base):
    # States, Counties, HUCs or fields or custom
    __tablename__ = 'region'
    __table_args__ = {'schema': schema}
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String())
    geometries = relationship('Geom', back_populates='region', cascade='save-update, merge, delete')

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


class Dataset(Base):
    __tablename__ = 'dataset'
    __table_args__ = {'schema': schema}
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String())
    ee_collection = db.Column(db.String())
    parameters = relationship('Parameter', back_populates='dataset', cascade='save-update, merge, delete')
    data = relationship('Data', back_populates='dataset', cascade='save-update, merge, delete')

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

class Variable(Base):
    __tablename__ = 'variable'
    __table_args__ = {'schema': schema}
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String())
    units = db.Column(db.String())
    data = relationship('Data', back_populates='variable', cascade='save-update, merge, delete')

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


GeomUserLink = db.Table('geom_user_link', Base.metadata,
    db.Column('user_id', db.Integer, db.ForeignKey('user.id', ondelete='cascade', onupdate='cascade')),
    db.Column('geom_id', db.Integer, db.ForeignKey('geom.id', ondelete='cascade', onupdate='cascade'))
)


class User(Base):
    __tablename__ = 'user'
    __table_args__ = {'schema': schema}
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String())
    email = db.Column(db.String())
    last_login = db.Column(db.DateTime())
    joined =  db.Column(db.DateTime())
    ip = db.Column(db.String())
    password = db.Column(db.String())
    notes = db.Column(db.String())
    active = db.Column(db.String())
    role = db.Column(db.String())
    geometries = relationship('Geom', secondary=GeomUserLink, back_populates='users', cascade='save-update, merge, delete')

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


class Geom(Base):
    __tablename__ = 'geom'
    __table_args__ = {'schema': schema}
    id = db.Column(db.Integer(), primary_key=True)
    # user_id = db.Column(db.Integer(), db.ForeignKey(schema + '.' + 'user.id'), nullable=False)
    year = db.Column(db.Integer())
    region_id = db.Column(db.Integer(), db.ForeignKey(schema + '.' + 'region.id'), nullable=False)
    feature_index = db.Column(db.Integer())
    name = db.Column(db.String())
    type = db.Column(db.String())
    area = db.Column(db.Float(precision=4))
    coords = db.Column(Geometry(geometry_type='MULTIPOLYGON'))
    region = relationship('Region', back_populates='geometries', cascade='save-update, merge, delete')
    meta_data = relationship('GeomMetadata', back_populates='geom', cascade='save-update, merge, delete')
    data = relationship('Data', back_populates='geom', cascade='save-update, merge, delete')
    users = relationship('User', secondary=GeomUserLink, back_populates='geometries', cascade='save-update, merge, delete')

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


class GeomMetadata(Base):
    __tablename__ = 'geom_metadata'
    __table_args__ = {'schema': schema}
    id = db.Column(db.Integer(), primary_key=True)
    geom_id = db.Column(db.Integer(), db.ForeignKey(schema + '.' + 'geom.id'), nullable=False)
    name = db.Column(db.String())
    properties = db.Column(db.String())
    geom = relationship('Geom', back_populates='meta_data', cascade='save-update, merge, delete')

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

class Parameter(Base):
    __tablename__ = 'parameter'
    __table_args__ = {'schema': schema}
    id = db.Column(db.Integer(), primary_key=True)
    dataset_id = db.Column(db.Integer(), db.ForeignKey(schema + '.'  + 'dataset.id'), nullable=False)
    name = db.Column(db.String())
    properties =  db.Column(db.String())
    dataset = relationship('Dataset', back_populates='parameters', cascade='save-update, merge, delete')

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


class Data(Base):
    __tablename__ = 'data'
    __table_args__ = {'schema': schema}
    id = db.Column(db.Integer(), primary_key=True)
    geom_id = db.Column(db.Integer(), db.ForeignKey(schema + '.' + 'geom.id'), nullable=False)
    geom_name = db.Column(db.String())
    geom_area = db.Column(db.Float(precision=4))
    year = db.Column(db.Integer())
    dataset_id =  db.Column(db.Integer(), db.ForeignKey(schema + '.' + 'dataset.id'), nullable=False)
    variable_id =  db.Column(db.Integer(), db.ForeignKey(schema + '.' + 'variable.id'), nullable=False)
    temporal_resolution = db.Column(db.String())
    data_date = db.Column(db.DateTime())
    data_value = db.Column(db.Float(precision=4))
    geom = relationship('Geom', back_populates='data', cascade='save-update, merge, delete')
    dataset = relationship('Dataset', back_populates='data', cascade='save-update, merge, delete')
    variable = relationship('Variable', back_populates='data', cascade='save-update, merge, delete')

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)
#######################################
# END OpenET database tables
#######################################
class date_Util(object):

    def get_month(self, temporal_resolution, data_var):
        '''
        :param temporal_resolution: temporal resolution
        :param data_var:  data variable found in data files: for monthly m01, m02, ect.
        :return:
        '''
        if temporal_resolution == 'annual':
            m = 12
        elif temporal_resolution == 'seasonal':
            m = 10
        elif temporal_resolution == 'monthly':
            try:
                m = int(data_var.split('m')[1])
            except:
                m = int(data_var)
        else:
            m = 12
        return m

    def set_datetime_dates_list(self, year, tv):
        dates_list = []
        data_vars = []
        temporal_resolution = tv['temporal_resolution']
        yr = int(year)
        if temporal_resolution == 'annual':
            data_vars = ['annual']
        if temporal_resolution == 'seasonal':
            data_vars = ['seasonal']
        if temporal_resolution == 'monthly':
            months = tv['time_period']
            if len(months) == 1 and months[0] == 'all':
                months = deepcopy(config.statics['all_months'])
                del months['all']
                months = sorted(months.keys())
            data_vars = ['m' + str(m) for m in months]

        for data_var in data_vars:
            m = self.get_month(temporal_resolution, data_var)
            d = int(config.statics['mon_len'][m - 1])
            dates_list.append(dt.datetime(yr, m, d))

        return dates_list


class cloudSSQL_Util(object):
    '''
    reads data from google cloudSQL
    Method:
        - The base query is defined from relevant template values
    Args:
        :region Unique ID of geojson obbject, e.g. USFields
        :year year of geojson dataset, might be ALL if not USFields
            USField geojsons change every year
        :dataset MODIS, Landsat, SSEBop etc
    '''
    def __init__(self):
        pass

class postgis_Util(object):
    '''
    Reads data from google Jordan's database "openet"
    Method:
        - The base query is defined from relevant template values
    Args:
        :region Unique ID of geojson obbject, e.g. USFields
        :year year of geojson dataset, might be ALL if not USFields
            USField geojsons change every year
        :dataset MODIS, Landsat, SSEBop etc
    '''
    def __init__(self, tv, db_engine):
        self.tv = tv
        self.db_engine = db_engine

    def start_session(self):
        # Set up the db session
        Session = session_module.sessionmaker()
        Session.configure(bind=self.db_engine)
        self.session = Session()

    def end_session(self):
        self.session.close()

    def object_as_dict(self, obj):
        '''
        Converts single db query object to dict
        :param obj:
        :return: query dict
        '''
        return {c.key: getattr(obj, c.key)
                for c in inspect(obj).mapper.column_attrs}

    def set_geom_json(self, q):
        '''
        :param q: query object
        :return: int: geom_id
                json: g_data quuery result converted to geojson feature
        '''
        g_data = {'type': 'Feature', 'properties': self.object_as_dict(q)}
        # Convert postgis geometry to geojson geometry
        postgis_geom = g_data['properties']['coords']
        del g_data['properties']['coords']
        geojson_geom = mapping(to_shape(postgis_geom))
        g_data['geometry'] = geojson_geom
        # QUIRK: mapping to_shape returns coordinates as tuples but geojson requires lists
        # Need to convert the geometry coord tuples to lists, json.loads does this
        g_data = json.loads(json.dumps(g_data))
        return g_data

    def set_data_json(self, q, geom_id_list, feat_idx_list):
        props = self.object_as_dict(q)
        geom_id = props['geom_id']
        idx = geom_id_list.index(geom_id)
        feat_idx = feat_idx_list[idx]
        data_val = props['data_value']
        t_res = props['temporal_resolution']
        # Convert datetime time stamp to datestring
        date = props['data_date'].strftime('%Y-%m-%d')
        data_value = props['data_value']
        var = None
        for key, val in config.statics['db_id_variable'].items():
            if val == props['variable_id']:
                var = key
                break
        if t_res in ['seasonal', 'annual']:
            data_name = var + '_' + t_res
        elif t_res == 'monthly':
            month = date[5:7]
            data_name = var + '_m' + month
        properties = {'feature_index': feat_idx, 'geom_id': geom_id, 'geom_name': props['geom_name'],
                      'geom_area': props['geom_area'], 'temporal_resolution': t_res, 'variable': var,
                      data_name: data_value}
        return feat_idx, properties

    def read_geomdata_from_db(self, year):
        '''
        sets up geometry for year as geojson
        :return: geojson
        '''
        geomdata = {
            'type': 'FeatureCollection',
            'features': []
        }
        # Set the geom_names from region and feature index
        region = self.tv['region']
        rgn_id = config.statics['db_id_region'][region]
        geom_query = self.session.query(Geom). \
            filter(
                Geom.region_id == rgn_id,
                Geom.year == year
            ). \
            filter(Geom.users.any(id=0))
        '''
        geom_query = self.session.query(Geom).filter(
            Geom.user_id == 0,
            Geom.region_id == rgn_id,
            Geom.year == year
        )
        '''

        feat_data = []
        for q in geom_query.all():
            g_data = self.set_geom_json(q)
            # Add the feature to etdata
            geomdata['features'].append(g_data)
        del g_data
        data = {str(year): geomdata}
        return json.dumps(data, ensure_ascii=False)

    def make_geom_query(self, user_id, rgn_id, year, feature_index_list):
        # Query the database
        if len(feature_index_list) == 1 and feature_index_list[0] == 'all':
            geom_query = self.session.query(Geom).filter(
                Geom.region_id == rgn_id,
                Geom.year == int(year)
            ).filter(Geom.users.any(id=user_id))
        else:
            geom_query = self.session.query(Geom).filter(
                Geom.region_id == rgn_id,
                Geom.year == int(year),
                Geom.feature_index.in_(feature_index_list)
            ).filter(Geom.users.any(id=user_id))

        return geom_query

    def read_data_from_db(self, feature_index_list=['all']):
        '''

        :param feature_index_list: list of feature indices;
               if feature_index_list is all, all features for the year will be queried
        :return: geojson: etdata for features in feat_index_list,
                 geojson: geomdata for feaures in feat_index_list
        '''
        # Set the geom_names from region and feature index
        region = self.tv['region']
        rgn_id = config.statics['db_id_region'][region]
        user_id = 0 # public
        # Set the dates list from temporal_resolution
        DateUtil = date_Util()
        
        geomdata = {}
        etdata = {}
        self.start_session()

        geom_year = None
        geom_query = None
        if self.tv['region'] not in config.statics['regions_changing_by_year']:
            geom_year = '9999'

        if geom_year == '9999':
            # We only need to query the data base once
            geom_query = self.make_geom_query(user_id, rgn_id, geom_year, feature_index_list)

        for year in self.tv['years']:
            if geom_year != '9999':
                geom_year = year

            if geom_year != '9999' or '9999' not in geomdata.keys():
                geomdata[geom_year] = {
                    'type': 'FeatureCollection',
                    'features': []
                }

            etdata[year] = {
                'type': 'FeatureCollection',
                'features': []
            }
            # Set the dates list from temporal_resolution
            dates_list = DateUtil.set_datetime_dates_list(year, self.tv)
            # FIX ME: se join to query more efficiently? See SANDBOX/POSTGIS
            # Query geometry table
            if not geom_query:
                geom_query = self.make_geom_query(user_id, rgn_id, year, feature_index_list)

            # get the relevant geom_ids
            geom_id_list = []
            feat_idx_list = []
            feat_data = []

            for q in geom_query.all():
                geom_id = q.id
                geom_id_list.append(geom_id)
                feat_idx_list.append(q.feature_index)
                g_data = self.set_geom_json(q)
                feat_data.append(g_data)
                # Add the feature to etdata
                etdata[year]['features'].append({'type': 'Feature', 'properties': {}})
            if  not geomdata[geom_year]['features']:
                geomdata[geom_year]['features'] = feat_data
            del feat_data

            # Query data table
            data_query = self.session.query(Data).filter(
                Data.geom_id.in_(geom_id_list),
                Data.dataset_id == config.statics['db_id_dataset'][self.tv['dataset']],
                Data.variable_id == config.statics['db_id_variable'][self.tv['variable']],
                Data.temporal_resolution == self.tv['temporal_resolution'],
                Data.data_date.in_(dates_list)
            )

            # Complile results as list of dicts
            for q in data_query.all():
                geom_id = q.geom_id
                idx = geom_id_list.index(geom_id)
                feat_idx, properties = self.set_data_json(q, geom_id_list, feat_idx_list)
                etdata[year]['features'][idx]['properties'].update(properties)
        self.end_session()
        # return etdata, geomdata
        return json.dumps(etdata, ensure_ascii=False), json.dumps(geomdata, ensure_ascii=False)

class Datastore_Util(object):
    '''
    Stores and reads data from google DATASTORE
    Method:
        - The base query is defined from relevant template values
    Args:
        :region Unique ID of geojson obbject, e.g. USFields
        :year year of geojson dataset, might be ALL if not USFields
            USField geojsons change every year
        :dataset MODSI, Landsat or gridMET
    '''
    def __init__(self, region, year, dataset):
        self.region = region
        self.year = int(year)
        self.dataset = dataset
        self.DATASTORE_CLIENT = datastore.Client(project=config.PROJECT_ID)
        self.geo_bucket_url = config.GEO_BUCKET_URL
        self.data_bucket_url = config.DATA_BUCKET_URL
        # Used to read geometry data from buckets
        if self.region in ['Mason', 'US_fields']:
            # Field boundaries depend on years
            self.geoFName = region + '_' + year + '_GEOM.geojson'
        else:
            self.geoFName = region + '_GEOM.geojson'
        # Only used to populate local DATASTORE @8000
        self.local_dataFName = config.LOCAL_DATA_DIR + dataset + '/' +  region + '_' + year + '_DATA'  '.json'
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
        # geomdata = json.dumps(d, ensure_ascii=False)
        geomdata = d
        return geomdata

    def read_feat_data_from_bucket(self, feat_index_list):
        '''
        Reads multiple feature data from roses-data bucket
        :param feat_index_list:
        :return:
        '''
        url = self.data_bucket_url + self.dataset + '/' + self.bucket_dataFName
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
        :param feat_idx: feature index (db property)
        :return: dict of data for the feature
        '''
        # FIX ME: not tested
        feature_data = {
            'type': 'FeatureCollection',
            'features': []
        }
        for feat_idx in feat_index_list:
            unique_str = ('-').join([self.region, self.dataset, str(self.year), str(feat_idx)])
            UNIQUE_ID = hashlib.md5(unique_str).hexdigest()
            # query_data = ndb.Key('DATA', UNIQUE_ID).get()
            key = self.DATASTORE_CLIENT.key('DATA', UNIQUE_ID)
            query_data = self.DATASTORE_CLIENT.get(key)
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
        url = self.data_bucket_url + self.dataset + '/' + self.bucket_dataFName
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
            logging.error('NO DATA IN BUCKET FILE ' + url)
            raise Exception('NO DATA IN BUCKET FILE ' + url)
        else:
            logging.info('SUCCESSFULLY READ DATA FROM BUCKET')
        return all_data

    def read_data_from_db(self):
        '''
        Reads all features for region, year, dataset
        :return:  dict of data for the features
        '''

        all_data = {
            'type': 'FeatureCollection',
            'features': []
        }
        qry = self.DATASTORE_CLIENT.query(kind='DATA')
        qry.add_filter('region', '=', self.region)
        qry.add_filter('year', '=', int(self.year))
        qry.add_filter('dataset', '=', self.dataset)
        '''
        qry = DATA.query(
            DATA.region == self.region,
            DATA.year == int(self.year),
            DATA.dataset == self.dataset,
        )
        '''
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
            # all_data = json.dumps(json.load(f), ensure_ascii=False)
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
            unique_str = ('-').join([self.region, self.dataset, str(self.year), str(idx)])
            UNIQUE_ID = hashlib.md5(unique_str).hexdigest()
            key = self.DATASTORE_CLIENT.key('DATA', UNIQUE_ID)
            db_entity = datastore.Entity(key = key)
            db_entity.update({
                'feat_idx': idx,
                'region': self.region,
                'year': self.year,
                'dataset': self.dataset
            })
            db_entity.update(feat)
            # db_entity.key = ndb.Key('DATA', UNIQUE_ID)
            db_entities.append(db_entity)

        # db_keys = ndb.put_multi(db_entities)
        self.DATASTORE_CLIENT.put_multi(db_entities)


