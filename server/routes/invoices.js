const router   = require('express').Router()
const jwt      = require('jsonwebtoken')
const Invoice  = require('../models/Invoice')
const Settings = require('../models/Settings')
const log      = require('../utils/logActivity')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

router.get('/', auth, async (req, res) => {
  try { res.json(await Invoice.find().populate('client', 'name email city').sort({ date: -1 })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    if (!req.body.number) {
      const year     = new Date().getFullYear()
      const prefix   = `FAC-${year}-`
      const last     = await Invoice.findOne({ number: new RegExp(`^${prefix}`) }).sort({ number: -1 })
      const lastNum  = last ? parseInt(last.number.split('-')[2]) || 0 : 0
      req.body.number = `${prefix}${String(lastNum + 1).padStart(3, '0')}`
    }
    const inv = new Invoice(req.body)
    await inv.save()
    await log(req, 'create', 'Invoice', `Facture ${inv.number}`)
    res.status(201).json(await Invoice.findById(inv._id).populate('client', 'name email city'))
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

// ── Routes spéciales (avant /:id) ────────────────────────────────────────
router.post('/bulk-remind', auth, async (req, res) => {
  try {
    const overdueInvoices = await Invoice.find({ status: { $in: ['sent', 'overdue'] } })
      .populate('client', 'name email')

    const settings = await Settings.findOne({})
    if (!settings?.smtpHost || !settings?.smtpUser) {
      return res.status(400).json({ error: 'Configuration SMTP manquante' })
    }

    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
      host:   settings.smtpHost,
      port:   settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth:   { user: settings.smtpUser, pass: settings.smtpPass },
    })

    let sent = 0
    for (const inv of overdueInvoices) {
      if (!inv.client?.email) continue
      try {
        await transporter.sendMail({
          from:    `"${settings.companyName || 'CONSTRUCTPRO'}" <${settings.smtpFrom || settings.smtpUser}>`,
          to:      inv.client.email,
          subject: `Rappel de paiement – Facture ${inv.number}`,
          html: `<p>Bonjour <strong>${inv.client.name}</strong>,</p>
                 <p>Nous vous rappelons que la facture <strong>${inv.number}</strong> d'un montant de
                 <strong>${new Intl.NumberFormat('fr-MA').format(inv.amount || 0)} MAD</strong> est en attente de règlement.</p>
                 <p>Merci de régulariser votre situation dans les plus brefs délais.</p>
                 <p>Cordialement,<br>${settings.companyName || 'CONSTRUCTPRO'}</p>`,
        })
        sent++
      } catch (_) { /* skip individual failures */ }
    }

    await log(req, 'email', 'Invoice', `Rappels envoyés à ${sent} client(s)`)
    res.json({ ok: true, sent })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/recurring', auth, async (req, res) => {
  try {
    const invoices = await Invoice.find({ recurring: { $in: [true, 'monthly', 'quarterly', 'yearly'] } })
      .populate('client', 'name email city').sort({ date: -1 })
    res.json(invoices)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Routes avec paramètre /:id ────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id)
    if (!inv) return res.status(404).json({ error: 'Introuvable' })
    Object.assign(inv, req.body)
    await inv.save()
    await log(req, 'update', 'Invoice', `Facture ${inv.number}`)
    res.json(await Invoice.findById(inv._id).populate('client', 'name email city'))
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const inv = await Invoice.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })
    res.json(await inv.populate('client', 'name'))
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

// ── Paiements partiels ────────────────────────────────────────────────────
router.post('/:id/payments', auth, async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id)
    if (!inv) return res.status(404).json({ error: 'Facture introuvable' })
    inv.payments.push(req.body)
    await inv.save()
    await log(req, 'update', 'Invoice', `Paiement ${req.body.amount} MAD sur facture ${inv.number}`)
    res.json(await Invoice.findById(inv._id).populate('client', 'name email city'))
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id/payments/:pid', auth, async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id)
    if (!inv) return res.status(404).json({ error: 'Facture introuvable' })
    inv.payments = inv.payments.filter(p => p._id.toString() !== req.params.pid)
    await inv.save()
    res.json(await Invoice.findById(inv._id).populate('client', 'name email city'))
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

// ── Envoi email ───────────────────────────────────────────────────────────
router.post('/:id/send-email', auth, async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id).populate('client', 'name email city')
    if (!inv) return res.status(404).json({ error: 'Facture introuvable' })

    const settings = await Settings.findOne({})
    if (!settings?.smtpHost || !settings?.smtpUser) {
      return res.status(400).json({ error: 'Configuration SMTP manquante. Configurez le serveur email dans les Paramètres.' })
    }

    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth: { user: settings.smtpUser, pass: settings.smtpPass },
    })

    const recipientEmail = req.body.to || inv.client?.email
    if (!recipientEmail) return res.status(400).json({ error: 'Adresse email du client manquante' })

    const fmt = n => new Intl.NumberFormat('fr-MA').format(n || 0)
    const cur = settings.currency || 'MAD'

    // Line items rows
    const linesHtml = (inv.lines?.length)
      ? `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px">
           <thead>
             <tr style="background:#1e3a5f;color:#fff">
               <th style="padding:8px 10px;text-align:left;border:1px solid #334155">Description</th>
               <th style="padding:8px 10px;text-align:center;border:1px solid #334155">Qté</th>
               <th style="padding:8px 10px;text-align:center;border:1px solid #334155">Unité</th>
               <th style="padding:8px 10px;text-align:right;border:1px solid #334155">P.U.</th>
               <th style="padding:8px 10px;text-align:right;border:1px solid #334155">Total HT</th>
             </tr>
           </thead>
           <tbody>
             ${inv.lines.map((l, i) => `
               <tr style="background:${i%2===0?'#f8fafc':'#fff'}">
                 <td style="padding:8px 10px;border:1px solid #e5e7eb">${l.description}</td>
                 <td style="padding:8px 10px;text-align:center;border:1px solid #e5e7eb">${l.qty}</td>
                 <td style="padding:8px 10px;text-align:center;border:1px solid #e5e7eb">${l.unit}</td>
                 <td style="padding:8px 10px;text-align:right;border:1px solid #e5e7eb">${fmt(l.unitPrice)} ${cur}</td>
                 <td style="padding:8px 10px;text-align:right;font-weight:bold;border:1px solid #e5e7eb">${fmt(l.total)} ${cur}</td>
               </tr>`).join('')}
           </tbody>
         </table>`
      : ''

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width:640px; margin:0 auto; color:#333">
        <div style="background:#1e40af; padding:24px; border-radius:8px 8px 0 0">
          <h2 style="color:white; margin:0">${settings.companyName || 'CONSTRUCTPRO'}</h2>
          <p style="color:#93c5fd; margin:4px 0 0">${inv.invoiceType || 'Facture'} ${inv.number}</p>
        </div>
        <div style="padding:24px; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 8px 8px">
          <p>Bonjour <strong>${inv.client?.name || 'Client'}</strong>,</p>
          <p>Veuillez trouver ci-dessous le détail de votre facture :</p>

          ${linesHtml}

          <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:13px">
            <tr style="background:#f8fafc">
              <td style="padding:9px 12px; border:1px solid #e5e7eb"><strong>N° Facture</strong></td>
              <td style="padding:9px 12px; border:1px solid #e5e7eb">${inv.number}</td>
            </tr>
            ${inv.subtotalHT && inv.discount > 0 ? `
            <tr>
              <td style="padding:9px 12px; border:1px solid #e5e7eb">Sous-total HT</td>
              <td style="padding:9px 12px; border:1px solid #e5e7eb">${fmt(inv.subtotalHT)} ${cur}</td>
            </tr>
            <tr style="color:#f97316">
              <td style="padding:9px 12px; border:1px solid #e5e7eb">Remise (${inv.discount}%)</td>
              <td style="padding:9px 12px; border:1px solid #e5e7eb">− ${fmt(inv.discountAmount)} ${cur}</td>
            </tr>` : ''}
            <tr style="background:#f8fafc">
              <td style="padding:9px 12px; border:1px solid #e5e7eb"><strong>Montant HT</strong></td>
              <td style="padding:9px 12px; border:1px solid #e5e7eb">${fmt(inv.amount)} ${cur}</td>
            </tr>
            <tr>
              <td style="padding:9px 12px; border:1px solid #e5e7eb">TVA (${inv.tax || 20}%)</td>
              <td style="padding:9px 12px; border:1px solid #e5e7eb">${fmt((inv.totalWithTax||0) - (inv.amount||0))} ${cur}</td>
            </tr>
            <tr style="background:#dbeafe">
              <td style="padding:9px 12px; border:1px solid #e5e7eb; font-weight:bold; color:#1e40af"><strong>Total TTC</strong></td>
              <td style="padding:9px 12px; border:1px solid #e5e7eb; font-weight:bold; color:#1e40af"><strong>${fmt(inv.totalWithTax)} ${cur}</strong></td>
            </tr>
            ${inv.retention > 0 ? `
            <tr style="color:#dc2626">
              <td style="padding:9px 12px; border:1px solid #e5e7eb">Retenue de garantie (${inv.retention}%)</td>
              <td style="padding:9px 12px; border:1px solid #e5e7eb">− ${fmt(inv.retentionAmount)} ${cur}</td>
            </tr>
            <tr style="background:#dcfce7">
              <td style="padding:9px 12px; border:1px solid #e5e7eb; font-weight:bold; color:#16a34a"><strong>Net à payer</strong></td>
              <td style="padding:9px 12px; border:1px solid #e5e7eb; font-weight:bold; color:#16a34a"><strong>${fmt(inv.netToPay)} ${cur}</strong></td>
            </tr>` : ''}
            ${inv.dueDate ? `<tr style="background:#fef3c7"><td style="padding:9px 12px; border:1px solid #e5e7eb"><strong>Échéance</strong></td><td style="padding:9px 12px; border:1px solid #e5e7eb">${new Date(inv.dueDate).toLocaleDateString('fr-FR')}</td></tr>` : ''}
            ${inv.paymentTerms ? `<tr><td style="padding:9px 12px; border:1px solid #e5e7eb">Conditions</td><td style="padding:9px 12px; border:1px solid #e5e7eb">${inv.paymentTerms}</td></tr>` : ''}
          </table>
          ${req.body.message ? `<p>${req.body.message}</p>` : ''}
          ${settings.invoiceNotes ? `<p style="color:#6b7280; font-size:12px">${settings.invoiceNotes}</p>` : ''}
          <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0">
          <p style="color:#6b7280; font-size:12px">
            ${settings.companyName} · ${settings.address || ''} ${settings.city || ''}<br>
            ${settings.phone ? `Tél : ${settings.phone}` : ''} ${settings.email ? `· Email : ${settings.email}` : ''}
          </p>
        </div>
      </div>
    `

    await transporter.sendMail({
      from: `"${settings.companyName}" <${settings.smtpFrom || settings.smtpUser}>`,
      to: recipientEmail,
      subject: req.body.subject || `Facture ${inv.number} – ${settings.companyName}`,
      html: htmlBody,
    })

    await log(req, 'email', 'Invoice', `Facture ${inv.number} envoyée à ${recipientEmail}`)
    if (inv.status === 'draft') await Invoice.findByIdAndUpdate(inv._id, { status: 'sent' })
    res.json({ ok: true, to: recipientEmail })
  }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/:id/generate-next', auth, async (req, res) => {
  try {
    const original = await Invoice.findById(req.params.id).lean()
    if (!original) return res.status(404).json({ error: 'Facture introuvable' })

    const nextDate = new Date(original.date || Date.now())
    nextDate.setMonth(nextDate.getMonth() + 1)

    const count = await Invoice.countDocuments()
    const number = `FAC-${nextDate.getFullYear()}-${String(count + 1).padStart(3, '0')}`

    const { _id, number: _num, payments, amountPaid, createdAt, updatedAt, ...rest } = original
    const newInv = await Invoice.create({ ...rest, number, date: nextDate, status: 'draft', payments: [] })
    await log(req, 'create', 'Invoice', `Facture récurrente ${newInv.number} générée depuis ${original.number}`)
    res.status(201).json(await Invoice.findById(newInv._id).populate('client', 'name email city'))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try { await Invoice.findByIdAndDelete(req.params.id); res.json({ ok: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
