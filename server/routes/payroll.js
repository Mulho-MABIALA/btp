/**
 * Module Paie — Calcul des bulletins de salaire (réglementation marocaine)
 * CNSS salarié: 4.48% | CNSS employeur: 21.09%
 * AMO  salarié: 2.26% | AMO  employeur: 4.11%
 * IR: tranches progressives 2024
 */
const router     = require('express').Router()
const jwt        = require('jsonwebtoken')
const Payroll    = require('../models/Payroll')
const Employee   = require('../models/Employee')
const Attendance = require('../models/Attendance')
const Settings   = require('../models/Settings')
const log        = require('../utils/logActivity')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

// ── IR calculation (Code Général des Impôts 2024 - Maroc) ────────────────────
function calcIR(annualNetImposable) {
  // Abattement forfaitaire frais professionnels 20% (plafond 30,000 MAD/an)
  const forfait  = Math.min(annualNetImposable * 0.20, 30000)
  const imposable = Math.max(0, annualNetImposable - forfait)

  let irAnnual = 0
  if (imposable <= 30000)        irAnnual = 0
  else if (imposable <= 50000)   irAnnual = (imposable - 30000) * 0.10
  else if (imposable <= 60000)   irAnnual = 2000  + (imposable - 50000) * 0.20
  else if (imposable <= 80000)   irAnnual = 4000  + (imposable - 60000) * 0.30
  else if (imposable <= 180000)  irAnnual = 10000 + (imposable - 80000) * 0.34
  else                            irAnnual = 44000 + (imposable - 180000) * 0.38

  return Math.round(irAnnual / 12)  // IR mensuel
}

// ── Auto-calculate payroll from attendance data ───────────────────────────────
function buildPayroll(emp, attendance, overrides = {}) {
  const baseSalary  = overrides.baseSalary  ?? (emp.salary || 0)
  const bonuses     = overrides.bonuses     ?? 0
  const transport   = overrides.transport   ?? 0
  const meal        = overrides.meal        ?? 0
  const advances    = overrides.advances    ?? 0

  // From attendance
  const workingDays  = attendance.filter(r => ['present','late'].includes(r.status)).length
  const absenceDays  = attendance.filter(r => r.status === 'absent').length
  const hoursWorked  = attendance.reduce((s, r) => s + (r.hoursWorked || 0), 0)
  const totalOTHours = attendance.reduce((s, r) => s + (r.overtime || 0), 0)

  // Absence déduction (salaire journalier = salaire mensuel / 26 jours ouvrés)
  const dailyRate    = baseSalary / 26
  const absenceDed   = absenceDays * dailyRate

  // Heures supplémentaires (+25% légal Maroc pour les 8 premières heures/semaine)
  const hourlyRate   = baseSalary / (191.25)   // 44h/sem × 52/12 ≈ 191.25h/mois
  const otAmount     = Math.round(totalOTHours * hourlyRate * 1.25)

  const grossSalary  = Math.round(baseSalary - absenceDed + otAmount + bonuses + transport + meal)

  // CNSS salarié 4.48% — plafonné à 6,000 MAD brut/mois
  const cnssBase     = Math.min(grossSalary, 6000)
  const cnssEmployee = Math.round(cnssBase * 0.0448)
  const cnssEmployer = Math.round(grossSalary * 0.2109)

  // AMO salarié 2.26%
  const amoEmployee  = Math.round(grossSalary * 0.0226)
  const amoEmployer  = Math.round(grossSalary * 0.0411)

  // Net imposable = Brut - CNSS salarié - AMO salarié
  const netImposable = Math.max(0, grossSalary - cnssEmployee - amoEmployee)

  // IR mensuel
  const irAmount = calcIR(netImposable * 12)

  // Total déductions
  const totalDeductions = cnssEmployee + amoEmployee + irAmount + advances

  // Net à payer
  const netSalary = Math.max(0, grossSalary - totalDeductions)

  // Coût employeur total
  const employerCost = grossSalary + cnssEmployer + amoEmployer

  return {
    baseSalary, hoursWorked, workingDays, absenceDays,
    otHours: totalOTHours, otRate: 1.25, otAmount,
    bonuses, transport, meal,
    grossSalary,
    cnssEmployee, cnssEmployer,
    amoEmployee, amoEmployer,
    netImposable, irAmount,
    advances, otherDeductions: 0,
    totalDeductions, netSalary,
    employerCost,
  }
}

// ── GET / — list payrolls ─────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const filter = {}
    if (req.query.month)    filter.month    = req.query.month
    if (req.query.employee) filter.employee = req.query.employee
    if (req.query.status)   filter.status   = req.query.status
    const payrolls = await Payroll.find(filter)
      .populate('employee', 'firstName lastName department position role salary cnss rib photo')
      .sort({ month: -1, createdAt: -1 })
    res.json(payrolls)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /generate — bulk generate for a month ────────────────────────────────
router.post('/generate', auth, async (req, res) => {
  try {
    const { month } = req.body   // "2026-05"
    if (!month) return res.status(400).json({ error: 'month requis (YYYY-MM)' })

    const [y, m] = month.split('-').map(Number)
    const start  = new Date(y, m - 1, 1)
    const end    = new Date(y, m, 1)

    const employees  = await Employee.find({ status: 'Actif' })
    const attendance = await Attendance.find({ date: { $gte: start, $lt: end } })

    const results = []
    for (const emp of employees) {
      const empAtt = attendance.filter(a => a.employee?.toString() === emp._id.toString())
      const data   = buildPayroll(emp, empAtt)

      // Get pending advances to deduct
      const pendingAdvances = (emp.advances || []).filter(a => a.status === 'en attente')
      const advancesAmount  = pendingAdvances.reduce((s, a) => s + (a.amount || 0), 0)
      if (advancesAmount > 0) {
        data.advances        = advancesAmount
        data.totalDeductions = data.cnssEmployee + data.amoEmployee + data.irAmount + advancesAmount
        data.netSalary       = Math.max(0, data.grossSalary - data.totalDeductions)
      }

      try {
        const p = await Payroll.findOneAndUpdate(
          { employee: emp._id, month },
          { ...data, employee: emp._id, month, year: y, status: 'brouillon' },
          { upsert: true, new: true }
        ).populate('employee', 'firstName lastName department position role salary photo')
        results.push(p)

        // Mark advances as "déduit" after generation
        if (advancesAmount > 0) {
          await Employee.findByIdAndUpdate(emp._id, {
            $set: { 'advances.$[el].status': 'déduit' }
          }, { arrayFilters: [{ 'el.status': 'en attente' }] })
        }
      } catch (_) {}
    }

    res.json({ generated: results.length, payrolls: results })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST / — create single payroll ───────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const p = await Payroll.findOneAndUpdate(
      { employee: req.body.employee, month: req.body.month },
      { ...req.body, year: parseInt(req.body.month.split('-')[0]) },
      { upsert: true, new: true }
    ).populate('employee', 'firstName lastName department position role salary photo')
    res.status(201).json(p)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ── PUT /:id — update payroll ─────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const p = await Payroll.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('employee', 'firstName lastName department position role salary photo')
    res.json(p)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ── PATCH /:id/status ─────────────────────────────────────────────────────────
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const update = { status: req.body.status }
    if (req.body.status === 'payé') update.paidDate = new Date()
    const p = await Payroll.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('employee', 'firstName lastName department position role salary photo')
    res.json(p)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try { await Payroll.findByIdAndDelete(req.params.id); res.json({ ok: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

// ── POST /:id/send-email — envoyer bulletin par email ────────────────────────
router.post('/:id/send-email', auth, async (req, res) => {
  try {
    const p = await Payroll.findById(req.params.id)
      .populate('employee', 'firstName lastName department position role salary cnss rib email photo')
    if (!p) return res.status(404).json({ error: 'Bulletin introuvable' })

    const settings = await Settings.findOne({})
    if (!settings?.smtpHost || !settings?.smtpUser)
      return res.status(400).json({ error: 'Configuration SMTP manquante. Configurez dans les Paramètres.' })

    const to = req.body.to || p.employee?.email
    if (!to) return res.status(400).json({ error: 'Email employé manquant' })

    const nodemailer  = require('nodemailer')
    const transporter = nodemailer.createTransport({
      host:   settings.smtpHost,
      port:   settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth:   { user: settings.smtpUser, pass: settings.smtpPass },
    })

    const fmt = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)
    const [y, m] = p.month.split('-').map(Number)
    const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const emp = p.employee
    const company = settings.companyName || 'CONSTRUCTPRO'

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#333">
        <div style="background:#0f172a;padding:24px;border-radius:8px 8px 0 0">
          <h2 style="color:white;margin:0">${company}</h2>
          <p style="color:#94a3b8;margin:4px 0 0">Bulletin de paie — ${monthLabel}</p>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <p>Bonjour <strong>${emp?.firstName} ${emp?.lastName}</strong>,</p>
          <p>Veuillez trouver ci-dessous votre bulletin de paie pour le mois de <strong>${monthLabel}</strong>.</p>

          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
            <tr style="background:#f8fafc">
              <td colspan="2" style="padding:10px 12px;font-weight:bold;color:#1e40af;border:1px solid #e5e7eb">RÉMUNÉRATION</td>
            </tr>
            <tr><td style="padding:8px 12px;border:1px solid #e5e7eb">Salaire de base</td><td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right">${fmt(p.baseSalary)} MAD</td></tr>
            ${p.otAmount > 0 ? `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb">Heures supplémentaires</td><td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right">+ ${fmt(p.otAmount)} MAD</td></tr>` : ''}
            ${p.bonuses  > 0 ? `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb">Primes</td><td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right">+ ${fmt(p.bonuses)} MAD</td></tr>` : ''}
            ${p.transport> 0 ? `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb">Indemnité transport</td><td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right">+ ${fmt(p.transport)} MAD</td></tr>` : ''}
            <tr style="background:#f8fafc;font-weight:bold">
              <td style="padding:8px 12px;border:1px solid #e5e7eb">Salaire BRUT</td>
              <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right">${fmt(p.grossSalary)} MAD</td>
            </tr>
            <tr style="background:#f8fafc;margin-top:8px">
              <td colspan="2" style="padding:10px 12px;font-weight:bold;color:#dc2626;border:1px solid #e5e7eb">RETENUES & COTISATIONS</td>
            </tr>
            <tr><td style="padding:8px 12px;border:1px solid #e5e7eb">CNSS salarié (4.48%)</td><td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;color:#dc2626">− ${fmt(p.cnssEmployee)} MAD</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid #e5e7eb">AMO salarié (2.26%)</td><td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;color:#dc2626">− ${fmt(p.amoEmployee)} MAD</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid #e5e7eb">IR mensuel</td><td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;color:#dc2626">− ${fmt(p.irAmount)} MAD</td></tr>
            ${p.advances > 0 ? `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb">Avances déduites</td><td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;color:#dc2626">− ${fmt(p.advances)} MAD</td></tr>` : ''}
            <tr style="background:#dcfce7">
              <td style="padding:12px;font-weight:bold;font-size:15px;color:#16a34a;border:1px solid #bbf7d0">NET À PAYER</td>
              <td style="padding:12px;font-weight:bold;font-size:15px;color:#16a34a;text-align:right;border:1px solid #bbf7d0">${fmt(p.netSalary)} MAD</td>
            </tr>
          </table>

          <p style="font-size:12px;color:#6b7280">Jours travaillés : ${p.workingDays || 0} · Absences : ${p.absenceDays || 0} · H. sup : ${(p.otHours||0).toFixed(1)}h</p>
          ${req.body.message ? `<p>${req.body.message}</p>` : ''}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
          <p style="color:#6b7280;font-size:12px">${company} — Document confidentiel · Ne pas diffuser</p>
        </div>
      </div>`

    await transporter.sendMail({
      from:    `"${company} RH" <${settings.smtpFrom || settings.smtpUser}>`,
      to,
      subject: req.body.subject || `Bulletin de paie ${monthLabel} — ${company}`,
      html,
    })

    await log(req, 'email', 'Payroll', `Bulletin ${p.month} envoyé à ${to}`)
    res.json({ ok: true, to })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /summary/:month — monthly totals for dashboard ───────────────────────
router.get('/summary/:month', auth, async (req, res) => {
  try {
    const payrolls = await Payroll.find({ month: req.params.month })
    res.json({
      count:         payrolls.length,
      totalGross:    payrolls.reduce((s, p) => s + p.grossSalary,    0),
      totalNet:      payrolls.reduce((s, p) => s + p.netSalary,      0),
      totalCNSS:     payrolls.reduce((s, p) => s + p.cnssEmployer,   0),
      totalIR:       payrolls.reduce((s, p) => s + p.irAmount,       0),
      employerCost:  payrolls.reduce((s, p) => s + p.employerCost,   0),
      paid:          payrolls.filter(p => p.status === 'payé').length,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
