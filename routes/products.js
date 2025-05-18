const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const { Product, uploadToGridFS, deleteFromGridFS } = require('../models/Product');

// Multer memory storage for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// -------------------------
// Legacy Read Endpoints
// -------------------------

// Get all products (legacy)
router.get('/legacy', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single product by ID (legacy)
router.get('/legacy/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get products by category (legacy)
router.get('/legacy/category/:category', async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.category });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get products by brand (legacy)
router.get('/legacy/brand/:brand', async (req, res) => {
  try {
    const products = await Product.find({ brand: req.params.brand });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -------------------------
// Enhanced Read Endpoint
// -------------------------

// Get products with pagination, search, and filters
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.category) query.category = req.query.category;
    if (req.query.brand) query.brand = req.query.brand;
    if (req.query.search) query.$text = { $search: req.query.search };

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      products,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalProducts: total
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// Get single product by ID (enhanced)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -------------------------
// Create Product
// -------------------------
router.post('/', upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'shadeImages', maxCount: 10 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files.mainImage) {
      return res.status(400).json({ message: 'Main image is required' });
    }

    const data = JSON.parse(req.body.product);
    const mainImageId = await uploadToGridFS(req.files.mainImage[0]);
    const shadeImages = req.files.shadeImages || [];

    const shades = await Promise.all(
      data.shades.map(async (s, i) => {
        const imageFile = shadeImages[i];
        const refId = imageFile ? await uploadToGridFS(imageFile) : s.referenceImage;
        return { ...s, referenceImage: refId };
      })
    );

    const product = new Product({
      ...data,
      mainImage: mainImageId,
      shades
    });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
});

// -------------------------
// Update Product
// -------------------------
router.put('/:id', upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'shadeImages', maxCount: 10 }
]), async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Product not found' });

    const data = JSON.parse(req.body.product);

    // Main image
    if (req.files.mainImage) {
      if (existing.mainImage) await deleteFromGridFS(existing.mainImage);
      data.mainImage = await uploadToGridFS(req.files.mainImage[0]);
    }

    // Shades
    const shadeFiles = req.files.shadeImages || [];
    const updatedShades = await Promise.all(
      data.shades.map(async (s, i) => {
        if (shadeFiles[i]) {
          if (s.referenceImage) await deleteFromGridFS(s.referenceImage);
          s.referenceImage = await uploadToGridFS(shadeFiles[i]);
        }
        return s;
      })
    );
    data.shades = updatedShades;
    data.updatedAt = Date.now();

    const updated = await Product.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(updated);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product' });
  }
});

// -------------------------
// Delete Product
// -------------------------
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.mainImage) await deleteFromGridFS(product.mainImage);
    for (const shade of product.shades) {
      if (shade.referenceImage) await deleteFromGridFS(shade.referenceImage);
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
});

module.exports = router;
