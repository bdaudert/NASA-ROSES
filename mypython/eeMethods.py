#!/usr/bin/env python
import logging
import json
import os
import urllib2

import ee

from config import p_statics
from config import statics
# from config import GEO_BUCKET_NAME
from config import GEO_BUCKET_URL
import Utils

'''
# Cloudstorage
import cloudstorage as gcs
# from google.appengine.api import app_identity
# Set cloud storage params
my_default_retry_params = gcs.RetryParams(
    initial_delay=0.2,
    max_delay=5.0,
    backoff_factor=2,
    max_retry_period=15
)
gcs.set_default_retry_params(my_default_retry_params)
'''


# FIX ME: delete? all this stuff is done in cron job outside of app engine
class ET_Util(object):
    '''
    Computes ET statistics for all temporal resolutions
    Args:
        :region Unique ID of geojson obbject, e.g. USFields
        :geoFName geojson file name
        :year year of geojson dataset, might be ALL if not USFields
            USField geojsons change every year
        :dataset MODIS, Landsat, gridMET, SSEBop, SIMS, etc
    '''
    def __init__(self, region, year, dataset):
        self.region = region
        self.geoFName = region + '_' + year + '.geojson'
        self.year = year
        self.dataset = dataset
        self.missing_value = -9999
        self.geo_bucket_url = GEO_BUCKET_URL


    def get_collection(self, temporal_resolution):
        '''
        Gets the ee collection (by name)
        :param dataset: MODIS or LANDSAT
        :param model: et model: SSEBop, SIMS, METRIC etc
        :return: ee.ImageCollection
        '''
        ds = self.dataset
        coll_name = p_statics['ee_coll_name'][ds][temporal_resolution]
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
        # logging.debug('EE CALL: collection.filterDate({}, {})'
        #              .format(dS_str, dE_str))
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
        # logging.debug('EE CALL: collection.select({})'.format(variable))
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

    def compute_et_stats(self, coll, var, geom, temporal_resolution):
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

        etdata = {}
        imgs = []
        # logging.info('PROCESSING VARIABLE ' + str(v))
        stat_names = statics['stats_by_var_res'][var][temporal_resolution]
        for stat_name in stat_names:
            # logging.info('PROCESSING STATISTIC ' + str(stat_name))
            res = stat_name.split('_')[1]
            # Filer collection by date
            dS_str = str(self.year) + '-' +\
                p_statics['start_end_mon_days_by_res'][res][0]
            dE_str = str(self.year) + '-' +\
                p_statics['start_end_mon_days_by_res'][res][1]
            coll_t = self.filter_coll_by_dates(coll, dS_str, dE_str)
            temporal_stat = p_statics['t_stat_by_var']
            img = self.reduce_collection_to_img(coll_t, temporal_stat)
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
                etdata[stat] = -9999
                continue
            try:
                feat = f_data['features'][stat_idx]
            except:
                etdata[stat] = -9999
                continue

            if 'properties' not in feat.keys():
                etdata[stat] = -9999
                continue
            try:
                val = feat['properties'][var]
                etdata[stat] = round(val, 4)
            except:
                etdata[stat] = -9999
                continue
        return etdata


