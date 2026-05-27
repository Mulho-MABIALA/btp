const router      = require('express').Router()
const jwt         = require('jsonwebtoken')
const ActivityLog = require('../models/ActivityLog')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

router.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500)
    const filter = {}
    if (req.query.entity) filter.entity = req.query.entity
    if (req.query.user)   filter.user   = { $regex: req.query.user, $options: 'i' }
    res.json(await ActivityLog.find(filter).sort({ createdAt: -1 }).limit(limit))
  }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try { res.status(201).json(await ActivityLog.create(req.body)) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/clear', auth, async (req, res) => {
  try { await ActivityLog.deleteMany({}); res.json({ ok: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
