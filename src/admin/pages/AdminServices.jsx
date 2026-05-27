import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { adminServices } from '../adminApi'

const ICONS = ['Building2','Layers','Hammer','PenTool','Construction','Zap','Droplets','GitBranch','Home','ClipboardList']
const input = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>{children}</div>

export default function AdminServices() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminServices.getAll(); setData(r.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd  = () => { setEditing(null); reset({}); setModal(true) }
  const openEdit = row => { setEditing(row); reset({ ...row, features: row.features?.join('\n') }); setModal(true) }
  const close    = () => { setModal(false); setEditing(null) }

  const onSubmit = async (v) => {
    setSaving(true)
    const payload = { ...v, features: v.features ? v.features.split('\n').map(f => f.trim()).filter(Boolean) : [] }
    try {
      if (editing) await adminServices.update(editing._id, payload)
      else await adminServices.create(payload)
      await load(); close()
    } finally { setSaving(false) }
  }

  const columns = [
    { key: 'icon', label: 'Icône', render: v => <code className="text-xs bg-slate-100 dark:bg-navy-700 px-2 py-0.5 rounded">{v}</code> },
    { key: 'title', label: 'Titre' },
    { key: 'description', label: 'Description', render: v => <span className="line-clamp-1 text-slate-500">{v}</span> },
    { key: 'features', label: 'Prestations', render: v => <span className="text-xs text-slate-400">{v?.length ?? 0} items</span> },
  ]

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Services</h1>
        <p className="text-slate-500 text-sm mt-1">Gérez les services proposés sur le site</p>
      </div>
      <DataTable title={`Services (${data.length})`} columns={columns} data={data} loading={loading}
        onAdd={openAdd} onEdit={openEdit} onDelete={id => adminServices.delete(id).then(load)} />

      <Modal open={modal} onClose={close} title={editing ? 'Modifier le service' : 'Nouveau service'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Titre *"><input {...register('title', { required: true })} className={input} /></Field>
            <Field label="Icône">
              <select {...register('icon')} className={input}>
                {ICONS.map(i => <option key={i}>{i}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description"><textarea {...register('description')} rows={2} className={`${input} resize-none`} /></Field>
          <Field label="Couleur gradient (ex: from-blue-600 to-blue-700)"><input {...register('color')} className={input} /></Field>
          <Field label="Prestations (une par ligne)"><textarea {...register('features')} rows={4} className={`${input} resize-none`} placeholder="Maisons individuelles&#10;Immeubles résidentiels" /></Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}{editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
