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

app.get('/etdata', db.getEtdata)
app.get('/etdata/:id', db.getEtdataById)
app.post('/etdata', db.postEtdata)
app.post('/etdatarange', db.postEtdataRange)

app.listen(port, () => {
  console.log(`App running on port ${port}.`)
})

