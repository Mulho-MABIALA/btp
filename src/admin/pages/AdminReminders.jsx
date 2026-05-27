import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, Bell, Plus, Trash2, CheckCircle, AlertTriangle, Clock,
  Zap, Receipt, CheckSquare, ShoppingCart, Wrench, CalendarOff,
  ChevronRight, RefreshCw, AlarmClock, X,
} from 'lucide-react'
import { adminReminders } from '../adminApi'
import Modal from '../components/Modal'

/* ── Constantes ─────────────────────────────────────────────────────────── */
const inp   = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
  </div>
)

const PRIORITY = {
  low:    { label: 'Faible',  cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',    icon: Clock },
  normal: { label: 'Normal',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',        icon: Bell },
  high:   { label: 'Haute',   cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400', icon: AlertTriangle },
  urgent: { label: 'Urgente', cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',            icon: AlertTriangle },
}

const TYPES = ['Facture', 'Contrat', 'Maintenance', 'Réunion', 'RH', 'Autre']

const TYPE_COLORS = {
  'Facture':     'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  'Contrat':     'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  'Maintenance': 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  'Réunion':     'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  'RH':          'bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400',
  'Autre':       'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
}

/* Source → icône + label + couleur */
const SOURCE_META = {
  invoice:        { icon: Receipt,      label: 'Facture',       color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  task:           { icon: CheckSquare,  label: 'Tâche',         color: 'bg-blue-500',    text: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-500/10' },
  purchase_order: { icon: ShoppingCart, label: 'Bon de cmde',   color: 'bg-orange-500',  text: 'text-orange-600 dark:text-orange-400',   bg: 'bg-orange-50 dark:bg-orange-500/10' },
  equipment:      { icon: Wrench,       label: 'Équipement',    color: 'bg-violet-500',  text: 'text-violet-600 dark:text-violet-400',   bg: 'bg-violet-50 dark:bg-violet-500/10' },
  leave:          { icon: CalendarOff,  label: 'Congé RH',      color: 'bg-pink-500',    text: 'text-pink-600 dark:text-pink-400',       bg: 'bg-pink-50 dark:bg-pink-500/10' },
}

function getDaysLeft(dueDate) {
  if (!dueDate) return null
  return Math.ceil((new Date(dueDate) - new Date()) / 86400000)
}

function DaysChip({ dueDate, overdue }) {
  const d = getDaysLeft(dueDate)
  if (d === null) return null
  if (overdue || d < 0)
    return <span className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400"><Clock size={11}/>En retard de {Math.abs(d)}j</span>
  if (d === 0)
    return <span className="flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400"><Clock size={11}/>Aujourd'hui</span>
  if (d === 1)
    return <span className="flex items-center gap-1 text-xs font-bold text-orange-500 dark:text-orange-400"><Clock size={11}/>Demain</span>
  if (d <= 7)
    return <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400"><Clock size={11}/>Dans {d} jours</span>
  return <span className="flex items-center gap-1 text-xs text-slate-400"><Clock size={11}/>{new Date(dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function AdminReminders() {
  const navigate = useNavigate()
  const [tab, setTab]           = useState('auto')          // 'auto' | 'manual'
  const [manualData, setManual] = useState([])
  const [autoData, setAuto]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [autoLoading, setAutoLoading] = useState(true)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [snoozeMenu, setSnoozeMenu] = useState(null)   // alertId en cours
  const [snoozing, setSnoozing]     = useState(null)   // alertId en cours de snooze
  const snoozeRef = useRef(null)
  const { register, handleSubmit, reset } = useForm()

  // Fermer le menu snooze en cliquant dehors
  useEffect(() => {
    const handler = e => { if (snoozeRef.current && !snoozeRef.current.contains(e.target)) setSnoozeMenu(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ── Chargements ── */
  const loadManual = useCallback(async () => {
    setLoading(true)
    try { const r = await adminReminders.getAll(); setManual(r.data) }
    finally { setLoading(false) }
  }, [])

  const loadAuto = useCallback(async () => {
    setAutoLoading(true)
    try { const r = await adminReminders.getAuto(); setAuto(r.data.alerts || []) }
    catch { setAuto([]) }
    finally { setAutoLoading(false) }
  }, [])

  useEffect(() => { loadManual(); loadAuto() }, [loadManual, loadAuto])

  /* ── CRUD Manuel ── */
  const openAdd  = () => { setEditing(null); reset({ priority: 'normal', type: 'Autre' }); setModal(true) }
  const openEdit = r => { setEditing(r); reset({ ...r, dueDate: r.dueDate?.split?.('T')[0] }); setModal(true) }
  const close    = () => { setModal(false); setEditing(null) }

  const onSubmit = async (v) => {
    setSaving(true)
    try {
      if (editing) await adminReminders.update(editing._id, v)
      else         await adminReminders.create(v)
      await loadManual(); close()
    } finally { setSaving(false) }
  }

  const markDone     = async (id) => { await adminReminders.done(id); loadManual() }
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce rappel ?')) return
    setDeleting(id)
    try { await adminReminders.delete(id); await loadManual() } finally { setDeleting(null) }
  }

  /* ── Snooze ── */
  const handleSnooze = async (alertId, days) => {
    setSnoozing(alertId)
    setSnoozeMenu(null)
    try {
      await adminReminders.snooze(alertId, days)
      // Retire immédiatement la carte de la liste sans recharger
      setAuto(prev => prev.filter(a => a.id !== alertId))
    } catch (e) {
      alert('Erreur snooze : ' + (e.response?.data?.error || e.message))
    } finally { setSnoozing(null) }
  }

  /* ── Dérivés ── */
  const filtered    = statusFilter === 'all' ? manualData : manualData.filter(r => r.status === statusFilter)
  const manualUrgent = manualData.filter(r => r.status === 'pending' && getDaysLeft(r.dueDate) !== null && getDaysLeft(r.dueDate) <= 3).length
  const autoOverdue  = autoData.filter(a => a.overdue).length
  const autoSoon     = autoData.filter(a => !a.overdue && getDaysLeft(a.dueDate) !== null && getDaysLeft(a.dueDate) <= 7).length

  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Rappels & Échéances</h1>
            <p className="text-sm mt-1 flex items-center gap-3">
              {autoOverdue > 0 && <span className="text-red-500 font-semibold">{autoOverdue} en retard</span>}
              {autoSoon > 0    && <span className="text-orange-500 font-semibold">{autoSoon} cette semaine</span>}
              {autoOverdue === 0 && autoSoon === 0 && <span className="text-emerald-500 font-semibold">Tout est à jour ✓</span>}
            </p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors">
            <Plus size={15}/> Nouveau rappel
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-slate-100 dark:bg-navy-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setTab('auto')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'auto'
                ? 'bg-white dark:bg-navy-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Zap size={14} className={tab === 'auto' ? 'text-blue-500' : ''}/>
            Automatiques
            {(autoOverdue + autoSoon) > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${autoOverdue > 0 ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                {autoOverdue + autoSoon}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('manual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'manual'
                ? 'bg-white dark:bg-navy-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Bell size={14} className={tab === 'manual' ? 'text-blue-500' : ''}/>
            Manuels
            {manualUrgent > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center bg-orange-500 text-white">
                {manualUrgent}
              </span>
            )}
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            ONGLET AUTOMATIQUES
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'auto' && (
          <div className="space-y-4">
            {/* Refresh + légende */}
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {Object.entries(SOURCE_META).map(([k, v]) => (
                  <span key={k} className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${v.bg} ${v.text}`}>
                    <v.icon size={11}/>{v.label}
                  </span>
                ))}
              </div>
              <button onClick={loadAuto} disabled={autoLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-blue-500 border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 rounded-lg transition-colors disabled:opacity-40">
                <RefreshCw size={12} className={autoLoading ? 'animate-spin' : ''}/> Actualiser
              </button>
            </div>

            {autoLoading ? (
              <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
            ) : autoData.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={28} className="text-emerald-500"/>
                </div>
                <p className="text-slate-700 dark:text-white font-bold">Tout est à jour !</p>
                <p className="text-slate-400 text-sm mt-1">Aucune échéance urgente détectée dans les prochains jours.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {autoData.map(alert => {
                  const src   = SOURCE_META[alert.source] || SOURCE_META.task
                  const prio  = PRIORITY[alert.priority] || PRIORITY.normal
                  const isSnoozingThis = snoozing === alert.id
                  return (
                    <div
                      key={alert.id}
                      className={`bg-white dark:bg-navy-900 rounded-2xl border p-5 flex flex-col gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                        isSnoozingThis ? 'opacity-50 scale-95' :
                        alert.overdue
                          ? 'border-red-300 dark:border-red-500/40 bg-red-50/30 dark:bg-red-500/5'
                          : getDaysLeft(alert.dueDate) !== null && getDaysLeft(alert.dueDate) <= 3
                          ? 'border-orange-300 dark:border-orange-500/40'
                          : 'border-slate-200 dark:border-navy-700'
                      }`}
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${src.bg} ${src.text}`}>
                            <src.icon size={10}/>{src.label}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prio.cls}`}>
                            {prio.label}
                          </span>
                        </div>
                        {/* Bouton snooze */}
                        <div className="relative shrink-0" ref={snoozeMenu === alert.id ? snoozeRef : null}>
                          <button
                            onClick={() => setSnoozeMenu(s => s === alert.id ? null : alert.id)}
                            disabled={isSnoozingThis}
                            title="Reporter cette alerte"
                            className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 px-1.5 py-0.5 rounded-lg transition-colors disabled:opacity-40"
                          >
                            {isSnoozingThis ? <Loader2 size={11} className="animate-spin"/> : <AlarmClock size={11}/>}
                            <span className="hidden sm:inline">Reporter</span>
                          </button>
                          {snoozeMenu === alert.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl shadow-xl z-20 overflow-hidden w-36">
                              <div className="px-3 py-2 border-b border-slate-100 dark:border-navy-700 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reporter de</span>
                                <button onClick={() => setSnoozeMenu(null)} className="text-slate-300 hover:text-slate-500"><X size={11}/></button>
                              </div>
                              {[
                                { label: '1 jour',    days: 1 },
                                { label: '3 jours',   days: 3 },
                                { label: '1 semaine', days: 7 },
                                { label: '2 semaines', days: 14 },
                              ].map(opt => (
                                <button key={opt.days} onClick={() => handleSnooze(alert.id, opt.days)}
                                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 transition-colors">
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{alert.title}</h3>
                        {alert.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{alert.notes}</p>}
                      </div>

                      {/* Due date */}
                      <DaysChip dueDate={alert.dueDate} overdue={alert.overdue} />

                      {/* Action */}
                      <button
                        onClick={() => navigate(alert.link)}
                        className={`mt-auto w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors ${src.bg} ${src.text} hover:opacity-80`}
                      >
                        Voir le détail <ChevronRight size={12}/>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ONGLET MANUELS
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'manual' && (
          <div className="space-y-4">
            {/* Status filter */}
            <div className="flex gap-2">
              {[['all', 'Tous'], ['pending', 'En attente'], ['done', 'Terminés']].map(([k, l]) => (
                <button key={k} onClick={() => setStatusFilter(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === k
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300'
                  }`}>
                  {l}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 text-slate-400">
                <Bell size={32} className="mx-auto mb-3 opacity-30"/>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Aucun rappel manuel</p>
                <p className="text-xs mt-1">Cliquez sur "Nouveau rappel" pour en créer un</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(r => {
                  const prio      = PRIORITY[r.priority] || PRIORITY.normal
                  const Icon      = prio.icon
                  const daysLeft  = getDaysLeft(r.dueDate)
                  const isOverdue = daysLeft !== null && daysLeft < 0 && r.status === 'pending'
                  const isSoon    = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && r.status === 'pending'
                  return (
                    <div key={r._id}
                      className={`bg-white dark:bg-navy-900 rounded-2xl border p-5 transition-all ${
                        isOverdue  ? 'border-red-300 dark:border-red-500/40' :
                        isSoon     ? 'border-orange-300 dark:border-orange-500/40' :
                        r.status === 'done' ? 'border-slate-200 dark:border-navy-700 opacity-60' :
                        'border-slate-200 dark:border-navy-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[r.type] || TYPE_COLORS['Autre']}`}>{r.type}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prio.cls}`}>{prio.label}</span>
                        </div>
                        <Icon size={14} className={isOverdue ? 'text-red-500' : isSoon ? 'text-orange-500' : 'text-slate-400'} />
                      </div>

                      <h3 className={`font-bold text-sm mb-1 ${r.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>{r.title}</h3>
                      {r.notes     && <p className="text-xs text-slate-500 mb-1 line-clamp-2">{r.notes}</p>}
                      {r.assignedTo && <p className="text-xs text-slate-400 mb-2">Pour : <span className="font-medium">{r.assignedTo}</span></p>}

                      {r.dueDate && <DaysChip dueDate={r.dueDate} overdue={isOverdue} />}

                      <div className="flex gap-1.5 mt-4 border-t border-slate-100 dark:border-navy-700 pt-3">
                        {r.status === 'pending' && (
                          <button onClick={() => markDone(r._id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
                            <CheckCircle size={12}/> Terminé
                          </button>
                        )}
                        <button onClick={() => openEdit(r)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                          Modifier
                        </button>
                        <button onClick={() => handleDelete(r._id)} disabled={deleting === r._id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                          {deleting === r._id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal création/édition rappel manuel ── */}
      <Modal open={modal} onClose={close} title={editing ? 'Modifier le rappel' : 'Nouveau rappel'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Titre *">
            <input {...register('title', { required: true })} className={inp} placeholder="Ex : Relance client Benkirane — FAC-2026-005"/>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select {...register('type')} className={inp}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Priorité">
              <select {...register('priority')} className={inp}>
                {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Date d'échéance">
            <input {...register('dueDate')} type="date" className={inp}/>
          </Field>
          <Field label="Assigné à">
            <input {...register('assignedTo')} className={inp} placeholder="M. Alami / Comptabilité"/>
          </Field>
          <Field label="Notes">
            <textarea {...register('notes')} rows={2} className={`${inp} resize-none`} placeholder="Détails supplémentaires..."/>
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
    </>
  )
}
