const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const adminSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name:     { type: String, default: 'Administrateur' },
  role:     { type: String, enum: ['superadmin', 'directeur', 'comptable', 'chef_chantier'], default: 'directeur' },
}, { timestamps: true })

// Hash le mot de passe avant sauvegarde
adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

// Comparaison mot de passe
adminSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password)
}

module.exports = mongoose.model('Admin', adminSchema)
