import { useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { Loader2, ShoppingCart, Plus, Pencil, Trash2, CheckCircle, X, Download, Mail, Package } from 'lucide-react'
import { adminPurchaseOrders, adminSuppliers } from '../adminApi'
import { generatePurchaseOrderPDF } from '../utils/generatePurchaseOrderPDF'
import Modal from '../components/Modal'

const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>{children}</div>

const fmt = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)

const STATUS = {
  draft:     { label: 'Brouillon',  cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400' },
  sent:      { label: 'Envoyé',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  partial:   { label: 'Partiel',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  received:  { label: 'Reçu',       cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' },
  cancelled: { label: 'Annulé',     cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
}

export default function AdminPurchaseOrders() {
  const [data, setData]           = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(null)
  const [emailModal, setEmailModal] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)

  const { register, handleSubmit, reset, control, watch } = useForm({
    defaultValues: { items: [{ description: '', quantity: 1, unit: 'pièce', unitPrice: 0 }] }
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchItems = watch('items') || []
  const total = watchItems.reduce((s, it) => s + (Number(it.quantity || 0) * Number(it.unitPrice || 0)), 0)

  const { register: regEmail, handleSubmit: hsEmail, reset: resetEmail } = useForm()

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [poR, supR] = await Promise.all([adminPurchaseOrders.getAll(), adminSuppliers.getAll()])
      setData(poR.data); setSuppliers(supR.data)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { loadAll() }, [loadAll])

  const openAdd  = () => { setEditing(null); reset({ status: 'draft', items: [{ description: '', quantity: 1, unit: 'pièce', unitPrice: 0 }] }); setModal(true) }
  const openEdit = po => {
    setEditing(po)
    reset({ ...po, supplier: po.supplier?._id, orderDate: po.orderDate?.split?.('T')[0], deliveryDate: po.deliveryDate?.split?.('T')[0] })
    setModal(true)
  }
  const close = () => { setModal(false); setEditing(null) }

  const onSubmit = async (v) => {
    setSaving(true)
    const items = v.items?.map(it => ({ ...it, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), total: Number(it.quantity) * Number(it.unitPrice) })) || []
    const payload = { ...v, items, total: items.reduce((s, it) => s + it.total, 0) }
    try {
      if (editing) await adminPurchaseOrders.update(editing._id, payload)
      else         await adminPurchaseOrders.create(payload)
      await loadAll(); close()
    } finally { setSaving(false) }
  }

  const updateStatus = async (id, status) => { await adminPurchaseOrders.updateStatus(id, status); await loadAll() }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce bon de commande ?')) return
    setDeleting(id)
    try { await adminPurchaseOrders.delete(id); await loadAll() } finally { setDeleting(null) }
  }

  const openEmailModal = (po) => {
    setEmailModal(po)
    resetEmail({ to: po.supplier?.email || '', subject: `Bon de commande ${po.number}` })
  }

  const onSendEmail = async (v) => {
    setSendingEmail(true)
    try {
      await adminPurchaseOrders.sendEmail(emailModal._id, v)
      alert('Email envoyé avec succès !')
      setEmailModal(null)
      await loadAll()
    } catch(e) {
      alert(e.response?.data?.error || 'Erreur envoi email')
    } finally { setSendingEmail(false) }
  }

  // KPIs
  const totalAmount    = data.reduce((s, po) => s + (po.total || 0), 0)
  const draftCount     = data.filter(p => p.status === 'draft').length
  const pendingCount   = data.filter(p => ['sent','partial'].includes(p.status)).length

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Bons de commande</h1>
            <p className="text-slate-500 text-sm mt-1">{data.length} bons de commande</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors">
            <Plus size={15}/> Nouveau bon
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-2 mb-1"><ShoppingCart size={15} className="text-blue-500"/><span className="text-xs text-slate-500">Total</span></div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{data.length}</div>
          </div>
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-2 mb-1"><Package size={15} className="text-emerald-500"/><span className="text-xs text-slate-500">Montant total</span></div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{fmt(totalAmount)}</div>
            <div className="text-xs text-slate-400">MAD HT</div>
          </div>
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-2 mb-1"><Loader2 size={15} className="text-amber-500"/><span className="text-xs text-slate-500">En attente</span></div>
            <div className="text-2xl font-black text-amber-500">{pendingCount}</div>
          </div>
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-2 mb-1"><CheckCircle size={15} className="text-green-500"/><span className="text-xs text-slate-500">Reçus</span></div>
            <div className="text-2xl font-black text-green-500">{data.filter(p => p.status === 'received').length}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          {loading ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
          : data.length === 0 ? <div className="text-center py-16 text-slate-400"><ShoppingCart size={32} className="mx-auto mb-3 opacity-30"/><p className="text-sm">Aucun bon de commande</p></div>
          : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-navy-700">
                  {['N° BC', 'Fournisseur', 'Projet', 'Total', 'Statut', 'Date commande', 'Livraison', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
                {data.map(po => {
                  const s = STATUS[po.status] || STATUS.draft
                  const today = new Date(); today.setHours(0,0,0,0)
                  const isOverdue = po.deliveryDate && new Date(po.deliveryDate) < today && !['received','cancelled'].includes(po.status)
                  return (
                    <tr key={po._id} className="hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{po.number}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">{po.supplier?.name || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 max-w-[100px] truncate">{po.project || '—'}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">{fmt(po.total)} MAD</td>
                      <td className="px-4 py-3.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${s.cls}`}>{s.label}</span></td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{po.orderDate ? new Date(po.orderDate).toLocaleDateString('fr-FR') : '—'}</td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className={isOverdue ? 'text-red-500 font-semibold' : 'text-slate-500'}>
                          {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('fr-FR') : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          {po.status === 'sent' && (
                            <>
                              <button onClick={() => updateStatus(po._id, 'partial')} title="Réception partielle" className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors text-xs font-bold">½</button>
                              <button onClick={() => updateStatus(po._id, 'received')} title="Marquer reçu" className="p-1.5 rounded-lg text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"><CheckCircle size={14}/></button>
                            </>
                          )}
                          {po.status === 'partial' && (
                            <button onClick={() => updateStatus(po._id, 'received')} title="Réception complète" className="p-1.5 rounded-lg text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"><CheckCircle size={14}/></button>
                          )}
                          <button onClick={() => generatePurchaseOrderPDF(po)} title="Télécharger PDF" className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"><Download size={14}/></button>
                          <button onClick={() => openEmailModal(po)} title="Envoyer par email" className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors"><Mail size={14}/></button>
                          <button onClick={() => openEdit(po)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Pencil size={14}/></button>
                          <button onClick={() => handleDelete(po._id)} disabled={deleting===po._id} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                            {deleting===po._id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
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

      {/* Form modal */}
      <Modal open={modal} onClose={close} title={editing ? 'Modifier le bon de commande' : 'Nouveau bon de commande'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Fournisseur *">
              <select {...register('supplier', { required: true })} className={inp}>
                <option value="">Sélectionner…</option>
                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Projet"><input {...register('project')} className={inp} placeholder="Tour Horizon"/></Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Statut">
              <select {...register('status')} className={inp}>
                {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Date de commande"><input {...register('orderDate')} type="date" className={inp}/></Field>
            <Field label="Date de livraison prévue"><input {...register('deliveryDate')} type="date" className={inp}/></Field>
          </div>

          {/* Articles */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Articles</label>
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                  <input {...register(`items.${i}.description`)} placeholder="Description" className={`${inp} col-span-4`}/>
                  <input {...register(`items.${i}.quantity`, { valueAsNumber: true })} type="number" min="0" placeholder="Qté" className={`${inp} col-span-2`}/>
                  <input {...register(`items.${i}.unit`)} placeholder="Unité" className={`${inp} col-span-2`}/>
                  <input {...register(`items.${i}.unitPrice`, { valueAsNumber: true })} type="number" min="0" placeholder="PU (MAD)" className={`${inp} col-span-3`}/>
                  <button type="button" onClick={() => remove(i)} className="p-2 text-slate-400 hover:text-red-500 transition-colors col-span-1"><X size={14}/></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => append({ description: '', quantity: 1, unit: 'pièce', unitPrice: 0 })}
              className="mt-2 text-xs text-blue-500 hover:text-blue-600 font-semibold flex items-center gap-1">
              <Plus size={12}/> Ajouter une ligne
            </button>
            {total > 0 && (
              <div className="mt-3 text-right text-sm font-bold text-slate-900 dark:text-white">
                Total : <span className="text-blue-500">{fmt(total)} MAD</span>
              </div>
            )}
          </div>

          <Field label="Notes"><textarea {...register('notes')} rows={2} className={`${inp} resize-none`} placeholder="Instructions de livraison…"/></Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">Annuler</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin"/>}{editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Email modal */}
      <Modal open={!!emailModal} onClose={() => setEmailModal(null)} title={`Envoyer le BC ${emailModal?.number}`} size="sm">
        <form onSubmit={hsEmail(onSendEmail)} className="space-y-4">
          {!emailModal?.supplier?.email && (
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
              ⚠ Ce fournisseur n'a pas d'email enregistré.
            </div>
          )}
          <Field label="Destinataire *"><input {...regEmail('to', { required: true })} type="email" className={inp} placeholder="fournisseur@email.com"/></Field>
          <Field label="Objet"><input {...regEmail('subject')} className={inp}/></Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEmailModal(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">Annuler</button>
            <button type="submit" disabled={sendingEmail} className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {sendingEmail && <Loader2 size={14} className="animate-spin"/>}<Mail size={14}/>Envoyer
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
