require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const HeroSlide = require("../models/HeroSlides");

const router = express.Router();

// ✅ Configure Cloudinary from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Cloudinary Storage via Multer
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "hero-slides",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({ storage });

// ✅ GET all hero slides
router.get("/", async (req, res) => {
  try {
    const slides = await HeroSlide.find().sort({ order: 1 });
    res.json({ success: true, slides });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch hero slides" });
  }
});

// ✅ POST add a new slide
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, subtitle, link, active } = req.body;
    const totalSlides = await HeroSlide.countDocuments();

    const slide = new HeroSlide({
      title,
      subtitle,
      link,
      imageUrl: req.file?.path || null, // Cloudinary hosted URL
      active: active === "true",
      order: totalSlides + 1,
    });

    await slide.save();
    res.status(201).json({ success: true, slide });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to add hero slide", details: err.message });
  }
});

// ✅ PUT update a slide
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { title, subtitle, link, active } = req.body;

    const update = {
      title,
      subtitle,
      link,
      active: active === "true",
    };

    if (req.file) {
      update.imageUrl = req.file.path;
    }

    const slide = await HeroSlide.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!slide) return res.status(404).json({ success: false, error: "Slide not found" });

    res.json({ success: true, slide });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update slide", details: err.message });
  }
});

// ✅ DELETE slide (optional: cleanup Cloudinary)
router.delete("/:id", async (req, res) => {
  try {
    const slide = await HeroSlide.findByIdAndDelete(req.params.id);
    if (!slide) return res.status(404).json({ success: false, error: "Slide not found" });

    // Optional: remove from Cloudinary if stored there
    if (slide.imageUrl?.includes("res.cloudinary.com")) {
      const publicId = slide.imageUrl.split("/").pop().split(".")[0]; // extract filename
      await cloudinary.uploader.destroy(`hero-slides/${publicId}`);
    }

    res.json({ success: true, message: "Slide deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete slide" });
  }
});

// ✅ POST reorder slides
router.post("/reorder", async (req, res) => {
  try {
    const { orderList } = req.body;
    for (let i = 0; i < orderList.length; i++) {
      await HeroSlide.findByIdAndUpdate(orderList[i], { order: i + 1 });
    }
    res.json({ success: true, message: "Slides reordered" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to reorder slides" });
  }
});

module.exports = router;
