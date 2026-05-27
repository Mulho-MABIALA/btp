import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2, Package, AlertTriangle, Plus, Pencil, Trash2, Search, TrendingDown, TrendingUp, ArrowRightLeft, History, X } from 'lucide-react'
import { adminMaterials } from '../adminApi'
import Modal from '../components/Modal'

const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>{children}</div>

const CATEGORIES = ['Béton', 'Ferraille', 'Revêtement', 'Peinture', 'Menuiserie', 'Électricité', 'Plomberie', 'Maçonnerie', 'Couverture', 'Autre']
const UNITS = ['sac', 'kg', 'm²', 'm³', 'm', 'litre', 'bidon', 'pièce', 'rouleau', 'palette']
const MOVEMENT_TYPES = ['Entrée', 'Sortie', 'Consommation', 'Transfert']

const fmt = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)

function StockBadge({ quantity, minStock }) {
  if (quantity <= 0)
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 uppercase">Épuisé</span>
  if (quantity <= minStock)
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400 uppercase flex items-center gap-1"><AlertTriangle size={9}/>Faible</span>
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400 uppercase">Normal</span>
}

const CAT_COLORS = { 'Béton': 'bg-stone-100 text-stone-700 dark:bg-stone-500/15 dark:text-stone-400', 'Ferraille': 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300', 'Revêtement': 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', 'Peinture': 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400', 'Menuiserie': 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400', 'Électricité': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400', 'Plomberie': 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400', 'Maçonnerie': 'bg-teal-100 text-teal-700', 'Couverture': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400', 'Autre': 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400' }

export default function AdminInventory() {
  const [data, setData]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(false)
  const [editing, setEditing]         = useState(null)
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState(null)
  const [search, setSearch]           = useState('')
  const [catFilter, setCatFilter]     = useState('all')
  const [movModal, setMovModal]       = useState(null) // material object
  const [histPanel, setHistPanel]     = useState(null) // material object
  const [movSaving, setMovSaving]     = useState(false)
  const { register, handleSubmit, reset } = useForm()
  const { register: regMov, handleSubmit: hsMov, reset: resetMov, watch: watchMov } = useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminMaterials.getAll(); setData(r.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd  = () => { setEditing(null); reset({ unit: 'pièce', minStock: 10 }); setModal(true) }
  const openEdit = m  => { setEditing(m); reset(m); setModal(true) }
  const close    = () => { setModal(false); setEditing(null) }

  const onSubmit = async (v) => {
    setSaving(true)
    try {
      if (editing) await adminMaterials.update(editing._id, v)
      else         await adminMaterials.create(v)
      await load(); close()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce matériau ?')) return
    setDeleting(id)
    try { await adminMaterials.delete(id); await load() } finally { setDeleting(null) }
  }

  const openMovement = (m) => {
    setMovModal(m)
    resetMov({ type: 'Entrée', qty: '', date: new Date().toISOString().split('T')[0] })
  }

  const onMovSubmit = async (v) => {
    setMovSaving(true)
    try {
      await adminMaterials.addMovement(movModal._id, { ...v, qty: Number(v.qty) })
      await load()
      setMovModal(null)
      // also refresh histPanel if open for same material
      if (histPanel?._id === movModal._id) {
        setHistPanel(data.find(m => m._id === movModal._id) || null)
      }
    } catch(e) {
      alert(e.response?.data?.error || 'Erreur')
    } finally { setMovSaving(false) }
  }

  // KPIs
  const lowCount   = data.filter(m => m.quantity > 0 && m.quantity <= m.minStock).length
  const outCount   = data.filter(m => m.quantity <= 0).length
  const totalValue = data.reduce((s, m) => s + (m.quantity * m.unitPrice), 0)

  const filtered = data
    .filter(m => catFilter === 'all' || m.category === catFilter || (catFilter === 'alert' && m.quantity <= m.minStock))
    .filter(m => !search || [m.name, m.category, m.supplier].some(v => v?.toLowerCase().includes(search.toLowerCase())))

  const movType = watchMov('type')
  const MOV_COLORS = { Entrée: 'text-green-600', Sortie: 'text-red-500', Consommation: 'text-orange-500', Transfert: 'text-blue-500' }

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Inventaire</h1>
            <p className="text-slate-500 text-sm mt-1">{data.length} références · Valeur totale : {fmt(totalValue)} MAD</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors">
            <Plus size={15}/> Ajouter
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-2 mb-1"><Package size={15} className="text-blue-500"/><span className="text-xs text-slate-500">Références</span></div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{data.length}</div>
          </div>
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp size={15} className="text-emerald-500"/><span className="text-xs text-slate-500">Valeur stock</span></div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{fmt(totalValue)}</div>
            <div className="text-xs text-slate-400">MAD</div>
          </div>
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle size={15} className="text-orange-500"/><span className="text-xs text-slate-500">Stock faible</span></div>
            <div className="text-2xl font-black text-orange-500">{lowCount}</div>
          </div>
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingDown size={15} className="text-red-500"/><span className="text-xs text-slate-500">Épuisés</span></div>
            <div className="text-2xl font-black text-red-500">{outCount}</div>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
              className="pl-9 pr-4 py-2 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"/>
          </div>
          <div className="flex gap-1 flex-wrap">
            {[['all', 'Tout'], ['alert', '⚠ Alertes'], ...CATEGORIES.map(c => [c, c])].map(([k, l]) => (
              <button key={k} onClick={() => setCatFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${catFilter === k ? 'bg-blue-500 text-white' : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Split layout: table + history panel */}
        <div className={`grid gap-5 ${histPanel ? 'lg:grid-cols-3' : ''}`}>
          <div className={`${histPanel ? 'lg:col-span-2' : ''} bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden`}>
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400"><Package size={32} className="mx-auto mb-3 opacity-30"/><p className="text-sm">Aucun matériau</p></div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-navy-700">
                    {['Matériau', 'Catégorie', 'Stock', 'Prix unitaire', 'Valeur totale', 'Statut', ''].map(h => (
                      <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
                  {filtered.map(m => (
                    <tr key={m._id} className={`hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors ${m.quantity <= m.minStock ? 'bg-orange-50/30 dark:bg-orange-500/[0.03]' : ''}`}>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900 dark:text-white">{m.name}</p>
                        {m.supplier && <p className="text-xs text-slate-400">{m.supplier}</p>}
                        {m.location && <p className="text-xs text-slate-400">{m.location}</p>}
                      </td>
                      <td className="px-4 py-3.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAT_COLORS[m.category] || 'bg-slate-100 text-slate-600'}`}>{m.category}</span></td>
                      <td className="px-4 py-3.5">
                        <span className={`font-bold text-sm ${m.quantity <= 0 ? 'text-red-500' : m.quantity <= m.minStock ? 'text-orange-500' : 'text-slate-900 dark:text-white'}`}>{fmt(m.quantity)}</span>
                        <span className="text-xs text-slate-400 ml-1">{m.unit}</span>
                        <p className="text-[10px] text-slate-400">min: {fmt(m.minStock)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-200">{fmt(m.unitPrice)} MAD</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">{fmt(m.quantity * m.unitPrice)} MAD</td>
                      <td className="px-4 py-3.5"><StockBadge quantity={m.quantity} minStock={m.minStock}/></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openMovement(m)} title="Mouvement de stock" className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"><ArrowRightLeft size={14}/></button>
                          <button onClick={() => setHistPanel(histPanel?._id === m._id ? null : m)} title="Historique" className={`p-1.5 rounded-lg transition-colors ${histPanel?._id === m._id ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10'}`}><History size={14}/></button>
                          <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"><Pencil size={14}/></button>
                          <button onClick={() => handleDelete(m._id)} disabled={deleting === m._id} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                            {deleting === m._id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
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

          {/* History panel */}
          {histPanel && (
            <div className="lg:col-span-1 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-navy-700 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">{histPanel.name}</h3>
                  <p className="text-xs text-slate-400">Historique des mouvements</p>
                </div>
                <button onClick={() => setHistPanel(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-700"><X size={14}/></button>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-navy-800 max-h-[500px] overflow-y-auto">
                {(!histPanel.movements || histPanel.movements.length === 0) ? (
                  <div className="text-center py-10 text-slate-400"><History size={24} className="mx-auto mb-2 opacity-30"/><p className="text-xs">Aucun mouvement</p></div>
                ) : (
                  [...histPanel.movements].reverse().map((mv, i) => {
                    const isIn  = mv.type === 'Entrée'
                    return (
                      <div key={i} className="px-5 py-3.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-2">
                            {isIn ? <TrendingUp size={13} className="text-green-500"/> : <TrendingDown size={13} className="text-red-400"/>}
                            <span className={`text-xs font-bold ${MOV_COLORS[mv.type] || 'text-slate-700'}`}>{mv.type}</span>
                          </div>
                          <span className={`text-sm font-bold ${isIn ? 'text-green-600' : 'text-red-500'}`}>{isIn ? '+' : '−'}{fmt(mv.qty)} {histPanel.unit}</span>
                        </div>
                        {mv.project && <p className="text-xs text-slate-500">Projet : {mv.project}</p>}
                        {mv.notes   && <p className="text-xs text-slate-400 italic">{mv.notes}</p>}
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(mv.date).toLocaleDateString('fr-FR')}{mv.user ? ` · ${mv.user}` : ''}</p>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Material form modal */}
      <Modal open={modal} onClose={close} title={editing ? 'Modifier le matériau' : 'Nouveau matériau'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nom du matériau *"><input {...register('name', { required: true })} className={inp} placeholder="Ciment Portland CPA 55"/></Field>
            <Field label="Catégorie">
              <select {...register('category')} className={inp}>
                <option value="">Sélectionner…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Quantité *"><input {...register('quantity', { required: true, valueAsNumber: true })} type="number" min="0" className={inp} placeholder="0"/></Field>
            <Field label="Unité">
              <select {...register('unit')} className={inp}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Stock minimum"><input {...register('minStock', { valueAsNumber: true })} type="number" min="0" className={inp} placeholder="10"/></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Prix unitaire (MAD)"><input {...register('unitPrice', { valueAsNumber: true })} type="number" min="0" step="0.01" className={inp} placeholder="0.00"/></Field>
            <Field label="Fournisseur"><input {...register('supplier')} className={inp} placeholder="Lafarge Holcim MA"/></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Emplacement"><input {...register('location')} className={inp} placeholder="Dépôt central, Chantier…"/></Field>
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

      {/* Movement modal */}
      <Modal open={!!movModal} onClose={() => setMovModal(null)} title={`Mouvement de stock — ${movModal?.name || ''}`} size="sm">
        <form onSubmit={hsMov(onMovSubmit)} className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-navy-800 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Stock actuel</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{fmt(movModal?.quantity)} <span className="text-sm font-normal text-slate-400">{movModal?.unit}</span></p>
            </div>
            <Package size={28} className="text-slate-300 dark:text-navy-600"/>
          </div>

          <Field label="Type de mouvement">
            <div className="grid grid-cols-2 gap-2">
              {MOVEMENT_TYPES.map(t => (
                <label key={t} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${watchMov('type') === t ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-200 dark:border-navy-600 hover:border-slate-300'}`}>
                  <input type="radio" value={t} {...regMov('type')} className="sr-only"/>
                  {t === 'Entrée' ? <TrendingUp size={13} className="text-green-500"/> : t === 'Sortie' ? <TrendingDown size={13} className="text-red-500"/> : <ArrowRightLeft size={13} className="text-blue-500"/>}
                  <span className={`text-xs font-semibold ${MOV_COLORS[t] || ''}`}>{t}</span>
                </label>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantité *"><input {...regMov('qty', { required: true, min: 0.01 })} type="number" min="0.01" step="0.01" className={inp} placeholder="0"/></Field>
            <Field label="Date"><input {...regMov('date')} type="date" className={inp}/></Field>
          </div>
          <Field label="Projet / chantier"><input {...regMov('project')} className={inp} placeholder="Tour Horizon"/></Field>
          <Field label="Notes"><input {...regMov('notes')} className={inp} placeholder="Livraison N°12…"/></Field>
          <Field label="Enregistré par"><input {...regMov('user')} className={inp} placeholder="M. Alami"/></Field>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setMovModal(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">Annuler</button>
            <button type="submit" disabled={movSaving} className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {movSaving && <Loader2 size={14} className="animate-spin"/>}Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
