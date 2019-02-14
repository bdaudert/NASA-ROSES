const Pool = require('pg').Pool
// Credentials for test database, remove from source control for production API!!!!
const pool = new Pool({
  user: 'jhansen',
  host: 'localhost',
  database: 'cv_data_all',
  password: '',
  port: 5432,
})

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
