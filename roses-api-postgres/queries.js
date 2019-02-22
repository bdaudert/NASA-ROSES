
const Pool = require('pg').Pool
// Credentials for test database, remove from source control for production API!!!!
const config = require('./config.json')

const pool = new Pool({
  user: config.postgis_user,
  host: config.postgis_host,
  database: config.postgis_database,
  password: config.postgis_password,
  port: config.postgis_port,
})
/*
const pool = new Pool({
  user: config.vTile_user,
  host: config.vTile_host,
  database: config.vTile_database,
  password: config.vTile_password,
  port: config.vTile_port,
})
*/

const test = (request, response) => {
    const fc = String(request.params.feature_collection_name);
    console.log(fc);
    pool.query('SELECT COUNT(roses.feature.feature_id) FROM roses.feature WHERE roses.feature.feature_collection_name = $1', [fc],
        (error, results) => {
          if (error) {
            throw error;
          }
          response.status(200).json(results.rows)
      })
}

const get_getMapGeojson = (request, response) => {
     const uid = parseInt(request.params.user_id);
     const fc = String(request.params.feature_collection_name);
     const sd = String(request.params.start_date);
     const ed = String(request.params.end_date);
     const m = String(request.params.model);
     const v = String(request.params.variable);
     const tr = String(request.params.temporal_resolution);

     pool.query(
       `SELECT 
       ST_AsGeoJSON(roses.feature.geometry) AS geom, 
       roses.feature.feature_id AS feat_id,
       json_agg(roses.feature_metadata.feature_metadata_name) AS meta_name,
       json_agg(roses.feature_metadata.feature_metadata_name) AS meta_value,
       roses.timeseries.start_date AS sd,
       roses.timeseries.end_date AS ed,
       roses.timeseries.data_value AS dv
       FROM
       roses.timeseries
       LEFT JOIN roses.data ON roses.data.timeseries_id = roses.timeseries.timeseries_id
       LEFT JOIN roses.feature ON roses.feature.feature_id = roses.data.feature_id
       LEFT JOIN roses.feture_metadata ON roses.feature_metadata.feature_id = roses.data.feature_id
       WHERE
       roses.feature.feature_collection_name = $1
       AND roses.timeseries.start_date >= $2::timestamp
       AND roses.timeseries.end_date <= $2::timestamp
       AND roses.data.user_id = $4
       AND roses.data.model_name = $5
       AND roses.data.variable_name = $6
       AND roses.data.temporal_resolution = $7
       ORDER BY roses.feature.feature_id`, [fc, sd, ed, uid, m, v, tr],
       (error, results) => {
          if (error) {
            throw error;
          }
          response.status(200).json(results.rows)
      })
}
const post_getMapGeojson = (request, response) => {
    const { fc, sd, ed, uid, m, v, tr } = request.body
    pool.query(
       'SELECT' +
       ' ST_AsGeoJSON(roses.feature.geometry) AS geom,' +
       ' roses.feature.feature_id AS feat_id,' +
       ' json_agg(roses.feature_metadata.feature_metadata_name) AS meta_name,' +
       ' json_agg(roses.feature_metadata.feature_metadata_name) AS meta_value,' +
       ' roses.timeseries.start_date AS sd,' +
       ' roses.timeseries.end_date AS ed,' +
       ' roses.timeseries.data_value AS dv' +
       ' FROM' +
       ' roses.timeseries' +
       ' LEFT JOIN roses.data ON roses.data.timeseries_id = roses.timeseries.timeseries_id' +
       ' LEFT JOIN roses.feature ON roses.feature.feature_id = roses.data.feature_id' +
       ' LEFT JOIN roses.feture_metadata ON roses.feature_metadata.feature_id = roses.data.feature_id' +
       ' WHERE' +
       ' roses.feature.feature_collection_name = $1' +
       ' AND roses.timeseries.start_date >= $2::timestamp' +
       ' AND roses.timeseries.end_date <= $2::timestamp' +
       ' AND roses.data.user_id = $4' +
       ' AND roses.data.model_name = $5' +
       ' AND roses.data.variable_name = $6' +
       ' AND roses.data.temporal_resolution = $7' +
       ' ORDER BY roses.feature.feature_id', [fc, sd, ed, uid, m, v, tr],
       (error, results) => {
          if (error) {
            throw error;
          }
          response.status(201).json(results.rows)
    })
}


const getEtdata = (request, response) => {
  pool.query('SELECT ogc_fid, cmdtymast, acresmast, et_2017 FROM base15_ca_poly_170616_data_all ORDER BY ogc_fid ASC', (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
}

const getEtdataById = (request, response) => {
  const id = parseInt(request.params.id)

  pool.query('SELECT ogc_fid, cmdtymast, acresmast, et_2017 FROM base15_ca_poly_170616_data_all WHERE ogc_fid = $1', [id], (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
}

const postEtdata = (request, response) => {
  const { ogc_fid } = request.body

  pool.query('SELECT ogc_fid, cmdtymast, acresmast, et_2017 FROM base15_ca_poly_170616_data_all WHERE ogc_fid = $1', [ogc_fid], (error, results) => {
    if (error) {
      throw error
    }
    response.status(201).json(results.rows)
  })
}

const postEtdataRange = (request, response) => {
  const { min, max } = request.body

  pool.query('SELECT ogc_fid, cmdtymast, acresmast, et_2017 FROM base15_ca_poly_170616_data_all WHERE et_2017 > $1 AND et_2017 < $2', [min, max], (error, results) => {
    if (error) {
      throw error
    }
    response.status(201).json(results.rows)
  })
}

module.exports = {
  getEtdata,
  getEtdataById,
  postEtdata,
  postEtdataRange,
  test,
  get_getMapGeojson,
  post_getMapGeojson
}
