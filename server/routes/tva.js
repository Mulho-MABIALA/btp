const router  = require('express').Router()
const jwt     = require('jsonwebtoken')
const Invoice = require('../models/Invoice')
const Expense = require('../models/Expense')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

router.get('/', auth, async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear()

    const invoices = await Invoice.find({
      date: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
      status: { $in: ['sent', 'paid', 'partial'] }
    })

    const expenses = await Expense.find({
      date: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) }
    })

    // Build monthly breakdown
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      label: new Date(year, i, 1).toLocaleDateString('fr-FR', { month: 'long' }),
      tvaCollectee: 0,
      tvaDeductible: 0,
      solde: 0,
    }))

    invoices.forEach(inv => {
      const m = new Date(inv.date).getMonth()
      const tva = Math.round((inv.amount || 0) * (inv.tax || 20) / 100)
      months[m].tvaCollectee += tva
    })

    // Approximate deductible TVA on expenses (20% by default)
    expenses.forEach(exp => {
      const m = new Date(exp.date).getMonth()
      const tva = Math.round((exp.amount || 0) * 0.20)
      months[m].tvaDeductible += tva
    })

    months.forEach(m => { m.solde = m.tvaCollectee - m.tvaDeductible })

    const totalCollectee  = months.reduce((s, m) => s + m.tvaCollectee, 0)
    const totalDeductible = months.reduce((s, m) => s + m.tvaDeductible, 0)

    res.json({ year, months, totalCollectee, totalDeductible, totalDue: totalCollectee - totalDeductible })
  }
  catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
