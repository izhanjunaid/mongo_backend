const express = require('express');
const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');

const router = express.Router();

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
  if (!bucket) throw new Error('GridFS is not initialized.');
  return bucket;
};

// Shade subdocument schema
const shadeSchema = new mongoose.Schema({
  name:        { type: String, required: true, index: true },
  colorCode:   { type: String, required: true },
  referenceImage: {
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
    type: mongoose.Schema.Types.Mixed,
    required: true,
    get: v => v && v.toString(),
    set: v => mongoose.Types.ObjectId.isValid(v) ? new ObjectId(v) : v
  },
  price:       { type: Number, required: true, index: true },
  sale:        { type: Boolean, default: false },
  category:    { type: String, index: true },
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

// Mongoose Product model
const Product = mongoose.model('Product', productSchema);

// Helper to delete files from GridFS safely
const deleteFromGridFS = async (fileId) => {
  if (!fileId) return; // nothing to delete
  const bucket = getBucket();
  return new Promise((resolve, reject) => {
    let oid;
    try {
      oid = new ObjectId(fileId);
    } catch (err) {
      console.error('Invalid ObjectId passed to deleteFromGridFS:', fileId, err);
      return resolve(); // resolve since no valid file to delete
    }
    bucket.delete(oid, (err) => {
      if (err) {
        if (err.message.includes('FileNotFound')) {
          console.warn('GridFS file not found for deletion:', fileId);
          return resolve();
        } else {
          console.error('Error deleting file from GridFS:', err);
          return reject(err);
        }
      }
      resolve();
    });
  });
};

// DELETE product route
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Delete main image file
    if (product.img) {
      await deleteFromGridFS(product.img);
    }

    // Delete all shade images
    for (const shade of product.shades) {
      if (shade.referenceImage) {
        await deleteFromGridFS(shade.referenceImage);
      }
    }

    // Delete product document
    await product.deleteOne();

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
});

module.exports = {
  Product,
  router, // export router to use in your Express app
  deleteFromGridFS
};
