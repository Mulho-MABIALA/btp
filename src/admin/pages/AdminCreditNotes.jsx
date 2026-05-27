import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import {
  Loader2, FileX, Plus, Pencil, Trash2, CheckCircle,
  Download, Send, X, FileText, AlertTriangle, RotateCcw
} from 'lucide-react'
import { adminCreditNotes, adminClients, adminInvoices, adminSettings } from '../adminApi'
import Modal from '../components/Modal'
import { generateCreditNotePDF } from '../utils/generateCreditNotePDF'

const inp   = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
const inpSm = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
const Field = ({ label, children }) => (
  <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>{children}</div>
)
const fmt  = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)

const STATUS = {
  draft:   { label: 'Brouillon', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400' },
  issued:  { label: 'Émis',      cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' },
  applied: { label: 'Appliqué',  cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' },
}
const EMPTY_LINE = { description: '', qty: 1, unit: 'forfait', unitPrice: '' }

export default function AdminCreditNotes() {
  const [data, setData]           = useState([])
  const [clients, setClients]     = useState([])
  const [invoices, setInvoices]   = useState([])
  const [settings, setSettings]   = useState({})
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(null)
  const [emailModal, setEmailModal] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [lines, setLines]         = useState([{ ...EMPTY_LINE }])

  const { register, handleSubmit, reset, watch, setValue } = useForm()
  const { register: regEmail, handleSubmit: handleEmailSubmit, reset: resetEmail } = useForm()

  const watchInvoice   = watch('invoice')
  const watchDiscount  = Number(watch('discount')  || 0)
  const watchTax       = Number(watch('tax')        ?? 20)

  // Live totals
  const subTotal    = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0)
  const discountAmt = Math.round(subTotal * watchDiscount / 100 * 100) / 100
  const htNet       = Math.round((subTotal - discountAmt) * 100) / 100
  const taxAmt      = Math.round(htNet * (watchTax ?? 20) / 100 * 100) / 100
  const ttc         = Math.round((htNet + taxAmt) * 100) / 100

  // Quand on sélectionne une facture, on pré-remplit client + lignes
  useEffect(() => {
    if (!watchInvoice) return
    const inv = invoices.find(i => i._id === watchInvoice)
    if (!inv) return
    if (inv.client?._id) setValue('client', inv.client._id)
    if (inv.lines?.length) {
      setLines(inv.lines.map(l => ({ description: l.description, qty: l.qty, unit: l.unit, unitPrice: l.unitPrice })))
      setValue('tax', inv.tax ?? 20)
    }
  }, [watchInvoice, invoices, setValue])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cnR, cliR, invR, setR] = await Promise.all([
        adminCreditNotes.getAll(), adminClients.getAll(), adminInvoices.getAll(), adminSettings.get()
      ])
      setData(cnR.data); setClients(cliR.data); setInvoices(invR.data); setSettings(setR.data || {})
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    reset({ tax: 20, discount: 0, status: 'draft', date: new Date().toISOString().split('T')[0] })
    setLines([{ ...EMPTY_LINE }])
    setModal(true)
  }

  const openEdit = r => {
    setEditing(r)
    reset({
      ...r,
      client:  r.client?._id,
      invoice: r.invoice?._id || '',
      date:    r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      tax:     r.tax ?? 20,
      discount: r.discount || 0,
    })
    setLines(r.lines?.length
      ? r.lines.map(l => ({ description: l.description, qty: l.qty, unit: l.unit, unitPrice: l.unitPrice }))
      : [{ ...EMPTY_LINE }])
    setModal(true)
  }

  const close = () => { setModal(false); setEditing(null); setLines([{ ...EMPTY_LINE }]) }

  const onSubmit = async (v) => {
    setSaving(true)
    try {
      const payload = {
        ...v,
        lines: lines.filter(l => l.description?.trim() && parseFloat(l.unitPrice) > 0).map(l => ({
          description: l.description,
          qty:         parseFloat(l.qty) || 1,
          unit:        l.unit || 'forfait',
          unitPrice:   parseFloat(l.unitPrice) || 0,
        })),
        amount: htNet || parseFloat(v.amount) || 0,
        invoice: v.invoice || undefined,
      }
      if (editing) await adminCreditNotes.update(editing._id, payload)
      else         await adminCreditNotes.create(payload)
      await load(); close()
    } finally { setSaving(false) }
  }

  const updateLine = (i, field, value) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  const addLine    = () => setLines(prev => [...prev, { ...EMPTY_LINE }])
  const removeLine = i  => setLines(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)

  const changeStatus = async (id, status) => {
    await adminCreditNotes.updateStatus(id, status)
    await load()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet avoir ?')) return
    setDeleting(id)
    try { await adminCreditNotes.delete(id); await load() } finally { setDeleting(null) }
  }

  const sendEmail = async (v) => {
    if (!emailModal) return
    setSendingEmail(true)
    try {
      await adminCreditNotes.sendEmail(emailModal._id, v)
      alert('Email envoyé avec succès !')
      setEmailModal(null); resetEmail({})
      await load()
    } catch (e) {
      alert(e.response?.data?.error || "Erreur lors de l'envoi")
    } finally { setSendingEmail(false) }
  }

  // KPIs
  const totalTTC    = data.reduce((s, cn) => s + (cn.totalWithTax || 0), 0)
  const totalIssued = data.filter(cn => cn.status !== 'draft').reduce((s, cn) => s + (cn.totalWithTax || 0), 0)
  const countDraft  = data.filter(cn => cn.status === 'draft').length
  const countApplied = data.filter(cn => cn.status === 'applied').length

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Avoirs / Notes de crédit</h1>
            <p className="text-slate-500 text-sm mt-1">{data.length} avoir{data.length > 1 ? 's' : ''} · Impact CA : −{fmt(totalIssued)} MAD</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors">
            <Plus size={15}/> Nouvel avoir
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total avoirs',      val: fmt(totalTTC) + ' MAD',    color: 'bg-rose-500',    sub: `${data.length} avoir(s)` },
            { label: 'Émis / Appliqués',  val: fmt(totalIssued) + ' MAD', color: 'bg-orange-500',  sub: 'Impact chiffre d\'affaires' },
            { label: 'Brouillons',        val: countDraft,                 color: 'bg-slate-500',   sub: 'À émettre' },
            { label: 'Appliqués',         val: countApplied,               color: 'bg-emerald-500', sub: 'Soldés' },
          ].map(({ label, val, color, sub }) => (
            <div key={label} className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5">
              <div className={`w-2 h-8 ${color} rounded-full mb-3`}/>
              <div className="text-xl font-black text-slate-900 dark:text-white">{val}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          {loading
            ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-rose-500"/></div>
            : data.length === 0
              ? <div className="text-center py-16 text-slate-400"><FileX size={32} className="mx-auto mb-3 opacity-30"/><p className="text-sm">Aucun avoir</p></div>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-navy-700">
                        {['N° Avoir','Facture liée','Client','Motif','HT Net','Total TTC','Statut','Date','Actions'].map(h => (
                          <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3.5 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
                      {data.map(cn => {
                        const s = STATUS[cn.status] || STATUS.draft
                        return (
                          <tr key={cn._id} className="hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">{cn.number}</td>
                            <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                              {cn.invoice?.number || cn.invoiceNumber || <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{cn.client?.name || '—'}</td>
                            <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px] truncate">{cn.reason}</td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmt(cn.amount)} MAD</td>
                            <td className="px-4 py-3 font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">−{fmt(cn.totalWithTax)} MAD</td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap ${s.cls}`}>{s.label}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                              {cn.date ? new Date(cn.date).toLocaleDateString('fr-FR') : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-0.5">
                                {cn.status === 'draft' && (
                                  <button onClick={() => changeStatus(cn._id, 'issued')} title="Émettre"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                                    <CheckCircle size={14}/>
                                  </button>
                                )}
                                {cn.status === 'issued' && (
                                  <button onClick={() => changeStatus(cn._id, 'applied')} title="Marquer appliqué"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
                                    <RotateCcw size={14}/>
                                  </button>
                                )}
                                <button onClick={() => { setEmailModal(cn); resetEmail({ to: cn.client?.email || '', subject: `Avoir ${cn.number} – ${settings.companyName || 'CONSTRUCTPRO'}` }) }}
                                  title="Envoyer par email"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors">
                                  <Send size={14}/>
                                </button>
                                <button onClick={() => generateCreditNotePDF(cn, settings)} title="Télécharger PDF"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
                                  <Download size={14}/>
                                </button>
                                <button onClick={() => openEdit(cn)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                                  <Pencil size={14}/>
                                </button>
                                <button onClick={() => handleDelete(cn._id)} disabled={deleting === cn._id}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                                  {deleting === cn._id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
          }
        </div>
      </div>

      {/* ── Email modal ── */}
      <Modal open={!!emailModal} onClose={() => setEmailModal(null)} title={`Envoyer — ${emailModal?.number || ''}`} size="md">
        <form onSubmit={handleEmailSubmit(sendEmail)} className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Destinataire</label>
            <input {...regEmail('to', { required: true })} type="email" className={inp} placeholder="client@email.com"/></div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Objet</label>
            <input {...regEmail('subject')} className={inp}/></div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Message (optionnel)</label>
            <textarea {...regEmail('message')} rows={3} className={`${inp} resize-none`} placeholder="Veuillez trouver ci-joint votre avoir…"/></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEmailModal(null)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300">Annuler</button>
            <button type="submit" disabled={sendingEmail}
              className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {sendingEmail ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>} Envoyer
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Créer / Modifier ── */}
      <Modal open={modal} onClose={close}
        title={editing ? "Modifier l'avoir" : 'Nouvel avoir'}
        size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Ligne 1 : Facture liée → Client */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Facture d'origine (optionnel)">
              <select {...register('invoice')} className={inp}>
                <option value="">Aucune — avoir libre</option>
                {invoices.map(i => (
                  <option key={i._id} value={i._id}>
                    {i.number} — {i.client?.name} ({fmt(i.totalWithTax)} MAD)
                  </option>
                ))}
              </select>
              {watchInvoice && (
                <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                  <CheckCircle size={10}/> Lignes et client pré-remplis depuis la facture
                </p>
              )}
            </Field>
            <Field label="Client *">
              <select {...register('client', { required: true })} className={inp}>
                <option value="">Sélectionner…</option>
                {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          {/* Motif */}
          <Field label="Motif de l'avoir *">
            <input {...register('reason', { required: true })} className={inp}
              placeholder="Ex: Retour de marchandise, erreur de facturation, travaux non réalisés…"/>
          </Field>

          {/* Ligne 2 : Date + Statut */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Date"><input {...register('date')} type="date" className={inp}/></Field>
            <Field label="Statut">
              <select {...register('status')} className={inp}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          </div>

          {/* ── Lignes de l'avoir ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Lignes de l'avoir
              </label>
              <button type="button" onClick={addLine}
                className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors">
                <Plus size={13}/> Ajouter une ligne
              </button>
            </div>
            <div className="border border-rose-100 dark:border-navy-600 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-xs min-w-[460px]">
                <thead className="bg-rose-50 dark:bg-navy-800">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-500 w-[40%]">Description</th>
                    <th className="text-center px-2 py-2 font-semibold text-slate-500 w-[10%]">Qté</th>
                    <th className="text-center px-2 py-2 font-semibold text-slate-500 w-[12%]">Unité</th>
                    <th className="text-right px-2 py-2 font-semibold text-slate-500 w-[18%]">Prix unitaire (MAD)</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-500 w-[16%]">Total HT</th>
                    <th className="w-[4%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-50 dark:divide-navy-700">
                  {lines.map((line, i) => {
                    const lineTotal = (parseFloat(line.qty) || 0) * (parseFloat(line.unitPrice) || 0)
                    return (
                      <tr key={i} className="bg-white dark:bg-navy-900">
                        <td className="px-2 py-1.5">
                          <input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)}
                            className={inpSm} placeholder="Description…"/>
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={line.qty} onChange={e => updateLine(i, 'qty', e.target.value)}
                            type="number" min="0" step="0.01" className={`${inpSm} text-center`}/>
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={line.unit} onChange={e => updateLine(i, 'unit', e.target.value)} className={inpSm}>
                            {['forfait','m²','m³','ml','unité','heure','jour','kg','tonne'].map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={line.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)}
                            type="number" min="0" step="0.01" className={`${inpSm} text-right`} placeholder="0"/>
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold text-rose-700 dark:text-rose-400 whitespace-nowrap">
                          {fmt(lineTotal)} MAD
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <button type="button" onClick={() => removeLine(i)}
                            className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                            <X size={12}/>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Remise + TVA + Récapitulatif */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Remise (%)">
                  <input {...register('discount', { valueAsNumber: true })} type="number" min="0" max="100" step="0.1" className={inp} defaultValue={0}/>
                </Field>
                <Field label="TVA (%)">
                  <input {...register('tax', { valueAsNumber: true })} type="number" min="0" max="100" className={inp} defaultValue={20}/>
                </Field>
              </div>
              <Field label="Notes internes">
                <textarea {...register('notes')} rows={3} className={`${inp} resize-none`} placeholder="Observations…"/>
              </Field>
            </div>

            {/* Récapitulatif live */}
            <div className="bg-rose-50 dark:bg-navy-800 border border-rose-100 dark:border-navy-600 rounded-xl p-4 space-y-2 text-sm">
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <AlertTriangle size={11}/> Récapitulatif avoir
              </p>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Sous-total HT</span>
                <span className="font-semibold">{fmt(subTotal)} MAD</span>
              </div>
              {watchDiscount > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Remise ({watchDiscount}%)</span>
                  <span className="font-semibold">− {fmt(discountAmt)} MAD</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Montant HT net</span>
                <span className="font-semibold">{fmt(htNet)} MAD</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>TVA ({watchTax ?? 20}%)</span>
                <span className="font-semibold">{fmt(taxAmt)} MAD</span>
              </div>
              <div className="flex justify-between text-rose-700 dark:text-rose-400 font-bold border-t border-rose-200 dark:border-navy-600 pt-2">
                <span>Total avoir TTC</span>
                <span>− {fmt(ttc)} MAD</span>
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                Ce montant sera déduit du chiffre d'affaires à l'émission.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-navy-700">
            <button type="button" onClick={close}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin"/>}
              <FileText size={14}/>
              {editing ? 'Enregistrer' : 'Créer l\'avoir'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
