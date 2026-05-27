const router  = require('express').Router()
const jwt     = require('jsonwebtoken')
const path    = require('path')
const fs      = require('fs')
const multer  = require('multer')
const Project = require('../models/Project')

/* ── Auth (mutations seulement) ─────────────────────────────────────────── */
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

/* ── Multer — upload photos chantier ────────────────────────────────────── */
const uploadsDir = path.join(__dirname, '../uploads/projects')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) =>
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`),
})
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },          // 8 MB
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith('image/')
      ? cb(null, true)
      : cb(new Error('Seuls les fichiers image sont acceptés')),
})

/* ── Routes publiques (GET) ──────────────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const q = req.query.category && req.query.category !== 'Tous' ? { category: req.query.category } : {}
    res.json(await Project.find(q).sort({ year: -1 }))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/categories', async (req, res) => {
  try {
    const cats = await Project.distinct('category')
    res.json(['Tous', ...cats.sort()])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const doc = await Project.findById(req.params.id).populate('client', 'name email')
    if (!doc) return res.status(404).json({ error: 'Projet introuvable' })
    res.json(doc)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── Routes protégées (mutations) ────────────────────────────────────────── */
router.post('/', auth, async (req, res) => {
  try { res.status(201).json(await Project.create(req.body)) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const doc = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('client', 'name email')
    if (!doc) return res.status(404).json({ error: 'Projet introuvable' })
    res.json(doc)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Project.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Projet introuvable' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── POST /:id/image — image principale du projet ───────────────────────── */
router.post('/:id/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' })
    const url  = `/uploads/projects/${req.file.filename}`
    // Supprimer l'ancienne image locale si elle existe
    const proj = await Project.findById(req.params.id)
    if (proj?.image?.startsWith('/uploads/')) {
      const old = path.join(__dirname, '..', proj.image)
      if (fs.existsSync(old)) fs.unlinkSync(old)
    }
    const updated = await Project.findByIdAndUpdate(
      req.params.id, { image: url }, { new: true }
    ).populate('client', 'name email')
    if (!updated) return res.status(404).json({ error: 'Projet introuvable' })
    res.json(updated)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── POST /:id/photos — upload fichier image ─────────────────────────────── */
router.post('/:id/photos', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' })
    const url  = `/uploads/projects/${req.file.filename}`
    const proj = await Project.findByIdAndUpdate(
      req.params.id,
      { $push: { photos: url } },
      { new: true }
    ).populate('client', 'name email')
    if (!proj) return res.status(404).json({ error: 'Projet introuvable' })
    res.json(proj)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── DELETE /:id/photos/:idx — supprimer une photo ──────────────────────── */
router.delete('/:id/photos/:idx', auth, async (req, res) => {
  try {
    const proj = await Project.findById(req.params.id)
    if (!proj) return res.status(404).json({ error: 'Projet introuvable' })

    const idx = Number(req.params.idx)
    const url = proj.photos[idx]

    // Supprimer le fichier physique si c'est un upload local
    if (url?.startsWith('/uploads/projects/')) {
      const filePath = path.join(__dirname, '..', url)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }

    proj.photos.splice(idx, 1)
    await proj.save()
    res.json(await Project.findById(proj._id).populate('client', 'name email'))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
