import json
if __name__ == '__main__':
    geo_meta_cols = {
        "US_states_west_500k": ["STATEFP", "STUSPS", "NAME", "ALAND", "AWATER"],
        "US_counties_west_500k": ["STATEFP", "COUNTYFP", "NAME", "ALAND", "AWATER"],
        "US_HUC2_west": ["AREASQKM", "STATES", "HUC2", "NAME"],
        "US_HUC4_west": ["AREASQKM", "STATES", "HUC2", "NAME"],
        "US_HUC6_west": ["AREASQKM", "STATES", "HUC2", "NAME"],
        "US_HUC8_west": ["AREASQKM", "STATES", "HUC2", "NAME"],
        "US_HUC10_west": ["AREASQKM", "STATES", "HUC2", "NAME"]
    }
    geo_dir = 'static/geojson/'
    geo_files = [
        'US_states_west_500k.geojson',
        'US_counties_west_500k.geojson',
        'US_HUC2_west.geojson',
        'US_HUC4_west.geojson',
        'US_HUC6_west.geojson',
        'US_HUC8_west.geojson',
        'US_HUC10_west.geojson']
    et_models = ['SSEBop']
    for geo_file in geo_files:
        geo_fl = geo_dir + geo_file
        print('PROCESSING FILE ' + str(geo_file))
        region = geo_file.split('.geojson')[0]
        new_file_name = region + '_GEOM.geojson'
        geomdata = {
            'type': 'FeatureCollection',
            'features': []
        }
        with open(geo_fl, 'r') as f:
            j_data = json.load(f)
        feats = j_data['features']
        feat_coords = []
        for f_idx, feat in enumerate(feats):
            new_feat_coords = []
            data_dict =  {
                'type': 'Feature',
                'geometry': {
                    'type': feat['geometry']['type'],
                    'coordinates':[]
                },
                'properties': {'idx': f_idx}
            }
            if feat['geometry']['type'] == 'Polygon':
                # Check if additional data er present, e.g. elevs
                if len(feat['geometry']['coordinates'][0][0]) == 2:
                    data_dict['geometry']['coordinates'] = feat['geometry']['coordinates']
                else:
                    for lin_ring in feat['geometry']['coordinates']:
                        l_coords = []
                        for c in lin_ring:
                            l_coords.append([c[0], c[1]])
                        data_dict['geometry']['coordinates'].append(l_coords)
            elif feat['geometry']['type'] == 'MultiPolygon':
                if len(feat['geometry']['coordinates'][0][0][0]) == 2:
                    data_dict['geometry']['coordinates'] = feat['geometry']['coordinates']
                else:
                    for poly in feat['geometry']['coordinates']:
                        p_coords = []
                        for lin_ring in poly:
                            l_coords = []
                            for c in lin_ring:
                                l_coords.append([c[0], c[1]])
                            p_coords.append(l_coords)
                        data_dict['geometry']['coordinates'].append(p_coords)
            else:
                # Only Polygons and multi polygons are allowed
                continue
            # Take all meta properties
            for p_key, prop in feat['properties'].iteritems():
                if p_key not in geo_meta_cols[region]:
                    continue
                data_dict['properties'][p_key] = prop
            geomdata['features'].append(data_dict)
        with open(geo_dir + new_file_name, 'w') as f:
            json.dump(geomdata, f)

