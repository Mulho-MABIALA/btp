const mongoose = require('mongoose')
const ObjectId = mongoose.Schema.Types.ObjectId

const lineSchema = new mongoose.Schema({
  description: { type: String, required: true },
  qty:         { type: Number, default: 1 },
  unit:        { type: String, default: 'forfait' },
  unitPrice:   { type: Number, default: 0 },
  total:       { type: Number, default: 0 },
}, { _id: true })

const creditNoteSchema = new mongoose.Schema({
  number:         { type: String, unique: true },
  invoice:        { type: ObjectId, ref: 'Invoice' },
  invoiceNumber:  String,   // snapshot du numéro facture (si facture supprimée)
  client:         { type: ObjectId, ref: 'Client', required: true },

  reason:         { type: String, required: true },

  lines:          [lineSchema],
  subtotalHT:     { type: Number, default: 0 },
  discount:       { type: Number, default: 0 },   // %
  discountAmount: { type: Number, default: 0 },
  amount:         { type: Number, required: true },  // HT net
  tax:            { type: Number, default: 20 },
  totalWithTax:   { type: Number, default: 0 },

  date:    { type: Date, default: Date.now },
  status:  { type: String, enum: ['draft', 'issued', 'applied'], default: 'draft' },
  notes:   String,
}, { timestamps: true })

creditNoteSchema.pre('save', function () {
  const r = n => Math.round(n * 100) / 100

  if (this.lines?.length) {
    this.lines.forEach(l => { l.total = r((l.qty || 1) * (l.unitPrice || 0)) })
    this.subtotalHT = r(this.lines.reduce((s, l) => s + l.total, 0))
  } else {
    this.subtotalHT = this.amount || 0
  }

  this.discountAmount = r(this.subtotalHT * (this.discount || 0) / 100)
  if (this.lines?.length) this.amount = r(this.subtotalHT - this.discountAmount)

  this.totalWithTax = r(this.amount * (1 + (this.tax || 20) / 100))
})

module.exports = mongoose.model('CreditNote', creditNoteSchema)
