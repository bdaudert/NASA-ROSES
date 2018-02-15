#!/usr/bin/python
import logging


from google.appengine.ext import ndb


import eeMethods


class DATA(ndb.Model):
    data = ndb.JsonProperty(compressed=True)
    date_added = ndb.DateTimeProperty(auto_now_add=True)


class METADATA(ndb.Model):
    times_requested = ndb.IntegerProperty('r')
    # years = ndb.StringProperty('n')  # comma separated list of years


class Datatstore_Util(object):
    '''
    Stores and reads data from
    google DATASTORE
    Method:
        - The base query is defined from relevant template values
    '''
    def __init__(self, dataset, et_model, t_res, geojson, year):
        self.dataset = dataset
        self.et_model = et_model
        self.t_res = t_res  # temporal resolution
        self.geojson = geojson
        self.year = year

    def set_db_key(self):
        ds = self.dataset
        m = self.et_model
        r = self.t_res
        y = self.year
        db_key = ('_').join(ds, m, r, y)
        return db_key

    def add_to_db(self, key, json_data):
        db_key = self.set_db_key()
        # Check if this dataset is already in the database
        if ndb.Key('DATA', db_key).get():
            return
        logging.info('ADDING DATA ' + db_key)
        # Define an instance of DATA
        data_obj = DATA(id=db_key, data=json_data)

        # Put the data into data store
        try:
            data_obj.put()
        except Exception as e:
            msg = 'Datatstore_Util ERROR when adding to database ' + str(e)
            logging.error(msg)


    def write_et_json(self):
        '''
        Stores geojson info and et data a json object and
        writes data to out_file
        :param out_fil
        :return
        '''
        ET_helper = eeMethods.ET_Util(
            self.dataset, self.et_model, self.t_res, self.geojson, self.year)
        ee_stats = ET_helper.get_et_stats()
        return ee_stats

