import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt0 = n => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n || 0)

export function generatePurchaseOrderPDF(po, settings = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const w   = doc.internal.pageSize.getWidth()
  const company = settings.companyName || 'CONSTRUCTPRO'

  const STATUS_LABELS = { draft: 'BROUILLON', sent: 'ENVOYÉ', partial: 'PARTIEL', received: 'REÇU', cancelled: 'ANNULÉ' }

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(11, 22, 40)
  doc.rect(0, 0, w, 42, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(company, 15, 18)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('BON DE COMMANDE', 15, 26)
  doc.text(`N° ${po.number || '—'}`, 15, 33)

  // Company info right
  ;[settings.address,
    settings.city && settings.country ? `${settings.city}, ${settings.country}` : settings.city,
    settings.phone, settings.email,
  ].filter(Boolean).forEach((line, i) => {
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(line, w - 15, 13 + i * 5, { align: 'right' })
  })

  // ── Info blocks ──────────────────────────────────────────────────────────────
  const bY = 48
  const supplier = po.supplier || {}

  // Fournisseur block
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(15, bY, 88, 40, 2, 2, 'F')
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('FOURNISSEUR', 20, bY + 7)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(supplier.name || '—', 20, bY + 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  if (supplier.city) doc.text(supplier.city, 20, bY + 22)
  if (supplier.email) doc.text(supplier.email, 20, bY + 29)

  // Dates block
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(w - 88, bY, 73, 40, 2, 2, 'F')
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('DÉTAILS COMMANDE', w - 83, bY + 7)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(`Statut : ${STATUS_LABELS[po.status] || po.status || '—'}`, w - 83, bY + 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  if (po.orderDate) doc.text(`Date commande : ${new Date(po.orderDate).toLocaleDateString('fr-FR')}`, w - 83, bY + 22)
  if (po.deliveryDate) doc.text(`Livraison prévue : ${new Date(po.deliveryDate).toLocaleDateString('fr-FR')}`, w - 83, bY + 29)
  if (po.project) doc.text(`Projet : ${po.project}`, w - 83, bY + 36)

  // ── Items table ──────────────────────────────────────────────────────────────
  const startY = bY + 48

  autoTable(doc, {
    startY,
    margin: { left: 15, right: 15 },
    head: [['Désignation', 'Qté', 'Unité', 'P.U. (MAD)', 'Total HT (MAD)']],
    body: (po.items || []).map(it => [
      it.description || '—',
      it.quantity || 0,
      it.unit || '—',
      fmt0(it.unitPrice),
      fmt0(it.total || (it.quantity * it.unitPrice)),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [11, 22, 40], textColor: [255,255,255], fontSize: 8, cellPadding: 4 },
    bodyStyles: { fontSize: 8, cellPadding: 3.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right',  cellWidth: 32 },
      4: { halign: 'right',  cellWidth: 32, fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  const finalY = doc.lastAutoTable.finalY + 4

  // ── Total band ───────────────────────────────────────────────────────────────
  doc.setFillColor(11, 22, 40)
  doc.roundedRect(15, finalY, w - 30, 16, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL HT', 24, finalY + 10)
  doc.setFontSize(14)
  doc.setTextColor(96, 165, 250)
  doc.text(`${fmt0(po.total)} MAD`, w - 20, finalY + 10, { align: 'right' })

  // ── Notes ────────────────────────────────────────────────────────────────────
  if (po.notes) {
    const notesY = finalY + 22
    doc.setFillColor(239, 246, 255)
    doc.roundedRect(15, notesY, w - 30, 20, 2, 2, 'F')
    doc.setTextColor(59, 130, 246)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('INSTRUCTIONS DE LIVRAISON', 20, notesY + 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(30, 41, 59)
    const lines = doc.splitTextToSize(po.notes, w - 50)
    doc.text(lines[0] || '', 20, notesY + 14)
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const fy = 275
  doc.setFillColor(248, 250, 252)
  doc.rect(0, fy, w, 22, 'F')
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  const legal = [
    settings.ice     && `ICE : ${settings.ice}`,
    settings.rc      && `RC : ${settings.rc}`,
    settings.patente && `Patente : ${settings.patente}`,
  ].filter(Boolean)
  if (legal.length) doc.text(legal.join('  ·  '), w / 2, fy + 7, { align: 'center' })
  doc.setTextColor(200, 210, 220)
  doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} — ${company}`, w / 2, fy + 15, { align: 'center' })

  doc.save(`bon-commande-${po.number || 'BC'}.pdf`)
}
