
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
        console.log(results);
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


function testJson (request, response) {
    var html_code, params, sql_text;
    if (request.method == "GET") {
        var uid = parseInt(request.query.user_id);
        var fc = String(request.query.feature_collection_name);
        var year = parseInt(request.query.year);
        html_code = 200;
    }else{
        var { uid, fc, year} = request.body;
        html_code = 201;
    }
    params = [uid, fc, year];
    sql_text = `
        SELECT
        /*ST_AsGeoJSON(roses.feature.geometry) AS geom,*/
        roses.feature.feature_collection_name as feature_collection_name,
        roses.feature.feature_id AS feature_id,
        roses.feature_metadata.feature_metadata_name AS metadata_name,
        roses.feature_metadata.feature_metadata_name AS metadata_properties,
        roses.feature.year AS feature_year
        FROM
        roses.feature 
        LEFT JOIN roses.feature_collection ON roses.feature_collection.feature_collection_name = roses.feature.feature_collection_name
        LEFT JOIN roses.feature_metadata ON roses.feature_metadata.feature_metadata_id = roses.feature.feature_id
        WHERE
        roses.feature_collection.user_id = $1
        AND roses.feature_collection.feature_collection_name = $2
        AND roses.feature.year = $3
        ORDER BY roses.feature.feature_id
    `
    my_query(sql_text, params, pool_britta, 'test', response, html_code);
}

function getMapGeojson (request, response) {
    var html_code, params, sql_text;
    if (request.method == "GET") {
        var uid = parseInt(request.query.user_id);
        var fc = String(request.query.feature_collection_name);
        var year = parseInt(request.query.year);
        html_code = 200;
    }else {
        var {uid, fc, year} = request.body;
        html_code = 201;
    }
    params = [uid, fc, year];
    sql_text = `
        SELECT row_to_json(fc) FROM (
          SELECT 'FeatureCollection' AS type, array_to_json(array_agg(f)) AS features FROM (
            SELECT 'Feature' AS type, ST_AsGeoJSON(lg.geometry)::json AS geometry FROM roses.feature as lg LIMIT 10
          ) AS f
        ) AS fc  
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
    testJson,
    getMapGeojson,
    getEtdata,
    //getEtdataById,
    postEtdata,
    postEtdataRange
}
