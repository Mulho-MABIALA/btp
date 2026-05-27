import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  Loader2, ArrowLeft, Pencil, Trash2, Camera, UploadCloud,
  Mail, Phone, MapPin, Building2, Calendar, CreditCard,
  ClipboardList, Clock, CheckCircle2, AlertCircle, X,
  UserCheck, Activity, Umbrella, ChevronRight,
  TrendingUp, DollarSign, Users, FileText,
  Paperclip, Download, Tag, ShieldAlert, Plus,
} from 'lucide-react'
import { adminEmployees, adminTasks, adminAttendance, adminLeaves, adminDocuments } from '../adminApi'
import Modal from '../components/Modal'

/* ── Helpers ────────────────────────────────────────────────────────────── */
const inp   = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
  </div>
)
const fmt  = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)
const fmtD = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

const DEPARTMENTS = ['Direction', 'Chantier', "Bureau d'études", 'Comptabilité', 'Ressources humaines', 'Commercial', 'Logistique']
const CONTRACTS   = ['CDI', 'CDD', 'Intérim', 'Stage', 'Freelance']
const STATUSES    = ['Actif', 'Congé', 'Absent', 'Archivé']
const EMP_DOC_TYPES = ['Contrat de travail', 'CIN / Passeport', 'Diplôme / Formation', 'Attestation CNSS', 'Attestation de travail', 'Certificat médical', 'Autre']

const fmtSize = b => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} Mo` : `${Math.round(b / 1024)} Ko`
const fileIcon = mime => {
  if (!mime) return '📄'
  if (mime.includes('pdf')) return '📋'
  if (mime.includes('image')) return '🖼️'
  if (mime.includes('word') || mime.includes('document')) return '📝'
  if (mime.includes('sheet') || mime.includes('excel')) return '📊'
  return '📄'
}

const DEPT_COLOR = {
  'Direction':           'from-purple-500 to-violet-600',
  'Chantier':            'from-orange-400 to-amber-500',
  "Bureau d'études":     'from-blue-500 to-cyan-600',
  'Comptabilité':        'from-green-500 to-emerald-600',
  'Ressources humaines': 'from-pink-500 to-rose-600',
  'Commercial':          'from-teal-400 to-green-500',
  'Logistique':          'from-slate-500 to-gray-600',
}
const STATUS_STYLE = {
  'Actif':   'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  'Congé':   'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  'Absent':  'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  'Archivé': 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
}
const CONTRACT_STYLE = {
  'CDI':      'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
  'CDD':      'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  'Intérim':  'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  'Stage':    'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  'Freelance':'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
}
const TASK_STATUS = {
  'todo':        { label: 'À faire',  cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',       dot: 'bg-slate-400' },
  'in-progress': { label: 'En cours', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',           dot: 'bg-blue-500' },
  'review':      { label: 'Révision', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',   dot: 'bg-violet-500' },
  'done':        { label: 'Terminé',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', dot: 'bg-emerald-500' },
}
const TASK_PRIORITY = {
  low:    { label: 'Faible',  cls: 'bg-slate-100 text-slate-500' },
  medium: { label: 'Moyen',   cls: 'bg-blue-100 text-blue-600' },
  high:   { label: 'Haute',   cls: 'bg-orange-100 text-orange-600' },
  urgent: { label: 'Urgent',  cls: 'bg-red-100 text-red-600' },
}
const ATTEND_STATUS = {
  present:   { label: 'Présent',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  absent:    { label: 'Absent',     cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
  late:      { label: 'Retard',     cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400' },
  'half-day':{ label: 'Demi-jour',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  holiday:   { label: 'Férié',      cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
}
const LEAVE_STATUS = {
  pending:  { label: 'En attente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  approved: { label: 'Approuvé',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  rejected: { label: 'Refusé',    cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
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

/* ── Avatar ─────────────────────────────────────────────────────────────── */
function Avatar({ emp, size = 'xl' }) {
  const sz = {
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
  }[size]
  const grad = DEPT_COLOR[emp?.department] || 'from-blue-500 to-indigo-600'
  if (emp?.photo) return (
    <img src={emp.photo} alt={`${emp.firstName} ${emp.lastName}`}
      className={`${sz} rounded-3xl object-cover shrink-0 shadow-lg`}/>
  )
  return (
    <div className={`${sz} bg-gradient-to-br ${grad} rounded-3xl flex items-center justify-center text-white font-black shrink-0 shadow-lg`}>
      {(emp?.firstName?.[0] || '') + (emp?.lastName?.[0] || '')}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════════════════ */
export default function AdminEmployeeDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()

  /* State ─────────────────────────────────────────────────────────────── */
  const [emp, setEmp]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('taches')

  const [tasks, setTasks]             = useState([])
  const [attendance, setAttendance]   = useState([])
  const [leaves, setLeaves]           = useState([])
  const [documents, setDocuments]     = useState([])
  const [tabLoading, setTabLoading]   = useState(false)

  // Document upload (detail page)
  const [docUploading, setDocUploading]   = useState(false)
  const [pendingDocs, setPendingDocs]     = useState([])
  const detailDocRef = useRef()
  const [docSkills, setDocSkills]         = useState([])   // local skills state for edit modal
  const [skillInput, setSkillInput]       = useState('')
  const skillRef = useRef()

  // Attendance filter
  const [attendMonth, setAttendMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  // Modal
  const [modal, setModal]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Photo
  const [photoFile, setPhotoFile]       = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoRef     = useRef()
  const modalPhotoRef = useRef()

  // Toast
  const [toast, setToast] = useState(null)
  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const { register, handleSubmit, reset } = useForm()

  /* Load employee ─────────────────────────────────────────────────────── */
  const loadEmp = useCallback(async () => {
    setLoading(true)
    try {
      const r = await adminEmployees.getAll()
      const found = r.data.find(e => e._id === id)
      if (!found) { navigate('/admin/hr'); return }
      setEmp(found)
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { loadEmp() }, [loadEmp])

  /* Load tab data ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!emp) return
    const loadTab = async () => {
      setTabLoading(true)
      try {
        if (activeTab === 'taches') {
          const r = await adminTasks.getByEmployee(emp._id)
          setTasks(r.data)
        } else if (activeTab === 'pointage') {
          const r = await adminAttendance.getAll({ employee: emp._id, month: attendMonth })
          setAttendance(r.data)
        } else if (activeTab === 'conges') {
          const r = await adminLeaves.getAll({ employee: emp._id })
          setLeaves(r.data)
        } else if (activeTab === 'documents') {
          const r = await adminDocuments.getByEmployee(emp._id)
          setDocuments(r.data)
        }
      } catch { /* silent */ }
      finally { setTabLoading(false) }
    }
    loadTab()
  }, [emp?._id, activeTab, attendMonth])

  /* Photo upload ──────────────────────────────────────────────────────── */
  const handlePhotoUpload = async (file) => {
    if (!file) return
    setPhotoUploading(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const r = await adminEmployees.uploadPhoto(emp._id, fd)
      setEmp(r.data)
      showToast('Photo mise à jour')
    } catch { showToast('Erreur upload photo', 'error') }
    finally { setPhotoUploading(false) }
  }

  /* Modal ─────────────────────────────────────────────────────────────── */
  const openEdit = () => {
    setPhotoFile(null); setPhotoPreview(null)
    setDocSkills(emp.skills || []); setSkillInput('')
    reset({
      ...emp,
      startDate: emp.startDate?.split?.('T')[0],
      endDate:   emp.endDate?.split?.('T')[0],
      'emergencyContact.name':     emp.emergencyContact?.name     || '',
      'emergencyContact.phone':    emp.emergencyContact?.phone    || '',
      'emergencyContact.relation': emp.emergencyContact?.relation || '',
    })
    setModal(true)
  }
  const close = () => {
    setModal(false); setPhotoFile(null); setPhotoPreview(null)
    setDocSkills([]); setSkillInput('')
  }

  const onSubmit = async (v) => {
    setSaving(true)
    try {
      v.skills = docSkills
      v.emergencyContact = {
        name:     v['emergencyContact.name']     || '',
        phone:    v['emergencyContact.phone']    || '',
        relation: v['emergencyContact.relation'] || '',
      }
      delete v['emergencyContact.name']
      delete v['emergencyContact.phone']
      delete v['emergencyContact.relation']

      const r = await adminEmployees.update(emp._id, v)
      let updated = r.data
      if (photoFile) {
        const fd = new FormData()
        fd.append('photo', photoFile)
        const r2 = await adminEmployees.uploadPhoto(emp._id, fd)
        updated = r2.data
      }
      setEmp(updated)
      close()
      showToast('Employé mis à jour')
    } catch (e) { showToast(e?.response?.data?.error || 'Erreur', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer ${emp.firstName} ${emp.lastName} ?`)) return
    setDeleting(true)
    try { await adminEmployees.delete(emp._id); navigate('/admin/hr') }
    catch { showToast('Erreur suppression', 'error'); setDeleting(false) }
  }

  /* Computed ──────────────────────────────────────────────────────────── */
  const doneTasks    = tasks.filter(t => t.status === 'done').length
  const taskPct      = tasks.length ? Math.round(doneTasks / tasks.length * 100) : 0
  const activeTasks  = tasks.filter(t => t.status !== 'done').length
  const presentDays  = attendance.filter(a => a.status === 'present').length
  const totalHours   = attendance.reduce((s, a) => s + (a.hoursWorked || 0), 0)
  const approvedLeaves = leaves.filter(l => l.status === 'approved')
  const leaveDays    = approvedLeaves.reduce((s, l) => s + (l.days || 0), 0)

  const taskGroups = ['todo', 'in-progress', 'review', 'done'].map(s => ({
    status: s, items: tasks.filter(t => t.status === s),
  }))

  /* Attendance calendar helpers */
  const attendByDate = {}
  attendance.forEach(a => {
    const k = new Date(a.date).toISOString().slice(0, 10)
    attendByDate[k] = a
  })
  const calDays = (() => {
    if (!attendMonth) return []
    const [y, m] = attendMonth.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(y, m - 1, i + 1)
      const k = d.toISOString().slice(0, 10)
      return { date: d, key: k, record: attendByDate[k] || null }
    })
  })()

  /* ── Loading ────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-blue-500"/>
    </div>
  )
  if (!emp) return null

  const grad = DEPT_COLOR[emp.department] || 'from-blue-500 to-indigo-600'

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <>
      <div className="space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/admin/hr" className="hover:text-blue-500 transition-colors flex items-center gap-1">
            <ArrowLeft size={14}/> Employés
          </Link>
          <ChevronRight size={13} className="text-slate-300"/>
          <span className="text-slate-700 dark:text-white font-semibold">{emp.firstName} {emp.lastName}</span>
        </div>

        {/* ── Hero banner ──────────────────────────────────────────────── */}
        <div className={`bg-gradient-to-r ${grad} rounded-3xl p-6 sm:p-8 relative overflow-hidden`}>
          {/* Decorative circle */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none"/>
          <div className="absolute bottom-0 left-1/2 w-40 h-40 bg-black/5 rounded-full translate-y-1/2 pointer-events-none"/>

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar with upload */}
            <div className="relative group shrink-0">
              <Avatar emp={emp} size="xl"/>
              <button
                onClick={() => photoRef.current?.click()}
                disabled={photoUploading}
                className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {photoUploading
                  ? <Loader2 size={24} className="text-white animate-spin"/>
                  : <Camera size={24} className="text-white"/>}
              </button>
              <input ref={photoRef} type="file" accept="image/*" className="hidden"
                onChange={e => handlePhotoUpload(e.target.files[0])}/>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {emp.firstName} {emp.lastName}
              </h1>
              <p className="text-white/80 text-base mt-0.5">{emp.role || 'Sans fonction'}</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="flex items-center gap-1.5 text-sm text-white/70">
                  <Building2 size={13}/>{emp.department}
                </span>
                {emp.status && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
                    {emp.status}
                  </span>
                )}
                {emp.contractType && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
                    {emp.contractType}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 shrink-0">
              <button onClick={openEdit}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl transition-colors backdrop-blur-sm">
                <Pencil size={14}/> Modifier
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/80 hover:bg-red-500 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50">
                {deleting ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
              </button>
            </div>
          </div>

          {/* Contact bar */}
          <div className="relative flex flex-wrap gap-4 mt-5 pt-5 border-t border-white/20">
            {emp.email && (
              <a href={`mailto:${emp.email}`}
                className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors">
                <Mail size={14}/>{emp.email}
              </a>
            )}
            {emp.phone && (
              <a href={`tel:${emp.phone}`}
                className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors">
                <Phone size={14}/>{emp.phone}
              </a>
            )}
            {emp.address && (
              <span className="flex items-center gap-2 text-sm text-white/70">
                <MapPin size={14}/>{emp.address}
              </span>
            )}
            <span className="flex items-center gap-2 text-sm text-white/70 ml-auto font-bold">
              <DollarSign size={14}/>{fmt(emp.salary)} MAD/mois
            </span>
          </div>
        </div>

        {/* ── KPI Cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              icon: <ClipboardList size={18} className="text-blue-500"/>,
              bg: 'bg-blue-50 dark:bg-blue-500/10',
              val: activeTasks,
              label: 'Tâches actives',
              sub: `${taskPct}% complété`,
            },
            {
              icon: <Activity size={18} className="text-emerald-500"/>,
              bg: 'bg-emerald-50 dark:bg-emerald-500/10',
              val: presentDays,
              label: 'Jours présent',
              sub: `${totalHours}h ce mois`,
            },
            {
              icon: <Umbrella size={18} className="text-violet-500"/>,
              bg: 'bg-violet-50 dark:bg-violet-500/10',
              val: leaveDays,
              label: 'Jours de congé',
              sub: `${leaves.length} demande${leaves.length > 1 ? 's' : ''}`,
            },
            {
              icon: <Calendar size={18} className="text-orange-500"/>,
              bg: 'bg-orange-50 dark:bg-orange-500/10',
              val: emp.startDate ? Math.floor((Date.now() - new Date(emp.startDate)) / (365.25 * 24 * 3600 * 1000)) : '—',
              label: 'Années ancienneté',
              sub: emp.startDate ? `Depuis ${fmtD(emp.startDate)}` : 'Non renseigné',
            },
          ].map(({ icon, bg, val, label, sub }) => (
            <div key={label} className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>{icon}</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{val}</div>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-slate-100 dark:border-navy-700 overflow-x-auto">
            {[
              { id: 'taches',    label: 'Tâches',    icon: <ClipboardList size={14}/> },
              { id: 'pointage',  label: 'Pointage',  icon: <Activity size={14}/> },
              { id: 'conges',    label: 'Congés',    icon: <Umbrella size={14}/> },
              { id: 'documents', label: 'Documents', icon: <Paperclip size={14}/> },
              { id: 'infos',     label: 'Infos',     icon: <UserCheck size={14}/> },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-bold whitespace-nowrap transition-colors
                  ${activeTab === t.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-500/5'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                {t.icon}{t.label}
                {t.id === 'taches' && tasks.length > 0 && (
                  <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {tasks.length}
                  </span>
                )}
                {t.id === 'documents' && documents.length > 0 && (
                  <span className="bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {documents.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6">
            {tabLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={28} className="animate-spin text-blue-500"/>
              </div>
            ) : (

              /* ══ Tâches ═════════════════════════════════════════════ */
              activeTab === 'taches' ? (
                tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardList size={36} className="mx-auto mb-3 text-slate-200 dark:text-navy-600"/>
                    <p className="text-slate-400">Aucune tâche assignée</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Progress overview */}
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-navy-800 rounded-2xl p-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">Progression globale</span>
                          <span className="font-black text-blue-600 dark:text-blue-400">{taskPct}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-navy-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${taskPct}%` }}/>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">{doneTasks} terminée{doneTasks > 1 ? 's' : ''} sur {tasks.length}</p>
                      </div>
                      <div className="text-3xl font-black text-slate-200 dark:text-navy-700 select-none">{taskPct}%</div>
                    </div>

                    {/* Kanban columns */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {taskGroups.map(({ status, items }) => {
                        const ts = TASK_STATUS[status]
                        return (
                          <div key={status}>
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`w-2 h-2 rounded-full ${ts.dot}`}/>
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{ts.label}</span>
                              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-navy-700 px-1.5 py-0.5 rounded-full ml-auto">{items.length}</span>
                            </div>
                            <div className="space-y-2 min-h-[80px]">
                              {items.map(t => (
                                <div key={t._id}
                                  className="bg-slate-50 dark:bg-navy-800 border border-slate-100 dark:border-navy-700 rounded-xl p-3">
                                  <p className="text-xs font-semibold text-slate-800 dark:text-white leading-snug">{t.title}</p>
                                  {t.project && (
                                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                      <FileText size={9}/>{t.project}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between mt-2 gap-1">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${TASK_PRIORITY[t.priority]?.cls || ''}`}>
                                      {TASK_PRIORITY[t.priority]?.label}
                                    </span>
                                    {t.dueDate && (
                                      <span className={`text-[9px] flex items-center gap-0.5
                                        ${new Date(t.dueDate) < new Date() && t.status !== 'done' ? 'text-red-500' : 'text-slate-400'}`}>
                                        <Calendar size={8}/>{new Date(t.dueDate).toLocaleDateString('fr-FR')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {items.length === 0 && (
                                <div className="border-2 border-dashed border-slate-100 dark:border-navy-700 rounded-xl h-16 flex items-center justify-center">
                                  <span className="text-[10px] text-slate-300 dark:text-navy-600">Aucune</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )

              /* ══ Pointage ═══════════════════════════════════════════ */
              ) : activeTab === 'pointage' ? (
                <div className="space-y-5">
                  {/* Month selector */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        Pointage — {new Date(attendMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {presentDays} jour{presentDays > 1 ? 's' : ''} présent · {totalHours}h travaillées
                      </p>
                    </div>
                    <input type="month" value={attendMonth} onChange={e => setAttendMonth(e.target.value)}
                      className="px-3 py-2 bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"/>
                  </div>

                  {/* Summary chips */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ATTEND_STATUS).map(([k, v]) => {
                      const count = attendance.filter(a => a.status === k).length
                      if (!count) return null
                      return (
                        <span key={k} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${v.cls}`}>
                          {v.label} <span className="opacity-70">{count}</span>
                        </span>
                      )
                    })}
                  </div>

                  {/* Calendar grid */}
                  {calDays.length > 0 ? (
                    <div>
                      <div className="grid grid-cols-7 gap-1 text-center mb-1">
                        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                          <div key={d} className="text-[10px] font-bold text-slate-400 py-1">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {/* Empty cells for day-of-week alignment */}
                        {Array.from({ length: (calDays[0]?.date.getDay() + 6) % 7 }, (_, i) => (
                          <div key={`empty-${i}`}/>
                        ))}
                        {calDays.map(({ date, key, record }) => {
                          const isWeekend = date.getDay() === 0 || date.getDay() === 6
                          const isToday   = new Date().toISOString().slice(0, 10) === key
                          const statusCls = record
                            ? ATTEND_STATUS[record.status]?.cls || ''
                            : isWeekend ? 'bg-slate-50 dark:bg-navy-800 text-slate-300' : 'bg-slate-50 dark:bg-navy-800 text-slate-400'
                          return (
                            <div key={key}
                              title={record ? `${ATTEND_STATUS[record.status]?.label} · ${record.hoursWorked || 0}h${record.site ? ' · ' + record.site : ''}` : ''}
                              className={`aspect-square rounded-lg flex flex-col items-center justify-center cursor-default text-[11px] font-bold transition-all
                                ${statusCls} ${isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}>
                              {date.getDate()}
                              {record && (
                                <span className="text-[8px] opacity-60 leading-none mt-0.5">
                                  {record.hoursWorked || 0}h
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {/* Legend */}
                      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
                        {Object.entries(ATTEND_STATUS).map(([, v]) => (
                          <span key={v.label} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.cls}`}>{v.label}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Activity size={32} className="mx-auto mb-2 text-slate-200 dark:text-navy-600"/>
                      <p className="text-slate-400 text-sm">Aucun pointage ce mois</p>
                    </div>
                  )}

                  {/* List */}
                  {attendance.length > 0 && (
                    <div className="mt-4 border border-slate-100 dark:border-navy-700 rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[500px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-navy-800 border-b border-slate-100 dark:border-navy-700">
                            {['Date', 'Statut', 'Entrée', 'Sortie', 'Heures', 'H. Sup', 'Site'].map(h => (
                              <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-2.5">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
                          {attendance.map(a => {
                            const as = ATTEND_STATUS[a.status] || ATTEND_STATUS.present
                            return (
                              <tr key={a._id} className="hover:bg-slate-50 dark:hover:bg-navy-800/50">
                                <td className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">{fmtD(a.date)}</td>
                                <td className="px-4 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${as.cls}`}>{as.label}</span></td>
                                <td className="px-4 py-2.5 text-xs text-slate-500">{a.checkIn || '—'}</td>
                                <td className="px-4 py-2.5 text-xs text-slate-500">{a.checkOut || '—'}</td>
                                <td className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">{a.hoursWorked || 0}h</td>
                                <td className="px-4 py-2.5 text-xs text-slate-500">{a.overtime ? `+${a.overtime}h` : '—'}</td>
                                <td className="px-4 py-2.5 text-xs text-slate-500 truncate max-w-[120px]">{a.site || '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  )}
                </div>

              /* ══ Congés ══════════════════════════════════════════════ */
              ) : activeTab === 'conges' ? (
                leaves.length === 0 ? (
                  <div className="text-center py-12">
                    <Umbrella size={36} className="mx-auto mb-3 text-slate-200 dark:text-navy-600"/>
                    <p className="text-slate-400">Aucune demande de congé</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Approuvés', val: approvedLeaves.length, cls: 'text-emerald-600 dark:text-emerald-400' },
                        { label: 'En attente', val: leaves.filter(l => l.status === 'pending').length, cls: 'text-amber-600 dark:text-amber-400' },
                        { label: 'Jours pris', val: leaveDays, cls: 'text-violet-600 dark:text-violet-400' },
                      ].map(({ label, val, cls }) => (
                        <div key={label} className="bg-slate-50 dark:bg-navy-800 rounded-2xl p-4 text-center">
                          <div className={`text-2xl font-black ${cls}`}>{val}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Leaves list */}
                    <div className="space-y-3">
                      {leaves.map(l => {
                        const ls = LEAVE_STATUS[l.status] || LEAVE_STATUS.pending
                        return (
                          <div key={l._id}
                            className="flex items-start gap-4 bg-slate-50 dark:bg-navy-800 rounded-2xl p-4 border border-slate-100 dark:border-navy-700">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-slate-800 dark:text-white">{l.type}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ls.cls}`}>{ls.label}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><Calendar size={10}/>{fmtD(l.startDate)} → {fmtD(l.endDate)}</span>
                                {l.days && <span className="font-semibold text-slate-700 dark:text-slate-200">{l.days} jour{l.days > 1 ? 's' : ''}</span>}
                              </div>
                              {l.reason && <p className="text-xs text-slate-400 mt-1.5">{l.reason}</p>}
                              {l.approvedBy && <p className="text-[10px] text-slate-400 mt-1">Approuvé par : {l.approvedBy}</p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )

              /* ══ Documents ══════════════════════════════════════════ */
              ) : activeTab === 'documents' ? (
                <div className="space-y-5">
                  {/* Upload area */}
                  <div
                    onClick={() => detailDocRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      setPendingDocs(Array.from(e.dataTransfer.files).map(f => ({ file: f, type: 'Autre', name: f.name.replace(/\.[^.]+$/, '') })))
                      detailDocRef.current.value = ''
                    }}
                    className="border-2 border-dashed border-slate-200 dark:border-navy-600 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-colors">
                    <UploadCloud size={24} className="mx-auto mb-2 text-slate-300"/>
                    <p className="text-sm text-slate-500">Importer un nouveau document</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Cliquer ou glisser · PDF, images, Word, Excel</p>
                    <input ref={detailDocRef} type="file" multiple className="hidden"
                      onChange={e => setPendingDocs(Array.from(e.target.files).map(f => ({ file: f, type: 'Autre', name: f.name.replace(/\.[^.]+$/, '') })))}/>
                  </div>

                  {/* Pending upload queue */}
                  {pendingDocs.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl p-4 space-y-2">
                      <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-3">{pendingDocs.length} fichier{pendingDocs.length > 1 ? 's' : ''} prêt{pendingDocs.length > 1 ? 's' : ''} à importer</p>
                      {pendingDocs.map((pd, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white dark:bg-navy-900 rounded-xl p-3 border border-blue-100 dark:border-navy-700">
                          <span className="text-xl shrink-0">{fileIcon(pd.file.type)}</span>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <input value={pd.name}
                              onChange={e => setPendingDocs(prev => prev.map((d, i) => i === idx ? { ...d, name: e.target.value } : d))}
                              className="w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Nom du document"/>
                            <select value={pd.type}
                              onChange={e => setPendingDocs(prev => prev.map((d, i) => i === idx ? { ...d, type: e.target.value } : d))}
                              className="w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
                              {EMP_DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                          </div>
                          <button type="button" onClick={() => setPendingDocs(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors shrink-0">
                            <X size={14}/>
                          </button>
                        </div>
                      ))}
                      <button
                        disabled={docUploading}
                        onClick={async () => {
                          setDocUploading(true)
                          try {
                            for (const pd of pendingDocs) {
                              const fd = new FormData()
                              fd.append('file', pd.file)
                              fd.append('title', pd.name || pd.file.name)
                              fd.append('type', pd.type)
                              fd.append('employeeRef', emp._id)
                              await adminDocuments.create(fd)
                            }
                            setPendingDocs([])
                            const r = await adminDocuments.getByEmployee(emp._id)
                            setDocuments(r.data)
                            showToast(`${pendingDocs.length} document${pendingDocs.length > 1 ? 's' : ''} importé${pendingDocs.length > 1 ? 's' : ''}`)
                          } catch { showToast('Erreur import', 'error') }
                          finally { setDocUploading(false) }
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold transition-colors disabled:opacity-60">
                        {docUploading ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14}/>}
                        {docUploading ? 'Import en cours…' : `Importer ${pendingDocs.length} fichier${pendingDocs.length > 1 ? 's' : ''}`}
                      </button>
                    </div>
                  )}

                  {/* Documents list */}
                  {documents.length === 0 && pendingDocs.length === 0 ? (
                    <div className="text-center py-8">
                      <Paperclip size={32} className="mx-auto mb-2 text-slate-200 dark:text-navy-600"/>
                      <p className="text-slate-400 text-sm">Aucun document</p>
                    </div>
                  ) : documents.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500">{documents.length} document{documents.length > 1 ? 's' : ''}</p>
                      {documents.map(doc => (
                        <div key={doc._id}
                          className="flex items-center gap-3 bg-slate-50 dark:bg-navy-800 rounded-2xl p-3.5 border border-slate-100 dark:border-navy-700 group">
                          <span className="text-2xl shrink-0">{fileIcon(doc.mimetype)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{doc.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400">
                                {doc.type}
                              </span>
                              {doc.size && <span className="text-[10px] text-slate-400">{fmtSize(doc.size)}</span>}
                              <span className="text-[10px] text-slate-400">{fmtD(doc.createdAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {doc.url && (
                              <a href={doc.url} target="_blank" rel="noreferrer" download={doc.originalName || doc.title}
                                className="p-2 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                                <Download size={15}/>
                              </a>
                            )}
                            <button
                              onClick={async () => {
                                if (!window.confirm('Supprimer ce document ?')) return
                                await adminDocuments.delete(doc._id)
                                setDocuments(prev => prev.filter(d => d._id !== doc._id))
                                showToast('Document supprimé')
                              }}
                              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                              <Trash2 size={15}/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

              /* ══ Infos ═══════════════════════════════════════════════ */
              ) : activeTab === 'infos' ? (
                <div className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    {/* Identité */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Identité</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Prénom', val: emp.firstName },
                          { label: 'Nom', val: emp.lastName },
                          { label: 'CIN', val: emp.cin },
                          { label: 'Fonction', val: emp.role },
                          { label: 'Département', val: emp.department },
                          { label: 'Téléphone', val: emp.phone },
                          { label: 'Email', val: emp.email },
                        ].filter(r => r.val).map(({ label, val }) => (
                          <div key={label} className="bg-slate-50 dark:bg-navy-800 rounded-xl p-3">
                            <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
                            <p className="text-xs font-semibold text-slate-800 dark:text-white break-words">{val}</p>
                          </div>
                        ))}
                      </div>
                      {emp.address && (
                        <div className="bg-slate-50 dark:bg-navy-800 rounded-xl p-3">
                          <p className="text-[10px] text-slate-400 mb-0.5">Adresse</p>
                          <p className="text-xs font-semibold text-slate-800 dark:text-white">{emp.address}</p>
                        </div>
                      )}
                    </div>

                    {/* Contrat */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Contrat</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Type contrat', val: emp.contractType },
                          { label: 'Statut', val: emp.status },
                          { label: 'Salaire', val: emp.salary ? fmt(emp.salary) + ' MAD/mois' : null },
                          { label: "Date d'embauche", val: fmtD(emp.startDate) !== '—' ? fmtD(emp.startDate) : null },
                          { label: 'Fin de contrat', val: fmtD(emp.endDate) !== '—' ? fmtD(emp.endDate) : null },
                          { label: 'Ancienneté', val: emp.startDate ? `${Math.floor((Date.now() - new Date(emp.startDate)) / (365.25 * 24 * 3600 * 1000))} an(s)` : null },
                        ].filter(r => r.val).map(({ label, val }) => (
                          <div key={label} className="bg-slate-50 dark:bg-navy-800 rounded-xl p-3">
                            <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
                            <p className="text-xs font-semibold text-slate-800 dark:text-white">{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Administratif */}
                  {(emp.cnss || emp.rib) && (
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Administratif</h3>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {emp.cnss && (
                          <div className="bg-slate-50 dark:bg-navy-800 rounded-xl p-3">
                            <p className="text-[10px] text-slate-400 mb-0.5">N° CNSS</p>
                            <p className="text-xs font-semibold text-slate-800 dark:text-white font-mono">{emp.cnss}</p>
                          </div>
                        )}
                        {emp.rib && (
                          <div className="bg-slate-50 dark:bg-navy-800 rounded-xl p-3">
                            <p className="text-[10px] text-slate-400 mb-0.5">RIB bancaire</p>
                            <p className="text-xs font-semibold text-slate-800 dark:text-white font-mono truncate">{emp.rib}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contact d'urgence */}
                  {emp.emergencyContact?.name && (
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <ShieldAlert size={12}/>Contact d'urgence
                      </h3>
                      <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                          <ShieldAlert size={18} className="text-red-500"/>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">{emp.emergencyContact.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {emp.emergencyContact.phone && (
                              <a href={`tel:${emp.emergencyContact.phone}`}
                                className="text-xs text-slate-500 hover:text-blue-500 flex items-center gap-1 transition-colors">
                                <Phone size={10}/>{emp.emergencyContact.phone}
                              </a>
                            )}
                            {emp.emergencyContact.relation && (
                              <span className="text-xs text-slate-400">{emp.emergencyContact.relation}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Compétences */}
                  {emp.skills?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Tag size={12}/>Compétences
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {emp.skills.map(s => (
                          <span key={s} className="text-xs font-semibold px-3 py-1.5 bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {emp.notes && (
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Notes</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-navy-800 rounded-2xl p-4 whitespace-pre-wrap">{emp.notes}</p>
                    </div>
                  )}

                  <button onClick={openEdit}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold transition-colors">
                    <Pencil size={14}/> Modifier l'employé
                  </button>
                </div>
              ) : null
            )}
          </div>
        </div>
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────── */}
      <Modal open={modal} onClose={close} title="Modifier l'employé" size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Photo */}
          <div className="flex items-center gap-4">
            {photoPreview || emp?.photo ? (
              <div className="relative">
                <img src={photoPreview || emp?.photo} alt="Photo"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 dark:border-navy-600"/>
                {photoPreview && (
                  <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5">
                    <X size={10}/>
                  </button>
                )}
              </div>
            ) : (
              <div className={`w-16 h-16 bg-gradient-to-br ${grad} rounded-2xl flex items-center justify-center`}>
                <Camera size={22} className="text-white opacity-60"/>
              </div>
            )}
            <div>
              <button type="button" onClick={() => modalPhotoRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-navy-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">
                <UploadCloud size={13}/> Changer la photo
              </button>
              <p className="text-[10px] text-slate-400 mt-1">JPG, PNG · max 5 Mo</p>
              <input ref={modalPhotoRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)) } }}/>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-navy-700"/>

          {/* Identité */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Identité</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Prénom *"><input {...register('firstName', { required: true })} className={inp}/></Field>
              <Field label="Nom *"><input {...register('lastName', { required: true })} className={inp}/></Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Poste / Fonction"><input {...register('role')} className={inp}/></Field>
              <Field label="Département">
                <select {...register('department')} className={inp}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Email"><input {...register('email')} type="email" className={inp}/></Field>
              <Field label="Téléphone"><input {...register('phone')} className={inp}/></Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="CIN"><input {...register('cin')} className={inp}/></Field>
              <Field label="Adresse"><input {...register('address')} className={inp}/></Field>
            </div>
          </div>

          {/* Contrat */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Contrat</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Type">
                <select {...register('contractType')} className={inp}>
                  {CONTRACTS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Salaire (MAD)"><input {...register('salary', { valueAsNumber: true })} type="number" className={inp}/></Field>
              <Field label="Statut">
                <select {...register('status')} className={inp}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Date d'embauche"><input {...register('startDate')} type="date" className={inp}/></Field>
              <Field label="Fin contrat"><input {...register('endDate')} type="date" className={inp}/></Field>
            </div>
          </div>

          {/* Administratif */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Administratif</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="N° CNSS"><input {...register('cnss')} className={inp} placeholder="123456789"/></Field>
              <Field label="RIB bancaire"><input {...register('rib')} className={inp} placeholder="011 780 0001234567891234 56"/></Field>
            </div>
          </div>

          {/* Contact d'urgence */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={10}/>Contact d'urgence
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Nom"><input {...register('emergencyContact.name')} className={inp} placeholder="Fatima Alami"/></Field>
              <Field label="Téléphone"><input {...register('emergencyContact.phone')} className={inp}/></Field>
              <Field label="Lien de parenté"><input {...register('emergencyContact.relation')} className={inp} placeholder="Épouse, Parent…"/></Field>
            </div>
          </div>

          {/* Compétences */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Tag size={10}/>Compétences
            </p>
            <div className="flex gap-2">
              <input ref={skillRef} value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const s = skillInput.trim(); if (s && !docSkills.includes(s)) { setDocSkills(p => [...p, s]); setSkillInput('') } } }}
                className={inp} placeholder="Ex: Coffrage, Ferraillage… puis Entrée"/>
              <button type="button" onClick={() => { const s = skillInput.trim(); if (s && !docSkills.includes(s)) { setDocSkills(p => [...p, s]); setSkillInput('') } }}
                className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors shrink-0">+</button>
            </div>
            {docSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {docSkills.map(s => (
                  <span key={s} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 rounded-full">
                    {s}<button type="button" onClick={() => setDocSkills(p => p.filter(x => x !== s))} className="hover:text-red-500"><X size={11}/></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Field label="Notes"><textarea {...register('notes')} rows={2} className={`${inp} resize-none`}/></Field>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin"/>} Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)}/>
    </>
  )
}
