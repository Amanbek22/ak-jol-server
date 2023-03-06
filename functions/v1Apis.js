const safeJsonStringify = require("safe-json-stringify");
const functions = require("firebase-functions");
const firebase = require("firebase-admin");
const { getStorage } = require("firebase-admin/storage");
const cors = require("cors");
const express = require("express");
const axios = require('axios');
const crypto = require('crypto')
const FormData = require('form-data');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');
const e = require("express");

// Let's start express for API
const app = express();

// Automatically allow cross-origin requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.options("*", cors());

// The var represents firestore db
let db = firebase.firestore();



async function boot(additional) {
  console.log('init payment');

  const { amount, description, ...other } = additional;

  const env = {
    paybox_url: 'https://api.freedompay.money/init_payment.php', // Базовый url для API(По умолчанию https://api.freedompay.money)
    paybox_merchant_id: '548469', // ID магазина на стороне FreedomPay
    paybox_merchant_secret: 'cJXMfnuxLWnF4MnJ', // Секретный ключ(для приема платежей) магазина на стороне FreedomPay
    result_url: 'https://us-central1-ak-jol.cloudfunctions.net/v1/webhook/payment-result', // result_url
  }
  
  const initPaymentData = {
    pg_order_id: uuidv4(), // Идентификатор платежа в системе мерчанта. Рекомендуется поддерживать уникальность этого поля.
    pg_merchant_id: env.paybox_merchant_id, // Идентификатор мерчанта в FreedomPay Выдается при подключении.
    pg_amount: amount, // Сумма платежа в валюте pg_currency.
    pg_description: description, // Описание товара или услуги. Отображается покупателю в процессе платежа.
    pg_salt: 'some random string',
    pg_result_url: env.result_url,
    pg_success_url: '',
    pg_failure_url: '',
    ...other
  }

  function sortObjectKeysAlphabetically(obj) {
    const keys = Object.keys(obj).sort();
    const sortedObj = {};
    
    for (let key of keys) {
      sortedObj[key] = obj[key];
    }
    
    return sortedObj;
  }
  
  
  const sortedObj = sortObjectKeysAlphabetically(initPaymentData);
  const convertedToArr = Object.values(sortedObj);
  
  convertedToArr.unshift('init_payment.php');
  convertedToArr.push(env.paybox_merchant_secret);
  
  initPaymentData.pg_sig = crypto.createHash('md5').update(convertedToArr.join(';')).digest("hex")
  
  const formData = new FormData();
  
  for (const key in initPaymentData) {
    formData.append(key, initPaymentData[key]);
  }

  const result = await axios.post(env.paybox_url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
  });

  console.log(initPaymentData)

  let resultObj;

  xml2js.parseString(result.data, function(err, result) {
      if (err) {
        resultObj = err;
      } else {
        resultObj = result
      }
  });

  return resultObj;
}


app.post("/paymentinit", async (req, res) => {
  const additional = {
    tourStartDate: req.body.tourStartDate,
    places: req.body.places,
    schedule: req.body.schedule,
    time: req.body.time,
    tourId: req.body.tourId,
    transportId: req.body.transportId,
    userId: req.body.userId,
    amount: req.body.amount,
    description: req.body.description,
    orderId: req.body?.orderId,
  };

  const result = await boot(additional);
  console.log("RESULT=========57========>",result);
  res.json(result);
});

// На этот ендпойт будет приходить запрос от paybox. Это наш вебхук. Пример https://localhost:3000/webhook/payment-result
// Мы здесь получаем данные в req.body. Все нужные данные я уже достал тут. Нужно теперь просто записать их в firbase.
// Когда задеплойим, от vercel мы получим домен https://{domen}/webhook/payment-result.
// Этот домен нужно дать мне. Я его пропишу в настройки paybox.
const placesConst = {
  1: false, 
  2: false,
  3: false,
  4: false,
  5: false,
  6: false,
  7: false,
  8: false,
  9: false,
  11: false,
  12: false,
  13: false,
  14: false,
  15: false,
  16: false,
  17: false,
}
app.post("/webhook/payment-result", async (req, res) => {
  const {
    pg_order_id,
    pg_payment_id,
    pg_amount,
    pg_currency,
    pg_description,
    tourStartDate,
    places,
    schedule,
    time,
    tourId,
    transportId,
    userId,
    orderId,
  } = req.body;

  const addChecks = async () => {
    db.collection('userOrders').add(req.body)
  }

  console.log('=======135==========>', req.body);

  const selectedPlaces = places.split(',');
  console.log(selectedPlaces);
  if(orderId) {

    const currentOrderRef = await db.collection("orders").doc(orderId).get();
    const currentOrder = currentOrderRef.data();
    const orderPlaces = currentOrder.places;

    selectedPlaces.forEach((el) => {
      if(orderPlaces[el] === false) {
        orderPlaces[el] = req.body;
      }
    })
    console.log('===========174========>', orderPlaces);
    db.collection('orders').doc(orderId).update({places: orderPlaces})
    addChecks()
  } else {
    selectedPlaces.forEach((el) => {
      if(placesConst[el] === false) {
        placesConst[el] = req.body;
      }
    })

    db.collection('orders').add({
      date: tourStartDate,
      time,
      tourId,
      transportId,
      schedule,
      places: placesConst
    })
    addChecks()
  }


  res.json({
    pg_order_id,
    pg_payment_id,
    pg_amount,
    pg_currency,
    pg_description,
    tourStartDate,
    places,
    schedule,
    time,
    tourId,
    transportId,
    userId,
    orderId,
  });
});


app.get("/orders", async (req, res) => {
  const q = req.query;
  try {
    if (q.tourId && q.date) {
      const tourRef = await db.collection("tours").doc(q.tourId).get();
      const tour = tourRef.data();
      console.log("TOOOOOOOOOUR==========>", tourRef.id, tour.from.id);
      const half_expressData = [];
      const expressData = await db
        .collection("transports")
        .where("type", "==", "half_express")
        .where("fromId", "==", tour.from.id)
        .where("miniStops", "array-contains", tour.to)
        .get();
      expressData.forEach((doc) => {
        const s = doc.data().stops.find((el) => el.id === tour.to.id);
        half_expressData.push({
          transportId: doc.id,
          ...doc.data(),
          price: s?.price || tour.price,
        });
      });

      let data = [];
      const snap = await db
        .collection("transports")
        .where("tourId", "==", q.tourId)
        .get();
      snap.forEach((doc) => {
        data.push({ transportId: doc.id, ...doc.data(), price: tour.price });
      });
      const orderData = [];
      const orderSnap = await db
        .collection("orders")
        .where("schedule", "==", q.date)
        .get();
      orderSnap.forEach((doc) => {
        orderData.push({orderId: doc.id,...doc.data()});
      });

      // half_expressData
      // data
      // orderData

      if (half_expressData.length) {
        if (!data.length) {
          data = half_expressData;
        } else if (data.length) {
          data = [...data, ...half_expressData];
        }
      }

      if (orderData.length) {
        const newTransports = data.map((item) => {
          const el = orderData.find(
            (order) => order.transportId === item.transportId
          );
          if (el) {
            let placesCount = 17;
            const placesKeys = Object.keys(el.places);
            placesKeys.forEach((p) => {
              if (el.places[p]) {
                placesCount = placesCount - 1;
              }
            });
            return {
              ...item,
              placesCount: placesCount,
              places: el.places,
              orderId: el.orderId,
              orderExist: true,
            };
          }
          return { ...item, placesCount: 17, orderExist: false };
        });
        const result = newTransports.filter(
          (el) => Number(el.placesCount) >= Number(q.places)
        );
        res.json(result);
      } else {
        res.json(
          data.map((item) => ({ ...item, placesCount: 17, orderExist: false }))
        );
      }
    } else {
      throw Error("Need to add tourId and date");
    }
  } catch (err) {
    res.status(err.statusCode || 500).json(err.message);
  }
});

// Public APIs through Express: https://us-central1-nfttrx.cloudfunctions.net/v1
exports.v1 = functions.https.onRequest(app);

// app.listen(3000, () => {
//   console.log(`Example app listening on port 3000`)
// })
