import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  Loader2, ArrowLeft, FolderKanban, TrendingUp, Calendar, MapPin,
  Pencil, Trash2, Plus, CheckCircle2, Circle, X, ExternalLink,
  UploadCloud, Image, UserCheck, AlertTriangle, Tag,
  ClipboardList, Clock,
} from 'lucide-react'
import { adminProjects, adminTasks } from '../adminApi'
import Modal from '../components/Modal'

/* ── Constants ─────────────────────────────────────────────────────────── */
const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children, error }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">Requis</p>}
  </div>
)

const CATEGORIES = ['Construction', 'Génie Civil', 'Immobilier', 'Rénovation', 'Travaux Publics', 'Voirie']

const STATUS_PRJ = {
  pending:   { label: 'En attente', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',     bar: 'bg-slate-400' },
  active:    { label: 'En cours',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',         bar: 'bg-blue-500' },
  suspended: { label: 'Suspendu',   cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400', bar: 'bg-orange-400' },
  completed: { label: 'Terminé',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', bar: 'bg-emerald-500' },
}

const TASK_COLS = [
  { key: 'todo',        label: 'À faire',   bg: 'bg-slate-50 dark:bg-navy-800/60',   dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  { key: 'in-progress', label: 'En cours',  bg: 'bg-blue-50 dark:bg-blue-500/5',    dot: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
  { key: 'review',      label: 'Révision',  bg: 'bg-amber-50 dark:bg-amber-500/5',  dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
  { key: 'done',        label: 'Terminé',   bg: 'bg-emerald-50 dark:bg-emerald-500/5', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
]

const PRIORITY = {
  low:    { label: 'Basse',   cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
  medium: { label: 'Moyenne', cls: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
  high:   { label: 'Haute',   cls: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' },
  urgent: { label: 'Urgente', cls: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
}

const fmt  = n => Number(n || 0).toLocaleString('fr-FR')
const fmtK = n => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n || 0)
const fmtD = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

/* ── Toast ─────────────────────────────────────────────────────────────── */
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 4500)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  const ok = toast.type === 'success'
  return (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border max-w-sm
      ${ok ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-500/30'
            : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-500/30'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0
        ${ok ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
        {ok ? '✓' : '✕'}
      </div>
      <p className={`flex-1 text-sm font-medium ${ok ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
        {toast.msg}
      </p>
      <button onClick={onClose}><X size={14} className="text-slate-400 hover:text-slate-600"/></button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function AdminProjectDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const fileRef     = useRef()
  const imageRef    = useRef()
  const [imageFile,    setImageFile]    = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [uploadingImg, setUploadingImg] = useState(false)

  const [project,  setProject]  = useState(null)
  const [tasks,    setTasks]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('tasks')
  const [editModal, setEditModal] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [uploading,setUploading]= useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error,    setError]    = useState(null)
  const [toast,    setToast]    = useState(null)
  const [taskUpdating, setTaskUpdating] = useState(null)
  const [lightbox, setLightbox] = useState(null)   // URL de la photo agrandie

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm()
  const { fields: mFields, append: mAppend, remove: mRemove } = useFieldArray({ control, name: 'milestones' })
  const progressWatch = watch('progress', 0)

  /* ── Load ─────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [projRes, tasksRes] = await Promise.all([
        adminProjects.getOne(id),
        adminTasks.getByProject(id).catch(() => ({ data: [] })),
      ])
      setProject(projRes.data)
      setTasks(tasksRes.data)
    } catch (e) {
      if (e.response?.status === 404) navigate('/admin/projects')
      else setError(e.response?.data?.error || e.message || 'Erreur de chargement')
    } finally { setLoading(false) }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  /* ── Task status ──────────────────────────────────────────────────────── */
  const updateTaskStatus = async (taskId, status) => {
    setTaskUpdating(taskId)
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status } : t))
    try   { await adminTasks.updateStatus(taskId, status) }
    catch { load() }
    finally { setTaskUpdating(null) }
  }

  /* ── Photo upload ─────────────────────────────────────────────────────── */
  const handleFiles = async (fileList) => {
    const file = fileList[0]
    if (!file?.type.startsWith('image/')) {
      setToast({ type: 'error', msg: 'Seules les images sont acceptées (JPG, PNG, WEBP)' })
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setToast({ type: 'error', msg: 'Fichier trop lourd (max 8 MB)' })
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const r = await adminProjects.uploadPhoto(id, fd)
      setProject(r.data)
      setToast({ type: 'success', msg: 'Photo ajoutée avec succès' })
    } catch (e) {
      setToast({ type: 'error', msg: e.response?.data?.error || 'Erreur lors de l\'upload' })
    } finally { setUploading(false) }
  }

  const removePhoto = async (idx) => {
    if (!window.confirm('Supprimer cette photo ?')) return
    try {
      const r = await adminProjects.deletePhoto(id, idx)
      setProject(r.data)
      setToast({ type: 'success', msg: 'Photo supprimée' })
    } catch (e) {
      setToast({ type: 'error', msg: 'Erreur suppression' })
    }
  }

  /* ── Edit ─────────────────────────────────────────────────────────────── */
  const openEdit = () => {
    reset({
      ...project,
      client:       project.client?._id || project.client || '',
      tags:         project.tags?.join(', ') || '',
      deliveryDate: project.deliveryDate ? new Date(project.deliveryDate).toISOString().split('T')[0] : '',
      milestones:   project.milestones || [],
    })
    setImageFile(null)
    setImagePreview(project.image || '')
    setEditModal(true)
  }

  const onSave = async (v) => {
    setSaving(true)
    const payload = {
      ...v,
      year:         Number(v.year),
      progress:     Number(v.progress || 0),
      budgetAmount: Number(v.budgetAmount || 0),
      spent:        Number(v.spent || 0),
      tags:         v.tags ? v.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      image:        imageFile ? (project.image || '') : imagePreview,
    }
    try {
      const r = await adminProjects.update(id, payload)
      // Upload image si nouveau fichier sélectionné
      if (imageFile) {
        setUploadingImg(true)
        const fd = new FormData()
        fd.append('image', imageFile)
        const r2 = await adminProjects.uploadImage(id, fd)
        setProject(r2.data)
        setUploadingImg(false)
      } else {
        setProject(r.data)
      }
      setEditModal(false)
      setImageFile(null)
      setToast({ type: 'success', msg: 'Projet mis à jour' })
    } catch (e) {
      setUploadingImg(false)
      setToast({ type: 'error', msg: e.response?.data?.error || 'Erreur de sauvegarde' })
    } finally { setSaving(false) }
  }

  /* ── States de chargement / erreur ───────────────────────────────────── */
  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={28} className="animate-spin text-blue-500"/>
    </div>
  )
  if (error) return (
    <div className="flex flex-col items-center py-20 gap-4">
      <AlertTriangle size={28} className="text-red-500"/>
      <div className="text-center">
        <p className="font-bold text-slate-800 dark:text-white">Impossible de charger le projet</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={load} className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-xl">Réessayer</button>
        <button onClick={() => navigate('/admin/projects')} className="px-4 py-2 border border-slate-200 dark:border-navy-600 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl">← Retour</button>
      </div>
    </div>
  )
  if (!project) return null

  const sc = STATUS_PRJ[project.status] || STATUS_PRJ.active
  const budgetPct = project.budgetAmount > 0 ? Math.min(100, Math.round((project.spent || 0) / project.budgetAmount * 100)) : 0
  const doneTasks = tasks.filter(t => t.status === 'done').length

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)}/>

      {/* Lightbox photo */}
      {lightbox && (
        <div className="fixed inset-0 z-[9998] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white"><X size={24}/></button>
          <img src={lightbox} alt="Photo" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" onClick={e => e.stopPropagation()}/>
        </div>
      )}

      <div className="space-y-6 max-w-6xl">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/projects')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-500 transition-colors font-medium">
            <ArrowLeft size={16}/> Projets
          </button>
          <span className="text-slate-300 dark:text-navy-600">/</span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{project.title}</span>
        </div>

        {/* ── Header ── */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          {project.image && (
            <div className="h-52 overflow-hidden relative">
              <img src={project.image} alt={project.title} className="w-full h-full object-cover"/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
              <div className="absolute bottom-4 left-6">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${sc.cls}`}>{sc.label}</span>
              </div>
            </div>
          )}

          <div className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                {!project.image && (
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${sc.cls} mb-2 inline-block`}>{sc.label}</span>
                )}
                <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{project.title}</h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                  {project.category && (
                    <span className="text-xs text-slate-500 bg-slate-100 dark:bg-navy-700 px-2 py-0.5 rounded-full">{project.category}</span>
                  )}
                  {project.location && (
                    <span className="flex items-center gap-1 text-sm text-slate-500"><MapPin size={12}/>{project.location}</span>
                  )}
                  {project.year && (
                    <span className="flex items-center gap-1 text-sm text-slate-500"><Calendar size={12}/>{project.year}</span>
                  )}
                  {(project.clientName || project.client) && (
                    <button
                      onClick={() => project.client && navigate(`/admin/clients/${project.client._id || project.client}`)}
                      className={`flex items-center gap-1 text-sm ${project.client ? 'text-blue-500 hover:underline' : 'text-slate-500 cursor-default'}`}>
                      <UserCheck size={12}/>{project.clientName || project.client?.name}
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">Avancement</span>
                    <span className={`font-black text-base ${sc.bar === 'bg-emerald-500' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                      {project.progress || 0}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                    <div className={`h-full ${sc.bar} rounded-full transition-all duration-700`} style={{ width: `${project.progress || 0}%` }}/>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button onClick={openEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/25">
                  <Pencil size={14}/> Modifier
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: TrendingUp,
              label: 'Budget prévu',
              value: project.budgetAmount > 0 ? `${fmtK(project.budgetAmount)} MAD` : '—',
              sub: project.deliveryDate ? `Livraison ${fmtD(project.deliveryDate)}` : null,
              color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
            },
            {
              icon: TrendingUp,
              label: 'Dépensé',
              value: project.spent > 0 ? `${fmtK(project.spent)} MAD` : '—',
              sub: project.budgetAmount > 0 ? `${budgetPct}% du budget` : null,
              color: budgetPct > 90 ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
            },
            {
              icon: ClipboardList,
              label: 'Tâches',
              value: tasks.length,
              sub: `${doneTasks} terminée${doneTasks > 1 ? 's' : ''}`,
              color: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
            },
            {
              icon: CheckCircle2,
              label: 'Progression',
              value: `${project.progress || 0}%`,
              sub: project.status === 'completed' ? 'Projet terminé ✓' : sc.label,
              color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            },
          ].map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5 flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon size={20}/>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5 truncate">{value}</p>
                {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-slate-100 dark:bg-navy-800 p-1 rounded-xl w-fit flex-wrap">
          {[
            { key: 'tasks',  label: 'Tâches',   count: tasks.length },
            { key: 'photos', label: 'Photos',   count: project.photos?.length },
            { key: 'gantt',  label: 'Gantt',    count: project.milestones?.length },
            { key: 'infos',  label: 'Infos',    count: null },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key ? 'bg-white dark:bg-navy-900 text-slate-900 dark:text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-navy-700 text-slate-600 dark:text-slate-300 min-w-[18px] text-center">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════════════════ TÂCHES ════════════════ */}
        {tab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {tasks.length === 0 ? 'Aucune tâche liée à ce projet'
                  : `${doneTasks}/${tasks.length} tâche${tasks.length > 1 ? 's' : ''} terminée${doneTasks > 1 ? 's' : ''}`}
              </p>
              <button onClick={() => navigate('/admin/tasks')}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-600 transition-colors">
                <Plus size={13}/> Gérer les tâches
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-navy-900 rounded-2xl border border-dashed border-slate-200 dark:border-navy-700">
                <ClipboardList size={32} className="mx-auto mb-3 text-slate-300 dark:text-navy-600"/>
                <p className="text-sm font-semibold text-slate-500">Aucune tâche assignée à ce projet</p>
                <p className="text-xs text-slate-400 mt-1">Dans Tâches Kanban, sélectionnez ce projet pour lier des tâches</p>
                <button onClick={() => navigate('/admin/tasks')}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors">
                  Aller aux Tâches →
                </button>
              </div>
            ) : (
              /* Mini Kanban 4 colonnes */
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {TASK_COLS.map(col => {
                  const colTasks = tasks.filter(t => t.status === col.key)
                  return (
                    <div key={col.key} className={`${col.bg} rounded-2xl p-3 border border-slate-200 dark:border-navy-700`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${col.dot}`}/>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{col.label}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-white dark:bg-navy-800 px-1.5 py-0.5 rounded-full">
                          {colTasks.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {colTasks.map(task => (
                          <div key={task._id}
                            className="bg-white dark:bg-navy-900 rounded-xl p-3 border border-slate-200 dark:border-navy-700 shadow-sm hover:shadow-md transition-shadow">
                            <p className={`text-xs font-semibold leading-snug mb-2 ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                              {task.title}
                            </p>

                            {/* Priority */}
                            {task.priority && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${(PRIORITY[task.priority] || PRIORITY.medium).cls}`}>
                                {(PRIORITY[task.priority] || PRIORITY.medium).label}
                              </span>
                            )}

                            {/* Assignee */}
                            {task.employeeRef && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                                  {task.employeeRef.firstName?.[0]}{task.employeeRef.lastName?.[0]}
                                </div>
                                <span className="text-[10px] text-slate-400 truncate">
                                  {task.employeeRef.firstName} {task.employeeRef.lastName}
                                </span>
                              </div>
                            )}

                            {/* Due date */}
                            {task.dueDate && (
                              <div className={`flex items-center gap-1 mt-1.5 text-[10px] ${
                                new Date(task.dueDate) < new Date() && task.status !== 'done'
                                  ? 'text-red-500 font-semibold' : 'text-slate-400'
                              }`}>
                                <Clock size={9}/> {fmtD(task.dueDate)}
                              </div>
                            )}

                            {/* Status select */}
                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-navy-700">
                              <select
                                value={task.status}
                                disabled={taskUpdating === task._id}
                                onChange={e => updateTaskStatus(task._id, e.target.value)}
                                className={`w-full text-[10px] font-bold rounded-lg px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${col.badge}`}
                              >
                                {TASK_COLS.map(c => (
                                  <option key={c.key} value={c.key}>{c.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                        {colTasks.length === 0 && (
                          <div className="text-center py-4 text-slate-400 dark:text-slate-600">
                            <p className="text-[10px]">Vide</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════ PHOTOS ════════════════ */}
        {tab === 'photos' && (
          <div className="space-y-5">
            {/* Zone upload drag & drop */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
              onClick={() => !uploading && fileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/10'
                  : 'border-slate-200 dark:border-navy-600 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-navy-800/40'
              }`}
            >
              <input
                type="file"
                ref={fileRef}
                accept="image/*"
                className="hidden"
                onChange={e => { if (e.target.files[0]) handleFiles(e.target.files); e.target.value = '' }}
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={28} className="animate-spin text-blue-500"/>
                  <p className="text-sm font-semibold text-blue-500">Upload en cours…</p>
                </div>
              ) : (
                <>
                  <UploadCloud size={32} className={`mx-auto mb-3 ${dragOver ? 'text-blue-500' : 'text-slate-300 dark:text-navy-600'}`}/>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Glisser une photo ici ou <span className="text-blue-500">parcourir</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP — max 8 MB</p>
                </>
              )}
            </div>

            {/* Galerie */}
            {!project.photos?.length ? (
              <div className="text-center py-12 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700">
                <Image size={32} className="mx-auto mb-3 text-slate-300 dark:text-navy-600"/>
                <p className="text-sm font-semibold text-slate-500">Aucune photo de chantier</p>
                <p className="text-xs text-slate-400 mt-1">Ajoutez des photos d'avancement en glissant ci-dessus</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {project.photos.map((url, idx) => (
                  <div key={idx}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-navy-700 aspect-video bg-slate-100 dark:bg-navy-800 cursor-pointer"
                    onClick={() => setLightbox(url)}>
                    <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <div className="p-2 bg-white/90 dark:bg-navy-900/90 rounded-lg text-slate-600 dark:text-slate-200">
                        <ExternalLink size={13}/>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); removePhoto(idx) }}
                        className="p-2 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded font-medium">
                      {idx + 1}/{project.photos.length}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════ GANTT ════════════════ */}
        {tab === 'gantt' && (() => {
          const milestones = project.milestones || []
          const start = project.createdAt ? new Date(project.createdAt) : new Date()
          const end   = project.deliveryDate ? new Date(project.deliveryDate) : new Date(start.getTime() + 90 * 86400000)
          const range = Math.max(end.getTime() - start.getTime(), 1)

          return (
            <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-6">
              {milestones.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Calendar size={32} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-sm font-semibold">Aucun jalon défini</p>
                  <p className="text-xs mt-1">Ajoutez des jalons via le bouton Modifier</p>
                  <button onClick={openEdit} className="mt-4 px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors">
                    Modifier le projet →
                  </button>
                </div>
              ) : (
                <>
                  {/* Header dates */}
                  <div className="flex justify-between text-xs text-slate-400 mb-4 px-32">
                    <span>{start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span>{end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>

                  <div className="space-y-4">
                    {milestones.map((m, i) => {
                      const mDate = m.date ? new Date(m.date) : null
                      const pos = mDate ? Math.max(0, Math.min(100, ((mDate.getTime() - start.getTime()) / range) * 100)) : 50
                      const isOverdue = mDate && !m.done && mDate.getTime() < Date.now()
                      const dotColor = m.done ? 'bg-emerald-500 border-emerald-600'
                        : isOverdue ? 'bg-red-500 border-red-600' : 'bg-blue-500 border-blue-600'
                      const lineColor = m.done ? 'bg-emerald-400' : isOverdue ? 'bg-red-400' : 'bg-blue-400'

                      return (
                        <div key={i} className="flex items-center gap-4">
                          {/* Label */}
                          <div className="w-32 shrink-0 text-right">
                            <p className={`text-xs font-semibold leading-tight ${
                              m.done ? 'line-through text-slate-400' : isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'
                            }`}>{m.title}</p>
                          </div>
                          {/* Timeline */}
                          <div className="flex-1 relative h-6 flex items-center">
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-navy-700 rounded-full"/>
                            <div className={`absolute left-0 h-1.5 ${lineColor} rounded-full transition-all`} style={{ width: `${pos}%` }}/>
                            <div className={`absolute w-4 h-4 rounded-full border-2 ${dotColor} -translate-x-1/2 shadow-md`} style={{ left: `${pos}%` }}
                              title={mDate ? mDate.toLocaleDateString('fr-FR') : '—'}/>
                          </div>
                          {/* Date + status */}
                          <div className="w-24 shrink-0 flex flex-col items-start gap-0.5">
                            <span className="text-xs text-slate-400">
                              {mDate ? mDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                            </span>
                            <span className={`text-[10px] font-bold ${
                              m.done ? 'text-emerald-600 dark:text-emerald-400' : isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-400'
                            }`}>{m.done ? '✓ Fait' : isOverdue ? '⚠ Retard' : '→ À venir'}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-100 dark:border-navy-700">
                    {[
                      { color: 'bg-emerald-500', label: 'Terminé' },
                      { color: 'bg-blue-500',    label: 'À venir' },
                      { color: 'bg-red-500',     label: 'En retard' },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color}`}/>
                        <span className="text-xs text-slate-400">{label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })()}

        {/* ════════════════ INFOS ════════════════ */}
        {tab === 'infos' && (
          <div className="space-y-5">
            {/* Description */}
            {project.description && (
              <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Description</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{project.description}</p>
              </div>
            )}

            {/* Details grid */}
            <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Détails du projet</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {[
                  { label: 'Statut',          val: sc.label },
                  { label: 'Catégorie',       val: project.category },
                  { label: 'Lieu',            val: project.location },
                  { label: 'Année',           val: project.year },
                  { label: 'Durée',           val: project.duration },
                  { label: 'Date de livraison', val: fmtD(project.deliveryDate) },
                  { label: 'Budget prévu',    val: project.budgetAmount > 0 ? `${fmt(project.budgetAmount)} MAD` : '—' },
                  { label: 'Dépensé',         val: project.spent > 0 ? `${fmt(project.spent)} MAD` : '—' },
                  { label: 'Avancement',      val: `${project.progress || 0}%` },
                ].filter(d => d.val && d.val !== '—').map(({ label, val }) => (
                  <div key={label}>
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            {project.tags?.length > 0 && (
              <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Tag size={12}/> Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map(t => (
                    <span key={t} className="text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Jalons */}
            {project.milestones?.length > 0 && (
              <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">
                  Jalons ({project.milestones.filter(m => m.done).length}/{project.milestones.length} complétés)
                </p>
                <div className="space-y-3">
                  {project.milestones.map((m, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {m.done
                        ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0"/>
                        : <Circle size={16} className="text-slate-300 dark:text-navy-600 shrink-0"/>}
                      <span className={`flex-1 text-sm ${m.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                        {m.title}
                      </span>
                      {m.date && (
                        <span className="text-xs text-slate-400 shrink-0">
                          {new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Modal modification ── */}
      <Modal open={editModal} onClose={() => !saving && setEditModal(false)} title="Modifier le projet" size="lg">
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Titre *" error={errors.title}>
              <input {...register('title', { required: true })} className={inp}/>
            </Field>
            <Field label="Catégorie *" error={errors.category}>
              <select {...register('category', { required: true })} className={inp}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Statut">
              <select {...register('status')} className={inp}>
                {Object.entries(STATUS_PRJ).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Année">
              <input {...register('year', { valueAsNumber: true })} type="number" className={inp}/>
            </Field>
            <Field label={`Avancement : ${progressWatch || 0}%`}>
              <input {...register('progress', { valueAsNumber: true })} type="range" min="0" max="100" step="1"
                className="w-full h-2 bg-slate-200 dark:bg-navy-700 rounded-full appearance-none cursor-pointer accent-blue-500 mt-2"/>
            </Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Lieu">
              <input {...register('location')} className={inp}/>
            </Field>
            <Field label="Durée">
              <input {...register('duration')} className={inp} placeholder="24 mois"/>
            </Field>
            <Field label="Date de livraison">
              <input {...register('deliveryDate')} type="date" className={inp}/>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Budget prévu (MAD)">
              <input {...register('budgetAmount', { valueAsNumber: true })} type="number" className={inp}/>
            </Field>
            <Field label="Dépensé à ce jour (MAD)">
              <input {...register('spent', { valueAsNumber: true })} type="number" className={inp}/>
            </Field>
          </div>

          {/* Image principale — upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Image principale</label>
            <input type="file" ref={imageRef} accept="image/*" className="hidden"
              onChange={e => {
                const file = e.target.files[0]
                if (!file) return
                setImageFile(file)
                setImagePreview(URL.createObjectURL(file))
                e.target.value = ''
              }}
            />
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-navy-600 group">
                <img src={imagePreview} alt="Aperçu" className="w-full h-44 object-cover"/>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button type="button" onClick={() => imageRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 dark:bg-navy-900/90 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <UploadCloud size={13}/> Changer
                  </button>
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview('') }}
                    className="p-1.5 bg-red-500 rounded-lg text-white hover:bg-red-600">
                    <X size={13}/>
                  </button>
                </div>
                {imageFile && (
                  <div className="absolute bottom-2 left-2 text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-semibold">
                    Nouveau fichier
                  </div>
                )}
              </div>
            ) : (
              <div onClick={() => imageRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-navy-600 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-navy-800/40 transition-all">
                <UploadCloud size={24} className="mx-auto mb-2 text-slate-300 dark:text-navy-600"/>
                <p className="text-sm text-slate-500">Glisser une image ou <span className="text-blue-500 font-medium">parcourir</span></p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP · max 8 MB</p>
              </div>
            )}
          </div>

          <Field label="Description">
            <textarea {...register('description')} rows={3} className={`${inp} resize-none`}/>
          </Field>

          <Field label="Tags (séparés par virgules)">
            <input {...register('tags')} className={inp} placeholder="R+28, HQE, 45 000 m²"/>
          </Field>

          {/* Jalons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Jalons</label>
              <button type="button" onClick={() => mAppend({ title: '', date: '', done: false })}
                className="text-xs text-blue-500 hover:text-blue-600 font-semibold flex items-center gap-1">
                <Plus size={11}/> Ajouter
              </button>
            </div>
            {mFields.length === 0 && <p className="text-xs text-slate-400 italic">Aucun jalon défini</p>}
            <div className="space-y-2">
              {mFields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-2">
                  <input {...register(`milestones.${i}.done`)} type="checkbox" className="w-4 h-4 rounded accent-blue-500 shrink-0"/>
                  <input {...register(`milestones.${i}.title`)} placeholder="Titre du jalon" className={`${inp} flex-1`}/>
                  <input {...register(`milestones.${i}.date`)} type="date" className={`${inp} w-36 shrink-0`}/>
                  <button type="button" onClick={() => mRemove(i)} className="text-slate-400 hover:text-red-500 shrink-0">
                    <Trash2 size={13}/>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" disabled={saving} onClick={() => setEditModal(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800 disabled:opacity-50">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60 min-w-[130px] justify-center">
              {saving && <Loader2 size={14} className="animate-spin"/>}
              {uploadingImg ? 'Upload image…' : saving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
