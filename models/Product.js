const mongoose = require("mongoose");

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
    required: true,
    trim: true, // ensure no trailing/leading whitespace
    lowercase: true, // normalize case for easier filtering
  },
  price: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
  unit: { type: String, required: true },
  stock: { type: Number, required: true },
  imageUrl: { type: String },
  displayInLatest: { type: Boolean, default: false },
  displayInBestSelling: { type: Boolean, default: false },
  onSale: { type: Boolean, default: false },
  salePrice: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Product", productSchema);
