import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 2 }).format(n || 0)

const STATUS_LABELS = { draft: 'BROUILLON', issued: 'ÉMIS', applied: 'APPLIQUÉ' }

export function generateCreditNotePDF(cn, settings = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const w   = doc.internal.pageSize.getWidth()
  const cur = settings.currency || 'MAD'
  const companyName = settings.companyName || 'CONSTRUCTPRO'

  // ── Header band (rouge foncé) ────────────────────────────────────────────
  doc.setFillColor(136, 19, 55)   // rose-900
  doc.rect(0, 0, w, 45, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, 15, 20)

  if (settings.tagline) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(253, 164, 175)  // rose-300
    doc.text(settings.tagline, 15, 27)
  }

  doc.setFontSize(8)
  doc.setTextColor(253, 164, 175)
  ;[settings.address,
    settings.city && settings.country ? `${settings.city}, ${settings.country}` : settings.city,
    settings.phone, settings.email,
  ].filter(Boolean).forEach((line, i) => doc.text(line, w - 15, 12 + i * 5, { align: 'right' }))

  // ── Title block ──────────────────────────────────────────────────────────
  doc.setFillColor(244, 63, 94)   // rose-500
  doc.roundedRect(15, 52, 70, 18, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('AVOIR', 50, 64, { align: 'center' })

  // Numéro + dates
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`N° ${cn.number}`, w - 15, 57, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(`Date : ${new Date(cn.date || Date.now()).toLocaleDateString('fr-FR')}`, w - 15, 63, { align: 'right' })
  if (cn.invoice?.number || cn.invoiceNumber) {
    doc.text(`Sur facture : ${cn.invoice?.number || cn.invoiceNumber}`, w - 15, 69, { align: 'right' })
  }

  // Statut badge
  const sc = cn.status === 'applied' ? [34, 197, 94] : cn.status === 'issued' ? [244, 63, 94] : [148, 163, 184]
  doc.setFillColor(...sc)
  doc.roundedRect(15, 74, 32, 7, 1.5, 1.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text(STATUS_LABELS[cn.status] || 'BROUILLON', 31, 79, { align: 'center' })

  // ── Client block ─────────────────────────────────────────────────────────
  doc.setFillColor(255, 241, 242)  // rose-50
  doc.roundedRect(15, 84, 85, 32, 2, 2, 'F')
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('AVOIR POUR', 20, 91)
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text(cn.client?.name || '—', 20, 98)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  let cy = 104
  if (cn.client?.email) { doc.text(cn.client.email, 20, cy); cy += 6 }
  if (cn.client?.city)  doc.text(cn.client.city,  20, cy)

  // Motif bloc (droite)
  doc.setFillColor(255, 241, 242)
  doc.roundedRect(w - 75, 84, 60, 32, 2, 2, 'F')
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('MOTIF DE L\'AVOIR', w - 72, 91)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  const reasonLines = doc.splitTextToSize(cn.reason || '—', 54)
  doc.text(reasonLines, w - 72, 97)

  // ── Line items table ─────────────────────────────────────────────────────
  let tableBody = []
  if (cn.lines?.length) {
    tableBody = cn.lines.map(l => [
      l.description,
      String(l.qty ?? 1),
      l.unit || 'forfait',
      `${fmt(l.unitPrice)} ${cur}`,
      `${fmt(l.total ?? (l.qty || 1) * (l.unitPrice || 0))} ${cur}`,
    ])
  } else {
    tableBody = [[cn.reason || 'Avoir', '1', 'forfait', `${fmt(cn.amount)} ${cur}`, `${fmt(cn.amount)} ${cur}`]]
  }

  autoTable(doc, {
    startY: 122,
    head: [['Description', 'Qté', 'Unité', `P.U. (${cur})`, `Total HT (${cur})`]],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [136, 19, 55],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 5,
    },
    bodyStyles: { fontSize: 8.5, cellPadding: 5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 14 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right',  cellWidth: 32 },
      4: { halign: 'right',  cellWidth: 32, fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [255, 241, 242] },
  })

  const y = doc.lastAutoTable.finalY + 8

  // ── Totals ───────────────────────────────────────────────────────────────
  const rows = []
  if (cn.discount > 0) {
    rows.push({ label: 'Sous-total HT',         val: `${fmt(cn.subtotalHT)} ${cur}`,     bold: false })
    rows.push({ label: `Remise (${cn.discount}%)`, val: `− ${fmt(cn.discountAmount)} ${cur}`, bold: false, red: true })
  }
  rows.push({ label: 'Montant HT',   val: `${fmt(cn.amount)} ${cur}`,       bold: false })
  rows.push({ label: `TVA (${cn.tax || 20}%)`, val: `${fmt((cn.totalWithTax || 0) - (cn.amount || 0))} ${cur}`, bold: false })
  rows.push({ label: 'TOTAL AVOIR TTC', val: `− ${fmt(cn.totalWithTax)} ${cur}`, bold: true, highlight: true })

  const rowH = 8
  const boxW = 72
  const boxX = w - boxW - 15
  const boxH = rows.length * rowH + 6
  doc.setDrawColor(253, 164, 175)
  doc.setLineWidth(0.4)
  doc.roundedRect(boxX, y, boxW, boxH, 2, 2, 'S')

  rows.forEach((row, i) => {
    const ry = y + 5 + i * rowH
    if (row.highlight) {
      doc.setFillColor(255, 241, 242)
      doc.rect(boxX, ry - 4.5, boxW, rowH, 'F')
    }
    const color = row.red ? [220, 38, 38] : row.highlight ? [136, 19, 55] : [71, 85, 105]
    doc.setTextColor(...color)
    doc.setFontSize(row.bold ? 9 : 8)
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal')
    doc.text(row.label, boxX + 4, ry)
    doc.text(row.val,   w - 19,   ry, { align: 'right' })
  })

  // ── Notes ────────────────────────────────────────────────────────────────
  if (cn.notes) {
    const ny = y + boxH + 6
    doc.setFillColor(255, 251, 235)
    doc.roundedRect(15, ny, w - 30, 16, 2, 2, 'F')
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('NOTES', 20, ny + 6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    doc.text(cn.notes, 20, ny + 12)
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const fy = 270
  doc.setFillColor(255, 241, 242)
  doc.rect(0, fy, w, 27, 'F')
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  const legalParts = [
    settings.ice      && `ICE : ${settings.ice}`,
    settings.rc       && `RC : ${settings.rc}`,
    settings.patente  && `Patente : ${settings.patente}`,
    settings.tvaNumber && `IF : ${settings.tvaNumber}`,
  ].filter(Boolean)
  if (legalParts.length) doc.text(legalParts.join('  ·  '), w / 2, fy + 8, { align: 'center' })
  doc.setTextColor(200, 210, 220)
  doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} — ${companyName}`, w / 2, fy + 22, { align: 'center' })

  doc.save(`${cn.number}.pdf`)
}
