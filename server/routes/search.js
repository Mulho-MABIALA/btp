const router   = require('express').Router()
const jwt      = require('jsonwebtoken')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

router.get('/', auth, async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.trim().length < 2) return res.json({ results: [] })

    const Client   = require('../models/Client')
    const Project  = require('../models/Project')
    const Invoice  = require('../models/Invoice')
    const Task     = require('../models/Task')
    const Material = require('../models/Material')
    const Employee = require('../models/Employee')
    const Supplier = require('../models/Supplier')

    const regex = new RegExp(q.trim(), 'i')

    const [clients, projects, invoices, tasks, materials, employees, suppliers] = await Promise.all([
      Client.find({ $or: [{ name: regex }, { email: regex }, { city: regex }] }).limit(3),
      Project.find({ $or: [{ title: regex }, { location: regex }, { clientName: regex }] }).limit(3),
      Invoice.find({ $or: [{ number: regex }, { project: regex }] }).populate('client', 'name').limit(3),
      Task.find({ $or: [{ title: regex }, { assignee: regex }, { project: regex }] }).limit(3),
      Material.find({ $or: [{ name: regex }, { category: regex }, { supplier: regex }] }).limit(3),
      Employee.find({ $or: [{ firstName: regex }, { lastName: regex }, { role: regex }] }).limit(2),
      Supplier.find({ $or: [{ name: regex }, { city: regex }] }).limit(2),
    ])

    const results = [
      ...clients.map(c => ({ type: 'client',   icon: 'user',     label: c.name,                    sub: c.city || c.email || '',     link: '/admin/clients' })),
      ...projects.map(p => ({ type: 'project',  icon: 'folder',   label: p.title,                   sub: p.location || '',            link: '/admin/projects' })),
      ...invoices.map(i => ({ type: 'invoice',  icon: 'receipt',  label: i.number,                  sub: i.client?.name || '',        link: '/admin/finance' })),
      ...tasks.map(t =>    ({ type: 'task',     icon: 'check',    label: t.title,                   sub: t.assignee || t.project || '',link: '/admin/tasks' })),
      ...materials.map(m =>({ type: 'material', icon: 'package',  label: m.name,                    sub: m.category || '',            link: '/admin/inventory' })),
      ...employees.map(e =>({ type: 'employee', icon: 'person',   label: `${e.firstName} ${e.lastName}`, sub: e.role || '',           link: '/admin/hr' })),
      ...suppliers.map(s =>({ type: 'supplier', icon: 'truck',    label: s.name,                    sub: s.city || '',                link: '/admin/suppliers' })),
    ]

    res.json({ results, count: results.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
