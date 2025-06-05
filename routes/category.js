const express = require('express')
const router = express.Router()
const Category = require('../models/Category')

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find()
    res.json(categories)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories', details: err.message })
  }
})

// Add a new category
router.post('/', async (req, res) => {
  try {
    const { name, description = '', subcategories = [] } = req.body

    const category = new Category({
      name: name.toLowerCase().trim(),
      description,
      subcategories: subcategories.map(sub => ({ name: sub.name.toLowerCase().trim() }))
    })

    await category.save()
    res.status(201).json(category)
  } catch (err) {
    res.status(400).json({ error: 'Failed to create category', details: err.message })
  }
})

// Update category
router.put('/:id', async (req, res) => {
  try {
    const updates = {
      ...req.body,
      name: req.body.name?.toLowerCase().trim()
    }

    const updated = await Category.findByIdAndUpdate(req.params.id, updates, { new: true })

    if (!updated) return res.status(404).json({ error: 'Category not found' })
    res.json(updated)
  } catch (err) {
    res.status(400).json({ error: 'Failed to update category', details: err.message })
  }
})

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Category not found' })
    res.sendStatus(204)
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete category', details: err.message })
  }
})

// Add subcategory
router.post('/:id/subcategories', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) return res.status(404).json({ error: 'Category not found' })

    const name = req.body.name?.toLowerCase().trim()
    if (!name) return res.status(400).json({ error: 'Subcategory name is required' })

    // Avoid duplicates
    const exists = category.subcategories.some(sub => sub.name === name)
    if (exists) return res.status(409).json({ error: 'Subcategory already exists' })

    category.subcategories.push({ name })
    await category.save()
    res.status(201).json(category)
  } catch (err) {
    res.status(400).json({ error: 'Failed to add subcategory', details: err.message })
  }
})

// Delete subcategory
router.delete('/:id/subcategories/:subId', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) return res.status(404).json({ error: 'Category not found' })

    const originalLength = category.subcategories.length
    category.subcategories = category.subcategories.filter(
      sub => sub._id.toString() !== req.params.subId
    )

    if (category.subcategories.length === originalLength) {
      return res.status(404).json({ error: 'Subcategory not found' })
    }

    await category.save()
    res.sendStatus(204)
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete subcategory', details: err.message })
  }
})

module.exports = router
