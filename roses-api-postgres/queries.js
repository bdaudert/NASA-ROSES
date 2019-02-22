
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
    var sql_text =  'SELECT * FROM roses.feature WHERE roses.feature.feature_id = $1';
    var params = [];
    if (request.query.feature_id){
        params = [request.query.feature_id];
    }else{
        params = [1];
    }
    my_query(sql_text, params, pool_britta, 'test', response, 200);
}

function get_getMapGeojson (request, response) {
}

function post_getMapGeojson (request, response) {}

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
    get_getMapGeojson,
    post_getMapGeojson,
    test,
    getEtdata,
    //getEtdataById,
    postEtdata,
    postEtdataRange
}
