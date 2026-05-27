const mongoose = require('mongoose')

const maintenanceEntrySchema = new mongoose.Schema({
  date:               { type: Date, required: true },
  type:               { type: String, enum: ['preventive', 'corrective', 'inspection', 'other'], default: 'preventive' },
  description:        String,
  cost:               { type: Number, default: 0 },
  technician:         String,
  hoursAtService:     Number,   // compteur d'heures au moment de l'entretien
  nextDate:           Date,
}, { timestamps: true })

const equipmentSchema = new mongoose.Schema({
  // Identification
  name:             { type: String, required: true },
  type:             String,
  brand:            String,
  model:            String,
  serialNumber:     String,
  year:             Number,
  // État
  status:           { type: String, enum: ['available', 'in_use', 'maintenance', 'retired'], default: 'available' },
  location:         String,
  // Lien projet actuel
  projectRef:       { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  projectName:      String,    // affichage rapide
  // Compteurs
  hoursCounter:     { type: Number, default: 0 },   // heures de fonctionnement
  kmCounter:        { type: Number, default: 0 },   // kilomètres (véhicules)
  // Financier
  purchaseDate:     Date,
  purchasePrice:    Number,
  rentalCostPerDay: Number,
  // Maintenance
  lastMaintenanceDate: Date,
  nextMaintenanceDate: Date,
  maintenanceHistory:  [maintenanceEntrySchema],
  // Médias
  image:            String,    // image principale
  photos:           [String],  // photos chantier / détails
  // Divers
  notes:            String,
}, { timestamps: true })

module.exports = mongoose.model('Equipment', equipmentSchema)
