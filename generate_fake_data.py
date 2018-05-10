#!/user/bin/env python
import json, os
import glob
import random

if __name__ == '__main__':
    data_cols = ["etr_annual", "et_annual", "etrf_annual", "pr_annual", "net_annual",
            "etr_seasonal", "et_seasonal", "etrf_seasonal", "pr_seasonal", "net_seasonal",
            "start_mon", "end_mon",
            "etr_m01", "etr_m02", "etr_m03", "etr_m04", "etr_m05",
            "etr_m06", "etr_m07", "etr_m08", "etr_m09", "etr_m10", "etr_m11", "etr_m12",
            "et_m01", "et_m02" , "et_m03" , "et_m04", "et_m05",
            "et_m06", "et_m07", "et_m08", "et_m09", "et_m10", "et_m11", "et_m12",
            "etrf_m01"]
    geo_dir = 'static/geojson/'
    geo_files = [
                'US_states_west_500k_GEOM.geojson',
                'US_counties_west_500k_GEOM.geojson',
                'US_HUC2_west_GEOM.geojson',
                'US_HUC4_west_GEOM.geojson',
                'US_HUC6_west_GEOM.geojson',
                'US_HUC8_west_GEOM.geojson',
                'US_HUC10_west_GEOM.geojson']
    et_models = ['SSEBop']
    years = range(2003, 2011)
    for et_model in et_models:
        for geo_file in geo_files:
            geo_fl = geo_dir + geo_file
            print('PROCESSING FILE ' + str(geo_file))
            l = geo_file.split('.')[0].split('_GEOM')
            region = l[0]
            for year in years:
                print('PROCESSING YEAR ' + str(year))
                data_file_name = region + '_' + str(year) + '_DATA' + '.json'
                data = {
                    'type': 'FeatureCollection',
                    'features': []
                }
                with open(geo_fl) as f:
                    j_data = json.load(f)
                feats = j_data['features']
                for f_idx, feat in enumerate(feats):
                    data_dict = {
                        'properties': {'idx': f_idx}
                    }
                    # Add metadata
                    props = feat['properties']
                    for prop_key in props.keys():
                        data_dict['properties'][prop_key] = props[prop_key]
                    # Add fake ET DATA
                    for prop_key in data_cols:
                        data_dict['properties'][prop_key] = random.randint(1,101)
                    data['features'].append(data_dict)
                with open('static/json/DATA/' + et_model + '/' + data_file_name, 'w') as f:
                    json.dump(data, f)

    '''
    #Test
    data_file_name = 'Mason_2001_DATA.json'
    with open('static/geojson/' + data_file_name) as f:
        print json.loads(f)
    '''
