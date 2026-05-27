import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import {
  Loader2, ClipboardList, Plus, Pencil, Trash2, X,
  AlertCircle, CheckCircle2, Clock, Zap, FolderOpen,
  User, Calendar, Hammer, FileText, ArrowUpRight,
} from 'lucide-react'
import { adminWorkOrders } from '../adminApi'
import Modal from '../components/Modal'
import { exportCsv } from '../utils/exportCsv'

/* ── Styles ─────────────────────────────────────────────────────────────── */
const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
  </div>
)
const fmtD = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

const STATUS = {
  pending:     { label: 'En attente', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',   dot: 'bg-slate-400',  icon: <Clock size={11}/> },
  in_progress: { label: 'En cours',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',       dot: 'bg-blue-500',   icon: <Loader2 size={11} className="animate-spin"/> },
  done:        { label: 'Terminé',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', dot: 'bg-emerald-500', icon: <CheckCircle2 size={11}/> },
  cancelled:   { label: 'Annulé',   cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',            dot: 'bg-red-400',    icon: <X size={11}/> },
}
const PRIORITY = {
  low:    { label: 'Faible',  cls: 'bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400',   bar: 'bg-slate-300' },
  normal: { label: 'Normal',  cls: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',       bar: 'bg-blue-400' },
  high:   { label: 'Haute',   cls: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400', bar: 'bg-orange-400' },
  urgent: { label: 'Urgente', cls: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400',           bar: 'bg-red-500' },
}

/* ── Toast ─────────────────────────────────────────────────────────────── */
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold
      ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
      {toast.type === 'success' ? <CheckCircle2 size={17}/> : <AlertCircle size={17}/>}
      {toast.msg}
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100"><X size={14}/></button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════════════════ */
export default function AdminWorkOrders() {
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [toast, setToast]       = useState(null)
  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const { register, handleSubmit, reset } = useForm()

  /* Load ──────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await adminWorkOrders.getAll()
      setData(r.data)
      if (selected) {
        const updated = r.data.find(w => w._id === selected._id)
        if (updated) setSelected(updated)
      }
    } finally { setLoading(false) }
  }, [selected?._id])

  useEffect(() => { load() }, [])

  /* Status change ─────────────────────────────────────────────────────── */
  const changeStatus = async (id, status) => {
    try {
      const r = await adminWorkOrders.updateStatus(id, status)
      setData(prev => prev.map(w => w._id === id ? r.data : w))
      if (selected?._id === id) setSelected(r.data)
    } catch { showToast('Erreur mise à jour statut', 'error') }
  }

  /* Modal ─────────────────────────────────────────────────────────────── */
  const openAdd  = () => { setEditing(null); reset({ status: 'pending', priority: 'normal' }); setModal(true) }
  const openEdit = wo => { setEditing(wo); reset({ ...wo, startDate: wo.startDate?.split?.('T')[0], endDate: wo.endDate?.split?.('T')[0] }); setModal(true) }
  const close    = () => { setModal(false); setEditing(null) }

  const onSubmit = async (v) => {
    setSaving(true)
    try {
      if (editing) await adminWorkOrders.update(editing._id, v)
      else         await adminWorkOrders.create(v)
      await load(); close()
      showToast(editing ? 'Bon de travaux modifié' : 'Bon de travaux créé')
    } catch (e) {
      showToast(e?.response?.data?.error || 'Erreur', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce bon de travaux ?')) return
    setDeleting(id)
    try {
      await adminWorkOrders.delete(id)
      if (selected?._id === id) setSelected(null)
      await load()
      showToast('Bon de travaux supprimé')
    } catch { showToast('Erreur suppression', 'error') }
    finally { setDeleting(null) }
  }

  /* Computed ──────────────────────────────────────────────────────────── */
  const filtered = statusFilter === 'all' ? data : data.filter(w => w.status === statusFilter)

  const doExport = () => exportCsv('bons-travaux.csv', data.map(w => ({
    Numéro: w.number, Titre: w.title, Projet: w.project, Site: w.site,
    Assigné: w.assignedTo, Priorité: PRIORITY[w.priority]?.label,
    Statut: STATUS[w.status]?.label, Début: fmtD(w.startDate), Fin: fmtD(w.endDate),
    'H. estimées': w.estimatedHours, 'H. réelles': w.actualHours,
  })))

  /* Hours progress helper */
  const hoursPct = wo => {
    if (!wo.estimatedHours || !wo.actualHours) return 0
    return Math.min(100, Math.round(wo.actualHours / wo.estimatedHours * 100))
  }

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Bons de travaux</h1>
            <p className="text-slate-500 text-sm mt-1">
              {data.length} bon{data.length > 1 ? 's' : ''} · {data.filter(w => w.status === 'in_progress').length} en cours
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={doExport}
              className="px-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
              ↓ CSV
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors">
              <Plus size={15}/> Nouveau BT
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: 'pending',     label: 'En attente', color: 'bg-slate-400' },
            { key: 'in_progress', label: 'En cours',   color: 'bg-blue-500' },
            { key: 'done',        label: 'Terminés',   color: 'bg-emerald-500' },
            { key: 'cancelled',   label: 'Annulés',    color: 'bg-red-400' },
          ].map(({ key, label, color }) => (
            <button key={key} onClick={() => setStatusFilter(s => s === key ? 'all' : key)}
              className={`bg-white dark:bg-navy-900 rounded-2xl border p-4 text-left transition-all hover:shadow-md
                ${statusFilter === key ? 'border-blue-400 ring-2 ring-blue-400/30' : 'border-slate-200 dark:border-navy-700'}`}>
              <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center mb-2`}>
                <ClipboardList size={14} className="text-white"/>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {data.filter(w => w.status === key).length}
              </div>
              <div className="text-xs text-slate-500">{label}</div>
            </button>
          ))}
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {[['all', 'Tous'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, l]) => (
            <button key={k} onClick={() => setStatusFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${statusFilter === k ? 'bg-blue-500 text-white' : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Main layout */}
        <div className={`grid gap-5 ${selected ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>

          {/* Table */}
          <div className={selected ? 'lg:col-span-2' : ''}>
            <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <ClipboardList size={32} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-sm">Aucun bon de travaux</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[680px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-navy-700">
                      {['N° BT', 'Titre', 'Priorité', 'Statut', 'Assigné', 'Dates', 'Heures', ''].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
                    {filtered.map(wo => {
                      const s  = STATUS[wo.status]   || STATUS.pending
                      const p  = PRIORITY[wo.priority] || PRIORITY.normal
                      const pct = hoursPct(wo)
                      const isSel = selected?._id === wo._id
                      return (
                        <tr key={wo._id}
                          onClick={() => setSelected(isSel ? null : wo)}
                          className={`cursor-pointer transition-colors
                            ${isSel ? 'bg-blue-50 dark:bg-blue-500/5' : 'hover:bg-slate-50 dark:hover:bg-navy-800/50'}`}>
                          <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{wo.number || '—'}</td>
                          <td className="px-4 py-3.5 max-w-[160px]">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">{wo.title}</p>
                            {wo.project && <p className="text-[10px] text-slate-400 truncate">{wo.project}</p>}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.cls}`}>{p.label}</span>
                          </td>
                          <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                            <select value={wo.status}
                              onChange={e => changeStatus(wo._id, e.target.value)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer ${s.cls}`}>
                              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">{wo.assignedTo || '—'}</td>
                          <td className="px-4 py-3.5 text-xs text-slate-500">
                            {(wo.startDate || wo.endDate) ? (
                              <span>{fmtD(wo.startDate)} → {fmtD(wo.endDate)}</span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            {(wo.estimatedHours || wo.actualHours) ? (
                              <div className="w-20">
                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                  <span>{wo.actualHours || 0}h</span>
                                  <span>{wo.estimatedHours || 0}h</span>
                                </div>
                                <div className="h-1 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${pct > 100 ? 'bg-red-500' : p.bar}`} style={{ width: `${Math.min(pct, 100)}%` }}/>
                                </div>
                              </div>
                            ) : <span className="text-xs text-slate-400">—</span>}
                          </td>
                          <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(wo)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                                <Pencil size={14}/>
                              </button>
                              <button onClick={() => handleDelete(wo._id)} disabled={deleting === wo._id}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                                {deleting === wo._id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
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

          {/* Detail Panel */}
          {selected && (() => {
            const s   = STATUS[selected.status]    || STATUS.pending
            const p   = PRIORITY[selected.priority] || PRIORITY.normal
            const pct = hoursPct(selected)
            const isOverBudget = pct > 100
            return (
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 sticky top-4 overflow-hidden">
                  {/* Panel header */}
                  <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {selected.number && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-white/20 text-white/80 rounded-full">
                              {selected.number}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.cls}`}>{p.label}</span>
                        </div>
                        <h3 className="font-black text-white text-base leading-tight">{selected.title}</h3>
                        {selected.project && (
                          <p className="text-white/60 text-xs mt-1 flex items-center gap-1">
                            <FolderOpen size={10}/>{selected.project}
                            {selected.site && <span className="text-white/40"> · {selected.site}</span>}
                          </p>
                        )}
                      </div>
                      <button onClick={() => setSelected(null)}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors shrink-0">
                        <X size={14}/>
                      </button>
                    </div>
                    {/* Status select */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-white/60 text-[10px]">Statut :</span>
                      <select value={selected.status}
                        onChange={e => changeStatus(selected._id, e.target.value)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border-0 outline-none cursor-pointer ${s.cls}`}>
                        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 max-h-[65vh] overflow-y-auto space-y-4">

                    {/* Hours progress */}
                    {(selected.estimatedHours || selected.actualHours) && (
                      <div className={`rounded-xl p-3.5 ${isOverBudget ? 'bg-red-50 dark:bg-red-500/10' : 'bg-slate-50 dark:bg-navy-800'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Heures de travail</span>
                          {isOverBudget && <span className="text-[10px] text-red-500 font-bold flex items-center gap-1"><AlertCircle size={10}/>Dépassement</span>}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
                          <span className="font-bold text-slate-700 dark:text-slate-200">{selected.actualHours || 0}h réelles</span>
                          <span>{selected.estimatedHours || 0}h estimées</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-navy-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : p.bar}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}/>
                        </div>
                        <p className={`text-xs font-bold mt-1.5 ${isOverBudget ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>
                          {pct}% réalisé
                        </p>
                      </div>
                    )}

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {selected.assignedTo && (
                        <div className="bg-slate-50 dark:bg-navy-800 rounded-xl p-2.5">
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5"><User size={9}/>Assigné à</p>
                          <p className="text-xs font-semibold text-slate-800 dark:text-white">{selected.assignedTo}</p>
                        </div>
                      )}
                      {selected.startDate && (
                        <div className="bg-slate-50 dark:bg-navy-800 rounded-xl p-2.5">
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5"><Calendar size={9}/>Début</p>
                          <p className="text-xs font-semibold text-slate-800 dark:text-white">{fmtD(selected.startDate)}</p>
                        </div>
                      )}
                      {selected.endDate && (
                        <div className={`rounded-xl p-2.5 col-span-${selected.startDate ? '1' : '2'}
                          ${new Date(selected.endDate) < new Date() && selected.status !== 'done'
                            ? 'bg-red-50 dark:bg-red-500/10'
                            : 'bg-slate-50 dark:bg-navy-800'}`}>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5"><Calendar size={9}/>Fin prévue</p>
                          <p className={`text-xs font-semibold ${new Date(selected.endDate) < new Date() && selected.status !== 'done' ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                            {fmtD(selected.endDate)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {selected.description && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <FileText size={9}/>Description
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-navy-800 rounded-xl p-3 whitespace-pre-wrap leading-relaxed">
                          {selected.description}
                        </p>
                      </div>
                    )}

                    {/* Materials */}
                    {selected.materials && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <Hammer size={9}/>Matériaux
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-navy-800 rounded-xl p-3 whitespace-pre-wrap">
                          {selected.materials}
                        </p>
                      </div>
                    )}

                    {/* Notes */}
                    {selected.notes && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Notes</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-navy-800 rounded-xl p-3 whitespace-pre-wrap">
                          {selected.notes}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(selected)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors">
                        <Pencil size={13}/> Modifier
                      </button>
                      <button onClick={() => handleDelete(selected._id)} disabled={deleting === selected._id}
                        className="px-3 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                        {deleting === selected._id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      <Modal open={modal} onClose={close} title={editing ? 'Modifier le bon de travaux' : 'Nouveau bon de travaux'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Titre *">
            <input {...register('title', { required: true })} className={inp} placeholder="Coulage dalle RDC"/>
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Projet"><input {...register('project')} className={inp} placeholder="Tour Horizon"/></Field>
            <Field label="Site / Zone"><input {...register('site')} className={inp} placeholder="Zone A – Niveau -2"/></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Assigné à"><input {...register('assignedTo')} className={inp} placeholder="Équipe Alami / M. Rachid"/></Field>
            <Field label="Priorité">
              <select {...register('priority')} className={inp}>
                {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Statut">
              <select {...register('status')} className={inp}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Date début"><input {...register('startDate')} type="date" className={inp}/></Field>
            <Field label="Date fin prévue"><input {...register('endDate')} type="date" className={inp}/></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Heures estimées">
              <input {...register('estimatedHours', { valueAsNumber: true })} type="number" className={inp} placeholder="24"/>
            </Field>
            <Field label="Heures réelles">
              <input {...register('actualHours', { valueAsNumber: true })} type="number" className={inp} placeholder="0"/>
            </Field>
          </div>
          <Field label="Description">
            <textarea {...register('description')} rows={2} className={`${inp} resize-none`} placeholder="Description des travaux à effectuer…"/>
          </Field>
          <Field label="Matériaux nécessaires">
            <input {...register('materials')} className={inp} placeholder="Ciment x20 sacs, Ferraille…"/>
          </Field>
          <Field label="Notes">
            <textarea {...register('notes')} rows={2} className={`${inp} resize-none`}/>
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin"/>}
              {editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)}/>
    </>
  )
}
