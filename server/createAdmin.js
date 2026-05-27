/**
 * Script à exécuter UNE SEULE FOIS pour créer le compte admin :
 *   node server/createAdmin.js
 *
 * Vous pouvez modifier l'email et le mot de passe ci-dessous avant de lancer.
 */
require('dotenv').config()
const mongoose = require('mongoose')
const Admin    = require('./models/Admin')

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@constructpro.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connecté à MongoDB')

    // Supprimer l'ancien admin s'il existe
    await Admin.deleteMany({})

    const admin = await Admin.create({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    console.log(`✅ Admin créé avec succès !`)
    console.log(`   Email    : ${admin.email}`)
    console.log(`   Mot de passe : ${ADMIN_PASSWORD}`)
    console.log(`   ID       : ${admin._id}`)
  } catch (e) {
    console.error('❌ Erreur :', e.message)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

run()
