const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const getBucket = require('../utils/getBucket');

// Get image by ID
router.get('/:id', async (req, res) => {
    try {
        if (!req.params.id) {
            return res.status(400).json({ message: 'Image ID is required' });
        }

        const bucket = getBucket();
        let objectId;
        try {
            objectId = new mongoose.Types.ObjectId(req.params.id);
        } catch (error) {
            return res.status(400).json({ message: 'Invalid image ID format' });
        }

        const files = await bucket.find({ _id: objectId }).toArray();
        const file = files[0];

        if (!file) {
            return res.status(404).json({ message: 'Image not found' });
        }

        res.set('Content-Type', file.contentType);
        const downloadStream = bucket.openDownloadStream(objectId);
        downloadStream.pipe(res);
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ message: 'Error fetching image' });
        }
    }
});

module.exports = router; 