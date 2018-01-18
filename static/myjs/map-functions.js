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
    
    // Darwing Manager
    var drawingManager = MAP_APP.setDrawingManager();
    drawingManager.setMap(map);
    
    // Fusiontable layer
    var layer = new google.maps.FusionTablesLayer({
        query: {
            select: '\'County Name\'',
            from: '1c4aL4VIVlBhSoxbPxzk_xh-Wo738FZhDOcS3fg'
        }
    });
    layer.setMap(map);
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

