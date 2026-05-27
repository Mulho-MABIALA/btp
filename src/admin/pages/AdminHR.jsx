import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  Loader2, Users, Plus, Pencil, Trash2, Search, Phone, Mail,
  DollarSign, UploadCloud, Camera, ClipboardList, CheckCircle2,
  Clock, AlertCircle, X, ChevronRight, Building2, Calendar,
  CreditCard, MapPin, FileText, UserCheck, ArrowRight,
  Tag, Paperclip, Download, ShieldAlert, QrCode,
  CalendarOff, Award, BarChart3, Wallet, GraduationCap, BadgeCheck,
} from 'lucide-react'
import BadgeModal from '../components/BadgeModal'
import { adminEmployees, adminTasks, adminDocuments, adminLeaves, adminAttendance } from '../adminApi'
import Modal from '../components/Modal'

/* ── Styles ─────────────────────────────────────────────────────────────── */
const inp   = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const inpSm = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
  </div>
)
const fmt  = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)
const fmtD = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

const seniorityText = (startDate) => {
  if (!startDate) return null
  const start = new Date(startDate)
  const now   = new Date()
  const totalMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (totalMonths <= 0) return null
  const years  = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years > 0 && months > 0) return `${years} an${years > 1 ? 's' : ''} ${months} mois`
  if (years > 0) return `${years} an${years > 1 ? 's' : ''}`
  return `${totalMonths} mois`
}

const trainingExpiryInfo = (expiryDate) => {
  if (!expiryDate) return { cls: 'text-slate-400', label: 'Sans expiration', dot: 'bg-slate-300' }
  const diffDays = Math.ceil((new Date(expiryDate) - new Date()) / 86400000)
  if (diffDays < 0)   return { cls: 'text-red-500',    label: 'Expiré',                      dot: 'bg-red-500'    }
  if (diffDays < 30)  return { cls: 'text-orange-500', label: `${diffDays}j restants`,        dot: 'bg-orange-400' }
  if (diffDays < 90)  return { cls: 'text-amber-500',  label: `${Math.ceil(diffDays/30)} mois`, dot: 'bg-amber-400'  }
  return { cls: 'text-emerald-500', label: 'Valide', dot: 'bg-emerald-400' }
}

const TRAINING_TYPES = ['Formation', 'Habilitation', 'Certification', 'Permis', 'Recyclage', 'Autre']

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

const STATUS_STYLE = {
  'Actif':   { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', dot: 'bg-emerald-500' },
  'Congé':   { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',             dot: 'bg-blue-500' },
  'Absent':  { cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',     dot: 'bg-orange-400' },
  'Archivé': { cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',         dot: 'bg-slate-400' },
}
const CONTRACT_STYLE = {
  'CDI':      'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
  'CDD':      'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  'Intérim':  'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  'Stage':    'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  'Freelance':'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
}
const DEPT_COLOR = {
  'Direction':           'from-purple-400 to-violet-500',
  'Chantier':            'from-orange-400 to-amber-500',
  "Bureau d'études":     'from-blue-400 to-cyan-500',
  'Comptabilité':        'from-green-400 to-emerald-500',
  'Ressources humaines': 'from-pink-400 to-rose-500',
  'Commercial':          'from-teal-400 to-green-500',
  'Logistique':          'from-slate-400 to-gray-500',
}

const TASK_STATUS = {
  'todo':        { label: 'À faire',    cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',     icon: <Clock size={11}/> },
  'in-progress': { label: 'En cours',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',         icon: <Loader2 size={11} className="animate-spin"/> },
  'review':      { label: 'Révision',   cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400', icon: <AlertCircle size={11}/> },
  'done':        { label: 'Terminé',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', icon: <CheckCircle2 size={11}/> },
}
const TASK_PRIORITY = {
  low:    'bg-slate-100 text-slate-500',
  medium: 'bg-blue-100 text-blue-600',
  high:   'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
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
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold transition-all
      ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
      {toast.type === 'success' ? <CheckCircle2 size={17}/> : <AlertCircle size={17}/>}
      {toast.msg}
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100"><X size={14}/></button>
    </div>
  )
}

/* ── Avatar ─────────────────────────────────────────────────────────────── */
function Avatar({ emp, size = 'md' }) {
  const sz = { sm: 'w-9 h-9 text-sm', md: 'w-12 h-12 text-base', lg: 'w-20 h-20 text-2xl' }[size]
  const grad = DEPT_COLOR[emp.department] || 'from-blue-400 to-indigo-500'
  if (emp.photo) return (
    <img src={emp.photo} alt={`${emp.firstName} ${emp.lastName}`}
      className={`${sz} rounded-2xl object-cover shrink-0`}/>
  )
  return (
    <div className={`${sz} bg-gradient-to-br ${grad} rounded-2xl flex items-center justify-center text-white font-black shrink-0`}>
      {(emp.firstName?.[0] || '') + (emp.lastName?.[0] || '')}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════════════════ */
export default function AdminHR() {
  /* State ─────────────────────────────────────────────────────────────── */
  const [data, setData]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]     = useState(null)
  const [activeTab, setActiveTab]   = useState('fiche')
  const [badgeEmployee, setBadgeEmployee] = useState(null)

  // Tasks
  const [tasks, setTasks]           = useState([])
  const [tasksLoading, setTasksLoading] = useState(false)

  // Modal
  const [modal, setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)

  // Filters
  const [search, setSearch]         = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Photo (modal)
  const [photoFile, setPhotoFile]       = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const modalPhotoRef = useRef()

  // Photo (panel)
  const [panelUploading, setPanelUploading] = useState(false)
  const panelPhotoRef = useRef()

  // Skills
  const [skills, setSkills]         = useState([])
  const [skillInput, setSkillInput] = useState('')
  const skillRef = useRef()

  // Pending documents (pre-upload queue)
  const [pendingDocs, setPendingDocs] = useState([])  // [{ file, type, name }]
  const docInputRef = useRef()

  // Toast
  const [toast, setToast] = useState(null)
  const showToast = (msg, type = 'success') => setToast({ msg, type })

  // Leaves panel
  const [leaves, setLeaves]               = useState([])
  const [leavesLoading, setLeavesLoading] = useState(false)
  const [leaveBalance, setLeaveBalance]   = useState(null)

  // Attendance panel
  const [attendance, setAttendance]               = useState([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)

  // Avances
  const [addAdvanceOpen, setAddAdvanceOpen] = useState(false)
  const [advanceForm, setAdvanceForm]       = useState({ date: '', amount: '', reason: '' })

  // Formations
  const [addTrainingOpen, setAddTrainingOpen] = useState(false)
  const [trainingForm, setTrainingForm]       = useState({ title: '', date: '', expiryDate: '', organiser: '', type: 'Formation', notes: '' })

  // Saving flag shared for sub-resource ops
  const [savingSubresource, setSavingSubresource] = useState(false)

  const { register, handleSubmit, reset } = useForm()

  /* Load ──────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await adminEmployees.getAll()
      setData(r.data)
      if (selected) {
        const updated = r.data.find(e => e._id === selected._id)
        if (updated) setSelected(updated)
      }
    } finally { setLoading(false) }
  }, [selected?._id])

  useEffect(() => { load() }, [])

  /* Select employee → load tasks ──────────────────────────────────────── */
  const selectEmployee = async (emp) => {
    setSelected(emp)
    setActiveTab('fiche')
    setTasks([])
  }

  const loadTasks = useCallback(async (empId) => {
    setTasksLoading(true)
    try {
      const r = await adminTasks.getByEmployee(empId)
      setTasks(r.data)
    } catch { setTasks([]) }
    finally { setTasksLoading(false) }
  }, [])

  const loadLeaves = useCallback(async (empId) => {
    setLeavesLoading(true)
    try {
      const year = new Date().getFullYear()
      const [lvR, balR] = await Promise.all([
        adminLeaves.getAll({ employee: empId }),
        adminLeaves.getBalance(empId, year),
      ])
      setLeaves(lvR.data)
      setLeaveBalance(balR.data)
    } catch { setLeaves([]); setLeaveBalance(null) }
    finally { setLeavesLoading(false) }
  }, [])

  const loadAttendancePanel = useCallback(async (empId) => {
    setAttendanceLoading(true)
    try {
      const r = await adminAttendance.getAll({ employee: empId, limit: 30 })
      setAttendance(r.data)
    } catch { setAttendance([]) }
    finally { setAttendanceLoading(false) }
  }, [])

  useEffect(() => {
    if (selected && activeTab === 'taches')   loadTasks(selected._id)
  }, [selected?._id, activeTab])

  useEffect(() => {
    if (selected && activeTab === 'conges')   loadLeaves(selected._id)
  }, [selected?._id, activeTab])

  useEffect(() => {
    if (selected && activeTab === 'presence') loadAttendancePanel(selected._id)
  }, [selected?._id, activeTab])

  /* Panel photo upload ─────────────────────────────────────────────────── */
  const handlePanelPhoto = async (file) => {
    if (!file || !selected) return
    setPanelUploading(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const r = await adminEmployees.uploadPhoto(selected._id, fd)
      setSelected(r.data)
      setData(prev => prev.map(e => e._id === r.data._id ? r.data : e))
      showToast('Photo mise à jour')
    } catch { showToast('Erreur upload photo', 'error') }
    finally { setPanelUploading(false) }
  }

  /* Advance handlers ─────────────────────────────────────────────────────── */
  const refreshSelected = (emp) => {
    setSelected(emp)
    setData(prev => prev.map(e => e._id === emp._id ? emp : e))
  }

  const handleAddAdvance = async () => {
    if (!selected || !advanceForm.date || !advanceForm.amount) return
    setSavingSubresource(true)
    try {
      const r = await adminEmployees.addAdvance(selected._id, {
        ...advanceForm, amount: parseFloat(advanceForm.amount),
      })
      refreshSelected(r.data)
      setAdvanceForm({ date: '', amount: '', reason: '' })
      setAddAdvanceOpen(false)
      showToast('Avance enregistrée')
    } catch { showToast("Erreur lors de l'enregistrement", 'error') }
    finally { setSavingSubresource(false) }
  }

  const handleAdvanceStatus = async (aid, status) => {
    if (!selected) return
    setSavingSubresource(true)
    try {
      const r = await adminEmployees.patchAdvance(selected._id, aid, status)
      refreshSelected(r.data)
    } catch { showToast('Erreur', 'error') }
    finally { setSavingSubresource(false) }
  }

  const handleDeleteAdvance = async (aid) => {
    if (!selected) return
    setSavingSubresource(true)
    try {
      const r = await adminEmployees.deleteAdvance(selected._id, aid)
      refreshSelected(r.data)
    } catch { showToast('Erreur suppression', 'error') }
    finally { setSavingSubresource(false) }
  }

  /* Training handlers ─────────────────────────────────────────────────────── */
  const handleAddTraining = async () => {
    if (!selected || !trainingForm.title) return
    setSavingSubresource(true)
    try {
      const r = await adminEmployees.addTraining(selected._id, trainingForm)
      refreshSelected(r.data)
      setTrainingForm({ title: '', date: '', expiryDate: '', organiser: '', type: 'Formation', notes: '' })
      setAddTrainingOpen(false)
      showToast('Formation enregistrée')
    } catch { showToast("Erreur lors de l'enregistrement", 'error') }
    finally { setSavingSubresource(false) }
  }

  const handleDeleteTraining = async (tid) => {
    if (!selected) return
    setSavingSubresource(true)
    try {
      const r = await adminEmployees.deleteTraining(selected._id, tid)
      refreshSelected(r.data)
    } catch { showToast('Erreur suppression', 'error') }
    finally { setSavingSubresource(false) }
  }

  /* Skill helpers ─────────────────────────────────────────────────────── */
  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s])
    setSkillInput('')
    skillRef.current?.focus()
  }
  const removeSkill = (s) => setSkills(prev => prev.filter(x => x !== s))

  /* Pending docs helpers ───────────────────────────────────────────────── */
  const addPendingDocs = (files) => {
    const items = Array.from(files).map(f => ({
      file: f, type: 'Autre', name: f.name.replace(/\.[^.]+$/, ''),
    }))
    setPendingDocs(prev => [...prev, ...items])
  }
  const removePendingDoc  = idx => setPendingDocs(prev => prev.filter((_, i) => i !== idx))
  const updatePendingDoc  = (idx, key, val) =>
    setPendingDocs(prev => prev.map((d, i) => i === idx ? { ...d, [key]: val } : d))

  /* Modal ─────────────────────────────────────────────────────────────── */
  const openAdd = () => {
    setEditing(null)
    setPhotoFile(null); setPhotoPreview(null)
    setSkills([]); setSkillInput('')
    setPendingDocs([])
    reset({ department: 'Chantier', contractType: 'CDI', status: 'Actif' })
    setModal(true)
  }
  const openEdit = (e) => {
    setEditing(e)
    setPhotoFile(null); setPhotoPreview(null)
    setSkills(e.skills || []); setSkillInput('')
    setPendingDocs([])
    reset({
      ...e,
      position:  e.position || e.role || '',   // normalize: old employees used 'role'
      startDate: e.startDate?.split?.('T')[0],
      endDate:   e.endDate?.split?.('T')[0],
      'emergencyContact.name':     e.emergencyContact?.name     || '',
      'emergencyContact.phone':    e.emergencyContact?.phone    || '',
      'emergencyContact.relation': e.emergencyContact?.relation || '',
    })
    setModal(true)
  }
  const close = () => {
    setModal(false); setEditing(null)
    setPhotoFile(null); setPhotoPreview(null)
    setSkills([]); setSkillInput(''); setPendingDocs([])
  }

  const onSubmit = async (v) => {
    setSaving(true)
    try {
      // Merge skills into payload
      v.skills = skills
      // Restructure emergencyContact
      v.emergencyContact = {
        name:     v['emergencyContact.name']     || '',
        phone:    v['emergencyContact.phone']    || '',
        relation: v['emergencyContact.relation'] || '',
      }
      delete v['emergencyContact.name']
      delete v['emergencyContact.phone']
      delete v['emergencyContact.relation']

      let emp
      if (editing) {
        const r = await adminEmployees.update(editing._id, v)
        emp = r.data
      } else {
        const r = await adminEmployees.create(v)
        emp = r.data
      }
      // Upload photo
      if (photoFile) {
        const fd = new FormData()
        fd.append('photo', photoFile)
        const r = await adminEmployees.uploadPhoto(emp._id, fd)
        emp = r.data
      }
      // Upload pending documents
      for (const pd of pendingDocs) {
        const fd = new FormData()
        fd.append('file', pd.file)
        fd.append('title', pd.name || pd.file.name)
        fd.append('type', pd.type)
        fd.append('employeeRef', emp._id)
        await adminDocuments.create(fd)
      }
      await load()
      if (selected?._id === emp._id) setSelected(emp)
      close()
      showToast(editing ? 'Employé modifié' : 'Employé créé')
    } catch (e) {
      showToast(e?.response?.data?.error || 'Erreur', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet employé ?')) return
    setDeleting(id)
    try {
      await adminEmployees.delete(id)
      if (selected?._id === id) setSelected(null)
      await load()
      showToast('Employé supprimé')
    } catch { showToast('Erreur suppression', 'error') }
    finally { setDeleting(null) }
  }

  /* Computed ──────────────────────────────────────────────────────────── */
  const active      = data.filter(e => e.status === 'Actif')
  const totalSalary = active.reduce((s, e) => s + (e.salary || 0), 0)
  const depts       = ['all', ...new Set(data.map(e => e.department).filter(Boolean))]

  const filtered = data
    .filter(e => deptFilter === 'all' || e.department === deptFilter)
    .filter(e => statusFilter === 'all' || e.status === statusFilter)
    .filter(e => !search || [`${e.firstName} ${e.lastName}`, e.role, e.email, e.department]
      .some(v => v?.toLowerCase().includes(search.toLowerCase())))

  /* Task helpers ──────────────────────────────────────────────────────── */
  const taskGroups = ['todo', 'in-progress', 'review', 'done'].map(s => ({
    status: s,
    items: tasks.filter(t => t.status === s),
  }))
  const doneTasks  = tasks.filter(t => t.status === 'done').length
  const taskPct    = tasks.length ? Math.round(doneTasks / tasks.length * 100) : 0

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Ressources humaines</h1>
            <p className="text-slate-500 text-sm mt-1">
              {active.length} employé{active.length > 1 ? 's' : ''} actif{active.length > 1 ? 's' : ''} · Masse salariale : {fmt(totalSalary)} MAD/mois
            </p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors">
            <Plus size={15}/> Nouvel employé
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total',    val: data.length,                              color: 'bg-blue-500',   filter: 'all' },
            { label: 'Actifs',   val: data.filter(e => e.status==='Actif').length,  color: 'bg-emerald-500', filter: 'Actif' },
            { label: 'En congé', val: data.filter(e => e.status==='Congé').length,  color: 'bg-sky-500',    filter: 'Congé' },
            { label: 'Absents',  val: data.filter(e => e.status==='Absent').length, color: 'bg-orange-500', filter: 'Absent' },
          ].map(({ label, val, color, filter }) => (
            <button key={label} onClick={() => setStatusFilter(s => s === filter ? 'all' : filter)}
              className={`bg-white dark:bg-navy-900 rounded-2xl border p-4 text-left transition-all hover:shadow-md
                ${statusFilter === filter && filter !== 'all'
                  ? 'border-blue-400 ring-2 ring-blue-400/30'
                  : 'border-slate-200 dark:border-navy-700'}`}>
              <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center mb-2`}>
                <Users size={14} className="text-white"/>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">{val}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
              className="pl-9 pr-4 py-2 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white w-52"/>
          </div>
          <div className="flex gap-1 flex-wrap">
            {depts.map(d => (
              <button key={d} onClick={() => setDeptFilter(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                  ${deptFilter === d ? 'bg-blue-500 text-white' : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300'}`}>
                {d === 'all' ? 'Tous les depts' : d}
              </button>
            ))}
          </div>
        </div>

        {/* Main layout */}
        <div className={`grid gap-5 ${selected ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>

          {/* Cards grid */}
          <div className={selected ? 'lg:col-span-2' : ''}>
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
            ) : filtered.length === 0 ? (
              <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 text-center py-16">
                <Users size={32} className="mx-auto mb-3 text-slate-300"/>
                <p className="text-sm text-slate-400">Aucun employé trouvé</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map(e => {
                  const ss = STATUS_STYLE[e.status] || STATUS_STYLE['Actif']
                  const isSel = selected?._id === e._id
                  return (
                    <div key={e._id}
                      onClick={() => selectEmployee(isSel ? null : e)}
                      className={`bg-white dark:bg-navy-900 rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md
                        ${isSel ? 'border-blue-400 ring-2 ring-blue-400/20 shadow-md' : 'border-slate-200 dark:border-navy-700'}`}>
                      <div className="flex items-start gap-3">
                        <Avatar emp={e} size="md"/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white truncate">{e.firstName} {e.lastName}</p>
                              {e.role && <p className="text-xs text-slate-500 truncate">{e.role}</p>}
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${ss.cls}`}>
                              {e.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {e.department && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Building2 size={9}/>{e.department}
                              </span>
                            )}
                            {e.contractType && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${CONTRACT_STYLE[e.contractType] || ''}`}>
                                {e.contractType}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-navy-700">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{fmt(e.salary)} MAD/mois</span>
                        <div className="flex gap-2">
                          {e.email && (
                            <a href={`mailto:${e.email}`} onClick={ev => ev.stopPropagation()}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                              <Mail size={13}/>
                            </a>
                          )}
                          {e.phone && (
                            <a href={`tel:${e.phone}`} onClick={ev => ev.stopPropagation()}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors">
                              <Phone size={13}/>
                            </a>
                          )}
                          <button onClick={ev => { ev.stopPropagation(); setBadgeEmployee(e) }}
                            title="Générer badge QR"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
                            <QrCode size={13}/>
                          </button>
                          <button onClick={ev => { ev.stopPropagation(); openEdit(e) }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                            <Pencil size={13}/>
                          </button>
                          <button onClick={ev => { ev.stopPropagation(); handleDelete(e._id) }}
                            disabled={deleting === e._id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                            {deleting === e._id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 sticky top-4 overflow-hidden">
                {/* Panel header */}
                <div className={`bg-gradient-to-r ${DEPT_COLOR[selected.department] || 'from-blue-400 to-indigo-500'} p-5`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar with upload overlay */}
                      <div className="relative group">
                        <Avatar emp={selected} size="lg"/>
                        <button
                          onClick={() => panelPhotoRef.current?.click()}
                          disabled={panelUploading}
                          className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {panelUploading
                            ? <Loader2 size={20} className="text-white animate-spin"/>
                            : <Camera size={20} className="text-white"/>}
                        </button>
                        <input ref={panelPhotoRef} type="file" accept="image/*" className="hidden"
                          onChange={e => handlePanelPhoto(e.target.files[0])}/>
                      </div>
                      <div>
                        <h3 className="font-black text-white text-lg leading-tight">
                          {selected.firstName} {selected.lastName}
                        </h3>
                        <p className="text-white/80 text-sm">{selected.position || selected.role || 'Sans fonction'}</p>
                        <p className="text-white/60 text-xs mt-0.5">{selected.department}</p>
                        {selected.startDate && seniorityText(selected.startDate) && (
                          <p className="text-white/50 text-[10px] mt-0.5 flex items-center gap-1">
                            <Award size={9}/>{seniorityText(selected.startDate)} d'ancienneté
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setSelected(null)}
                      className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors">
                      <X size={14}/>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {selected.status && (
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white`}>
                        {selected.status}
                      </span>
                    )}
                    {selected.contractType && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
                        {selected.contractType}
                      </span>
                    )}
                    <span className="text-xs text-white/70 ml-auto font-semibold">{fmt(selected.salary)} MAD/mois</span>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 dark:border-navy-700">
                  {[
                    { id: 'fiche',    label: 'Fiche',    icon: <UserCheck size={12}/> },
                    { id: 'taches',   label: 'Tâches',   icon: <ClipboardList size={12}/> },
                    { id: 'conges',   label: 'Congés',   icon: <CalendarOff size={12}/> },
                    { id: 'presence', label: 'Présence', icon: <Clock size={12}/> },
                  ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-bold transition-colors
                        ${activeTab === t.id
                          ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-500/5'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                      {t.icon}{t.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">

                  {/* ── Fiche tab ─────────────────────────────────────── */}
                  {activeTab === 'fiche' && (
                    <>
                      {/* Contact */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Contact</p>
                        {selected.email && (
                          <a href={`mailto:${selected.email}`}
                            className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 hover:text-blue-500 transition-colors">
                            <Mail size={13} className="text-slate-400 shrink-0"/>
                            <span className="truncate">{selected.email}</span>
                          </a>
                        )}
                        {selected.phone && (
                          <a href={`tel:${selected.phone}`}
                            className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 hover:text-green-500 transition-colors">
                            <Phone size={13} className="text-slate-400 shrink-0"/>
                            {selected.phone}
                          </a>
                        )}
                        {selected.address && (
                          <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                            <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5"/>
                            {selected.address}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 dark:border-navy-700"/>

                      {/* Contrat */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Contrat</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {selected.cin && (
                            <div className="bg-slate-50 dark:bg-navy-800 rounded-lg p-2.5">
                              <p className="text-slate-400 text-[10px] mb-0.5">CIN</p>
                              <p className="font-semibold text-slate-800 dark:text-white font-mono">{selected.cin}</p>
                            </div>
                          )}
                          <div className="bg-slate-50 dark:bg-navy-800 rounded-lg p-2.5">
                            <p className="text-slate-400 text-[10px] mb-0.5">Salaire</p>
                            <p className="font-bold text-slate-800 dark:text-white">{fmt(selected.salary)} MAD</p>
                          </div>
                          {selected.startDate && (
                            <div className="bg-slate-50 dark:bg-navy-800 rounded-lg p-2.5">
                              <p className="text-slate-400 text-[10px] mb-0.5">Embauche</p>
                              <p className="font-semibold text-slate-800 dark:text-white">{fmtD(selected.startDate)}</p>
                            </div>
                          )}
                          {selected.endDate && (
                            <div className="bg-slate-50 dark:bg-navy-800 rounded-lg p-2.5">
                              <p className="text-slate-400 text-[10px] mb-0.5">Fin contrat</p>
                              <p className="font-semibold text-slate-800 dark:text-white">{fmtD(selected.endDate)}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {selected.notes && (
                        <>
                          <div className="border-t border-slate-100 dark:border-navy-700"/>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Notes</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-navy-800 rounded-xl p-3">
                              {selected.notes}
                            </p>
                          </div>
                        </>
                      )}

                      {/* ── Avances sur salaire ───────────────────────── */}
                      <div className="border-t border-slate-100 dark:border-navy-700"/>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                            <Wallet size={10}/>Avances sur salaire
                            {(selected.advances?.length > 0) && (
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                selected.advances.some(a => a.status === 'en attente')
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400'
                              }`}>{selected.advances.length}</span>
                            )}
                          </p>
                          <button onClick={() => setAddAdvanceOpen(o => !o)}
                            className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 font-semibold transition-colors">
                            <Plus size={10}/>{addAdvanceOpen ? 'Annuler' : 'Ajouter'}
                          </button>
                        </div>

                        {/* Add advance form */}
                        {addAdvanceOpen && (
                          <div className="bg-slate-50 dark:bg-navy-800 rounded-xl p-3 border border-slate-200 dark:border-navy-600 mb-2 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Date *</label>
                                <input type="date" value={advanceForm.date}
                                  onChange={e => setAdvanceForm(f => ({ ...f, date: e.target.value }))}
                                  className={inpSm}/>
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Montant (MAD) *</label>
                                <input type="number" value={advanceForm.amount} placeholder="500"
                                  onChange={e => setAdvanceForm(f => ({ ...f, amount: e.target.value }))}
                                  className={inpSm}/>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Motif</label>
                              <input value={advanceForm.reason} placeholder="Motif de l'avance…"
                                onChange={e => setAdvanceForm(f => ({ ...f, reason: e.target.value }))}
                                className={inpSm}/>
                            </div>
                            <button onClick={handleAddAdvance}
                              disabled={savingSubresource || !advanceForm.date || !advanceForm.amount}
                              className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                              {savingSubresource ? <Loader2 size={12} className="animate-spin"/> : <Plus size={12}/>}
                              Enregistrer l'avance
                            </button>
                          </div>
                        )}

                        {/* Advances list */}
                        {(!selected.advances?.length && !addAdvanceOpen) ? (
                          <p className="text-[10px] text-slate-400 text-center py-2">Aucune avance enregistrée</p>
                        ) : (
                          <div className="space-y-1.5">
                            {(selected.advances || []).map(adv => (
                              <div key={adv._id}
                                className="bg-slate-50 dark:bg-navy-800 rounded-lg px-2.5 py-2 border border-slate-100 dark:border-navy-700 flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-800 dark:text-white">{fmt(adv.amount)} MAD</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                      adv.status === 'déduit'
                                        ? 'bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                                    }`}>{adv.status || 'en attente'}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {adv.date ? new Date(adv.date).toLocaleDateString('fr-FR') : ''}
                                    {adv.reason ? ` · ${adv.reason}` : ''}
                                  </p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  {(!adv.status || adv.status === 'en attente') && (
                                    <button onClick={() => handleAdvanceStatus(adv._id, 'déduit')}
                                      title="Marquer comme déduit"
                                      disabled={savingSubresource}
                                      className="p-1 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-40">
                                      <BadgeCheck size={12}/>
                                    </button>
                                  )}
                                  <button onClick={() => handleDeleteAdvance(adv._id)}
                                    disabled={savingSubresource}
                                    className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                                    <Trash2 size={12}/>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ── Formations & Habilitations ───────────────── */}
                      <div className="border-t border-slate-100 dark:border-navy-700"/>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                            <GraduationCap size={10}/>Formations & Habilitations
                            {(selected.trainings?.length > 0) && (() => {
                              const expiring = (selected.trainings || []).filter(t => {
                                if (!t.expiryDate) return false
                                return Math.ceil((new Date(t.expiryDate) - new Date()) / 86400000) < 30
                              }).length
                              return (
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                  expiring > 0
                                    ? 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                }`}>
                                  {expiring > 0 ? `⚠ ${expiring} expir.` : selected.trainings.length}
                                </span>
                              )
                            })()}
                          </p>
                          <button onClick={() => setAddTrainingOpen(o => !o)}
                            className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 font-semibold transition-colors">
                            <Plus size={10}/>{addTrainingOpen ? 'Annuler' : 'Ajouter'}
                          </button>
                        </div>

                        {/* Add training form */}
                        {addTrainingOpen && (
                          <div className="bg-slate-50 dark:bg-navy-800 rounded-xl p-3 border border-slate-200 dark:border-navy-600 mb-2 space-y-2">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Titre / Habilitation *</label>
                              <input value={trainingForm.title} placeholder="Ex : Habilitation électrique B1, CACES R486…"
                                onChange={e => setTrainingForm(f => ({ ...f, title: e.target.value }))}
                                className={inpSm}/>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Type</label>
                                <select value={trainingForm.type}
                                  onChange={e => setTrainingForm(f => ({ ...f, type: e.target.value }))}
                                  className={inpSm}>
                                  {TRAINING_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Organisme</label>
                                <input value={trainingForm.organiser} placeholder="OFPPT, IRATA…"
                                  onChange={e => setTrainingForm(f => ({ ...f, organiser: e.target.value }))}
                                  className={inpSm}/>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Date d'obtention</label>
                                <input type="date" value={trainingForm.date}
                                  onChange={e => setTrainingForm(f => ({ ...f, date: e.target.value }))}
                                  className={inpSm}/>
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Expiration</label>
                                <input type="date" value={trainingForm.expiryDate}
                                  onChange={e => setTrainingForm(f => ({ ...f, expiryDate: e.target.value }))}
                                  className={inpSm}/>
                              </div>
                            </div>
                            <button onClick={handleAddTraining}
                              disabled={savingSubresource || !trainingForm.title}
                              className="w-full py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                              {savingSubresource ? <Loader2 size={12} className="animate-spin"/> : <Plus size={12}/>}
                              Enregistrer
                            </button>
                          </div>
                        )}

                        {/* Trainings list */}
                        {(!selected.trainings?.length && !addTrainingOpen) ? (
                          <p className="text-[10px] text-slate-400 text-center py-2">Aucune formation enregistrée</p>
                        ) : (
                          <div className="space-y-1.5">
                            {(selected.trainings || []).map(tr => {
                              const exp = trainingExpiryInfo(tr.expiryDate)
                              return (
                                <div key={tr._id}
                                  className="bg-slate-50 dark:bg-navy-800 rounded-lg px-2.5 py-2 border border-slate-100 dark:border-navy-700">
                                  <div className="flex items-start gap-2">
                                    <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${exp.dot}`}/>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{tr.title}</p>
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400 shrink-0">
                                          {tr.type}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                        {tr.organiser && `${tr.organiser}`}
                                        {tr.date && ` · ${new Date(tr.date).toLocaleDateString('fr-FR')}`}
                                      </p>
                                      {tr.expiryDate && (
                                        <p className={`text-[10px] font-semibold mt-0.5 ${exp.cls}`}>
                                          Exp. {new Date(tr.expiryDate).toLocaleDateString('fr-FR')} — {exp.label}
                                        </p>
                                      )}
                                    </div>
                                    <button onClick={() => handleDeleteTraining(tr._id)}
                                      disabled={savingSubresource}
                                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0 disabled:opacity-40">
                                      <Trash2 size={11}/>
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => openEdit(selected)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">
                          <Pencil size={13}/> Modifier
                        </button>
                        <Link to={`/admin/hr/${selected._id}`}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors">
                          Fiche complète <ArrowRight size={13}/>
                        </Link>
                      </div>
                    </>
                  )}

                  {/* ── Tâches tab ────────────────────────────────────── */}
                  {activeTab === 'taches' && (
                    <>
                      {tasksLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 size={22} className="animate-spin text-blue-500"/>
                        </div>
                      ) : tasks.length === 0 ? (
                        <div className="text-center py-10">
                          <ClipboardList size={28} className="mx-auto mb-2 text-slate-300"/>
                          <p className="text-xs text-slate-400">Aucune tâche assignée</p>
                        </div>
                      ) : (
                        <>
                          {/* Progress bar */}
                          <div>
                            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                              <span>{doneTasks}/{tasks.length} tâches terminées</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">{taskPct}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${taskPct}%` }}/>
                            </div>
                          </div>
                          {/* Task groups */}
                          {taskGroups.filter(g => g.items.length > 0).map(g => {
                            const ts = TASK_STATUS[g.status]
                            return (
                              <div key={g.status}>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${ts.cls}`}>
                                    {ts.icon}{ts.label}
                                  </span>
                                  <span className="text-[10px] text-slate-400">{g.items.length}</span>
                                </div>
                                <div className="space-y-1.5">
                                  {g.items.map(t => (
                                    <div key={t._id}
                                      className="bg-slate-50 dark:bg-navy-800 rounded-xl p-2.5 border border-slate-100 dark:border-navy-700">
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="text-xs font-semibold text-slate-800 dark:text-white leading-tight">{t.title}</p>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${TASK_PRIORITY[t.priority] || ''}`}>
                                          {t.priority}
                                        </span>
                                      </div>
                                      {t.project && <p className="text-[10px] text-slate-400 mt-1">{t.project}</p>}
                                      {t.dueDate && (
                                        <p className={`text-[10px] mt-1 flex items-center gap-1
                                          ${new Date(t.dueDate) < new Date() && t.status !== 'done'
                                            ? 'text-red-500' : 'text-slate-400'}`}>
                                          <Calendar size={9}/>
                                          {new Date(t.dueDate).toLocaleDateString('fr-FR')}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </>
                      )}
                    </>
                  )}

                  {/* ── Congés tab ─────────────────────────────────────── */}
                  {activeTab === 'conges' && (
                    <>
                      {leavesLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 size={22} className="animate-spin text-blue-500"/>
                        </div>
                      ) : (
                        <>
                          {/* Balance cards */}
                          {leaveBalance && (
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-2.5 text-center">
                                <p className="text-base font-black text-blue-600 dark:text-blue-400">{leaveBalance.annual?.quota ?? 18}</p>
                                <p className="text-[10px] text-slate-500">Quota</p>
                              </div>
                              <div className="bg-orange-50 dark:bg-orange-500/10 rounded-xl p-2.5 text-center">
                                <p className="text-base font-black text-orange-600 dark:text-orange-400">{leaveBalance.annual?.used ?? 0}</p>
                                <p className="text-[10px] text-slate-500">Pris</p>
                              </div>
                              <div className={`rounded-xl p-2.5 text-center ${
                                (leaveBalance.annual?.remaining ?? 18) < 3
                                  ? 'bg-red-50 dark:bg-red-500/10'
                                  : 'bg-emerald-50 dark:bg-emerald-500/10'
                              }`}>
                                <p className={`text-base font-black ${
                                  (leaveBalance.annual?.remaining ?? 18) < 3
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}>{leaveBalance.annual?.remaining ?? 18}</p>
                                <p className="text-[10px] text-slate-500">Restant</p>
                              </div>
                            </div>
                          )}

                          {/* Leave history */}
                          {leaves.length === 0 ? (
                            <div className="text-center py-8">
                              <CalendarOff size={24} className="mx-auto mb-2 text-slate-300"/>
                              <p className="text-xs text-slate-400">Aucun congé enregistré</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {leaves.slice(0, 10).map(l => {
                                const sClsMap = {
                                  pending:  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
                                  approved: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
                                  rejected: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
                                }
                                const sLblMap = { pending: 'Attente', approved: 'Approuvé', rejected: 'Refusé' }
                                return (
                                  <div key={l._id}
                                    className="bg-slate-50 dark:bg-navy-800 rounded-xl px-3 py-2 border border-slate-100 dark:border-navy-700">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{l.type}</p>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${sClsMap[l.status] || ''}`}>
                                        {sLblMap[l.status] || l.status}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {new Date(l.startDate).toLocaleDateString('fr-FR')} → {new Date(l.endDate).toLocaleDateString('fr-FR')}
                                      {l.days ? ` · ${l.days}j` : ''}
                                    </p>
                                    {l.reason && <p className="text-[10px] text-slate-400 truncate">{l.reason}</p>}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {/* ── Présence tab ───────────────────────────────────── */}
                  {activeTab === 'presence' && (
                    <>
                      {attendanceLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 size={22} className="animate-spin text-blue-500"/>
                        </div>
                      ) : attendance.length === 0 ? (
                        <div className="text-center py-8">
                          <Clock size={24} className="mx-auto mb-2 text-slate-300"/>
                          <p className="text-xs text-slate-400">Aucun pointage récent</p>
                        </div>
                      ) : (
                        <>
                          {/* Mini summary */}
                          {(() => {
                            const last30 = attendance.slice(0, 30)
                            const present = last30.filter(a => a.status === 'present' || a.status === 'late').length
                            const absent  = last30.filter(a => a.status === 'absent').length
                            const holiday = last30.filter(a => a.status === 'holiday').length
                            const totalH  = last30.reduce((s, a) => s + (a.hoursWorked || 0), 0)
                            return (
                              <div className="grid grid-cols-4 gap-1.5 mb-2">
                                {[
                                  { val: present, label: 'Présent', color: 'text-emerald-600 dark:text-emerald-400' },
                                  { val: absent,  label: 'Absent',  color: 'text-red-500' },
                                  { val: holiday, label: 'Congé',   color: 'text-blue-500' },
                                  { val: `${Math.round(totalH)}h`, label: 'Total', color: 'text-slate-700 dark:text-slate-200' },
                                ].map(({ val, label, color }) => (
                                  <div key={label} className="bg-slate-50 dark:bg-navy-800 rounded-xl p-2 text-center border border-slate-100 dark:border-navy-700">
                                    <p className={`text-sm font-black ${color}`}>{val}</p>
                                    <p className="text-[9px] text-slate-400">{label}</p>
                                  </div>
                                ))}
                              </div>
                            )
                          })()}

                          {/* Day-by-day list */}
                          <div className="space-y-1">
                            {attendance.slice(0, 20).map(a => {
                              const stCls = {
                                present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
                                late:    'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
                                absent:  'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
                                holiday: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
                              }[a.status] || 'bg-slate-100 text-slate-600 dark:text-slate-400'
                              const stLbl = { present: 'Présent', late: 'Retard', absent: 'Absent', holiday: 'Congé' }[a.status] || a.status
                              return (
                                <div key={a._id}
                                  className="flex items-center justify-between bg-slate-50 dark:bg-navy-800 rounded-xl px-3 py-2 border border-slate-100 dark:border-navy-700">
                                  <div>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-white">
                                      {new Date(a.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </p>
                                    {(a.checkIn || a.checkOut) && (
                                      <p className="text-[10px] text-slate-400">
                                        {a.checkIn  && `↑ ${a.checkIn}`}
                                        {a.checkOut && ` ↓ ${a.checkOut}`}
                                        {a.hoursWorked ? ` · ${a.hoursWorked}h` : ''}
                                        {a.overtime > 0 ? ` (+${a.overtime}h sup)` : ''}
                                      </p>
                                    )}
                                  </div>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${stCls}`}>{stLbl}</span>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      <Modal open={modal} onClose={close} title={editing ? "Modifier l'employé" : 'Nouvel employé'} size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* ── Section : Photo ──────────────────────────────────────── */}
          <div className="flex items-center gap-4">
            {photoPreview || editing?.photo ? (
              <div className="relative">
                <img src={photoPreview || editing?.photo} alt="Aperçu"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 dark:border-navy-600"/>
                {photoPreview && (
                  <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5">
                    <X size={10}/>
                  </button>
                )}
              </div>
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center">
                <Camera size={22} className="text-white opacity-60"/>
              </div>
            )}
            <div>
              <button type="button" onClick={() => modalPhotoRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-navy-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">
                <UploadCloud size={13}/> {editing?.photo ? 'Changer la photo' : 'Ajouter une photo'}
              </button>
              <p className="text-[10px] text-slate-400 mt-1">JPG, PNG · max 5 Mo</p>
              <input ref={modalPhotoRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)) } }}/>
            </div>
          </div>

          {/* ── Section : Identité ───────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-px bg-slate-200 dark:bg-navy-600"/>Identité<span className="flex-1 h-px bg-slate-200 dark:bg-navy-600"/>
            </p>
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Prénom *"><input {...register('firstName', { required: true })} className={inp} placeholder="Mohammed"/></Field>
                <Field label="Nom *"><input {...register('lastName', { required: true })} className={inp} placeholder="Alami"/></Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Poste / Fonction"><input {...register('position')} className={inp} placeholder="Chef de chantier"/></Field>
                <Field label="Département">
                  <select {...register('department')} className={inp}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Email"><input {...register('email')} type="email" className={inp}/></Field>
                <Field label="Téléphone"><input {...register('phone')} className={inp} placeholder="+212 6XX XXX XXX"/></Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="CIN"><input {...register('cin')} className={inp} placeholder="AB123456"/></Field>
                <Field label="Adresse"><input {...register('address')} className={inp} placeholder="Adresse personnelle"/></Field>
              </div>
            </div>
          </div>

          {/* ── Section : Contrat ────────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-px bg-slate-200 dark:bg-navy-600"/>Contrat<span className="flex-1 h-px bg-slate-200 dark:bg-navy-600"/>
            </p>
            <div className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Type contrat">
                  <select {...register('contractType')} className={inp}>
                    {CONTRACTS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Salaire (MAD/mois)">
                  <input {...register('salary', { valueAsNumber: true })} type="number" className={inp} placeholder="8000"/>
                </Field>
                <Field label="Statut">
                  <select {...register('status')} className={inp}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Date d'embauche"><input {...register('startDate')} type="date" className={inp}/></Field>
                <Field label="Fin contrat (CDD)"><input {...register('endDate')} type="date" className={inp}/></Field>
              </div>
            </div>
          </div>

          {/* ── Section : Administratif ──────────────────────────────── */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-px bg-slate-200 dark:bg-navy-600"/>Administratif<span className="flex-1 h-px bg-slate-200 dark:bg-navy-600"/>
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="N° CNSS">
                <input {...register('cnss')} className={inp} placeholder="Ex : 123456789"/>
              </Field>
              <Field label="RIB bancaire">
                <input {...register('rib')} className={inp} placeholder="Ex : 011 780 0001234567891234 56"/>
              </Field>
            </div>
          </div>

          {/* ── Section : Contact d'urgence ──────────────────────────── */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-px bg-slate-200 dark:bg-navy-600"/>
              <ShieldAlert size={11} className="text-slate-400"/>Contact d'urgence
              <span className="flex-1 h-px bg-slate-200 dark:bg-navy-600"/>
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Nom complet">
                <input {...register('emergencyContact.name')} className={inp} placeholder="Fatima Alami"/>
              </Field>
              <Field label="Téléphone">
                <input {...register('emergencyContact.phone')} className={inp} placeholder="+212 6XX XXX XXX"/>
              </Field>
              <Field label="Lien de parenté">
                <input {...register('emergencyContact.relation')} className={inp} placeholder="Épouse, Parent…"/>
              </Field>
            </div>
          </div>

          {/* ── Section : Compétences ────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-px bg-slate-200 dark:bg-navy-600"/>
              <Tag size={11} className="text-slate-400"/>Compétences
              <span className="flex-1 h-px bg-slate-200 dark:bg-navy-600"/>
            </p>
            <div className="flex gap-2">
              <input
                ref={skillRef}
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                className={inp}
                placeholder="Ex : Maçonnerie, Ferraillage, Coffrage… puis Entrée"/>
              <button type="button" onClick={addSkill}
                className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors shrink-0">
                +
              </button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map(s => (
                  <span key={s} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 rounded-full">
                    {s}
                    <button type="button" onClick={() => removeSkill(s)} className="hover:text-red-500 transition-colors"><X size={11}/></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Section : Documents ──────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-px bg-slate-200 dark:bg-navy-600"/>
              <Paperclip size={11} className="text-slate-400"/>Documents à importer
              <span className="flex-1 h-px bg-slate-200 dark:bg-navy-600"/>
            </p>

            {/* Drop zone */}
            <div
              onClick={() => docInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); addPendingDocs(e.dataTransfer.files) }}
              className="border-2 border-dashed border-slate-200 dark:border-navy-600 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-colors">
              <UploadCloud size={20} className="mx-auto mb-2 text-slate-300"/>
              <p className="text-sm text-slate-500">Cliquer ou glisser des fichiers ici</p>
              <p className="text-[10px] text-slate-400 mt-1">PDF, images, Word, Excel · max 20 Mo chacun</p>
              <input ref={docInputRef} type="file" multiple className="hidden"
                onChange={e => addPendingDocs(e.target.files)}/>
            </div>

            {/* Pending list */}
            {pendingDocs.length > 0 && (
              <div className="mt-3 space-y-2">
                {pendingDocs.map((pd, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-50 dark:bg-navy-800 rounded-xl p-3 border border-slate-100 dark:border-navy-700">
                    <span className="text-xl shrink-0">{fileIcon(pd.file.type)}</span>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <input
                        value={pd.name}
                        onChange={e => updatePendingDoc(idx, 'name', e.target.value)}
                        className="w-full bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Nom du document"/>
                      <div className="flex items-center gap-2">
                        <select
                          value={pd.type}
                          onChange={e => updatePendingDoc(idx, 'type', e.target.value)}
                          className="flex-1 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
                          {EMP_DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                        <span className="text-[10px] text-slate-400 shrink-0">{fmtSize(pd.file.size)}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => removePendingDoc(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors shrink-0">
                      <X size={14}/>
                    </button>
                  </div>
                ))}
                <p className="text-[10px] text-slate-400 text-right">{pendingDocs.length} fichier{pendingDocs.length > 1 ? 's' : ''} à importer</p>
              </div>
            )}
          </div>

          {/* ── Section : Notes ──────────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-px bg-slate-200 dark:bg-navy-600"/>Notes<span className="flex-1 h-px bg-slate-200 dark:bg-navy-600"/>
            </p>
            <textarea {...register('notes')} rows={2} className={`${inp} resize-none`} placeholder="Remarques, informations complémentaires…"/>
          </div>

          {/* ── Footer ───────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-navy-700">
            <button type="button" onClick={close}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin"/>}
              {editing ? 'Enregistrer' : `Créer${pendingDocs.length > 0 ? ` + ${pendingDocs.length} doc${pendingDocs.length > 1 ? 's' : ''}` : ''}`}
            </button>
          </div>
        </form>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)}/>
      <BadgeModal employee={badgeEmployee} onClose={() => setBadgeEmployee(null)}/>
    </>
  )
}
