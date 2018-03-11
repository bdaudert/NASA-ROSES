#!/usr/bin/python
import logging


from google.appengine.ext import ndb


import eeMethods


class DATA(ndb.Model):
    data = ndb.JsonProperty(compressed=True)
    geoID = ndb.StringProperty()
    year = ndb.IntegerProperty()
    dataset = ndb.StringProperty()
    et_model = ndb.StringProperty()
    t_res = ndb.StringProperty()
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

    def get_et_json_data(self):
        '''
        Stores geojson info and et data a json object and
        writes data to out_file
        :param out_fil
        :return
        '''
        ET_helper = eeMethods.ET_Util(
            self.geoID, self.geoFName, self.year,
            self.dataset, self.et_model, self.t_res
        )
        ee_stats = ET_helper.get_et_stats()
        return ee_stats

    def set_db_key(self):
        ID = self.geoID
        y = self.year
        ds = self.dataset
        m = self.et_model
        r = self.t_res
        db_key = ('_').join([ID, ds, m, r, y])
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
                        geoID=self.geoID,
                        year=int(self.year),
                        dataset=self.dataset,
                        et_model=self.et_model,
                        t_res=self.t_res)

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
        qry = DATA.query(DATA.geoID == self.geoID,
                         DATA.year == int(self.year),
                         DATA.dataset == self.dataset,
                         DATA.et_model == self.et_model,
                         DATA.t_res == self.t_res)
        json_data = qry.fetch()[0].data
        logging.info('READ DATA FROM DB')
        return json_data
