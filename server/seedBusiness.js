/**
 * Seed des données business : clients, factures, dépenses, matériaux, tâches
 * node server/seedBusiness.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const mongoose = require('mongoose')
const Client   = require('./models/Client')
const Invoice  = require('./models/Invoice')
const Expense  = require('./models/Expense')
const Material = require('./models/Material')
const Task     = require('./models/Task')

async function run() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('✅ MongoDB connecté')

  // ── Clients ──────────────────────────────────────────────────────────────
  await Client.deleteMany({})
  const clients = await Client.insertMany([
    { name: 'Groupe Horizon SA',       type: 'entreprise',  email: 'contact@horizon.ma',   phone: '+212 522 345 678', city: 'Casablanca', ice: '001823456789012', address: '45 Bd Zerktouni, Casablanca' },
    { name: 'Immobilière Atlas',        type: 'entreprise',  email: 'info@atlas-immo.ma',   phone: '+212 537 123 456', city: 'Rabat',       ice: '002345678901234', address: '12 Av. Hassan II, Rabat' },
    { name: 'Construction Riad SARL',   type: 'entreprise',  email: 'riad@construct.ma',    phone: '+212 524 789 012', city: 'Marrakech',   ice: '003456789012345', address: '8 Rue Taroudant, Marrakech' },
    { name: 'M. Benali Karim',          type: 'particulier', email: 'k.benali@gmail.com',   phone: '+212 661 234 567', city: 'Fès' },
    { name: 'Villa Paradis Invest',     type: 'entreprise',  email: 'vp@paradis-invest.ma', phone: '+212 528 456 789', city: 'Agadir',      ice: '004567890123456', address: '20 Rue du Souss, Agadir' },
  ])
  console.log(`✅ ${clients.length} clients créés`)

  const [cHorizon, cAtlas, cRiad, cBenali, cVilla] = clients.map(c => c._id)

  // ── Factures (étalées sur 6 mois) ────────────────────────────────────────
  await Invoice.deleteMany({})
  const invoices = await Invoice.create([
    { number: 'FAC-2025-001', client: cHorizon, project: 'Tour Horizon – Casablanca',    amount: 380000, tax: 20, status: 'paid',    date: new Date(2025, 11, 15), dueDate: new Date(2026, 0, 15) },
    { number: 'FAC-2025-002', client: cAtlas,   project: 'Résidence Atlas – Rabat',      amount: 150000, tax: 20, status: 'paid',    date: new Date(2025, 11, 28), dueDate: new Date(2026, 0, 28) },
    { number: 'FAC-2026-001', client: cRiad,    project: 'Riad El Badi – Marrakech',     amount: 220000, tax: 20, status: 'paid',    date: new Date(2026, 0, 20),  dueDate: new Date(2026, 1, 20) },
    { number: 'FAC-2026-002', client: cVilla,   project: 'Villa Paradis – Agadir',       amount:  95000, tax: 20, status: 'paid',    date: new Date(2026, 1, 10),  dueDate: new Date(2026, 2, 10) },
    { number: 'FAC-2026-003', client: cHorizon, project: 'Tour Horizon – Phase 2',       amount: 340000, tax: 20, status: 'paid',    date: new Date(2026, 1, 25),  dueDate: new Date(2026, 2, 25) },
    { number: 'FAC-2026-004', client: cBenali,  project: 'Villa Privée – Fès',           amount:  75000, tax: 20, status: 'overdue', date: new Date(2026, 2, 8),   dueDate: new Date(2026, 3, 8)  },
    { number: 'FAC-2026-005', client: cAtlas,   project: 'Résidence Atlas – Ext.',       amount: 280000, tax: 20, status: 'sent',    date: new Date(2026, 3, 15),  dueDate: new Date(2026, 4, 15) },
    { number: 'FAC-2026-006', client: cRiad,    project: 'Riad El Badi – Intérieur',     amount: 160000, tax: 20, status: 'draft',   date: new Date(2026, 4, 5),   dueDate: new Date(2026, 5, 5)  },
  ])
  console.log(`✅ ${invoices.length} factures créées`)

  // ── Dépenses ──────────────────────────────────────────────────────────────
  await Expense.deleteMany({})
  const expenses = await Expense.insertMany([
    { category: 'Matériaux',      description: 'Ciment et ferraille chantier Tour Horizon',    amount:  85000, date: new Date(2025, 11, 10), project: 'Tour Horizon',   supplier: 'Lafarge Holcim MA',  paymentMethod: 'virement' },
    { category: "Main d'œuvre",   description: 'Salaires équipe décembre 2025',                amount: 120000, date: new Date(2025, 11, 20),                            paymentMethod: 'virement' },
    { category: 'Matériaux',      description: 'Carrelage et revêtements Riad El Badi',        amount:  65000, date: new Date(2026, 0, 15),  project: 'Riad El Badi',   supplier: 'Carrelages Atlas',   paymentMethod: 'cheque' },
    { category: 'Équipements',    description: 'Location grue mobile 1 mois',                  amount:  45000, date: new Date(2026, 0, 25),  project: 'Tour Horizon',   supplier: 'Loc-Engin MA',       paymentMethod: 'virement' },
    { category: 'Transport',      description: 'Livraison matériaux Casablanca → Rabat',       amount:  12000, date: new Date(2026, 0, 30),                            supplier: 'Transport Rapid',    paymentMethod: 'cash' },
    { category: "Main d'œuvre",   description: 'Salaires équipe janvier 2026',                 amount:  95000, date: new Date(2026, 1, 15),                            paymentMethod: 'virement' },
    { category: 'Matériaux',      description: 'Peinture et enduits Villa Paradis',             amount:  55000, date: new Date(2026, 1, 28),  project: 'Villa Paradis',  supplier: 'Coloris Peinture',   paymentMethod: 'cheque' },
    { category: 'Sous-traitance', description: 'Électricité et plomberie Riad El Badi',        amount:  80000, date: new Date(2026, 2, 10),  project: 'Riad El Badi',   supplier: 'Élec-Pro SARL',      paymentMethod: 'virement' },
    { category: 'Bureau',         description: 'Loyer bureaux + fournitures mars 2026',        amount:   8500, date: new Date(2026, 2, 20),                            paymentMethod: 'cheque' },
    { category: 'Matériaux',      description: 'Béton prêt à l\'emploi Résidence Atlas',       amount:  75000, date: new Date(2026, 3, 12),  project: 'Résidence Atlas',supplier: 'Béton Express',      paymentMethod: 'virement' },
    { category: "Main d'œuvre",   description: 'Salaires équipe mars-avril 2026',              amount: 110000, date: new Date(2026, 3, 25),                            paymentMethod: 'virement' },
    { category: 'Transport',      description: 'Convoi spécial matériaux lourds',              amount:  18000, date: new Date(2026, 4, 10),                            supplier: 'Convois Maroc',      paymentMethod: 'cash' },
    { category: 'Équipements',    description: 'Achat échafaudages et coffrage',               amount:  35000, date: new Date(2026, 4, 18),                            supplier: 'Échafaudages Pro',   paymentMethod: 'virement' },
  ])
  console.log(`✅ ${expenses.length} dépenses créées`)

  // ── Matériaux / Stock ─────────────────────────────────────────────────────
  await Material.deleteMany({})
  const materials = await Material.insertMany([
    { name: 'Ciment Portland CPA 55',  category: 'Béton',        quantity: 850,   unit: 'sac',   unitPrice:  45,  supplier: 'Lafarge Holcim MA',   location: 'Dépôt central',   minStock: 200 },
    { name: 'Fer à béton HA12',        category: 'Ferraille',    quantity: 3500,  unit: 'kg',    unitPrice:   8.5,supplier: 'Maghreb Steel',        location: 'Dépôt central',   minStock: 1000 },
    { name: 'Carrelage Sol Blanc 60x60',category:'Revêtement',   quantity:  120,  unit: 'm²',    unitPrice: 145,  supplier: 'Carrelages Atlas',     location: 'Chantier Riad',   minStock: 200 },
    { name: 'Peinture Blanche 15L',    category: 'Peinture',     quantity:    8,  unit: 'bidon', unitPrice: 280,  supplier: 'Coloris Peinture',     location: 'Dépôt central',   minStock: 20 },
    { name: 'Bois de charpente 10x10', category: 'Menuiserie',   quantity:  180,  unit: 'm³',    unitPrice: 820,  supplier: 'Menuiserie Atlas',     location: 'Dépôt central',   minStock: 50 },
    { name: 'Câble électrique 2.5mm²', category: 'Électricité',  quantity:  500,  unit: 'm',     unitPrice:  12,  supplier: 'Élec-Pro SARL',        location: 'Dépôt central',   minStock: 100 },
    { name: 'Tuyau PVC 110mm',         category: 'Plomberie',    quantity:   42,  unit: 'pièce', unitPrice:  65,  supplier: 'Plomb-Service',        location: 'Chantier Horizon',minStock: 50 },
    { name: 'Sable fin de concassage', category: 'Béton',        quantity: 12000, unit: 'kg',    unitPrice:   0.5,supplier: 'Carrières du Nord',    location: 'Dépôt central',   minStock: 5000 },
    { name: 'Parpaings 20x20x40',      category: 'Maçonnerie',   quantity:  320,  unit: 'pièce', unitPrice:   6,  supplier: 'Béton Express',        location: 'Dépôt central',   minStock: 500 },
    { name: 'Tuiles en terre cuite',   category: 'Couverture',   quantity:   95,  unit: 'm²',    unitPrice:  85,  supplier: 'Toiture Pro',          location: 'Chantier Riad',   minStock: 150 },
  ])
  console.log(`✅ ${materials.length} matériaux créés`)

  // ── Tâches ────────────────────────────────────────────────────────────────
  await Task.deleteMany({})
  const tasks = await Task.insertMany([
    { title: 'Commander carrelage 60x60',              description: 'Stock critique, commander 300 m² supplémentaires',          project: 'Riad El Badi',    assignee: 'Mohammed Alami',   priority: 'urgent', status: 'todo',        dueDate: new Date(2026, 4, 22) },
    { title: 'Réunion chantier Tour Horizon',           description: 'Réunion hebdomadaire avec les équipes de chantier',        project: 'Tour Horizon',    assignee: 'Youssef Mansouri', priority: 'high',   status: 'todo',        dueDate: new Date(2026, 4, 25) },
    { title: 'Vérification stock peinture',             description: 'Inventaire complet et commande de réapprovisionnement',    project: '',                assignee: 'Sara Bennis',      priority: 'urgent', status: 'todo',        dueDate: new Date(2026, 4, 21) },
    { title: 'Rapport financier T1 2026',               description: 'Synthèse CA, dépenses et bénéfices du premier trimestre', project: '',                assignee: 'Sara Bennis',      priority: 'medium', status: 'in-progress', dueDate: new Date(2026, 4, 30) },
    { title: 'Finaliser plans électriques',             description: 'Validation des schémas électriques avec le bureau d\'études',project: 'Riad El Badi', assignee: 'Karim El Fassi',   priority: 'high',   status: 'in-progress', dueDate: new Date(2026, 4, 28) },
    { title: 'Formation sécurité chantier',             description: 'Session obligatoire pour les nouvelles recrues',           project: '',                assignee: 'Youssef Mansouri', priority: 'medium', status: 'in-progress', dueDate: new Date(2026, 5, 15) },
    { title: 'Contrôle qualité fondations Villa',       description: 'Inspection béton et conformité aux normes parasismiques',  project: 'Villa Paradis',   assignee: 'Mohammed Alami',   priority: 'high',   status: 'review',      dueDate: new Date(2026, 4, 23) },
    { title: 'Validation devis Immobilière Atlas',      description: 'Révision et envoi devis phase extension',                  project: 'Résidence Atlas', assignee: 'Karim El Fassi',   priority: 'medium', status: 'review',      dueDate: new Date(2026, 4, 26) },
    { title: 'Réunion client Groupe Horizon',           description: 'Point d\'avancement et planning phase 3',                  project: 'Tour Horizon',    assignee: 'Youssef Mansouri', priority: 'medium', status: 'done',        dueDate: new Date(2026, 4, 15) },
    { title: 'Mise à jour planning général',            description: 'Révision du planning sur 6 mois',                         project: '',                assignee: 'Sara Bennis',      priority: 'low',    status: 'done',        dueDate: new Date(2026, 4, 10) },
    { title: 'Livraison béton Résidence Atlas',         description: 'Coordonner livraison 50m³ avec fournisseur',               project: 'Résidence Atlas', assignee: 'Mohammed Alami',   priority: 'medium', status: 'todo',        dueDate: new Date(2026, 5, 1)  },
    { title: 'Renouvellement assurance chantier',       description: 'Contacter assureur pour renouvellement annuel',            project: '',                assignee: 'Sara Bennis',      priority: 'high',   status: 'todo',        dueDate: new Date(2026, 4, 31) },
  ])
  console.log(`✅ ${tasks.length} tâches créées`)

  console.log('\n🎉 Seed business terminé !')
  await mongoose.disconnect()
  process.exit(0)
}

run().catch(e => { console.error('❌', e.message); process.exit(1) })
