const mongoose = require('mongoose')

const movementSchema = new mongoose.Schema({
  type:    { type: String, enum: ['Entrée', 'Sortie', 'Consommation', 'Transfert'], default: 'Entrée' },
  qty:     { type: Number, required: true },
  date:    { type: Date,   default: Date.now },
  project: String,
  notes:   String,
  user:    String,
}, { _id: true })

const materialSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  category:  { type: String, default: 'Autre' },
  quantity:  { type: Number, default: 0 },
  unit:      { type: String, default: 'pièce' },
  unitPrice: { type: Number, default: 0 },
  supplier:  String,
  location:  { type: String, default: 'Dépôt central' },
  minStock:  { type: Number, default: 10 },
  notes:     String,
  movements: [movementSchema],
}, { timestamps: true })

module.exports = mongoose.model('Material', materialSchema)
