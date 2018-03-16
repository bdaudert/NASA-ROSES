#!/usr/bin/python
import logging
import json

from google.appengine.ext import ndb


import eeMethods


class DATA(ndb.Model):
    data = ndb.JsonProperty(compressed=True)
    region = ndb.StringProperty()
    year = ndb.IntegerProperty()
    dataset = ndb.StringProperty()
    et_model = ndb.StringProperty()
    # date_added = ndb.DateTimeProperty(auto_now_add=True)


class METADATA(ndb.Model):
    times_requested = ndb.IntegerProperty('r')
    # years = ndb.StringProperty('n')  # comma separated list of years


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

    def get_et_json_data(self):
        '''
        Stores geojson info and et data a json object and
        writes data to out_file
        :param out_fil
        :return
        '''
        ET_helper = eeMethods.ET_Util(
            self.region, self.year,
            self.dataset, self.et_model
        )
        json_data = ET_helper.get_features_geo_and_et_data()
        return json_data

    def set_db_key(self):
        ID = self.region
        y = self.year
        ds = self.dataset
        m = self.et_model
        db_key = ('_').join([ID, ds, m, y])
        return db_key

    def add_to_db(self, json_data):
        db_key = self.set_db_key()
        # Check if this dataset is already in the database
        if ndb.Key('DATA', db_key).get():
            logging.info('DATA IS ALREADY IN DB: ' + db_key)
            return
        logging.info('ADDING DATA ' + db_key)
        # Define an instance of DATA
        data_obj = DATA(id=db_key,
                        data=json_data,
                        region=self.region,
                        year=int(self.year),
                        dataset=self.dataset,
                        et_model=self.et_model)

        # Put the data into data store
        try:
            data_obj.put()
        except Exception as e:
            msg = 'Datatstore_Util ERROR when adding to database ' + str(e)
            logging.error(msg)
    '''
    def read_from_db(self, db_key):
        data_obj = ndb.Key('DATA', db_key).get()
        if not data_obj or not data_obj.data:
            return {}
        logging.info('READING FROM DB: ' + db_key)
        json_data = data_obj.data
        # json_data = json.loads(data_obj.data)
        return json_data
    '''

    def read_from_db(self):
        json_data = {}
        qry = DATA.query(DATA.region == self.region,
                         DATA.year == int(self.year),
                         DATA.dataset == self.dataset,
                         DATA.et_model == self.et_model)

        # Spits out a list of query results
        query_data = qry.fetch()
        if len(query_data) > 0:
            try:
                json_data = json.dumps(query_data[0].data)
            except Exception as e:
                logging.error('ERROR in et_data retrieval!')
                logging.error('Query has no attribute data!')
                logging.error(str(e))
                return {}
        else:
            return {}
        logging.info('READ DATA FROM DB')
        return json_data
