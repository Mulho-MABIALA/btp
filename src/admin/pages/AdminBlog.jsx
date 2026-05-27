import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2, Calendar, Clock } from 'lucide-react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { adminBlog } from '../adminApi'

const input = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>{children}</div>

const CATEGORIES = ['Innovation', 'Technologie', 'Rénovation', 'Sécurité', 'Finance', 'Architecture']

export default function AdminBlog() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminBlog.getAll(); setData(r.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd  = () => { setEditing(null); reset({}); setModal(true) }
  const openEdit = row => { setEditing(row); reset({ ...row, tags: row.tags?.join(', ') }); setModal(true) }
  const close    = () => { setModal(false); setEditing(null) }

  const onSubmit = async (v) => {
    setSaving(true)
    const payload = { ...v, tags: v.tags ? v.tags.split(',').map(t => t.trim()).filter(Boolean) : [] }
    try {
      if (editing) await adminBlog.update(editing._id, payload)
      else await adminBlog.create(payload)
      await load(); close()
    } finally { setSaving(false) }
  }

  const columns = [
    { key: 'image', label: '', render: v => v ? <img src={v} alt="" className="w-14 h-9 object-cover rounded-lg" /> : <div className="w-14 h-9 bg-slate-100 dark:bg-navy-700 rounded-lg" /> },
    { key: 'title', label: 'Titre' },
    { key: 'category', label: 'Catégorie', render: v => <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-full text-xs">{v}</span> },
    { key: 'author', label: 'Auteur' },
    { key: 'date', label: 'Date', render: v => <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={10}/>{v}</span> },
    { key: 'readTime', label: 'Lecture', render: v => <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={10}/>{v}</span> },
  ]

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Blog</h1>
        <p className="text-slate-500 text-sm mt-1">Gérez les articles publiés sur le site</p>
      </div>
      <DataTable title={`Articles (${data.length})`} columns={columns} data={data} loading={loading}
        onAdd={openAdd} onEdit={openEdit} onDelete={id => adminBlog.delete(id).then(load)} />

      <Modal open={modal} onClose={close} title={editing ? 'Modifier l\'article' : 'Nouvel article'} size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Titre *"><input {...register('title', { required: true })} className={input} /></Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Catégorie">
              <select {...register('category')} className={input}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Date"><input {...register('date')} className={input} placeholder="15 Mars 2024" /></Field>
            <Field label="Temps de lecture"><input {...register('readTime')} className={input} placeholder="5 min" /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Auteur"><input {...register('author')} className={input} placeholder="Sofia El Mansouri" /></Field>
            <Field label="Rôle auteur"><input {...register('authorRole')} className={input} placeholder="Directrice Architecte" /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Photo auteur (URL)"><input {...register('authorImage')} className={input} placeholder="https://..." /></Field>
            <Field label="Image article (URL)"><input {...register('image')} className={input} placeholder="https://..." /></Field>
          </div>
          <Field label="Extrait (résumé)"><textarea {...register('excerpt')} rows={2} className={`${input} resize-none`} /></Field>
          <Field label="Contenu complet (optionnel)"><textarea {...register('content')} rows={5} className={`${input} resize-none`} /></Field>
          <Field label="Tags (séparés par virgules)"><input {...register('tags')} className={input} placeholder="BIM, Numérique, Gestion" /></Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">Annuler</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}{editing ? 'Enregistrer' : 'Publier'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
