const mongoose = require('mongoose');

const shadeSchema = new mongoose.Schema({
  name: String,
  colorCode: String,
  referenceImage: String,
  price: Number,
  stock: Number
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  img: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  sale: {
    type: Boolean,
    default: false
  },
  category: String,
  brand: String,
  description: String,
  shades: [shadeSchema],
  rating: {
    type: Number,
    default: 0
  },
  features: [String],
  ingredients: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', productSchema); 