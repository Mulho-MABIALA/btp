const router    = require('express').Router()
const jwt       = require('jsonwebtoken')
const WorkOrder = require('../models/WorkOrder')
const log       = require('../utils/logActivity')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

router.get('/', auth, async (req, res) => {
  try { res.json(await WorkOrder.find().sort({ createdAt: -1 })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    if (!req.body.number) {
      const count = await WorkOrder.countDocuments()
      req.body.number = `BT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`
    }
    const wo = await WorkOrder.create(req.body)
    await log(req, 'create', 'WorkOrder', `${wo.number} – ${wo.title}`)
    res.status(201).json(wo)
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try { res.json(await WorkOrder.findByIdAndUpdate(req.params.id, req.body, { new: true })) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.patch('/:id/status', auth, async (req, res) => {
  try { res.json(await WorkOrder.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try { await WorkOrder.findByIdAndDelete(req.params.id); res.json({ ok: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
