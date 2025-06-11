const express = require("express")
const path = require("path")
const Product = require("../models/Product")
const router = express.Router()
const mongoose = require("mongoose")


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

// Helper to parse custom quantity options
const parseCustomQuantityOptions = (customQuantityOptions) => {
  if (!customQuantityOptions) return []

  try {
    if (typeof customQuantityOptions === "string") {
      const parsed = JSON.parse(customQuantityOptions)
      return Array.isArray(parsed) ? parsed : []
    }
    if (Array.isArray(customQuantityOptions)) {
      return customQuantityOptions
    }
    return []
  } catch (error) {
    console.error("❌ Error parsing custom quantity options:", error)
    return []
  }
}

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

    // Debug log to see what data is being sent
    if (normalized.length > 0) {
      console.log("📦 Sample product data:", {
        name: normalized[0].name,
        defaultQuantity: normalized[0].defaultQuantity,
        unit: normalized[0].unit,
        customQuantityOptions: normalized[0].customQuantityOptions?.length || 0,
      })
    }

    res.json({ success: true, products: normalized })
  } catch (err) {
    console.error("❌ Best Selling Fetch Error:", err)
    res.status(500).json({ success: false, error: "Failed to fetch best-selling products" })
  }
})

// ✅ Create Product (Updated for dual quantity system)
router.post("/", upload.single("image"), async (req, res) => {
  try {
    console.log("📥 Creating product with data:", {
      name: req.body.name,
      defaultQuantity: req.body.defaultQuantity,
      unit: req.body.unit,
      customQuantityOptions: req.body.customQuantityOptions ? "provided" : "not provided",
    })

    const {
      name,
      description,
      category,
      subcategory,
      price,
      costPrice,
      unit,
      defaultQuantity, // NEW FIELD
      customQuantityOptions, // NEW FIELD
      stock,
      displayInLatest,
      displayInBestSelling,
      onSale,
      salePrice,
    } = req.body

    const imageUrl = req.file ? req.file.path : null

    // Parse custom quantity options
    const parsedCustomQuantityOptions = parseCustomQuantityOptions(customQuantityOptions)

    const product = new Product({
      name,
      description,
      category,
      subcategory: normalizeSubcategory(subcategory),
      price: Number.parseFloat(price),
      costPrice: Number.parseFloat(costPrice) || 0,
      unit: unit || "kg",
      defaultQuantity: defaultQuantity || "1", // Default to "1" if not provided
      customQuantityOptions: parsedCustomQuantityOptions, // Store custom options
      stock: Number.parseInt(stock) || 0,
      imageUrl,
      displayInLatest: parseBool(displayInLatest),
      displayInBestSelling: parseBool(displayInBestSelling),
      onSale: parseBool(onSale),
      salePrice: Number.parseFloat(salePrice) || 0,
    })

    await product.save()

    console.log("✅ Product created successfully:", {
      name: product.name,
      defaultQuantity: product.defaultQuantity,
      unit: product.unit,
      customQuantityOptions: product.customQuantityOptions.length,
    })

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

    console.log("📦 Sending single product data:", {
      name: normalized.name,
      defaultQuantity: normalized.defaultQuantity,
      unit: normalized.unit,
      customQuantityOptions: normalized.customQuantityOptions?.length || 0,
    })

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

    const categoryId = mainProduct.category._id || mainProduct.category

    const similarProducts = await Product.find({
      category: categoryId,
      _id: { $ne: productId },
    })
      .populate("category", "name")
      .limit(4)

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

// ✅ Update Product (Updated for dual quantity system)
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
      defaultQuantity, // NEW FIELD
      customQuantityOptions, // NEW FIELD
      stock,
      displayInLatest,
      displayInBestSelling,
      onSale,
      salePrice,
    } = req.body

    const parsedCustomQuantityOptions = parseCustomQuantityOptions(customQuantityOptions)

    const updates = {
      name,
      description,
      category,
      subcategory: normalizeSubcategory(subcategory),
      price: Number.parseFloat(price),
      costPrice: Number.parseFloat(costPrice) || 0,
      unit: unit || "kg",
      defaultQuantity: defaultQuantity || "1",
      customQuantityOptions: parsedCustomQuantityOptions,
      stock: Number.parseInt(stock) || 0,
      displayInLatest: parseBool(displayInLatest),
      displayInBestSelling: parseBool(displayInBestSelling),
      onSale: parseBool(onSale),
      salePrice: Number.parseFloat(salePrice) || 0,
    }

    if (req.file) {
      updates.imageUrl = req.file.path
    }

    const product = await Product.findByIdAndUpdate(productId, updates, { new: true })

    if (!product) return res.status(404).json({ success: false, error: "Product not found" })

    console.log("✅ Product updated successfully:", {
      name: product.name,
      defaultQuantity: product.defaultQuantity,
      unit: product.unit,
      customQuantityOptions: product.customQuantityOptions.length,
    })

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
