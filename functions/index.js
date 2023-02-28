const firebase = require("firebase-admin");
const functions = require('firebase-functions');
const safeJsonStringify = require("safe-json-stringify");
const axios = require("axios");

const app = firebase.initializeApp({
  serviceAccount: "nfttrx-firebase-adminsdk-i5f5o-417e9646ec.json",
  databaseURL: "https://nfttrx-default-rtdb.europe-west1.firebasedatabase.app",
  storageBucket: "nfttrx.appspot.com",
});



// Public APIs which works through Express
const v1Apis = require("./v1Apis");
exports.v1 = v1Apis.v1;


