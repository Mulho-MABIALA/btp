import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2, FolderOpen, Plus, Trash2, ExternalLink, Upload, FileText, FileImage, File, Search, AlertTriangle, Clock, CheckCircle2, Pencil } from 'lucide-react'
import { adminDocuments } from '../adminApi'
import Modal from '../components/Modal'

const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>{children}</div>

const DOC_TYPES = [
  'Contrat', 'Plan', 'Permis', 'PV réception', 'Facture fournisseur', 'Photo',
  'Contrat de travail', 'CIN / Passeport', 'Diplôme / Formation',
  'Attestation CNSS', 'Attestation de travail', 'Certificat médical',
  'Attestation', 'Autre',
]

const TYPE_ICONS  = { 'Plan': FileImage, 'Photo': FileImage }
const TYPE_COLORS = {
  'Contrat':             'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  'Plan':                'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  'Permis':              'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  'PV réception':        'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  'Facture fournisseur': 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  'Attestation':         'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  'Attestation CNSS':    'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  'Attestation de travail': 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
  'Contrat de travail':  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
  'CIN / Passeport':     'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  'Diplôme / Formation': 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  'Certificat médical':  'bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400',
  'Photo':               'bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400',
  'Autre':               'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
}

const fmtSize = b => b >= 1048576 ? `${(b/1048576).toFixed(1)} Mo` : b >= 1024 ? `${(b/1024).toFixed(0)} Ko` : `${b} o`

function getExpiryStatus(expiryDate) {
  if (!expiryDate) return null
  const now  = new Date(); now.setHours(0,0,0,0)
  const exp  = new Date(expiryDate); exp.setHours(0,0,0,0)
  const diff = Math.ceil((exp - now) / 86400000)
  if (diff < 0)   return { label: 'Expiré',       cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',     icon: AlertTriangle, days: diff }
  if (diff <= 30) return { label: `Expire dans ${diff}j`, cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400', icon: Clock, days: diff }
  return { label: `Valide (${new Date(expiryDate).toLocaleDateString('fr-FR')})`, cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400', icon: CheckCircle2, days: diff }
}

export default function AdminDocuments() {
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [search, setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [uploadMode, setUploadMode] = useState('url')
  const fileRef = useRef()
  const { register, handleSubmit, reset } = useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminDocuments.getAll(); setData(r.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd  = () => { setEditing(null); reset({ type: 'Autre' }); setUploadMode('url'); setModal(true) }
  const openEdit = d  => {
    setEditing(d)
    reset({
      ...d,
      tags: d.tags?.join(', '),
      expiryDate: d.expiryDate ? d.expiryDate.split('T')[0] : '',
    })
    setUploadMode('url')
    setModal(true)
  }
  const close = () => { setModal(false); setEditing(null) }

  const onSubmit = async (v) => {
    setSaving(true)
    try {
      if (editing) {
        // For edit, just update the fields without file re-upload
        const payload = { ...v }
        if (payload.tags && typeof payload.tags === 'string')
          payload.tags = payload.tags.split(',').map(t => t.trim()).filter(Boolean)
        await adminDocuments.update(editing._id, payload)
      } else {
        const fd = new FormData()
        fd.append('title', v.title)
        fd.append('type', v.type)
        if (v.project)    fd.append('project', v.project)
        if (v.notes)      fd.append('notes', v.notes)
        if (v.tags)       fd.append('tags', v.tags)
        if (v.uploadedBy) fd.append('uploadedBy', v.uploadedBy)
        if (v.expiryDate) fd.append('expiryDate', v.expiryDate)
        if (uploadMode === 'url') {
          fd.append('url', v.url || '')
        } else if (fileRef.current?.files?.[0]) {
          fd.append('file', fileRef.current.files[0])
        }
        await adminDocuments.create(fd)
      }
      await load(); close()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce document ?')) return
    setDeleting(id)
    try { await adminDocuments.delete(id); await load() } finally { setDeleting(null) }
  }

  // Expiry computed
  const today = new Date(); today.setHours(0,0,0,0)
  const expiredDocs  = data.filter(d => d.expiryDate && new Date(d.expiryDate) < today)
  const expiringSoon = data.filter(d => {
    if (!d.expiryDate) return false
    const exp = new Date(d.expiryDate)
    const diff = Math.ceil((exp - today) / 86400000)
    return diff >= 0 && diff <= 30
  })

  const filtered = data
    .filter(d => {
      if (typeFilter === 'expired') return d.expiryDate && new Date(d.expiryDate) < today
      return typeFilter === 'all' || d.type === typeFilter
    })
    .filter(d => !search || [d.title, d.project, d.type, d.tags?.join(' ')].some(v => v?.toLowerCase().includes(search.toLowerCase())))

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Gestion des documents</h1>
            <p className="text-slate-500 text-sm mt-1">{data.length} document{data.length > 1 ? 's' : ''}</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors">
            <Plus size={15}/> Ajouter
          </button>
        </div>

        {/* Expiry alerts */}
        {(expiredDocs.length > 0 || expiringSoon.length > 0) && (
          <div className="space-y-2">
            {expiredDocs.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-2xl">
                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5"/>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-red-800 dark:text-red-300 text-sm">{expiredDocs.length} document{expiredDocs.length > 1 ? 's' : ''} expiré{expiredDocs.length > 1 ? 's' : ''}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 truncate">{expiredDocs.map(d => d.title).join(', ')}</p>
                </div>
              </div>
            )}
            {expiringSoon.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/20 rounded-2xl">
                <Clock size={18} className="text-orange-500 shrink-0 mt-0.5"/>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-orange-800 dark:text-orange-300 text-sm">{expiringSoon.length} document{expiringSoon.length > 1 ? 's' : ''} expirant dans moins de 30 jours</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 truncate">{expiringSoon.map(d => d.title).join(', ')}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
              className="pl-9 pr-4 py-2 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white w-48"/>
          </div>
          <div className="flex gap-1 flex-wrap">
            {[['all', 'Tous'], ['expired', `⚠ Expirés (${expiredDocs.length})`], ...DOC_TYPES.map(t => [t, t])].map(([k, l]) => (
              <button key={k} onClick={() => setTypeFilter(k)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${typeFilter === k ? (k === 'expired' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white') : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
        : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 text-slate-400">
            <FolderOpen size={32} className="mx-auto mb-3 opacity-30"/>
            <p className="text-sm">Aucun document</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(doc => {
              const Icon    = TYPE_ICONS[doc.type] || FileText
              const color   = TYPE_COLORS[doc.type] || TYPE_COLORS['Autre']
              const isImage = doc.mimetype?.startsWith('image/') || doc.type === 'Photo'
              const expiry  = getExpiryStatus(doc.expiryDate)
              return (
                <div key={doc._id} className={`bg-white dark:bg-navy-900 rounded-2xl border overflow-hidden group transition-all ${expiry?.days < 0 ? 'border-red-300 dark:border-red-500/40' : expiry?.days <= 30 ? 'border-orange-300 dark:border-orange-500/40' : 'border-slate-200 dark:border-navy-700 hover:border-blue-300 dark:hover:border-blue-500/50'}`}>
                  {isImage && doc.url ? (
                    <div className="h-32 overflow-hidden"><img src={doc.url.startsWith('/') ? `http://localhost:5000${doc.url}` : doc.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform"/></div>
                  ) : (
                    <div className="h-24 flex items-center justify-center bg-slate-50 dark:bg-navy-800">
                      <Icon size={36} className="text-slate-300 dark:text-navy-600"/>
                    </div>
                  )}
                  <div className="p-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>{doc.type}</span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-2 truncate" title={doc.title}>{doc.title}</h3>
                    {doc.project && <p className="text-xs text-slate-500 truncate">{doc.project}</p>}
                    {doc.size && <p className="text-[10px] text-slate-400 mt-1">{fmtSize(doc.size)}</p>}

                    {/* Expiry badge */}
                    {expiry && (
                      <div className={`flex items-center gap-1 mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit ${expiry.cls}`}>
                        <expiry.icon size={9}/>{expiry.label}
                      </div>
                    )}

                    {doc.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {doc.tags.slice(0, 3).map(t => <span key={t} className="text-[9px] bg-slate-100 dark:bg-navy-700 text-slate-500 px-1.5 py-0.5 rounded">{t}</span>)}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 mt-2">{new Date(doc.createdAt).toLocaleDateString('fr-FR')}</p>
                    <div className="flex gap-1 mt-3 border-t border-slate-100 dark:border-navy-700 pt-3">
                      {doc.url && (
                        <a href={doc.url.startsWith('/') ? `http://localhost:5000${doc.url}` : doc.url} target="_blank" rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                          <ExternalLink size={12}/> Ouvrir
                        </a>
                      )}
                      <button onClick={() => openEdit(doc)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Pencil size={14}/></button>
                      <button onClick={() => handleDelete(doc._id)} disabled={deleting === doc._id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                        {deleting === doc._id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={close} title={editing ? 'Modifier le document' : 'Ajouter un document'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Titre *"><input {...register('title', { required: true })} className={inp} placeholder="Contrat de construction Tour Horizon"/></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select {...register('type')} className={inp}>
                {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Projet"><input {...register('project')} className={inp} placeholder="Tour Horizon"/></Field>
          </div>

          <Field label="Date d'expiration">
            <input {...register('expiryDate')} type="date" className={inp}/>
            <p className="text-xs text-slate-400 mt-1">Obligatoire pour habilitations, CNSS, RC, attestations…</p>
          </Field>

          {/* Upload mode toggle — only for new documents */}
          {!editing && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Source du fichier</label>
              <div className="flex gap-2 mb-3">
                {[['url', 'URL externe'], ['file', 'Upload fichier']].map(([m, l]) => (
                  <button key={m} type="button" onClick={() => setUploadMode(m)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${uploadMode === m ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-navy-700 text-slate-600 dark:text-slate-300'}`}>
                    {m === 'url' ? <ExternalLink size={12}/> : <Upload size={12}/>} {l}
                  </button>
                ))}
              </div>
              {uploadMode === 'url' ? (
                <input {...register('url')} className={inp} placeholder="https://drive.google.com/…"/>
              ) : (
                <input ref={fileRef} type="file" className={`${inp} file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600`}/>
              )}
            </div>
          )}

          <Field label="Tags (séparés par virgules)"><input {...register('tags')} className={inp} placeholder="chantier, 2024, phase-1"/></Field>
          <Field label="Ajouté par"><input {...register('uploadedBy')} className={inp} placeholder="M. Alami"/></Field>
          <Field label="Notes"><textarea {...register('notes')} rows={2} className={`${inp} resize-none`}/></Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">Annuler</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin"/>}{editing ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
