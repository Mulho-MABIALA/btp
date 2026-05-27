import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  Loader2, Truck, Plus, Pencil, Trash2, AlertTriangle, Wrench,
  UploadCloud, Image, X, MapPin, Clock, Gauge, FolderOpen,
  ExternalLink, ChevronRight, CheckCircle2, CalendarDays,
} from 'lucide-react'
import { adminEquipment, adminProjects } from '../adminApi'
import Modal from '../components/Modal'

/* ── Constants ─────────────────────────────────────────────────────────── */
const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const inpSm = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
  </div>
)
const fmt  = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0)
const fmtD = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

const STATUS = {
  available:   { label: 'Disponible',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', dot: 'bg-emerald-500' },
  in_use:      { label: 'En service',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',             dot: 'bg-blue-500' },
  maintenance: { label: 'Maintenance', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',     dot: 'bg-orange-400' },
  retired:     { label: 'Hors service',cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',         dot: 'bg-slate-400' },
}
const MAINT_TYPE = {
  preventive:  { label: 'Préventive',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  corrective:  { label: 'Corrective',  cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
  inspection:  { label: 'Inspection',  cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' },
  other:       { label: 'Autre',       cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400' },
}
const TYPES = ['Grue','Bulldozer','Pelleteuse','Bétonnière','Compacteur','Camion','Chariot élévateur','Échafaudage','Génératrice','Pompe à béton','Autre']

const isMaintenanceAlert = eq => {
  if (!eq.nextMaintenanceDate) return false
  return new Date(eq.nextMaintenanceDate) <= new Date(Date.now() + 7 * 24 * 3600 * 1000)
}

/* ── Toast ─────────────────────────────────────────────────────────────── */
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  const ok = toast.type === 'success'
  return (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border
      ${ok ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-500/30'
           : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-500/30'}`}>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black
        ${ok ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
        {ok ? '✓' : '✕'}
      </span>
      <p className={`text-sm font-medium ${ok ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
        {toast.msg}
      </p>
      <button onClick={onClose}><X size={13} className="text-slate-400"/></button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function AdminEquipment() {
  const navigate = useNavigate()

  const [data,    setData]    = useState([])
  const [projects,setProjects]= useState([])
  const [loading, setLoading] = useState(true)
  const [selected,setSelected]= useState(null)     // équipement sélectionné (panneau)
  const [panelTab,setPanelTab]= useState('infos')
  const [statusFilter, setStatusFilter] = useState('all')
  const [toast,   setToast]   = useState(null)

  // Modal création/édition
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [imageFile,    setImageFile]    = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [uploadingImg, setUploadingImg] = useState(false)
  const imageRef = useRef()

  // Panneau – photos
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [dragPhoto,      setDragPhoto]      = useState(false)
  const [lightbox,       setLightbox]       = useState(null)
  const photoRef = useRef()

  // Panneau – maintenance
  const [addingMaint, setAddingMaint] = useState(false)
  const [maintForm,   setMaintForm]   = useState({ date: new Date().toISOString().split('T')[0], type: 'preventive', description: '', cost: '', technician: '', hoursAtService: '', nextDate: '' })

  // Panneau – compteurs
  const [editCounters, setEditCounters] = useState(false)
  const [counters,     setCounters]     = useState({ hoursCounter: 0, kmCounter: 0 })
  const [savingCounters, setSavingCounters] = useState(false)

  const { register, handleSubmit, reset, watch } = useForm()

  /* ── Load ─────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [eqRes, projRes] = await Promise.all([
        adminEquipment.getAll(),
        adminProjects.getAll().catch(() => ({ data: [] })),
      ])
      setData(eqRes.data)
      setProjects(projRes.data)
      // Mettre à jour l'équipement sélectionné si présent
      if (selected) {
        const updated = eqRes.data.find(e => e._id === selected._id)
        if (updated) setSelected(updated)
      }
    } finally { setLoading(false) }
  }, [selected])

  useEffect(() => { load() }, []) // eslint-disable-line

  /* ── Modal ────────────────────────────────────────────────────────────── */
  const openAdd = () => {
    setEditing(null)
    reset({ status: 'available', hoursCounter: 0, kmCounter: 0 })
    setImageFile(null); setImagePreview('')
    setModal(true)
  }
  const openEdit = (eq) => {
    setEditing(eq)
    reset({
      ...eq,
      projectRef:         eq.projectRef?._id || eq.projectRef || '',
      purchaseDate:       eq.purchaseDate?.split?.('T')[0] || '',
      lastMaintenanceDate:eq.lastMaintenanceDate?.split?.('T')[0] || '',
      nextMaintenanceDate:eq.nextMaintenanceDate?.split?.('T')[0] || '',
    })
    setImageFile(null)
    setImagePreview(eq.image || '')
    setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null); setImageFile(null); setImagePreview('') }

  const onSubmit = async (v) => {
    setSaving(true)
    const selectedProject = projects.find(p => p._id === v.projectRef)
    const payload = {
      ...v,
      year:             v.year ? Number(v.year) : undefined,
      purchasePrice:    v.purchasePrice ? Number(v.purchasePrice) : undefined,
      rentalCostPerDay: v.rentalCostPerDay ? Number(v.rentalCostPerDay) : undefined,
      hoursCounter:     Number(v.hoursCounter || 0),
      kmCounter:        Number(v.kmCounter || 0),
      projectRef:       v.projectRef || null,
      projectName:      selectedProject?.title || '',
      image:            imageFile ? (editing?.image || '') : imagePreview,
    }
    try {
      let result
      if (editing) result = await adminEquipment.update(editing._id, payload)
      else         result = await adminEquipment.create(payload)

      if (imageFile) {
        setUploadingImg(true)
        const fd = new FormData()
        fd.append('image', imageFile)
        result = await adminEquipment.uploadImage(result.data._id, fd)
        setUploadingImg(false)
      }
      // Mettre à jour le panneau si cet équipement est sélectionné
      if (selected?._id === result.data._id) setSelected(result.data)
      await load()
      closeModal()
      setToast({ type: 'success', msg: editing ? 'Équipement mis à jour' : 'Équipement créé' })
    } catch (e) {
      setUploadingImg(false)
      setToast({ type: 'error', msg: e.response?.data?.error || 'Erreur' })
    } finally { setSaving(false) }
  }

  /* ── Suppression ─────────────────────────────────────────────────────── */
  const handleDelete = async (eq) => {
    if (!window.confirm(`Supprimer "${eq.name}" ?`)) return
    try {
      await adminEquipment.delete(eq._id)
      if (selected?._id === eq._id) setSelected(null)
      await load()
      setToast({ type: 'success', msg: 'Équipement supprimé' })
    } catch { setToast({ type: 'error', msg: 'Erreur de suppression' }) }
  }

  /* ── Statut rapide ───────────────────────────────────────────────────── */
  const updateStatus = async (id, status) => {
    try {
      const r = await adminEquipment.updateStatus(id, status)
      setData(prev => prev.map(e => e._id === id ? r.data : e))
      if (selected?._id === id) setSelected(r.data)
    } catch { setToast({ type: 'error', msg: 'Erreur' }) }
  }

  /* ── Photo upload (panneau) ──────────────────────────────────────────── */
  const handlePhotoUpload = async (file) => {
    if (!file?.type.startsWith('image/') || !selected) return
    if (file.size > 8 * 1024 * 1024) { setToast({ type: 'error', msg: 'Max 8 MB' }); return }
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const r = await adminEquipment.uploadPhoto(selected._id, fd)
      setSelected(r.data)
      setData(prev => prev.map(e => e._id === selected._id ? r.data : e))
      setToast({ type: 'success', msg: 'Photo ajoutée' })
    } catch { setToast({ type: 'error', msg: 'Erreur upload' }) }
    finally { setUploadingPhoto(false) }
  }

  const removePhoto = async (idx) => {
    if (!window.confirm('Supprimer cette photo ?')) return
    try {
      const r = await adminEquipment.deletePhoto(selected._id, idx)
      setSelected(r.data)
      setData(prev => prev.map(e => e._id === selected._id ? r.data : e))
    } catch { setToast({ type: 'error', msg: 'Erreur' }) }
  }

  /* ── Maintenance ─────────────────────────────────────────────────────── */
  const submitMaintenance = async () => {
    if (!maintForm.date || !selected) return
    setAddingMaint(true)
    try {
      const payload = {
        ...maintForm,
        cost:          maintForm.cost ? Number(maintForm.cost) : 0,
        hoursAtService:maintForm.hoursAtService ? Number(maintForm.hoursAtService) : undefined,
      }
      const r = await adminEquipment.addMaintenance(selected._id, payload)
      setSelected(r.data)
      setData(prev => prev.map(e => e._id === selected._id ? r.data : e))
      setMaintForm({ date: new Date().toISOString().split('T')[0], type: 'preventive', description: '', cost: '', technician: '', hoursAtService: '', nextDate: '' })
      setToast({ type: 'success', msg: 'Entretien enregistré' })
    } catch { setToast({ type: 'error', msg: 'Erreur' }) }
    finally { setAddingMaint(false) }
  }

  const deleteMaintenance = async (mid) => {
    if (!window.confirm('Supprimer cet entretien ?')) return
    try {
      const r = await adminEquipment.deleteMaintenance(selected._id, mid)
      setSelected(r.data)
      setData(prev => prev.map(e => e._id === selected._id ? r.data : e))
    } catch { setToast({ type: 'error', msg: 'Erreur' }) }
  }

  /* ── Compteurs ───────────────────────────────────────────────────────── */
  const saveCounters = async () => {
    setSavingCounters(true)
    try {
      const r = await adminEquipment.updateCounters(selected._id, {
        hoursCounter: Number(counters.hoursCounter),
        kmCounter:    Number(counters.kmCounter),
      })
      setSelected(r.data)
      setData(prev => prev.map(e => e._id === selected._id ? r.data : e))
      setEditCounters(false)
      setToast({ type: 'success', msg: 'Compteurs mis à jour' })
    } finally { setSavingCounters(false) }
  }

  /* ── Stats ───────────────────────────────────────────────────────────── */
  const filtered = statusFilter === 'all' ? data : data.filter(e => e.status === statusFilter)

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)}/>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[9998] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white"><X size={24}/></button>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-xl object-contain" onClick={e => e.stopPropagation()}/>
        </div>
      )}

      <div className="space-y-5">
        {/* ── Header ── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Équipements & Engins</h1>
            <p className="text-slate-500 text-sm mt-1">
              {data.length} équipement{data.length > 1 ? 's' : ''} · {data.filter(e => e.status === 'available').length} disponibles
            </p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors">
            <Plus size={15}/> Nouvel équipement
          </button>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(STATUS).map(([k, v]) => (
            <div key={k} onClick={() => setStatusFilter(statusFilter === k ? 'all' : k)}
              className={`bg-white dark:bg-navy-900 rounded-2xl border p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md
                ${statusFilter === k ? 'border-blue-400 dark:border-blue-500 shadow-sm' : 'border-slate-200 dark:border-navy-700'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2.5 h-2.5 rounded-full ${v.dot}`}/>
                <span className="text-xs text-slate-500 font-medium">{v.label}</span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {data.filter(e => e.status === k).length}
              </div>
              {k === 'maintenance' && data.filter(isMaintenanceAlert).length > 0 && (
                <p className="text-[10px] text-orange-500 font-semibold mt-1 flex items-center gap-1">
                  <AlertTriangle size={9}/> {data.filter(isMaintenanceAlert).length} alerte(s)
                </p>
              )}
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300'}`}>
            Tous
          </button>
          {Object.entries(STATUS).map(([k, v]) => (
            <button key={k} onClick={() => setStatusFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === k ? 'bg-blue-500 text-white' : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300'}`}>
              {v.label}
            </button>
          ))}
        </div>

        {/* ── Grille + panneau ── */}
        <div className={`grid gap-5 ${selected ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>

          {/* Grille */}
          <div className={selected ? 'lg:col-span-2' : 'col-span-1'}>
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 text-slate-400">
                <Truck size={32} className="mx-auto mb-3 opacity-30"/>
                <p className="text-sm">Aucun équipement</p>
              </div>
            ) : (
              <div className={`grid gap-4 ${selected ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
                {filtered.map(eq => {
                  const sc    = STATUS[eq.status] || STATUS.available
                  const alert = isMaintenanceAlert(eq)
                  const isSel = selected?._id === eq._id
                  return (
                    <div key={eq._id}
                      onClick={() => { setSelected(isSel ? null : eq); setPanelTab('infos') }}
                      className={`bg-white dark:bg-navy-900 rounded-2xl border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md
                        ${isSel ? 'border-blue-400 dark:border-blue-500 shadow-md' : alert ? 'border-orange-300 dark:border-orange-500/40' : 'border-slate-200 dark:border-navy-700'}`}>

                      {/* Image */}
                      {eq.image ? (
                        <div className="h-32 rounded-t-2xl overflow-hidden">
                          <img src={eq.image} alt={eq.name} className="w-full h-full object-cover"/>
                        </div>
                      ) : (
                        <div className="h-20 rounded-t-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-navy-800 dark:to-navy-700 flex items-center justify-center">
                          <Truck size={28} className="text-slate-300 dark:text-navy-600"/>
                        </div>
                      )}

                      <div className="p-4">
                        {/* Statut + alerte */}
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                          {alert && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400 flex items-center gap-1">
                              <AlertTriangle size={8}/> Maintenance
                            </span>
                          )}
                        </div>

                        {/* Nom */}
                        <h3 className="font-bold text-slate-900 dark:text-white truncate">{eq.name}</h3>
                        <p className="text-xs text-slate-500 truncate">
                          {[eq.type, eq.brand, eq.model].filter(Boolean).join(' · ')}
                        </p>

                        {/* Infos rapides */}
                        <div className="mt-2 space-y-1">
                          {eq.location && (
                            <p className="flex items-center gap-1.5 text-xs text-slate-500">
                              <MapPin size={10} className="shrink-0"/>{eq.location}
                            </p>
                          )}
                          {(eq.projectRef || eq.projectName) && (
                            <p className="flex items-center gap-1.5 text-xs text-blue-500">
                              <FolderOpen size={10} className="shrink-0"/>
                              {eq.projectRef?.title || eq.projectName}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            {eq.hoursCounter > 0 && (
                              <span className="flex items-center gap-1"><Clock size={10}/>{fmt(eq.hoursCounter)} h</span>
                            )}
                            {eq.kmCounter > 0 && (
                              <span className="flex items-center gap-1"><Gauge size={10}/>{fmt(eq.kmCounter)} km</span>
                            )}
                          </div>
                          {eq.nextMaintenanceDate && (
                            <p className={`flex items-center gap-1.5 text-xs ${alert ? 'text-orange-500 font-semibold' : 'text-slate-400'}`}>
                              <Wrench size={10}/> {fmtD(eq.nextMaintenanceDate)}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-navy-700"
                          onClick={e => e.stopPropagation()}>
                          <select value={eq.status} onChange={e => updateStatus(eq._id, e.target.value)}
                            className="flex-1 text-xs bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400">
                            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                          <button onClick={() => openEdit(eq)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                            <Pencil size={13}/>
                          </button>
                          <button onClick={() => handleDelete(eq)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Panneau détail ── */}
          {selected && (
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden sticky top-5">

                {/* Image bannière */}
                {selected.image ? (
                  <div className="h-36 overflow-hidden relative">
                    <img src={selected.image} alt={selected.name} className="w-full h-full object-cover"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"/>
                    <button onClick={() => setSelected(null)} className="absolute top-2 right-2 p-1 bg-black/40 rounded-lg text-white hover:bg-black/60">
                      <X size={13}/>
                    </button>
                    <div className="absolute bottom-2 left-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(STATUS[selected.status] || STATUS.available).cls}`}>
                        {(STATUS[selected.status] || STATUS.available).label}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(STATUS[selected.status] || STATUS.available).cls}`}>
                      {(STATUS[selected.status] || STATUS.available).label}
                    </span>
                    <button onClick={() => setSelected(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                      <X size={13}/>
                    </button>
                  </div>
                )}

                {/* Nom */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-navy-700">
                  <h3 className="font-black text-slate-900 dark:text-white">{selected.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{[selected.type, selected.brand, selected.model].filter(Boolean).join(' · ')}</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 dark:border-navy-700">
                  {[
                    ['infos',       'Infos'],
                    ['maintenance', `Entretien${selected.maintenanceHistory?.length ? ` (${selected.maintenanceHistory.length})` : ''}`],
                    ['photos',      `Photos${selected.photos?.length ? ` (${selected.photos.length})` : ''}`],
                  ].map(([k, l]) => (
                    <button key={k} onClick={() => setPanelTab(k)}
                      className={`flex-1 py-2.5 text-[11px] font-semibold border-b-2 transition-colors ${
                        panelTab === k ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>

                {/* ─── INFOS ─── */}
                {panelTab === 'infos' && (
                  <div className="p-4 space-y-4 max-h-[520px] overflow-y-auto">

                    {/* Compteurs */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Compteurs</p>
                        <button onClick={() => { setCounters({ hoursCounter: selected.hoursCounter || 0, kmCounter: selected.kmCounter || 0 }); setEditCounters(!editCounters) }}
                          className="text-[10px] text-blue-500 font-semibold">
                          {editCounters ? 'Annuler' : 'Modifier'}
                        </button>
                      </div>
                      {editCounters ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] text-slate-400 mb-1 block">Heures</label>
                              <input type="number" value={counters.hoursCounter}
                                onChange={e => setCounters(p => ({ ...p, hoursCounter: e.target.value }))}
                                className={inpSm}/>
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-slate-400 mb-1 block">Km</label>
                              <input type="number" value={counters.kmCounter}
                                onChange={e => setCounters(p => ({ ...p, kmCounter: e.target.value }))}
                                className={inpSm}/>
                            </div>
                          </div>
                          <button onClick={saveCounters} disabled={savingCounters}
                            className="w-full py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-60">
                            {savingCounters && <Loader2 size={11} className="animate-spin"/>} Enregistrer
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 dark:bg-navy-800 rounded-xl p-3 flex items-center gap-2">
                            <Clock size={14} className="text-blue-500 shrink-0"/>
                            <div>
                              <p className="text-[10px] text-slate-400">Heures</p>
                              <p className="text-sm font-black text-slate-900 dark:text-white">{fmt(selected.hoursCounter || 0)} h</p>
                            </div>
                          </div>
                          <div className="bg-slate-50 dark:bg-navy-800 rounded-xl p-3 flex items-center gap-2">
                            <Gauge size={14} className="text-violet-500 shrink-0"/>
                            <div>
                              <p className="text-[10px] text-slate-400">Kilomètres</p>
                              <p className="text-sm font-black text-slate-900 dark:text-white">{fmt(selected.kmCounter || 0)} km</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Projet actuel */}
                    {(selected.projectRef || selected.projectName) && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Projet actuel</p>
                        <button
                          onClick={() => selected.projectRef && navigate(`/admin/projects/${selected.projectRef._id || selected.projectRef}`)}
                          className={`flex items-center gap-2 text-sm font-semibold ${selected.projectRef ? 'text-blue-500 hover:underline' : 'text-slate-600 dark:text-slate-300 cursor-default'}`}>
                          <FolderOpen size={13}/>
                          {selected.projectRef?.title || selected.projectName}
                          {selected.projectRef && <ChevronRight size={11}/>}
                        </button>
                      </div>
                    )}

                    {/* Détails techniques */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Identification</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        {[
                          ['Année',      selected.year],
                          ['N° Série',   selected.serialNumber],
                          ['Localisation',selected.location],
                          ['Valeur achat',selected.purchasePrice > 0 ? `${fmt(selected.purchasePrice)} MAD` : null],
                          ['Date achat', selected.purchaseDate ? fmtD(selected.purchaseDate) : null],
                          ['Location/jour',selected.rentalCostPerDay > 0 ? `${fmt(selected.rentalCostPerDay)} MAD` : null],
                        ].filter(([, v]) => v).map(([l, v]) => (
                          <div key={l}>
                            <p className="text-slate-400">{l}</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Maintenance dates */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Maintenance</p>
                      <div className="space-y-1 text-xs">
                        {selected.lastMaintenanceDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Dernière</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{fmtD(selected.lastMaintenanceDate)}</span>
                          </div>
                        )}
                        {selected.nextMaintenanceDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Prochaine</span>
                            <span className={`font-semibold ${isMaintenanceAlert(selected) ? 'text-orange-500' : 'text-slate-700 dark:text-slate-200'}`}>
                              {fmtD(selected.nextMaintenanceDate)}
                              {isMaintenanceAlert(selected) && ' ⚠'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {selected.notes && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Notes</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{selected.notes}</p>
                      </div>
                    )}

                    {/* Modifier */}
                    <button onClick={() => openEdit(selected)}
                      className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                      <Pencil size={12}/> Modifier cet équipement
                    </button>
                  </div>
                )}

                {/* ─── MAINTENANCE ─── */}
                {panelTab === 'maintenance' && (
                  <div className="p-4 space-y-4 max-h-[520px] overflow-y-auto">

                    {/* Formulaire ajout */}
                    <div className="bg-slate-50 dark:bg-navy-800 rounded-xl p-3 space-y-2.5 border border-slate-200 dark:border-navy-600">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Nouvel entretien</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 mb-1 block">Date *</label>
                          <input type="date" value={maintForm.date}
                            onChange={e => setMaintForm(p => ({ ...p, date: e.target.value }))}
                            className={inpSm}/>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 mb-1 block">Type</label>
                          <select value={maintForm.type}
                            onChange={e => setMaintForm(p => ({ ...p, type: e.target.value }))}
                            className={inpSm}>
                            {Object.entries(MAINT_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 mb-1 block">Description</label>
                        <input type="text" value={maintForm.description}
                          onChange={e => setMaintForm(p => ({ ...p, description: e.target.value }))}
                          placeholder="Vidange moteur, remplacement filtre…"
                          className={inpSm}/>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 mb-1 block">Coût (MAD)</label>
                          <input type="number" value={maintForm.cost}
                            onChange={e => setMaintForm(p => ({ ...p, cost: e.target.value }))}
                            className={inpSm} placeholder="0"/>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 mb-1 block">Technicien</label>
                          <input type="text" value={maintForm.technician}
                            onChange={e => setMaintForm(p => ({ ...p, technician: e.target.value }))}
                            className={inpSm} placeholder="Nom…"/>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 mb-1 block">Heures compteur</label>
                          <input type="number" value={maintForm.hoursAtService}
                            onChange={e => setMaintForm(p => ({ ...p, hoursAtService: e.target.value }))}
                            className={inpSm} placeholder={fmt(selected.hoursCounter || 0)}/>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 mb-1 block">Prochaine date</label>
                          <input type="date" value={maintForm.nextDate}
                            onChange={e => setMaintForm(p => ({ ...p, nextDate: e.target.value }))}
                            className={inpSm}/>
                        </div>
                      </div>
                      <button onClick={submitMaintenance} disabled={addingMaint || !maintForm.date}
                        className="w-full py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                        {addingMaint ? <Loader2 size={11} className="animate-spin"/> : <Plus size={11}/>}
                        Enregistrer l'entretien
                      </button>
                    </div>

                    {/* Historique */}
                    {!selected.maintenanceHistory?.length ? (
                      <div className="text-center py-6 text-slate-400">
                        <Wrench size={22} className="mx-auto mb-2 opacity-30"/>
                        <p className="text-xs">Aucun entretien enregistré</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Historique ({selected.maintenanceHistory.length})</p>
                        {selected.maintenanceHistory.map(m => {
                          const mt = MAINT_TYPE[m.type] || MAINT_TYPE.other
                          return (
                            <div key={m._id} className="bg-slate-50 dark:bg-navy-800 rounded-xl p-3 border border-slate-200 dark:border-navy-600 group relative">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{fmtD(m.date)}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${mt.cls}`}>{mt.label}</span>
                                  </div>
                                  {m.description && <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">{m.description}</p>}
                                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                                    {m.cost > 0 && <span className="font-semibold text-slate-600 dark:text-slate-300">{fmt(m.cost)} MAD</span>}
                                    {m.technician && <span>{m.technician}</span>}
                                    {m.hoursAtService > 0 && <span className="flex items-center gap-0.5"><Clock size={8}/>{fmt(m.hoursAtService)} h</span>}
                                  </div>
                                  {m.nextDate && (
                                    <p className="text-[10px] text-blue-500 mt-1 flex items-center gap-1">
                                      <CalendarDays size={9}/> Prochain : {fmtD(m.nextDate)}
                                    </p>
                                  )}
                                </div>
                                <button onClick={() => deleteMaintenance(m._id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all shrink-0">
                                  <Trash2 size={12}/>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── PHOTOS ─── */}
                {panelTab === 'photos' && (
                  <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
                    {/* Zone upload */}
                    <div
                      onDragOver={e => { e.preventDefault(); setDragPhoto(true) }}
                      onDragLeave={() => setDragPhoto(false)}
                      onDrop={e => { e.preventDefault(); setDragPhoto(false); handlePhotoUpload(e.dataTransfer.files[0]) }}
                      onClick={() => !uploadingPhoto && photoRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        dragPhoto ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/10'
                                  : 'border-slate-200 dark:border-navy-600 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-navy-800/40'
                      }`}
                    >
                      <input type="file" ref={photoRef} accept="image/*" className="hidden"
                        onChange={e => { if (e.target.files[0]) handlePhotoUpload(e.target.files[0]); e.target.value = '' }}/>
                      {uploadingPhoto ? (
                        <div className="flex items-center justify-center gap-2 py-1">
                          <Loader2 size={14} className="animate-spin text-blue-500"/>
                          <span className="text-xs text-blue-500 font-semibold">Upload…</span>
                        </div>
                      ) : (
                        <>
                          <UploadCloud size={18} className={`mx-auto mb-1 ${dragPhoto ? 'text-blue-500' : 'text-slate-300 dark:text-navy-600'}`}/>
                          <p className="text-xs text-slate-500">Glisser ou <span className="text-blue-500 font-medium">parcourir</span></p>
                          <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP · max 8MB</p>
                        </>
                      )}
                    </div>

                    {/* Galerie */}
                    {!selected.photos?.length ? (
                      <div className="text-center py-6 text-slate-400">
                        <Image size={22} className="mx-auto mb-2 opacity-30"/>
                        <p className="text-xs">Aucune photo</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {selected.photos.map((url, idx) => (
                          <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video bg-slate-100 dark:bg-navy-800 cursor-pointer border border-slate-200 dark:border-navy-700"
                            onClick={() => setLightbox(url)}>
                            <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                              <div className="p-1.5 bg-white/90 rounded-lg"><ExternalLink size={11}/></div>
                              <button onClick={e => { e.stopPropagation(); removePhoto(idx) }} className="p-1.5 bg-red-500 rounded-lg text-white"><X size={11}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal création / édition ── */}
      <Modal open={modal} onClose={closeModal} title={editing ? 'Modifier l\'équipement' : 'Nouvel équipement'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Image upload */}
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
                <img src={imagePreview} alt="Aperçu" className="w-full h-40 object-cover"/>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button type="button" onClick={() => imageRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 rounded-lg text-xs font-semibold text-slate-700">
                    <UploadCloud size={12}/> Changer
                  </button>
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview('') }}
                    className="p-1.5 bg-red-500 rounded-lg text-white"><X size={12}/>
                  </button>
                </div>
                {imageFile && <div className="absolute bottom-2 left-2 text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-semibold">Nouveau fichier</div>}
              </div>
            ) : (
              <div onClick={() => imageRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-navy-600 rounded-xl p-5 text-center cursor-pointer hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-navy-800/40 transition-all">
                <UploadCloud size={22} className="mx-auto mb-1.5 text-slate-300 dark:text-navy-600"/>
                <p className="text-sm text-slate-500">Glisser ou <span className="text-blue-500 font-medium">parcourir</span></p>
                <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WEBP · max 8 MB</p>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nom *"><input {...register('name', { required: true })} className={inp} placeholder="Pelleteuse CAT 320"/></Field>
            <Field label="Type">
              <select {...register('type')} className={inp}>
                <option value="">Sélectionner…</option>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Marque"><input {...register('brand')} className={inp} placeholder="Caterpillar"/></Field>
            <Field label="Modèle"><input {...register('model')} className={inp} placeholder="320D"/></Field>
            <Field label="Année"><input {...register('year', { valueAsNumber: true })} type="number" className={inp} placeholder="2020"/></Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="N° Série"><input {...register('serialNumber')} className={inp}/></Field>
            <Field label="Statut">
              <select {...register('status')} className={inp}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Localisation (chantier)"><input {...register('location')} className={inp} placeholder="Tour Horizon – Phase 2"/></Field>
            <Field label="Projet actuel">
              <select {...register('projectRef')} className={inp}>
                <option value="">— Aucun projet —</option>
                {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
              </select>
            </Field>
          </div>

          {/* Compteurs */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Compteur heures (h)">
              <input {...register('hoursCounter', { valueAsNumber: true })} type="number" className={inp} placeholder="0"/>
            </Field>
            <Field label="Compteur km">
              <input {...register('kmCounter', { valueAsNumber: true })} type="number" className={inp} placeholder="0"/>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Valeur d'achat (MAD)"><input {...register('purchasePrice', { valueAsNumber: true })} type="number" className={inp} placeholder="850 000"/></Field>
            <Field label="Location/jour (MAD)"><input {...register('rentalCostPerDay', { valueAsNumber: true })} type="number" className={inp} placeholder="2 500"/></Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Date d'achat"><input {...register('purchaseDate')} type="date" className={inp}/></Field>
            <Field label="Dernière maintenance"><input {...register('lastMaintenanceDate')} type="date" className={inp}/></Field>
            <Field label="Prochaine maintenance"><input {...register('nextMaintenanceDate')} type="date" className={inp}/></Field>
          </div>

          <Field label="Notes"><textarea {...register('notes')} rows={2} className={`${inp} resize-none`}/></Field>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800 disabled:opacity-50">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60 min-w-[130px] justify-center">
              {saving && <Loader2 size={14} className="animate-spin"/>}
              {uploadingImg ? 'Upload image…' : saving ? 'Sauvegarde…' : editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
