const router = require('express').Router()
const jwt    = require('jsonwebtoken')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

router.get('/', auth, async (req, res) => {
  try {
    const Invoice  = require('../models/Invoice')
    const Expense  = require('../models/Expense')
    const Project  = require('../models/Project')
    const Material = require('../models/Material')
    const Employee = require('../models/Employee')
    const Client   = require('../models/Client')

    const [invoices, expenses, projects, materials, employees, clients] = await Promise.all([
      Invoice.find().lean(),
      Expense.find().lean(),
      Project.find().lean(),
      Material.find().lean(),
      Employee.find().lean(),
      Client.find().lean(),
    ])

    // ── Finance ──────────────────────────────────────────────────────────
    const totalRevenue  = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0)
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
    const netProfit     = totalRevenue - totalExpenses
    const margin        = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0

    // ── Mensuel (12 mois) ─────────────────────────────────────────────────
    const now = new Date()
    const monthly = []
    for (let i = 11; i >= 0; i--) {
      const d    = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const rev  = invoices.filter(inv => inv.status === 'paid' && new Date(inv.date) >= d && new Date(inv.date) <= dEnd).reduce((s, i) => s + (i.amount || 0), 0)
      const exp  = expenses.filter(exp => new Date(exp.date) >= d && new Date(exp.date) <= dEnd).reduce((s, e) => s + (e.amount || 0), 0)
      monthly.push({ month: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }), revenue: rev, expenses: exp, profit: rev - exp })
    }

    // ── Dépenses par catégorie ────────────────────────────────────────────
    const expByCat = {}
    expenses.forEach(e => { expByCat[e.category] = (expByCat[e.category] || 0) + e.amount })
    const expenseCategories = Object.entries(expByCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

    // ── Projets par statut ───────────────────────────────────────────────
    const projectsByStatus = { active: 0, completed: 0, suspended: 0, pending: 0 }
    projects.forEach(p => { projectsByStatus[p.status || 'active']++ })
    const projectStatusData = Object.entries(projectsByStatus).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)

    // ── Factures par statut ───────────────────────────────────────────────
    const invByStat = { draft: 0, sent: 0, paid: 0, overdue: 0 }
    invoices.forEach(i => { invByStat[i.status]++ })
    const invoiceStatusData = Object.entries(invByStat).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)

    // ── Inventaire par catégorie (valeur) ─────────────────────────────────
    const stockByCat = {}
    materials.forEach(m => { stockByCat[m.category || 'Autre'] = (stockByCat[m.category || 'Autre'] || 0) + (m.quantity * m.unitPrice) })
    const stockCategories = Object.entries(stockByCat).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value)

    // ── RH ────────────────────────────────────────────────────────────────
    const hrByDept = {}
    employees.forEach(e => { hrByDept[e.department || 'Autre'] = (hrByDept[e.department || 'Autre'] || 0) + 1 })
    const hrByDepartment = Object.entries(hrByDept).map(([name, value]) => ({ name, value }))

    const totalSalaries = employees.filter(e => e.status === 'Actif').reduce((s, e) => s + (e.salary || 0), 0)

    res.json({
      finance: { totalRevenue, totalExpenses, netProfit, margin, pendingAmount: invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.amount, 0) },
      monthly, expenseCategories, projectStatusData, invoiceStatusData, stockCategories, hrByDepartment,
      counts: { invoices: invoices.length, projects: projects.length, clients: clients.length, employees: employees.length, materials: materials.length },
      totalSalaries,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
