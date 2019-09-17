const functions = require('firebase-functions');
const { db } = require('./util/admin');

const {
    getAllScreams,
    postOneScream,
    getScream,
    commentOnScream,
    likeScream,
    unlikeScream,
    deleteScream,
} = require('./handlers/screams');

const {
    signup,
    login,
    uploadImage,
    addUserDetails,
    getAuthenticatedUser,
    getUserDetails,
    markNotificationsRead,
} = require('./handlers/users');

const FBAuth = require('./util/fbAuth');


const app = require('express')();


// Scream Routes

app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream);
app.get('/scream/:screamId', getScream);
app.delete('/scream/:screamId', FBAuth, deleteScream);
app.post('/scream/:screamId/comment', FBAuth, commentOnScream);
app.get('/scream/:screamId/like', FBAuth, likeScream);
app.get('/scream/:screamId/unlike', FBAuth, unlikeScream);




// User Routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead);

exports.api = functions.region('europe-west1').https.onRequest(app);

exports.createNotificationOnLike = functions.region('europe-west1').firestore.document('likes/{id}').onCreate(async (snapshot) => {

    try {
        const screamDoc = await db.doc(`/screams/${snapshot.data().screamId}`).get();
        if (screamDoc.exists && screamDoc.data().userHandle !== snapshot.data().userHandle) {
            await db.doc(`/notifications/${snapshot.id}`).set({
                createdAt: new Date().toISOString(),
                recipient: screamDoc.data().userHandle,
                sender: snapshot.data().userHandle,
                read: false,
                screamId: screamDoc.id,
                type: 'like'
            });
            return;
        } else {
            console.error({ error: 'Scream not Found' });
            return;
        }

    } catch (err) {
        console.error(err);
        return;
    }
});

exports.deleteNotificationOnUnlike = functions.region('europe-west1').firestore.document('likes/{id}').onDelete(async (snapshot) => { 
    try {
        await db.doc(`/notifications/${snapshot.id}`).delete();
        return;
    } catch (err) {
        console.error(err);
        return;
    }
});

exports.createNotificationOnComment = functions.region('europe-west1').firestore.document('comments/{id}').onCreate(async (snapshot) => {

    try {
        const screamDoc = await db.doc(`/screams/${snapshot.data().screamId}`).get();
        if (screamDoc.exists) {
            await db.doc(`/notifications/${snapshot.id}`).set({
                createdAt: new Date().toISOString(),
                recipient: screamDoc.data().userHandle,
                sender: snapshot.data().userHandle,
                read: false,
                screamId: screamDoc.id,
                type: 'comment'
            });
            return;
        } else {
            console.error({ error: 'Scream not Found' });
            return;
        }

    } catch (err) {
        console.error(err);
        return;
    }
})

exports.onUserImageChange = functions.region('europe-west1').firestore.document('users/{userHandle}').onUpdate(async change => {
    if (change.before.data().imgUrl !== change.after.data().imgUrl) {
        
        console.log('Updating User Image');
        const batch = db.batch();

        const screamsDocs = await db.collection('screams').where('userHandle', '==', change.before.data().userHandle).get();

        screamsDocs.forEach(doc => {
            batch.update(doc.ref, { userImg: change.after.data().imgUrl });
        });
        await batch.commit();
        console.log('User Image updated');
        return;
    } else {
        console.log('No user image changes, updating cancelled');
        return;
    }
})