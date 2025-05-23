const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const mongoose = require('mongoose');
const {
  Product,
  uploadToGridFS,
  deleteFromGridFS
} = require('../models/Product');

const { Types: { ObjectId } } = mongoose;
const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /products
 * List products with pagination, filtering, and text search
 */
router.get('/', async (req, res) => {
  try {
    const page  = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip  = (page - 1) * limit;

    const query = {};
    if (req.query.category) query.category = req.query.category;
    if (req.query.brand)    query.brand    = req.query.brand;
    if (req.query.search)   query.$text    = { $search: req.query.search };

    const total    = await Product.countDocuments(query);
    const products = await Product.find(query)
                                  .sort({ createdAt: -1 })
                                  .skip(skip)
                                  .limit(limit);

    res.json({
      products,
      currentPage:  page,
      totalPages:   Math.ceil(total / limit),
      totalProducts: total
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

/**
 * GET /products/:id
 * Fetch a single product by ID
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid product ID.' });
  }

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.json(product);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ message: 'Error fetching product' });
  }
});

/**
 * POST /products
 * Create a new product, uploading mainImage + shadeImages
 */
router.post('/', upload.fields([
  { name: 'mainImage',  maxCount: 1 },
  { name: 'shadeImages', maxCount: 10 }
]), async (req, res) => {
  try {
    if (!req.files?.mainImage) {
      return res.status(400).json({ message: 'Main image is required' });
    }

    const data = JSON.parse(req.body.product);
    const mainImageId = await uploadToGridFS(req.files.mainImage[0]);

    const shadeFiles = req.files.shadeImages || [];
    const updatedShades = await Promise.all(
      data.shades.map((shade, idx) => {
        if (shadeFiles[idx]) {
          return uploadToGridFS(shadeFiles[idx]).then(imgId => ({
            ...shade,
            referenceImage: imgId
          }));
        }
        return shade;
      })
    );

    const product = new Product({
      ...data,
      mainImage: mainImageId,
      shades:    updatedShades
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ message: 'Error creating product' });
  }
});

/**
 * PUT /products/:id
 * Update a product and optionally replace images
 */
router.put('/:id', upload.fields([
  { name: 'mainImage',  maxCount: 1 },
  { name: 'shadeImages', maxCount: 10 }
]), async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid product ID.' });
  }

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const data = JSON.parse(req.body.product);

    if (req.files.mainImage) {
      if (product.mainImage) {
        await deleteFromGridFS(product.mainImage);
      }
      data.mainImage = await uploadToGridFS(req.files.mainImage[0]);
    }

    const shadeFiles = req.files.shadeImages || [];
    const updatedShades = await Promise.all(
      data.shades.map((shade, idx) => {
        if (shadeFiles[idx]) {
          return (async () => {
            if (shade.referenceImage) {
              await deleteFromGridFS(shade.referenceImage);
            }
            const imgId = await uploadToGridFS(shadeFiles[idx]);
            return { ...shade, referenceImage: imgId };
          })();
        }
        return shade;
      })
    );

    data.shades    = updatedShades;
    data.updatedAt = Date.now();

    const updated = await Product.findByIdAndUpdate(id, data, { new: true });
    res.json(updated);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: 'Error updating product' });
  }
});

/**
 * DELETE /products/:id
 * Delete all images (main + shades) then the product document itself
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid product ID.' });
  }

  try {
    // Load product
    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Collect image IDs
    const toDelete = [];
    if (product.mainImage) toDelete.push(product.mainImage);
    for (const shade of (product.shades || [])) {
      if (shade.referenceImage) toDelete.push(shade.referenceImage);
    }

    console.log('🗑 Deleting GridFS files:', toDelete);

    // Delete files
    await Promise.all(
      toDelete.map(fileId =>
        deleteFromGridFS(fileId)
          .catch(err => console.error(`Failed to delete image ${fileId}:`, err))
      )
    );

    // Delete product document
    console.log(`Deleting product document ${id}`);
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      console.error(`Failed to delete product document ${id}`);
      return res.status(500).json({ message: 'Failed to delete product document.' });
    }
    console.log(`Deleted product document ${id}`);

    res.json({ message: 'Product and all images deleted successfully.' });
  } catch (err) {
    console.error('Error in DELETE /products/:id:', err);
    res.status(500).json({ message: 'Server error while deleting product.' });
  }
});

module.exports = router;
