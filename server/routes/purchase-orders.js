const router        = require('express').Router()
const jwt           = require('jsonwebtoken')
const nodemailer    = require('nodemailer')
const PurchaseOrder = require('../models/PurchaseOrder')
const Settings      = require('../models/Settings')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

router.get('/', auth, async (req, res) => {
  try { res.json(await PurchaseOrder.find().populate('supplier', 'name city email').sort({ orderDate: -1 })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    if (!req.body.number) {
      const year = new Date().getFullYear()
      const regex = new RegExp(`^BC-${year}-`)
      const last = await PurchaseOrder.findOne({ number: regex }).sort({ number: -1 })
      const next = last ? (parseInt(last.number.split('-')[2]) || 0) + 1 : 1
      req.body.number = `BC-${year}-${String(next).padStart(3, '0')}`
    }
    const po = await PurchaseOrder.create(req.body)
    res.status(201).json(await PurchaseOrder.findById(po._id).populate('supplier', 'name city email'))
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const po = await PurchaseOrder.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json(await po.populate('supplier', 'name city email'))
  } catch (e) { res.status(400).json({ error: e.message }) }
})

router.patch('/:id/status', auth, async (req, res) => {
  try { res.json(await PurchaseOrder.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

// ── Envoi email au fournisseur ────────────────────────────────────────────────
router.post('/:id/send-email', auth, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id).populate('supplier', 'name city email')
    if (!po) return res.status(404).json({ error: 'Bon de commande introuvable' })

    const settings = await Settings.findOne()
    if (!settings?.smtpHost) return res.status(400).json({ error: 'SMTP non configuré' })

    const toEmail = req.body.to || po.supplier?.email
    if (!toEmail) return res.status(400).json({ error: 'Email fournisseur manquant' })

    const company = settings.companyName || 'CONSTRUCTPRO'
    const fmt0 = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)

    const itemsHtml = (po.items || []).map(it => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${it.description || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${it.quantity || 0}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${it.unit || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right">${fmt0(it.unitPrice)} MAD</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600">${fmt0(it.total || (it.quantity * it.unitPrice))} MAD</td>
      </tr>`).join('')

    const html = `
    <div style="font-family:Inter,sans-serif;max-width:680px;margin:0 auto;color:#1e293b">
      <div style="background:#0b1628;padding:32px 40px;border-radius:12px 12px 0 0">
        <h1 style="color:#fff;margin:0;font-size:22px">${company}</h1>
        <p style="color:#94a3b8;margin:6px 0 0;font-size:13px">BON DE COMMANDE — ${po.number}</p>
      </div>
      <div style="background:#f8fafc;padding:24px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
        <p style="margin:0 0 16px">Madame, Monsieur,</p>
        <p style="margin:0 0 24px">Veuillez trouver ci-après notre bon de commande <strong>${po.number}</strong>${po.project ? ` pour le projet <strong>${po.project}</strong>` : ''}.</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <thead>
            <tr style="background:#0b1628;color:#fff">
              <th style="padding:10px 12px;text-align:left;font-size:12px">Désignation</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px">Qté</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px">Unité</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px">P.U.</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px">Total HT</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr style="background:#0b1628">
              <td colspan="4" style="padding:12px;color:#94a3b8;font-size:12px;font-weight:600">TOTAL</td>
              <td style="padding:12px;text-align:right;color:#60a5fa;font-size:15px;font-weight:700">${fmt0(po.total)} MAD</td>
            </tr>
          </tfoot>
        </table>
        ${po.deliveryDate ? `<p style="margin:0 0 8px"><strong>Livraison souhaitée :</strong> ${new Date(po.deliveryDate).toLocaleDateString('fr-FR')}</p>` : ''}
        ${po.notes ? `<p style="margin:0 0 24px;padding:12px 16px;background:#fff;border-left:3px solid #3b82f6;font-size:13px">${po.notes}</p>` : ''}
        <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">Cordialement,<br/><strong style="color:#475569">${company}</strong></p>
      </div>
    </div>`

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost, port: Number(settings.smtpPort) || 587,
      secure: false,
      auth: { user: settings.smtpUser, pass: settings.smtpPass },
    })

    await transporter.sendMail({
      from: `"${company}" <${settings.smtpUser}>`,
      to: toEmail,
      subject: req.body.subject || `Bon de commande ${po.number} — ${company}`,
      html,
    })

    if (po.status === 'draft') {
      await PurchaseOrder.findByIdAndUpdate(po._id, { status: 'sent' })
    }

    res.json({ ok: true })
  }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try { await PurchaseOrder.findByIdAndDelete(req.params.id); res.json({ ok: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
