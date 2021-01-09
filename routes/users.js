var express = require('express');
var router = express.Router();

var db = null; 
require("../configs/databaseConnection").then(pool => {
    db = pool;
});

/* GET users listing. */
router.get('/', async function(req, res, next) {
  let staff = await db.query`select * from staff`;
  res.send(staff);
});

module.exports = router;
