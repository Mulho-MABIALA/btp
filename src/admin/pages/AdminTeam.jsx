import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { adminTeam } from '../adminApi'

const input = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>{children}</div>

export default function AdminTeam() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminTeam.getAll(); setData(r.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd  = () => { setEditing(null); reset({}); setModal(true) }
  const openEdit = row => { setEditing(row); reset(row); setModal(true) }
  const close    = () => { setModal(false); setEditing(null) }

  const onSubmit = async (v) => {
    setSaving(true)
    try {
      if (editing) await adminTeam.update(editing._id, v)
      else await adminTeam.create(v)
      await load(); close()
    } finally { setSaving(false) }
  }

  const columns = [
    { key: 'image', label: 'Photo', render: v => v ? <img src={v} alt="" className="w-10 h-10 rounded-full object-cover object-top" /> : <div className="w-10 h-10 bg-slate-100 dark:bg-navy-700 rounded-full" /> },
    { key: 'name', label: 'Nom' },
    { key: 'role', label: 'Poste' },
    { key: 'specialty', label: 'Spécialité', render: v => <span className="text-xs text-slate-500">{v}</span> },
  ]

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Équipe</h1>
        <p className="text-slate-500 text-sm mt-1">Gérez les membres de l'équipe affichés sur le site</p>
      </div>
      <DataTable title={`Équipe (${data.length})`} columns={columns} data={data} loading={loading} searchKey="name"
        onAdd={openAdd} onEdit={openEdit} onDelete={id => adminTeam.delete(id).then(load)} />

      <Modal open={modal} onClose={close} title={editing ? 'Modifier le membre' : 'Nouveau membre'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nom *"><input {...register('name', { required: true })} className={input} placeholder="Jean Dupont" /></Field>
            <Field label="Poste"><input {...register('role')} className={input} placeholder="Directeur Technique" /></Field>
          </div>
          <Field label="Spécialité"><input {...register('specialty')} className={input} placeholder="Ingénieur structure — Expert BIM" /></Field>
          <Field label="Photo (URL)"><input {...register('image')} className={input} placeholder="https://..." /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="LinkedIn"><input {...register('linkedin')} className={input} placeholder="https://linkedin.com/in/..." /></Field>
            <Field label="Twitter"><input {...register('twitter')} className={input} placeholder="https://twitter.com/..." /></Field>
          </div>
          <Field label="Bio"><textarea {...register('bio')} rows={3} className={`${input} resize-none`} placeholder="Présentation courte..." /></Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">Annuler</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}{editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
