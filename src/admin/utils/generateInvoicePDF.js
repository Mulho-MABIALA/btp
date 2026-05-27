import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 2 }).format(n || 0)
const fmt0 = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)

const STATUS_LABELS = { draft: 'BROUILLON', sent: 'ENVOYÉE', paid: 'PAYÉE', overdue: 'EN RETARD', partial: 'PARTIEL' }

export function generateInvoicePDF(invoice, settings = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const w = doc.internal.pageSize.getWidth()
  const cur = settings.currency || 'MAD'
  const companyName = settings.companyName || 'CONSTRUCTPRO'

  // ── Header band ─────────────────────────────────────────────────────────
  doc.setFillColor(11, 22, 40)
  doc.rect(0, 0, w, 45, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, 15, 20)

  if (settings.tagline) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    doc.text(settings.tagline, 15, 27)
  }

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  ;[settings.address,
    settings.city && settings.country ? `${settings.city}, ${settings.country}` : settings.city,
    settings.phone, settings.email, settings.website,
  ].filter(Boolean).forEach((line, i) => doc.text(line, w - 15, 12 + i * 5, { align: 'right' }))

  // ── Title block ─────────────────────────────────────────────────────────
  const typeLabel = (invoice.invoiceType || 'Facture').toUpperCase()
  doc.setFillColor(37, 99, 235)
  doc.roundedRect(15, 52, 90, 18, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(typeLabel, 60, 64, { align: 'center' })

  // Number + dates (right)
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`N° ${invoice.number}`, w - 15, 57, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(`Date : ${new Date(invoice.date || Date.now()).toLocaleDateString('fr-FR')}`, w - 15, 63, { align: 'right' })
  if (invoice.dueDate) doc.text(`Échéance : ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}`, w - 15, 69, { align: 'right' })
  if (invoice.paymentTerms) doc.text(`Conditions : ${invoice.paymentTerms}`, w - 15, 75, { align: 'right' })

  // Status badge
  const statusColor = { paid: [34, 197, 94], sent: [59, 130, 246], draft: [148, 163, 184], overdue: [239, 68, 68], partial: [245, 158, 11] }
  const sc = statusColor[invoice.status] || statusColor.draft
  doc.setFillColor(...sc)
  doc.roundedRect(15, 74, 32, 7, 1.5, 1.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text(STATUS_LABELS[invoice.status] || 'BROUILLON', 31, 79, { align: 'center' })

  // ── Client block ─────────────────────────────────────────────────────────
  let topY = 84
  if (invoice.paymentTerms) topY = 88  // shift down if we had one extra line

  doc.setFillColor(248, 250, 252)
  doc.roundedRect(15, topY, 85, 36, 2, 2, 'F')
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURER À', 20, topY + 7)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text(invoice.client?.name || '—', 20, topY + 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  let clientY = topY + 20
  if (invoice.client?.email) { doc.text(invoice.client.email, 20, clientY); clientY += 6 }
  if (invoice.client?.city)  { doc.text(invoice.client.city,  20, clientY); clientY += 6 }
  if (invoice.project) {
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(7.5)
    doc.text(`Projet : ${invoice.project}`, 20, topY + 34)
  }

  // Quote ref (right side of client block)
  if (invoice.quoteRef) {
    doc.setFillColor(239, 246, 255)
    doc.roundedRect(w - 75, topY, 60, 14, 2, 2, 'F')
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('RÉFÉRENCE DEVIS', w - 72, topY + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(15, 23, 42)
    doc.text(invoice.quoteRef, w - 72, topY + 12)
  }

  // ── Line items table ─────────────────────────────────────────────────────
  let tableBody = []
  if (invoice.lines?.length) {
    tableBody = invoice.lines.map(l => [
      l.description,
      String(l.qty ?? 1),
      l.unit || 'forfait',
      `${fmt(l.unitPrice)} ${cur}`,
      `${fmt(l.total ?? (l.qty || 1) * (l.unitPrice || 0))} ${cur}`,
    ])
  } else {
    // Legacy invoice without lines
    tableBody = [[
      invoice.project || 'Travaux de construction BTP',
      '1', 'forfait',
      `${fmt(invoice.amount)} ${cur}`,
      `${fmt(invoice.amount)} ${cur}`,
    ]]
  }

  autoTable(doc, {
    startY: topY + 42,
    head: [['Description', 'Qté', 'Unité', `P.U. (${cur})`, `Total HT (${cur})`]],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [11, 22, 40],
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
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  let y = doc.lastAutoTable.finalY + 8

  // ── Totals panel ─────────────────────────────────────────────────────────
  const hasDiscount  = (invoice.discount || 0) > 0
  const hasRetention = (invoice.retention || 0) > 0
  const rows = []

  if (invoice.subtotalHT && hasDiscount) {
    rows.push({ label: 'Sous-total HT',        val: `${fmt(invoice.subtotalHT)} ${cur}`,  bold: false, color: [71, 85, 105] })
    rows.push({ label: `Remise (${invoice.discount}%)`, val: `− ${fmt(invoice.discountAmount)} ${cur}`, bold: false, color: [234, 88, 12] })
  }
  rows.push({ label: 'Montant HT',          val: `${fmt(invoice.amount)} ${cur}`,       bold: false, color: [71, 85, 105] })
  rows.push({ label: `TVA (${invoice.tax || 20}%)`, val: `${fmt((invoice.totalWithTax || 0) - (invoice.amount || 0))} ${cur}`, bold: false, color: [71, 85, 105] })
  rows.push({ label: 'Total TTC',            val: `${fmt(invoice.totalWithTax)} ${cur}`, bold: true,  color: [15, 23, 42], highlight: [219, 234, 254] })
  if (hasRetention) {
    rows.push({ label: `Retenue de garantie (${invoice.retention}%)`, val: `− ${fmt(invoice.retentionAmount)} ${cur}`, bold: false, color: [220, 38, 38] })
    rows.push({ label: 'Net à payer',         val: `${fmt(invoice.netToPay)} ${cur}`,    bold: true,  color: [22, 163, 74], highlight: [220, 252, 231] })
  }
  if ((invoice.amountPaid || 0) > 0 && invoice.status !== 'paid') {
    rows.push({ label: 'Déjà payé',           val: `${fmt(invoice.amountPaid)} ${cur}`,  bold: false, color: [34, 197, 94] })
    const base = invoice.netToPay || invoice.totalWithTax || 0
    rows.push({ label: 'Reste à payer',        val: `${fmt0(base - invoice.amountPaid)} ${cur}`, bold: true, color: [234, 88, 12], highlight: [255, 237, 213] })
  }

  const rowH   = 8
  const boxW   = 72
  const boxX   = w - boxW - 15
  const boxH   = rows.length * rowH + 6
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(boxX, y, boxW, boxH, 2, 2, 'S')

  rows.forEach((row, i) => {
    const ry = y + 5 + i * rowH
    if (row.highlight) {
      doc.setFillColor(...row.highlight)
      doc.rect(boxX, ry - 4.5, boxW, rowH, 'F')
    }
    doc.setTextColor(...row.color)
    doc.setFontSize(row.bold ? 9 : 8)
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal')
    doc.text(row.label, boxX + 4, ry)
    doc.text(row.val,   w - 19,   ry, { align: 'right' })
  })

  y = y + boxH + 8

  // ── Bank details ──────────────────────────────────────────────────────────
  if (settings.bankName || settings.iban) {
    doc.setFillColor(239, 246, 255)
    doc.roundedRect(15, y, w - 30, 20, 2, 2, 'F')
    doc.setTextColor(59, 130, 246)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('COORDONNÉES BANCAIRES', 20, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)
    if (settings.bankName) doc.text(`Banque : ${settings.bankName}`, 20, y + 15)
    if (settings.iban)     doc.text(`RIB/IBAN : ${settings.iban}`, 90, y + 15)
    y += 26
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    doc.setFillColor(255, 251, 235)
    doc.roundedRect(15, y, w - 30, 16, 2, 2, 'F')
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('NOTES', 20, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    doc.text(invoice.notes, 20, y + 12)
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const fy = 270
  doc.setFillColor(248, 250, 252)
  doc.rect(0, fy, w, 27, 'F')
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  const legalParts = [
    settings.ice      && `ICE : ${settings.ice}`,
    settings.rc       && `RC : ${settings.rc}`,
    settings.patente  && `Patente : ${settings.patente}`,
    settings.capital  && `Capital : ${settings.capital}`,
    settings.tvaNumber && `IF : ${settings.tvaNumber}`,
  ].filter(Boolean)
  if (legalParts.length) doc.text(legalParts.join('  ·  '), w / 2, fy + 8, { align: 'center' })
  if (settings.invoiceNotes) {
    doc.setTextColor(100, 116, 139)
    doc.text(settings.invoiceNotes, w / 2, fy + 15, { align: 'center' })
  }
  doc.setTextColor(200, 210, 220)
  doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} — ${companyName}`, w / 2, fy + 22, { align: 'center' })

  doc.save(`${invoice.number}.pdf`)
}
