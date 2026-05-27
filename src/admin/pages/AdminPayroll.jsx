import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import {
  Loader2, DollarSign, Download, CheckCircle2,
  Printer, ChevronLeft, ChevronRight,
  TrendingUp, Building2, Banknote, Calculator, X, Send, FileText, Landmark
} from 'lucide-react'
import { adminPayroll, adminSettings } from '../adminApi'
import { generatePayslipPDF } from '../utils/generatePayslipPDF'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt   = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)
const pct   = (n, t) => t > 0 ? `${((n/t)*100).toFixed(1)}%` : '—'

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}
function prevMonth(s) {
  const [y, m] = s.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}
function nextMonth(s) {
  const [y, m] = s.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}
function fmtMonth(s) {
  const [y, m] = s.split('-').map(Number)
  return new Date(y, m-1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

const STATUS_CFG = {
  brouillon: { label: 'Brouillon', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400' },
  validé:    { label: 'Validé',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
  payé:      { label: 'Payé',      cls: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' },
}

const DEPT_COLORS = {
  'Chantier':            '#3b82f6',
  "Bureau d'études":     '#8b5cf6',
  'Direction':           '#475569',
  'Comptabilité':        '#10b981',
  'Ressources humaines': '#ec4899',
  'Commercial':          '#f97316',
  'Logistique':          '#eab308',
}

// ── Payslip print (window) ────────────────────────────────────────────────────
function printPayslip(p, companyName = 'CONSTRUCTPRO') {
  const emp    = p.employee
  const month  = fmtMonth(p.month)
  const empNum = `EMP-${emp?._id?.slice(-6).toUpperCase() || '000000'}`
  const pos    = emp?.position || emp?.role || '—'
  const f      = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<title>Bulletin de paie — ${emp?.firstName} ${emp?.lastName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}
  body{padding:20px;font-size:11px;color:#1e293b}
  @media print { body{padding:0} @page{margin:15mm} }
  .header{background:linear-gradient(135deg,#0f172a,#1e40af);color:white;padding:16px 20px;border-radius:8px;margin-bottom:16px}
  h1{font-size:16px;font-weight:900;margin:0}
  .sub{font-size:10px;opacity:.7;margin-top:2px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
  .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}
  .card h3{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:8px}
  .row{display:flex;justify-content:space-between;padding:3px 0;font-size:10.5px}
  .row.sep{border-top:1px solid #e2e8f0;margin-top:4px;padding-top:6px;font-weight:700}
  .row.total{background:#0f172a;color:white;padding:10px 14px;border-radius:6px;font-weight:900;font-size:14px;margin-top:12px}
  .row.total span:last-child{color:#60a5fa}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;background:#22c55e;color:white}
  .footer{margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center}
</style></head>
<body>
  <div class="header">
    <h1>${companyName} — Bulletin de Paie</h1>
    <div class="sub">${month} · Édité le ${new Date().toLocaleDateString('fr-FR')}</div>
  </div>
  <div class="grid2">
    <div class="card">
      <h3>Employé</h3>
      <div class="row"><span>Nom</span><strong>${emp?.firstName} ${(emp?.lastName||'').toUpperCase()}</strong></div>
      <div class="row"><span>Poste</span><span>${pos}</span></div>
      <div class="row"><span>Département</span><span>${emp?.department || '—'}</span></div>
      <div class="row"><span>N° Employé</span><span>${empNum}</span></div>
      ${emp?.cnss ? `<div class="row"><span>N° CNSS</span><span>${emp.cnss}</span></div>` : ''}
    </div>
    <div class="card">
      <h3>Période</h3>
      <div class="row"><span>Mois</span><strong>${month}</strong></div>
      <div class="row"><span>Jours travaillés</span><span>${p.workingDays || 0} j</span></div>
      <div class="row"><span>Jours d'absence</span><span>${p.absenceDays || 0} j</span></div>
      <div class="row"><span>Heures travaillées</span><span>${(p.hoursWorked || 0).toFixed(1)} h</span></div>
      ${p.otHours > 0 ? `<div class="row"><span>Heures sup</span><span>${(p.otHours).toFixed(1)} h</span></div>` : ''}
    </div>
  </div>
  <div class="grid2">
    <div class="card">
      <h3>Rémunération brute</h3>
      <div class="row"><span>Salaire de base</span><span>${f(p.baseSalary)} MAD</span></div>
      ${p.otAmount > 0 ? `<div class="row"><span>Heures sup (×1.25)</span><span>${f(p.otAmount)} MAD</span></div>` : ''}
      ${p.bonuses  > 0 ? `<div class="row"><span>Primes</span><span>${f(p.bonuses)} MAD</span></div>` : ''}
      ${p.transport> 0 ? `<div class="row"><span>Indemnité transport</span><span>${f(p.transport)} MAD</span></div>` : ''}
      ${p.meal     > 0 ? `<div class="row"><span>Indemnité repas</span><span>${f(p.meal)} MAD</span></div>` : ''}
      <div class="row sep"><span>Salaire brut</span><span>${f(p.grossSalary)} MAD</span></div>
    </div>
    <div class="card">
      <h3>Cotisations & Retenues</h3>
      <div class="row"><span>CNSS salarié (4.48%)</span><span>− ${f(p.cnssEmployee)} MAD</span></div>
      <div class="row"><span>AMO salarié (2.26%)</span><span>− ${f(p.amoEmployee)} MAD</span></div>
      <div class="row"><span>Net imposable</span><span>${f(p.netImposable)} MAD</span></div>
      <div class="row"><span>IR mensuel</span><span>− ${f(p.irAmount)} MAD</span></div>
      ${p.advances > 0 ? `<div class="row"><span>Avances déduites</span><span>− ${f(p.advances)} MAD</span></div>` : ''}
      <div class="row sep"><span>Total retenues</span><span>${f(p.totalDeductions)} MAD</span></div>
    </div>
  </div>
  <div class="row total"><span>NET À PAYER</span><span>${f(p.netSalary)} MAD</span></div>
  <div class="grid2" style="margin-top:12px">
    <div class="card" style="background:#fef9c3">
      <h3 style="color:#a16207">Charges patronales (info)</h3>
      <div class="row"><span>CNSS employeur (21.09%)</span><span>${f(p.cnssEmployer)} MAD</span></div>
      <div class="row"><span>AMO employeur (4.11%)</span><span>${f(p.amoEmployer)} MAD</span></div>
      <div class="row sep"><span>Coût employeur total</span><span>${f(p.employerCost)} MAD</span></div>
    </div>
    <div class="card">
      <h3>Paiement</h3>
      <div class="row"><span>Mode</span><span>Virement bancaire</span></div>
      ${emp?.rib ? `<div class="row"><span>RIB</span><span style="font-family:monospace;font-size:9px">${emp.rib}</span></div>` : ''}
      <div class="row"><span>Statut</span><span><span class="badge">${STATUS_CFG[p.status]?.label || p.status}</span></span></div>
    </div>
  </div>
  <div class="footer">${companyName} · Bulletin généré automatiquement · Réglementation marocaine (Code du Travail)</div>
</body></html>`

  const win = window.open('', '_blank', 'width=700,height=900')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 600)
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCsv(payrolls, month) {
  const header = ['Employé', 'Département', 'Jours', 'H.Sup', 'Brut', 'CNSS salarié', 'AMO salarié', 'IR', 'Avances', 'Net', 'Coût employeur', 'Statut']
  const rows   = payrolls.map(p => [
    `${p.employee?.firstName} ${p.employee?.lastName}`,
    p.employee?.department || '',
    p.workingDays || 0,
    (p.otHours || 0).toFixed(1),
    p.grossSalary || 0,
    p.cnssEmployee || 0,
    p.amoEmployee  || 0,
    p.irAmount     || 0,
    p.advances     || 0,
    p.netSalary    || 0,
    p.employerCost || 0,
    STATUS_CFG[p.status]?.label || p.status,
  ])
  const csv  = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿'+csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href=url; a.download=`paie_${month}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ── PayslipModal — édition d'un bulletin ─────────────────────────────────────
function PayslipModal({ payroll, onClose, onSave, settings = {} }) {
  const [data, setData]   = useState(payroll)
  const [saving, setSaving] = useState(false)
  const emp = data.employee

  const update = (field, val) => {
    const n = { ...data, [field]: parseFloat(val) || 0 }
    // Recalculate
    const cnssBase    = Math.min(n.grossSalary || n.baseSalary, 6000)
    const cnssEmp     = Math.round(cnssBase * 0.0448)
    const amoEmp      = Math.round((n.grossSalary || n.baseSalary) * 0.0226)
    const netImp      = Math.max(0, (n.grossSalary || n.baseSalary) - cnssEmp - amoEmp)
    // IR simple estimation
    const irA         = netImp * 12
    const forfait     = Math.min(irA * 0.20, 30000)
    const imp         = Math.max(0, irA - forfait)
    let irAnnual = 0
    if (imp > 30000 && imp <= 50000)   irAnnual = (imp-30000)*0.10
    else if (imp > 50000 && imp <= 60000) irAnnual = 2000+(imp-50000)*0.20
    else if (imp > 60000 && imp <= 80000) irAnnual = 4000+(imp-60000)*0.30
    else if (imp > 80000)               irAnnual = 10000+(imp-80000)*0.34
    const irM = Math.round(irAnnual/12)
    const totalDed = cnssEmp + amoEmp + irM + (n.advances||0)
    const netS = Math.max(0, (n.grossSalary||n.baseSalary) - totalDed)
    setData({ ...n, cnssEmployee: cnssEmp, amoEmployee: amoEmp, netImposable: netImp, irAmount: irM, totalDeductions: totalDed, netSalary: netS })
  }

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(data) } finally { setSaving(false) }
  }

  const Row = ({ label, field, editable = false }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-navy-800 last:border-0">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      {editable ? (
        <input type="number" value={data[field] || 0}
          onChange={e => update(field, e.target.value)}
          className="w-28 text-xs text-right bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
      ) : (
        <span className="text-xs font-bold text-slate-900 dark:text-white">{fmt(data[field])} MAD</span>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white">{emp?.firstName} {emp?.lastName}</h3>
            <p className="text-xs text-slate-400">{fmtMonth(data.month)} · {emp?.department}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Rémunération */}
            <div className="bg-slate-50 dark:bg-navy-800 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">Rémunération</p>
              <Row label="Salaire de base" field="baseSalary" editable/>
              <Row label="H. supplémentaires" field="otAmount"/>
              <Row label="Primes" field="bonuses" editable/>
              <Row label="Transport" field="transport" editable/>
              <Row label="Repas" field="meal" editable/>
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-200 dark:border-navy-700">
                <span className="text-xs font-bold text-slate-700 dark:text-white">Brut</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">{fmt(data.grossSalary || data.baseSalary)} MAD</span>
              </div>
            </div>

            {/* Cotisations */}
            <div className="bg-slate-50 dark:bg-navy-800 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">Retenues salariales</p>
              <Row label="CNSS salarié (4.48%)" field="cnssEmployee"/>
              <Row label="AMO salarié (2.26%)" field="amoEmployee"/>
              <Row label="Net imposable" field="netImposable"/>
              <Row label="IR" field="irAmount"/>
              <Row label="Avances" field="advances" editable/>
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-200 dark:border-navy-700">
                <span className="text-xs font-bold text-slate-700 dark:text-white">Total retenues</span>
                <span className="text-sm font-black text-red-500">{fmt(data.totalDeductions)} MAD</span>
              </div>
            </div>
          </div>

          {/* NET */}
          <div className="bg-slate-900 dark:bg-navy-950 rounded-xl p-4 flex items-center justify-between">
            <span className="text-white font-bold">NET À PAYER</span>
            <span className="text-2xl font-black text-white">{fmt(data.netSalary)} MAD</span>
          </div>

          {/* Charges patronales */}
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-2">Charges patronales (pour info)</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              {[
                { label: 'CNSS employeur\n21.09%', val: data.cnssEmployer },
                { label: 'AMO employeur\n4.11%',  val: data.amoEmployer },
                { label: 'Coût total\nemployeur', val: data.employerCost },
              ].map(k => (
                <div key={k.label} className="bg-white dark:bg-navy-800 rounded-lg p-2">
                  <p className="font-black text-amber-600">{fmt(k.val)}</p>
                  <p className="text-slate-400 text-[10px] whitespace-pre-line">{k.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">Notes</label>
            <textarea value={data.notes || ''} onChange={e => setData(d => ({...d, notes: e.target.value}))}
              rows={2} className="w-full text-sm bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-900 dark:text-white"/>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-navy-700 flex gap-2">
          <button onClick={() => generatePayslipPDF(data, settings)}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-navy-600 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">
            <Download size={13}/> PDF
          </button>
          <button onClick={() => printPayslip(data, settings.companyName)}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-navy-600 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">
            <Printer size={13}/> Imprimer
          </button>
          <div className="flex-1"/>
          <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 dark:border-navy-600 rounded-xl text-xs text-slate-600 dark:text-slate-300">Annuler</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12}/>} Sauvegarder
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Export virements bancaires ────────────────────────────────────────────────
function exportVirements(payrolls, month) {
  const header = ['Nom', 'Prénom', 'Département', 'RIB', 'Net à payer (MAD)', 'Référence', 'Mois']
  const rows   = payrolls.map(p => [
    p.employee?.lastName  || '',
    p.employee?.firstName || '',
    p.employee?.department || '',
    p.employee?.rib || 'RIB manquant',
    p.netSalary || 0,
    `PAIE-${month}-${p.employee?._id?.slice(-4).toUpperCase() || '0000'}`,
    month,
  ])
  const csv  = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿'+csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = `virements_${month}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminPayroll() {
  const [month, setMonth]       = useState(currentMonthStr())
  const [payrolls, setPayrolls] = useState([])
  const [summary, setSummary]   = useState(null)
  const [settings, setSettings] = useState({})
  const [loading, setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deptFilter, setDeptFilter] = useState('all')
  const [emailModal, setEmailModal] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)

  const { register: regEmail, handleSubmit: handleEmailSubmit, reset: resetEmail } = useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, sm, setR] = await Promise.all([
        adminPayroll.getAll({ month }),
        adminPayroll.getSummary(month),
        adminSettings.get(),
      ])
      setPayrolls(pr.data)
      setSummary(sm.data)
      setSettings(setR.data || {})
    } finally { setLoading(false) }
  }, [month])

  useEffect(() => { load() }, [load])

  const handleGenerate = async () => {
    if (!window.confirm(`Générer les bulletins de ${fmtMonth(month)} pour tous les employés actifs ?`)) return
    setGenerating(true)
    try { await adminPayroll.generate(month); await load() }
    finally { setGenerating(false) }
  }

  const handleSave = async (data) => {
    await adminPayroll.update(data._id, data)
    setSelected(null)
    await load()
  }

  const handleStatus = async (id, status) => {
    await adminPayroll.updateStatus(id, status)
    await load()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce bulletin ?')) return
    await adminPayroll.delete(id)
    await load()
  }

  const sendEmail = async (v) => {
    if (!emailModal) return
    setSendingEmail(true)
    try {
      await adminPayroll.sendEmail(emailModal._id, v)
      alert('Bulletin envoyé avec succès !')
      setEmailModal(null); resetEmail({})
    } catch (e) {
      alert(e.response?.data?.error || "Erreur lors de l'envoi")
    } finally { setSendingEmail(false) }
  }

  const openEmailModal = (p) => {
    setEmailModal(p)
    resetEmail({
      to: p.employee?.email || '',
      subject: `Bulletin de paie ${fmtMonth(p.month)} — ${settings.companyName || 'CONSTRUCTPRO'}`,
    })
  }

  const depts   = ['all', ...[...new Set(payrolls.map(p => p.employee?.department).filter(Boolean))]]
  const displayed = payrolls.filter(p => deptFilter === 'all' || p.employee?.department === deptFilter)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Paie</h1>
          <p className="text-slate-500 text-sm mt-1 capitalize">{fmtMonth(month)} · Réglementation marocaine</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month nav */}
          <div className="flex items-center gap-1 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl">
            <button onClick={() => setMonth(prevMonth(month))} className="p-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white">
              <ChevronLeft size={16}/>
            </button>
            <span className="px-2 text-sm font-bold text-slate-900 dark:text-white capitalize w-36 text-center">{fmtMonth(month)}</span>
            <button onClick={() => setMonth(nextMonth(month))} className="p-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white">
              <ChevronRight size={16}/>
            </button>
          </div>
          <button onClick={() => exportCsv(displayed, month)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50">
            <Download size={13}/> CSV
          </button>
          <button onClick={() => exportVirements(displayed.filter(p => p.status !== 'brouillon'), month)}
            title="Export fichier virements bancaires"
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50">
            <Landmark size={13}/> Virements
          </button>
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60">
            {generating ? <Loader2 size={14} className="animate-spin"/> : <Calculator size={14}/>}
            Générer les bulletins
          </button>
        </div>
      </div>

      {/* KPI cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Masse salariale brute', value: `${fmt(summary.totalGross)} MAD`,    icon: DollarSign, color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-500/10' },
            { label: 'Total net à payer',     value: `${fmt(summary.totalNet)} MAD`,      icon: Banknote,   color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-500/10' },
            { label: 'Charges CNSS total',    value: `${fmt(summary.totalCNSS)} MAD`,     icon: Building2,  color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
            { label: 'Coût employeur total',  value: `${fmt(summary.employerCost)} MAD`,  icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' },
          ].map(k => {
            const Icon = k.icon
            return (
              <div key={k.label} className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5">
                <div className={`w-9 h-9 ${k.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon size={16} className={k.color}/>
                </div>
                <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
                <p className="text-xs text-slate-500 mt-1">{k.label}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Info banner (legal rates) */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl px-5 py-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="font-bold text-blue-700 dark:text-blue-400">Taux applicables :</span>
        {[
          'CNSS salarié 4.48%', 'CNSS employeur 21.09%',
          'AMO salarié 2.26%',  'AMO employeur 4.11%',
          'Heures sup +25%',    'Semaine légale 44h',
        ].map(t => (
          <span key={t} className="px-2.5 py-1 bg-white dark:bg-navy-900 text-blue-600 dark:text-blue-300 rounded-lg font-medium border border-blue-100 dark:border-blue-500/20">{t}</span>
        ))}
      </div>

      {/* Dept filter */}
      {depts.length > 2 && (
        <div className="flex gap-2 flex-wrap">
          {depts.map(d => (
            <button key={d} onClick={() => setDeptFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${deptFilter === d ? 'bg-blue-500 text-white' : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300'}`}>
              {d === 'all' ? 'Tous' : d}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
      ) : displayed.length === 0 ? (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 text-center py-16">
          <Calculator size={32} className="mx-auto mb-3 text-slate-300"/>
          <p className="text-slate-400 text-sm mb-3">Aucun bulletin pour {fmtMonth(month)}</p>
          <button onClick={handleGenerate} disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white text-sm font-bold rounded-xl">
            <Calculator size={14}/> Générer maintenant
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-navy-700 bg-slate-50/50 dark:bg-navy-800/30">
                  {['Employé','Département','Jours','H.Sup','Brut','CNSS+AMO','IR','Net à payer','Statut','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
                {displayed.map(p => {
                  const sc  = STATUS_CFG[p.status] || STATUS_CFG.brouillon
                  const emp = p.employee
                  const deptColor = DEPT_COLORS[emp?.department] || '#3b82f6'
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/20 transition-colors">
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {emp?.photo
                            ? <img src={emp.photo} className="w-7 h-7 rounded-lg object-cover shrink-0" alt=""/>
                            : <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                style={{ background: deptColor }}>
                                {emp?.firstName?.[0]}{emp?.lastName?.[0]}
                              </div>
                          }
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white text-xs whitespace-nowrap">
                              {emp?.firstName} {emp?.lastName}
                            </p>
                            <p className="text-[10px] text-slate-400">{emp?.position || emp?.role || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: deptColor }}>
                          {emp?.department}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-center text-slate-600 dark:text-slate-300">{p.workingDays || 0}j</td>
                      <td className="px-4 py-3 text-xs text-center">
                        {p.otHours > 0
                          ? <span className="text-orange-500 font-bold">{(p.otHours).toFixed(1)}h</span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                        {fmt(p.grossSalary)} MAD
                      </td>
                      <td className="px-4 py-3 text-xs text-red-500 font-medium whitespace-nowrap">
                        -{fmt((p.cnssEmployee||0) + (p.amoEmployee||0))} MAD
                      </td>
                      <td className="px-4 py-3 text-xs text-red-500 font-medium whitespace-nowrap">
                        -{fmt(p.irAmount)} MAD
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-black text-green-600 dark:text-green-400 text-sm whitespace-nowrap">{fmt(p.netSalary)} MAD</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSelected(p)} title="Modifier"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                            <FileText size={13}/>
                          </button>
                          <button onClick={() => generatePayslipPDF(p, settings)} title="Télécharger PDF"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
                            <Download size={13}/>
                          </button>
                          <button onClick={() => printPayslip(p, settings.companyName)} title="Imprimer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors">
                            <Printer size={13}/>
                          </button>
                          <button onClick={() => openEmailModal(p)} title="Envoyer par email"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors">
                            <Send size={13}/>
                          </button>
                          {p.status === 'brouillon' && (
                            <button onClick={() => handleStatus(p._id, 'validé')} title="Valider"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                              <CheckCircle2 size={13}/>
                            </button>
                          )}
                          {p.status === 'validé' && (
                            <button onClick={() => handleStatus(p._id, 'payé')} title="Marquer payé"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors">
                              <DollarSign size={13}/>
                            </button>
                          )}
                          <button onClick={() => handleDelete(p._id)} title="Supprimer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                            <X size={13}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Footer totals */}
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-navy-600 bg-slate-50 dark:bg-navy-800/50">
                  <td colSpan={4} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">{displayed.length} employés</td>
                  <td className="px-4 py-3 text-xs font-black text-slate-900 dark:text-white whitespace-nowrap">
                    {fmt(displayed.reduce((s,p) => s+(p.grossSalary||0), 0))} MAD
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-red-500 whitespace-nowrap">
                    -{fmt(displayed.reduce((s,p) => s+(p.cnssEmployee||0)+(p.amoEmployee||0), 0))} MAD
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-red-500 whitespace-nowrap">
                    -{fmt(displayed.reduce((s,p) => s+(p.irAmount||0), 0))} MAD
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-black text-green-600 dark:text-green-400 whitespace-nowrap">
                      {fmt(displayed.reduce((s,p) => s+(p.netSalary||0), 0))} MAD
                    </span>
                  </td>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {selected && <PayslipModal payroll={selected} onClose={() => setSelected(null)} onSave={handleSave} settings={settings}/>}

      {/* Email modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white">Envoyer le bulletin</h3>
                <p className="text-xs text-slate-400">{emailModal.employee?.firstName} {emailModal.employee?.lastName} · {fmtMonth(emailModal.month)}</p>
              </div>
              <button onClick={() => setEmailModal(null)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>
            <form onSubmit={handleEmailSubmit(sendEmail)} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email destinataire</label>
                <input {...regEmail('to', { required: true })} type="email"
                  className="w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="employe@email.com"/>
                {!emailModal.employee?.email && (
                  <p className="text-[10px] text-orange-500 mt-1">⚠ Email non renseigné dans la fiche employé</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Objet</label>
                <input {...regEmail('subject')}
                  className="w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Message (optionnel)</label>
                <textarea {...regEmail('message')} rows={2}
                  className="w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Voici votre bulletin de paie pour ce mois…"/>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setEmailModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300">
                  Annuler
                </button>
                <button type="submit" disabled={sendingEmail}
                  className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                  {sendingEmail ? <Loader2 size={13} className="animate-spin"/> : <Send size={13}/>} Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
