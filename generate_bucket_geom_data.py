#!/user/bin/env python
import json, os
import glob

if __name__ == '__main__':
    geo_files = filter(os.path.isfile, glob.glob('static/geojson/Mason_' + '*.geojson'))
    for geo_file in geo_files[0: -1]:
        file_name = os.path.basename(geo_file)
        if file_name.endswith('METADATA.geojson') or file_name.endswith('DATA.geojson'):
            continue
        print('PROCESSING FILE ' + str(geo_file))
        l = file_name.split('.')[0].split('_')
        region = l[0]
        year = l[1]
        data_file_name = region + '_' + year + '_' + 'GEOM' + '.geojson'
        new_data = []
        with open(geo_file) as f:
            j_data = json.load(f)
        data = []
        feats = j_data['features']
        for feat in feats:
            data_dict = {
                'GEOM_COORDINATES':feat['geometry']['coordinates']
            }
            data.append(data_dict)
        with open('static/geojson/' + data_file_name, 'w') as f:
            json.dump(data, f)
    '''
    #Test
    data_file_name = 'Mason_2001_GEOM.json'
    with open('static/geojson/' + data_file_name) as f:
        print json.loads(f)
    '''
