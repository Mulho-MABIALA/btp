const router = require('express').Router()
const jwt    = require('jsonwebtoken')
const Task   = require('../models/Task')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

router.get('/', auth, async (req, res) => {
  try {
    const filter = {}
    if (req.query.employeeRef) filter.employeeRef = req.query.employeeRef
    if (req.query.projectRef)  filter.projectRef  = req.query.projectRef
    const tasks = await Task.find(filter)
      .populate('employeeRef', 'firstName lastName role photo')
      .populate('projectRef',  'title status')
      .sort({ createdAt: -1 })
    res.json(tasks)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try { res.status(201).json(await Task.create(req.body)) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try { res.json(await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.patch('/:id/status', auth, async (req, res) => {
  try { res.json(await Task.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try { await Task.findByIdAndDelete(req.params.id); res.json({ ok: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
