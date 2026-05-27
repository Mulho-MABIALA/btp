const router    = require('express').Router()
const jwt       = require('jsonwebtoken')
const path      = require('path')
const fs        = require('fs')
const multer    = require('multer')
const Equipment = require('../models/Equipment')
const log       = require('../utils/logActivity')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

/* ── Multer ─────────────────────────────────────────────────────────────── */
const uploadsDir = path.join(__dirname, '../uploads/equipment')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) =>
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`),
})
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Image requise')),
})

const deleteFile = (url) => {
  if (!url?.startsWith('/uploads/equipment/')) return
  const p = path.join(__dirname, '..', url)
  if (fs.existsSync(p)) fs.unlinkSync(p)
}

/* ── CRUD de base ────────────────────────────────────────────────────────── */
router.get('/', auth, async (req, res) => {
  try {
    res.json(await Equipment.find().populate('projectRef', 'title').sort({ name: 1 }))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    const e = await Equipment.create(req.body)
    await log(req, 'create', 'Equipment', e.name)
    res.status(201).json(e)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const eq = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('projectRef', 'title')
    res.json(eq)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.patch('/:id/status', auth, async (req, res) => {
  try {
    res.json(await Equipment.findByIdAndUpdate(
      req.params.id, { status: req.body.status }, { new: true }
    ).populate('projectRef', 'title'))
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const eq = await Equipment.findByIdAndDelete(req.params.id)
    if (eq) {
      deleteFile(eq.image)
      eq.photos?.forEach(deleteFile)
    }
    res.json({ ok: true })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

/* ── POST /:id/image — image principale ──────────────────────────────────── */
router.post('/:id/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' })
    const url = `/uploads/equipment/${req.file.filename}`
    const old = await Equipment.findById(req.params.id)
    if (old?.image) deleteFile(old.image)
    const eq = await Equipment.findByIdAndUpdate(
      req.params.id, { image: url }, { new: true }
    ).populate('projectRef', 'title')
    res.json(eq)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── POST /:id/photos — photos supplémentaires ───────────────────────────── */
router.post('/:id/photos', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' })
    const url = `/uploads/equipment/${req.file.filename}`
    const eq  = await Equipment.findByIdAndUpdate(
      req.params.id, { $push: { photos: url } }, { new: true }
    ).populate('projectRef', 'title')
    res.json(eq)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── DELETE /:id/photos/:idx ─────────────────────────────────────────────── */
router.delete('/:id/photos/:idx', auth, async (req, res) => {
  try {
    const eq = await Equipment.findById(req.params.id)
    if (!eq) return res.status(404).json({ error: 'Introuvable' })
    const idx = Number(req.params.idx)
    deleteFile(eq.photos[idx])
    eq.photos.splice(idx, 1)
    await eq.save()
    res.json(await Equipment.findById(eq._id).populate('projectRef', 'title'))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── POST /:id/maintenance — ajouter un entretien ────────────────────────── */
router.post('/:id/maintenance', auth, async (req, res) => {
  try {
    const update = {
      $push: { maintenanceHistory: { $each: [req.body], $position: 0 } },
      lastMaintenanceDate: req.body.date,
    }
    if (req.body.nextDate) update.nextMaintenanceDate = req.body.nextDate
    if (req.body.hoursAtService != null) update.hoursCounter = req.body.hoursAtService
    const eq = await Equipment.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('projectRef', 'title')
    res.json(eq)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

/* ── DELETE /:id/maintenance/:mid ────────────────────────────────────────── */
router.delete('/:id/maintenance/:mid', auth, async (req, res) => {
  try {
    const eq = await Equipment.findByIdAndUpdate(
      req.params.id,
      { $pull: { maintenanceHistory: { _id: req.params.mid } } },
      { new: true }
    ).populate('projectRef', 'title')
    res.json(eq)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

/* ── PATCH /:id/counters — mise à jour compteurs ─────────────────────────── */
router.patch('/:id/counters', auth, async (req, res) => {
  try {
    const { hoursCounter, kmCounter } = req.body
    const update = {}
    if (hoursCounter != null) update.hoursCounter = hoursCounter
    if (kmCounter    != null) update.kmCounter    = kmCounter
    res.json(await Equipment.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('projectRef', 'title'))
  } catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
