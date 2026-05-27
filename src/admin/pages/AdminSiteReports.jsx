import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import {
  Loader2, HardHat, Plus, Pencil, Trash2,
  Sun, Cloud, CloudRain, Wind, Zap,
  Camera, X, ImageIcon, Printer, Users, Package,
  ChevronLeft, ChevronRight, Search, Download
} from 'lucide-react'
import { adminSiteReports } from '../adminApi'
import Modal from '../components/Modal'

const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
  </div>
)

const WEATHER_ICON  = { Ensoleillé: Sun, Nuageux: Cloud, Pluvieux: CloudRain, Venteux: Wind, Orageux: Zap }
const WEATHER_COLOR = { Ensoleillé: 'text-amber-500', Nuageux: 'text-slate-400', Pluvieux: 'text-blue-500', Venteux: 'text-sky-500', Orageux: 'text-violet-500' }
const WEATHER_BG    = { Ensoleillé: 'from-amber-50 to-orange-50 dark:from-amber-500/5 dark:to-orange-500/5', Nuageux: 'from-slate-50 to-slate-100 dark:from-slate-500/5 dark:to-slate-500/10', Pluvieux: 'from-blue-50 to-sky-50 dark:from-blue-500/5 dark:to-sky-500/5', Venteux: 'from-sky-50 to-cyan-50 dark:from-sky-500/5 dark:to-cyan-500/5', Orageux: 'from-violet-50 to-purple-50 dark:from-violet-500/5 dark:to-purple-500/5' }

// ── Print helper ──────────────────────────────────────────────────────────────
function printReport(report) {
  const W = WEATHER_ICON[report.weather] || Sun
  const dateStr = new Date(report.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const win = window.open('', '_blank', 'width=800,height=900')
  win.document.write(`<!DOCTYPE html><html><head><title>Rapport – ${report.project}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:32px;color:#1e293b;max-width:720px;margin:0 auto}
    h1{font-size:22px;font-weight:900;margin:0 0 4px}
    .sub{font-size:13px;color:#64748b;margin-bottom:24px}
    .meta{display:flex;gap:24px;background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:24px;flex-wrap:wrap}
    .meta-item{font-size:12px;color:#64748b}.meta-item span{display:block;font-weight:700;color:#1e293b;font-size:14px}
    .progress-bar{background:#e2e8f0;border-radius:999px;height:10px;margin:8px 0 24px;overflow:hidden}
    .progress-fill{background:#3b82f6;height:100%;border-radius:999px}
    .section{margin-bottom:18px}
    .section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin-bottom:6px}
    .section-value{font-size:13px;line-height:1.6;white-space:pre-wrap}
    .photos{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
    .photos img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px}
    .footer{border-top:1px solid #e2e8f0;padding-top:16px;margin-top:32px;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between}
    @media print{body{padding:16px}.meta{break-inside:avoid}}
  </style></head><body>
  <h1>${report.project}</h1>
  <div class="sub">Rapport de chantier · ${dateStr}</div>
  <div class="meta">
    <div class="meta-item"><span>${report.weather || '—'} ${report.temperature ? `· ${report.temperature}°C` : ''}</span>Météo</div>
    ${report.workersCount ? `<div class="meta-item"><span>${report.workersCount}</span>Ouvriers présents</div>` : ''}
    <div class="meta-item"><span>${report.progress ?? 0}%</span>Avancement</div>
    ${report.author ? `<div class="meta-item"><span>${report.author}</span>Auteur</div>` : ''}
  </div>
  <div class="progress-bar"><div class="progress-fill" style="width:${report.progress ?? 0}%"></div></div>
  ${report.teamPresent ? `<div class="section"><div class="section-label">Équipe présente</div><div class="section-value">${report.teamPresent}</div></div>` : ''}
  ${report.worksDone   ? `<div class="section"><div class="section-label">Travaux effectués</div><div class="section-value">${report.worksDone}</div></div>` : ''}
  ${report.materials   ? `<div class="section"><div class="section-label">Matériaux</div><div class="section-value">${report.materials}</div></div>` : ''}
  ${report.issues      ? `<div class="section"><div class="section-label">Problèmes / Observations</div><div class="section-value">${report.issues}</div></div>` : ''}
  ${report.nextDayPlan ? `<div class="section"><div class="section-label">Plan du lendemain</div><div class="section-value">${report.nextDayPlan}</div></div>` : ''}
  ${report.photos?.length ? `<div class="section"><div class="section-label">Photos (${report.photos.length})</div><div class="photos">${report.photos.map(p => `<img src="${p}" />`).join('')}</div></div>` : ''}
  <div class="footer"><span>CONSTRUCTPRO – Rapport de chantier</span><span>Imprimé le ${new Date().toLocaleDateString('fr-FR')}</span></div>
  </body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 500)
}

// ── Photo lightbox ─────────────────────────────────────────────────────────────
function Lightbox({ photos, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx)
  const prev = () => setIdx(i => (i - 1 + photos.length) % photos.length)
  const next = () => setIdx(i => (i + 1) % photos.length)
  useEffect(() => {
    const onKey = e => { if (e.key === 'ArrowLeft') prev(); if (e.key === 'ArrowRight') next(); if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={e => { e.stopPropagation(); onClose() }} className="absolute top-4 right-4 text-white/70 hover:text-white"><X size={22}/></button>
      {photos.length > 1 && <>
        <button onClick={e => { e.stopPropagation(); prev() }} className="absolute left-4 text-white/70 hover:text-white p-2"><ChevronLeft size={28}/></button>
        <button onClick={e => { e.stopPropagation(); next() }} className="absolute right-16 text-white/70 hover:text-white p-2"><ChevronRight size={28}/></button>
      </>}
      <img src={photos[idx]} alt="" className="max-h-[85vh] max-w-[85vw] object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}/>
      <p className="absolute bottom-4 text-white/50 text-sm">{idx + 1} / {photos.length}</p>
    </div>
  )
}

export default function AdminSiteReports() {
  const [data, setData]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(false)
  const [editing, setEditing]         = useState(null)
  const [detail, setDetail]           = useState(null)
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState(null)
  const [deletingPhoto, setDeletingPhoto] = useState(null)
  const [search, setSearch]           = useState('')
  const [lightbox, setLightbox]       = useState(null)  // { photos, idx }
  const [pendingPhotos, setPendingPhotos] = useState([]) // [{ file, preview }]
  const photoInputRef = useRef(null)
  const { register, handleSubmit, reset } = useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminSiteReports.getAll(); setData(r.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setPendingPhotos([])
    reset({ weather: 'Ensoleillé', progress: 0, date: new Date().toISOString().split('T')[0] })
    setModal(true)
  }
  const openEdit = r => {
    setEditing(r)
    setPendingPhotos([])
    reset({ ...r, date: r.date?.split?.('T')[0] })
    setModal(true)
  }
  const close = () => {
    setModal(false); setEditing(null)
    pendingPhotos.forEach(p => URL.revokeObjectURL(p.preview))
    setPendingPhotos([])
  }

  const addPendingPhotos = files => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    setPendingPhotos(prev => [...prev, ...arr.map(f => ({ file: f, preview: URL.createObjectURL(f) }))])
  }

  const onSubmit = async (v) => {
    setSaving(true)
    try {
      let rep
      if (editing) {
        const r = await adminSiteReports.update(editing._id, v)
        rep = r.data
      } else {
        const r = await adminSiteReports.create(v)
        rep = r.data
      }
      // Upload pending photos
      for (const p of pendingPhotos) {
        const fd = new FormData()
        fd.append('photo', p.file)
        const r = await adminSiteReports.uploadPhoto(rep._id, fd)
        rep = r.data
      }
      pendingPhotos.forEach(p => URL.revokeObjectURL(p.preview))
      await load()
      // refresh detail if open
      if (detail?._id === rep._id) setDetail(rep)
      close()
    } finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!window.confirm('Supprimer ce rapport ?')) return
    setDeleting(id)
    try { await adminSiteReports.delete(id); setDetail(null); await load() } finally { setDeleting(null) }
  }

  const handleDeletePhoto = async (reportId, idx) => {
    setDeletingPhoto(idx)
    try {
      const r = await adminSiteReports.deletePhoto(reportId, idx)
      const updated = r.data
      setDetail(updated)
      setData(prev => prev.map(d => d._id === reportId ? updated : d))
    } finally { setDeletingPhoto(null) }
  }

  const filtered = data.filter(r => !search || [r.project, r.author, r.teamPresent].some(v => v?.toLowerCase().includes(search.toLowerCase())))

  return (
    <>
      {lightbox && <Lightbox photos={lightbox.photos} startIdx={lightbox.idx} onClose={() => setLightbox(null)}/>}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Rapports de chantier</h1>
            <p className="text-slate-500 text-sm mt-1">{data.length} rapport{data.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chantier, auteur…"
                className="pl-9 pr-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white w-48"/>
            </div>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors">
              <Plus size={15}/> Nouveau rapport
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* ── Liste ────────────────────────────────────────── */}
          <div className="lg:col-span-1 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-navy-700">
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">Historique</h2>
            </div>
            {loading ? <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-blue-500"/></div>
            : filtered.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <HardHat size={28} className="mx-auto mb-2 opacity-30"/>
                <p className="text-xs">{search ? 'Aucun résultat' : 'Aucun rapport'}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-navy-800 max-h-[640px] overflow-y-auto">
                {filtered.map(r => {
                  const WeatherIcon = WEATHER_ICON[r.weather] || Sun
                  return (
                    <button key={r._id} onClick={() => setDetail(r)}
                      className={`w-full flex items-start gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors text-left ${detail?._id === r._id ? 'bg-blue-50 dark:bg-blue-500/5 border-l-2 border-blue-500' : ''}`}>
                      <WeatherIcon size={18} className={`${WEATHER_COLOR[r.weather] || 'text-slate-400'} shrink-0 mt-0.5`}/>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{r.project}</p>
                        <p className="text-xs text-slate-500">{new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {r.author && <p className="text-xs text-slate-400">{r.author}</p>}
                          {r.photos?.length > 0 && <span className="text-[10px] flex items-center gap-0.5 text-slate-400"><ImageIcon size={9}/>{r.photos.length}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{r.progress}%</div>
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-navy-700 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${r.progress}%` }}/>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Détail ───────────────────────────────────────── */}
          <div className="lg:col-span-2">
            {!detail ? (
              <div className="h-64 flex items-center justify-center bg-white dark:bg-navy-900 rounded-2xl border border-dashed border-slate-200 dark:border-navy-700 text-slate-400">
                <div className="text-center">
                  <HardHat size={32} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-sm">Sélectionner un rapport pour le consulter</p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
                {/* Header */}
                <div className={`px-6 py-5 border-b border-slate-100 dark:border-navy-700 bg-gradient-to-br ${WEATHER_BG[detail.weather] || ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        {(() => { const W = WEATHER_ICON[detail.weather] || Sun; return <W size={16} className={WEATHER_COLOR[detail.weather]}/> })()}
                        <span className="text-xs text-slate-500">{detail.weather}{detail.temperature ? ` · ${detail.temperature}°C` : ''}</span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">{detail.project}</h3>
                      <p className="text-sm text-slate-500 capitalize">
                        {new Date(detail.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => printReport(detail)} title="Imprimer / PDF"
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-navy-800/80 border border-slate-200 dark:border-navy-600 rounded-xl hover:bg-white dark:hover:bg-navy-700 transition-colors">
                        <Printer size={13}/> PDF
                      </button>
                      <button onClick={() => openEdit(detail)} className="p-2 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Pencil size={14}/></button>
                      <button onClick={() => handleDelete(detail._id)} disabled={deleting === detail._id}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        {deleting === detail._id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-3 border-b border-slate-100 dark:border-navy-700">
                  <div className="px-6 py-4 text-center border-r border-slate-100 dark:border-navy-700">
                    <p className="text-2xl font-black text-blue-500">{detail.progress}%</p>
                    <p className="text-xs text-slate-400 mt-0.5">Avancement</p>
                    <div className="mt-2 h-2 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{ width: `${detail.progress}%` }}/>
                    </div>
                  </div>
                  <div className="px-6 py-4 text-center border-r border-slate-100 dark:border-navy-700">
                    <p className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                      <Users size={18} className="text-slate-400"/>
                      {detail.workersCount ?? '—'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Ouvriers présents</p>
                  </div>
                  <div className="px-6 py-4 text-center">
                    <p className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                      <ImageIcon size={18} className="text-slate-400"/>
                      {detail.photos?.length ?? 0}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Photos</p>
                  </div>
                </div>

                {/* Sections */}
                <div className="divide-y divide-slate-50 dark:divide-navy-800">
                  {[
                    { label: 'Équipe présente',       value: detail.teamPresent },
                    { label: 'Travaux effectués',      value: detail.worksDone },
                    { label: 'Matériaux utilisés',     value: detail.materials },
                    { label: 'Problèmes / Observations', value: detail.issues },
                    { label: 'Plan du lendemain',      value: detail.nextDayPlan },
                  ].filter(s => s.value).map(({ label, value }) => (
                    <div key={label} className="px-6 py-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{value}</p>
                    </div>
                  ))}

                  {/* Photo gallery */}
                  {detail.photos?.length > 0 && (
                    <div className="px-6 py-5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">Photos de chantier ({detail.photos.length})</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {detail.photos.map((url, idx) => (
                          <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-navy-800 cursor-pointer"
                            onClick={() => setLightbox({ photos: detail.photos, idx })}>
                            <img src={url} alt="" className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"/>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <button
                                onClick={e => { e.stopPropagation(); handleDeletePhoto(detail._id, idx) }}
                                disabled={deletingPhoto === idx}
                                className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 transition-opacity">
                                {deletingPhoto === idx ? <Loader2 size={12} className="animate-spin"/> : <X size={12}/>}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {detail.author && (
                  <div className="px-6 py-3 border-t border-slate-100 dark:border-navy-700 text-xs text-slate-400">
                    Rapport établi par <span className="font-semibold text-slate-600 dark:text-slate-300">{detail.author}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      <Modal open={modal} onClose={close} title={editing ? 'Modifier le rapport' : 'Nouveau rapport de chantier'} size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Row 1 */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Projet *"><input {...register('project', { required: true })} className={inp} placeholder="Tour Horizon – Phase 2"/></Field>
            <Field label="Date *"><input {...register('date', { required: true })} type="date" className={inp}/></Field>
          </div>

          {/* Row 2 */}
          <div className="grid sm:grid-cols-4 gap-4">
            <Field label="Météo">
              <select {...register('weather')} className={inp}>
                {['Ensoleillé','Nuageux','Pluvieux','Venteux','Orageux'].map(w => <option key={w}>{w}</option>)}
              </select>
            </Field>
            <Field label="Temp. (°C)"><input {...register('temperature', { valueAsNumber: true })} type="number" className={inp} placeholder="28"/></Field>
            <Field label="Ouvriers"><input {...register('workersCount', { valueAsNumber: true })} type="number" className={inp} placeholder="12"/></Field>
            <Field label="Avancement (%)"><input {...register('progress', { valueAsNumber: true })} type="number" min="0" max="100" className={inp} placeholder="65"/></Field>
          </div>

          {/* Row 3 */}
          <Field label="Équipe présente"><input {...register('teamPresent')} className={inp} placeholder="M. Alami, M. Rachid, équipe ferraillage…"/></Field>
          <Field label="Travaux effectués"><textarea {...register('worksDone')} rows={3} className={`${inp} resize-none`} placeholder="Coulage des fondations, ferraillage du plancher…"/></Field>
          <Field label="Matériaux utilisés / livrés"><textarea {...register('materials')} rows={2} className={`${inp} resize-none`} placeholder="15 m³ béton B25, 3 T armatures HA…"/></Field>
          <Field label="Problèmes / Observations"><textarea {...register('issues')} rows={2} className={`${inp} resize-none`} placeholder="Retard livraison béton, météo défavorable…"/></Field>
          <Field label="Plan du lendemain"><textarea {...register('nextDayPlan')} rows={2} className={`${inp} resize-none`} placeholder="Décoffrage, début maçonnerie RDC…"/></Field>
          <Field label="Auteur du rapport"><input {...register('author')} className={inp} placeholder="Youssef Mansouri — Chef de chantier"/></Field>

          {/* Photo upload */}
          <Field label={`Photos ${pendingPhotos.length > 0 ? `(${pendingPhotos.length} à ajouter)` : ''}`}>
            <div
              className="border-2 border-dashed border-slate-200 dark:border-navy-600 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-500/5 transition-colors"
              onClick={() => photoInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400') }}
              onDragLeave={e => e.currentTarget.classList.remove('border-blue-400')}
              onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400'); addPendingPhotos(e.dataTransfer.files) }}
            >
              <Camera size={20} className="mx-auto mb-1.5 text-slate-400"/>
              <p className="text-xs text-slate-500">Glisser-déposer ou <span className="text-blue-500 font-semibold">parcourir</span></p>
              <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG — max 15 Mo / photo</p>
              <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addPendingPhotos(e.target.files)}/>
            </div>
            {pendingPhotos.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3">
                {pendingPhotos.map((p, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-navy-800">
                    <img src={p.preview} alt="" className="w-full h-full object-cover"/>
                    <button type="button" onClick={() => setPendingPhotos(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, j) => j !== i) })}
                      className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors opacity-0 group-hover:opacity-100 text-white">
                      <X size={14}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">Annuler</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin"/>}
              {editing ? 'Enregistrer' : `Créer${pendingPhotos.length > 0 ? ` + ${pendingPhotos.length} photo${pendingPhotos.length > 1 ? 's' : ''}` : ''}`}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
