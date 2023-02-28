/**
* @author Maxim Vasilkov maxim@nfttrx.com
* @project: NFTTRX.com
* @date: 13th Jan 2022
**/

const functions = require('firebase-functions');
const firebase = require('firebase-admin');


// https://medium.com/wesionary-team/callable-function-how-to-write-and-deploy-a-callable-function-9eb8c109186e
exports.ping = functions.https.onCall(async(data, context) => {
    if (!context.auth) {
      // Throwing an HttpsError so that the client gets the error details.
      throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
          'while authenticated.');
    }
    
    return 'hello';
});