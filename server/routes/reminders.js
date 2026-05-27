const router   = require('express').Router()
const jwt      = require('jsonwebtoken')
const Reminder = require('../models/Reminder')
const Invoice  = require('../models/Invoice')
const Task     = require('../models/Task')
const PurchaseOrder = require('../models/PurchaseOrder')
const Equipment     = require('../models/Equipment')
const Leave         = require('../models/Leave')
const AutoSnooze    = require('../models/AutoSnooze')
const Settings      = require('../models/Settings')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

// ── GET /reminders/auto — alertes automatiques multi-sources ──────────────
router.get('/auto', auth, async (req, res) => {
  try {
    const now = new Date()

    // 1. Charger les seuils depuis les paramètres (ou valeurs par défaut)
    const settings   = await Settings.findOne({}).lean()
    const thresholds = settings?.alertThresholds || {}
    const INV_DAYS   = thresholds.invoiceDays       ?? 7
    const TASK_DAYS  = thresholds.taskDays          ?? 3
    const PO_DAYS    = thresholds.purchaseOrderDays ?? 5
    const EQ_DAYS    = thresholds.equipmentDays     ?? 7
    const LEAVE_HRS  = thresholds.leavePendingHours ?? 48

    const inInv  = new Date(now); inInv.setDate(inInv.getDate() + INV_DAYS)
    const inTask = new Date(now); inTask.setDate(inTask.getDate() + TASK_DAYS)
    const inPO   = new Date(now); inPO.setDate(inPO.getDate() + PO_DAYS)
    const inEq   = new Date(now); inEq.setDate(inEq.getDate() + EQ_DAYS)
    const agoLv  = new Date(now); agoLv.setHours(agoLv.getHours() - LEAVE_HRS)

    // 2. Charger les snoozes actifs (TTL MongoDB les supprime automatiquement)
    const snoozes    = await AutoSnooze.find({ snoozedUntil: { $gt: now } }).lean()
    const snoozedIds = new Set(snoozes.map(s => s.alertId))

    // 3. Charger les rappels manuels pour déduplication
    const manualReminders = await Reminder.find({ status: { $ne: 'done' } }).lean()

    // Fonction de déduplication : cherche si un rappel manuel couvre déjà cet alerte
    const isDuplicated = (alertTitle, keywords = []) => {
      const titleLower = alertTitle.toLowerCase()
      return manualReminders.some(r => {
        const rTitle = (r.title || '').toLowerCase()
        const rNotes = (r.notes || '').toLowerCase()
        // Match si l'un des mots-clés est dans le titre du rappel manuel
        return keywords.some(kw =>
          kw && (rTitle.includes(kw.toLowerCase()) || rNotes.includes(kw.toLowerCase()))
        )
      })
    }

    const alerts = []

    // ── 1. Factures ────────────────────────────────────────────────────────
    const invoices = await Invoice.find({
      status:  { $in: ['sent', 'overdue', 'partial'] },
      dueDate: { $lte: inInv },
    }).populate('client', 'name').lean()

    for (const inv of invoices) {
      const id       = `inv_${inv._id}`
      const daysLeft = Math.ceil((new Date(inv.dueDate) - now) / 86400000)
      const overdue  = daysLeft < 0
      if (snoozedIds.has(id)) continue
      if (isDuplicated(`Facture ${inv.number}`, [inv.number, inv.client?.name])) continue
      alerts.push({
        id, source: 'invoice',
        priority: overdue ? 'urgent' : daysLeft <= Math.ceil(INV_DAYS / 2) ? 'high' : 'normal',
        title:    `Facture ${inv.number} — ${inv.client?.name || 'Client'}`,
        notes:    overdue
          ? `En retard de ${Math.abs(daysLeft)} jour(s) · ${(inv.totalWithTax || inv.amount || 0).toLocaleString('fr-FR')} FCFA`
          : `Échéance dans ${daysLeft} jour(s) · ${(inv.totalWithTax || inv.amount || 0).toLocaleString('fr-FR')} FCFA`,
        dueDate: inv.dueDate, link: '/admin/finance', overdue,
        snoozedUntil: null,
      })
    }

    // ── 2. Tâches ──────────────────────────────────────────────────────────
    const tasks = await Task.find({
      status:  { $nin: ['done'] },
      dueDate: { $lte: inTask },
    }).lean()

    for (const t of tasks) {
      const id       = `task_${t._id}`
      const daysLeft = Math.ceil((new Date(t.dueDate) - now) / 86400000)
      const overdue  = daysLeft < 0
      if (snoozedIds.has(id)) continue
      if (isDuplicated(t.title, [t.title])) continue
      alerts.push({
        id, source: 'task',
        priority: t.priority === 'urgent' || overdue ? 'urgent' : t.priority === 'high' ? 'high' : 'normal',
        title:    `Tâche : ${t.title}`,
        notes:    `${t.assignee ? `Assignée à ${t.assignee} · ` : ''}${overdue ? `En retard de ${Math.abs(daysLeft)}j` : daysLeft === 0 ? "Aujourd'hui" : `Dans ${daysLeft} jour(s)`}`,
        dueDate: t.dueDate, link: '/admin/tasks', overdue,
        snoozedUntil: null,
      })
    }

    // ── 3. Bons de commande ────────────────────────────────────────────────
    const pos = await PurchaseOrder.find({
      status:       { $nin: ['received', 'cancelled'] },
      deliveryDate: { $lte: inPO },
    }).populate('supplier', 'name').lean()

    for (const po of pos) {
      const id       = `po_${po._id}`
      const daysLeft = Math.ceil((new Date(po.deliveryDate) - now) / 86400000)
      const overdue  = daysLeft < 0
      if (snoozedIds.has(id)) continue
      if (isDuplicated(po.number, [po.number, po.supplier?.name])) continue
      alerts.push({
        id, source: 'purchase_order',
        priority: overdue ? 'urgent' : daysLeft <= 2 ? 'high' : 'normal',
        title:    `Livraison ${po.number} — ${po.supplier?.name || 'Fournisseur'}`,
        notes:    overdue
          ? `Livraison en retard de ${Math.abs(daysLeft)} jour(s)`
          : `Prévue dans ${daysLeft} jour(s)${po.project ? ` · ${po.project}` : ''}`,
        dueDate: po.deliveryDate, link: '/admin/purchase-orders', overdue,
        snoozedUntil: null,
      })
    }

    // ── 4. Équipements ─────────────────────────────────────────────────────
    const equips = await Equipment.find({
      status:              { $ne: 'retired' },
      nextMaintenanceDate: { $lte: inEq },
    }).lean()

    for (const eq of equips) {
      const id       = `eq_${eq._id}`
      const daysLeft = Math.ceil((new Date(eq.nextMaintenanceDate) - now) / 86400000)
      const overdue  = daysLeft < 0
      if (snoozedIds.has(id)) continue
      if (isDuplicated(eq.name, [eq.name])) continue
      alerts.push({
        id, source: 'equipment',
        priority: overdue ? 'urgent' : daysLeft <= 3 ? 'high' : 'normal',
        title:    `Maintenance : ${eq.name}`,
        notes:    overdue
          ? `Dépassée de ${Math.abs(daysLeft)} jour(s)`
          : daysLeft === 0 ? "Prévue aujourd'hui"
          : `Dans ${daysLeft} jour(s)${eq.location ? ` · ${eq.location}` : ''}`,
        dueDate: eq.nextMaintenanceDate, link: '/admin/equipment', overdue,
        snoozedUntil: null,
      })
    }

    // ── 5. Congés en attente ───────────────────────────────────────────────
    const leaves = await Leave.find({
      status:    'pending',
      createdAt: { $lte: agoLv },
    }).populate('employee', 'firstName lastName').lean()

    for (const lv of leaves) {
      const id           = `leave_${lv._id}`
      const hoursWaiting = Math.floor((now - new Date(lv.createdAt)) / 3600000)
      const empName      = lv.employee ? `${lv.employee.firstName} ${lv.employee.lastName}` : 'Employé'
      if (snoozedIds.has(id)) continue
      if (isDuplicated(empName, [empName])) continue
      alerts.push({
        id, source: 'leave',
        priority: hoursWaiting > 72 ? 'high' : 'normal',
        title:    `Congé en attente — ${empName}`,
        notes:    `${lv.type} · du ${new Date(lv.startDate).toLocaleDateString('fr-FR')} au ${new Date(lv.endDate).toLocaleDateString('fr-FR')} · En attente depuis ${hoursWaiting}h`,
        dueDate: lv.startDate, link: '/admin/leaves', overdue: false,
        snoozedUntil: null,
      })
    }

    // Tri final : retard > urgent > haute prio > date croissante
    const PW = { urgent: 0, high: 1, normal: 2, low: 3 }
    alerts.sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
      const pw = (PW[a.priority] || 2) - (PW[b.priority] || 2)
      if (pw !== 0) return pw
      return new Date(a.dueDate) - new Date(b.dueDate)
    })

    res.json({
      count: alerts.length,
      alerts,
      thresholds: { INV_DAYS, TASK_DAYS, PO_DAYS, EQ_DAYS, LEAVE_HRS },
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST /reminders/snooze — reporter une alerte automatique ─────────────
router.post('/snooze', auth, async (req, res) => {
  try {
    const { alertId, days = 3 } = req.body
    if (!alertId) return res.status(400).json({ error: 'alertId requis' })
    const snoozedUntil = new Date()
    snoozedUntil.setDate(snoozedUntil.getDate() + Number(days))
    const doc = await AutoSnooze.findOneAndUpdate(
      { alertId },
      { alertId, snoozedUntil },
      { upsert: true, new: true }
    )
    res.json({ ok: true, alertId, snoozedUntil: doc.snoozedUntil })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── DELETE /reminders/snooze/:alertId — annuler le snooze ────────────────
router.delete('/snooze/:alertId', auth, async (req, res) => {
  try {
    await AutoSnooze.deleteOne({ alertId: req.params.alertId })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/', auth, async (req, res) => {
  try {
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    res.json(await Reminder.find(filter).sort({ dueDate: 1 }))
  }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try { res.status(201).json(await Reminder.create(req.body)) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try { res.json(await Reminder.findByIdAndUpdate(req.params.id, req.body, { new: true })) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.patch('/:id/done', auth, async (req, res) => {
  try { res.json(await Reminder.findByIdAndUpdate(req.params.id, { status: 'done' }, { new: true })) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try { await Reminder.findByIdAndDelete(req.params.id); res.json({ ok: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
