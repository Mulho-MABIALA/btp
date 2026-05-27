/**
 * Export an array of objects as a CSV file download.
 * @param {string} filename   e.g. "clients-2024.csv"
 * @param {object[]} rows     Array of plain objects (flat values)
 * @param {object} [headers]  Optional { key: 'Label' } map. Defaults to object keys.
 */
export function exportCsv(filename, rows, headers = null) {
  if (!rows?.length) return

  const keys   = headers ? Object.keys(headers) : Object.keys(rows[0])
  const labels = headers ? Object.values(headers) : keys

  const escape = val => {
    if (val === null || val === undefined) return ''
    const s = String(val).replace(/"/g, '""')
    return s.includes(';') || s.includes('"') || s.includes('\n') ? `"${s}"` : s
  }

  const csv = [
    labels.map(escape).join(';'),
    ...rows.map(r => keys.map(k => escape(r[k])).join(';'))
  ].join('\r\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
