import { useState } from 'react'
import { Pencil, Trash2, Plus, Search, Loader2 } from 'lucide-react'

export default function DataTable({ title, columns, data, loading, onAdd, onEdit, onDelete, searchKey = 'title' }) {
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)

  const filtered = (data || []).filter(row =>
    !search || String(row[searchKey] ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (row) => {
    if (!window.confirm(`Supprimer "${row[searchKey]}" ?`)) return
    setDeleting(row._id)
    try { await onDelete(row._id) } finally { setDeleting(null) }
  }

  return (
    <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-sm border border-slate-200 dark:border-navy-700">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-navy-700">
        <h2 className="font-bold text-slate-900 dark:text-white text-lg">{title}</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="pl-8 pr-3 py-2 text-sm bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white w-44"
            />
          </div>
          {onAdd && (
            <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors">
              <Plus size={15} /> Ajouter
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Search size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun résultat trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-navy-700">
                {columns.map(col => (
                  <th key={col.key} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {col.label}
                  </th>
                ))}
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-navy-800">
              {filtered.map(row => (
                <tr key={row._id} className="hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="px-6 py-3.5 text-slate-700 dark:text-slate-300">
                      {col.render ? col.render(row[col.key], row) : (
                        <span className="line-clamp-1">{row[col.key] ?? '—'}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {onEdit && (
                        <button onClick={() => onEdit(row)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                          <Pencil size={14} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => handleDelete(row)}
                          disabled={deleting === row._id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40"
                        >
                          {deleting === row._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <div className="px-6 py-3 border-t border-slate-100 dark:border-navy-700 text-xs text-slate-400">
          {filtered.length} élément{filtered.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
