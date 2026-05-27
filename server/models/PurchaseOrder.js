const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema({
  description: String,
  quantity:    { type: Number, default: 1 },
  unit:        String,
  unitPrice:   { type: Number, default: 0 },
  total:       { type: Number, default: 0 },
}, { _id: false })

const purchaseOrderSchema = new mongoose.Schema({
  number:       { type: String, required: true, unique: true },
  supplier:     { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  project:      String,
  items:        [itemSchema],
  total:        { type: Number, default: 0 },
  status:       { type: String, enum: ['draft', 'sent', 'received', 'cancelled'], default: 'draft' },
  orderDate:    { type: Date, default: Date.now },
  deliveryDate: Date,
  notes:        String,
}, { timestamps: true })

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema)
