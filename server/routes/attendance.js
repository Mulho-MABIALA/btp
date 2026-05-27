const router     = require('express').Router()
const jwt        = require('jsonwebtoken')
const Attendance = require('../models/Attendance')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

// GET ?month=2025-05 or ?employee=id
router.get('/', auth, async (req, res) => {
  try {
    const filter = {}
    if (req.query.employee) filter.employee = req.query.employee
    if (req.query.month) {
      const [y, m] = req.query.month.split('-').map(Number)
      filter.date = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) }
    }
    res.json(await Attendance.find(filter).populate('employee', 'firstName lastName department').sort({ date: -1 }))
  }
  catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /missing-today?hour=9  — employees who haven't checked in yet
router.get('/missing-today', auth, async (req, res) => {
  try {
    const Employee  = require('../models/Employee')
    const now       = new Date()
    const threshold = parseInt(req.query.hour || '9', 10)
    const today     = new Date(now); today.setHours(0,0,0,0)
    const tomorrow  = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

    const [allActive, todayRecords] = await Promise.all([
      Employee.find({ status: 'Actif' }).select('firstName lastName department position photo'),
      Attendance.find({ date: { $gte: today, $lt: tomorrow } })
    ])

    const checkedInIds = new Set(
      todayRecords.filter(r => r.checkIn).map(r => r.employee.toString())
    )
    const missing = allActive.filter(e => !checkedInIds.has(e._id.toString()))

    res.json({
      employees:        missing,
      count:            missing.length,
      threshold:        `${String(threshold).padStart(2,'0')}:00`,
      currentHour:      now.getHours(),
      isAfterThreshold: now.getHours() >= threshold,
    })
  } catch(e) { res.status(500).json({ error: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    const date = new Date(req.body.date)
    date.setHours(0, 0, 0, 0)
    const nextDay = new Date(date); nextDay.setDate(nextDay.getDate() + 1)
    const existing = await Attendance.findOne({ employee: req.body.employee, date: { $gte: date, $lt: nextDay } })
    if (existing) {
      const updated = await Attendance.findByIdAndUpdate(existing._id, req.body, { new: true }).populate('employee', 'firstName lastName')
      return res.json(updated)
    }
    const a = await Attendance.create({ ...req.body, date })
    res.status(201).json(await Attendance.findById(a._id).populate('employee', 'firstName lastName department'))
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try { res.json(await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('employee', 'firstName lastName')) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try { await Attendance.findByIdAndDelete(req.params.id); res.json({ ok: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
