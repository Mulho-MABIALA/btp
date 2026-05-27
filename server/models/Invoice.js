const mongoose = require('mongoose')
const ObjectId = mongoose.Schema.Types.ObjectId

/* ── Ligne de facturation ─────────────────────────────────────────────────── */
const lineSchema = new mongoose.Schema({
  description: { type: String, required: true },
  qty:         { type: Number, default: 1 },
  unit:        { type: String, default: 'forfait' },
  unitPrice:   { type: Number, required: true, default: 0 },
  total:       { type: Number, default: 0 },
}, { _id: true })

/* ── Paiement partiel ─────────────────────────────────────────────────────── */
const paymentSchema = new mongoose.Schema({
  amount:    { type: Number, required: true },
  date:      { type: Date,   default: Date.now },
  method:    { type: String, enum: ['cash', 'virement', 'cheque', 'carte'], default: 'virement' },
  reference: String,
  notes:     String,
}, { _id: true, timestamps: false })

/* ── Facture ──────────────────────────────────────────────────────────────── */
const invoiceSchema = new mongoose.Schema({
  number:       { type: String, required: true, unique: true },
  invoiceType:  {
    type: String,
    enum: ['Facture', 'Facture de situation', "Facture d'acompte", 'Facture définitive'],
    default: 'Facture',
  },

  // Parties
  client:  { type: ObjectId, ref: 'Client', required: true },
  project: String,
  quoteRef: String,   // référence devis d'origine

  // ── Lignes de facturation ──────────────────────────────────────────────
  lines:       [lineSchema],
  subtotalHT:  { type: Number, default: 0 },   // Σ lignes avant remise

  // ── Remise ────────────────────────────────────────────────────────────
  discount:       { type: Number, default: 0 },   // %
  discountAmount: { type: Number, default: 0 },   // MAD

  // ── Montant HT net (base TVA) ─────────────────────────────────────────
  amount:       { type: Number, required: true },   // HT après remise

  // ── TVA ───────────────────────────────────────────────────────────────
  tax:          { type: Number, default: 20 },
  totalWithTax: { type: Number, default: 0 },      // TTC

  // ── Retenue de garantie ───────────────────────────────────────────────
  retention:       { type: Number, default: 0 },   // %
  retentionAmount: { type: Number, default: 0 },   // MAD
  netToPay:        { type: Number, default: 0 },   // TTC − retenue

  // ── Conditions ────────────────────────────────────────────────────────
  paymentTerms: { type: String, default: '30 jours' },

  // ── Statut & dates ────────────────────────────────────────────────────
  status:    { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'partial'], default: 'draft' },
  date:      { type: Date, default: Date.now },
  dueDate:   Date,
  notes:     String,

  // ── Paiements ─────────────────────────────────────────────────────────
  payments:   [paymentSchema],
  amountPaid: { type: Number, default: 0 },

  // ── Récurrence ────────────────────────────────────────────────────────
  recurring: mongoose.Schema.Types.Mixed,
}, { timestamps: true })

/* ── Pre-save: recalcule tous les montants ────────────────────────────────── */
invoiceSchema.pre('save', function () {
  const r = (n) => Math.round(n * 100) / 100

  // 1. Totaux des lignes
  if (this.lines?.length) {
    this.lines.forEach(l => { l.total = r((l.qty || 1) * (l.unitPrice || 0)) })
    this.subtotalHT = r(this.lines.reduce((s, l) => s + l.total, 0))
  } else {
    this.subtotalHT = this.amount || 0
  }

  // 2. Remise
  this.discountAmount = r(this.subtotalHT * (this.discount || 0) / 100)
  if (this.lines?.length) {
    this.amount = r(this.subtotalHT - this.discountAmount)
  }
  // (si pas de lignes, this.amount est déjà fourni directement)

  // 3. TVA → TTC
  const taxAmt = r(this.amount * (this.tax || 20) / 100)
  this.totalWithTax = r(this.amount + taxAmt)

  // 4. Retenue de garantie
  this.retentionAmount = r(this.totalWithTax * (this.retention || 0) / 100)
  this.netToPay        = r(this.totalWithTax - this.retentionAmount)

  // 5. Suivi paiements
  this.amountPaid = this.payments.reduce((s, p) => s + (p.amount || 0), 0)
  if (this.amountPaid >= this.totalWithTax && this.totalWithTax > 0) this.status = 'paid'
  else if (this.amountPaid > 0)                                       this.status = 'partial'
})

module.exports = mongoose.model('Invoice', invoiceSchema)
