import { useState, useEffect, useCallback } from 'react'
import { Trash2, Loader2, ClipboardList, Phone, Mail, MapPin, DollarSign, Tag, CheckCircle, RefreshCw } from 'lucide-react'
import { adminQuotes } from '../adminApi'
import Modal from '../components/Modal'

const STATUS = {
  new:       { label: 'Nouveau',   cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400' },
  read:      { label: 'Lu',        cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  done:      { label: 'Traité',    cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' },
  converted: { label: 'Converti',  cls: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400' },
}
function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.new
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${s.cls}`}>{s.label}</span>
}

export default function AdminQuotes() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting]     = useState(null)
  const [converting, setConverting] = useState(null)
  const [convertMsg, setConvertMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminQuotes.getAll(); setData(r.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const updateStatus = async (id, status) => {
    await adminQuotes.updateStatus(id, status)
    setData(d => d.map(q => q._id === id ? { ...q, status } : q))
    if (selected?._id === id) setSelected(s => ({ ...s, status }))
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette demande ?')) return
    setDeleting(id)
    try { await adminQuotes.delete(id); await load(); if (selected?._id === id) setSelected(null) }
    finally { setDeleting(null) }
  }

  const handleConvert = async (id) => {
    if (!window.confirm('Convertir ce devis en facture ?')) return
    setConverting(id)
    try {
      const r = await adminQuotes.convertToInvoice(id)
      setConvertMsg(`Facture ${r.data.number} créée avec succès.`)
      await load()
      if (selected?._id === id) setSelected(s => ({ ...s, status: 'converted' }))
      setTimeout(() => setConvertMsg(''), 4000)
    } catch (e) {
      alert(e.response?.data?.error || 'Erreur lors de la conversion')
    } finally { setConverting(null) }
  }

  const openQuote = (q) => {
    setSelected(q)
    if (q.status === 'new') updateStatus(q._id, 'read')
  }

  const filtered = filter === 'all' ? data : data.filter(q => q.status === filter)
  const counts   = {
    all:       data.length,
    new:       data.filter(q => q.status === 'new').length,
    read:      data.filter(q => q.status === 'read').length,
    done:      data.filter(q => q.status === 'done').length,
    converted: data.filter(q => q.status === 'converted').length,
  }

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Demandes de devis</h1>
          <p className="text-slate-500 text-sm mt-1">Formulaire devis du site</p>
        </div>
        {counts.new > 0 && <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">{counts.new} nouveau{counts.new>1?'x':''}</span>}
      </div>

      {convertMsg && (
        <div className="mb-4 flex items-center gap-2 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 px-4 py-2.5 rounded-xl text-sm font-semibold">
          <CheckCircle size={14}/> {convertMsg}
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {[['all','Tous'],['new','Nouveaux'],['read','Lus'],['done','Traités'],['converted','Convertis']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter===k ? 'bg-orange-500 text-white' : 'bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 hover:border-orange-300'}`}>
            {l} {counts[k] > 0 && <span className="ml-1 opacity-70">({counts[k]})</span>}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-orange-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400"><ClipboardList size={32} className="mx-auto mb-3 opacity-30" /><p className="text-sm">Aucune demande de devis</p></div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-navy-800">
            {filtered.map(q => (
              <div key={q._id} className={`flex items-start gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-navy-800/50 cursor-pointer transition-colors ${q.status==='new' ? 'bg-orange-50/50 dark:bg-orange-500/5' : ''}`}
                onClick={() => openQuote(q)}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${q.status==='new' ? 'bg-orange-500' : 'bg-slate-200 dark:bg-navy-700'}`}>
                  <ClipboardList size={16} className={q.status==='new' ? 'text-white' : 'text-slate-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">{q.name}</span>
                    <StatusBadge status={q.status} />
                  </div>
                  <p className="text-xs text-slate-500">{q.email} {q.phone && `· ${q.phone}`}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {q.serviceType && <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">{q.serviceType}</span>}
                    {q.budget && <span className="text-xs text-slate-400">{q.budget}</span>}
                    {q.location && <span className="text-xs text-slate-400 flex items-center gap-0.5"><MapPin size={9}/>{q.location}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <span className="text-[10px] text-slate-400">{new Date(q.createdAt).toLocaleDateString('fr-FR')}</span>
                  {q.status !== 'done' && q.status !== 'converted' && (
                    <button onClick={() => updateStatus(q._id, 'done')} title="Marquer traité"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors">
                      <CheckCircle size={14} />
                    </button>
                  )}
                  {q.status !== 'converted' && (
                    <button onClick={() => handleConvert(q._id)} disabled={converting === q._id} title="Convertir en facture"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors disabled:opacity-40">
                      {converting === q._id ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>}
                    </button>
                  )}
                  <button onClick={() => handleDelete(q._id)} disabled={deleting===q._id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40">
                    {deleting===q._id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal détail */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Demande de devis" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/10 rounded-full flex items-center justify-center">
                <ClipboardList size={20} className="text-orange-500" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{selected.name} {selected.company && <span className="font-normal text-slate-500">— {selected.company}</span>}</p>
                <p className="text-sm text-slate-500">{selected.email}</p>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Phone, label: 'Téléphone', val: selected.phone },
                { icon: Tag, label: 'Type de travaux', val: selected.serviceType },
                { icon: DollarSign, label: 'Budget', val: selected.budget },
                { icon: MapPin, label: 'Localisation', val: selected.location },
              ].filter(i => i.val).map(({ icon: Icon, label, val }) => (
                <div key={label} className="bg-slate-50 dark:bg-navy-800 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wide mb-1">
                    <Icon size={10}/>{label}
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{val}</p>
                </div>
              ))}
            </div>

            {selected.description && (
              <div className="bg-slate-50 dark:bg-navy-800 rounded-xl p-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Description du projet</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selected.description}</p>
              </div>
            )}

            <p className="text-xs text-slate-400">Reçu le {new Date(selected.createdAt).toLocaleString('fr-FR')}</p>

            <div className="flex gap-2 pt-2">
              {['new','read','done'].map(s => (
                <button key={s} onClick={() => updateStatus(selected._id, s)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${selected.status===s ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-navy-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-navy-600'}`}>
                  {STATUS[s].label}
                </button>
              ))}
            </div>

            {selected.status !== 'converted' && (
              <button onClick={() => handleConvert(selected._id)} disabled={converting === selected._id}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60">
                {converting === selected._id ? <Loader2 size={15} className="animate-spin"/> : <RefreshCw size={15}/>}
                {converting === selected._id ? 'Conversion…' : 'Convertir en facture'}
              </button>
            )}

            <a href={`mailto:${selected.email}?subject=Réponse à votre demande de devis`}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors">
              <Mail size={15}/> Répondre par email
            </a>
          </div>
        )}
      </Modal>
    </>
  )
}
