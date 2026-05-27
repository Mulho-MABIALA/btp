import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Loader2, ArrowLeft, Building2, User, Mail, Phone, MapPin,
  FolderOpen, TrendingUp, AlertTriangle, CheckCircle,
  Pencil, Receipt, CalendarDays, Hash, ExternalLink, Printer,
  Send, X, ChevronDown,
} from 'lucide-react'
import { adminClients, adminSettings } from '../adminApi'
import Modal from '../components/Modal'
import { useForm } from 'react-hook-form'

/* ── helpers ─────────────────────────────────────────────────────────────── */
const fmt  = (n) => Number(n || 0).toLocaleString('fr-FR')
const fmtD = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

const STATUS_INV = {
  draft:   { label: 'Brouillon', color: '#94a3b8' },
  sent:    { label: 'Envoyée',   color: '#3b82f6' },
  paid:    { label: 'Payée',     color: '#10b981' },
  partial: { label: 'Partielle', color: '#f59e0b' },
  overdue: { label: 'En retard', color: '#ef4444' },
}
const STATUS_INV_CLS = {
  draft:   'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
  sent:    'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  paid:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
}
const STATUS_PRJ = {
  pending:   { label: 'En attente', cls: 'bg-slate-100 text-slate-600', bar: 'bg-slate-400' },
  active:    { label: 'En cours',   cls: 'bg-blue-100 text-blue-700',   bar: 'bg-blue-500' },
  suspended: { label: 'Suspendu',   cls: 'bg-orange-100 text-orange-700',bar: 'bg-orange-400' },
  completed: { label: 'Terminé',    cls: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
}

const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
  </div>
)

function KpiCard({ icon: Icon, label, value, sub, color = 'blue', alert = false }) {
  const colors = {
    blue:    'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    red:     'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
    violet:  'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
  }
  return (
    <div className={`bg-white dark:bg-navy-900 rounded-2xl border p-5 flex items-start gap-4 ${alert ? 'border-red-300 dark:border-red-500/40' : 'border-slate-200 dark:border-navy-700'}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon size={20}/>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   FICHE IMPRIMABLE — rendue invisible à l'écran, visible à l'impression
══════════════════════════════════════════════════════════════════════════ */
function PrintSheet({ client, invoices, projects, kpis, settings }) {
  const now    = new Date()
  const totals = { ca: kpis.totalCA, paid: kpis.totalPaid, due: kpis.totalDue }

  const s = {
    page:     { fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1e293b', lineHeight: '1.5' },
    header:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1652f0', paddingBottom: '12px', marginBottom: '16px' },
    co:       { fontSize: '18px', fontWeight: '800', color: '#1652f0', marginBottom: '2px' },
    coSub:    { fontSize: '10px', color: '#64748b' },
    title:    { textAlign: 'center', fontSize: '15px', fontWeight: '800', letterSpacing: '2px', color: '#1652f0', textTransform: 'uppercase', margin: '14px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '8px 0' },
    section:  { marginBottom: '16px' },
    secTitle: { fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' },
    grid2:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' },
    grid4:    { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' },
    kpiBox:   { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' },
    kpiLbl:   { fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
    kpiVal:   { fontSize: '13px', fontWeight: '800', color: '#0f172a', marginTop: '2px' },
    kpiSub:   { fontSize: '9px', color: '#94a3b8' },
    table:    { width: '100%', borderCollapse: 'collapse', fontSize: '10px' },
    th:       { background: '#f1f5f9', padding: '5px 8px', textAlign: 'left', fontWeight: '700', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', borderBottom: '1px solid #e2e8f0' },
    td:       { padding: '5px 8px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
    tdFoot:   { padding: '6px 8px', fontWeight: '800', background: '#f8fafc', borderTop: '2px solid #e2e8f0' },
    badge:    (color) => ({ display: 'inline-block', padding: '1px 6px', borderRadius: '20px', fontSize: '9px', fontWeight: '700', background: color + '20', color: color }),
    info:     { fontSize: '10px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' },
    footer:   { marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8' },
    sigBox:   { border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px 16px', minHeight: '60px', width: '180px' },
    sigLbl:   { fontSize: '9px', color: '#94a3b8', marginBottom: '4px' },
  }

  return (
    <div id="client-print-sheet" style={{ display: 'none' }}>
      <div style={s.page}>

        {/* ── En-tête société ── */}
        <div style={s.header}>
          <div>
            <div style={s.co}>{settings?.companyName || 'CONSTRUCTPRO'}</div>
            <div style={s.coSub}>{settings?.tagline || 'Excellence en Construction'}</div>
            {settings?.address && <div style={s.coSub}>{settings.address}{settings.city ? `, ${settings.city}` : ''}</div>}
            {settings?.phone   && <div style={s.coSub}>Tél : {settings.phone}</div>}
            {settings?.email   && <div style={s.coSub}>Email : {settings.email}</div>}
            {settings?.ice     && <div style={s.coSub}>ICE : {settings.ice}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#64748b' }}>Édité le</div>
            <div style={{ fontWeight: '700', fontSize: '11px' }}>{now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        {/* ── Titre ── */}
        <div style={s.title}>DOSSIER CLIENT</div>

        {/* ── Informations client ── */}
        <div style={s.section}>
          <div style={s.secTitle}>Informations client</div>
          <div style={{ ...s.grid2, marginBottom: '6px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{client.name}</div>
              <div style={{ ...s.badge(client.type === 'entreprise' ? '#3b82f6' : '#8b5cf6'), marginBottom: '6px' }}>
                {client.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {client.email   && <div style={s.info}>✉ {client.email}</div>}
              {client.phone   && <div style={s.info}>✆ {client.phone}</div>}
              {client.address && <div style={s.info}>⌖ {client.address}{client.city ? `, ${client.city}` : ''}</div>}
              {client.ice     && <div style={s.info}>ICE : {client.ice}</div>}
            </div>
          </div>
          {client.notes && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', padding: '6px 8px', fontSize: '10px', color: '#92400e' }}>
              <strong>Notes :</strong> {client.notes}
            </div>
          )}
        </div>

        {/* ── KPIs ── */}
        <div style={s.section}>
          <div style={s.secTitle}>Résumé financier</div>
          <div style={s.grid4}>
            {[
              { label: 'CA Total',         val: `${fmt(totals.ca)} FCFA`,   sub: `${kpis.nbInvoices} facture(s)` },
              { label: 'Montant encaissé', val: `${fmt(totals.paid)} FCFA`, sub: totals.ca > 0 ? `${Math.round(totals.paid / totals.ca * 100)}% du CA` : '0%' },
              { label: 'Montant dû',       val: `${fmt(totals.due)} FCFA`,  sub: kpis.overdueCount > 0 ? `⚠ ${kpis.overdueCount} en retard` : 'À jour' },
              { label: 'Projets',          val: kpis.nbProjects,            sub: projects.filter(p => p.status === 'active').length + ' en cours' },
            ].map(k => (
              <div key={k.label} style={s.kpiBox}>
                <div style={s.kpiLbl}>{k.label}</div>
                <div style={s.kpiVal}>{k.val}</div>
                <div style={s.kpiSub}>{k.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Factures ── */}
        <div style={s.section}>
          <div style={s.secTitle}>Historique des factures ({invoices.length})</div>
          {invoices.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '10px', fontStyle: 'italic' }}>Aucune facture enregistrée</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  {['N° Facture', 'Projet', 'Date', 'Échéance', 'Montant TTC', 'Payé', 'Reste dû', 'Statut'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => {
                  const total = inv.totalWithTax || inv.amount || 0
                  const paid  = inv.amountPaid || 0
                  const due   = total - paid
                  const st    = STATUS_INV[inv.status] || STATUS_INV.draft
                  return (
                    <tr key={inv._id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ ...s.td, fontWeight: '700', fontFamily: 'monospace' }}>{inv.number}</td>
                      <td style={{ ...s.td, color: '#64748b' }}>{inv.project || '—'}</td>
                      <td style={s.td}>{fmtD(inv.date)}</td>
                      <td style={{ ...s.td, color: inv.status === 'overdue' ? '#ef4444' : '#475569', fontWeight: inv.status === 'overdue' ? '700' : '400' }}>{fmtD(inv.dueDate)}</td>
                      <td style={{ ...s.td, fontWeight: '700' }}>{fmt(total)} FCFA</td>
                      <td style={{ ...s.td, color: '#10b981', fontWeight: '600' }}>{fmt(paid)} FCFA</td>
                      <td style={{ ...s.td, color: due > 0 ? '#ef4444' : '#94a3b8', fontWeight: due > 0 ? '700' : '400' }}>{due > 0 ? `${fmt(due)} FCFA` : '—'}</td>
                      <td style={s.td}><span style={s.badge(st.color)}>{st.label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ ...s.tdFoot, color: '#64748b' }}>TOTAUX</td>
                  <td style={{ ...s.tdFoot, color: '#0f172a' }}>{fmt(totals.ca)} FCFA</td>
                  <td style={{ ...s.tdFoot, color: '#10b981' }}>{fmt(totals.paid)} FCFA</td>
                  <td style={{ ...s.tdFoot, color: totals.due > 0 ? '#ef4444' : '#94a3b8' }}>{totals.due > 0 ? `${fmt(totals.due)} FCFA` : '—'}</td>
                  <td style={s.tdFoot}/>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* ── Projets ── */}
        <div style={s.section}>
          <div style={s.secTitle}>Projets associés ({projects.length})</div>
          {projects.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '10px', fontStyle: 'italic' }}>Aucun projet enregistré</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  {['Titre', 'Catégorie', 'Lieu', 'Avancement', 'Budget', 'Dépensé', 'Livraison', 'Statut'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map((p, i) => {
                  const st = STATUS_PRJ[p.status] || STATUS_PRJ.active
                  return (
                    <tr key={p._id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ ...s.td, fontWeight: '700' }}>{p.title}</td>
                      <td style={{ ...s.td, color: '#64748b' }}>{p.category || '—'}</td>
                      <td style={{ ...s.td, color: '#64748b' }}>{p.location || '—'}</td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, height: '4px', background: '#e2e8f0', borderRadius: '2px' }}>
                            <div style={{ width: `${p.progress || 0}%`, height: '100%', background: '#3b82f6', borderRadius: '2px' }}/>
                          </div>
                          <span style={{ fontWeight: '700', minWidth: '28px' }}>{p.progress || 0}%</span>
                        </div>
                      </td>
                      <td style={s.td}>{p.budgetAmount > 0 ? `${fmt(p.budgetAmount)} FCFA` : '—'}</td>
                      <td style={{ ...s.td, color: '#f59e0b' }}>{p.spent > 0 ? `${fmt(p.spent)} FCFA` : '—'}</td>
                      <td style={s.td}>{fmtD(p.deliveryDate)}</td>
                      <td style={s.td}><span style={s.badge(st.bar === 'bg-emerald-500' ? '#10b981' : st.bar === 'bg-blue-500' ? '#3b82f6' : '#f59e0b')}>{st.label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Zone signature ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px', marginTop: '20px', marginBottom: '8px' }}>
          <div style={s.sigBox}>
            <div style={s.sigLbl}>Signature du responsable</div>
          </div>
          <div style={s.sigBox}>
            <div style={s.sigLbl}>Cachet & signature client</div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={s.footer}>
          <span>{settings?.companyName || 'CONSTRUCTPRO'} — Document confidentiel, usage interne</span>
          <span>Généré le {now.toLocaleDateString('fr-FR')} à {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   TOAST léger
══════════════════════════════════════════════════════════════════════════ */
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 4500)
    return () => clearTimeout(t)
  }, [toast, onClose])

  if (!toast) return null
  const isOk = toast.type === 'success'
  return (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border max-w-sm animate-fade-in
      ${isOk ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-500/30' : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-500/30'}`}>
      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black
        ${isOk ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
        {isOk ? '✓' : '✕'}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${isOk ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
          {isOk ? 'Email envoyé !' : 'Erreur d\'envoi'}
        </p>
        <p className={`text-xs mt-0.5 ${isOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {toast.msg}
        </p>
      </div>
      <button onClick={onClose} className={`shrink-0 ${isOk ? 'text-emerald-400 hover:text-emerald-600' : 'text-red-400 hover:text-red-600'}`}>
        <X size={14}/>
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function AdminClientDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const [data, setData]           = useState(null)
  const [settings, setSettings]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('invoices')
  const [editModal, setEditModal] = useState(false)
  const [emailModal, setEmailModal] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [sending, setSending]     = useState(false)
  const [error, setError]         = useState(null)
  const [toast, setToast]         = useState(null)
  const { register, handleSubmit, reset, watch } = useForm()
  const {
    register: regEmail, handleSubmit: handleEmail, reset: resetEmail,
    formState: { errors: emailErrors },
  } = useForm()
  const typeWatch = watch('type', 'entreprise')

  /* ── Inject print CSS once ── */
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'client-print-css'
    style.textContent = `
      @media print {
        @page { margin: 15mm 12mm; size: A4 portrait; }
        body * { visibility: hidden !important; }
        #client-print-sheet,
        #client-print-sheet * { visibility: visible !important; display: revert !important; }
        #client-print-sheet {
          position: fixed !important;
          top: 0 !important; left: 0 !important;
          width: 100% !important;
          background: white !important;
        }
      }
    `
    document.head.appendChild(style)
    return () => { document.getElementById('client-print-css')?.remove() }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [clientRes, settingsRes] = await Promise.all([
        adminClients.getDetails(id),
        adminSettings.get().catch(() => ({ data: null })),
      ])
      setData(clientRes.data)
      setSettings(settingsRes.data)
    } catch (e) {
      if (e.response?.status === 404) navigate('/admin/clients')
      else setError(e.response?.data?.error || e.message || 'Erreur de chargement')
    } finally { setLoading(false) }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  const openEdit = () => {
    reset({ ...data.client, type: data.client.type || 'entreprise' })
    setEditModal(true)
  }
  const onSave = async (v) => {
    setSaving(true)
    try { await adminClients.update(id, v); await load(); setEditModal(false) }
    finally { setSaving(false) }
  }

  const handlePrint = () => window.print()

  const openEmailModal = () => {
    resetEmail({
      to:              data.client.email || '',
      subject:         `Dossier client — ${data.client.name}`,
      message:         '',
      includeInvoices: true,
      includeProjects: true,
    })
    setEmailModal(true)
  }

  const onSendEmail = async (v) => {
    setSending(true)
    try {
      await adminClients.sendEmail(id, {
        to:              v.to,
        subject:         v.subject,
        message:         v.message,
        includeInvoices: v.includeInvoices,
        includeProjects: v.includeProjects,
      })
      setEmailModal(false)
      setToast({ type: 'success', msg: `Dossier envoyé à ${v.to}` })
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Échec de l\'envoi'
      setToast({ type: 'error', msg })
    } finally { setSending(false) }
  }

  /* ── Loading / Error ── */
  if (loading) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
  if (error) return (
    <div className="flex flex-col items-center py-20 gap-4">
      <AlertTriangle size={28} className="text-red-500"/>
      <div className="text-center">
        <p className="font-bold text-slate-800 dark:text-white">Impossible de charger la fiche</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={load} className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-xl">Réessayer</button>
        <button onClick={() => navigate('/admin/clients')} className="px-4 py-2 border border-slate-200 dark:border-navy-600 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl">← Retour</button>
      </div>
    </div>
  )
  if (!data) return null

  const { client, invoices, projects, kpis } = data
  const pendingInvoices = invoices.filter(i => ['sent', 'overdue', 'partial'].includes(i.status))

  return (
    <>
      {/* ── Toast ── */}
      <Toast toast={toast} onClose={() => setToast(null)}/>

      {/* ── Fiche imprimable (invisible à l'écran) ── */}
      <PrintSheet client={client} invoices={invoices} projects={projects} kpis={kpis} settings={settings}/>

      <div className="space-y-6 max-w-6xl">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/clients')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-500 transition-colors font-medium">
            <ArrowLeft size={16}/> Clients
          </button>
          <span className="text-slate-300 dark:text-navy-600">/</span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{client.name}</span>
        </div>

        {/* ── Header client ── */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                client.type === 'entreprise'
                  ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'
                  : 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400'
              }`}>
                {client.type === 'entreprise' ? <Building2 size={28}/> : <User size={28}/>}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white">{client.name}</h1>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    client.type === 'entreprise'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                      : 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400'
                  }`}>{client.type === 'entreprise' ? 'Entreprise' : 'Particulier'}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {client.email && <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-500 transition-colors"><Mail size={13}/>{client.email}</a>}
                  {client.phone && <a href={`tel:${client.phone}`}   className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-500 transition-colors"><Phone size={13}/>{client.phone}</a>}
                  {(client.city || client.address) && <span className="flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={13}/>{[client.address, client.city].filter(Boolean).join(', ')}</span>}
                </div>
                {client.ice && <p className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-1.5"><Hash size={11}/>ICE : {client.ice}</p>}
              </div>
            </div>

            {/* Boutons actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={openEmailModal}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/25">
                <Send size={14}/> Envoyer par email
              </button>
              <button onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/25">
                <Printer size={14}/> Imprimer
              </button>
              <button onClick={openEdit}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-navy-800 dark:hover:bg-navy-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition-colors">
                <Pencil size={14}/> Modifier
              </button>
            </div>
          </div>

          {client.notes && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes internes</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{client.notes}</p>
            </div>
          )}
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={TrendingUp}    label="CA Total"         value={`${fmt(kpis.totalCA)} FCFA`}   color="blue"    sub={`${kpis.nbInvoices} facture${kpis.nbInvoices !== 1 ? 's' : ''}`} />
          <KpiCard icon={CheckCircle}   label="Montant encaissé" value={`${fmt(kpis.totalPaid)} FCFA`} color="emerald" sub={`sur ${fmt(kpis.totalCA)} FCFA`} />
          <KpiCard icon={AlertTriangle} label="Montant dû"       value={`${fmt(kpis.totalDue)} FCFA`} color={kpis.totalDue > 0 ? 'red' : 'emerald'} alert={kpis.totalDue > 0} sub={kpis.overdueCount > 0 ? `dont ${kpis.overdueCount} en retard` : 'À jour'} />
          <KpiCard icon={FolderOpen}    label="Projets"          value={kpis.nbProjects}               color="violet"  sub={projects.filter(p => p.status === 'active').length + ' en cours'} />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-slate-100 dark:bg-navy-800 p-1 rounded-xl w-fit">
          {[
            { key: 'invoices', label: 'Factures', icon: Receipt,    count: kpis.nbInvoices },
            { key: 'projects', label: 'Projets',  icon: FolderOpen, count: kpis.nbProjects },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key ? 'bg-white dark:bg-navy-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
              <t.icon size={14} className={tab === t.key ? 'text-blue-500' : ''}/>
              {t.label}
              {t.count > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-navy-700 text-slate-600 dark:text-slate-300 min-w-[18px] text-center">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* ── Onglet Factures ── */}
        {tab === 'invoices' && (
          <div className="space-y-3">
            {kpis.totalDue > 0 && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl">
                <AlertTriangle size={18} className="text-red-500 shrink-0"/>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">{fmt(kpis.totalDue)} FCFA en attente de règlement</p>
                  <p className="text-xs text-red-500 mt-0.5">{pendingInvoices.length} facture{pendingInvoices.length > 1 ? 's' : ''} non soldée{pendingInvoices.length > 1 ? 's' : ''}{kpis.overdueCount > 0 && ` — ${kpis.overdueCount} en retard`}</p>
                </div>
                <button onClick={() => navigate('/admin/finance')} className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:underline shrink-0">
                  Voir facturation <ExternalLink size={11}/>
                </button>
              </div>
            )}
            {invoices.length === 0 ? (
              <div className="text-center py-14 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700">
                <Receipt size={32} className="mx-auto mb-3 text-slate-300 dark:text-navy-600"/>
                <p className="text-sm font-semibold text-slate-500">Aucune facture pour ce client</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[580px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-navy-700">
                      {['N° Facture', 'Date', 'Échéance', 'Montant TTC', 'Payé', 'Reste dû', 'Statut'].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-5 py-3.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
                    {invoices.map(inv => {
                      const total = inv.totalWithTax || inv.amount || 0
                      const paid  = inv.amountPaid || 0
                      const due   = total - paid
                      const stCls = STATUS_INV_CLS[inv.status] || STATUS_INV_CLS.draft
                      const stLbl = STATUS_INV[inv.status]?.label || 'Brouillon'
                      return (
                        <tr key={inv._id} className={`hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors ${inv.status === 'overdue' ? 'bg-red-50/30 dark:bg-red-500/5' : ''}`}>
                          <td className="px-5 py-3.5">
                            <span className="font-mono font-semibold text-slate-900 dark:text-white text-xs">{inv.number}</span>
                            {inv.project && <p className="text-[11px] text-slate-400 mt-0.5">{inv.project}</p>}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500">{fmtD(inv.date)}</td>
                          <td className="px-5 py-3.5"><span className={`text-xs ${inv.status === 'overdue' ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-500'}`}>{fmtD(inv.dueDate)}</span></td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-slate-900 dark:text-white">{fmt(total)} FCFA</td>
                          <td className="px-5 py-3.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">{fmt(paid)} FCFA</td>
                          <td className="px-5 py-3.5"><span className={`text-xs font-bold ${due > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>{due > 0 ? `${fmt(due)} FCFA` : '—'}</span></td>
                          <td className="px-5 py-3.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stCls}`}>{stLbl}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 dark:border-navy-600 bg-slate-50 dark:bg-navy-800/60">
                      <td colSpan={3} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Totaux</td>
                      <td className="px-5 py-3 text-sm font-black text-slate-900 dark:text-white">{fmt(kpis.totalCA)} FCFA</td>
                      <td className="px-5 py-3 text-sm font-black text-emerald-600 dark:text-emerald-400">{fmt(kpis.totalPaid)} FCFA</td>
                      <td className="px-5 py-3 text-sm font-black text-red-600 dark:text-red-400">{kpis.totalDue > 0 ? `${fmt(kpis.totalDue)} FCFA` : '—'}</td>
                      <td/>
                    </tr>
                  </tfoot>
                </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Onglet Projets ── */}
        {tab === 'projects' && (
          <div>
            {projects.length === 0 ? (
              <div className="text-center py-14 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700">
                <FolderOpen size={32} className="mx-auto mb-3 text-slate-300 dark:text-navy-600"/>
                <p className="text-sm font-semibold text-slate-500">Aucun projet associé à ce client</p>
                <p className="text-xs text-slate-400 mt-1">Sélectionnez ce client dans la fiche projet pour l'associer ici</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(p => {
                  const st = STATUS_PRJ[p.status] || STATUS_PRJ.active
                  return (
                    <div key={p._id} className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all">
                      {p.image && <div className="h-32 rounded-xl overflow-hidden -mx-1"><img src={p.image} alt={p.title} className="w-full h-full object-cover"/></div>}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{p.title}</h3>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      </div>
                      {p.category && <p className="text-xs text-slate-400">{p.category}{p.location ? ` · ${p.location}` : ''}</p>}
                      {typeof p.progress === 'number' && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-slate-400">Avancement</span>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{p.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${p.progress}%` }}/>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-slate-400 mt-auto pt-2 border-t border-slate-100 dark:border-navy-700">
                        {p.budgetAmount > 0 && <span className="font-semibold text-slate-600 dark:text-slate-300">{fmt(p.budgetAmount)} FCFA</span>}
                        {p.deliveryDate && <span className="flex items-center gap-1"><CalendarDays size={10}/>{fmtD(p.deliveryDate)}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Modal envoi email ── */}
      <Modal open={emailModal} onClose={() => !sending && setEmailModal(false)} title="Envoyer la fiche par email" size="lg">
        <form onSubmit={handleEmail(onSendEmail)} className="space-y-4">

          {/* Avertissement SMTP si pas configuré */}
          {!settings?.smtpHost && (
            <div className="flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5"/>
              <div className="text-xs text-amber-700 dark:text-amber-400">
                <strong>Configuration SMTP manquante.</strong> Rendez-vous dans{' '}
                <button type="button" onClick={() => { setEmailModal(false); navigate('/admin/settings') }}
                  className="underline font-semibold">Réglages → Email</button>
                {' '}pour configurer l'envoi d'emails.
              </div>
            </div>
          )}

          {/* Destinataire */}
          <Field label="Destinataire (email) *">
            <input
              {...regEmail('to', {
                required: 'Email requis',
                pattern:  { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email invalide' },
              })}
              type="email"
              placeholder={`email@exemple.com`}
              className={inp}
            />
            {emailErrors.to && <p className="text-xs text-red-500 mt-1">{emailErrors.to.message}</p>}
          </Field>

          {/* Objet */}
          <Field label="Objet *">
            <input
              {...regEmail('subject', { required: 'Objet requis' })}
              className={inp}
            />
            {emailErrors.subject && <p className="text-xs text-red-500 mt-1">{emailErrors.subject.message}</p>}
          </Field>

          {/* Message personnalisé */}
          <Field label="Message d'accompagnement (optionnel)">
            <textarea
              {...regEmail('message')}
              rows={3}
              placeholder="Bonjour, veuillez trouver ci-joint votre dossier client..."
              className={`${inp} resize-none`}
            />
          </Field>

          {/* Contenu à inclure */}
          <div>
            <p className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Contenu à inclure</p>
            <div className="flex flex-col gap-2.5">
              {[
                { name: 'includeInvoices', label: `Historique des factures (${data.invoices.length})`,  icon: Receipt },
                { name: 'includeProjects', label: `Projets associés (${data.projects.length})`,         icon: FolderOpen },
              ].map(({ name, label, icon: Icon }) => (
                <label key={name} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    {...regEmail(name)}
                    className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 group-hover:text-blue-500 transition-colors">
                    <Icon size={14} className="text-slate-400"/>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Aperçu de l'expéditeur */}
          {settings?.smtpFrom || settings?.smtpUser ? (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-600">
              <Mail size={13} className="text-slate-400 shrink-0"/>
              <span className="text-xs text-slate-500">Expédié depuis :</span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{settings.smtpFrom || settings.smtpUser}</span>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              disabled={sending}
              onClick={() => setEmailModal(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={sending || !settings?.smtpHost}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25 transition-colors"
            >
              {sending ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
              {sending ? 'Envoi en cours…' : 'Envoyer la fiche'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal modification ── */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Modifier le client" size="lg">
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nom / Raison sociale *"><input {...register('name', { required: true })} className={inp}/></Field>
            <Field label="Type">
              <select {...register('type')} className={inp}>
                <option value="entreprise">Entreprise</option>
                <option value="particulier">Particulier</option>
              </select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Email"><input {...register('email')} type="email" className={inp}/></Field>
            <Field label="Téléphone"><input {...register('phone')} className={inp}/></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Ville"><input {...register('city')} className={inp}/></Field>
            <Field label={typeWatch === 'entreprise' ? 'ICE' : 'CIN'}><input {...register('ice')} className={inp}/></Field>
          </div>
          <Field label="Adresse"><input {...register('address')} className={inp}/></Field>
          <Field label="Notes internes"><textarea {...register('notes')} rows={2} className={`${inp} resize-none`}/></Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">Annuler</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin"/>} Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
