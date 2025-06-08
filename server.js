require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const path = require("path")
const morgan = require("morgan")

// ✅ Cloudinary config
const cloudinary = require("cloudinary").v2
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const multer = require("multer")

// ✅ Models and Routes
const Admin = require("./models/Admin")
const authRoutes = require("./routes/auth")
const productRoutes = require("./routes/product") // Ensure this path is correct
const heroSliderRoutes = require("./routes/HeroSlides")
const categoryRoutes = require("./routes/Category")

const app = express()

// ✅ Cloudinary setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ✅ Multer with Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "product-images",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
})
const upload = multer({ storage })

// ✅ Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan("dev"))

// 🧪 Test Cloudinary Upload Route
app.post("/api/test-upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded" })
  }
  res.json({
    success: true,
    imageUrl: req.file.path,
    public_id: req.file.filename,
  })
})

// ✅ API Routes
app.use("/api/auth", authRoutes)
app.use("/api/products", productRoutes) // Make sure this uses `upload.single("image")` if you're handling product uploads
app.use("/api/hero-slides", heroSliderRoutes)
app.use("/api/categories", categoryRoutes)

// ✅ 404 fallback
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found" })
})

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err.stack)
  res.status(500).json({ error: "Internal server error" })
})

// ✅ MongoDB Atlas Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected")

    const adminEmail = "admin@example.com"
    const existingAdmin = await Admin.findOne({ email: adminEmail })

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("password", 10)
      await Admin.create({ email: adminEmail, password: hashedPassword })
      console.log("🛠️ Default admin created: admin@example.com / password")
    } else {
      console.log("👤 Admin already exists")
    }

    const PORT = process.env.PORT || 5000
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message)
  })

mongoose.connection.on("error", (err) => {
  console.error("❌ Mongoose runtime error:", err)
})
