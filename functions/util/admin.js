const admin = require('firebase-admin');
//const serviceAccount = require('./../../socialapp-cd66b-firebase-adminsdk-rgpp9-7d83259b74.json');

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://socialapp-cd66b.firebaseio.com"
});
//admin.initializeApp();
const db = admin.firestore();

module.exports = { admin, db };