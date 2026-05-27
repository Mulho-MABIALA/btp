import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2, UserCog, Plus, Pencil, Trash2, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { adminAuth } from '../adminApi'
import Modal from '../components/Modal'

const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
  </div>
)

const ROLES = {
  superadmin:    { label: 'Super Admin',    cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' },
  directeur:     { label: 'Directeur',      cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  comptable:     { label: 'Comptable',      cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  chef_chantier: { label: 'Chef chantier',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
}

const ROLE_PERMS = {
  superadmin:    ['Accès total', 'Gestion utilisateurs', 'Paramètres', 'Suppressions'],
  directeur:     ['Dashboard', 'Projets', 'Finance', 'RH', 'Rapports'],
  comptable:     ['Finance', 'Factures', 'Dépenses', 'Bons de commande'],
  chef_chantier: ['Tâches', 'Rapports chantier', 'Inventaire', 'Fournisseurs'],
}

function Avatar({ name, email }) {
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : email?.[0]?.toUpperCase() || '?'
  const colors = ['from-blue-400 to-indigo-500', 'from-violet-400 to-purple-500', 'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500']
  const color = colors[(initials.charCodeAt(0) || 0) % colors.length]
  return (
    <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0`}>
      {initials}
    </div>
  )
}

export default function AdminUsers() {
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [showPwd, setShowPwd]   = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminAuth.users.getAll(); setData(r.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    reset({ role: 'directeur' })
    setShowPwd(false)
    setModal(true)
  }
  const openEdit = u => {
    setEditing(u)
    reset({ name: u.name, email: u.email, role: u.role })
    setShowPwd(false)
    setModal(true)
  }
  const close = () => { setModal(false); setEditing(null) }

  const onSubmit = async (v) => {
    setSaving(true)
    const payload = { name: v.name, email: v.email, role: v.role }
    if (v.password) payload.password = v.password
    try {
      if (editing) await adminAuth.users.update(editing._id, payload)
      else         await adminAuth.users.create({ ...payload, password: v.password })
      await load(); close()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet utilisateur ? Cette action est irréversible.')) return
    setDeleting(id)
    try { await adminAuth.users.delete(id); await load() } finally { setDeleting(null) }
  }

  const me = JSON.parse(localStorage.getItem('btp_admin') || '{}')

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Utilisateurs</h1>
            <p className="text-slate-500 text-sm mt-1">{data.length} compte{data.length > 1 ? 's' : ''} administrateur</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors">
            <Plus size={15}/> Nouvel utilisateur
          </button>
        </div>

        {/* Grid cards */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <UserCog size={32} className="mx-auto mb-3 opacity-30"/>
            <p className="text-sm">Aucun utilisateur</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map(u => {
              const role = ROLES[u.role] || ROLES.directeur
              const perms = ROLE_PERMS[u.role] || []
              const isMe = u.email === me.email
              return (
                <div key={u._id} className={`bg-white dark:bg-navy-900 rounded-2xl border ${isMe ? 'border-blue-300 dark:border-blue-500/40' : 'border-slate-200 dark:border-navy-700'} p-5 relative`}>
                  {isMe && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={10}/> Vous
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={u.name} email={u.email}/>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{u.name || 'Sans nom'}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${role.cls}`}>{role.label}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {perms.map(p => (
                      <span key={p} className="text-[9px] font-semibold bg-slate-100 dark:bg-navy-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">{p}</span>
                    ))}
                  </div>

                  <div className="text-[10px] text-slate-400 mb-4">
                    Créé le {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                  </div>

                  <div className="flex gap-2 border-t border-slate-100 dark:border-navy-700 pt-3">
                    <button onClick={() => openEdit(u)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                      <Pencil size={12}/> Modifier
                    </button>
                    <button onClick={() => handleDelete(u._id)} disabled={deleting === u._id || isMe}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      {deleting === u._id ? <Loader2 size={12} className="animate-spin"/> : <Trash2 size={12}/>}
                      Supprimer
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Role legend */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Rôles et permissions</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(ROLES).map(([key, { label, cls }]) => (
              <div key={key} className="space-y-2">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
                <ul className="space-y-1 mt-2">
                  {ROLE_PERMS[key].map(p => (
                    <li key={p} className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-navy-500 shrink-0"/>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={modal} onClose={close} title={editing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Nom complet">
            <input {...register('name')} className={inp} placeholder="Mohammed Alami"/>
          </Field>
          <Field label="Email *">
            <input {...register('email', { required: true })} type="email" className={inp} placeholder="m.alami@constructpro.com"/>
            {errors.email && <p className="text-red-500 text-xs mt-1">Email requis</p>}
          </Field>
          <Field label="Rôle">
            <select {...register('role')} className={inp}>
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label={editing ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}>
            <div className="relative">
              <input
                {...register('password', { required: !editing })}
                type={showPwd ? 'text' : 'password'}
                className={`${inp} pr-10`}
                placeholder={editing ? '••••••••' : 'Minimum 6 caractères'}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">Mot de passe requis</p>}
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin"/>}
              {editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
