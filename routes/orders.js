var express = require('express');
var router = express.Router();
const got = require('got');

var db = null; 
require("../configs/databaseConnection").then(pool => {
    db = pool;
});

/* POST new order */
router.post('/', async function(req, res, next) {

  console.debug(req);
  
  // let exist = await checkExisting(req.body.wc_order_id);
  let checkOrder = await db.query(`SELECT * from TDaftarOnline where wc_order_id = ${req.body.wc_order_id}`);
  console.debug(checkOrder);

  if(checkOrder.recordset[0] !== []){
    res.status(409);
    console.debug(checkOrder);
    // let checkOrder = await db.query(`SELECT * from TDaftarOnline where wc_order_id = ${req.body.wc_order_id}`);
    return res.json(checkOrder.recordset[0].order_id);
    // return res.json({
    //   message: 'resource exist'
    // });  
  } else {
    console.log('new order received!')
  }

  let number = await getFormatedOrderId();
  let orderId = `DO-${yearMonth()}-${pad(number,4)}`;
  
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
    '${timestamp()}',
    0,
    '${req.body.tgl_lahir}',
    '${req.body.jenis_kelamin}'
  )`;

  // if(typeof(req.body.items) !== 'undefined' && req.body.items.length > 0) {
    try {
      req.body.items.forEach(async item => {

        let disc = item.discount || 0;
        let total = disc !== 0 ? (parseFloat(item.price) - (disc*parseFloat(item.price)/100)) : parseFloat(item.price);

        let itemQuery = `INSERT INTO TDaftarOnline_details VALUES (
          ${req.body.wc_order_id}, 
          '${orderId}', 
          '${item.product_id}',
          '${item.name}',
          ${item.qty},
          ${item.price},
          ${disc},
          ${total},
          '${item.remarks || null}',
          '${timestamp()}', 
          '${timestamp()}',
          '${item.sku}'        
        )`;
        let itemSave = await db.query(itemQuery);
        console.log('Added new item :');    
        console.log(itemSave);
      });
      
    } catch (error) {
      console.log('Add new item error');    
      console.log(error);    
    }
  // }
  
  try {
    // let order = await db.query(query);
    let checkOrder = await db.query(`SELECT * from TDaftarOnline where wc_order_id = ${req.body.wc_order_id}`);
    
    console.log(order);
    incrementNumber(parseInt(number)+1);

    // return res.json({
    //   message: 'success',
    //   data: checkOrder,
    //   response: order
    // });
    res.status(200);

    return res.json(checkOrder.recordset[0].order_id);

  } catch (e) {
    res.status(400);
    return res.json(e);  
  }

});

async function checkExisting(id) {
  try {
    let checkOrder = await db.query(`SELECT * from TDaftarOnline where wc_order_id = ${id}`);

    if(checkOrder.rowsAffected[0] > 0){
      return 1;
    } else {
      return 0;
    }     
  } catch (e) {
    console.log(e);
    return 0;  
  }
}

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

async function getFormatedOrderId() {

  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  const dateLocal = new Date(now.getTime() - offsetMs);
  
  let month = dateLocal.getMonth()+1;

  try {
    let data = await db.query(`SELECT * from TDaftarOnline_increments where month = '${month}'`);

    let number = data.recordset[0].number;

    //check year change
      let year = new Date(data.recordset[0].updated_at);
      let currentYear = await getCurrentFullDigitYear();
      if(year.getFullYear() !== currentYear) {
        number = 1;
      }
    // end check year
    
    return number;

  } catch (e) {
    console.log (e);  
    return null;
  }
}

async function incrementNumber(number) {

  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  const dateLocal = new Date(now.getTime() - offsetMs);
  
  let month = dateLocal.getMonth()+1;

  try {
    let data = await db.query(`UPDATE TDaftarOnline_increments SET number = ${number} , updated_at = '${timestamp()}' where month = '${month}'`);
    console.log(data)
  } catch (e) {
    console.log (e);  
  }
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

async function getCurrentFullDigitYear(date) {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  const dateLocal = new Date(now.getTime() - offsetMs);
  
  var getYear =  dateLocal.getFullYear(); // get current year

  return getYear;
}

function timestamp() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  const dateLocal = new Date(now.getTime() - offsetMs);
  const str = dateLocal.toISOString().slice(0, 19).replace(/-/g, "/").replace("T", " ");
  return str;  
}

module.exports = router;
