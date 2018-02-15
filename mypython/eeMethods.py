#!/usr/bin/env python
import logging
import json

import ee
from config import p_statics
from config import statics


class ET_Util(object):
    '''
    Computes ET statistics
    '''
    def __init__(self, dataset, et_model, t_res, geojson, year):
        self.dataset = dataset
        self.et_model = et_model
        self.t_res = t_res  # temporal resolution
        self.geojson = geojson
        self.year = year
        self.missing_value = -9999

    def get_collection(self):
        '''
        Gets the ee collection (by nameand tem_res)
        :param dataset: MODIS or LANDSAT
        :param model: et model: SSEBop, SIMS, METRIC etc
        :param t_res: temporal resolution
            "M": "Monthly",
            "SEASON": "Seasonal (Apr - Oct)",
            "ANNUAL": "Annual"
        :return: ee.ImageCollection
        '''
        ds = self.dataset
        m = self.et_model
        r = self.t_res
        coll_name = p_statics['ee_coll_name'][ds][m][r]
        logging.debug('EE CALL: ee.ImageCollection({})'.format(coll_name))
        coll = ee.ImageCollection(coll_name)
        return coll

    def filter_collection(self, coll, variable, dS_str, dE_str):
        '''
        Gets the ee collection (by nameand tem_res)
        and filters by variable and start/end dates

        :param coll ee.ImageCollection
        :param variable:
            "ET": "Actual ET",
            "ETRF": "Fractional ET",
            "ETR": "Reference ET",
            "PPT": "Precipitation"
        :param dS_str start date, format yyyy-mm-dd
        :param dE_str end date, format yyyy-mm-dd
        :return: ee.ImageCollection filtered by variable and dates
        '''
        dS_obj = ee.Date(dS_str, 'GMT')
        dE_obj = ee.Date(dE_str, 'GMT')
        logging.debug('EE CALL: collection.select({})'.format(variable))
        f_coll = coll.select([0], [variable]) \
            .map(lambda x: x.double())\
            .filterDate(dS_obj, dE_obj.advance(1, 'day'))
        return f_coll

    def reduce_collection_to_img(self, coll, stat):
    	'''
        Reduces the ee.imageCollection to a single ee image by applying
        the statistic stat

        :param coll ee.imageCollection
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

    def reduce_img_over_region(self, img, geom, scale, variable):
    	'''
        Averages the ee.Image over all pixels of ee.Geometry
        '''
        try:
            reduced_image_data = img.reduceRegion(
                ee.Reducer.mean(),
                geometry=geom,
                scale=scale,
                tileScale=1,
                crs='EPSG:4326',
                crsTransform=None,
                bestEffort=True
            )
            val = reduced_image_data.get(variable.lower()).getInfo()
        except:
            val = self.missing_value
        return val

    def compute_et_stat(self, coll, geom, variable, stat_name, year):
    	'''
        Computes ET stat from collection for geometry,
        given variable and temporal resolution
        :param coll ee.imageCollection
        :param geom ee.Geometry
        :param var variable (ET, ETR, PPT, etc.)
        :param t_res temporal resolution (ANNUAL, SEASON, MONTHLY etc)
        :return:
        '''
        dS_str = str(year) + '-' +\
            p_statics['start_end_mon_days_by_res'][self.t_res][0]
        dE_str = str(year) + '-' +\
            p_statics['start_end_mon_days_by_res'][self.t_res][1]
        c = self.filter_collection(coll, variable.lower(), dS_str, dE_str)
        # Reduce ImageCollection
        img = self.reduce_collection_to_img(c, 'sum')
        # Reduce over geometry
        et_data = self.reduce_img_over_region(img, geom, 1000, variable)
        return et_data

    def compute_et_stats(self, geom, geo_props):
        props = {}
        for prop in statics['meta_cols']:
            if prop in geo_props.keys():
                props[prop] = geo_props[prop]
        coll = self.get_collection()
        var_list = statics['cols_by_var_res'].keys()
        for v in var_list:
            stat_names = statics['cols_by_var_res'][v][self.t_res]
            for stat_name in stat_names:
                variable = stat_name.split('_')[0]
                props[stat_name] = self.compute_et_stat(
                    coll, geom, variable, stat_name, self.year)
        return props

    def get_et_stats(self):
        with open(self.geojson, 'r') as geo_infile:
            geo_data = json.load(geo_infile)
        json_data = {
            'type': 'FeatureCollection',
            'features': []
        }
        for geo_feat in geo_data['features']:
            feat = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon'
                }
            }
            geom_coords = geo_feat['geometry']['coordinates']
            feat['geometry']['coordinates'] = geom_coords
            geom = ee.Geometry.Polygon(geom_coords)
            geo_props = geo_feat['properties']
            feat['properties'] = self.compute_et_stats(geom, geo_props)
            json_data['features'].append(feat)
        return json_data

