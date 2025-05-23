// models/Product.js

const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');

// Initialize GridFS
let bucket;
const conn = mongoose.connection;

conn.once('open', () => {
  try {
    bucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });
    console.log('GridFS initialized successfully');
  } catch (error) {
    console.error('Error initializing GridFS:', error);
  }
});

// Shade sub-schema
const shadeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  colorCode: {
    type: String,
    required: true
  },
  referenceImage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'uploads'
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    index: true
  }
});

// Main product schema
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['lipstick','foundation','eyeshadow','blush','mascara','eyeliner','concealer'],
    index: true
  },
  brand: {
    type: String,
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  mainImage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'uploads'
  },
  shades: [shadeSchema],
  features: [String],
  ingredients: [String],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
productSchema.index({ category: 1, brand: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Helpers
const getBucket = () => {
  if (!bucket) {
    throw new Error('GridFS not initialized; ensure MongoDB is connected.');
  }
  return bucket;
};

const uploadToGridFS = async (file) => {
  const bucket = getBucket();
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(file.originalname, {
      contentType: file.mimetype
    });
    uploadStream.on('error', reject);
    uploadStream.on('finish', (fileDoc) => resolve(fileDoc._id));
    uploadStream.end(file.buffer);
  });
};

// ← UPDATED delete helper
const deleteFromGridFS = async (fileId) => {
  if (!fileId) return;

  const bucket = getBucket();
  return new Promise((resolve, reject) => {
    let oid;
    try {
      // ALWAYS convert to hex string first
      const hexId = fileId.toString();
      oid = new ObjectId(hexId);
      console.log(`Deleting GridFS file ${hexId}`);
    } catch (err) {
      console.error('Invalid fileId for GridFS deletion:', fileId, err);
      return reject(err);
    }

    bucket.delete(oid, err => {
      if (err) {
        console.error(`Error deleting GridFS file ${oid.toHexString()}:`, err);
        return reject(err);
      }
      resolve();
    });
  });
};

module.exports = {
  Product: mongoose.model('Product', productSchema),
  getBucket,
  uploadToGridFS,
  deleteFromGridFS
};
