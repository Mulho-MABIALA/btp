import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2, ShieldAlert, Plus, Pencil, Trash2, CheckCircle, Download, Upload, X, Camera, TrendingDown } from 'lucide-react'
import { adminHSE } from '../adminApi'
import Modal from '../components/Modal'
import { exportCsv } from '../utils/exportCsv'
import { generateHSEReportPDF } from '../utils/generateHSEReportPDF'

const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>{children}</div>

const SEVERITY = {
  minor:    { label: 'Mineur',   cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',    dot: 'bg-green-500' },
  moderate: { label: 'Modéré',  cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400', dot: 'bg-yellow-400' },
  major:    { label: 'Majeur',   cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400', dot: 'bg-orange-500' },
  critical: { label: 'Critique', cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',            dot: 'bg-red-600' },
}

const INC_STATUS = {
  open:        { label: 'Ouvert',        cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
  in_progress: { label: 'En traitement', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  closed:      { label: 'Clôturé',       cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' },
}

const TYPES = ["Accident", "Incident", "Presqu'accident", 'Observation', 'Non-conformité']

// Moroccan BTP workforce (used for TF/TG calculation — ~200 workers, 25 days/month, 8h/day)
const HEURES_TRAVAIL = 200 * 25 * 8 * 12 // annual hours worked (estimated)

export default function AdminHSE() {
  const [data, setData]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(false)
  const [editing, setEditing]         = useState(null)
  const [detail, setDetail]           = useState(null)
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState(null)
  const [severityFilter, setSeverityFilter] = useState('all')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [deletingPhoto, setDeletingPhoto]   = useState(null)
  const photoRef = useRef()
  const { register, handleSubmit, reset } = useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminHSE.getAll(); setData(r.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd  = () => { setEditing(null); reset({ severity: 'minor', type: 'Incident', status: 'open', date: new Date().toISOString().split('T')[0] }); setModal(true) }
  const openEdit = h  => { setEditing(h); reset({ ...h, date: h.date?.split?.('T')[0] }); setModal(true) }
  const close    = () => { setModal(false); setEditing(null) }

  const onSubmit = async (v) => {
    setSaving(true)
    try {
      if (editing) await adminHSE.update(editing._id, v)
      else         await adminHSE.create(v)
      await load(); close()
    } finally { setSaving(false) }
  }

  const closeIncident = async (id) => {
    await adminHSE.close(id)
    await load()
    if (detail?._id === id) setDetail(d => ({ ...d, status: 'closed', closedDate: new Date().toISOString() }))
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet incident ?')) return
    setDeleting(id)
    try { await adminHSE.delete(id); if (detail?._id === id) setDetail(null); await load() } finally { setDeleting(null) }
  }

  const uploadPhoto = async () => {
    if (!photoRef.current?.files?.[0] || !detail) return
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('photo', photoRef.current.files[0])
      const r = await adminHSE.uploadPhoto(detail._id, fd)
      setDetail(r.data)
      // update in list too
      setData(prev => prev.map(h => h._id === detail._id ? r.data : h))
      photoRef.current.value = ''
    } catch(e) { alert(e.response?.data?.error || 'Erreur upload') }
    finally { setUploadingPhoto(false) }
  }

  const deletePhoto = async (idx) => {
    if (!window.confirm('Supprimer cette photo ?')) return
    setDeletingPhoto(idx)
    try {
      const r = await adminHSE.deletePhoto(detail._id, idx)
      setDetail(r.data)
      setData(prev => prev.map(h => h._id === detail._id ? r.data : h))
    } catch(e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setDeletingPhoto(null) }
  }

  // Stats
  const filtered = severityFilter === 'all' ? data : data.filter(h => h.severity === severityFilter)
  const openCount      = data.filter(h => h.status === 'open').length
  const accidentCount  = data.filter(h => h.type === 'Accident').length
  const closedDates    = data.filter(h => h.status === 'closed' && h.closedDate).map(h => new Date(h.closedDate))
  const lastClosed     = closedDates.length > 0 ? Math.max(...closedDates) : null
  const lastIncident   = data.filter(h => h.type === 'Accident').map(h => new Date(h.date))
  const lastAccDate    = lastIncident.length > 0 ? Math.max(...lastIncident) : null
  const joursSansAcc   = lastAccDate ? Math.floor((Date.now() - lastAccDate) / 86400000) : null

  // TF = (nb accidents × 10^6) / heures travaillées
  const TF = accidentCount > 0 ? Math.round(accidentCount * 1_000_000 / HEURES_TRAVAIL) : 0
  // TG = (nb jours perdus × 10^3) / heures travaillées — simplified as severity
  const joursPertes = data.filter(h => h.type === 'Accident').reduce((s, h) => {
    const map = { minor: 1, moderate: 5, major: 30, critical: 90 }
    return s + (map[h.severity] || 0)
  }, 0)
  const TG = joursPertes > 0 ? Math.round(joursPertes * 1_000 / HEURES_TRAVAIL) : 0

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">HSE — Sécurité & Incidents</h1>
            <p className="text-slate-500 text-sm mt-1">{data.length} incident{data.length > 1 ? 's' : ''} · {openCount} ouvert{openCount > 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => exportCsv('hse-incidents.csv', data.map(h => ({ Titre: h.title, Type: h.type, Sévérité: SEVERITY[h.severity]?.label, Site: h.site, Date: h.date, Statut: INC_STATUS[h.status]?.label, Signalé_par: h.reportedBy })))}
              className="px-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">↓ CSV</button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-colors">
              <Plus size={15}/> Déclarer un incident
            </button>
          </div>
        </div>

        {/* HSE Dashboard stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className={`rounded-2xl border p-4 ${joursSansAcc === null ? 'bg-green-50 dark:bg-green-500/5 border-green-200 dark:border-green-500/20' : joursSansAcc >= 30 ? 'bg-green-50 dark:bg-green-500/5 border-green-200 dark:border-green-500/20' : 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20'}`}>
            <div className="flex items-center gap-2 mb-1"><TrendingDown size={15} className={joursSansAcc === null || joursSansAcc >= 30 ? 'text-green-500' : 'text-red-500'}/><span className="text-xs text-slate-500">Jours sans accident</span></div>
            <div className={`text-2xl font-black ${joursSansAcc === null || joursSansAcc >= 30 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{joursSansAcc === null ? '∞' : joursSansAcc}</div>
          </div>
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-2 mb-1"><ShieldAlert size={15} className="text-orange-500"/><span className="text-xs text-slate-500">Accidents</span></div>
            <div className="text-2xl font-black text-orange-500">{accidentCount}</div>
          </div>
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold text-blue-500">TF</span><span className="text-xs text-slate-500">Taux fréquence</span></div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{TF}</div>
            <div className="text-[10px] text-slate-400">× 10⁶ h</div>
          </div>
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
            <div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold text-purple-500">TG</span><span className="text-xs text-slate-500">Taux gravité</span></div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{TG}</div>
            <div className="text-[10px] text-slate-400">× 10³ h</div>
          </div>
        </div>

        {/* Severity breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(SEVERITY).map(([k, v]) => (
            <div key={k} className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
              <div className="flex items-center gap-2 mb-1"><div className={`w-2.5 h-2.5 rounded-full ${v.dot}`}/><span className="text-xs text-slate-500">{v.label}</span></div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{data.filter(h => h.severity === k).length}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {[['all', 'Tous'], ...Object.entries(SEVERITY).map(([k, v]) => [k, v.label])].map(([k, l]) => (
            <button key={k} onClick={() => setSeverityFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${severityFilter === k ? 'bg-red-500 text-white' : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Split layout */}
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-navy-700">
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">Liste des incidents</h2>
            </div>
            {loading ? <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-blue-500"/></div>
            : filtered.length === 0 ? <div className="text-center py-10 text-slate-400"><ShieldAlert size={28} className="mx-auto mb-2 opacity-30"/><p className="text-xs">Aucun incident</p></div>
            : (
              <div className="divide-y divide-slate-50 dark:divide-navy-800 max-h-[600px] overflow-y-auto">
                {filtered.map(h => {
                  const sv = SEVERITY[h.severity] || SEVERITY.minor
                  const st = INC_STATUS[h.status] || INC_STATUS.open
                  return (
                    <button key={h._id} onClick={() => setDetail(h)}
                      className={`w-full flex items-start gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors text-left ${detail?._id === h._id ? 'bg-red-50 dark:bg-red-500/5' : ''}`}>
                      <div className={`w-2 h-2 rounded-full ${sv.dot} mt-1.5 shrink-0`}/>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{h.title}</p>
                        <p className="text-xs text-slate-500">{h.type} · {h.site || 'Site non précisé'}</p>
                        <p className="text-xs text-slate-400">{new Date(h.date).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${st.cls}`}>{st.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {!detail ? (
              <div className="h-64 flex items-center justify-center bg-white dark:bg-navy-900 rounded-2xl border border-dashed border-slate-200 dark:border-navy-700 text-slate-400">
                <div className="text-center"><ShieldAlert size={32} className="mx-auto mb-3 opacity-30"/><p className="text-sm">Sélectionner un incident</p></div>
              </div>
            ) : (
              <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-navy-700 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(SEVERITY[detail.severity] || SEVERITY.minor).cls}`}>{(SEVERITY[detail.severity] || SEVERITY.minor).label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(INC_STATUS[detail.status] || INC_STATUS.open).cls}`}>{(INC_STATUS[detail.status] || INC_STATUS.open).label}</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{detail.title}</h3>
                    <p className="text-sm text-slate-500">{detail.type}{detail.site ? ` · ${detail.site}` : ''} · {new Date(detail.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => generateHSEReportPDF(detail)} title="Rapport PDF" className="p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"><Download size={15}/></button>
                    {detail.status !== 'closed' && (
                      <button onClick={() => closeIncident(detail._id)} title="Clôturer" className="p-2 rounded-lg text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"><CheckCircle size={15}/></button>
                    )}
                    <button onClick={() => openEdit(detail)} className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Pencil size={15}/></button>
                    <button onClick={() => handleDelete(detail._id)} disabled={deleting === detail._id} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      {deleting === detail._id ? <Loader2 size={15} className="animate-spin"/> : <Trash2 size={15}/>}
                    </button>
                  </div>
                </div>

                {/* Text details */}
                <div className="divide-y divide-slate-50 dark:divide-navy-800">
                  {[
                    { label: 'Description', value: detail.description },
                    { label: 'Personne blessée / concernée', value: detail.injuredPerson },
                    { label: 'Témoins', value: detail.witnesses },
                    { label: 'Cause identifiée', value: detail.cause },
                    { label: 'Action corrective', value: detail.correctiveAction },
                  ].filter(s => s.value).map(({ label, value }) => (
                    <div key={label} className="px-6 py-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Photos section */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-navy-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Camera size={11}/>Photos ({detail.photos?.length || 0})</p>
                  {detail.photos?.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {detail.photos.map((ph, i) => (
                        <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-navy-800">
                          <img src={`http://localhost:5000${ph.url}`} alt={ph.caption || ''} className="w-full h-full object-cover"/>
                          {ph.caption && <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-2 py-1 truncate">{ph.caption}</div>}
                          <button onClick={() => deletePhoto(i)} disabled={deletingPhoto === i}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40">
                            {deletingPhoto === i ? <Loader2 size={10} className="animate-spin"/> : <X size={10}/>}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input ref={photoRef} type="file" accept="image/*" className="flex-1 text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-navy-700 file:text-slate-600 dark:file:text-slate-300"/>
                    <button onClick={uploadPhoto} disabled={uploadingPhoto} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-navy-700 hover:bg-slate-200 dark:hover:bg-navy-600 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors disabled:opacity-60">
                      {uploadingPhoto ? <Loader2 size={12} className="animate-spin"/> : <Upload size={12}/>}Ajouter
                    </button>
                  </div>
                </div>

                {detail.reportedBy && <div className="px-6 py-3 border-t border-slate-100 dark:border-navy-700 text-xs text-slate-400">Signalé par <span className="font-semibold">{detail.reportedBy}</span></div>}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={modal} onClose={close} title={editing ? 'Modifier l\'incident' : 'Déclarer un incident HSE'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Titre *"><input {...register('title', { required: true })} className={inp} placeholder="Chute de matériau en hauteur"/></Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Type">
              <select {...register('type')} className={inp}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
            </Field>
            <Field label="Sévérité">
              <select {...register('severity')} className={inp}>{Object.entries(SEVERITY).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select>
            </Field>
            <Field label="Statut">
              <select {...register('status')} className={inp}>{Object.entries(INC_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Site / Chantier"><input {...register('site')} className={inp} placeholder="Tour Horizon – Zone B"/></Field>
            <Field label="Date"><input {...register('date')} type="date" className={inp}/></Field>
          </div>
          <Field label="Description"><textarea {...register('description')} rows={3} className={`${inp} resize-none`} placeholder="Description détaillée de l'incident…"/></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Personne concernée / blessée"><input {...register('injuredPerson')} className={inp} placeholder="M. Ahmed Alami"/></Field>
            <Field label="Témoins"><input {...register('witnesses')} className={inp} placeholder="M. Rachid, M. Karim"/></Field>
          </div>
          <Field label="Cause identifiée"><textarea {...register('cause')} rows={2} className={`${inp} resize-none`}/></Field>
          <Field label="Action corrective"><textarea {...register('correctiveAction')} rows={2} className={`${inp} resize-none`} placeholder="Mesures prises pour éviter la récurrence…"/></Field>
          <Field label="Signalé par"><input {...register('reportedBy')} className={inp} placeholder="Chef de chantier"/></Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">Annuler</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin"/>}{editing ? 'Enregistrer' : 'Déclarer'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
