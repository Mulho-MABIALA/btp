import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2, DollarSign, TrendingUp, TrendingDown, Plus, Pencil, Trash2,
         CheckCircle, Receipt, Download, Send, CreditCard, X, FileText, AlertTriangle } from 'lucide-react'
import { adminInvoices, adminExpenses, adminClients, adminSettings } from '../adminApi'
import Modal from '../components/Modal'
import { generateInvoicePDF } from '../utils/generateInvoicePDF'
import { exportCsv } from '../utils/exportCsv'

const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const inpSm = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
const Field = ({ label, children }) => <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>{children}</div>

const fmt = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)
const fmtK = n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}k` : (n || 0)

const INVOICE_STATUS = {
  draft:   { label: 'Brouillon', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400' },
  sent:    { label: 'Envoyée',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  paid:    { label: 'Payée',     cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' },
  overdue: { label: 'En retard', cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
  partial: { label: 'Partiel',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
}
const INVOICE_TYPES = ['Facture', 'Facture de situation', "Facture d'acompte", 'Facture définitive']
const PAYMENT_TERMS = ['Comptant', '15 jours', '30 jours', '45 jours', '60 jours', '90 jours', 'Sur livraison']
const EXPENSE_CATS = ["Matériaux", "Main d'œuvre", "Équipements", "Transport", "Sous-traitance", "Bureau", "Autre"]
const PAYMENT_METHODS = { cash: 'Espèces', virement: 'Virement', cheque: 'Chèque', carte: 'Carte' }
const CAT_COLORS = { "Matériaux": 'bg-blue-500', "Main d'œuvre": 'bg-violet-500', "Équipements": 'bg-orange-500', "Transport": 'bg-sky-500', "Sous-traitance": 'bg-pink-500', "Bureau": 'bg-slate-500', "Autre": 'bg-gray-500' }
const EMPTY_LINE = { description: '', qty: 1, unit: 'forfait', unitPrice: '' }

export default function AdminFinance() {
  const [tab, setTab]               = useState('invoices')
  const [invoices, setInvoices]     = useState([])
  const [expenses, setExpenses]     = useState([])
  const [clients, setClients]       = useState([])
  const [settings, setSettings]     = useState({})
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [editing, setEditing]       = useState(null)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(null)
  const [payModal, setPayModal]     = useState(null)
  const [emailModal, setEmailModal] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [lines, setLines]           = useState([{ ...EMPTY_LINE }])

  const { register, handleSubmit, reset, watch } = useForm()
  const { register: regPay, handleSubmit: handlePay, reset: resetPay } = useForm()
  const { register: regEmail, handleSubmit: handleEmail, reset: resetEmail } = useForm()

  const watchDiscount  = Number(watch('discount')  || 0)
  const watchTax       = Number(watch('tax')        ?? 20)
  const watchRetention = Number(watch('retention')  || 0)

  // Live totals from line items
  const subTotal     = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0)
  const discountAmt  = Math.round(subTotal * watchDiscount / 100 * 100) / 100
  const htNet        = Math.round((subTotal - discountAmt) * 100) / 100
  const taxAmt       = Math.round(htNet * (watchTax ?? 20) / 100 * 100) / 100
  const ttc          = Math.round((htNet + taxAmt) * 100) / 100
  const retentionAmt = Math.round(ttc * watchRetention / 100 * 100) / 100
  const netToPay     = Math.round((ttc - retentionAmt) * 100) / 100

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [invR, expR, cliR, setR] = await Promise.all([
        adminInvoices.getAll(), adminExpenses.getAll(), adminClients.getAll(), adminSettings.get()
      ])
      setInvoices(invR.data); setExpenses(expR.data); setClients(cliR.data); setSettings(setR.data || {})
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { loadAll() }, [loadAll])

  const openAdd = () => {
    setEditing(null)
    if (tab === 'invoices') {
      reset({ invoiceType: 'Facture', tax: 20, discount: 0, retention: 0, status: 'draft',
              paymentTerms: '30 jours', date: new Date().toISOString().split('T')[0] })
      setLines([{ ...EMPTY_LINE }])
    } else {
      reset({ paymentMethod: 'virement', date: new Date().toISOString().split('T')[0] })
    }
    setModal(true)
  }

  const openEdit = r => {
    setEditing(r)
    if (tab === 'invoices') {
      reset({
        ...r,
        client:       r.client?._id,
        date:         r.date     ? new Date(r.date).toISOString().split('T')[0]    : '',
        dueDate:      r.dueDate  ? new Date(r.dueDate).toISOString().split('T')[0] : '',
        invoiceType:  r.invoiceType  || 'Facture',
        paymentTerms: r.paymentTerms || '30 jours',
        tax:          r.tax ?? 20,
        discount:     r.discount  || 0,
        retention:    r.retention || 0,
      })
      setLines(r.lines?.length
        ? r.lines.map(l => ({ description: l.description, qty: l.qty, unit: l.unit, unitPrice: l.unitPrice }))
        : [{ ...EMPTY_LINE }])
    } else {
      reset(r)
    }
    setModal(true)
  }

  const close = () => { setModal(false); setEditing(null); setLines([{ ...EMPTY_LINE }]) }

  const onSubmit = async (v) => {
    setSaving(true)
    try {
      if (tab === 'invoices') {
        const payload = {
          ...v,
          lines: lines.filter(l => l.description?.trim() && parseFloat(l.unitPrice) > 0).map(l => ({
            description: l.description,
            qty:         parseFloat(l.qty) || 1,
            unit:        l.unit || 'forfait',
            unitPrice:   parseFloat(l.unitPrice) || 0,
          })),
          // amount will be recalculated by pre-save hook from lines
          // but we send htNet as fallback for invoices without lines
          amount: htNet || parseFloat(v.amount) || 0,
        }
        if (editing) await adminInvoices.update(editing._id, payload)
        else await adminInvoices.create(payload)
      } else {
        if (editing) await adminExpenses.update(editing._id, v)
        else await adminExpenses.create(v)
      }
      await loadAll(); close()
    } finally { setSaving(false) }
  }

  const updateLine = (i, field, value) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }
  const addLine    = () => setLines(prev => [...prev, { ...EMPTY_LINE }])
  const removeLine = i  => setLines(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)

  const markPaid = async (id) => {
    await adminInvoices.updateStatus(id, 'paid'); await loadAll()
  }

  const addPayment = async (v) => {
    if (!payModal) return
    setSaving(true)
    try {
      await adminInvoices.addPayment(payModal._id, { ...v, amount: Number(v.amount) })
      await loadAll(); setPayModal(null)
    } finally { setSaving(false) }
  }

  const removePayment = async (invId, pid) => {
    if (!window.confirm('Supprimer ce paiement ?')) return
    await adminInvoices.deletePayment(invId, pid); await loadAll()
  }

  const sendEmail = async (v) => {
    if (!emailModal) return
    setSendingEmail(true)
    try {
      await adminInvoices.sendEmail(emailModal._id, v)
      alert('Email envoyé avec succès !')
      setEmailModal(null); resetEmail({}); await loadAll()
    } catch (e) {
      alert(e.response?.data?.error || "Erreur lors de l'envoi")
    } finally { setSendingEmail(false) }
  }

  const doExport = () => exportCsv('factures.csv', invoices.map(i => ({
    Numéro: i.number, Type: i.invoiceType, Client: i.client?.name, Projet: i.project,
    'Montant HT': i.amount, 'TVA %': i.tax, 'Total TTC': i.totalWithTax,
    'Retenue %': i.retention, 'Net à payer': i.netToPay,
    'Payé': i.amountPaid, Statut: i.status, Date: i.date,
  })))

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ?')) return
    setDeleting(id)
    try {
      if (tab === 'invoices') await adminInvoices.delete(id)
      else await adminExpenses.delete(id)
      await loadAll()
    } finally { setDeleting(null) }
  }

  const totalRevenue  = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0)
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const netProfit     = totalRevenue - totalExpenses
  const pending       = invoices.filter(i => ['sent','overdue','partial'].includes(i.status)).reduce((s, i) => s + ((i.netToPay || i.totalWithTax || 0) - (i.amountPaid || 0)), 0)

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Finance</h1>
          <p className="text-slate-500 text-sm mt-1">Facturation & suivi des dépenses</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Chiffre d'affaires", val: fmtK(totalRevenue) + ' MAD', icon: TrendingUp,   color: 'bg-emerald-500', sub: 'Factures payées' },
            { label: 'Dépenses totales',   val: fmtK(totalExpenses) + ' MAD', icon: TrendingDown, color: 'bg-red-500',     sub: 'Toutes catégories' },
            { label: 'Bénéfice net',       val: fmtK(netProfit) + ' MAD',    icon: DollarSign,   color: netProfit >= 0 ? 'bg-blue-500' : 'bg-rose-500', sub: netProfit >= 0 ? '↑ Positif' : '↓ Négatif' },
            { label: 'En attente',         val: fmtK(pending) + ' MAD',      icon: Receipt,      color: 'bg-amber-500',   sub: `${invoices.filter(i=>['sent','overdue','partial'].includes(i.status)).length} facture(s)` },
          ].map(({ label, val, icon: Icon, color, sub }) => (
            <div key={label} className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5">
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}><Icon size={18} className="text-white"/></div>
              <div className="text-xl font-black text-slate-900 dark:text-white">{val}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 p-1 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl">
            {[['invoices', 'Factures', invoices.length], ['expenses', 'Dépenses', expenses.length]].map(([k, l, count]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === k ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
                {l} <span className="ml-1 opacity-70 text-xs">({count})</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {tab === 'invoices' && (
              <button onClick={doExport} className="px-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">↓ CSV</button>
            )}
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors">
              <Plus size={15}/> {tab === 'invoices' ? 'Nouvelle facture' : 'Nouvelle dépense'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
          ) : tab === 'invoices' ? (
            invoices.length === 0 ? <EmptyState label="Aucune facture" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-navy-700">
                      {['N° Facture','Type','Client','Projet','HT Net','TTC','Net à payer','Statut','Échéance','Actions'].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
                    {invoices.map(inv => {
                      const s = INVOICE_STATUS[inv.status] || INVOICE_STATUS.draft
                      const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date() && !['paid'].includes(inv.status)
                      return (
                        <tr key={inv._id} className="hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{inv.number}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {inv.invoiceType || 'Facture'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900 dark:text-white text-sm whitespace-nowrap">{inv.client?.name || '—'}</p>
                            {inv.client?.city && <p className="text-xs text-slate-400">{inv.client.city}</p>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 max-w-[110px] truncate">{inv.project || '—'}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200 text-sm whitespace-nowrap">{fmt(inv.amount)} MAD</td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{fmt(inv.totalWithTax)} MAD</p>
                            {inv.amountPaid > 0 && inv.status !== 'paid' && (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{fmt(inv.amountPaid)} payé</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {inv.retention > 0 ? (
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{fmt(inv.netToPay)} MAD</p>
                                <p className="text-[10px] text-orange-500">Retenue {inv.retention}%</p>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap ${s.cls}`}>{s.label}</span></td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {inv.dueDate
                              ? <span className={isOverdue ? 'text-red-500 font-semibold' : 'text-slate-500'}>{new Date(inv.dueDate).toLocaleDateString('fr-FR')}</span>
                              : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-0.5">
                              {inv.status !== 'paid' && (
                                <button onClick={() => markPaid(inv._id)} title="Marquer payée"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors">
                                  <CheckCircle size={14}/>
                                </button>
                              )}
                              <button onClick={() => { setPayModal(inv); resetPay({ method: 'virement', date: new Date().toISOString().split('T')[0] }) }} title="Paiements"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
                                <CreditCard size={14}/>
                              </button>
                              <button onClick={() => { setEmailModal(inv); resetEmail({ to: inv.client?.email || '', subject: `${inv.invoiceType || 'Facture'} ${inv.number}` }) }} title="Envoyer email"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors">
                                <Send size={14}/>
                              </button>
                              <button onClick={() => generateInvoicePDF(inv, settings)} title="PDF"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
                                <Download size={14}/>
                              </button>
                              <button onClick={() => openEdit(inv)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Pencil size={14}/></button>
                              <button onClick={() => handleDelete(inv._id)} disabled={deleting === inv._id} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                                {deleting === inv._id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
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
          ) : (
            expenses.length === 0 ? <EmptyState label="Aucune dépense" /> : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-navy-700">
                    {['Catégorie', 'Description', 'Montant', 'Date', 'Projet', 'Fournisseur', 'Paiement', 'Actions'].map(h => (
                      <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
                  {expenses.map(exp => (
                    <tr key={exp._id} className="hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full text-white ${CAT_COLORS[exp.category] || 'bg-slate-500'}`}>{exp.category}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-200 max-w-[160px] truncate">{exp.description}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">{fmt(exp.amount)} MAD</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{new Date(exp.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 truncate max-w-[100px]">{exp.project || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 truncate max-w-[100px]">{exp.supplier || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{PAYMENT_METHODS[exp.paymentMethod] || exp.paymentMethod}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(exp)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Pencil size={14}/></button>
                          <button onClick={() => handleDelete(exp._id)} disabled={deleting === exp._id} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                            {deleting === exp._id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Paiements partiels ── */}
      <PaymentModal
        invoice={payModal} onAdd={addPayment} onRemove={removePayment}
        onClose={() => setPayModal(null)} saving={saving} regPay={regPay} handlePay={handlePay}
      />

      {/* ── Envoi email ── */}
      <Modal open={!!emailModal} onClose={() => setEmailModal(null)} title={`Envoyer — ${emailModal?.number || ''}`} size="md">
        <form onSubmit={handleEmail(sendEmail)} className="space-y-4">
          {(() => {
            const inp2 = inp
            return (<>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Destinataire</label>
                <input {...regEmail('to', { required: true })} type="email" className={inp2} placeholder="client@email.com"/></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Objet</label>
                <input {...regEmail('subject')} className={inp2}/></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Message (optionnel)</label>
                <textarea {...regEmail('message')} rows={3} className={`${inp2} resize-none`} placeholder="Veuillez trouver ci-joint votre facture…"/></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEmailModal(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300">Annuler</button>
                <button type="submit" disabled={sendingEmail} className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                  {sendingEmail ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>} Envoyer
                </button>
              </div>
            </>)
          })()}
        </form>
      </Modal>

      {/* ── Créer / Modifier ── */}
      <Modal open={modal} onClose={close}
        title={tab === 'invoices' ? (editing ? 'Modifier la facture' : 'Nouvelle facture') : (editing ? 'Modifier la dépense' : 'Nouvelle dépense')}
        size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {tab === 'invoices' ? (
            <>
              {/* Ligne 1 : Type, Client, Projet */}
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Type de facture">
                  <select {...register('invoiceType')} className={inp}>
                    {INVOICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Client *">
                  <select {...register('client', { required: true })} className={inp}>
                    <option value="">Sélectionner…</option>
                    {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Projet"><input {...register('project')} className={inp} placeholder="Tour Horizon – Phase 2"/></Field>
              </div>

              {/* Ligne 2 : Réf devis, Conditions, Statut */}
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Référence devis"><input {...register('quoteRef')} className={inp} placeholder="DEV-2026-001"/></Field>
                <Field label="Conditions de paiement">
                  <select {...register('paymentTerms')} className={inp}>
                    {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Statut">
                  <select {...register('status')} className={inp}>
                    {Object.entries(INVOICE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </Field>
              </div>

              {/* Ligne 3 : Dates */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Date de facturation"><input {...register('date')} type="date" className={inp}/></Field>
                <Field label="Date d'échéance"><input {...register('dueDate')} type="date" className={inp}/></Field>
              </div>

              {/* ── Lignes de facturation ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Lignes de facturation</label>
                  <button type="button" onClick={addLine}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    <Plus size={13}/> Ajouter une ligne
                  </button>
                </div>
                <div className="border border-slate-200 dark:border-navy-600 rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-xs min-w-[460px]">
                    <thead className="bg-slate-50 dark:bg-navy-800">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500 w-[40%]">Description</th>
                        <th className="text-center px-2 py-2 font-semibold text-slate-500 w-[10%]">Qté</th>
                        <th className="text-center px-2 py-2 font-semibold text-slate-500 w-[12%]">Unité</th>
                        <th className="text-right px-2 py-2 font-semibold text-slate-500 w-[18%]">Prix unitaire (MAD)</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-500 w-[16%]">Total HT</th>
                        <th className="w-[4%]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                      {lines.map((line, i) => {
                        const lineTotal = (parseFloat(line.qty) || 0) * (parseFloat(line.unitPrice) || 0)
                        return (
                          <tr key={i} className="bg-white dark:bg-navy-900">
                            <td className="px-2 py-1.5">
                              <input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)}
                                className={inpSm} placeholder="Description des travaux…"/>
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
                            <td className="px-3 py-1.5 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap">
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

              {/* ── Remise, TVA, Retenue + Récapitulatif ── */}
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Paramètres financiers */}
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Remise (%)">
                      <input {...register('discount', { valueAsNumber: true })} type="number" min="0" max="100" step="0.1" className={inp} defaultValue={0}/>
                    </Field>
                    <Field label="TVA (%)">
                      <input {...register('tax', { valueAsNumber: true })} type="number" min="0" max="100" className={inp} defaultValue={20}/>
                    </Field>
                    <Field label="Retenue (%)">
                      <input {...register('retention', { valueAsNumber: true })} type="number" min="0" max="100" step="0.1" className={inp} defaultValue={0} title="Retenue de garantie"/>
                    </Field>
                  </div>
                  <Field label="Notes / Observations">
                    <textarea {...register('notes')} rows={3} className={`${inp} resize-none`} placeholder="Travaux conformes au CCTP…"/>
                  </Field>
                </div>

                {/* Récapitulatif live */}
                <div className="bg-slate-50 dark:bg-navy-800 rounded-xl p-4 space-y-2 text-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Récapitulatif</p>
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
                  <div className="flex justify-between text-slate-900 dark:text-white font-bold border-t border-slate-200 dark:border-navy-600 pt-2">
                    <span>Total TTC</span>
                    <span>{fmt(ttc)} MAD</span>
                  </div>
                  {watchRetention > 0 && (
                    <>
                      <div className="flex justify-between text-red-600">
                        <span>Retenue de garantie ({watchRetention}%)</span>
                        <span className="font-semibold">− {fmt(retentionAmt)} MAD</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold border-t border-slate-200 dark:border-navy-600 pt-2">
                        <span>Net à payer</span>
                        <span>{fmt(netToPay)} MAD</span>
                      </div>
                    </>
                  )}
                  {watchRetention > 0 && (
                    <p className="text-[10px] text-orange-500 flex items-center gap-1 pt-1">
                      <AlertTriangle size={10}/> Retenue de garantie BTP — libérée à la réception définitive
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* ── Formulaire dépense ── */
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Catégorie *">
                  <select {...register('category', { required: true })} className={inp}>
                    <option value="">Choisir…</option>
                    {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Mode de paiement">
                  <select {...register('paymentMethod')} className={inp}>
                    {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Description *"><input {...register('description', { required: true })} className={inp} placeholder="Ciment et ferraille chantier…"/></Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Montant (MAD) *"><input {...register('amount', { required: true, valueAsNumber: true })} type="number" className={inp} placeholder="0"/></Field>
                <Field label="Date"><input {...register('date')} type="date" className={inp}/></Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Projet concerné"><input {...register('project')} className={inp} placeholder="Tour Horizon"/></Field>
                <Field label="Fournisseur"><input {...register('supplier')} className={inp} placeholder="Lafarge Holcim MA"/></Field>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-navy-700">
            <button type="button" onClick={close} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">Annuler</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin"/>}
              <FileText size={14}/>
              {editing ? 'Enregistrer' : 'Créer la facture'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function EmptyState({ label }) {
  return <div className="text-center py-16 text-slate-400"><DollarSign size={32} className="mx-auto mb-3 opacity-30"/><p className="text-sm">{label}</p></div>
}

function PaymentModal({ invoice, onAdd, onRemove, onClose, saving, regPay, handlePay }) {
  const fmt = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)
  const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
  const METHODS = { cash: 'Espèces', virement: 'Virement', cheque: 'Chèque', carte: 'Carte' }
  if (!invoice) return null
  const base      = invoice.netToPay || invoice.totalWithTax || 0
  const remaining = base - (invoice.amountPaid || 0)
  return (
    <Modal open={!!invoice} onClose={onClose} title={`Paiements — ${invoice.number}`} size="md">
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-slate-50 dark:bg-navy-800 rounded-xl p-3 flex-wrap gap-2">
          <div className="text-sm"><span className="text-slate-500">Net à payer : </span><span className="font-bold text-slate-900 dark:text-white">{fmt(base)} MAD</span></div>
          <div className="text-sm"><span className="text-slate-500">Payé : </span><span className="font-bold text-emerald-600">{fmt(invoice.amountPaid)} MAD</span></div>
          <div className="text-sm"><span className="text-slate-500">Reste : </span><span className={`font-bold ${remaining > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{fmt(remaining)} MAD</span></div>
        </div>

        {invoice.payments?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Paiements enregistrés</p>
            {invoice.payments.map(p => (
              <div key={p._id} className="flex items-center gap-3 bg-slate-50 dark:bg-navy-800 rounded-xl px-3 py-2.5">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{fmt(p.amount)} MAD</p>
                  <p className="text-xs text-slate-400">{METHODS[p.method] || p.method} · {new Date(p.date).toLocaleDateString('fr-FR')}{p.reference ? ` · Réf: ${p.reference}` : ''}</p>
                </div>
                <button onClick={() => onRemove(invoice._id, p._id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors"><X size={13}/></button>
              </div>
            ))}
          </div>
        )}

        {remaining > 0 && (
          <form onSubmit={handlePay(onAdd)} className="space-y-3 border-t border-slate-100 dark:border-navy-700 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ajouter un paiement</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-slate-500 mb-1">Montant (MAD)</label>
                <input {...regPay('amount', { required: true, valueAsNumber: true })} type="number" defaultValue={remaining} min="0" className={inp}/></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1">Mode</label>
                <select {...regPay('method')} className={inp}>{Object.entries(METHODS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-slate-500 mb-1">Date</label>
                <input {...regPay('date')} type="date" className={inp}/></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1">Référence</label>
                <input {...regPay('reference')} className={inp} placeholder="N° virement…"/></div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300">Fermer</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                {saving && <Loader2 size={13} className="animate-spin"/>}<CreditCard size={13}/> Enregistrer
              </button>
            </div>
          </form>
        )}
        {remaining <= 0 && <p className="text-center text-sm text-emerald-600 font-semibold py-2">✓ Facture entièrement payée</p>}
      </div>
    </Modal>
  )
}
