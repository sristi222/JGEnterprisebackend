const mongoose = require("mongoose")

// Schema for custom quantity options
const customQuantityOptionSchema = new mongoose.Schema(
  {
    amount: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
)

// Main Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  subcategory: {
    type: String,
    trim: true, // ensure no trailing/leading whitespace
    lowercase: true, // normalize case for easier filtering
  },
  price: { type: Number, required: true },
  unit: { type: String, required: true },

  // NEW: Default quantity for product cards display
  defaultQuantity: {
    type: String,
    default: "1",
    trim: true,
  },

  // NEW: Custom quantity options for product detail page
  customQuantityOptions: {
    type: [customQuantityOptionSchema],
    default: [],
  },

  stock: { type: Number, required: true },
  imageUrl: { type: String },
  displayInLatest: { type: Boolean, default: false },
  displayInBestSelling: { type: Boolean, default: false },
  onSale: { type: Boolean, default: false },
  salePrice: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
})

// Add indexes for better performance
productSchema.index({ category: 1 })
productSchema.index({ displayInLatest: 1 })
productSchema.index({ displayInBestSelling: 1 })

module.exports = mongoose.model("Product", productSchema)
