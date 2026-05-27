const mongoose = require('mongoose')

const supplierSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  contact:      String,
  email:        String,
  phone:        String,
  address:      String,
  city:         String,
  categories:   [String],
  paymentTerms: { type: String, default: '30 jours' },
  rating:       { type: Number, min: 1, max: 5, default: 3 },
  ice:          String,
  notes:        String,
  status:       { type: String, enum: ['Actif', 'Inactif'], default: 'Actif' },
}, { timestamps: true })

module.exports = mongoose.model('Supplier', supplierSchema)
