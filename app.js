const axios = require('axios');
const crypto = require('crypto')
const FormData = require('form-data');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');


module.exports = async function boot(additional) {
  console.log('init payment');

  const { amount, description, ...other } = additional;

  const env = {
    paybox_url: 'https://api.freedompay.money/init_payment.php', // Базовый url для API(По умолчанию https://api.freedompay.money)
    paybox_merchant_id: '548469', // ID магазина на стороне FreedomPay
    paybox_merchant_secret: 'cJXMfnuxLWnF4MnJ', // Секретный ключ(для приема платежей) магазина на стороне FreedomPay
    result_url: '', // result_url
  }
  
  const initPaymentData = {
    pg_order_id: uuidv4(), // Идентификатор платежа в системе мерчанта. Рекомендуется поддерживать уникальность этого поля.
    pg_merchant_id: env.paybox_merchant_id, // Идентификатор мерчанта в FreedomPay Выдается при подключении.
    pg_amount: amount, // Сумма платежа в валюте pg_currency.
    pg_description: description, // Описание товара или услуги. Отображается покупателю в процессе платежа.
    pg_salt: 'some random string',
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
