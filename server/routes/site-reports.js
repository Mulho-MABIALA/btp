const router     = require('express').Router()
const jwt        = require('jsonwebtoken')
const multer     = require('multer')
const path       = require('path')
const fs         = require('fs')
const SiteReport = require('../models/SiteReport')
const log        = require('../utils/logActivity')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

const uploadsDir = path.join(__dirname, '../uploads/site-reports')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
})
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } })

// ── CRUD ─────────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const filter = {}
    if (req.query.project) filter.project = { $regex: req.query.project, $options: 'i' }
    res.json(await SiteReport.find(filter).sort({ date: -1 }))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    const rep = await SiteReport.create(req.body)
    await log(req, 'create', 'SiteReport', `${rep.project} – ${new Date(rep.date).toLocaleDateString('fr-FR')}`)
    res.status(201).json(rep)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try { res.json(await SiteReport.findByIdAndUpdate(req.params.id, req.body, { new: true })) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const rep = await SiteReport.findByIdAndDelete(req.params.id)
    if (rep?.photos?.length) {
      for (const url of rep.photos) {
        const fname = url.replace('/uploads/site-reports/', '')
        const fp = path.join(uploadsDir, fname)
        if (fs.existsSync(fp)) fs.unlinkSync(fp)
      }
    }
    res.json({ ok: true })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ── Photos ────────────────────────────────────────────────────────────────────
router.post('/:id/photos', auth, upload.single('photo'), async (req, res) => {
  try {
    const url = `/uploads/site-reports/${req.file.filename}`
    const rep = await SiteReport.findByIdAndUpdate(req.params.id, { $push: { photos: url } }, { new: true })
    res.json(rep)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id/photos/:idx', auth, async (req, res) => {
  try {
    const rep = await SiteReport.findById(req.params.id)
    if (!rep) return res.status(404).json({ error: 'Non trouvé' })
    const idx = Number(req.params.idx)
    const url = rep.photos[idx]
    if (url) {
      const fname = url.replace('/uploads/site-reports/', '')
      const fp = path.join(uploadsDir, fname)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    }
    rep.photos.splice(idx, 1)
    await rep.save()
    res.json(rep)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
