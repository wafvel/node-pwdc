const sql = require('mssql')

// var config = {
//     user: process.env.DB_USERNAME,
//     password: process.env.DB_PASSWORD,
//     server: process.env.DB_HOSTNAME, 
//     database: process.env.DB_NAME,
//     options: {
//       enableArithAbort: true
//       }
//  };
 
let pool = sql.connect(process.env.MSSQL_URL)
module.exports = pool;