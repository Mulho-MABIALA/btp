const router      = require('express').Router()
const jwt         = require('jsonwebtoken')
const multer      = require('multer')
const path        = require('path')
const HSEIncident = require('../models/HSEIncident')
const log         = require('../utils/logActivity')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => cb(null, `hse-${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

router.get('/', auth, async (req, res) => {
  try { res.json(await HSEIncident.find().sort({ date: -1 })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    const h = await HSEIncident.create(req.body)
    await log(req, 'create', 'HSEIncident', h.title, `Sévérité: ${h.severity}`)
    res.status(201).json(h)
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try { res.json(await HSEIncident.findByIdAndUpdate(req.params.id, req.body, { new: true })) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.patch('/:id/close', auth, async (req, res) => {
  try { res.json(await HSEIncident.findByIdAndUpdate(req.params.id, { status: 'closed', closedDate: new Date() }, { new: true })) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

// ── Photos ────────────────────────────────────────────────────────────────────
router.post('/:id/photos', auth, upload.single('photo'), async (req, res) => {
  try {
    const inc = await HSEIncident.findById(req.params.id)
    if (!inc) return res.status(404).json({ error: 'Incident introuvable' })
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier' })

    inc.photos.push({
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
      caption: req.body.caption || '',
    })
    await inc.save()
    res.json(inc)
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id/photos/:idx', auth, async (req, res) => {
  try {
    const inc = await HSEIncident.findById(req.params.id)
    if (!inc) return res.status(404).json({ error: 'Incident introuvable' })
    const idx = Number(req.params.idx)
    const photo = inc.photos[idx]
    if (photo?.filename) {
      const fs = require('fs')
      const fp = path.join(__dirname, '../uploads', photo.filename)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    }
    inc.photos.splice(idx, 1)
    await inc.save()
    res.json(inc)
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try { await HSEIncident.findByIdAndDelete(req.params.id); res.json({ ok: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
