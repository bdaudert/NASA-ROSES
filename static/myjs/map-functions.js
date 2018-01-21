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
    },
    populate_dataModal: function(ft_id, e){
        // e is the click event
        var col_name, col_names = [], t_res,
            m_idx, m_str, c_idx, data_val,
            html, data_div = $('#modal_data');
            //Title
            html = $('#variable').val();
            if ($('#form-field_year').css('display') != 'none'){
                html += ' Year ' + $('#field_year').val();
            }
            $('#dataModal_title').append(html);
            html = '';
            //Populate the columnnames
            t_res = $('#temporal_resolution').val();
            m_str = '';
            if (t_res == 'M'){
                for (m_idx = 1; m_idx <= 12; m_idx++){
                    m_str = String(m_idx);
                    if (m_idx < 10) {
                        m_str = '0' + m_str;
                    }
                    col_name = $('#variable').val() + '_' + t_res + m_str;
                    col_names.push(col_name);
                }
            }
            else{
                col_names.push($('#variable').val() + '_' + t_res);
            }
            //populate html with data
            for (c_idx = 0; c_idx < col_names.length; c_idx++){
                col_name = col_names[c_idx];
                data_val = e.row[col_name].value;
                html += col_name + ': ' + data_val + '<br>'
            }
            $('#dataModal_data').append(html);
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
    var layer = new google.maps.FusionTablesLayer({
        query: {
            select: '\'County Name\'',
            from: ft_id
        },
        options: statics.ft_styles[region]
    });
    google.maps.event.addListener(layer, 'click', function(e) {
        //Hide old data modal
        $('#dataModal').modal('hide');
        $('#dataModal_data').html('');
        MAP_APP.populate_dataModal(ft_id, e);
        $('#dataModal').modal('toggle');
    });
    layer.setMap(map);
    queryText = MAP_APP.get_fusiontableQueryText(ft_id, null, null, null);
    MAP_APP.zoomToFusiontable(queryText);
}
