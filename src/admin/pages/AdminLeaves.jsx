import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2, CalendarOff, Plus, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, Users, ChevronDown } from 'lucide-react'
import { adminLeaves, adminEmployees } from '../adminApi'
import Modal from '../components/Modal'

const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const Field = ({ label, children }) => <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>{children}</div>

const STATUS = {
  pending:  { label: 'En attente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', icon: Clock },
  approved: { label: 'Approuvé',   cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400', icon: CheckCircle },
  rejected: { label: 'Refusé',     cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',         icon: XCircle },
}

const LEAVE_TYPES = ['Congé annuel', 'Congé maladie', 'Congé maternité', 'Congé sans solde', 'Événement familial', 'Autre']

export default function AdminLeaves() {
  const [data, setData]           = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [empFilter, setEmpFilter]       = useState('all')

  // Balance & conflicts
  const [balanceInfo, setBalanceInfo]       = useState(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [conflicts, setConflicts]           = useState([])

  // Balance panel for quick lookup
  const [panelEmpId, setPanelEmpId]   = useState('')
  const [panelBalance, setPanelBalance] = useState(null)
  const [panelLoading, setPanelLoading] = useState(false)

  const { register, handleSubmit, reset, watch } = useForm()
  const startDate     = watch('startDate')
  const endDate       = watch('endDate')
  const watchEmployee = watch('employee')
  const watchType     = watch('type')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [lvR, empR] = await Promise.all([adminLeaves.getAll(), adminEmployees.getAll()])
      setData(lvR.data); setEmployees(empR.data)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  // Load balance when employee + type change in modal
  useEffect(() => {
    if (!watchEmployee || watchType !== 'Congé annuel') { setBalanceInfo(null); return }
    const year = new Date().getFullYear()
    setLoadingBalance(true)
    adminLeaves.getBalance(watchEmployee, year)
      .then(r => setBalanceInfo(r.data))
      .catch(() => setBalanceInfo(null))
      .finally(() => setLoadingBalance(false))
  }, [watchEmployee, watchType])

  // Load panel balance for quick-lookup
  useEffect(() => {
    if (!panelEmpId) { setPanelBalance(null); return }
    const year = new Date().getFullYear()
    setPanelLoading(true)
    adminLeaves.getBalance(panelEmpId, year)
      .then(r => setPanelBalance(r.data))
      .catch(() => setPanelBalance(null))
      .finally(() => setPanelLoading(false))
  }, [panelEmpId])

  const calcDays = (s, e) => {
    if (!s || !e) return 0
    const diff = new Date(e) - new Date(s)
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1)
  }

  const openAdd = () => { reset({ type: 'Congé annuel' }); setConflicts([]); setBalanceInfo(null); setModal(true) }
  const close   = () => { setModal(false); setConflicts([]); setBalanceInfo(null) }

  const onSubmit = async (v) => {
    setSaving(true)
    try {
      const r    = await adminLeaves.create({ ...v, days: calcDays(v.startDate, v.endDate) })
      const conf = r.data.conflicts || []
      await load()
      if (conf.length > 0) {
        setConflicts(conf)
        // Keep modal open so admin can see the conflicts
      } else {
        close()
      }
    } finally { setSaving(false) }
  }

  const updateStatus = async (id, status) => {
    const me = JSON.parse(localStorage.getItem('btp_admin') || '{}')
    await adminLeaves.updateStatus(id, status, me.email || 'Admin')
    await load()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette demande ?')) return
    setDeleting(id)
    try { await adminLeaves.delete(id); await load() } finally { setDeleting(null) }
  }

  const filtered = data
    .filter(l => statusFilter === 'all' || l.status === statusFilter)
    .filter(l => empFilter === 'all' || l.employee?._id === empFilter)
  const pending  = data.filter(l => l.status === 'pending').length

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Gestion des congés</h1>
            <p className="text-slate-500 text-sm mt-1">{data.length} demande{data.length > 1 ? 's' : ''} · {pending} en attente</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors">
            <Plus size={15}/> Nouvelle demande
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(STATUS).map(([k, v]) => {
            const count = data.filter(l => l.status === k).length
            const Icon = v.icon
            return (
              <div key={k} className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k === 'pending' ? 'bg-amber-100 dark:bg-amber-500/10' : k === 'approved' ? 'bg-green-100 dark:bg-green-500/10' : 'bg-red-100 dark:bg-red-500/10'}`}>
                  <Icon size={16} className={k === 'pending' ? 'text-amber-500' : k === 'approved' ? 'text-green-500' : 'text-red-500'}/>
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">{count}</div>
                  <div className="text-xs text-slate-500">{v.label}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Balance lookup panel */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
              <Users size={14} className="text-blue-500"/>
              Solde de congés
            </div>
            <select
              value={panelEmpId}
              onChange={e => setPanelEmpId(e.target.value)}
              className="flex-1 min-w-[180px] bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Sélectionner un employé…</option>
              {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
            </select>
            {panelLoading && <Loader2 size={14} className="animate-spin text-blue-500 shrink-0"/>}
            {panelBalance && !panelLoading && (
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { label: 'Quota', val: panelBalance.annual?.quota ?? 18, cls: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Pris',  val: panelBalance.annual?.used  ?? 0,  cls: 'text-orange-600 dark:text-orange-400' },
                  { label: 'Restant', val: panelBalance.annual?.remaining ?? 18,
                    cls: (panelBalance.annual?.remaining ?? 18) < 3 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400' },
                ].map(({ label, val, cls }) => (
                  <div key={label} className="text-center">
                    <p className={`text-base font-black leading-none ${cls}`}>{val}</p>
                    <p className="text-[10px] text-slate-400">{label}</p>
                  </div>
                ))}
                {panelBalance.sick?.used > 0 && (
                  <div className="text-center border-l border-slate-200 dark:border-navy-600 pl-3">
                    <p className="text-base font-black leading-none text-rose-500">{panelBalance.sick?.used ?? 0}</p>
                    <p className="text-[10px] text-slate-400">Maladie</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 flex-wrap">
            {[['all', 'Tous'], ['pending', 'En attente'], ['approved', 'Approuvés'], ['rejected', 'Refusés']].map(([k, l]) => (
              <button key={k} onClick={() => setStatusFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === k ? 'bg-blue-500 text-white' : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300'}`}>
                {l}
              </button>
            ))}
          </div>
          <select
            value={empFilter}
            onChange={e => setEmpFilter(e.target.value)}
            className="ml-auto bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Tous les employés</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
          </select>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          {loading ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
          : filtered.length === 0 ? <div className="text-center py-16 text-slate-400"><CalendarOff size={32} className="mx-auto mb-3 opacity-30"/><p className="text-sm">Aucune demande</p></div>
          : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-navy-700">
                  {['Employé', 'Type', 'Du', 'Au', 'Jours', 'Motif', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
                {filtered.map(l => {
                  const s = STATUS[l.status] || STATUS.pending
                  return (
                    <tr key={l._id} className="hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900 dark:text-white">{l.employee?.firstName} {l.employee?.lastName}</p>
                        <p className="text-xs text-slate-400">{l.employee?.department}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">{l.type}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{new Date(l.startDate).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{new Date(l.endDate).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white text-center">{l.days || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 max-w-[120px] truncate">{l.reason || '—'}</td>
                      <td className="px-4 py-3.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          {l.status === 'pending' && (<>
                            <button onClick={() => updateStatus(l._id, 'approved')} title="Approuver"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"><CheckCircle size={14}/></button>
                            <button onClick={() => updateStatus(l._id, 'rejected')} title="Refuser"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><XCircle size={14}/></button>
                          </>)}
                          <button onClick={() => handleDelete(l._id)} disabled={deleting === l._id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                            {deleting === l._id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      <Modal open={modal} onClose={close} title="Nouvelle demande de congé" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Conflict warning (shown after submit if conflicts found) */}
          {conflicts.length > 0 && (
            <div className="p-3 bg-orange-50 dark:bg-orange-500/10 rounded-xl border border-orange-200 dark:border-orange-500/20">
              <p className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={13}/>
                Congés déjà approuvés sur cette période ({conflicts.length} conflit{conflicts.length > 1 ? 's' : ''})
              </p>
              <div className="space-y-1">
                {conflicts.map((c, i) => (
                  <p key={i} className="text-xs text-orange-600 dark:text-orange-300">
                    · {c.employee?.firstName} {c.employee?.lastName} — {c.type}
                    &nbsp;({new Date(c.startDate).toLocaleDateString('fr-FR')} → {new Date(c.endDate).toLocaleDateString('fr-FR')})
                  </p>
                ))}
              </div>
              <p className="text-[10px] text-orange-500 mt-2">La demande a été enregistrée malgré les conflits.</p>
            </div>
          )}

          <Field label="Employé *">
            <select {...register('employee', { required: true })} className={inp}>
              <option value="">Sélectionner…</option>
              {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
            </select>
          </Field>

          <Field label="Type de congé">
            <select {...register('type')} className={inp}>
              {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>

          {/* Annual leave balance */}
          {watchType === 'Congé annuel' && watchEmployee && (
            loadingBalance ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin"/> Chargement du solde…
              </div>
            ) : balanceInfo ? (
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-2">
                  Solde congés annuels {new Date().getFullYear()}
                </p>
                <div className="flex gap-5">
                  <div className="text-center">
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400 leading-none">{balanceInfo.annual?.quota ?? 18}</p>
                    <p className="text-[10px] text-slate-500">Quota</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-orange-500 leading-none">{balanceInfo.annual?.used ?? 0}</p>
                    <p className="text-[10px] text-slate-500">Utilisés</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-black leading-none ${
                      (balanceInfo.annual?.remaining ?? 18) < 3 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>{balanceInfo.annual?.remaining ?? 18}</p>
                    <p className="text-[10px] text-slate-500">Restants</p>
                  </div>
                </div>
                {(balanceInfo.annual?.remaining ?? 18) < (calcDays(startDate, endDate) || 0) && startDate && endDate && (
                  <p className="mt-2 text-xs text-red-500 font-semibold flex items-center gap-1">
                    <AlertTriangle size={12}/> Solde insuffisant pour cette période
                  </p>
                )}
              </div>
            ) : null
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Du *"><input {...register('startDate', { required: true })} type="date" className={inp}/></Field>
            <Field label="Au *"><input {...register('endDate', { required: true })} type="date" className={inp}/></Field>
          </div>
          {startDate && endDate && (
            <p className="text-xs text-blue-500 font-semibold">{calcDays(startDate, endDate)} jour(s) de congé</p>
          )}
          <Field label="Motif"><textarea {...register('reason')} rows={2} className={`${inp} resize-none`}/></Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={close} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800">
              {conflicts.length > 0 ? 'Fermer' : 'Annuler'}
            </button>
            {conflicts.length === 0 && (
              <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                {saving && <Loader2 size={14} className="animate-spin"/>}Soumettre
              </button>
            )}
          </div>
        </form>
      </Modal>
    </>
  )
}
