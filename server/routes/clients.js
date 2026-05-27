const router    = require('express').Router()
const jwt       = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const Client    = require('../models/Client')
const Invoice   = require('../models/Invoice')
const Project   = require('../models/Project')
const Settings  = require('../models/Settings')

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requis' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'btp_secret'); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

router.get('/',       auth, async (req, res) => {
  try { res.json(await Client.find().sort({ name: 1 })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /clients/:id — fiche client simple ────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
    if (!client) return res.status(404).json({ error: 'Client introuvable' })
    res.json(client)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /clients/:id/details — fiche complète avec KPIs ──────────────────
router.get('/:id/details', auth, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
    if (!client) return res.status(404).json({ error: 'Client introuvable' })

    // Factures liées par ObjectId
    const invoices = await Invoice.find({ client: req.params.id })
      .sort({ date: -1 }).lean()

    // Projets liés par ObjectId OU par nom (rétrocompatibilité)
    const projects = await Project.find({
      $or: [
        { client: req.params.id },
        { clientName: client.name },
      ]
    }).sort({ createdAt: -1 }).lean()

    // ── KPIs ──────────────────────────────────────────────────────────────
    const totalCA    = invoices.reduce((s, i) => s + (i.totalWithTax || i.amount || 0), 0)
    const totalPaid  = invoices.reduce((s, i) => s + (i.amountPaid || 0), 0)
    const totalDue   = invoices
      .filter(i => ['sent', 'overdue', 'partial'].includes(i.status))
      .reduce((s, i) => s + ((i.totalWithTax || i.amount || 0) - (i.amountPaid || 0)), 0)
    const overdueCount = invoices.filter(i => i.status === 'overdue').length

    res.json({
      client,
      invoices,
      projects,
      kpis: { totalCA, totalPaid, totalDue, overdueCount,
              nbInvoices: invoices.length, nbProjects: projects.length },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /clients/:id/send-email — envoyer la fiche par email ────────────
router.post('/:id/send-email', auth, async (req, res) => {
  try {
    const { to, subject, message, includeInvoices = true, includeProjects = true } = req.body
    if (!to) return res.status(400).json({ error: 'Adresse email destinataire manquante' })

    // Charger settings SMTP
    const settings = await Settings.findOne({})
    if (!settings?.smtpHost || !settings?.smtpUser) {
      return res.status(400).json({ error: 'Configuration SMTP manquante. Configurez-la dans Réglages → Email.' })
    }

    // Charger les données client complètes
    const client = await Client.findById(req.params.id)
    if (!client) return res.status(404).json({ error: 'Client introuvable' })

    const invoices = includeInvoices
      ? await Invoice.find({ client: req.params.id }).sort({ date: -1 }).lean()
      : []

    const projects = includeProjects
      ? await Project.find({ $or: [{ client: req.params.id }, { clientName: client.name }] })
          .sort({ createdAt: -1 }).lean()
      : []

    // Helpers
    const fmt  = n => Number(n || 0).toLocaleString('fr-FR')
    const fmtD = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—'
    const totalCA   = invoices.reduce((s, i) => s + (i.totalWithTax || i.amount || 0), 0)
    const totalPaid = invoices.reduce((s, i) => s + (i.amountPaid || 0), 0)
    const totalDue  = invoices
      .filter(i => ['sent', 'overdue', 'partial'].includes(i.status))
      .reduce((s, i) => s + ((i.totalWithTax || i.amount || 0) - (i.amountPaid || 0)), 0)
    const now = new Date()

    const STATUS_LABEL = { draft:'Brouillon', sent:'Envoyée', paid:'Payée', partial:'Partielle', overdue:'En retard' }
    const STATUS_COLOR = { draft:'#94a3b8',   sent:'#3b82f6', paid:'#10b981',partial:'#f59e0b',  overdue:'#ef4444' }
    const PRJ_LABEL    = { pending:'En attente', active:'En cours', suspended:'Suspendu', completed:'Terminé' }
    const PRJ_COLOR    = { pending:'#94a3b8',    active:'#3b82f6',  suspended:'#f59e0b',  completed:'#10b981' }

    // ── Template HTML email ────────────────────────────────────────────────
    const invoiceRows = invoices.map((inv, i) => {
      const total = inv.totalWithTax || inv.amount || 0
      const paid  = inv.amountPaid || 0
      const due   = total - paid
      const color = STATUS_COLOR[inv.status] || '#94a3b8'
      const label = STATUS_LABEL[inv.status] || 'Brouillon'
      return `
        <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
          <td style="padding:8px 10px;font-family:monospace;font-weight:700;font-size:12px;border-bottom:1px solid #f1f5f9">${inv.number || '—'}</td>
          <td style="padding:8px 10px;font-size:12px;color:#64748b;border-bottom:1px solid #f1f5f9">${inv.project || '—'}</td>
          <td style="padding:8px 10px;font-size:12px;border-bottom:1px solid #f1f5f9">${fmtD(inv.date)}</td>
          <td style="padding:8px 10px;font-size:12px;font-weight:700;border-bottom:1px solid #f1f5f9">${fmt(total)} ${settings.currency || 'FCFA'}</td>
          <td style="padding:8px 10px;font-size:12px;color:#10b981;font-weight:600;border-bottom:1px solid #f1f5f9">${fmt(paid)} ${settings.currency || 'FCFA'}</td>
          <td style="padding:8px 10px;font-size:12px;color:${due > 0 ? '#ef4444' : '#94a3b8'};font-weight:${due > 0 ? '700' : '400'};border-bottom:1px solid #f1f5f9">${due > 0 ? `${fmt(due)} ${settings.currency || 'FCFA'}` : '—'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9"><span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:${color}20;color:${color}">${label}</span></td>
        </tr>`
    }).join('')

    const projectRows = projects.map((p, i) => {
      const color = PRJ_COLOR[p.status] || '#3b82f6'
      const label = PRJ_LABEL[p.status] || 'En cours'
      return `
        <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
          <td style="padding:8px 10px;font-size:12px;font-weight:700;border-bottom:1px solid #f1f5f9">${p.title}</td>
          <td style="padding:8px 10px;font-size:12px;color:#64748b;border-bottom:1px solid #f1f5f9">${p.category || '—'}</td>
          <td style="padding:8px 10px;font-size:12px;color:#64748b;border-bottom:1px solid #f1f5f9">${p.location || '—'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9">
            <div style="display:flex;align-items:center;gap:6px">
              <div style="flex:1;height:6px;background:#e2e8f0;border-radius:3px;min-width:60px">
                <div style="width:${p.progress || 0}%;height:100%;background:#3b82f6;border-radius:3px"></div>
              </div>
              <span style="font-size:11px;font-weight:700">${p.progress || 0}%</span>
            </div>
          </td>
          <td style="padding:8px 10px;font-size:12px;border-bottom:1px solid #f1f5f9">${p.budgetAmount > 0 ? `${fmt(p.budgetAmount)} ${settings.currency || 'FCFA'}` : '—'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9"><span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:${color}20;color:${color}">${label}</span></td>
        </tr>`
    }).join('')

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0">
<tr><td align="center">
<table width="680" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:680px;width:100%">

  <!-- En-tête bleu -->
  <tr><td style="background:linear-gradient(135deg,#1652f0,#2563eb);padding:28px 32px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px">${settings.companyName || 'CONSTRUCTPRO'}</div>
          <div style="color:#bfdbfe;font-size:12px;margin-top:2px">${settings.tagline || 'Excellence en Construction'}</div>
        </td>
        <td align="right">
          <div style="color:#bfdbfe;font-size:11px">DOSSIER CLIENT</div>
          <div style="color:#ffffff;font-size:12px;font-weight:700;margin-top:2px">${now.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Corps -->
  <tr><td style="padding:28px 32px">

    ${message ? `
    <!-- Message personnalisé -->
    <div style="background:#eff6ff;border-left:4px solid #1652f0;border-radius:6px;padding:14px 16px;margin-bottom:24px">
      <p style="margin:0;font-size:13px;color:#1e40af;white-space:pre-wrap">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
    </div>` : ''}

    <!-- Info client -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr>
        <td colspan="2" style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;padding-bottom:8px;border-bottom:1px solid #e2e8f0">
          Informations client
        </td>
      </tr>
      <tr><td style="padding-top:12px;width:50%;vertical-align:top">
        <div style="font-size:16px;font-weight:800;color:#0f172a">${client.name}</div>
        <span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:${client.type === 'entreprise' ? '#dbeafe' : '#ede9fe'};color:${client.type === 'entreprise' ? '#1d4ed8' : '#7c3aed'}">
          ${client.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
        </span>
        ${client.ice ? `<div style="margin-top:6px;font-size:11px;color:#64748b;font-family:monospace">ICE : ${client.ice}</div>` : ''}
      </td>
      <td style="padding-top:12px;vertical-align:top">
        ${client.email   ? `<div style="font-size:12px;color:#475569;margin-bottom:3px">✉ ${client.email}</div>` : ''}
        ${client.phone   ? `<div style="font-size:12px;color:#475569;margin-bottom:3px">✆ ${client.phone}</div>` : ''}
        ${client.address ? `<div style="font-size:12px;color:#475569;margin-bottom:3px">⌖ ${client.address}${client.city ? `, ${client.city}` : ''}</div>` : ''}
      </td></tr>
      ${client.notes ? `<tr><td colspan="2" style="padding-top:10px">
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 10px;font-size:11px;color:#92400e">
          <strong>Notes :</strong> ${client.notes}
        </div>
      </td></tr>` : ''}
    </table>

    <!-- KPIs -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr>
        <td colspan="4" style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;padding-bottom:8px;border-bottom:1px solid #e2e8f0">
          Résumé financier
        </td>
      </tr>
      <tr>
        <td style="padding-top:10px;padding-right:8px;width:25%">
          <div style="background:#eff6ff;border:1px solid #dbeafe;border-radius:8px;padding:12px">
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">CA Total</div>
            <div style="font-size:14px;font-weight:800;color:#0f172a;margin-top:2px">${fmt(totalCA)}</div>
            <div style="font-size:9px;color:#94a3b8">${invoices.length} facture(s)</div>
          </div>
        </td>
        <td style="padding-top:10px;padding-right:8px;width:25%">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px">
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Encaissé</div>
            <div style="font-size:14px;font-weight:800;color:#10b981;margin-top:2px">${fmt(totalPaid)}</div>
            <div style="font-size:9px;color:#94a3b8">${totalCA > 0 ? Math.round(totalPaid / totalCA * 100) : 0}% du CA</div>
          </div>
        </td>
        <td style="padding-top:10px;padding-right:8px;width:25%">
          <div style="background:${totalDue > 0 ? '#fef2f2' : '#f0fdf4'};border:1px solid ${totalDue > 0 ? '#fecaca' : '#bbf7d0'};border-radius:8px;padding:12px">
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Montant dû</div>
            <div style="font-size:14px;font-weight:800;color:${totalDue > 0 ? '#ef4444' : '#10b981'};margin-top:2px">${fmt(totalDue)}</div>
            <div style="font-size:9px;color:#94a3b8">${totalDue > 0 ? 'À régulariser' : 'À jour'}</div>
          </div>
        </td>
        <td style="padding-top:10px;width:25%">
          <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:12px">
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Projets</div>
            <div style="font-size:14px;font-weight:800;color:#7c3aed;margin-top:2px">${projects.length}</div>
            <div style="font-size:9px;color:#94a3b8">${projects.filter(p => p.status === 'active').length} en cours</div>
          </div>
        </td>
      </tr>
    </table>

    ${includeInvoices && invoices.length > 0 ? `
    <!-- Factures -->
    <div style="margin-bottom:24px">
      <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;padding-bottom:8px;border-bottom:1px solid #e2e8f0;margin-bottom:10px">
        Historique des factures (${invoices.length})
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:2px solid #e2e8f0">N° Facture</th>
            <th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:2px solid #e2e8f0">Projet</th>
            <th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:2px solid #e2e8f0">Date</th>
            <th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:2px solid #e2e8f0">Montant TTC</th>
            <th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:2px solid #e2e8f0">Payé</th>
            <th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:2px solid #e2e8f0">Reste dû</th>
            <th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:2px solid #e2e8f0">Statut</th>
          </tr>
        </thead>
        <tbody>${invoiceRows}</tbody>
        <tfoot>
          <tr style="background:#f8fafc;border-top:2px solid #e2e8f0">
            <td colspan="3" style="padding:8px 10px;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase">Totaux</td>
            <td style="padding:8px 10px;font-size:12px;font-weight:800;color:#0f172a">${fmt(totalCA)} ${settings.currency || 'FCFA'}</td>
            <td style="padding:8px 10px;font-size:12px;font-weight:800;color:#10b981">${fmt(totalPaid)} ${settings.currency || 'FCFA'}</td>
            <td style="padding:8px 10px;font-size:12px;font-weight:800;color:${totalDue > 0 ? '#ef4444' : '#94a3b8'}">${totalDue > 0 ? `${fmt(totalDue)} ${settings.currency || 'FCFA'}` : '—'}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>` : ''}

    ${includeProjects && projects.length > 0 ? `
    <!-- Projets -->
    <div style="margin-bottom:24px">
      <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;padding-bottom:8px;border-bottom:1px solid #e2e8f0;margin-bottom:10px">
        Projets associés (${projects.length})
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:2px solid #e2e8f0">Titre</th>
            <th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:2px solid #e2e8f0">Catégorie</th>
            <th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:2px solid #e2e8f0">Lieu</th>
            <th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:2px solid #e2e8f0">Avancement</th>
            <th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:2px solid #e2e8f0">Budget</th>
            <th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:2px solid #e2e8f0">Statut</th>
          </tr>
        </thead>
        <tbody>${projectRows}</tbody>
      </table>
    </div>` : ''}

  </td></tr>

  <!-- Footer email -->
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:11px;color:#94a3b8">
          ${settings.companyName || 'CONSTRUCTPRO'} — Document confidentiel
          ${settings.address ? `<br>${settings.address}${settings.city ? `, ${settings.city}` : ''}` : ''}
          ${settings.phone ? ` · ${settings.phone}` : ''}
        </td>
        <td align="right" style="font-size:10px;color:#cbd5e1">
          Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}
        </td>
      </tr>
    </table>
  </td></tr>

</table>
</td></tr></table>
</body></html>`

    // Envoyer
    const transporter = nodemailer.createTransport({
      host:   settings.smtpHost,
      port:   settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth:   { user: settings.smtpUser, pass: settings.smtpPass },
    })

    await transporter.sendMail({
      from:    `"${settings.companyName || 'CONSTRUCTPRO'}" <${settings.smtpFrom || settings.smtpUser}>`,
      to,
      subject: subject || `Dossier client — ${client.name}`,
      html,
    })

    res.json({ ok: true, to })
  } catch (e) {
    console.error('send-email client:', e.message)
    res.status(500).json({ error: e.message })
  }
})

router.post('/',      auth, async (req, res) => {
  try { res.status(201).json(await Client.create(req.body)) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/:id',    auth, async (req, res) => {
  try { res.json(await Client.findByIdAndUpdate(req.params.id, req.body, { new: true })) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try { await Client.findByIdAndDelete(req.params.id); res.json({ ok: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

module.exports = router
