import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { Loader2, FolderKanban, Plus, Pencil, Trash2, CheckCircle2, Circle, Calendar, TrendingUp, X, UserCheck, UploadCloud, ClipboardList, ArrowRight } from 'lucide-react'
import Modal from '../components/Modal'
import { adminProjects, adminClients, adminTasks } from '../adminApi'

const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children, error }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">Requis</p>}
  </div>
)

const CATEGORIES = ['Construction', 'Génie Civil', 'Immobilier', 'Rénovation', 'Travaux Publics', 'Voirie']

const STATUS_CONFIG = {
  pending:   { label: 'En attente',  cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',    bar: 'bg-slate-400' },
  active:    { label: 'En cours',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',        bar: 'bg-blue-500' },
  suspended: { label: 'Suspendu',    cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400', bar: 'bg-orange-400' },
  completed: { label: 'Terminé',     cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',    bar: 'bg-emerald-500' },
}

const fmt = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)
const fmtK = n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n/1000)}k` : String(n || 0)

export default function AdminProjects() {
  const navigate                = useNavigate()
  const [data, setData]         = useState([])
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [detail, setDetail]     = useState(null)
  const [detailTab, setDetailTab] = useState('info')
  const [statusFilter, setStatusFilter] = useState('all')
  // Tâches du projet sélectionné (panneau latéral)
  const [sidebarTasks,    setSidebarTasks]    = useState([])
  const [tasksLoading,    setTasksLoading]    = useState(false)
  // Image principale (modal création/édition)
  const [imageFile,     setImageFile]     = useState(null)   // File object
  const [imagePreview,  setImagePreview]  = useState('')     // URL d'aperçu
  const [uploadingImg,  setUploadingImg]  = useState(false)
  const imageInputRef = useRef()

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm()
  const { fields: mFields, append: mAppend, remove: mRemove } = useFieldArray({ control, name: 'milestones' })
  const progress = watch('progress', 0)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminProjects.getAll(); setData(r.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => {
    load()
    adminClients.getAll().then(r => setClients(r.data)).catch(() => {})
  }, [load])

  const openAdd = () => {
    setEditing(null)
    reset({ status: 'active', progress: 0, category: 'Construction', year: new Date().getFullYear(), milestones: [] })
    setImageFile(null); setImagePreview('')
    setModal(true)
  }
  const openEdit = p => {
    setEditing(p)
    reset({
      ...p,
      client:       p.client?._id || p.client || '',
      tags:         p.tags?.join(', '),
      deliveryDate: p.deliveryDate?.split?.('T')[0],
      milestones:   p.milestones || [],
    })
    setImageFile(null)
    setImagePreview(p.image || '')   // afficher l'image existante
    setModal(true)
  }
  const close = () => {
    setModal(false); setEditing(null)
    setImageFile(null); setImagePreview('')
  }

  const onSubmit = async (v) => {
    setSaving(true)
    const selectedClient = clients.find(c => c._id === v.client)
    const payload = {
      ...v,
      client:       v.client || null,
      clientName:   selectedClient?.name || v.clientName || '',
      year:         Number(v.year),
      progress:     Number(v.progress || 0),
      budgetAmount: Number(v.budgetAmount || 0),
      spent:        Number(v.spent || 0),
      tags:         v.tags ? v.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      // Si un nouveau fichier est en attente, garder l'ancienne image pour l'instant
      image:        imageFile ? (editing?.image || '') : imagePreview,
    }
    try {
      let result
      if (editing) result = await adminProjects.update(editing._id, payload)
      else         result = await adminProjects.create(payload)

      // Upload l'image principale si un fichier a été sélectionné
      if (imageFile) {
        setUploadingImg(true)
        const fd = new FormData()
        fd.append('image', imageFile)
        await adminProjects.uploadImage(result.data._id, fd)
        setUploadingImg(false)
      }

      await load(); close()
    } catch (e) {
      console.error(e)
      setUploadingImg(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce projet ?')) return
    setDeleting(id)
    try { await adminProjects.delete(id); if (detail?._id === id) setDetail(null); await load() } finally { setDeleting(null) }
  }

  // Charger les tâches quand on sélectionne l'onglet "tasks"
  useEffect(() => {
    if (detailTab !== 'tasks' || !detail) return
    setTasksLoading(true)
    setSidebarTasks([])
    adminTasks.getByProject(detail._id)
      .then(r => setSidebarTasks(r.data))
      .catch(() => setSidebarTasks([]))
      .finally(() => setTasksLoading(false))
  }, [detailTab, detail])


  const filtered = data.filter(p => statusFilter === 'all' || p.status === statusFilter)

  // Stats
  const active    = data.filter(p => p.status === 'active').length
  const completed = data.filter(p => p.status === 'completed').length
  const totalBudget = data.reduce((s, p) => s + (p.budgetAmount || 0), 0)
  const avgProgress = data.length ? Math.round(data.reduce((s, p) => s + (p.progress || 0), 0) / data.length) : 0

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Projets</h1>
            <p className="text-slate-500 text-sm mt-1">{data.length} projet{data.length > 1 ? 's' : ''} · {active} en cours</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors">
            <Plus size={15}/> Nouveau projet
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total',         val: data.length,            color: 'bg-blue-500',    icon: FolderKanban },
            { label: 'En cours',      val: active,                 color: 'bg-emerald-500', icon: TrendingUp },
            { label: 'Terminés',      val: completed,              color: 'bg-violet-500',  icon: CheckCircle2 },
            { label: 'Budget total',  val: fmtK(totalBudget)+' MAD', color: 'bg-amber-500', icon: TrendingUp },
          ].map(({ label, val, color, icon: Icon }) => (
            <div key={label} className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
              <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center mb-2`}>
                <Icon size={14} className="text-white"/>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">{val}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {[['all', 'Tous'], ...Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])].map(([k, l]) => (
            <button key={k} onClick={() => setStatusFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === k ? 'bg-blue-500 text-white' : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 hover:border-blue-300'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Project grid + detail panel */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Cards */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 text-slate-400">
                <FolderKanban size={32} className="mx-auto mb-3 opacity-30"/>
                <p className="text-sm">Aucun projet{statusFilter !== 'all' ? ' dans ce statut' : ''}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(p => {
                  const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.active
                  const budgetUsed = p.budgetAmount ? Math.round((p.spent || 0) / p.budgetAmount * 100) : 0
                  return (
                    <div key={p._id}
                      onClick={() => setDetail(p)}
                      className={`bg-white dark:bg-navy-900 rounded-2xl border ${detail?._id === p._id ? 'border-blue-400 dark:border-blue-500' : 'border-slate-200 dark:border-navy-700'} p-5 cursor-pointer hover:border-blue-300 dark:hover:border-blue-500/50 transition-all`}>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          {p.image && <img src={p.image} alt="" className="w-full h-28 object-cover rounded-xl mb-3"/>}
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                            {p.category && <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-navy-700 px-2 py-0.5 rounded-full">{p.category}</span>}
                          </div>
                          <h3 className="font-bold text-slate-900 dark:text-white truncate">{p.title}</h3>
                          {p.clientName && (
                            <button
                              onClick={e => { e.stopPropagation(); if (p.client) navigate(`/admin/clients/${p.client?._id || p.client}`) }}
                              className={`text-xs mt-0.5 flex items-center gap-1 ${p.client ? 'text-blue-500 hover:underline cursor-pointer' : 'text-slate-500 cursor-default'}`}>
                              <UserCheck size={10}/>{p.clientName}
                            </button>
                          )}
                          {p.location && <p className="text-xs text-slate-400">{p.location}{p.year ? ` · ${p.year}` : ''}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={e => { e.stopPropagation(); openEdit(p) }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                            <Pencil size={13}/>
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(p._id) }} disabled={deleting === p._id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                            {deleting === p._id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Avancement</span>
                          <span className={`font-bold ${sc.bar === 'bg-emerald-500' ? 'text-emerald-500' : 'text-blue-500'}`}>{p.progress || 0}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                          <div className={`h-full ${sc.bar} rounded-full transition-all`} style={{ width: `${p.progress || 0}%` }}/>
                        </div>
                      </div>

                      {/* Budget */}
                      {p.budgetAmount > 0 && (
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                          <span>Budget : <span className="font-semibold text-slate-700 dark:text-slate-200">{fmtK(p.budgetAmount)} MAD</span></span>
                          {p.spent > 0 && <span>Dépensé : <span className="font-semibold text-orange-500">{fmtK(p.spent)} MAD ({budgetUsed}%)</span></span>}
                        </div>
                      )}

                      {/* Delivery */}
                      {p.deliveryDate && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                          <Calendar size={11}/> Livraison : {new Date(p.deliveryDate).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-1">
            {!detail ? (
              <div className="h-64 flex items-center justify-center bg-white dark:bg-navy-900 rounded-2xl border border-dashed border-slate-200 dark:border-navy-700 text-slate-400">
                <div className="text-center">
                  <FolderKanban size={32} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-sm">Sélectionner un projet</p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden sticky top-5">
                {detail.image && <img src={detail.image} alt="" className="w-full h-36 object-cover"/>}
                {/* Tabs + lien fiche */}
                <div className="flex items-center border-b border-slate-100 dark:border-navy-700 px-4 pt-2">
                  <div className="flex flex-1">
                    {[
                      ['info',  'Infos'],
                      ['tasks', `Tâches${sidebarTasks.length ? ` (${sidebarTasks.length})` : ''}`],
                    ].map(([k, l]) => (
                      <button key={k} onClick={() => setDetailTab(k)}
                        className={`px-3 pb-2.5 text-xs font-semibold border-b-2 transition-colors ${detailTab === k ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => navigate(`/admin/projects/${detail._id}`)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-blue-500 hover:text-blue-600 pb-2.5 transition-colors shrink-0">
                    Fiche complète <ArrowRight size={10}/>
                  </button>
                </div>

                {/* Infos tab */}
                {detailTab === 'info' && (
                  <div className="p-5 space-y-4">
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(STATUS_CONFIG[detail.status] || STATUS_CONFIG.active).cls}`}>
                        {(STATUS_CONFIG[detail.status] || STATUS_CONFIG.active).label}
                      </span>
                      <h3 className="font-black text-slate-900 dark:text-white text-lg mt-2">{detail.title}</h3>
                      {detail.clientName && (
                        <button
                          onClick={() => { if (detail.client) navigate(`/admin/clients/${detail.client?._id || detail.client}`) }}
                          className={`text-sm flex items-center gap-1.5 mt-0.5 ${detail.client ? 'text-blue-500 hover:underline' : 'text-slate-500 cursor-default'}`}>
                          <UserCheck size={13}/>{detail.clientName}
                        </button>
                      )}
                      {detail.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{detail.description}</p>}
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-500 font-semibold">Avancement</span>
                        <span className="font-black text-blue-500">{detail.progress || 0}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                        <div className={`h-full ${(STATUS_CONFIG[detail.status]?.bar) || 'bg-blue-500'} rounded-full`} style={{ width: `${detail.progress || 0}%` }}/>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {detail.location && <div><p className="text-slate-400">Lieu</p><p className="font-semibold text-slate-700 dark:text-slate-200">{detail.location}</p></div>}
                      {detail.year && <div><p className="text-slate-400">Année</p><p className="font-semibold text-slate-700 dark:text-slate-200">{detail.year}</p></div>}
                      {detail.budgetAmount > 0 && <div><p className="text-slate-400">Budget</p><p className="font-semibold text-slate-700 dark:text-slate-200">{fmtK(detail.budgetAmount)} MAD</p></div>}
                      {detail.spent > 0 && <div><p className="text-slate-400">Dépensé</p><p className="font-semibold text-orange-500">{fmtK(detail.spent)} MAD</p></div>}
                      {detail.duration && <div><p className="text-slate-400">Durée</p><p className="font-semibold text-slate-700 dark:text-slate-200">{detail.duration}</p></div>}
                      {detail.deliveryDate && <div><p className="text-slate-400">Livraison</p><p className="font-semibold text-slate-700 dark:text-slate-200">{new Date(detail.deliveryDate).toLocaleDateString('fr-FR')}</p></div>}
                    </div>

                    {/* Tags */}
                    {detail.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {detail.tags.map(t => (
                          <span key={t} className="text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">{t}</span>
                        ))}
                      </div>
                    )}

                    {/* Milestones */}
                    {detail.milestones?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Jalons</p>
                        <div className="space-y-2">
                          {detail.milestones.map((m, i) => (
                            <div key={i} className="flex items-center gap-2">
                              {m.done
                                ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0"/>
                                : <Circle size={14} className="text-slate-300 dark:text-navy-600 shrink-0"/>}
                              <span className={`text-xs flex-1 ${m.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{m.title}</span>
                              {m.date && <span className="text-[10px] text-slate-400">{new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tâches tab */}
                {detailTab === 'tasks' && (
                  <div className="p-4">
                    {tasksLoading ? (
                      <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-blue-500"/></div>
                    ) : sidebarTasks.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <ClipboardList size={24} className="mx-auto mb-2 opacity-30"/>
                        <p className="text-xs font-semibold">Aucune tâche liée</p>
                        <p className="text-[10px] mt-1 text-slate-400">Assignez ce projet dans Tâches Kanban</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {['todo', 'in-progress', 'review', 'done'].map(status => {
                          const statusTasks = sidebarTasks.filter(t => t.status === status)
                          if (!statusTasks.length) return null
                          const labels = { todo: 'À faire', 'in-progress': 'En cours', review: 'Révision', done: 'Terminé' }
                          const dots   = { todo: 'bg-slate-400', 'in-progress': 'bg-blue-500', review: 'bg-amber-500', done: 'bg-emerald-500' }
                          return (
                            <div key={status}>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dots[status]}`}/>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                  {labels[status]} ({statusTasks.length})
                                </p>
                              </div>
                              {statusTasks.map(task => (
                                <div key={task._id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-800 mb-1">
                                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                    { low: 'bg-slate-400', medium: 'bg-blue-500', high: 'bg-orange-500', urgent: 'bg-red-500' }[task.priority] || 'bg-slate-400'
                                  }`}/>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-medium leading-tight ${status === 'done' ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                      {task.title}
                                    </p>
                                    {task.employeeRef && (
                                      <p className="text-[10px] text-slate-400 mt-0.5">
                                        {task.employeeRef.firstName} {task.employeeRef.lastName}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Raccourci vers Photos + Gantt → fiche complète */}
                {(detailTab === 'photos' || detailTab === 'gantt') && null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={close} title={editing ? 'Modifier le projet' : 'Nouveau projet'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Titre *" error={errors.title}>
              <input {...register('title', { required: true })} className={inp} placeholder="Tour Horizon – Phase 2"/>
            </Field>
            <Field label="Client">
              <select {...register('client')} className={inp}>
                <option value="">— Aucun client —</option>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Catégorie *" error={errors.category}>
              <select {...register('category', { required: true })} className={inp}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Statut">
              <select {...register('status')} className={inp}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Année">
              <input {...register('year', { valueAsNumber: true })} type="number" className={inp} placeholder="2024"/>
            </Field>
          </div>

          {/* Progress slider */}
          <Field label={`Avancement : ${progress || 0}%`}>
            <input {...register('progress', { valueAsNumber: true })} type="range" min="0" max="100" step="1"
              className="w-full h-2 bg-slate-200 dark:bg-navy-700 rounded-full appearance-none cursor-pointer accent-blue-500"/>
          </Field>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Lieu">
              <input {...register('location')} className={inp} placeholder="Casablanca, Maroc"/>
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
              <input {...register('budgetAmount', { valueAsNumber: true })} type="number" className={inp} placeholder="5000000"/>
            </Field>
            <Field label="Dépensé à ce jour (MAD)">
              <input {...register('spent', { valueAsNumber: true })} type="number" className={inp} placeholder="2300000"/>
            </Field>
          </div>

          {/* Image principale — upload fichier */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Image principale</label>
            <input type="file" ref={imageInputRef} accept="image/*" className="hidden"
              onChange={e => {
                const file = e.target.files[0]
                if (!file) return
                setImageFile(file)
                setImagePreview(URL.createObjectURL(file))
                e.target.value = ''
              }}
            />
            {imagePreview ? (
              /* Prévisualisation */
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-navy-600 group">
                <img src={imagePreview} alt="Aperçu" className="w-full h-44 object-cover"/>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 dark:bg-navy-900/90 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white transition-colors">
                    <UploadCloud size={13}/> Changer
                  </button>
                  <button type="button"
                    onClick={() => { setImageFile(null); setImagePreview('') }}
                    className="p-1.5 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors">
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
              /* Zone de drop */
              <div
                onClick={() => imageInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-navy-600 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-navy-800/40 transition-all"
              >
                <UploadCloud size={24} className="mx-auto mb-2 text-slate-300 dark:text-navy-600"/>
                <p className="text-sm text-slate-500">Glisser une image ou <span className="text-blue-500 font-medium">parcourir</span></p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP · max 8 MB</p>
              </div>
            )}
          </div>

          <Field label="Description">
            <textarea {...register('description')} rows={3} className={`${inp} resize-none`} placeholder="Description du projet…"/>
          </Field>

          <Field label="Tags (séparés par virgules)">
            <input {...register('tags')} className={inp} placeholder="R+28, Certifié HQE, 45 000 m²"/>
          </Field>

          {/* Milestones */}
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
                  <input {...register(`milestones.${i}.done`)} type="checkbox"
                    className="w-4 h-4 rounded accent-blue-500 shrink-0"/>
                  <input {...register(`milestones.${i}.title`)} placeholder="Titre du jalon" className={`${inp} flex-1`}/>
                  <input {...register(`milestones.${i}.date`)} type="date" className={`${inp} w-36 shrink-0`}/>
                  <button type="button" onClick={() => mRemove(i)}
                    className="text-slate-400 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 size={13}/>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} disabled={saving} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800 disabled:opacity-50">Annuler</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60 min-w-[120px] justify-center">
              {saving && <Loader2 size={14} className="animate-spin"/>}
              {uploadingImg ? 'Upload image…' : saving ? 'Sauvegarde…' : editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
