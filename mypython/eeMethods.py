#!/usr/bin/env python
import logging
import json
import os
import urllib2

import ee
import cloudstorage as gcs
from google.appengine.api import app_identity

from config import p_statics
from config import statics
from config import GEO_BUCKET_NAME
from config import GEO_BUCKET_URL
import Utils


# Set cloud storage params
my_default_retry_params = gcs.RetryParams(
    initial_delay=0.2,
    max_delay=5.0,
    backoff_factor=2,
    max_retry_period=15
)
gcs.set_default_retry_params(my_default_retry_params)


class ET_Util(object):
    '''
    Computes ET statistics
    Args:
        :geoID Unique ID of geojson obbject, e.g. USFields
        :geoFName geojson file name
        :year year of geojson dataset, might be ALL if not USFields
            USField geojsons change every year
        :dataset MODSI, Landsat or gridMET
        :et_model Evapotranspiration modfel, e.g. SIMS, SSEBop, METRIC
        :t_res temporal resolution, e.g. annual, seasonal, monthly
    '''
    def __init__(self, geoID, geoFName, year, dataset, et_model, t_res):
        self.geoID = geoID
        self.geoFName = geoFName
        self.year = year
        self.dataset = dataset
        self.et_model = et_model
        self.t_res = t_res  # temporal resolution
        self.missing_value = -9999
        self.geo_bucket_url = GEO_BUCKET_URL

    def read_data_from_bucket(self):
        '''
        # FIX ME: this is not working
        # path_to_file = '/' + GEO_BUCKET_NAME + '/' + self.geoFName
        b = os.environ.get(
            'BUCKET_NAME',
            app_identity.get_default_gcs_bucket_name())
        path_to_file = '/' + b + '/' + self.geoFName
        gcs_file = gcs.open(path_to_file)
        contents = json.load(gcs_file.read())
        gcs_file.close()
        '''
        f = self.geo_bucket_url + self.geoFName
        contents = json.load(urllib2.urlopen(f))
        # print(contents)
        return contents

    def get_collection(self):
        '''
        Gets the ee collection (by nameand tem_res)
        :param dataset: MODIS or LANDSAT
        :param model: et model: SSEBop, SIMS, METRIC etc
        :param t_res: temporal resolution
            "monthly": "Monthly",
            "seasonal": "Seasonal (Apr - Oct)",
            "annual": "Annual"
        :return: ee.ImageCollection
        '''
        ds = self.dataset
        m = self.et_model
        r = self.t_res
        coll_name = p_statics['ee_coll_name'][ds][m][r]
        logging.debug('EE CALL: ee.ImageCollection({})'.format(coll_name))
        coll = ee.ImageCollection(coll_name)
        return coll

    def filter_coll_by_dates(self, coll, dS_str, dE_str):
        '''
        Gets the ee collection (by nameand tem_res)
        and filters by variable and start/end dates

        :param coll ee.ImageCollection
        :param variable:
            "et": "Actual ET",
            "etrf": "Fractional ET",
            "etr": "Reference ET",
            "pr": "Precipitation"
        :param dS_str start date, format yyyy-mm-dd
        :param dE_str end date, format yyyy-mm-dd
        :return: ee.ImageCollection filtered by variable and dates
        '''
        dS_obj = ee.Date(dS_str, 'GMT')
        dE_obj = ee.Date(dE_str, 'GMT')
        logging.debug('EE CALL: collection.filterDate({}, {})'
                      .format(dS_str, dE_str))
        f_coll = coll.map(lambda x: x.double())\
            .filterDate(dS_obj, dE_obj.advance(1, 'day'))
        return f_coll

    def filter_coll_by_var(self, coll, variable):
        '''
        Gets the ee collection (by nameand tem_res)
        and filters by variable and start/end dates

        :param coll ee.ImageCollection
        :param variable:
            "et": "Actual ET",
            "etrf": "Fractional ET",
            "etr": "Reference ET",
            "pr": "Precipitation"
        :return: ee.ImageCollection filtered by variable
        '''
        logging.debug('EE CALL: collection.select({})'.format(variable))
        return coll.select([variable], [variable])

    def reduce_collection_to_img(self, coll, stat):
    	'''
        Reduces the ee.ImageCollection to a single ee image by applying
        the statistic stat

        :param coll ee.ImageCollection
        :param stat statistic: max, min, mean, median
        :return: ee.Image
        '''

        if stat == 'Median':
            img = coll.median()
        elif stat == 'Mean':
            img = coll.mean()
        elif stat == 'Max':
            img = coll.max()
        elif stat == 'Min':
            img = coll.min()
        elif stat == 'Total':
            img = coll.sum()
        else:
            img = coll.mean()
        return img

    def set_geo_properties(self, geo_props):
        '''
        Populates metadata from the geo properties
        Defined in the geojson data file
        '''
        props = {}
        for prop in statics['meta_cols']:
            if prop in geo_props.keys():
                props[prop] = geo_props[prop]
        return props

    def compute_et_stats(self, coll, geom, geo_props):
        def average_over_region(img):
            '''
            Averages the ee.Image over all pixels of ee.Geometry
            '''
            reduced_image_data = img.reduceRegion(
                ee.Reducer.mean(),
                geometry=geom,
                scale=1000,
                tileScale=1,
                crs='EPSG:4326',
                crsTransform=None,
                bestEffort=True
            )
            return ee.Feature(None, reduced_image_data)

        et_data = {}
        imgs = []
        # FIX ME: add more vars as data comes online
        # MODIS SSEBop only has et right now
        # var_list = statics['stats_by_var_res'].keys()
        var_list = ['et']
        for v in var_list:
            # Filter collection by variable
            c_var = self.filter_coll_by_var(coll, v)
            logging.info('PROCESSING VARIABLE ' + str(v))
            stat_names = statics['stats_by_var_res'][v][self.t_res]
            for stat_name in stat_names:
                logging.info('PROCESSING STATISTIC ' + str(stat_name))
                res = stat_name.split('_')[1]
                # Filer collection by date
                dS_str = str(self.year) + '-' +\
                    p_statics['start_end_mon_days_by_res'][res][0]
                dE_str = str(self.year) + '-' +\
                    p_statics['start_end_mon_days_by_res'][res][1]
                c_t = self.filter_coll_by_dates(c_var, dS_str, dE_str)
                temporal_stat = p_statics['t_stat_by_var']
                img = self.reduce_collection_to_img(c_t, temporal_stat)
                # feats = ee.FeatureCollection(average_over_region(img))
                imgs.append(img)
            ee_imgs = ee.ImageCollection(imgs)
            feats = ee.FeatureCollection(ee_imgs.map(average_over_region))

            try:
                f_data = feats.getInfo()
            except Exception as e:
                f_data = {'features': []}
                logging.error(e)

            for stat_idx, stat in enumerate(stat_names):
                if 'features' not in f_data.keys() or not f_data['features']:
                    et_data[stat] = -9999
                    continue
                try:
                    feat = f_data['features'][stat_idx]
                except:
                    et_data[stat] = -9999
                    continue

                if 'properties' not in feat.keys():
                    et_data[stat] = -9999
                    continue
                try:
                    val = feat['properties'][v]
                    et_data[stat] = round(val, 4)
                except:
                    et_data[stat] = -9999
                    continue
        return et_data

    def get_et_stats(self):
        '''
        with open(self.geoFName, 'r') as geo_infile:
            geo_data = json.load(geo_infile)
        '''
        json_data = {
            'type': 'FeatureCollection',
            'features': []
        }

        geo_data = self.read_data_from_bucket()
        if 'features' not in geo_data.keys():
            logging.error('NO DATA FOUND IN BUCKET, FILE: ' + self.geoFName)
            return json_data
        coll = self.get_collection()
        feats = geo_data['features']
        num_feats = len(geo_data['features'])
        print('LOOOKK')
        print num_feats
        # for f_idx, geo_feat in enumerate(geo_data['features'][0:1]):
        for f_idx, geo_feat in enumerate(feats[0:num_feats]):
            logging.info('PROCESSING FEATURE ' + str(f_idx + 1))
            feat = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon'
                }
            }
            geom_coords = geo_feat['geometry']['coordinates']
            geom_coords = [Utils.orient_poly_ccw(c) for c in geom_coords]
            feat['geometry']['coordinates'] = geom_coords
            geom = ee.Geometry.Polygon(geom_coords)
            geo_props = geo_feat['properties']
            feat['properties'] = self.set_geo_properties(geo_props)
            feat['properties']['et_data'] = self.compute_et_stats(coll, geom, geo_props)
            json_data['features'].append(feat)
        return json_data
