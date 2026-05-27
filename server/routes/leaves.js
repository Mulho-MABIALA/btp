const router     = require('express').Router()
const jwt        = require('jsonwebtoken')
const Leave      = require('../models/Leave')
const log        = require('../utils/logActivity')

const ANNUAL_QUOTA = 18  // Jours légaux au Maroc (Code du Travail)

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

// ── GET /  — list all leaves ──────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const filter = {}
    if (req.query.status)   filter.status   = req.query.status
    if (req.query.employee) filter.employee = req.query.employee
    res.json(await Leave.find(filter).populate('employee', 'firstName lastName department').sort({ createdAt: -1 }))
  }
  catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /balance/:empId  — annual leave balance for an employee ───────────────
router.get('/balance/:empId', auth, async (req, res) => {
  try {
    const year      = parseInt(req.query.year || new Date().getFullYear())
    const yearStart = new Date(year, 0, 1)
    const yearEnd   = new Date(year + 1, 0, 1)

    const approved = await Leave.find({
      employee: req.params.empId,
      status:   'approved',
      startDate: { $gte: yearStart, $lt: yearEnd }
    })

    const byType = {}
    approved.forEach(l => {
      byType[l.type] = (byType[l.type] || 0) + (l.days || 0)
    })

    const usedAnnual = byType['Congé annuel'] || 0

    res.json({
      year,
      annual:   { quota: ANNUAL_QUOTA, used: usedAnnual, remaining: Math.max(0, ANNUAL_QUOTA - usedAnnual) },
      sick:     { used: byType['Congé maladie'] || 0 },
      maternity:{ used: byType['Congé maternité'] || 0 },
      unpaid:   { used: byType['Congé sans solde'] || 0 },
      byType,
      totalDays: approved.reduce((s, l) => s + (l.days || 0), 0),
    })
  } catch(e) { res.status(500).json({ error: e.message }) }
})

// ── POST /  — create leave request (with conflict detection) ──────────────────
router.post('/', auth, async (req, res) => {
  try {
    const Employee = require('../models/Employee')

    // Detect conflicts with colleagues in same department
    const emp = await Employee.findById(req.body.employee).select('department')
    let conflicts = []
    if (emp) {
      const start = new Date(req.body.startDate)
      const end   = new Date(req.body.endDate)
      const deptEmps = await Employee.find({
        department: emp.department,
        status: 'Actif',
        _id: { $ne: emp._id }
      }).select('_id')
      conflicts = await Leave.find({
        employee: { $in: deptEmps.map(e => e._id) },
        status:   'approved',
        startDate: { $lte: end },
        endDate:   { $gte: start }
      }).populate('employee', 'firstName lastName')
    }

    const l = await Leave.create(req.body)
    await log(req, 'create', 'Leave', `Demande de congé`)
    const saved = await Leave.findById(l._id).populate('employee', 'firstName lastName department')

    res.status(201).json({
      leave: saved,
      conflicts: conflicts.map(c => ({
        employee: c.employee,
        type: c.type,
        startDate: c.startDate,
        endDate: c.endDate,
        days: c.days,
      }))
    })
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try { res.json(await Leave.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('employee', 'firstName lastName')) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

// ── PATCH /:id/status  — approve / reject + auto-sync attendance ──────────────
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, approvedBy } = req.body
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status, approvedBy },
      { new: true }
    ).populate('employee', 'firstName lastName')

    // ── Auto-sync: approved → create holiday attendance records ─────────
    if (status === 'approved') {
      const Attendance = require('../models/Attendance')
      const start = new Date(leave.startDate); start.setHours(0,0,0,0)
      const end   = new Date(leave.endDate);   end.setHours(23,59,59,999)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // Skip weekends (optional — some companies include them)
        // const dow = d.getDay()
        // if (dow === 0 || dow === 6) continue

        const date    = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        const nextDay = new Date(date); nextDay.setDate(nextDay.getDate() + 1)

        const existing = await Attendance.findOne({
          employee: leave.employee._id,
          date: { $gte: date, $lt: nextDay }
        })
        if (existing) {
          await Attendance.findByIdAndUpdate(existing._id, {
            status: 'holiday',
            notes: `Congé approuvé : ${leave.type}`
          })
        } else {
          await Attendance.create({
            employee:   leave.employee._id,
            date,
            status:     'holiday',
            hoursWorked: 0,
            notes:      `Congé approuvé : ${leave.type}`
          })
        }
      }
    }

    // ── Auto-sync: rejected → remove holiday records ─────────────────────
    if (status === 'rejected') {
      const Attendance = require('../models/Attendance')
      const start = new Date(leave.startDate); start.setHours(0,0,0,0)
      const end   = new Date(leave.endDate);   end.setHours(23,59,59,999)
      await Attendance.deleteMany({
        employee: leave.employee._id,
        date:     { $gte: start, $lte: end },
        status:   'holiday',
        notes:    { $regex: 'Congé approuvé' }
      })
    }

    await log(req, 'update', 'Leave', `Congé ${status}`)
    res.json(leave)
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try { await Leave.findByIdAndDelete(req.params.id); res.json({ ok: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
