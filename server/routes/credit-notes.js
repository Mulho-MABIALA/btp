const router     = require('express').Router()
const jwt        = require('jsonwebtoken')
const CreditNote = require('../models/CreditNote')
const Settings   = require('../models/Settings')
const log        = require('../utils/logActivity')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret_2026'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

const populate = q => q.populate('client', 'name email city').populate('invoice', 'number amount totalWithTax')

router.get('/', auth, async (req, res) => {
  try { res.json(await populate(CreditNote.find().sort({ date: -1 }))) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const cn = await populate(CreditNote.findById(req.params.id))
    if (!cn) return res.status(404).json({ error: 'Introuvable' })
    res.json(cn)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    if (!req.body.number) {
      const year   = new Date().getFullYear()
      const prefix = `AV-${year}-`
      const last   = await CreditNote.findOne({ number: new RegExp(`^${prefix}`) }).sort({ number: -1 })
      const lastNum = last ? parseInt(last.number.split('-')[2]) || 0 : 0
      req.body.number = `${prefix}${String(lastNum + 1).padStart(3, '0')}`
    }
    const cn = new CreditNote(req.body)
    await cn.save()
    await log(req, 'create', 'CreditNote', `Avoir ${cn.number}`)
    res.status(201).json(await populate(CreditNote.findById(cn._id)))
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const cn = await CreditNote.findById(req.params.id)
    if (!cn) return res.status(404).json({ error: 'Introuvable' })
    Object.assign(cn, req.body)
    await cn.save()
    await log(req, 'update', 'CreditNote', `Avoir ${cn.number}`)
    res.json(await populate(CreditNote.findById(cn._id)))
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const cn = await CreditNote.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })
    await log(req, 'update', 'CreditNote', `Avoir ${cn.number} → ${req.body.status}`)
    res.json(await populate(CreditNote.findById(cn._id)))
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const cn = await CreditNote.findByIdAndDelete(req.params.id)
    await log(req, 'delete', 'CreditNote', `Avoir ${cn?.number}`)
    res.json({ ok: true })
  }
  catch (e) { res.status(400).json({ error: e.message }) }
})

// ── Envoi email ────────────────────────────────────────────────────────────
router.post('/:id/send-email', auth, async (req, res) => {
  try {
    const cn = await populate(CreditNote.findById(req.params.id))
    if (!cn) return res.status(404).json({ error: 'Avoir introuvable' })

    const settings = await Settings.findOne({})
    if (!settings?.smtpHost || !settings?.smtpUser)
      return res.status(400).json({ error: 'Configuration SMTP manquante. Configurez le serveur email dans les Paramètres.' })

    const nodemailer  = require('nodemailer')
    const transporter = nodemailer.createTransport({
      host:   settings.smtpHost,
      port:   settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth:   { user: settings.smtpUser, pass: settings.smtpPass },
    })

    const to = req.body.to || cn.client?.email
    if (!to) return res.status(400).json({ error: 'Adresse email du client manquante' })

    const fmt = n => new Intl.NumberFormat('fr-MA').format(n || 0)
    const cur = settings.currency || 'MAD'

    const linesHtml = cn.lines?.length
      ? `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px">
           <thead>
             <tr style="background:#881337;color:#fff">
               <th style="padding:8px 10px;text-align:left;border:1px solid #9f1239">Description</th>
               <th style="padding:8px 10px;text-align:center;border:1px solid #9f1239">Qté</th>
               <th style="padding:8px 10px;text-align:center;border:1px solid #9f1239">Unité</th>
               <th style="padding:8px 10px;text-align:right;border:1px solid #9f1239">P.U.</th>
               <th style="padding:8px 10px;text-align:right;border:1px solid #9f1239">Total HT</th>
             </tr>
           </thead>
           <tbody>
             ${cn.lines.map((l, i) => `
               <tr style="background:${i%2===0?'#fff1f2':'#fff'}">
                 <td style="padding:8px 10px;border:1px solid #fecdd3">${l.description}</td>
                 <td style="padding:8px 10px;text-align:center;border:1px solid #fecdd3">${l.qty}</td>
                 <td style="padding:8px 10px;text-align:center;border:1px solid #fecdd3">${l.unit}</td>
                 <td style="padding:8px 10px;text-align:right;border:1px solid #fecdd3">${fmt(l.unitPrice)} ${cur}</td>
                 <td style="padding:8px 10px;text-align:right;font-weight:bold;border:1px solid #fecdd3">${fmt(l.total)} ${cur}</td>
               </tr>`).join('')}
           </tbody>
         </table>`
      : ''

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#333">
        <div style="background:#881337;padding:24px;border-radius:8px 8px 0 0">
          <h2 style="color:white;margin:0">${settings.companyName || 'CONSTRUCTPRO'}</h2>
          <p style="color:#fda4af;margin:4px 0 0">Avoir / Note de crédit ${cn.number}</p>
        </div>
        <div style="padding:24px;border:1px solid #fecdd3;border-top:none;border-radius:0 0 8px 8px">
          <p>Bonjour <strong>${cn.client?.name || 'Client'}</strong>,</p>
          <p>Veuillez trouver ci-dessous le détail de votre avoir en notre faveur :</p>
          ${cn.invoice?.number ? `<p style="background:#fff1f2;padding:10px 14px;border-left:3px solid #f43f5e;border-radius:4px;font-size:13px">
            <strong>Avoir sur facture :</strong> ${cn.invoice.number}</p>` : ''}
          ${cn.reason ? `<p style="background:#f8fafc;padding:10px 14px;border-radius:4px;font-size:13px">
            <strong>Motif :</strong> ${cn.reason}</p>` : ''}
          ${linesHtml}
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
            <tr style="background:#f8fafc">
              <td style="padding:9px 12px;border:1px solid #e5e7eb"><strong>N° Avoir</strong></td>
              <td style="padding:9px 12px;border:1px solid #e5e7eb">${cn.number}</td>
            </tr>
            <tr>
              <td style="padding:9px 12px;border:1px solid #e5e7eb">Montant HT</td>
              <td style="padding:9px 12px;border:1px solid #e5e7eb">${fmt(cn.amount)} ${cur}</td>
            </tr>
            <tr>
              <td style="padding:9px 12px;border:1px solid #e5e7eb">TVA (${cn.tax || 20}%)</td>
              <td style="padding:9px 12px;border:1px solid #e5e7eb">${fmt((cn.totalWithTax||0)-(cn.amount||0))} ${cur}</td>
            </tr>
            <tr style="background:#fff1f2">
              <td style="padding:9px 12px;border:1px solid #fecdd3;font-weight:bold;color:#881337"><strong>Total avoir TTC</strong></td>
              <td style="padding:9px 12px;border:1px solid #fecdd3;font-weight:bold;color:#881337"><strong>− ${fmt(cn.totalWithTax)} ${cur}</strong></td>
            </tr>
            ${cn.date ? `<tr><td style="padding:9px 12px;border:1px solid #e5e7eb">Date</td><td style="padding:9px 12px;border:1px solid #e5e7eb">${new Date(cn.date).toLocaleDateString('fr-FR')}</td></tr>` : ''}
          </table>
          ${req.body.message ? `<p>${req.body.message}</p>` : ''}
          <hr style="border:none;border-top:1px solid #fecdd3;margin:24px 0">
          <p style="color:#6b7280;font-size:12px">
            ${settings.companyName} · ${settings.address || ''} ${settings.city || ''}<br>
            ${settings.phone ? `Tél : ${settings.phone}` : ''} ${settings.email ? `· Email : ${settings.email}` : ''}
          </p>
        </div>
      </div>`

    await transporter.sendMail({
      from:    `"${settings.companyName}" <${settings.smtpFrom || settings.smtpUser}>`,
      to,
      subject: req.body.subject || `Avoir ${cn.number} – ${settings.companyName}`,
      html,
    })

    await log(req, 'email', 'CreditNote', `Avoir ${cn.number} envoyé à ${to}`)
    if (cn.status === 'draft') await CreditNote.findByIdAndUpdate(cn._id, { status: 'issued' })
    res.json({ ok: true, to })
  }
  catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
