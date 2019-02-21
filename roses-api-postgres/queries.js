const Pool = require('pg').Pool
// Credentials for test database, remove from source control for production API!!!!
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'test',
  password: '',
  port: 5432,
})


const getMapGeojson = (request, response) => {
     const uid = parseInt(request.params.user_id);
     const fc = String(request.params.feature_collection_name);
     const sd = String(request.params.start_date);
     const ed = String(request.params.end_date);
     const m = String(request.params.model);
     const v = String(request.params.variable);
     const tr = String(request.params.temporal_resolution);

     pool.query(
       'SELECT\n' +
       '        ST_AsGeoJSON(roses.feature.geometry) AS geom,\n' +
       '        roses.feature.feature_id AS feat_id,\n' +
       '        json_agg(roses.feature_metadata.feature_metadata_name) AS meta_name,\n' +
       '        json_agg(roses.feature_metadata.feature_metadata_name) AS meta_value,\n' +
       '        roses.timeseries.start_date AS sd,\n' +
       '        roses.timeseries.end_date AS ed,\n' +
       '        roses.timeseries.data_value AS dv\n' +
       '        \n' +
       '        FROM\n' +
       '        roses.timeseries\n' +
       '        LEFT JOIN roses.data ON roses.data.timeseries_id = roses.timeseries.timeseries_id\n' +
       '        LEFT JOIN roses.feature ON roses.feature.feature_id = roses.data.feature_id\n' +
       '        LEFT JOIN roses.feture_metadata ON roses.feature_metadata.feature_id = roses.data.feature_id\n' +
       '        \n' +
       '        WHERE\n' +
       '        roses.feature.feature_collection_name = $1\n' +
       '        AND roses.timeseries.start_date >= $2::timestamp\n' +
       '        AND roses.timeseries.end_date <= $2::timestamp\n' +
       '        AND roses.data.user_id = $4\n' +
       '        AND roses.data.model_name = $5\n' +
       '        AND roses.data.variable_name = $6\n' +
       '        AND roses.data.temporal_resolution = $7\n' +
       '        ORDER BY roses.feature.feature_id', [fc, sd, ed, uid, m, v, tr],
       (error, results) => {
          if (error) {
            throw error;
          }
          response.status(200).json(results.rows)
      })
}

/*
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
}
*/