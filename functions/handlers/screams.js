const { db } = require('./../util/admin');


exports.getAllScreams = async (req, res) => {
    
    let screams = [];

    try {
        const screamDocs = await db
            .collection('screams')
            .orderBy('createdAt', 'desc')
            .get();
        
        screamDocs.forEach(doc => {
            screams.push({
                ...doc.data(),
                screamId: doc.id
            });
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.code });
    }
    
    return res.json(screams);
};

exports.postOneScream = async (req, res) => {
    if (req.body.body.trim() === '') {
        return res.status(400).json({ body: 'Body must not be empty' });
    }

    
    
    const newScream = {
        body: req.body.body,
        userHandle: req.user.handle,
        createdAt: new Date().toISOString(),
        userImg: req.user.imgUrl,
        likeCount: 0,
        commentCount: 0,
    };

    console.log(
        `--Procesando peticion POST\n\tuser: ${newScream.userHandle}\n\tbody: ${newScream.body}`);
    
    try {
        const newDocRef = await db
            .collection('screams')
            .add(newScream);
    
        const resScream = newScream;
        resScream.screamId = newDocRef.id;
        return res.json(resScream);
    } catch (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Something went wrong' });
    }
};


exports.getScream = async (req, res) => {
    let screamData = {};
    try {
        const screamDoc = await db.doc(`/screams/${req.params.screamId}`).get();

        if (!screamDoc.exists) {
            return res.status(404).json({ error: 'Scream not found' });
        }
        screamData = screamDoc.data();
        screamData.screamId = screamDoc.id;
        const commentData = await db
            .collection('comments')
            .orderBy('createdAt', 'desc')
            .where('screamId', '==', screamData.screamId)
            .get();

        screamData.comments = [];
        commentData.forEach(doc => {
            screamData.comments.push(doc.data());
        });
        return res.json(screamData);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
    
};

// Comment on a scream
exports.commentOnScream = async (req, res) => {
    try {
        if (req.body.body.trim() === '') {
            return res.status(400).json({ comment: 'Must not be empty' });
        }
        const screamDoc = await db.doc(`/screams/${req.params.screamId}`).get();

        if (!screamDoc.exists) {
            return res.status(404).json({ error: 'Scream not found' });
        }

        let commentData = {
            screamId: req.params.screamId,
            body: req.body.body,
            createdAt: new Date().toISOString(),
            userHandle: req.user.handle,
            userImg: req.user.imgUrl,
        };

        // Add comment to database
        const commentRef = await db
            .collection('comments')
            .add(commentData);
        if (commentRef !== null) {
            //console.log(commentRef);

            // Update commentCount on Scream collection in database
            let commentCount = screamDoc.data().commentCount;
            commentCount = commentCount ? commentCount + 1 : 1;
            const writeResult = await db.doc(`/screams/${req.params.screamId}`).update('commentCount', commentCount);
            console.log(writeResult ? true : false);

            // If all operations ok, return response
            if (writeResult) {
                return res.json({
                    message: 'Comment added successfully',
                    commentData,
                });
            } else {
                return res.status(500).json({ error: 'Something went wrong' });
            }
        } else {
            return res.status(500).json({ error: 'Something went wrong' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.code });
    }

}

// Like on a scream
exports.likeScream = async (req, res) => {
    let screamData;
    try {
        const screamDoc = await db.doc(`/screams/${req.params.screamId}`).get();
        if (!screamDoc.exists) return res.status(400).json({ message: 'Scream not found' });

        const likeDoc = await db
            .collection('likes')
            .where('userHandle', '==', req.user.handle)
            .where('screamId', '==', req.params.screamId)
            .get();
        
        if (likeDoc.size > 0) return res.status(400).json({ error: 'Scream already liked' });


        const likeData = {
            screamId: req.params.screamId,
            userHandle: req.user.handle
        }

        let likeCount = screamDoc.data().likeCount;
        likeCount = likeCount ? likeCount + 1 : 1;
        console.log(likeCount);
        // Update likeCount in Screams collection
        await db.doc(`/screams/${req.params.screamId}`).update('likeCount', likeCount);

        // Update likes collection adding likeData
        await db.collection('likes').add(likeData);

        screamData = screamDoc.data();
        screamData.screamId = screamDoc.id;

        return res.json(screamData);
        
        
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.code });
    }
}


// Unlike on a scream
exports.unlikeScream = async (req, res) => {
    let screamData;

    const screamRef = db.doc(`/screams/${req.params.screamId}`);

    try {
        const screamDoc = await screamRef.get()
    
        let likeDoc;
        if (screamDoc.exists) {
            likeDoc = await db
                .collection('likes')
                .where('userHandle', '==', req.user.handle)
                .where('screamId', '==', req.params.screamId)
                .limit(1).get();
                screamData = screamDoc.data();
                screamData.screamId = screamDoc.id;
        } else {
            return res.status(400).json({ message: 'Scream not found' });
        }
    
        if (likeDoc.empty) {
            return res.status(400).json({ message: 'Scream not liked' });
        } else {
            console.log(likeDoc.docs[0].id);
            await db.doc(`/likes/${likeDoc.docs[0].id}`).delete()
        
            screamData.likeCount ? screamData.likeCount-- : screamData.likeCount = 0;
            await screamDoc.ref.update({ likeCount: screamData.likeCount });
                    
    
            return res.json(screamData);
            }
        }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.code });
    }    
}

// Delete a Scream
exports.deleteScream = async (req, res) => {
    const screamRef = db.doc(`/screams/${req.params.screamId}`);

    try {
        const screamDoc = await screamRef.get();
        if (!screamDoc.exists) return res.status(400).json({ error: 'Scream not found' });

        if (screamDoc.data().userHandle !== req.user.handle) {
            return res.status(403).json({ error: 'Unauthorized' });
        } else {
            await screamRef.delete();
            // console.log(writeRes.writeTime.toDate() ? true: false);
            return res.json({ message: 'Scream deleted successfully' });
        }
    } catch (err) {
        console.error(err);
        return res.status(400).json({ error: err.code });
    }

}