const router      = require('express').Router()
const jwt         = require('jsonwebtoken')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

router.get('/', auth, async (req, res) => {
  try {
    const Project       = require('../models/Project')
    const Client        = require('../models/Client')
    const Invoice       = require('../models/Invoice')
    const Expense       = require('../models/Expense')
    const Material      = require('../models/Material')
    const Task          = require('../models/Task')
    const Employee      = require('../models/Employee')
    const Supplier      = require('../models/Supplier')
    const PurchaseOrder = require('../models/PurchaseOrder')
    const SiteReport    = require('../models/SiteReport')
    const Reminder      = require('../models/Reminder')
    const Equipment     = require('../models/Equipment')
    const HSEIncident   = require('../models/HSEIncident')
    const ActivityLog   = require('../models/ActivityLog')
    const Subcontractor = require('../models/Subcontractor')
    const Leave         = require('../models/Leave')
    const Attendance    = require('../models/Attendance')
    const CreditNote    = require('../models/CreditNote')
    const WorkOrder     = require('../models/WorkOrder')
    const Document      = require('../models/Document')
    const Settings      = require('../models/Settings')

    const [
      projects, clients, invoices, expenses, materials, tasks,
      employees, suppliers, purchaseOrders, siteReports, reminders,
      equipment, hseIncidents, activityLog, subcontractors, leaves,
      attendance, creditNotes, workOrders, documents, settings,
    ] = await Promise.all([
      Project.find().lean(),
      Client.find().lean(),
      Invoice.find().lean(),
      Expense.find().lean(),
      Material.find().lean(),
      Task.find().lean(),
      Employee.find().lean(),
      Supplier.find().lean(),
      PurchaseOrder.find().lean(),
      SiteReport.find().lean(),
      Reminder.find().lean(),
      Equipment.find().lean(),
      HSEIncident.find().lean(),
      ActivityLog.find().lean(),
      Subcontractor.find().lean(),
      Leave.find().lean(),
      Attendance.find().lean(),
      CreditNote.find().lean(),
      WorkOrder.find().lean(),
      Document.find().lean(),
      Settings.find().lean(),
    ])

    res.json({
      exportDate: new Date(),
      version: '3.0.0',
      collections: {
        projects, clients, invoices, expenses, materials, tasks,
        employees, suppliers, purchaseOrders, siteReports, reminders,
        equipment, hseIncidents, activityLog, subcontractors, leaves,
        attendance, creditNotes, workOrders, documents, settings,
      },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
