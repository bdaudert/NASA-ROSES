
# input crs: EPSG:32611, output crs EPSG:4326 = WGS84 = lon, lat coords
# geojson conversion
function shp2geojson() {
  ogr2ogr -f GeoJSON -s_srs EPSG:32611 -t_srs EPSG:4326  "$1.geojson" "$1.shp"
}

#unzip all files in a directory
#for var in *.zip; do unzip "$var"; done

#convert all shapefiles
for var in *.shp; do shp2geojson ${var%\.*}; done


