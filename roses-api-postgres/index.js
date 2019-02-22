#!/usr/bin/env node

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const db = require('./queries')
const port = 3000

app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.get('/', (request, response) => {
  response.json({ info: 'Node.js, Express, and Postgres API' })
})

/*
app.get('/map_geojson/:user_id/:feature_collection_name/:start_date/:end_date/:model/:variable/:temporal_resoution', db.get_getMapGeojson)
app.post('/map_geojson', db.post_getMapGeojson)
*/
app.get('/test', db.test)
app.get('/etdata', db.getEtdata)
//NOTE to Jody: this was not working the way you had it, it just spit out data for all ids just like
//getEtdata, for now I combined the two functions into getEtdata
//app.get('/etdata/:id', db.getEtdataById)
app.post('/etdata', db.postEtdata)
app.post('/etdatarange', db.postEtdataRange)


app.listen(port, () => {
  console.log('App running on port ' + String(port));
})

