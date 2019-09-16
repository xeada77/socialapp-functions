const admin = require('firebase-admin');
const serviceAccount = require('./../../socialapp-cd66b-firebase-adminsdk-rgpp9-7d83259b74.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
//admin.initializeApp();
const db = admin.firestore();

module.exports = { admin, db };