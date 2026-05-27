import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import {
  Loader2, Truck, Plus, Pencil, Trash2, Search, Star,
  Phone, Mail, MapPin, X, ShoppingCart, Package,
  Calendar, CreditCard, Tag, FileText, Download
} from 'lucide-react'
import { adminSuppliers, adminPurchaseOrders } from '../adminApi'
import Modal from '../components/Modal'

const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => (
  <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>{children}</div>
)

const CAT_OPTIONS = ['Béton & Granulats','Ferraille & Métaux','Revêtements & Carrelage','Peinture & Enduits','Menuiserie & Bois','Électricité','Plomberie & Sanitaire','Équipements & Machines','Transport & Logistique','Sous-traitance','Bureau & Fournitures']

const PO_STATUS = {
  draft:     { label: 'Brouillon',  cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400' },
  sent:      { label: 'Envoyé',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  partial:   { label: 'Partiel',    cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400' },
  received:  { label: 'Reçu',       cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' },
  cancelled: { label: 'Annulé',     cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
}

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0)
  if (onChange) {
    return (
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(i => (
          <button key={i} type="button" onClick={() => onChange(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}>
            <Star size={16} className={i <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-navy-700'}/>
          </button>
        ))}
      </div>
    )
  }
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => <Star key={i} size={12} className={i <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-navy-700'}/>)}
    </div>
  )
}

function exportCsv(data) {
  const header = ['Nom','Contact','Email','Téléphone','Ville','Spécialités','ICE','Paiement','Note','Statut','Notes']
  const rows = data.map(s => [
    s.name, s.contact || '', s.email || '', s.phone || '', s.city || '',
    (s.categories || []).join(' | '), s.ice || '', s.paymentTerms || '',
    s.rating || '', s.status || '', s.notes || ''
  ])
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'fournisseurs.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminSuppliers() {
  const [data, setData]           = useState([])
  const [pos, setPos]             = useState([])          // purchase orders
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState(null)
  const [selected, setSelected]   = useState(null)
  const [activeTab, setActiveTab] = useState('infos')    // 'infos' | 'orders'
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(null)
  const [search, setSearch]       = useState('')
  const [ratingInput, setRatingInput] = useState(3)
  const { register, handleSubmit, reset, setValue } = useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sR, poR] = await Promise.all([adminSuppliers.getAll(), adminPurchaseOrders.getAll()])
      setData(sR.data)
      setPos(poR.data)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  // Refresh selected when data reloads
  useEffect(() => {
    if (selected) setSelected(data.find(s => s._id === selected._id) || null)
  }, [data])

  const openAdd = () => {
    setEditing(null); setRatingInput(3)
    reset({ status: 'Actif', paymentTerms: '30 jours' })
    setModal(true)
  }
  const openEdit = s => {
    setEditing(s); setRatingInput(s.rating || 3)
    reset({ ...s, categories: s.categories?.join(', ') })
    setModal(true)
  }
  const close = () => { setModal(false); setEditing(null) }

  const onSubmit = async (v) => {
    setSaving(true)
    const payload = { ...v, rating: ratingInput, categories: v.categories ? v.categories.split(',').map(c => c.trim()).filter(Boolean) : [] }
    try {
      if (editing) await adminSuppliers.update(editing._id, payload)
      else         await adminSuppliers.create(payload)
      await load(); close()
    } finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!window.confirm('Supprimer ce fournisseur ?')) return
    setDeleting(id)
    try { await adminSuppliers.delete(id); if (selected?._id === id) setSelected(null); await load() } finally { setDeleting(null) }
  }

  const filtered = data.filter(s => !search || [s.name, s.contact, s.city, s.categories?.join(' ')].some(v => v?.toLowerCase().includes(search.toLowerCase())))

  // POs for selected supplier
  const supplierPos = selected ? pos.filter(p => {
    if (!p.supplier) return false
    const sid = typeof p.supplier === 'object' ? p.supplier._id : p.supplier
    return sid === selected._id
  }) : []
  const poTotal = supplierPos.reduce((s, p) => s + (p.totalAmount || 0), 0)

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Fournisseurs</h1>
            <p className="text-slate-500 text-sm mt-1">{data.filter(s => s.status === 'Actif').length} actifs · {data.length} total</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
                className="pl-9 pr-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white w-48"/>
            </div>
            <button onClick={() => exportCsv(filtered)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800 font-medium transition-colors">
              <Download size={14}/> CSV
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors">
              <Plus size={15}/> Nouveau fournisseur
            </button>
          </div>
        </div>

        <div className={`grid gap-5 ${selected ? 'lg:grid-cols-5' : ''}`}>
          {/* ── Table ─────────────────────────────────────────── */}
          <div className={`bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden ${selected ? 'lg:col-span-3' : ''}`}>
            {loading ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
            : filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Truck size={32} className="mx-auto mb-3 opacity-30"/>
                <p className="text-sm">{search ? 'Aucun résultat' : 'Aucun fournisseur'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-navy-700">
                    {['Fournisseur', 'Contact', selected ? '' : 'Spécialités', selected ? '' : 'Paiement', 'Note', 'Statut', ''].filter(Boolean).map(h => (
                      <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
                  {filtered.map(s => (
                    <tr key={s._id}
                      onClick={() => { setSelected(s._id === selected?._id ? null : s); setActiveTab('infos') }}
                      className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors ${selected?._id === s._id ? 'bg-blue-50 dark:bg-blue-500/5' : ''}`}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-sky-100 dark:bg-sky-500/10 rounded-xl flex items-center justify-center shrink-0">
                            <Truck size={16} className="text-sky-500"/>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{s.name}</p>
                            {s.city && <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={9}/>{s.city}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          {s.contact && <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{s.contact}</p>}
                          {s.phone && <p className="text-xs text-slate-400 flex items-center gap-1"><Phone size={9}/>{s.phone}</p>}
                        </div>
                      </td>
                      {!selected && (
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {(s.categories || []).slice(0, 2).map(c => (
                              <span key={c} className="text-[9px] font-semibold bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400 px-1.5 py-0.5 rounded-full">{c}</span>
                            ))}
                            {s.categories?.length > 2 && <span className="text-[9px] text-slate-400">+{s.categories.length - 2}</span>}
                          </div>
                        </td>
                      )}
                      {!selected && <td className="px-4 py-3.5 text-xs text-slate-500">{s.paymentTerms || '—'}</td>}
                      <td className="px-4 py-3.5"><StarRating value={s.rating || 3}/></td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === 'Actif' ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400'}`}>{s.status}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Pencil size={14}/></button>
                          <button onClick={() => handleDelete(s._id)} disabled={deleting === s._id} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                            {deleting === s._id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>

          {/* ── Detail Panel ──────────────────────────────────── */}
          {selected && (
            <div className="lg:col-span-2 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden flex flex-col">
              {/* Panel header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-navy-700 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 bg-sky-100 dark:bg-sky-500/10 rounded-lg flex items-center justify-center">
                      <Truck size={14} className="text-sky-500"/>
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white text-sm leading-tight">{selected.name}</p>
                      {selected.city && <p className="text-xs text-slate-400">{selected.city}</p>}
                    </div>
                  </div>
                  <StarRating value={selected.rating || 3}/>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(selected)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Pencil size={13}/></button>
                  <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors"><X size={13}/></button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 dark:border-navy-700">
                {[
                  { key: 'infos', label: 'Informations' },
                  { key: 'orders', label: `Bons de commande${supplierPos.length > 0 ? ` (${supplierPos.length})` : ''}` },
                ].map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={`flex-1 text-xs font-semibold py-3 border-b-2 transition-colors ${activeTab === t.key ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Infos tab */}
              {activeTab === 'infos' && (
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Contact */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Contact</p>
                    <div className="space-y-2">
                      {selected.contact && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-slate-100 dark:bg-navy-700 rounded-lg flex items-center justify-center shrink-0"><FileText size={11} className="text-slate-400"/></div>
                          <span className="text-slate-700 dark:text-slate-200 font-medium">{selected.contact}</span>
                        </div>
                      )}
                      {selected.phone && (
                        <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-500 transition-colors">
                          <div className="w-6 h-6 bg-slate-100 dark:bg-navy-700 rounded-lg flex items-center justify-center shrink-0"><Phone size={11} className="text-slate-400"/></div>
                          {selected.phone}
                        </a>
                      )}
                      {selected.email && (
                        <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-500 transition-colors truncate">
                          <div className="w-6 h-6 bg-slate-100 dark:bg-navy-700 rounded-lg flex items-center justify-center shrink-0"><Mail size={11} className="text-slate-400"/></div>
                          <span className="truncate">{selected.email}</span>
                        </a>
                      )}
                      {selected.city && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <div className="w-6 h-6 bg-slate-100 dark:bg-navy-700 rounded-lg flex items-center justify-center shrink-0"><MapPin size={11} className="text-slate-400"/></div>
                          {selected.city}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Spécialités */}
                  {selected.categories?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Spécialités</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.categories.map(c => (
                          <span key={c} className="text-xs font-semibold bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Tag size={9}/>{c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conditions commerciales */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Conditions commerciales</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selected.paymentTerms && (
                        <div className="bg-slate-50 dark:bg-navy-800 rounded-xl px-3 py-2.5">
                          <p className="text-[10px] text-slate-400">Délai de paiement</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1 mt-0.5"><CreditCard size={11} className="text-slate-400"/>{selected.paymentTerms}</p>
                        </div>
                      )}
                      {selected.ice && (
                        <div className="bg-slate-50 dark:bg-navy-800 rounded-xl px-3 py-2.5">
                          <p className="text-[10px] text-slate-400">ICE</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5 font-mono text-xs">{selected.ice}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Statut */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Statut</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${selected.status === 'Actif' ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400'}`}>{selected.status}</span>
                  </div>

                  {/* Notes */}
                  {selected.notes && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Notes</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-navy-800 rounded-xl p-3 whitespace-pre-wrap">{selected.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Orders tab */}
              {activeTab === 'orders' && (
                <div className="flex-1 overflow-y-auto">
                  {/* Summary */}
                  {supplierPos.length > 0 && (
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-navy-700 flex items-center justify-between">
                      <span className="text-xs text-slate-500">{supplierPos.length} bon{supplierPos.length > 1 ? 's' : ''} de commande</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">{poTotal.toLocaleString('fr-MA')} MAD</span>
                    </div>
                  )}
                  {supplierPos.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <ShoppingCart size={28} className="mx-auto mb-2 opacity-30"/>
                      <p className="text-xs">Aucun bon de commande</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50 dark:divide-navy-800">
                      {supplierPos.map(po => {
                        const sc = PO_STATUS[po.status] || PO_STATUS.draft
                        return (
                          <div key={po._id} className="px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-navy-800/30 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{po.reference || `BC-${po._id.slice(-6).toUpperCase()}`}</p>
                                {po.project && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Package size={9}/>{po.project}</p>}
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Calendar size={9}/>{new Date(po.createdAt).toLocaleDateString('fr-FR')}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-black text-slate-900 dark:text-white">{(po.totalAmount || 0).toLocaleString('fr-MA')} <span className="text-xs font-normal text-slate-400">MAD</span></p>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                              </div>
                            </div>
                            {po.items?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {po.items.slice(0, 3).map((item, i) => (
                                  <span key={i} className="text-[10px] bg-slate-100 dark:bg-navy-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">{item.description || item.name}</span>
                                ))}
                                {po.items.length > 3 && <span className="text-[10px] text-slate-400">+{po.items.length - 3}</span>}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      <Modal open={modal} onClose={close} title={editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nom *"><input {...register('name', { required: true })} className={inp} placeholder="Lafarge Holcim MA"/></Field>
            <Field label="Personne contact"><input {...register('contact')} className={inp} placeholder="M. Rachid Benali"/></Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Email"><input {...register('email')} type="email" className={inp}/></Field>
            <Field label="Téléphone"><input {...register('phone')} className={inp} placeholder="+212 5XX XXX XXX"/></Field>
            <Field label="Ville"><input {...register('city')} className={inp} placeholder="Casablanca"/></Field>
          </div>
          <Field label="Spécialités (séparées par virgules)">
            <input {...register('categories')} className={inp} placeholder="Béton & Granulats, Ferraille & Métaux"/>
          </Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Délai de paiement"><input {...register('paymentTerms')} className={inp} placeholder="30 jours"/></Field>
            <Field label="Note">
              <div className="flex items-center gap-2 h-10">
                <StarRating value={ratingInput} onChange={v => setRatingInput(v)}/>
                <span className="text-sm text-slate-500">{ratingInput}/5</span>
              </div>
            </Field>
            <Field label="Statut">
              <select {...register('status')} className={inp}>
                <option value="Actif">Actif</option>
                <option value="Inactif">Inactif</option>
              </select>
            </Field>
          </div>
          <Field label="ICE"><input {...register('ice')} className={inp} placeholder="001234567890123"/></Field>
          <Field label="Notes"><textarea {...register('notes')} rows={2} className={`${inp} resize-none`} placeholder="Remarques, conditions particulières…"/></Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">Annuler</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin"/>}{editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
