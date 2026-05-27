/**
 * Kiosk routes — public endpoints for the check-in terminal
 * No JWT required (physical internal terminal)
 * Logs every scan to KioskLog for admin history
 */
const router       = require('express').Router()
const jwt          = require('jsonwebtoken')
const Employee     = require('../models/Employee')
const Attendance   = require('../models/Attendance')
const WorkSchedule = require('../models/WorkSchedule')
const KioskLog     = require('../models/KioskLog')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

function nowHHMM() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
}

// ── GET /api/kiosk/search?q=  — employee name search (public) ───────────────
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    if (q.length < 2) return res.json([])
    const regex = new RegExp(q, 'i')
    const employees = await Employee.find({
      status: 'Actif',
      $or: [{ firstName: regex }, { lastName: regex }]
    })
    .select('firstName lastName department position photo')
    .limit(8)
    res.json(employees)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /api/kiosk/attendance/:empId  — employee's own records (public) ──────
router.get('/attendance/:empId', async (req, res) => {
  try {
    const { empId } = req.params
    const month = req.query.month  // e.g. "2026-05"
    const filter = { employee: empId }
    if (month) {
      const [y, m] = month.split('-').map(Number)
      filter.date = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) }
    }
    const records = await Attendance.find(filter).sort({ date: -1 }).limit(60)
    res.json(records)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ── GET /api/kiosk/schedule/:empId  — employee's own schedule (public) ───────
router.get('/schedule/:empId', async (req, res) => {
  try {
    const schedules = await WorkSchedule.find({ employee: req.params.empId })
      .sort({ date: 1 })
      .limit(30)
    res.json(schedules)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ── GET /api/kiosk/badge/:suffix  — find employee by last-6-chars of _id ─────
router.get('/badge/:suffix', async (req, res) => {
  try {
    const suffix = req.params.suffix.toUpperCase()
    // Fetch all active employees and match suffix (small dataset, fine)
    const all = await Employee.find({ status: 'Actif' }).select('firstName lastName department position photo status')
    const found = all.find(e => e._id.toString().slice(-6).toUpperCase() === suffix)
    if (!found) return res.status(404).json({ error: 'Badge non reconnu' })
    res.json(found)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ── GET /api/kiosk/employee/:id  — safe public profile ───────────────────────
router.get('/employee/:id', async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id).select(
      'firstName lastName position department photo status'
    )
    if (!emp)                return res.status(404).json({ error: 'Employé introuvable' })
    if (emp.status !== 'Actif') return res.status(403).json({ error: 'Compte inactif' })
    res.json(emp)
  } catch (e) { res.status(400).json({ error: 'ID invalide' }) }
})

// ── GET /api/kiosk/status/:empId  — today's record ───────────────────────────
router.get('/status/:empId', async (req, res) => {
  try {
    const today    = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const record   = await Attendance.findOne({
      employee: req.params.empId,
      date: { $gte: today, $lt: tomorrow }
    })
    res.json(record || null)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ── POST /api/kiosk/checkin  — check-in or check-out ─────────────────────────
router.post('/checkin', async (req, res) => {
  try {
    const { empId, site, latitude, longitude } = req.body
    if (!empId) return res.status(400).json({ error: 'empId requis' })

    const emp = await Employee.findById(empId).select('firstName lastName position department photo status')
    if (!emp)                return res.status(404).json({ error: 'Employé introuvable' })
    if (emp.status !== 'Actif') return res.status(403).json({ error: 'Compte inactif' })

    const now      = new Date()
    const timeStr  = nowHHMM()
    const today    = new Date(now); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

    // Check planned shift for late detection
    const shift = await WorkSchedule.findOne({
      employee: empId,
      date: { $gte: today, $lt: tomorrow }
    })

    let record = await Attendance.findOne({
      employee: empId,
      date: { $gte: today, $lt: tomorrow }
    })

    let action  = 'in'
    let message = ''

    if (!record || !record.checkIn) {
      // ── CHECK-IN ─────────────────────────────────────────────────────────
      action = 'in'
      let status = 'present'
      if (shift?.startTime) {
        const [sh, sm]    = shift.startTime.split(':').map(Number)
        const scheduledMins = sh * 60 + sm + 15   // 15min tolerance
        const nowMins       = now.getHours() * 60 + now.getMinutes()
        if (nowMins > scheduledMins) status = 'late'
      }

      if (record) {
        record = await Attendance.findByIdAndUpdate(record._id, {
          checkIn: timeStr, status,
          site: site || record.site || undefined
        }, { new: true })
      } else {
        record = await Attendance.create({
          employee: empId,
          date: today,
          checkIn: timeStr,
          status,
          site: site || shift?.site || undefined,
          hoursWorked: 0
        })
      }

      message = status === 'late'
        ? `Retard signalé — arrivée prévue ${shift?.startTime}`
        : `Bonne journée, ${emp.firstName} !`

    } else if (record.checkIn && !record.checkOut) {
      // ── CHECK-OUT ────────────────────────────────────────────────────────
      action = 'out'
      const [ih, im] = record.checkIn.split(':').map(Number)
      const inMins   = ih * 60 + im
      const outMins  = now.getHours() * 60 + now.getMinutes()
      const worked   = Math.max(0, outMins - inMins)
      const workedH  = Math.floor(worked / 60)
      const workedM  = worked % 60

      // ── Weekly overtime (Maroc = 44h/semaine légal) ──────────────────
      const weekStart  = new Date(today)
      const dayOfWeek  = weekStart.getDay()
      weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)) // lundi
      const weekRecords = await Attendance.find({
        employee: empId,
        date:     { $gte: weekStart, $lt: tomorrow },
        _id:      { $ne: record._id },
        status:   { $in: ['present', 'late'] }
      })
      const weeklyHours = weekRecords.reduce((s, r) => s + (r.hoursWorked || 0), 0) + parseFloat((worked / 60).toFixed(2))
      const overtime    = Math.max(0, parseFloat((weeklyHours - 44).toFixed(2)))

      record = await Attendance.findByIdAndUpdate(record._id, {
        checkOut:   timeStr,
        hoursWorked: parseFloat((worked / 60).toFixed(2)),
        overtime,
        status: record.status === 'late' ? 'late' : 'present'
      }, { new: true })

      const otMsg = overtime > 0 ? ` (${overtime}h sup)` : ''
      message = `Au revoir, ${emp.firstName} ! Vous avez travaillé ${workedH}h${workedM > 0 ? String(workedM).padStart(2,'0') : ''}${otMsg}.`

    } else {
      // Already checked out → new entry (re-check-in)
      action  = 're-in'
      record  = await Attendance.findByIdAndUpdate(record._id, {
        checkIn: timeStr, checkOut: null, hoursWorked: 0, status: 'present'
      }, { new: true })
      message = `Nouvelle entrée enregistrée, ${emp.firstName}.`
    }

    // ── Log this scan to KioskLog ─────────────────────────────────────────
    await KioskLog.create({
      employee: empId,
      action,
      time: timeStr,
      site: site || record?.site || undefined,
      latitude:  latitude  || undefined,
      longitude: longitude || undefined,
      message,
    })

    res.json({ employee: emp, action, time: timeStr, record, message })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ── GET /api/kiosk/logs  — admin history (JWT required) ──────────────────────
router.get('/logs', auth, async (req, res) => {
  try {
    const { date, employee, action, limit = 200 } = req.query
    const filter = {}

    if (employee) filter.employee = employee
    if (action && action !== 'all') filter.action = action

    if (date) {
      const d = new Date(date); d.setHours(0,0,0,0)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      filter.createdAt = { $gte: d, $lt: next }
    }

    const logs = await KioskLog.find(filter)
      .populate('employee', 'firstName lastName department position photo')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))

    res.json(logs)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /api/kiosk/logs/today-summary  — fast summary for dashboard ──────────
router.get('/logs/today-summary', auth, async (req, res) => {
  try {
    const today    = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

    const [total, ins, outs] = await Promise.all([
      KioskLog.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
      KioskLog.countDocuments({ createdAt: { $gte: today, $lt: tomorrow }, action: 'in' }),
      KioskLog.countDocuments({ createdAt: { $gte: today, $lt: tomorrow }, action: 'out' }),
    ])
    res.json({ total, ins, outs })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
