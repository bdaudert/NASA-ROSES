#!/usr/bin/env python

import logging

# Needed to store data to datastore from outside app engine
from google.cloud import datastore

import databaseMethods

class Datatstore_Util2(object):
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

    def set_db_key(self):
            ID = self.region
            y = self.year
            ds = self.dataset
            m = self.et_model
            db_key = ('_').join([ID, ds, m, y])
            return db_key

    def set_db_entity(self, json_data):
        '''
        sets up datastore client and entity
        '''
        db_key = self.set_db_key()
        # Instantiates a client
        client = datastore.Client()
        data_key = client.key('DATA', db_key)
        entity = datastore.Entity(key=data_key)
        entity.update({
            'data': json_data,
            'region': self.region,
            'year': int(self.year),
            'dataset': self.dataset,
            'et_model': self.et_model
        })
        self.client = client
        return entity

    def add_to_db(self, entity_list):
        '''
        Adds multiple data to datastore via the datastore client
        NOTE: can be run outside of app engine
        '''
        self.client.put_multi(entity_list)


###################################################
# M A I N
###################################################
if __name__ == "__main__":
    for region in ['Mason']:
        region_data = []
        for year in ['2003']:
            logging.info('PROCESSING Region/Year ' + region + '/' + year)
            for ds in ['MODIS']:
                for et_model in ['SSEBop']:
                    DU = databaseMethods.Datatstore_Util(
                        region, year, ds, et_model)
                    name_l = [region, year, ds, et_model]
                    tv_name = ('_').join(name_l)
                    logging.info('PROCESSING ' + tv_name)
                    json_data = DU.get_et_json_data()
                    DU2 = Datatstore_Util2(
                        region, year, ds, et_model)
                    region_data.append(DU2.set_db_entity())
        DU2.add_to_db_2(region_data)
