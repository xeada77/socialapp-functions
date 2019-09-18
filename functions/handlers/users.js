const firebase = require('firebase');
const {db, admin} = require('./../util/admin');
const config = require('./../util/config');
const { validateSignupData, validateLoginData, reduceUserDetails } = require('./../util/validators');



firebase.initializeApp(config);

exports.signup = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    };

    // Validate form fields
    const { valid, errors } = validateSignupData(newUser);

    if (!valid) {
        return res.status(400).json(errors);
    }
    // End validate
    const noImage = 'no-img.png';
    
    let token, userId;
    db.doc(`/users/${newUser.handle}`).get()
        .then(doc => {
            if (doc.exists) {
                return res.status(400).json({ handle: 'this handle is already taken' });
            } else {
                return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then(data => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then(idToken => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                imgUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImage}?alt=media`,
                createdAt: new Date().toISOString(),
                userId
            };
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
            
        })
        .then(() => {
            return res.status(201).json({ token });
        })
        .catch(err => {
            console.error(err);
                return res.status(500).json({ general: 'Something went wrong please try again' });
            
        });



}

exports.login = async (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    console.log(`--Procesando login para email: ${user.email}`);

    const { errors, valid } = validateLoginData(user);

    
    if (!valid) return res.status(400).json(errors);
    
    console.log(`--Todos los campos son validos y procesables`);
    
    try {
        const auth = await firebase.auth().signInWithEmailAndPassword(user.email, user.password);
    
        const token = await auth.user.getIdToken();
        
        console.log(`--Login completado para email: ${user.email}`);
        return res.json({ token });
    } catch (err) {
        console.error(err);
        return res.status(403).json({ general: 'Wrong credentials, please try again' });
    }
};

exports.uploadImage = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({ headers: req.headers });

    let imageFilename;
    let imageToBeUploaded = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
            return res.status(400).json({ error: 'Wrong file type submitted' });
        }
        const imageExtension = filename.split('.')[filename.split('.').length - 1];
        imageFilename = `${Math.round(Math.random() * 10000000000000)}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), imageFilename);
        imageToBeUploaded = { filepath, mimetype };
        file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish', () => {
        admin.storage().bucket(config.storageBucket).upload(imageToBeUploaded.filepath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimetype
                }
            }
        })
            .then(() => {
                const imgUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFilename}?alt=media`;
                return db.doc(`/users/${req.user.handle}`).update({ imgUrl });
            })
            .then(() => {
                return res.json({ message: `Image ${imageFilename} uploaded successfully` });
            })
            .catch(err => {
                console.error(err);
                res.status(500).json({ error: err.message });
            })
    });
    busboy.end(req.rawBody);
    
};

exports.addUserDetails = async (req, res) => {
    let userDetails = reduceUserDetails(req.body);

    try {
        const userDoc = await db.doc(`/users/${req.user.handle}`).update(userDetails);
        if (userDoc) {
            console.log(userDoc);
            return res.json({ message: 'Details added successfully' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }

};
 
// Get own user details
exports.getAuthenticatedUser = async (req, res) => {
    let userData = {};

    try {
        const userDoc = await db.doc(`/users/${req.user.handle}`).get();

        if (userDoc.exists) {
            userData.credentials = userDoc.data();
            const likes = await db
                .collection('likes')
                .where('userHandle', '==', req.user.handle)
                .get();
            userData.likes = [];
            likes.forEach(doc => {                
                userData.likes.push(doc.data());
            });
        }        
        const notifResults = await db.collection('notifications').where('recipient', '==', req.user.handle).orderBy('createdAt', 'desc').limit(10).get();
        userData.notications = [];
        notifResults.forEach(doc => {
            userData.notications.push({
                ...doc.data(),
                notificationId: doc.id
            });
        })
        return res.json(userData);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};

// Get any user details
exports.getUserDetails = async (req, res) => {
    let userData = {}

    try {
        const userDoc = await db.doc(`/users/${req.params.handle}`).get();

        if (userDoc.exists) {
            userData.user = userDoc.data();
            const screamsDocs = await db.collection('screams').where('userHandle', '==', userData.user.handle).orderBy('createdAt', 'desc').get();
            userData.screams = [];
            screamsDocs.forEach(doc => {
                userData.screams.push({
                    ...doc.data(),
                    screamId: doc.id
                })
            });
            return res.json(userData);
        } else {
            return res.status(500).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.code });
    }
};

// Mark own notifications read 
exports.markNotificationsRead = async (req, res) => {
    let batch = db.batch();
    try {
        req.body.forEach(notificationId => {
            const notification = db.doc(`/notifications/${notificationId}`);
            batch.update(notification, { read: true });
        });

        await batch.commit();
        return res.json({ message: 'Notifications marked read' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.code });
    }
};
        