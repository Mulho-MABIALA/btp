const router   = require('express').Router()
const jwt      = require('jsonwebtoken')
const path     = require('path')
const fs       = require('fs')
const multer   = require('multer')
const Employee = require('../models/Employee')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

/* ── Multer ─────────────────────────────────────────────────────────────── */
const uploadsDir = path.join(__dirname, '../uploads/employees')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) =>
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`),
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Image requise')),
})

const deleteFile = (url) => {
  if (!url?.startsWith('/uploads/employees/')) return
  const p = path.join(__dirname, '..', url)
  if (fs.existsSync(p)) fs.unlinkSync(p)
}

/* ── CRUD ────────────────────────────────────────────────────────────────── */
router.get('/', auth, async (req, res) => {
  try { res.json(await Employee.find().sort({ lastName: 1 })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try { res.status(201).json(await Employee.create(req.body)) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try { res.json(await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true })) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const emp = await Employee.findByIdAndDelete(req.params.id)
    if (emp?.photo) deleteFile(emp.photo)
    res.json({ ok: true })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

/* ── POST /:id/photo — photo de profil ───────────────────────────────────── */
router.post('/:id/photo', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' })
    const url = `/uploads/employees/${req.file.filename}`
    const old = await Employee.findById(req.params.id)
    if (old?.photo) deleteFile(old.photo)
    const emp = await Employee.findByIdAndUpdate(req.params.id, { photo: url }, { new: true })
    res.json(emp)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── Avances sur salaire ─────────────────────────────────────────────────── */
router.post('/:id/advances', auth, async (req, res) => {
  try {
    const emp = await Employee.findByIdAndUpdate(
      req.params.id,
      { $push: { advances: req.body } },
      { new: true, runValidators: true }
    )
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' })
    res.json(emp)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.patch('/:id/advances/:aid/status', auth, async (req, res) => {
  try {
    const emp = await Employee.findOneAndUpdate(
      { _id: req.params.id, 'advances._id': req.params.aid },
      { $set: { 'advances.$.status': req.body.status } },
      { new: true }
    )
    if (!emp) return res.status(404).json({ error: 'Avance introuvable' })
    res.json(emp)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id/advances/:aid', auth, async (req, res) => {
  try {
    const emp = await Employee.findByIdAndUpdate(
      req.params.id,
      { $pull: { advances: { _id: req.params.aid } } },
      { new: true }
    )
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' })
    res.json(emp)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

/* ── Formations & Habilitations ─────────────────────────────────────────── */
router.post('/:id/trainings', auth, async (req, res) => {
  try {
    const emp = await Employee.findByIdAndUpdate(
      req.params.id,
      { $push: { trainings: req.body } },
      { new: true, runValidators: true }
    )
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' })
    res.json(emp)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id/trainings/:tid', auth, async (req, res) => {
  try {
    const emp = await Employee.findByIdAndUpdate(
      req.params.id,
      { $pull: { trainings: { _id: req.params.tid } } },
      { new: true }
    )
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' })
    res.json(emp)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
