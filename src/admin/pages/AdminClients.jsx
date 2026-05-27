import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Loader2, Users, Building2, User, Mail, Phone, MapPin, FileText, Plus, Search, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { adminClients } from '../adminApi'
import Modal from '../components/Modal'

const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
  </div>
)

function TypeBadge({ type }) {
  return type === 'entreprise'
    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 uppercase">Entreprise</span>
    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400 uppercase">Particulier</span>
}

export default function AdminClients() {
  const navigate                = useNavigate()
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [search, setSearch]     = useState('')
  const { register, handleSubmit, reset, watch } = useForm()
  const typeWatch = watch('type', 'entreprise')

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminClients.getAll(); setData(r.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd  = () => { setEditing(null); reset({ type: 'entreprise' }); setModal(true) }
  const openEdit = c  => { setEditing(c); reset(c); setModal(true) }
  const close    = () => { setModal(false); setEditing(null) }

  const onSubmit = async (v) => {
    setSaving(true)
    try {
      if (editing) await adminClients.update(editing._id, v)
      else         await adminClients.create(v)
      await load(); close()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce client ?')) return
    setDeleting(id)
    try { await adminClients.delete(id); await load() } finally { setDeleting(null) }
  }

  const filtered = data.filter(c =>
    [c.name, c.email, c.phone, c.city].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Clients</h1>
            <p className="text-slate-500 text-sm mt-1">{data.length} client{data.length > 1 ? 's' : ''} enregistré{data.length > 1 ? 's' : ''}</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/25">
            <Plus size={16}/> Nouveau client
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users size={32} className="mx-auto mb-3 opacity-30"/>
              <p className="text-sm">{search ? 'Aucun résultat' : 'Aucun client'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-navy-700">
                  {['Client', 'Type', 'Contact', 'Ville', 'ICE / Notes', 'Actions'].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-5 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
                {filtered.map(c => (
                  <tr key={c._id}
                    onClick={() => navigate(`/admin/clients/${c._id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors cursor-pointer group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.type === 'entreprise' ? 'bg-blue-100 dark:bg-blue-500/10' : 'bg-violet-100 dark:bg-violet-500/10'}`}>
                          {c.type === 'entreprise' ? <Building2 size={16} className="text-blue-500"/> : <User size={16} className="text-violet-500"/>}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{c.name}</p>
                          {c.address && <p className="text-xs text-slate-400 truncate max-w-[150px]">{c.address}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><TypeBadge type={c.type}/></td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        {c.email && <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1"><Mail size={10} className="text-slate-400"/>{c.email}</p>}
                        {c.phone && <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1"><Phone size={10} className="text-slate-400"/>{c.phone}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {c.city && <span className="flex items-center gap-1 text-xs text-slate-500"><MapPin size={10}/>{c.city}</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs text-slate-400">
                        {c.ice && <p className="font-mono">{c.ice}</p>}
                        {c.notes && <p className="truncate max-w-[120px]">{c.notes}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                          <Pencil size={14}/>
                        </button>
                        <button onClick={() => handleDelete(c._id)} disabled={deleting === c._id} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                          {deleting === c._id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                        </button>
                        <ChevronRight size={14} className="text-slate-300 dark:text-navy-600 group-hover:text-blue-400 transition-colors ml-1"/>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={close} title={editing ? 'Modifier le client' : 'Nouveau client'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nom / Raison sociale *">
              <input {...register('name', { required: true })} className={inp} placeholder="Groupe Horizon SA" />
            </Field>
            <Field label="Type">
              <select {...register('type')} className={inp}>
                <option value="entreprise">Entreprise</option>
                <option value="particulier">Particulier</option>
              </select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Email"><input {...register('email')} type="email" className={inp} placeholder="contact@exemple.ma"/></Field>
            <Field label="Téléphone"><input {...register('phone')} className={inp} placeholder="+212 522 000 000"/></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Ville"><input {...register('city')} className={inp} placeholder="Casablanca"/></Field>
            <Field label={typeWatch === 'entreprise' ? 'ICE (Identifiant fiscal)' : 'CIN'}>
              <input {...register('ice')} className={inp} placeholder={typeWatch === 'entreprise' ? '001234567890123' : 'AB123456'}/>
            </Field>
          </div>
          <Field label="Adresse complète"><input {...register('address')} className={inp} placeholder="45 Bd Zerktouni, Casablanca"/></Field>
          <Field label="Notes internes"><textarea {...register('notes')} rows={2} className={`${inp} resize-none`} placeholder="Informations complémentaires…"/></Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">Annuler</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin"/>}{editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
