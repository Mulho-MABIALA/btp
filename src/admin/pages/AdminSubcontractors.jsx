import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2, HardHat, Plus, Pencil, Trash2, Search, Star, Phone, Mail, DollarSign, Wallet, AlertCircle, CreditCard, X } from 'lucide-react'
import { adminSubcontractors } from '../adminApi'
import Modal from '../components/Modal'
import { exportCsv } from '../utils/exportCsv'

const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>{children}</div>
const fmt = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)

function StarRating({ value }) {
  return <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} size={11} className={i <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-navy-700'}/>)}</div>
}

export default function AdminSubcontractors() {
  const [data, setData]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(null)
  const [search, setSearch]       = useState('')
  const [payModal, setPayModal]   = useState(null) // subcontractor object for payments
  const [payLoading, setPayLoading] = useState(false)
  const [deletingPay, setDeletingPay] = useState(null)
  const { register, handleSubmit, reset } = useForm()
  const { register: regPay, handleSubmit: hsPay, reset: resetPay } = useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminSubcontractors.getAll(); setData(r.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd  = () => { setEditing(null); reset({ rating: 3, status: 'Actif' }); setModal(true) }
  const openEdit = s  => { setEditing(s); reset(s); setModal(true) }
  const close    = () => { setModal(false); setEditing(null) }

  const onSubmit = async (v) => {
    setSaving(true)
    try {
      if (editing) await adminSubcontractors.update(editing._id, { ...v, rating: Number(v.rating) })
      else         await adminSubcontractors.create({ ...v, rating: Number(v.rating) })
      await load(); close()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce sous-traitant ?')) return
    setDeleting(id)
    try { await adminSubcontractors.delete(id); await load() } finally { setDeleting(null) }
  }

  const openPayModal = (s) => {
    setPayModal(data.find(d => d._id === s._id) || s)
    resetPay({ date: new Date().toISOString().split('T')[0] })
  }

  const onAddPayment = async (v) => {
    setPayLoading(true)
    try {
      const r = await adminSubcontractors.addPayment(payModal._id, { ...v, amount: Number(v.amount) })
      // Update local state
      const updated = r.data
      setData(prev => prev.map(s => s._id === updated._id ? updated : s))
      setPayModal(updated)
      resetPay({ date: new Date().toISOString().split('T')[0] })
    } catch(e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setPayLoading(false) }
  }

  const deletePayment = async (pid) => {
    if (!window.confirm('Supprimer ce versement ?')) return
    setDeletingPay(pid)
    try {
      const r = await adminSubcontractors.deletePayment(payModal._id, pid)
      const updated = r.data
      setData(prev => prev.map(s => s._id === updated._id ? updated : s))
      setPayModal(updated)
    } catch(e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setDeletingPay(null) }
  }

  const filtered = data.filter(s => !search || [s.name, s.contact, s.specialty, s.city].some(v => v?.toLowerCase().includes(search.toLowerCase())))

  const doExport = () => exportCsv('sous-traitants.csv', data.map(s => ({
    Nom: s.name, Contact: s.contact, Email: s.email, Tél: s.phone, Ville: s.city,
    Spécialité: s.specialty, Statut: s.status, Note: s.rating,
    'Projet actuel': s.currentProject, 'Montant contrat': s.contractAmount, 'Payé': s.paidAmount,
    'Reste': (s.contractAmount || 0) - (s.paidAmount || 0),
  })))

  // KPIs
  const totalEngaged   = data.reduce((s, d) => s + (d.contractAmount || 0), 0)
  const totalPaid      = data.reduce((s, d) => s + (d.paidAmount || 0), 0)
  const totalRemaining = totalEngaged - totalPaid
  const overdueCount   = data.filter(s => {
    const rem = (s.contractAmount || 0) - (s.paidAmount || 0)
    return s.status === 'Actif' && rem < 0
  }).length

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Sous-traitants</h1>
            <p className="text-slate-500 text-sm mt-1">{data.filter(s=>s.status==='Actif').length} actifs · {data.length} total</p>
          </div>
          <div className="flex gap-2">
            <button onClick={doExport} className="px-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">↓ CSV</button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors"><Plus size={15}/> Nouveau</button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-2 mb-1"><DollarSign size={15} className="text-blue-500"/><span className="text-xs text-slate-500">Engagé total</span></div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{fmt(totalEngaged)}</div>
            <div className="text-xs text-slate-400">MAD</div>
          </div>
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-2 mb-1"><Wallet size={15} className="text-emerald-500"/><span className="text-xs text-slate-500">Payé</span></div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{fmt(totalPaid)}</div>
            <div className="text-xs text-slate-400">MAD</div>
          </div>
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-2 mb-1"><CreditCard size={15} className="text-orange-500"/><span className="text-xs text-slate-500">Reste à payer</span></div>
            <div className="text-xl font-black text-orange-500">{fmt(totalRemaining)}</div>
            <div className="text-xs text-slate-400">MAD</div>
          </div>
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-2 mb-1"><HardHat size={15} className="text-slate-400"/><span className="text-xs text-slate-500">Actifs</span></div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{data.filter(s=>s.status==='Actif').length}</div>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"/>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          {loading ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
          : filtered.length === 0 ? <div className="text-center py-16 text-slate-400"><HardHat size={32} className="mx-auto mb-3 opacity-30"/><p className="text-sm">Aucun sous-traitant</p></div>
          : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[780px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-navy-700">
                  {['Sous-traitant', 'Spécialité', 'Contact', 'Projet actuel', 'Contrat', 'Payé / Reste', 'Note', 'Statut', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
                {filtered.map(s => {
                  const remaining = (s.contractAmount || 0) - (s.paidAmount || 0)
                  const paidPct   = s.contractAmount > 0 ? Math.round(s.paidAmount / s.contractAmount * 100) : 0
                  return (
                    <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-orange-100 dark:bg-orange-500/10 rounded-xl flex items-center justify-center shrink-0">
                            <HardHat size={16} className="text-orange-500"/>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{s.name}</p>
                            {s.city && <p className="text-xs text-slate-400">{s.city}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">{s.specialty || '—'}</td>
                      <td className="px-4 py-3.5">
                        {s.contact && <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{s.contact}</p>}
                        {s.email && <p className="text-xs text-slate-400 flex items-center gap-1"><Mail size={9}/>{s.email}</p>}
                        {s.phone && <p className="text-xs text-slate-400 flex items-center gap-1"><Phone size={9}/>{s.phone}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 max-w-[100px] truncate">{s.currentProject || '—'}</td>
                      <td className="px-4 py-3.5">
                        {s.contractAmount > 0 ? (
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white text-xs">{fmt(s.contractAmount)} MAD</p>
                            <div className="h-1.5 bg-slate-100 dark:bg-navy-700 rounded-full mt-1 overflow-hidden w-20">
                              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100,paidPct)}%` }}/>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">{paidPct}%</p>
                          </div>
                        ) : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{fmt(s.paidAmount)} MAD</p>
                        {remaining > 0 && <p className="text-[10px] text-orange-500">Reste : {fmt(remaining)}</p>}
                        {remaining < 0 && <p className="text-[10px] text-red-500 flex items-center gap-0.5"><AlertCircle size={9}/>Dépassé</p>}
                        {s.payments?.length > 0 && <p className="text-[10px] text-slate-400">{s.payments.length} versement{s.payments.length>1?'s':''}</p>}
                      </td>
                      <td className="px-4 py-3.5"><StarRating value={s.rating || 3}/></td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status==='Actif' ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400'}`}>{s.status}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openPayModal(s)} title="Versements" className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"><CreditCard size={14}/></button>
                          <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Pencil size={14}/></button>
                          <button onClick={() => handleDelete(s._id)} disabled={deleting === s._id} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                            {deleting === s._id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit/Create modal */}
      <Modal open={modal} onClose={close} title={editing ? 'Modifier le sous-traitant' : 'Nouveau sous-traitant'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nom *"><input {...register('name', { required: true })} className={inp} placeholder="Élec Pro SARL"/></Field>
            <Field label="Spécialité"><input {...register('specialty')} className={inp} placeholder="Électricité BT/MT"/></Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Contact"><input {...register('contact')} className={inp} placeholder="M. Karim"/></Field>
            <Field label="Email"><input {...register('email')} type="email" className={inp}/></Field>
            <Field label="Téléphone"><input {...register('phone')} className={inp} placeholder="+212 6XX XXX XXX"/></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Ville"><input {...register('city')} className={inp} placeholder="Casablanca"/></Field>
            <Field label="Projet actuel"><input {...register('currentProject')} className={inp} placeholder="Tour Horizon"/></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Montant contrat (MAD)"><input {...register('contractAmount', { valueAsNumber: true })} type="number" className={inp} placeholder="350000"/></Field>
            <Field label="Conditions paiement"><input {...register('paymentTerms')} className={inp} placeholder="30 jours fin de mois"/></Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Note (1-5)">
              <select {...register('rating')} className={inp}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} étoile{n>1?'s':''}</option>)}</select>
            </Field>
            <Field label="Statut">
              <select {...register('status')} className={inp}><option>Actif</option><option>Inactif</option></select>
            </Field>
            <Field label="ICE"><input {...register('ice')} className={inp}/></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="RC"><input {...register('rc')} className={inp}/></Field>
            <Field label="Notes"><input {...register('notes')} className={inp}/></Field>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">Annuler</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin"/>}{editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment installments modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Versements — ${payModal?.name || ''}`} size="md">
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-navy-800 rounded-xl text-center">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Contrat</p>
              <p className="font-black text-slate-900 dark:text-white text-sm">{fmt(payModal?.contractAmount)} MAD</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/5 rounded-xl text-center">
              <p className="text-[10px] text-emerald-600 uppercase font-semibold">Payé</p>
              <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{fmt(payModal?.paidAmount)} MAD</p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-500/5 rounded-xl text-center">
              <p className="text-[10px] text-orange-600 uppercase font-semibold">Reste</p>
              <p className="font-black text-orange-500 text-sm">{fmt((payModal?.contractAmount || 0) - (payModal?.paidAmount || 0))} MAD</p>
            </div>
          </div>

          {/* Progress bar */}
          {payModal?.contractAmount > 0 && (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progression</span>
                <span className="font-semibold">{Math.round((payModal.paidAmount || 0) / payModal.contractAmount * 100)}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, Math.round((payModal?.paidAmount || 0) / payModal.contractAmount * 100))}%` }}/>
              </div>
            </div>
          )}

          {/* Payment history */}
          {payModal?.payments?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Historique des versements</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[...payModal.payments].reverse().map((p) => (
                  <div key={p._id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-navy-800 rounded-xl">
                    <div>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">{fmt(p.amount)} MAD</p>
                      {p.reference && <p className="text-xs text-slate-500">Réf : {p.reference}</p>}
                      {p.notes && <p className="text-xs text-slate-400 italic">{p.notes}</p>}
                      <p className="text-[10px] text-slate-400">{new Date(p.date).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <button onClick={() => deletePayment(p._id)} disabled={deletingPay === p._id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                      {deletingPay === p._id ? <Loader2 size={13} className="animate-spin"/> : <X size={13}/>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add payment form */}
          <div className="border-t border-slate-100 dark:border-navy-700 pt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Ajouter un versement</p>
            <form onSubmit={hsPay(onAddPayment)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Montant (MAD) *"><input {...regPay('amount', { required: true, min: 1 })} type="number" min="1" className={inp} placeholder="50000"/></Field>
                <Field label="Date *"><input {...regPay('date', { required: true })} type="date" className={inp}/></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Référence"><input {...regPay('reference')} className={inp} placeholder="VIR-2026-001"/></Field>
                <Field label="Notes"><input {...regPay('notes')} className={inp} placeholder="Acompte phase 2"/></Field>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={payLoading} className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                  {payLoading && <Loader2 size={14} className="animate-spin"/>}<Plus size={14}/>Ajouter le versement
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </>
  )
}
