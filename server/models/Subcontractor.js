const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema({
  amount:    { type: Number, required: true },
  date:      { type: Date, default: Date.now },
  reference: String,
  notes:     String,
}, { _id: true })

const subcontractorSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  contact:        String,
  email:          String,
  phone:          String,
  city:           String,
  specialty:      String,
  status:         { type: String, enum: ['Actif', 'Inactif'], default: 'Actif' },
  rating:         { type: Number, min: 1, max: 5, default: 3 },
  ice:            String,
  rc:             String,
  currentProject: String,
  contractAmount: Number,
  paidAmount:     { type: Number, default: 0 },
  paymentTerms:   String,
  notes:          String,
  payments:       [paymentSchema],
}, { timestamps: true })

module.exports = mongoose.model('Subcontractor', subcontractorSchema)
