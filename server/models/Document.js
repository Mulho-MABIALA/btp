const mongoose = require('mongoose')

const documentSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  type:         {
    type: String,
    enum: [
      // Documents projet / chantier
      'Contrat', 'Plan', 'Permis', 'PV réception', 'Facture fournisseur', 'Photo',
      // Documents employé
      'Contrat de travail', 'CIN / Passeport', 'Diplôme / Formation',
      'Attestation CNSS', 'Attestation de travail', 'Certificat médical',
      // Générique
      'Attestation', 'Autre',
    ],
    default: 'Autre',
  },
  // Liens
  project:     String,
  employeeRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  // Fichier
  url:          String,
  filename:     String,
  originalName: String,
  mimetype:     String,
  size:         Number,
  // Expiration
  expiryDate:   { type: Date, default: null },
  // Méta
  tags:         [String],
  notes:        String,
  uploadedBy:   String,
}, { timestamps: true })

module.exports = mongoose.model('Document', documentSchema)
