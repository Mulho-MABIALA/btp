const router        = require('express').Router()
const jwt           = require('jsonwebtoken')
const Subcontractor = require('../models/Subcontractor')
const log           = require('../utils/logActivity')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

router.get('/', auth, async (req, res) => {
  try { res.json(await Subcontractor.find().sort({ name: 1 })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    const s = await Subcontractor.create(req.body)
    await log(req, 'create', 'Subcontractor', s.name)
    res.status(201).json(s)
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try { res.json(await Subcontractor.findByIdAndUpdate(req.params.id, req.body, { new: true })) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

// ── Versements / Paiements ────────────────────────────────────────────────────
router.post('/:id/payments', auth, async (req, res) => {
  try {
    const sub = await Subcontractor.findById(req.params.id)
    if (!sub) return res.status(404).json({ error: 'Sous-traitant introuvable' })
    sub.payments.push(req.body)
    // Recalc paidAmount from payments array
    sub.paidAmount = sub.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    await sub.save()
    res.json(sub)
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id/payments/:pid', auth, async (req, res) => {
  try {
    const sub = await Subcontractor.findById(req.params.id)
    if (!sub) return res.status(404).json({ error: 'Sous-traitant introuvable' })
    sub.payments = sub.payments.filter(p => p._id.toString() !== req.params.pid)
    sub.paidAmount = sub.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    await sub.save()
    res.json(sub)
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try { await Subcontractor.findByIdAndDelete(req.params.id); res.json({ ok: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
