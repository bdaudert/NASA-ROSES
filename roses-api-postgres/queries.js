
const Pool = require('pg').Pool
// Credentials for test database, remove from source control for production API!!!!
const config = require('./config.json')

const pool_britta = new Pool({
  user: config.postgis_user,
  host: config.postgis_host,
  database: config.postgis_database,
  password: config.postgis_password,
  port: config.postgis_port,
})

const pool_jody = new Pool({
  user: config.vTile_user,
  host: config.vTile_host,
  database: config.vTile_database,
  password: config.vTile_password,
  port: config.vTile_port,
})


async function my_query(sql, params, pool, schema, response, html_code) {
    // Get a connection from the pool:
    let client = await pool.connect();
    try {
        // Run our custom SQL to set search_path
        await client.query('SET search_path TO ' + schema);
        // Run the actual SQL we want to execute
        const results = await client.query(sql, params);
        //console.log(results.rows);
        response.status(200).json(results.rows);
        // This is done in two steps so that we can catch the error and discard the connection
        //return results.rows;
    } catch(error) {
        // Release the connection back to the pool
        client.release(error);
        client = null;
        // Throw the original error so the caller gets it
        throw error;
    } finally {
        if (client) {
            // Work completed successfully so release the connection back to the pool for reuse
            client.release();
        }
    }
}


function test(request, response) {
    var sql_text =  `
      SELECT * 
      FROM roses.feature WHERE roses.feature.feature_id = $1
    `;
    var params = [];
    if (request.query.feature_id){
        params = [request.query.feature_id];
    }else{
        params = [1];
    }
    my_query(sql_text, params, pool_britta, 'test', response, 200);
}

function getMapGeojson (request, response) {
    var html_code, params, sql_text;
    if (request.method == "GET") {
        var uid = parseInt(request.query.user_id);
        var fc = String(request.query.feature_collection_name);
        var sd = String(request.query.start_date);
        var ed = String(request.query.end_date);
        var model = String(request.query.model);
        var variable = String(request.query.variable);
        var tr = String(request.query.temporal_resolution);
        html_code = 200;
    }else{
        var { uid, fc, sd, ed, model, variable, tr } = request.body;
        html_code = 201;
    }
    params = [fc, sd, ed, uid, model, variable, tr];
    sql_text = `
        SELECT
        /*ST_AsGeoJSON(roses.feature.geometry) AS geom,*/
        roses.feature.feature_id AS feat_id,
        roses.feature_metadata.feature_metadata_name AS meta_name,
        roses.feature_metadata.feature_metadata_name AS meta_value,
        roses.timeseries.start_date AS sd,
        roses.timeseries.end_date AS ed,
        roses.timeseries.data_value AS dv
        FROM
        roses.timeseries
        LEFT JOIN roses.data ON roses.data.timeseries_id = roses.timeseries.timeseries_id
        LEFT JOIN roses.feature ON roses.feature.feature_id = roses.data.feature_id
        LEFT JOIN roses.feature_metadata ON roses.feature_metadata.feature_id = roses.data.feature_id
        WHERE
        roses.feature.feature_collection_name = $1
        AND roses.timeseries.start_date >= $2::timestamp
        AND roses.timeseries.end_date <= $3::timestamp
        AND roses.data.user_id = $4
        AND roses.data.model_name = $5
        AND roses.data.variable_name = $6
        AND roses.data.temporal_resolution = $7
        ORDER BY roses.feature.feature_id
    `
    my_query(sql_text, params, pool_britta, 'test', response, html_code);
}

function getEtdata (request, response) {
    var sql_text, params = ''
    if (request.query.id){
        sql_text = 'SELECT ogc_fid, cmdtymast, acresmast, et_2017 FROM base15_ca_poly_170616_data_all WHERE ogc_fid = $1'
        params = [parseInt(request.query.id)]
    }else{
        sql_text = 'SELECT ogc_fid, cmdtymast, acresmast, et_2017 FROM base15_ca_poly_170616_data_all ORDER BY ogc_fid ASC'
    }
    pool_jody.query(
      sql_text, params,
      function (error, results) {
          if (error) {
              throw error
          }
          response.status(200).json(results.rows)
    })
}

const postEtdata = (request, response) => {
  const { ogc_fid } = request.body

  pool_jody.query(
      'SELECT ogc_fid, cmdtymast, acresmast, et_2017 FROM base15_ca_poly_170616_data_all WHERE ogc_fid = $1',
      [ogc_fid],
      (error, results) => {
          if (error) {
              throw error
          }
          response.status(201).json(results.rows)
      })
}

const postEtdataRange = (request, response) => {
  const { min, max } = request.body

  pool_jody.query(
      'SELECT ogc_fid, cmdtymast, acresmast, et_2017 FROM base15_ca_poly_170616_data_all WHERE et_2017 > $1 AND et_2017 < $2',
      [min, max],
      (error, results) => {
          if (error) {
              throw error
          }
          response.status(201).json(results.rows)
      })
}

module.exports = {
    test,
    getMapGeojson,
    getEtdata,
    //getEtdataById,
    postEtdata,
    postEtdataRange
}
