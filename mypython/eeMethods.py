#!/usr/bin/env python
import logging
import json

import ee
from config import p_statics
from config import statics

import Utils

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
            try:
                reduced_image_data = img.reduceRegion(
                    ee.Reducer.mean(),
                    geometry=geom,
                    scale=1000,
                    tileScale=1,
                    crs='EPSG:4326',
                    crsTransform=None,
                    bestEffort=True
                )
                val = reduced_image_data.get(variable)
            except:
                val = self.missing_value
            return ee.Feature(geom, {'Data': val})



        et_data = {}
        imgs = []
        count = 0
        stat_names_list = []
        # FIX ME: add more vars as data comes online
        # for v in var_list:
        # MODIS SSEBop only has et right now
        # var_list = statics['cols_by_var_res'].keys()
        for v in ['et']:
            logging.info('PROCESSING VARIABLE ' + str(v))
            stat_names = statics['cols_by_var_res'][v][self.t_res]
            for stat_name in stat_names:
                stat_names_list.append(stat_name)
                logging.info('PROCESSING STATISTIC ' + str(stat_name))
                variable = stat_name.split('_')[0].lower()
                temporal_stat = p_statics['t_stat_by_var']
                # coll = self.filter_coll_by_var(coll, variable)
                imgs.append(self.reduce_collection_to_img(coll, temporal_stat))
                count += 1

        ee_imgs = ee.ImageCollection(imgs)
        feats = ee.FeatureCollection(ee_imgs.map(average_over_region))
        try:
            f_data = feats.aggregate_array('Data').getInfo()
        except Exception as e:
            raise Exception(e)

        for c_idx in range(count):
            stat_name = stat_names_list[c_idx]
            et_data[stat_name] = f_data
        return et_data

    def get_et_stats(self):
        coll = self.get_collection()
        dS_str = str(self.year) + '-' +\
            p_statics['start_end_mon_days_by_res'][self.t_res][0]
        dE_str = str(self.year) + '-' +\
            p_statics['start_end_mon_days_by_res'][self.t_res][1]
        coll = self.filter_coll_by_dates(coll, dS_str, dE_str)
        with open(self.geoFName, 'r') as geo_infile:
            geo_data = json.load(geo_infile)
        json_data = {
            'type': 'FeatureCollection',
            'features': []
        }
        # FIX ME
        # Right now we get error for feat 25 in Mason_2003
        # Image.reduceRegion: Inverted hole cannot be transformed
        # for f_idx, geo_feat in enumerate(geo_data['features'][0:1]):
        for f_idx, geo_feat in enumerate(geo_data['features']):
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
