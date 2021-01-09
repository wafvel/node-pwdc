const sql = require('mssql')
let pool = sql.connect(process.env.MSSQL_URL)
module.exports = pool;