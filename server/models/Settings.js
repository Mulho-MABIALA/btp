const mongoose = require('mongoose')

const settingsSchema = new mongoose.Schema({
  companyName:  { type: String, default: 'CONSTRUCTPRO' },
  tagline:      String,
  logo:         String,
  address:      String,
  city:         String,
  country:      { type: String, default: 'Maroc' },
  phone:        String,
  email:        String,
  website:      String,
  ice:          String,
  rc:           String,
  patente:      String,
  capital:      String,
  tvaNumber:    String,
  bankName:     String,
  iban:         String,
  currency:     { type: String, default: 'FCFA' },
  invoiceNotes: String,
  // SMTP pour envoi email
  smtpHost:     String,
  smtpPort:     { type: Number, default: 587 },
  smtpUser:     String,
  smtpPass:     String,
  smtpFrom:     String,
  // Objectifs mensuels
  monthlyRevenueTarget: { type: Number, default: 0 },
  // Seuils d'alertes automatiques (en jours / heures)
  alertThresholds: {
    invoiceDays:       { type: Number, default: 7  },  // factures : prévenir X jours avant
    taskDays:          { type: Number, default: 3  },  // tâches : prévenir X jours avant
    purchaseOrderDays: { type: Number, default: 5  },  // bons de commande : X jours avant livraison
    equipmentDays:     { type: Number, default: 7  },  // équipements : X jours avant maintenance
    leavePendingHours: { type: Number, default: 48 },  // congés en attente depuis X heures
  },
}, { timestamps: true })

module.exports = mongoose.model('Settings', settingsSchema)
