const router   = require('express').Router()
const jwt      = require('jsonwebtoken')
const multer   = require('multer')
const path     = require('path')
const Document = require('../models/Document')
const log      = require('../utils/logActivity')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
})
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } })

router.get('/', auth, async (req, res) => {
  try {
    const filter = {}
    if (req.query.project)     filter.project     = { $regex: req.query.project, $options: 'i' }
    if (req.query.type)        filter.type        = req.query.type
    if (req.query.employeeRef) filter.employeeRef = req.query.employeeRef
    res.json(await Document.find(filter).sort({ createdAt: -1 }))
  }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    const data = { ...req.body }
    if (req.file) {
      data.filename = req.file.filename
      data.originalName = req.file.originalname
      data.mimetype = req.file.mimetype
      data.size = req.file.size
      data.url = `/uploads/${req.file.filename}`
    }
    if (data.tags && typeof data.tags === 'string') data.tags = data.tags.split(',').map(t => t.trim()).filter(Boolean)
    const doc = await Document.create(data)
    await log(req, 'create', 'Document', doc.title)
    res.status(201).json(doc)
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try {
    if (req.body.tags && typeof req.body.tags === 'string')
      req.body.tags = req.body.tags.split(',').map(t => t.trim()).filter(Boolean)
    res.json(await Document.findByIdAndUpdate(req.params.id, req.body, { new: true }))
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id)
    if (doc?.filename) {
      const fs = require('fs')
      const filePath = path.join(__dirname, '../uploads', doc.filename)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    res.json({ ok: true })
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
