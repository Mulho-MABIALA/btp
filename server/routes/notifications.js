const router = require('express').Router()
const jwt    = require('jsonwebtoken')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

router.get('/', auth, async (req, res) => {
  try {
    const Invoice    = require('../models/Invoice')
    const Contact    = require('../models/Contact')
    const Quote      = require('../models/Quote')
    const Material   = require('../models/Material')
    const Task       = require('../models/Task')
    const Attendance = require('../models/Attendance')
    const Employee   = require('../models/Employee')

    const now      = new Date()
    const today    = new Date(now); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

    const [newContacts, newQuotes, overdueInvoices, lowStock, overdueTasks] = await Promise.all([
      Contact.countDocuments({ status: 'new' }),
      Quote.countDocuments({ status: 'new' }),
      Invoice.countDocuments({ status: 'overdue' }),
      Material.countDocuments({ $expr: { $lte: ['$quantity', '$minStock'] } }),
      Task.countDocuments({ status: { $ne: 'done' }, dueDate: { $lt: now } }),
    ])

    const notifications = []

    if (newContacts > 0) notifications.push({
      id: 'contacts', type: 'info', icon: 'mail',
      title: 'Nouveaux messages',
      message: `${newContacts} message${newContacts > 1 ? 's' : ''} en attente`,
      link: '/admin/contacts', count: newContacts,
    })
    if (newQuotes > 0) notifications.push({
      id: 'quotes', type: 'warning', icon: 'clipboard',
      title: 'Demandes de devis',
      message: `${newQuotes} devis à traiter`,
      link: '/admin/quotes', count: newQuotes,
    })
    if (overdueInvoices > 0) notifications.push({
      id: 'invoices', type: 'danger', icon: 'dollar',
      title: 'Factures en retard',
      message: `${overdueInvoices} facture${overdueInvoices > 1 ? 's' : ''} impayée${overdueInvoices > 1 ? 's' : ''}`,
      link: '/admin/finance', count: overdueInvoices,
    })
    if (lowStock > 0) notifications.push({
      id: 'stock', type: 'warning', icon: 'package',
      title: 'Stock faible',
      message: `${lowStock} référence${lowStock > 1 ? 's' : ''} sous seuil minimum`,
      link: '/admin/inventory', count: lowStock,
    })
    if (overdueTasks > 0) notifications.push({
      id: 'tasks', type: 'warning', icon: 'check',
      title: 'Tâches en retard',
      message: `${overdueTasks} tâche${overdueTasks > 1 ? 's' : ''} dépassée${overdueTasks > 1 ? 's' : ''}`,
      link: '/admin/tasks', count: overdueTasks,
    })

    // ── CDD expirant dans 30 jours ────────────────────────────────────────
    try {
      const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const expiringCDDs = await Employee.countDocuments({
        contractType: 'CDD',
        status: { $in: ['Actif', 'Congé'] },
        endDate: { $gte: now, $lte: in30days }
      })
      if (expiringCDDs > 0) notifications.push({
        id: 'cdd-expiry', type: 'warning', icon: 'calendar',
        title: 'CDD expirent bientôt',
        message: `${expiringCDDs} contrat${expiringCDDs > 1 ? 's' : ''} CDD expire${expiringCDDs > 1 ? 'nt' : ''} dans 30 jours`,
        link: '/admin/hr', count: expiringCDDs,
      })
    } catch(_) {}

    // ── Pointage manquant (after 9h on weekdays) ──────────────────────────
    const dayOfWeek = now.getDay() // 0=Sun, 6=Sat
    if (now.getHours() >= 9 && dayOfWeek !== 0 && dayOfWeek !== 6) {
      try {
        const [activeCount, checkedInCount] = await Promise.all([
          Employee.countDocuments({ status: 'Actif' }),
          Attendance.countDocuments({
            date: { $gte: today, $lt: tomorrow },
            checkIn: { $exists: true, $ne: null, $ne: '' }
          })
        ])
        const missing = Math.max(0, activeCount - checkedInCount)
        if (missing > 0) notifications.push({
          id: 'attendance', type: 'warning', icon: 'clock',
          title: 'Pointage manquant',
          message: `${missing} employé${missing > 1 ? 's' : ''} n'${missing > 1 ? 'ont' : 'a'} pas encore pointé`,
          link: '/admin/attendance', count: missing,
        })
      } catch(_) { /* ignore if models unavailable */ }
    }

    const total = notifications.reduce((s, n) => s + n.count, 0)
    res.json({ notifications, total })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
