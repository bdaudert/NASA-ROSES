#!/user/bin/env python
import json, os
import glob

if __name__ == '__main__':
    meta_cols = ["OBJECTID", "BASIN", "STATE", "HYD_AREA", "HYD_AREA_N", "HUC8", "HUC8_NAME", "PIXELCOUNT", "AREA"]
    data_cols = ["etr_annual", "et_annual", "etrf_annual", "pr_annual", "net_annual",
            "etr_seasonal", "et_seasonal", "etrf_seasonal", "pr_seasonal", "net_seasonal",
            "start_mon", "end_mon",
            "etr_m01", "etr_m02", "etr_m03", "etr_m04", "etr_m05",
            "etr_m06", "etr_m07", "etr_m08", "etr_m09", "etr_m10", "etr_m11", "etr_m12",
            "et_m01", "et_m02" , "et_m03" , "et_m04", "et_m05",
            "et_m06", "et_m07", "et_m08", "et_m09", "et_m10", "et_m11", "et_m12",
            "etrf_m01"]

    geo_files = filter(os.path.isfile, glob.glob('static/geojson/Mason_' + '*.geojson'))
    for geo_file in geo_files[0: -1]:
        print('PROCESSING FILE ' + str(geo_file))
        file_name = os.path.basename(geo_file)
        if file_name.endswith('METADATA.geojson') or file_name.endswith('DATA.geojson'):
            continue
        l = file_name.split('.')[0].split('_')
        region = l[0]
        year = l[1]
        data_file_name = region + '_' + year + '_' + 'DATA' + '.geojson'
        new_data = []
        meta_file_name = region + '_' + year + '_' + 'METADATA' + '.geojson'
        new_metadata = []
        with open(geo_file) as f:
            j_data = json.load(f)
        metadata = []
        data = []
        feats = j_data['features']
        for feat in feats:
            meta_dict = {
                'GEOM_COORDINATES':feat['geometry']['coordinates']
            }
            data_dict = {}
            props = feat['properties']
            for prop_key in props.keys():
                if prop_key in meta_cols:
                    meta_dict[prop_key] = props[prop_key]
                if prop_key.lower() in data_cols:
                    data_dict[prop_key.lower()] = props[prop_key]
                #Sepcial case for seasonal data
                if prop_key.endswith('SEASON') or prop_key.endswith('SEASN'):
                    p_key = (prop_key.split('_')[0] + 'SEASONAL').lower()
                    data_dict[p_key] = props[prop_key]
                if prop_key.startswith('ppt'):
                    p_key = ('PR_' + prop_key.split('_')[1]).lower()
                    data_dict[p_key] = props[prop_key]
            data.append(data_dict)
            metadata.append(meta_dict)
        with open('static/geojson/' + data_file_name, 'w') as f:
            json.dump(data, f)
        with open('static/geojson/' + meta_file_name, 'w') as f:
            json.dump(metadata, f)
    '''
    #Test
    data_file_name = 'Mason_2001_DATA.json'
    with open('static/geojson/' + data_file_name) as f:
        print json.loads(f)
    '''
