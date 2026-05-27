const mongoose = require('mongoose')

const teamSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  role:      String,
  specialty: String,
  image:     String,
  linkedin:  String,
  twitter:   String,
  bio:       String,
}, { timestamps: true })

module.exports = mongoose.model('TeamMember', teamSchema)
