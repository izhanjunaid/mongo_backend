require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const sampleProducts = [
  {
    name: "Classic Red Lipstick",
    img: "/product__2.jpg",
    price: 24.99,
    sale: false,
    category: "lipsticks",
    brand: "BeautyBrand",
    description: "A timeless red lipstick with a creamy, long-lasting formula.",
    shades: [
      {
        name: "Ruby Red",
        colorCode: "#FF0000",
        referenceImage: "/product__3.jpg",
        price: 24.99,
        stock: 50
      },
      {
        name: "Cherry Red",
        colorCode: "#D40000",
        referenceImage: "/product__4.jpg",
        price: 24.99,
        stock: 45
      }
    ],
    rating: 4.5,
    features: ["Long-lasting", "Creamy texture", "Non-drying"],
    ingredients: ["Beeswax", "Carnauba wax", "Vitamin E"]
  },
  {
    name: "Natural Blush",
    img: "/product__5.jpg",
    price: 19.99,
    sale: true,
    category: "blush",
    brand: "NaturalBeauty",
    description: "A natural-looking blush that gives you a healthy glow.",
    shades: [
      {
        name: "Peach",
        colorCode: "#FFDAB9",
        referenceImage: "/product__6.jpg",
        price: 19.99,
        stock: 30
      },
      {
        name: "Rose",
        colorCode: "#FFB6C1",
        referenceImage: "/product__7.jpg",
        price: 19.99,
        stock: 35
      }
    ],
    rating: 4.8,
    features: ["Buildable coverage", "Natural finish", "Long-wearing"],
    ingredients: ["Talc", "Mica", "Natural pigments"]
  },
  {
    name: "Foundation Kit",
    img: "/product__8.jpg",
    price: 39.99,
    sale: false,
    category: "makeup",
    brand: "ProMakeup",
    description: "Complete foundation kit with primer and setting powder.",
    shades: [
      {
        name: "Light",
        colorCode: "#F5DEB3",
        referenceImage: "/product__9.jpg",
        price: 39.99,
        stock: 25
      },
      {
        name: "Medium",
        colorCode: "#D2B48C",
        referenceImage: "/product__11.jpg",
        price: 39.99,
        stock: 30
      }
    ],
    rating: 4.7,
    features: ["Full coverage", "Matte finish", "Oil-free"],
    ingredients: ["Silica", "Titanium dioxide", "Iron oxides"]
  },
  {
    name: "Eyeshadow Palette",
    img: "/product__12.jpg",
    price: 34.99,
    sale: true,
    category: "makeup",
    brand: "ProMakeup",
    description: "Professional eyeshadow palette with 12 shades.",
    shades: [
      {
        name: "Neutral",
        colorCode: "#D2B48C",
        referenceImage: "/product__13.jpg",
        price: 34.99,
        stock: 20
      },
      {
        name: "Smoky",
        colorCode: "#696969",
        referenceImage: "/product__14.jpg",
        price: 34.99,
        stock: 25
      }
    ],
    rating: 4.6,
    features: ["Highly pigmented", "Blendable", "Long-lasting"],
    ingredients: ["Mica", "Talc", "Mineral pigments"]
  },
  {
    name: "Mascara Pro",
    img: "/product__15.jpg",
    price: 22.99,
    sale: false,
    category: "makeup",
    brand: "BeautyBrand",
    description: "Volumizing mascara for dramatic lashes.",
    shades: [
      {
        name: "Black",
        colorCode: "#000000",
        referenceImage: "/product__16.jpg",
        price: 22.99,
        stock: 40
      },
      {
        name: "Brown",
        colorCode: "#8B4513",
        referenceImage: "/product__17.jpg",
        price: 22.99,
        stock: 35
      }
    ],
    rating: 4.9,
    features: ["Volumizing", "Smudge-proof", "Water-resistant"],
    ingredients: ["Beeswax", "Carnauba wax", "Vitamin E"]
  }
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Insert new products
    await Product.insertMany(sampleProducts);
    console.log('Added sample products');

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase(); 