const { json } = require('express');
var express = require('express');
var router = express.Router();
const got = require('got');

var db = null; 
require("../configs/databaseConnection").then(pool => {
    db = pool;
});

/* POST new order */
router.post('/', async function(req, res, next) {
  
  try {
    let checkOrder = await db.query(`SELECT * from TDaftarOnline where wc_order_id = ${req.body.wc_order_id}`);

    if(checkOrder.rowsAffected[0] > 0){
      res.status(409);
      return res.json({
        message:'resource exist',
        // response:checkOrder
      });
    } 
    
    console.log('new order received!')
    
  } catch (e) {
    res.status(400);
    return res.json(e);  
  }

  let orderId = `DO-${yearMonth()}-${pad(req.body.wc_order_id,5)}`;

  let midtrans = await getMidtransData(req.body.wc_order_id);

  let paymentMethod = await getPaymentMethod(midtrans);

  // return res.json(midtrans);

  let query = `INSERT INTO TDaftarOnline VALUES (
    '${orderId}', 
    ${req.body.wc_order_id}, 
    '${timestamp()}', 
    '${req.body.tgl_periksa}', 
    '${req.body.name}', 
    '${req.body.address}', 
    '${req.body.email}', 
    ${req.body.phone}, 
    ${req.body.ktp}, 
    ${req.body.total}, 
    '${midtrans.transaction_status}', 
    '${midtrans.transaction_time}', 
    '${midtrans.transaction_id}', 
    ${midtrans.gross_amount}, 
    '${paymentMethod.method}', 
    '${paymentMethod.number}', 
    '${JSON.stringify(midtrans)}', 
    '${timestamp()}', 
    '${timestamp()}'
  )`;
  
  try {
    let order = await db.query(query);
    let checkOrder = await db.query(`SELECT * from TDaftarOnline where wc_order_id = ${req.body.wc_order_id}`);
    
    console.log(order)
    return res.json({
      message: 'success',
      data: checkOrder,
      response: order
    });
  } catch (e) {
    res.status(400);
    return res.json(e);  
  }

});

async function getPaymentMethod (midtrans) {
  
  if(midtrans.payment_type == 'bank_transfer'){
    return {
      method: `${midtrans.payment_type} - ${midtrans.va_numbers[0].bank}`,
      number: `${midtrans.va_numbers[0].va_number}`
    };
  }

  if(midtrans.payment_type == 'credit_card'){
    return {
      method: `${midtrans.payment_type} - ${midtrans.bank}`,
      number: `${midtrans.masked_card}`
    };
  }

  if(midtrans.payment_type == 'cstore'){
    return {
      method: `${midtrans.payment_type} - ${midtrans.store}`,
      number: `${midtrans.payment_code}`
    };
  }

  if(midtrans.payment_type == 'bca_klikpay'){
    return {
      method: `${midtrans.payment_type}`,
      number: `${midtrans.approval_code}`
    };
  }

  return {
    method: `${midtrans.payment_type}`,
    number: null
  };  
}

async function getMidtransData(id) {
  let url = process.env.ENVIRONMENT == 'production' ? process.env.MIDTRANS_PROD_URL : process.env.MIDTRANS_SANDBOXED_URL;

  let apiUrl = `${url}/v2/${id}/status`;
  
  console.log(apiUrl);

  try {
    const response = await got.get(apiUrl, {
      hooks: {
        beforeRequest: [
          options => {
            options.auth = `${process.env.MIDTRANS_SERVER_KEY}:`;
          }
        ]
      },
      responseType: 'json'
    });
    console.log(response.body);
    return response.body;
  } catch (e) {
    res.status(400);
    return res.json(e);  
  }
}

function pad(num, size) {
  var s = "00000" + num;
  return s.substr(s.length-size);
}

function yearMonth() {

  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  const dateLocal = new Date(now.getTime() - offsetMs);
  
  var getYear =  dateLocal.getFullYear(); // get current year
  var getTwodigitYear = getYear.toString().substring(2);

  let year = getTwodigitYear;
  let month = dateLocal.getMonth()+1;

  return `${year}${pad(month,2)}`;
}

function timestamp() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  const dateLocal = new Date(now.getTime() - offsetMs);
  const str = dateLocal.toISOString().slice(0, 19).replace(/-/g, "/").replace("T", " ");
  return str;  
}

module.exports = router;
