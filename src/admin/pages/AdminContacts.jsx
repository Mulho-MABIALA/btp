import { useState, useEffect, useCallback } from 'react'
import { Trash2, Loader2, Mail, Phone, Tag, MessageSquare, CheckCircle, Eye } from 'lucide-react'
import { adminContacts } from '../adminApi'
import Modal from '../components/Modal'

const STATUS = {
  new:  { label: 'Nouveau',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  read: { label: 'Lu',       cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  done: { label: 'Traité',   cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' },
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.new
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${s.cls}`}>{s.label}</span>
}

export default function AdminContacts() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminContacts.getAll(); setData(r.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const updateStatus = async (id, status) => {
    await adminContacts.updateStatus(id, status)
    setData(d => d.map(c => c._id === id ? { ...c, status } : c))
    if (selected?._id === id) setSelected(s => ({ ...s, status }))
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce message ?')) return
    setDeleting(id)
    try { await adminContacts.delete(id); await load(); if (selected?._id === id) setSelected(null) }
    finally { setDeleting(null) }
  }

  const openMsg = (c) => {
    setSelected(c)
    if (c.status === 'new') updateStatus(c._id, 'read')
  }

  const filtered = filter === 'all' ? data : data.filter(c => c.status === filter)
  const counts = { all: data.length, new: data.filter(c => c.status==='new').length, read: data.filter(c=>c.status==='read').length, done: data.filter(c=>c.status==='done').length }

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Messages reçus</h1>
          <p className="text-slate-500 text-sm mt-1">Formulaire de contact du site</p>
        </div>
        {counts.new > 0 && <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">{counts.new} nouveau{counts.new>1?'x':''}</span>}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-4">
        {[['all','Tous'],['new','Nouveaux'],['read','Lus'],['done','Traités']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter===k ? 'bg-blue-500 text-white' : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 hover:border-blue-300'}`}>
            {l} {counts[k] > 0 && <span className="ml-1 opacity-70">({counts[k]})</span>}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400"><Mail size={32} className="mx-auto mb-3 opacity-30" /><p className="text-sm">Aucun message</p></div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-navy-800">
            {filtered.map(c => (
              <div key={c._id} className={`flex items-start gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors cursor-pointer ${c.status==='new' ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''}`}
                onClick={() => openMsg(c)}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${c.status==='new' ? 'bg-blue-500' : 'bg-slate-200 dark:bg-navy-700'}`}>
                  <Mail size={16} className={c.status==='new' ? 'text-white' : 'text-slate-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">{c.name}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{c.email} {c.phone && `· ${c.phone}`}</p>
                  {c.subject && <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{c.subject}</p>}
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{c.message}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                  <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</span>
                  {c.status !== 'done' && (
                    <button onClick={() => updateStatus(c._id, 'done')} title="Marquer traité"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors">
                      <CheckCircle size={14} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(c._id)} disabled={deleting===c._id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                    {deleting===c._id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal détail */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Détail du message" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-full flex items-center justify-center">
                <Mail size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{selected.name}</p>
                <p className="text-sm text-slate-500">{selected.email}</p>
              </div>
              <StatusBadge status={selected.status} />
            </div>
            {selected.phone && <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><Phone size={14} className="text-blue-500"/>{selected.phone}</div>}
            {selected.subject && <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><Tag size={14} className="text-blue-500"/>{selected.subject}</div>}
            <div className="bg-slate-50 dark:bg-navy-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-2"><MessageSquare size={12}/>Message</div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
            </div>
            <p className="text-xs text-slate-400">Reçu le {new Date(selected.createdAt).toLocaleString('fr-FR')}</p>
            <div className="flex gap-2 pt-2">
              {['new','read','done'].map(s => (
                <button key={s} onClick={() => updateStatus(selected._id, s)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${selected.status===s ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-navy-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-navy-600'}`}>
                  {STATUS[s].label}
                </button>
              ))}
            </div>
            <a href={`mailto:${selected.email}`} className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors">
              <Mail size={15}/> Répondre par email
            </a>
          </div>
        )}
      </Modal>
    </>
  )
}
