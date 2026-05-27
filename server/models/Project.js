const mongoose = require('mongoose')

const milestoneSchema = new mongoose.Schema({
  title: String,
  date:  Date,
  done:  { type: Boolean, default: false },
}, { _id: false })

const projectSchema = new mongoose.Schema({
  // Champs existants (site public)
  title:       { type: String, required: true },
  category:    { type: String, required: true },
  location:    String,
  budget:      String,       // affiché sur le site (ex: "12M MAD")
  duration:    String,
  year:        Number,
  image:       String,
  description: String,
  tags:        [String],
  // Nouveaux champs (gestion interne)
  status:       { type: String, enum: ['pending', 'active', 'suspended', 'completed'], default: 'active' },
  progress:     { type: Number, min: 0, max: 100, default: 0 },
  budgetAmount: { type: Number, default: 0 },  // montant numérique
  spent:        { type: Number, default: 0 },
  deliveryDate: Date,
  client:       { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
  clientName:   String,   // conservé pour affichage site public + rétrocompat
  milestones:   [milestoneSchema],
  photos:       [String],   // URLs of progress/site photos
}, { timestamps: true })

module.exports = mongoose.model('Project', projectSchema)
