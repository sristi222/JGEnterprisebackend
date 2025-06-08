const express = require("express")
const path = require("path")
const Product = require("../models/Product")
const router = express.Router()
const mongoose = require("mongoose") // Import mongoose to use Types.ObjectId

// ✅ Cloudinary & Multer Setup
const multer = require("multer")
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const cloudinary = require("cloudinary").v2

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "product-images",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
})

const upload = multer({ storage })

// ✅ Helpers
const parseBool = (value) => value === "true" || value === true
const normalizeSubcategory = (sub) => (typeof sub === "object" ? sub.name : sub)

// Helper to validate MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id)

// ✅ Get Latest Products
router.get("/latest", async (req, res) => {
  try {
    const products = await Product.find({ displayInLatest: true }).populate("category", "name").sort({ createdAt: -1 })

    const normalized = products.map((p) => ({
      ...p.toObject(),
      subcategory: normalizeSubcategory(p.subcategory),
    }))

    res.json({ success: true, products: normalized })
  } catch (err) {
    console.error("❌ Latest Fetch Error:", err)
    res.status(500).json({ success: false, error: "Failed to fetch latest products" })
  }
})

// ✅ Get Best-Selling Products
router.get("/bestselling", async (req, res) => {
  try {
    const products = await Product.find({ displayInBestSelling: true })
      .populate("category", "name")
      .sort({ createdAt: -1 })

    const normalized = products.map((p) => ({
      ...p.toObject(),
      subcategory: normalizeSubcategory(p.subcategory),
    }))

    res.json({ success: true, products: normalized })
  } catch (err) {
    console.error("❌ Best Selling Fetch Error:", err)
    res.status(500).json({ success: false, error: "Failed to fetch best-selling products" })
  }
})

// ✅ Create Product
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      subcategory,
      price,
      costPrice,
      unit,
      stock,
      displayInLatest,
      displayInBestSelling,
      onSale,
      salePrice,
    } = req.body

    const imageUrl = req.file ? req.file.path : null // Cloudinary URL

    const product = new Product({
      name,
      description,
      category,
      subcategory: normalizeSubcategory(subcategory),
      price: Number.parseFloat(price),
      costPrice: Number.parseFloat(costPrice) || 0,
      unit,
      stock: Number.parseInt(stock),
      imageUrl,
      displayInLatest: parseBool(displayInLatest),
      displayInBestSelling: parseBool(displayInBestSelling),
      onSale: parseBool(onSale),
      salePrice: Number.parseFloat(salePrice) || 0,
    })

    await product.save()
    res.status(201).json({ success: true, message: "Product added successfully", product })
  } catch (err) {
    console.error("❌ Create Error:", err)
    res.status(500).json({ success: false, error: "Failed to add product", details: err.message })
  }
})

// ✅ Get All Products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().populate("category", "name").sort({ createdAt: -1 })

    const normalized = products.map((p) => ({
      ...p.toObject(),
      subcategory: normalizeSubcategory(p.subcategory),
    }))

    res.json({ success: true, products: normalized })
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch products" })
  }
})

// ✅ Get Single Product
router.get("/:id", async (req, res) => {
  try {
    const productId = req.params.id
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ success: false, error: "Invalid product ID format" })
    }

    const product = await Product.findById(productId).populate("category", "name")

    if (!product) return res.status(404).json({ success: false, error: "Product not found" })

    const normalized = {
      ...product.toObject(),
      subcategory: normalizeSubcategory(product.subcategory),
    }

    res.json(normalized)
  } catch (err) {
    console.error("❌ Fetch Single Product Error:", err)
    res.status(500).json({ success: false, error: "Failed to fetch product" })
  }
})

// ✅ Get Similar Products by ID
router.get("/similar/:id", async (req, res) => {
  try {
    const productId = req.params.id
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ success: false, error: "Invalid product ID format" })
    }

    const mainProduct = await Product.findById(productId)

    if (!mainProduct) {
      return res.status(404).json({ success: false, error: "Main product not found for similar search" })
    }

    // Assuming category is populated or directly accessible as an ID
    const categoryId = mainProduct.category._id || mainProduct.category // Handle if category is populated object or just ID

    const similarProducts = await Product.find({
      category: categoryId,
      _id: { $ne: productId }, // Exclude the current product
    })
      .populate("category", "name")
      .limit(4) // Limit to 4 similar products

    const normalized = similarProducts.map((p) => ({
      ...p.toObject(),
      subcategory: normalizeSubcategory(p.subcategory),
    }))

    res.json(normalized)
  } catch (err) {
    console.error("❌ Fetch Similar Products Error:", err)
    res.status(500).json({ success: false, error: "Failed to fetch similar products" })
  }
})

// ✅ Update Product
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const productId = req.params.id
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ success: false, error: "Invalid product ID format" })
    }

    const {
      name,
      description,
      category,
      subcategory,
      price,
      costPrice,
      unit,
      stock,
      displayInLatest,
      displayInBestSelling,
      onSale,
      salePrice,
    } = req.body

    const updates = {
      name,
      description,
      category,
      subcategory: normalizeSubcategory(subcategory),
      price: Number.parseFloat(price),
      costPrice: Number.parseFloat(costPrice) || 0,
      unit,
      stock: Number.parseInt(stock),
      displayInLatest: parseBool(displayInLatest),
      displayInBestSelling: parseBool(displayInBestSelling),
      onSale: parseBool(onSale),
      salePrice: Number.parseFloat(salePrice) || 0,
    }

    if (req.file) {
      updates.imageUrl = req.file.path // Cloudinary URL
    }

    const product = await Product.findByIdAndUpdate(productId, updates, { new: true })

    if (!product) return res.status(404).json({ success: false, error: "Product not found" })

    res.json({ success: true, message: "Product updated successfully", product })
  } catch (err) {
    console.error("❌ Update Error:", err)
    res.status(500).json({ success: false, error: "Failed to update product", details: err.message })
  }
})

// ✅ Delete Product
router.delete("/:id", async (req, res) => {
  try {
    const productId = req.params.id
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ success: false, error: "Invalid product ID format" })
    }

    const deleted = await Product.findByIdAndDelete(productId)
    if (!deleted) return res.status(404).json({ success: false, error: "Product not found" })
    res.json({ success: true, message: "Product deleted" })
  } catch (err) {
    console.error("❌ Delete Error:", err)
    res.status(500).json({ success: false, error: "Failed to delete product" })
  }
})

module.exports = router
