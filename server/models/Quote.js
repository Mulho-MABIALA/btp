const mongoose = require('mongoose')

const quoteSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true },
  phone:       String,
  company:     String,
  serviceType: String,
  budget:      String,
  location:    String,
  description: String,
  status:      { type: String, enum: ['new', 'read', 'done', 'converted'], default: 'new' },
}, { timestamps: true })

module.exports = mongoose.model('Quote', quoteSchema)
