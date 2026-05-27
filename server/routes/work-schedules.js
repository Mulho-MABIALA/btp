const router       = require('express').Router()
const jwt          = require('jsonwebtoken')
const WorkSchedule = require('../models/WorkSchedule')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

// GET  ?start=YYYY-MM-DD&end=YYYY-MM-DD&employee=id&site=xxx
router.get('/', auth, async (req, res) => {
  try {
    const filter = {}
    if (req.query.employee) filter.employee = req.query.employee
    if (req.query.site)     filter.site     = { $regex: req.query.site, $options: 'i' }
    if (req.query.start || req.query.end) {
      filter.date = {}
      if (req.query.start) filter.date.$gte = new Date(req.query.start)
      if (req.query.end)   filter.date.$lte = new Date(req.query.end)
    }
    res.json(
      await WorkSchedule.find(filter)
        .populate('employee', 'firstName lastName department photo')
        .sort({ date: 1, startTime: 1 })
    )
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    const doc = await WorkSchedule.create(req.body)
    const populated = await WorkSchedule.findById(doc._id).populate('employee', 'firstName lastName department photo')
    res.status(201).json(populated)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try {
    res.json(
      await WorkSchedule.findByIdAndUpdate(req.params.id, req.body, { new: true })
        .populate('employee', 'firstName lastName department photo')
    )
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try { await WorkSchedule.findByIdAndDelete(req.params.id); res.json({ ok: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

// Copy previous week → current week (for an employee or all)
router.post('/copy-week', auth, async (req, res) => {
  try {
    const { fromStart, toStart, employeeId } = req.body
    const from = new Date(fromStart)
    const to   = new Date(toStart)
    const fromEnd = new Date(from); fromEnd.setDate(fromEnd.getDate() + 6)

    const filter = { date: { $gte: from, $lte: fromEnd } }
    if (employeeId) filter.employee = employeeId

    const source = await WorkSchedule.find(filter)
    const diff   = to - from   // ms diff between weeks

    const copies = source.map(s => ({
      employee:  s.employee,
      date:      new Date(s.date.getTime() + diff),
      startTime: s.startTime,
      endTime:   s.endTime,
      breaks:    s.breaks,
      shiftType: s.shiftType,
      site:      s.site,
      status:    'planifié',
      notes:     s.notes,
    }))

    const created = await WorkSchedule.insertMany(copies)
    res.status(201).json({ count: created.length })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
