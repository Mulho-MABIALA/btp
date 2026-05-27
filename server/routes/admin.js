const router  = require('express').Router()
const jwt     = require('jsonwebtoken')
const Admin       = require('../models/Admin')
const Project     = require('../models/Project')
const Service     = require('../models/Service')
const TeamMember  = require('../models/TeamMember')
const BlogPost    = require('../models/BlogPost')
const Testimonial = require('../models/Testimonial')
const Contact     = require('../models/Contact')
const Quote       = require('../models/Quote')

const SECRET = process.env.JWT_SECRET || 'btp_secret_2026'

// ── Auth middleware ────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { req.admin = jwt.verify(token, SECRET); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

// ── Login (email + mot de passe depuis la base de données) ─────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' })

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() })
    if (!admin) return res.status(401).json({ error: 'Identifiants incorrects' })

    const ok = await admin.comparePassword(password)
    if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' })

    const token = jwt.sign({ role: 'admin', id: admin._id, email: admin.email }, SECRET, { expiresIn: '24h' })
    res.json({ token, message: 'Connexion réussie', email: admin.email })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Stats basiques (rétro-compatibilité) ──────────────────────────────────
router.get('/stats', auth, async (req, res) => {
  try {
    const [projects, services, team, blog, testimonials, contacts, quotes] = await Promise.all([
      Project.countDocuments(), Service.countDocuments(), TeamMember.countDocuments(),
      BlogPost.countDocuments(), Testimonial.countDocuments(), Contact.countDocuments(), Quote.countDocuments(),
    ])
    const newContacts    = await Contact.countDocuments({ status: 'new' })
    const newQuotes      = await Quote.countDocuments({ status: 'new' })
    const recentContacts = await Contact.find().sort({ createdAt: -1 }).limit(5)
    const recentQuotes   = await Quote.find().sort({ createdAt: -1 }).limit(5)
    res.json({ projects, services, team, blog, testimonials, contacts, quotes, newContacts, newQuotes, recentContacts, recentQuotes })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Dashboard complet ──────────────────────────────────────────────────────
router.get('/dashboard', auth, async (req, res) => {
  try {
    const Client        = require('../models/Client')
    const Invoice       = require('../models/Invoice')
    const Expense       = require('../models/Expense')
    const Material      = require('../models/Material')
    const Task          = require('../models/Task')
    const Reminder      = require('../models/Reminder')
    const Employee      = require('../models/Employee')
    const Leave         = require('../models/Leave')
    const Attendance    = require('../models/Attendance')
    const Equipment     = require('../models/Equipment')
    const HSEIncident   = require('../models/HSEIncident')
    const ActivityLog   = require('../models/ActivityLog')
    const PurchaseOrder = require('../models/PurchaseOrder')
    const Subcontractor = require('../models/Subcontractor')
    const SiteReport    = require('../models/SiteReport')

    const Settings      = require('../models/Settings')
    const now        = new Date()
    const in7Days    = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const in30Days   = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const currMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    const weekStart      = (() => {
      const d = new Date(todayStart)
      const day = d.getDay() || 7  // 0=Sun→7
      d.setDate(d.getDate() - (day - 1))  // back to Monday
      return d
    })()

    // ── Période sélecteur (month / quarter / year) ────────────────────────
    const period = req.query.period || 'month'
    let currPeriodStart, prevPeriodStart, prevPeriodEnd
    if (period === 'quarter') {
      const qMonth    = Math.floor(now.getMonth() / 3) * 3
      currPeriodStart = new Date(now.getFullYear(), qMonth, 1)
      prevPeriodStart = new Date(now.getFullYear(), qMonth - 3, 1)
      prevPeriodEnd   = new Date(now.getFullYear(), qMonth, 0, 23, 59, 59)
    } else if (period === 'year') {
      currPeriodStart = new Date(now.getFullYear(), 0, 1)
      prevPeriodStart = new Date(now.getFullYear() - 1, 0, 1)
      prevPeriodEnd   = new Date(now.getFullYear(), 0, 0, 23, 59, 59)
    } else {
      currPeriodStart = currMonthStart
      prevPeriodStart = prevMonthStart
      prevPeriodEnd   = prevMonthEnd
    }

    const [
      projectsCount, clientsCount, newContacts, newQuotes,
      allInvoices, allExpenses,
      taskTodo, taskInProgress, taskReview, taskDone,
      recentInvoices, urgentTasks, lowStockMaterials, recentContacts, recentQuotes,
      // New dashboard data
      activeProjectsRaw,
      upcomingReminders,
      leavesToday,
      totalActiveEmployees,
      presentCount,
      absentCount,
      equipmentAlerts,
      hseOpen, hseInProgress, hseCritical, hseLastIncident,
      allInvoicesForCashFlow,
      pendingPOs,
      activePOsForPayables,
      activeSubcontractors,
      recentActivity,
      recentSiteReports,
      currRevAgg, prevRevAgg, currExpAgg, prevExpAgg,
      currClients, prevClients, currTasks, prevTasks,
      topClientsAgg,
      supplierPayments,
      weekAttendance,
      settingsDoc,
    ] = await Promise.all([
      Project.countDocuments(),
      Client.countDocuments(),
      Contact.countDocuments({ status: 'new' }),
      Quote.countDocuments({ status: 'new' }),
      Invoice.find().lean(),
      Expense.find().lean(),
      Task.countDocuments({ status: 'todo' }),
      Task.countDocuments({ status: 'in-progress' }),
      Task.countDocuments({ status: 'review' }),
      Task.countDocuments({ status: 'done' }),
      Invoice.find().sort({ date: -1 }).limit(6).populate('client', 'name city'),
      Task.find({ status: { $ne: 'done' }, priority: { $in: ['high', 'urgent'] } }).sort({ dueDate: 1 }).limit(6),
      Material.find({ $expr: { $lte: ['$quantity', '$minStock'] } }).limit(5),
      Contact.find({ status: 'new' }).sort({ createdAt: -1 }).limit(3),
      Quote.find({ status: 'new' }).sort({ createdAt: -1 }).limit(3),
      // Active projects top 5
      Project.find({ status: 'active' }, '_id title progress budgetAmount spent deliveryDate clientName').sort({ createdAt: -1 }).limit(5).lean(),
      // Upcoming reminders (pending, due within 7 days or overdue)
      Reminder.find({ status: 'pending', dueDate: { $lte: in7Days } }).sort({ dueDate: 1 }).limit(5).lean(),
      // HR: employees on leave today
      Leave.find({ status: 'approved', startDate: { $lte: todayEnd }, endDate: { $gte: todayStart } })
        .populate('employee', 'firstName lastName').limit(5).lean(),
      Employee.countDocuments({ status: 'Actif' }),
      Attendance.countDocuments({ date: { $gte: todayStart, $lte: todayEnd }, status: { $in: ['present', 'late', 'half-day'] } }),
      Attendance.countDocuments({ date: { $gte: todayStart, $lte: todayEnd }, status: 'absent' }),
      // Equipment alerts (maintenance due within 7 days, not retired)
      Equipment.find({ nextMaintenanceDate: { $exists: true, $lte: in7Days }, status: { $ne: 'retired' } })
        .sort({ nextMaintenanceDate: 1 }).limit(5).lean(),
      // HSE stats
      HSEIncident.countDocuments({ status: 'open' }),
      HSEIncident.countDocuments({ status: 'in_progress' }),
      HSEIncident.countDocuments({ severity: { $in: ['major', 'critical'] }, status: { $ne: 'closed' } }),
      HSEIncident.findOne({ status: { $in: ['open', 'in_progress'] } }, 'title date severity site').sort({ date: -1 }).lean(),
      // Cash flow — invoices for receivables
      Invoice.find({ status: { $in: ['sent', 'partial', 'overdue'] } }).lean(),
      // Pending POs
      PurchaseOrder.find({ status: { $in: ['draft', 'sent'] } }).sort({ orderDate: -1 }).limit(5).populate('supplier', 'name').lean(),
      // Payables from POs
      PurchaseOrder.find({ status: { $in: ['draft', 'sent'] } }).lean(),
      // Subcontractor debt
      Subcontractor.find({ status: 'Actif' }).lean(),
      // Recent activity
      ActivityLog.find().sort({ createdAt: -1 }).limit(6).lean(),
      // Recent site reports
      SiteReport.find({}, 'date project author progress weather').sort({ date: -1 }).limit(3).lean(),
      // Tendances — current vs previous period (sensible au sélecteur de période)
      Invoice.aggregate([{ $match: { status: 'paid', date: { $gte: currPeriodStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Invoice.aggregate([{ $match: { status: 'paid', date: { $gte: prevPeriodStart, $lte: prevPeriodEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { date: { $gte: currPeriodStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { date: { $gte: prevPeriodStart, $lte: prevPeriodEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Client.countDocuments({ createdAt: { $gte: currPeriodStart } }),
      Client.countDocuments({ createdAt: { $gte: prevPeriodStart, $lte: prevPeriodEnd } }),
      Task.countDocuments({ status: { $ne: 'done' }, createdAt: { $gte: currPeriodStart } }),
      Task.countDocuments({ status: { $ne: 'done' }, createdAt: { $gte: prevPeriodStart, $lte: prevPeriodEnd } }),
      // Top clients by CA (paid invoices)
      Invoice.aggregate([
        { $match: { status: 'paid', client: { $exists: true, $ne: null } } },
        { $group: { _id: '$client', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }, { $limit: 5 },
        { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'info' } },
        { $project: { total: 1, count: 1, name: { $arrayElemAt: ['$info.name', 0] }, city: { $arrayElemAt: ['$info.city', 0] } } },
      ]),
      // Supplier payments in next 30 days
      PurchaseOrder.find({ status: { $in: ['sent', 'received'] }, deliveryDate: { $gte: todayStart, $lte: in30Days } })
        .sort({ deliveryDate: 1 }).limit(5).populate('supplier', 'name').lean(),
      // Week hours (attendance this week)
      Attendance.find({ date: { $gte: weekStart } }).lean(),
      // Monthly target from settings
      Settings.findOne({}, 'monthlyRevenueTarget').lean(),
    ])

    // ── Finance ──────────────────────────────────────────────────────────
    const totalRevenue  = allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0)
    const pendingAmount = allInvoices.filter(i => i.status === 'sent').reduce((s, i) => s + (i.amount || 0), 0)
    const totalExpenses = allExpenses.reduce((s, e) => s + (e.amount || 0), 0)
    const netProfit     = totalRevenue - totalExpenses

    // ── Données mensuelles (6 derniers mois) ─────────────────────────────
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const d    = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const rev  = allInvoices
        .filter(inv => inv.status === 'paid' && new Date(inv.date) >= d && new Date(inv.date) <= dEnd)
        .reduce((s, inv) => s + (inv.amount || 0), 0)
      const exp  = allExpenses
        .filter(exp => new Date(exp.date) >= d && new Date(exp.date) <= dEnd)
        .reduce((s, exp) => s + (exp.amount || 0), 0)
      monthlyData.push({
        month: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        revenue: rev, expenses: exp, profit: rev - exp,
      })
    }

    // ── Dépenses par catégorie ────────────────────────────────────────────
    const expenseByCategory = {}
    allExpenses.forEach(e => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount
    })
    const expenseCategories = Object.entries(expenseByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // ── Cash flow calculations ────────────────────────────────────────────
    const receivables = allInvoicesForCashFlow.reduce((s, i) => {
      const ttc = (i.amount || 0) * (1 + (i.tax || 20) / 100)
      return s + (ttc - (i.amountPaid || 0))
    }, 0)
    const payables = activePOsForPayables.reduce((s, po) => s + (po.total || 0), 0)
    const subDebt  = activeSubcontractors.reduce((s, sub) => {
      return s + Math.max(0, (sub.contractAmount || 0) - (sub.paidAmount || 0))
    }, 0)

    // ── Budget burn ────────────────────────────────────────────────────────
    const totalBudget = activeProjectsRaw.reduce((s, p) => s + (p.budgetAmount || 0), 0)
    const totalSpent  = activeProjectsRaw.reduce((s, p) => s + (p.spent || 0), 0)

    // ── Tendances mois en cours vs mois précédent ────────────────────────
    const tr = (curr, prev) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : (curr > 0 ? 100 : null)
    const currRev  = currRevAgg[0]?.total || 0
    const prevRev  = prevRevAgg[0]?.total || 0
    const currExp  = currExpAgg[0]?.total || 0
    const prevExp  = prevExpAgg[0]?.total || 0
    const trends = {
      revenue:  tr(currRev, prevRev),
      expenses: tr(currExp, prevExp),
      clients:  tr(currClients, prevClients),
      tasks:    tr(currTasks, prevTasks),
      currRev,
    }

    // ── Vieillissement créances ──────────────────────────────────────────
    const aging = { current: 0, d30: 0, d60: 0, d90plus: 0, total: 0 }
    allInvoicesForCashFlow.forEach(inv => {
      const days = Math.floor((now - new Date(inv.date)) / 86400000)
      const rem  = Math.max(0, (inv.amount || 0) * (1 + (inv.tax || 20) / 100) - (inv.amountPaid || 0))
      aging.total += rem
      if (days <= 30)      aging.current += rem
      else if (days <= 60) aging.d30     += rem
      else if (days <= 90) aging.d60     += rem
      else                 aging.d90plus += rem
    })
    const agingRounded = {
      current: Math.round(aging.current), d30: Math.round(aging.d30),
      d60: Math.round(aging.d60), d90plus: Math.round(aging.d90plus),
      total: Math.round(aging.total),
    }

    // ── Top clients ──────────────────────────────────────────────────────
    const topClients = topClientsAgg.map(c => ({
      name: c.name || 'Client inconnu', city: c.city || '',
      total: Math.round(c.total), count: c.count,
    }))

    // ── Heures semaine ───────────────────────────────────────────────────
    const weekHours = {
      total:         Math.round(weekAttendance.reduce((s, a) => s + (a.hoursWorked || 0), 0)),
      overtime:      Math.round(weekAttendance.reduce((s, a) => s + (a.overtime || 0), 0)),
      employeeCount: new Set(weekAttendance.map(a => a.employee?.toString()).filter(Boolean)).size,
      daysLogged:    new Set(weekAttendance.map(a => new Date(a.date).toDateString())).size,
    }

    // ── Objectif mensuel ─────────────────────────────────────────────────
    const monthlyTarget = settingsDoc?.monthlyRevenueTarget || 0

    // ── Soldes sous-traitants par ligne ──────────────────────────────────
    const subcontractorBalance = activeSubcontractors
      .map(sub => ({
        name:           sub.name     || sub.company || 'Sans nom',
        contractAmount: sub.contractAmount || 0,
        paidAmount:     sub.paidAmount     || 0,
        balance:        Math.max(0, (sub.contractAmount || 0) - (sub.paidAmount || 0)),
      }))
      .filter(s => s.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 6)

    res.json({
      counts: { projects: projectsCount, clients: clientsCount, newContacts, newQuotes },
      finance: { totalRevenue, totalExpenses, netProfit, pendingAmount },
      invoiceStats: {
        draft:   allInvoices.filter(i => i.status === 'draft').length,
        sent:    allInvoices.filter(i => i.status === 'sent').length,
        paid:    allInvoices.filter(i => i.status === 'paid').length,
        overdue: allInvoices.filter(i => i.status === 'overdue').length,
        total:   allInvoices.length,
      },
      taskStats: { todo: taskTodo, inProgress: taskInProgress, review: taskReview, done: taskDone },
      monthlyData, expenseCategories,
      recentInvoices, urgentTasks, lowStockMaterials, recentContacts, recentQuotes,
      // New data
      activeProjects:     activeProjectsRaw,
      upcomingReminders,
      hrToday: {
        onLeave:      leavesToday,
        totalActive:  totalActiveEmployees,
        presentCount,
        absentCount,
      },
      equipmentAlerts,
      hseStats: {
        open:       hseOpen,
        inProgress: hseInProgress,
        critical:   hseCritical,
        lastIncident: hseLastIncident,
      },
      cashFlow: { receivables: Math.round(receivables), payables: Math.round(payables), subDebt: Math.round(subDebt) },
      recentActivity,
      pendingPOs,
      budgetBurn: { totalBudget, totalSpent },
      recentSiteReports,
      // New analytics
      trends: { ...trends, period },
      topClients, aging: agingRounded,
      supplierPayments, weekHours, monthlyTarget,
      subcontractorBalance,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Gestion des utilisateurs admin ────────────────────────────────────────
router.get('/users', auth, async (req, res) => {
  try { res.json(await Admin.find({}, '-password').sort({ createdAt: 1 })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/users', auth, async (req, res) => {
  try {
    const admin = await Admin.create(req.body)
    const { password, ...safe } = admin.toObject()
    res.status(201).json(safe)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/users/:id', auth, async (req, res) => {
  try {
    const { password, ...rest } = req.body
    const admin = await Admin.findById(req.params.id)
    if (!admin) return res.status(404).json({ error: 'Non trouvé' })
    Object.assign(admin, rest)
    if (password && password.length >= 6) admin.password = password
    await admin.save()
    const { password: _, ...safe } = admin.toObject()
    res.json(safe)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/users/:id', auth, async (req, res) => {
  try {
    const count = await Admin.countDocuments()
    if (count <= 1) return res.status(400).json({ error: 'Impossible de supprimer le seul administrateur' })
    await Admin.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
