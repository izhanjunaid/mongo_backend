const mongoose = require('mongoose');

function getBucket() {
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads' // Change to 'fs' if your collection is fs.files
    });
}

module.exports = getBucket; 