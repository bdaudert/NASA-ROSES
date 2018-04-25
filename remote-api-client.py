#!/user/bin/env python
import argparse, os
import logging
import json
import hashlib

EE_PRIVATE_KEY_FILE = 'NASA-ROSES-3d6f1e234914.json'
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = EE_PRIVATE_KEY_FILE

try:
    import dev_appserver
    dev_appserver.fix_sys_path()
except ImportError:
    print('Please make sure the App Engine SDK is in your PYTHONPATH.')
    raise

from google.appengine.ext import ndb
from google.appengine.ext.remote_api import remote_api_stub

class METADATA(ndb.Model):
    feat_idx = ndb.IntegerProperty()
    region = ndb.StringProperty()
    year = ndb.IntegerProperty()
    dataset = ndb.StringProperty()
    et_model = ndb.StringProperty()

class DATA(ndb.Model):
    feat_idx = ndb.IntegerProperty()
    region = ndb.StringProperty()
    year = ndb.IntegerProperty()
    dataset = ndb.StringProperty()
    et_model = ndb.StringProperty()

def read_feat_meta_from_db(region, dataset, et_model, year, feat_idx):
    '''
    Reads one feature's metadata from db
    :param feat_idx: feature index (db property)
    :return: dict of metadata for the feature
    '''
    # FIX ME: not tested
    unique_str = ('-').join([region, dataset, et_model, str(year), str(feat_idx)])
    UNIQUE_ID = hashlib.md5(unique_str).hexdigest()
    query_data = ndb.Key('METADATA', UNIQUE_ID).get()
    if not query_data:
        return []
    logging.info('READING FROM DB: ' + UNIQUE_ID)
    metadata = json.dumps(query_data.to_dict())
    return metadata

def read_feat_data_from_db(region, dataset, et_model, year, feat_idx):
    '''
    Reads one feature's data from db
    :param feat_idx: feature index (db property)
    :return: dict of data for the feature
    '''
    # FIX ME: not tested
    unique_str = ('-').join([region, dataset, et_model, str(year), str(feat_idx)])
    UNIQUE_ID = hashlib.md5(unique_str).hexdigest()
    query_data = ndb.Key('DATA', UNIQUE_ID).get()
    if not query_data:
        return []
    logging.info('READING FROM DB: ' + UNIQUE_ID)
    etdata = json.dumps(query_data.to_dict())
    return etdata

def read_meta_from_db(region, dataset, et_model, year):
    '''
    Reads metadata for all features defined by
    region, dataset, et_model and year
    region, dataset, et_model and year
    :return: dict of data for the features
    '''
    metadata = []
    try:
        qry = ndb.Query(kind='METADATA').filter(
            METADATA.year==year,
            METADATA.region==region,
            METADATA.dataset==dataset,
            METADATA.et_model==et_model
        )
        query_data = qry.fetch(2)
    except:
        query_data = []

    metadata = json.dumps([q.to_dict() for q in query_data])
    if len(query_data) > 0:
        logging.info('SUCCESSFULLY READ METADATA FROM DB')
    else:
        logging.info('NO METADATA FOUND IN DB')

    return metadata

def read_data_from_db(region, dataset, et_model, year):
    '''
    Reads data for all feaqtures defined by

    :return:
    '''
    data = []
    try:
        qry = ndb.Query(kind='DATA').filter(
            DATA.year==year,
            DATA.region==region,
            DATA.dataset==dataset,
            DATA.et_model==et_model
        )
        query_data = qry.fetch(2)
    except:
        query_data = []
    data = json.dumps([q.to_dict() for q in query_data])
    if len(query_data) > 0:
        logging.info('SUCCESSFULLY READ DATA FROM DB')
    else:
        logging.info('NO DATA FOUND IN DB')
    return data

def main(project_id):
    remote_api_stub.ConfigureRemoteApiForOAuth(
        '{}.appspot.com'.format(project_id),
        '/_ah/remote_api')

    print('DATA')
    print read_data_from_db('Mason', 'MODIS', 'SSEBop', 2003)
    print('METADATA')
    print read_meta_from_db('Mason', 'MODIS', 'SSEBop', 2003)
    #print read_feat_meta_from_db('Mason', 'MODIS', 'SSEBop', 2003, 1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('project_id', help='Your Project ID.')

    args = parser.parse_args()

    main(args.project_id)
