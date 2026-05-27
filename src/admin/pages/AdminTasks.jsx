import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, CheckSquare, Plus, Pencil, Trash2, Clock,
  User, FolderOpen, AlertTriangle, Search, X, Filter,
  ChevronDown, GripVertical,
} from 'lucide-react'
import { adminTasks, adminEmployees, adminProjects } from '../adminApi'
import Modal from '../components/Modal'

/* ── Constantes ─────────────────────────────────────────────────────────── */
const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
  </div>
)

const STATUSES = [
  { key: 'todo',        label: 'À Faire',  color: 'bg-slate-50 dark:bg-navy-950/40',    head: 'bg-slate-100 dark:bg-navy-800',      dot: 'bg-slate-400',   ring: 'ring-slate-300 dark:ring-slate-600',   count: 'bg-slate-400 text-white' },
  { key: 'in-progress', label: 'En Cours', color: 'bg-blue-50/60 dark:bg-blue-500/5',   head: 'bg-blue-100 dark:bg-blue-500/15',    dot: 'bg-blue-500',    ring: 'ring-blue-400 dark:ring-blue-500',    count: 'bg-blue-500 text-white' },
  { key: 'review',      label: 'Révision', color: 'bg-orange-50/60 dark:bg-orange-500/5',head:'bg-orange-100 dark:bg-orange-500/15', dot: 'bg-orange-500',  ring: 'ring-orange-400 dark:ring-orange-500', count: 'bg-orange-500 text-white' },
  { key: 'done',        label: 'Terminé',  color: 'bg-emerald-50/60 dark:bg-emerald-500/5',head:'bg-emerald-100 dark:bg-emerald-500/15',dot:'bg-emerald-500',ring: 'ring-emerald-400 dark:ring-emerald-500',count: 'bg-emerald-500 text-white' },
]

const PRIORITY = {
  urgent: { label: 'Urgent', cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',          dot: 'bg-red-500' },
  high:   { label: 'Haute',  cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400', dot: 'bg-orange-500' },
  medium: { label: 'Moyenne',cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',        dot: 'bg-blue-500' },
  low:    { label: 'Basse',  cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',    dot: 'bg-slate-400' },
}

function PriorityBadge({ p }) {
  const d = PRIORITY[p] || PRIORITY.medium
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide flex items-center gap-1 w-fit ${d.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${d.dot}`}/>{d.label}
    </span>
  )
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'done') return false
  return new Date(dueDate) < new Date()
}

function getDaysLeft(dueDate, status) {
  if (!dueDate || status === 'done') return null
  return Math.ceil((new Date(dueDate) - new Date()) / 86400000)
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function AdminTasks() {
  const navigate = useNavigate()
  const [tasks, setTasks]       = useState([])
  const [employees, setEmployees] = useState([])
  const [projects, setProjects]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)

  // ── Drag & Drop state ──────────────────────────────────────────────────
  const [dragging, setDragging]   = useState(null)   // taskId en cours de drag
  const [dragOver, setDragOver]   = useState(null)   // colonne survoleé
  const dragTask                  = useRef(null)

  // ── Filtres ────────────────────────────────────────────────────────────
  const [search, setSearch]             = useState('')
  const [filterPriority, setFilterPrio] = useState('all')
  const [filterAssignee, setFilterAsgn] = useState('all')
  const [filterProject, setFilterPrj]   = useState('all')
  const [filtersOpen, setFiltersOpen]   = useState(false)

  const { register, handleSubmit, reset } = useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminTasks.getAll(); setTasks(r.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => {
    load()
    adminEmployees.getAll().then(r => setEmployees(r.data.filter(e => e.status === 'Actif'))).catch(() => {})
    adminProjects.getAll().then(r => setProjects(r.data)).catch(() => {})
  }, [load])

  /* ── CRUD ── */
  const openAdd  = (status = 'todo') => { setEditing(null); reset({ status, priority: 'medium' }); setModal(true) }
  const openEdit = t => {
    setEditing(t)
    reset({
      ...t,
      dueDate:     t.dueDate ? t.dueDate.split('T')[0] : '',
      employeeRef: t.employeeRef?._id || t.employeeRef || '',
      projectRef:  t.projectRef?._id  || t.projectRef  || '',
    })
    setModal(true)
  }
  const close    = () => { setModal(false); setEditing(null) }

  const onSubmit = async (v) => {
    setSaving(true)
    const emp = employees.find(e => e._id === v.employeeRef)
    const prj = projects.find(p => p._id === v.projectRef)
    const payload = {
      ...v,
      employeeRef: v.employeeRef || null,
      projectRef:  v.projectRef  || null,
      assignee:    emp ? `${emp.firstName} ${emp.lastName}` : v.assignee || '',
      project:     prj?.title || v.project || '',
    }
    try {
      if (editing) await adminTasks.update(editing._id, payload)
      else         await adminTasks.create(payload)
      await load(); close()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette tâche ?')) return
    setDeleting(id)
    try { await adminTasks.delete(id); await load() } finally { setDeleting(null) }
  }

  /* ── Drag & Drop handlers ── */
  const onDragStart = (e, taskId) => {
    dragTask.current = taskId
    setDragging(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
  }

  const onDragEnd = () => {
    setDragging(null)
    setDragOver(null)
    dragTask.current = null
  }

  const onDragOver = (e, colKey) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOver !== colKey) setDragOver(colKey)
  }

  const onDrop = async (e, colKey) => {
    e.preventDefault()
    const taskId = dragTask.current || e.dataTransfer.getData('text/plain')
    setDragOver(null)
    setDragging(null)
    if (!taskId) return
    const task = tasks.find(t => t._id === taskId)
    if (!task || task.status === colKey) return
    // Optimistic update
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: colKey } : t))
    try {
      await adminTasks.updateStatus(taskId, colKey)
    } catch {
      // Rollback on error
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: task.status } : t))
    }
  }

  /* ── Filtres dérivés ── */
  const allAssignees = [...new Set(tasks.map(t => t.assignee).filter(Boolean))].sort()
  const allProjects  = [...new Set(tasks.map(t => t.project).filter(Boolean))].sort()

  const activeFilters = [
    filterPriority !== 'all',
    filterAssignee !== 'all',
    filterProject  !== 'all',
    search.length > 0,
  ].filter(Boolean).length

  const resetFilters = () => {
    setSearch(''); setFilterPrio('all'); setFilterAsgn('all'); setFilterPrj('all')
  }

  const byStatus = (key) => tasks
    .filter(t => t.status === key)
    .filter(t => filterPriority === 'all' || t.priority === filterPriority)
    .filter(t => filterAssignee === 'all' || t.assignee === filterAssignee)
    .filter(t => filterProject  === 'all' || t.project  === filterProject)
    .filter(t => !search || [t.title, t.description, t.assignee, t.project]
      .some(v => v?.toLowerCase().includes(search.toLowerCase())))

  const totalActive = tasks.filter(t => t.status !== 'done').length
  const overdueCount = tasks.filter(t => isOverdue(t.dueDate, t.status)).length

  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <div className="space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Tâches</h1>
            <p className="text-sm mt-1 flex items-center gap-3">
              <span className="text-slate-500">{totalActive} active{totalActive > 1 ? 's' : ''} · {byStatus('done').length} terminée{byStatus('done').length > 1 ? 's' : ''}</span>
              {overdueCount > 0 && <span className="text-red-500 font-semibold flex items-center gap-1"><AlertTriangle size={12}/>{overdueCount} en retard</span>}
            </p>
          </div>
          <button onClick={() => openAdd()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/25">
            <Plus size={15}/> Nouvelle tâche
          </button>
        </div>

        {/* ── Barre de filtres ── */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-3 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une tâche…"
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12}/>
              </button>
            )}
          </div>

          {/* Toggle filtres avancés */}
          <button onClick={() => setFiltersOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              activeFilters > 0
                ? 'bg-blue-500 text-white border-blue-500'
                : 'border-slate-200 dark:border-navy-600 text-slate-600 dark:text-slate-300 hover:border-blue-300'
            }`}>
            <Filter size={13}/>
            Filtres {activeFilters > 0 && `(${activeFilters})`}
            <ChevronDown size={12} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`}/>
          </button>

          {activeFilters > 0 && (
            <button onClick={resetFilters} className="text-xs text-slate-400 hover:text-red-500 font-medium flex items-center gap-1 transition-colors">
              <X size={12}/> Réinitialiser
            </button>
          )}

          {/* Filtres avancés */}
          {filtersOpen && (
            <div className="w-full flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-navy-700 mt-1">
              {/* Priorité */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Priorité :</span>
                {[['all', 'Toutes'], ['urgent', 'Urgent'], ['high', 'Haute'], ['medium', 'Moyenne'], ['low', 'Basse']].map(([k, l]) => (
                  <button key={k} onClick={() => setFilterPrio(k)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      filterPriority === k ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-navy-700'
                    }`}>
                    {l}
                  </button>
                ))}
              </div>

              {/* Assigné */}
              {allAssignees.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Assigné :</span>
                  <button onClick={() => setFilterAsgn('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${filterAssignee === 'all' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                    Tous
                  </button>
                  {allAssignees.map(a => (
                    <button key={a} onClick={() => setFilterAsgn(a)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${filterAssignee === a ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              )}

              {/* Projet */}
              {allProjects.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Projet :</span>
                  <button onClick={() => setFilterPrj('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${filterProject === 'all' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                    Tous
                  </button>
                  {allProjects.map(p => (
                    <button key={p} onClick={() => setFilterPrj(p)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${filterProject === p ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Kanban board ── */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {STATUSES.map(col => {
              const colTasks  = byStatus(col.key)
              const isTarget  = dragOver === col.key
              return (
                <div
                  key={col.key}
                  onDragOver={e => onDragOver(e, col.key)}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => onDrop(e, col.key)}
                  className={`rounded-2xl border-2 overflow-hidden flex flex-col transition-all duration-150 ${
                    isTarget
                      ? `ring-2 ${col.ring} border-transparent scale-[1.01]`
                      : 'border-slate-200 dark:border-navy-700'
                  }`}
                >
                  {/* Column header */}
                  <div className={`${col.head} px-4 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${col.dot}`}/>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{col.label}</span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${col.count}`}>{colTasks.length}</span>
                  </div>

                  {/* Cards drop zone */}
                  <div className={`flex-1 p-3 space-y-2.5 min-h-[200px] transition-colors ${
                    isTarget ? 'bg-blue-50/50 dark:bg-blue-500/5' : col.color
                  }`}>
                    {colTasks.length === 0 && !isTarget ? (
                      <div className="flex items-center justify-center h-20 text-slate-300 dark:text-navy-700 text-xs italic">
                        {dragging ? 'Déposer ici' : 'Vide'}
                      </div>
                    ) : isTarget && colTasks.length === 0 ? (
                      <div className="flex items-center justify-center h-20 border-2 border-dashed border-blue-300 dark:border-blue-500/50 rounded-xl text-blue-400 text-xs font-semibold">
                        Déposer ici
                      </div>
                    ) : (
                      <>
                        {isTarget && (
                          <div className="h-1.5 bg-blue-400 rounded-full opacity-60 mx-2"/>
                        )}
                        {colTasks.map(task => {
                          const overdue  = isOverdue(task.dueDate, task.status)
                          const daysLeft = getDaysLeft(task.dueDate, task.status)
                          const isDragged = dragging === task._id
                          return (
                            <div
                              key={task._id}
                              draggable
                              onDragStart={e => onDragStart(e, task._id)}
                              onDragEnd={onDragEnd}
                              className={`bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-700 p-3.5 shadow-sm transition-all group select-none ${
                                isDragged
                                  ? 'opacity-40 scale-95 shadow-lg rotate-1'
                                  : 'hover:shadow-md hover:-translate-y-0.5 cursor-grab active:cursor-grabbing'
                              }`}
                            >
                              {/* Priority + actions */}
                              <div className="flex items-start justify-between gap-2 mb-2.5">
                                <PriorityBadge p={task.priority}/>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => openEdit(task)}
                                    className="p-1 rounded text-slate-400 hover:text-blue-500 transition-colors">
                                    <Pencil size={12}/>
                                  </button>
                                  <button onClick={() => handleDelete(task._id)} disabled={deleting === task._id}
                                    className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40">
                                    {deleting === task._id ? <Loader2 size={12} className="animate-spin"/> : <Trash2 size={12}/>}
                                  </button>
                                  <div className="p-1 text-slate-200 dark:text-navy-700 cursor-grab">
                                    <GripVertical size={12}/>
                                  </div>
                                </div>
                              </div>

                              {/* Title */}
                              <p className={`text-sm font-semibold leading-snug mb-2 ${
                                task.status === 'done'
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-white'
                              }`}>
                                {task.title}
                              </p>

                              {/* Description */}
                              {task.description && (
                                <p className="text-xs text-slate-400 leading-relaxed mb-2.5 line-clamp-2">{task.description}</p>
                              )}

                              {/* Meta */}
                              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-navy-700/60">
                                {task.project && (
                                  <button
                                    onClick={() => task.projectRef
                                      ? navigate(`/admin/projects`)
                                      : navigate('/admin/projects')}
                                    className="flex items-center gap-1.5 text-[11px] text-blue-500 hover:underline w-full text-left">
                                    <FolderOpen size={11} className="shrink-0 text-blue-400"/>
                                    <span className="truncate">{task.projectRef?.title || task.project}</span>
                                  </button>
                                )}
                                {task.assignee && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                    {task.employeeRef?.photo
                                      ? <img src={task.employeeRef.photo} alt="" className="w-4 h-4 rounded-full object-cover shrink-0"/>
                                      : (
                                        <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0 text-[8px] font-bold text-blue-600">
                                          {task.assignee.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                                        </div>
                                      )
                                    }
                                    <span className="truncate">{task.assignee}</span>
                                  </div>
                                )}
                                {task.dueDate && (
                                  <div className={`flex items-center gap-1.5 text-[11px] font-medium ${
                                    overdue ? 'text-red-500' : daysLeft !== null && daysLeft <= 3 ? 'text-orange-500' : 'text-slate-400'
                                  }`}>
                                    {overdue
                                      ? <AlertTriangle size={11} className="shrink-0"/>
                                      : <Clock size={11} className="shrink-0"/>}
                                    {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                                    {overdue && <span className="ml-1 text-[9px] font-black bg-red-100 dark:bg-red-500/15 text-red-500 px-1 py-0.5 rounded">En retard</span>}
                                    {!overdue && daysLeft === 0 && <span className="ml-1 text-[9px] font-black bg-orange-100 dark:bg-orange-500/15 text-orange-500 px-1 py-0.5 rounded">Aujourd'hui</span>}
                                    {!overdue && daysLeft === 1 && <span className="ml-1 text-[9px] font-black bg-amber-100 dark:bg-amber-500/15 text-amber-500 px-1 py-0.5 rounded">Demain</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </>
                    )}

                    {/* Add button */}
                    <button onClick={() => openAdd(col.key)}
                      className="w-full py-2 rounded-xl border border-dashed border-slate-200 dark:border-navy-700 text-xs text-slate-400 hover:text-blue-500 hover:border-blue-300 dark:hover:border-blue-500/40 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all flex items-center justify-center gap-1.5">
                      <Plus size={12}/> Ajouter
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      <Modal open={modal} onClose={close} title={editing ? 'Modifier la tâche' : 'Nouvelle tâche'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Titre *">
            <input {...register('title', { required: true })} className={inp} placeholder="Réunion chantier Tour Horizon"/>
          </Field>
          <Field label="Description">
            <textarea {...register('description')} rows={2} className={`${inp} resize-none`} placeholder="Détails de la tâche…"/>
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Priorité">
              <select {...register('priority')} className={inp}>
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </Field>
            <Field label="Statut">
              <select {...register('status')} className={inp}>
                <option value="todo">À faire</option>
                <option value="in-progress">En cours</option>
                <option value="review">Révision</option>
                <option value="done">Terminé</option>
              </select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Projet">
              <select {...register('projectRef')} className={inp}>
                <option value="">— Aucun projet —</option>
                {projects.map(p => (
                  <option key={p._id} value={p._id}>{p.title}</option>
                ))}
              </select>
            </Field>
            <Field label="Responsable">
              <select {...register('employeeRef')} className={inp}>
                <option value="">— Aucun responsable —</option>
                {employees.map(e => (
                  <option key={e._id} value={e._id}>{e.firstName} {e.lastName} — {e.role || e.department}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Date d'échéance">
            <input {...register('dueDate')} type="date" className={inp}/>
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
