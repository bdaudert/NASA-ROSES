#!/user/bin/env python
import json, os
import glob

if __name__ == '__main__':
    meta_cols = ["OBJECTID", "STATE", "HUC8", "HUC8_NAME", "PIXELCOUNT", "AREA"]
    data_cols = ["etr_annual", "et_annual", "etrf_annual", "pr_annual", "net_annual",
            "etr_seasonal", "et_seasonal", "etrf_seasonal", "pr_seasonal", "net_seasonal",
            "start_mon", "end_mon",
            "etr_m01", "etr_m02", "etr_m03", "etr_m04", "etr_m05",
            "etr_m06", "etr_m07", "etr_m08", "etr_m09", "etr_m10", "etr_m11", "etr_m12",
            "et_m01", "et_m02" , "et_m03" , "et_m04", "et_m05",
            "et_m06", "et_m07", "et_m08", "et_m09", "et_m10", "et_m11", "et_m12",
            "etrf_m01"]

    geo_files = filter(os.path.isfile, glob.glob('/Users/bdaudert/EE/NASA-ROSES-DATA/geojson/Mason_' + '*.geojson'))
    et_models = ['SSEBop']
    for et_model in et_models:
        for geo_file in geo_files[0: -1]:
            file_name = os.path.basename(geo_file)
            if file_name.endswith('GEOM.geojson') or file_name.endswith('DATA.geojson'):
                continue
            print('PROCESSING FILE ' + str(geo_file))
            l = file_name.split('.')[0].split('_')
            region = l[0]
            year = l[1]
            data_file_name = region + '_' + year + '_' + 'DATA' + '.json'
            data = {
                'type': 'FeatureCollection',
                'features': []
            }
            with open(geo_file) as f:
                j_data = json.load(f)
            feats = j_data['features']
            for f_idx, feat in enumerate(feats):
                data_dict = {
                    'properties': {'idx': f_idx}
                }
                props = feat['properties']
                for prop_key in props.keys():
                    if prop_key in meta_cols:
                        data_dict['properties'][prop_key] = props[prop_key]
                    if prop_key.lower() in data_cols:
                        data_dict['properties'][prop_key.lower()] = props[prop_key]
                    #Sepcial case for seasonal data
                    if prop_key.endswith('SEASON') or prop_key.endswith('SEASN'):
                        if prop_key.startswith('ppt'):
                            ('PR_' + '_SEASONAL').lower()
                        else:
                            p_key = (prop_key.split('_')[0] + '_SEASONAL').lower()
                        data_dict['properties'][p_key] = props[prop_key]
                    if prop_key.startswith('ppt'):
                        p_key = ('PR_' + prop_key.split('_')[1]).lower()
                        data_dict['properties'][p_key] = props[prop_key]
                data['features'].append(data_dict)
            with open('static/json/DATA/' + et_model + '/' + data_file_name, 'w') as f:
                json.dump(data, f)
    '''
    #Test
    data_file_name = 'Mason_2001_DATA.json'
    with open('static/geojson/' + data_file_name) as f:
        print json.loads(f)
    '''
