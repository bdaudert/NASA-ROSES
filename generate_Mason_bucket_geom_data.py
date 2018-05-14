#!/user/bin/env python
import json, os
import glob

if __name__ == '__main__':
    meta_cols = ["OBJECTID", "STATE", "HUC8", "HUC8_NAME", "PIXELCOUNT", "AREA"]
    geo_files = filter(os.path.isfile, glob.glob('/Users/bdaudert/EE/NASA-ROSES-DATA/geojson/Mason_' + '*.geojson'))
    for geo_file in geo_files[0: -1]:
        file_name = os.path.basename(geo_file)
        if file_name.endswith('GEOM.geojson') or file_name.endswith('DATA.geojson'):
            continue
        print('PROCESSING FILE ' + str(geo_file))
        l = file_name.split('.')[0].split('_')
        region = l[0]
        year = l[1]
        data_file_name = region + '_' + year + '_' + 'GEOM' + '.geojson'
        geomdata = {
            'type': 'FeatureCollection',
            'features': []
        }
        with open(geo_file) as f:
            j_data = json.load(f)
        feats = j_data['features']
        for f_idx, feat in enumerate(feats):
            data_dict =  {
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': feat['geometry']['coordinates']
                },
                'properties': {'idx': f_idx}
            }
            # Take relevant meta properties
            for p_key, prop in feat['properties'].iteritems():
                if p_key not in meta_cols:
                    continue
                data_dict['properties'][p_key] = prop
            geomdata['features'].append(data_dict)
        with open('static/geojson/' + data_file_name, 'w') as f:
            json.dump(geomdata, f)
    '''
    #Test
    data_file_name = 'Mason_2001_GEOM.json'
    with open('static/geojson/' + data_file_name) as f:
        print json.loads(f)
    '''
