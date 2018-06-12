import os
import json
import ogr, osr


def json_reverse_func(json_geom):
    """Reverse the point order from counter-clockwise to clockwise
    json_geom is modified in place
    Args:
        json_geom (dict): The geometry sub dictionar of a geojson.
    Returns:
        dict
    """
    if json_geom['type'].lower() == 'multipolygon':
        for i in range(len(json_geom['coordinates'])):
            for j in range(len(json_geom['coordinates'][i])):
                json_geom['coordinates'][i][j] = list(reversed(
                    json_geom['coordinates'][i][j]))
                # Repeat first coordinate at end
                if json_geom['coordinates'][i][j][0] != json_geom['coordinates'][i][j][-1]:
                    json_geom['coordinates'][i][j].append(json_geom['coordinates'][i][j][0])
    elif json_geom['type'].lower() == 'polygon':
        for i in range(len(json_geom['coordinates'])):
            json_geom['coordinates'][i] = list(reversed(
                json_geom['coordinates'][i]))
            # Repeat first coordinate at end
            if json_geom['coordinates'][i][0] != json_geom['coordinates'][i][-1]:
                json_geom['coordinates'][i].append(json_geom['coordinates'][i][0])
    return json_geom

def convert_shp(geojson_dir, shp_dir, shp_file):
    driver = ogr.GetDriverByName('ESRI Shapefile')
    # shp_path = r'C:\GIS\Temp\Counties.shp'
    data_source = driver.Open(shp_dir + shp_file, 0)

    # input SpatialReference
    inSpatialRef = osr.SpatialReference()
    inSpatialRef.ImportFromEPSG(32611)

    # output SpatialReference (WSG84)
    # needed to display on Gmap
    outSpatialRef = osr.SpatialReference()
    outSpatialRef.ImportFromEPSG(4326)

    # create the CoordinateTransformation
    coordTrans = osr.CoordinateTransformation(inSpatialRef, outSpatialRef)

    # initialize geojson objext
    fc = {
        'type': 'FeatureCollection',
        'features': []
    }
    lyr = data_source.GetLayer(0)
    for inFeature in lyr:
        outFeature = inFeature.Clone()
        # get the input geometry
        geom = inFeature.GetGeometryRef()
        # reproject the geometry
        geom.Transform(coordTrans)
        # FIX ME THIS DOES NOT WORK but should on ogrLinearRings
        '''
        for g in geom:
            g.reverseWindingOrder()
        '''
        # set the geometry and attribute
        outFeature.SetGeometry(geom)
        json_feat = outFeature.ExportToJson(as_object=True)
        # Reverse the winding order
        json_feat['geometry'] = json_reverse_func(json_feat['geometry'])
        fc['features'].append(json_feat)

    base_name = os.path.splitext(os.path.basename(shp_file))[0]
    json_file =  geojson_dir + base_name + '.geojson'
    with open(json_file, 'wb') as f:
        json.dump(fc, f)

########
#M A I N
########
if __name__ == '__main__' :
    shp_dir = '/Users/bdaudert/Documents/DHS/Open-ET:NASA ROSES/DATA/mason_shapefiles'
    geojson_dir = '/Users/bdaudert/EE/nasa-roses-data/geojson/'
    for year in range(2001, 2002):
        shp_file = 'Mason_' + str(year) + '.shp'
        convert_shp(geojson_dir, shp_dir, shp_file)

