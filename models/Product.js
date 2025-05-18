const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');

// Initialize GridFS bucket
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

// Helper to get the GridFS bucket
const getBucket = () => {
  if (!bucket) {
    throw new Error('GridFS is not initialized.');
  }
  return bucket;
};

// Shade subdocument schema
const shadeSchema = new mongoose.Schema({
  name:        { type: String, required: true, index: true },
  colorCode:   { type: String, required: true },
  referenceImage: {
    // Support both legacy URL strings and new GridFS ObjectIds
    type: mongoose.Schema.Types.Mixed,
    required: true,
    get: v => v && v.toString(),
    set: v => mongoose.Types.ObjectId.isValid(v) ? new ObjectId(v) : v
  },
  price:       { type: Number, required: true, index: true },
  stock:       { type: Number, default: 0, required: true, index: true }
});

// Main product schema
const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, index: true },
  img: {
    // Support legacy URL strings and optional GridFS ObjectIds
    type: mongoose.Schema.Types.Mixed,
    required: true,
    get: v => v && v.toString(),
    set: v => mongoose.Types.ObjectId.isValid(v) ? new ObjectId(v) : v
  },
  price:       { type: Number, required: true, index: true },
  sale:        { type: Boolean, default: false },
  category:    { type: String, index: true },  // kept optional for legacy
  brand:       { type: String, index: true },
  description: { type: String },
  shades:      [shadeSchema],
  rating:      { type: Number, default: 0 },
  features:    [String],
  ingredients: [String],
  createdAt:   { type: Date, default: Date.now, index: true },
  updatedAt:   { type: Date, default: Date.now }
});

// Compound and text indexes
productSchema.index({ category: 1, brand: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Helper to upload files into GridFS
const uploadToGridFS = async (file) => {
  const bucket = getBucket();
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(file.originalname, {
      contentType: file.mimetype
    });
    uploadStream.on('error', err => reject(err));
    uploadStream.on('finish', f => resolve(f._id));
    uploadStream.end(file.buffer);
  });
};

// Helper to delete files from GridFS
const deleteFromGridFS = async (fileId) => {
  if (!fileId) return;
  const bucket = getBucket();
  return new Promise((resolve, reject) => {
    try {
      const oid = new ObjectId(fileId);
      bucket.delete(oid, err => err ? reject(err) : resolve());
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  Product: mongoose.model('Product', productSchema),
  getBucket,
  uploadToGridFS,
  deleteFromGridFS
};
