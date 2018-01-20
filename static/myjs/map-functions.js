/* MAP Utils*/
var MAP_APP = MAP_APP || {};
MAP_APP = {
    setMarkerOptions: function(){
        var mkrOptions = {
            draggable: true
        };
        return mkrOptions;
    },
    setMarkerListeners: function(marker, shape_idx){
        google.maps.event.addListener(marker, 'dragend', function (event) {
            var new_lat = precise_round(event.latLng.lat(),2).toString();
            var new_lon = precise_round(event.latLng.lng(),2).toString();
            var loc = new_lon + ',' + new_lat
            //Update formfield
            $('#point_' + String(shape_idx)).val(loc);
            //var myLatlng = new google.maps.LatLng(parseFloat(new_lat),parseFloat(new_lon));
            //map.panTo(myLatlng);
        });
    },
    setPolyOptions: function(){
        var opacity = 0.45;
        /*
        if (window.map.overlayMapTypes && window.map.overlayMapTypes.length >= 1){
            opacity = 0;
        }
        */
        var polyOptions = {
            strokeWeight: 0,
            fillOpacity: opacity,
            editable: true,
            draggable:true,
            fillColor: "#1E90FF",
            strokeColor: "#0c3966"
        };
        return polyOptions;
    },
    setDrawingManager: function(){
        var mkrOptions = MAP_APP.setMarkerOptions();
        var polyOptions = MAP_APP.setPolyOptions();
        var drawingManager = new google.maps.drawing.DrawingManager({
            drawingModes: [
                google.maps.drawing.OverlayType.MARKER,
                google.maps.drawing.OverlayType.RECTANGLE,
                google.maps.drawing.OverlayType.POLYGON
            ],
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [
                    google.maps.drawing.OverlayType.MARKER,
                    google.maps.drawing.OverlayType.RECTANGLE,
                    google.maps.drawing.OverlayType.POLYGON
                ]
            },
            markerOptions: mkrOptions,
            rectangleOptions: polyOptions,
            polygonOptions: polyOptions
        });
        return drawingManager;
    },
    get_fusiontable_id: function(region, field_year){
        var ft_id = null;
        if (field_year){
            ft_id = statics.fusiontables[region][field_year];
        }
        return ft_id
    },
    set_fusiontableBounds: function(query) {
        if (!query || !query.getDataTable()) {
          return;
        }
        var bounds =  new google.maps.LatLngBounds(),
            data = query.getDataTable(),
            num_rows = data.getNumberOfRows(),
            row_idx, LatLons, latLonList, count, ll_str,
            kml, geoXml;

        for (row_idx = 0; row_idx < num_rows; row_idx++) {
            kml = query.getDataTable().getValue(row_idx, 0);
            geoXml = new geoXML3.parser({});
            geoXml.parseKmlString('<Placemark>' + kml + '</Placemark>');
            lon_bounds = geoXml.docs[0].internals.bounds.b;
            lat_bounds = geoXml.docs[0].internals.bounds.f;
            ll_NE = new google.maps.LatLng(String(lat_bounds.b), String(lon_bounds.b));
            ll_SW = new google.maps.LatLng(String(lat_bounds.f), String(lon_bounds.f));
            bounds.extend(ll_NE);
            bounds.extend(ll_SW);
        }
        window.map.fitBounds(bounds);
        /*
        WEIRD: on sharelink request the zoom 
        somehow is 0 after the fitBounds call
        so we need to save the zoom beforehand and reset 
        it after
        */
        /*
        mapZoom = window.map.getZoom();
        //note: fitBounds happens asynchronously
        window.map.fitBounds(bounds);
        google.maps.event.addListenerOnce(window.map, 'bounds_changed', function(event) {
            if(mapZoom) {
                window.map.setZoom(mapZoom);
            }
        });
        */
    },
    zoomToFusiontable: function(queryText) {
        var g_url = 'http://www.google.com/fusiontables/gvizdata?tq=';
        var query = new google.visualization.Query(g_url  + queryText);
        //set the callback function
        query.send(MAP_APP.set_fusiontableBounds);
    },
    get_fusiontableQuery: function(ft_id, columnname, subchoice, needExact) {
        var query = null,
            where_text = null;

        if (needExact) {
            where_text = "'" + columnname + "' = '" + subchoice + "'";
        } else {
            if (subChoice && columnname) {
                where_text = "'" + columnname + "' CONTAINS '" + subchoice + "'";
            }
        }
        query = {
            select: 'geometry',
            from: ft_id
        };

        if (where_text) {
            query['where'] = where_text;
        }
        return query;
    },
    get_fusiontableQueryText: function(ft_id, columnname, subChoice, needExact) {
        var queryText = '';
        if (needExact) { //plot exactly 1 region
            queryText = "SELECT 'geometry' FROM " + ft_id + " WHERE '" + columnname + "' = '" + subchoice + "'";
        } else {
            if (subChoice && columnname) { //plot lots of regions w/ filter
                queryText = "SELECT 'geometry' FROM " + ft_id + " WHERE '" + columnname + "' CONTAINS '" + subchoice + "'";
            } else {
                queryText = "SELECT 'geometry' FROM " + ft_id;
            }
        }
        queryText = encodeURIComponent(queryText);
        return queryText;
    }
}

// Initialize the Google Map and add our custom layer overlay.
var initialize_map = function() {
    // Map
    var map = new google.maps.Map(document.getElementById('main-map'), {
        center: {lat: 39.23, lng:-116.94},
        zoom: 6,
        mapTypeId: 'satellite'
    });
    //Need to set global var for zooming
    window.map = map;
    // Darwing Manager
    var drawingManager = MAP_APP.setDrawingManager();
    drawingManager.setMap(map);
    
    var region = $('#region').val(), 
        field_year = null;
    if (region == 'fields'){
        field_year = $('#field_year').val();
    }
    var ft_id = MAP_APP.get_fusiontable_id(region, field_year);
    //var ft_id = '1uwx9g-iylRjxXDFIDb0tra8kK75KItMz9cbOy1Kk';
    // Fusiontable layer
    //Old: '1c4aL4VIVlBhSoxbPxzk_xh-Wo738FZhDOcS3fg'
    var layer = new google.maps.FusionTablesLayer({
        query: {
            select: '\'County Name\'',
            from: ft_id
        },
        options: statics.ft_styles[region]
    });
    layer.setMap(map);
    queryText = MAP_APP.get_fusiontableQueryText(ft_id, null, null, null);
    MAP_APP.zoomToFusiontable(queryText);
}

var initialize_test = function(mapId, token) {
    // The Google Maps API calls getTileUrl() when it tries to display a map
    // tile.  This is a good place to swap in the MapID and token we got from
    // the Python script. The other values describe other properties of the
    // custom map type.
    var eeMapOptions = {
        getTileUrl: function(tile, zoom) {
            var baseUrl = 'https://earthengine.googleapis.com/map';
            var url = [baseUrl, mapId, zoom, tile.x, tile.y].join('/');
            url += '?token=' + token;
            return url;
        },
        tileSize: new google.maps.Size(256, 256)
    };

    // Create the map type.
    var mapType = new google.maps.ImageMapType(eeMapOptions);

    var myLatLng = new google.maps.LatLng(-34.397, 150.644);
    var mapOptions = {
        center: myLatLng,
        zoom: 8,
        maxZoom: 10,
        streetViewControl: false
    };

    // Create the base Google Map.
    var map = new google.maps.Map(
        document.getElementById('main-map'), mapOptions);

    // Add the EE layer to the map.
    map.overlayMapTypes.push(mapType);
}

