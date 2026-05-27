require('dotenv').config()
const mongoose    = require('mongoose')
const Project     = require('./models/Project')
const Service     = require('./models/Service')
const TeamMember  = require('./models/TeamMember')
const BlogPost    = require('./models/BlogPost')
const Testimonial = require('./models/Testimonial')

const data = {
  projects: [
    { title: 'Tour Horizon', category: 'Construction', location: 'Casablanca, Maroc', budget: '12M €', duration: '24 mois', year: 2024, image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80', description: "Construction d'une tour de bureaux de 28 étages avec façade vitrée et espaces verts intégrés.", tags: ['R+28', 'Certifié HQE', '45 000 m²'] },
    { title: 'Résidence Les Jardins', category: 'Immobilier', location: 'Rabat, Maroc', budget: '8M €', duration: '18 mois', year: 2024, image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80', description: 'Complexe résidentiel haut de gamme composé de 120 appartements avec piscine et jardins.', tags: ['120 logements', 'Piscine', 'Sécurité 24h'] },
    { title: 'Pont de la Confluence', category: 'Génie Civil', location: 'Lyon, France', budget: '35M €', duration: '36 mois', year: 2023, image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80', description: "Pont de 280m à haubans reliant deux quartiers stratégiques.", tags: ['280m portée', 'Haubans', 'Piétons & vélos'] },
    { title: 'Centre Commercial Axium', category: 'Construction', location: 'Tunis, Tunisie', budget: '22M €', duration: '30 mois', year: 2023, image: 'https://images.unsplash.com/photo-1555529669-2269763671c0?w=800&q=80', description: "Centre commercial avec 150 boutiques et cinéma IMAX.", tags: ['150 boutiques', 'IMAX', '80 000 m²'] },
    { title: 'Hôpital Universitaire Nord', category: 'Travaux Publics', location: 'Alger, Algérie', budget: '45M €', duration: '42 mois', year: 2022, image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&q=80', description: "Hôpital universitaire de 600 lits avec bloc opératoire haute technologie.", tags: ['600 lits', '32 spécialités', 'RT 2020'] },
    { title: 'Autoroute A7 Extension', category: 'Voirie', location: 'Dakar, Sénégal', budget: '67M €', duration: '48 mois', year: 2022, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', description: "Extension de l'autoroute urbaine sur 18 km avec 4 échangeurs.", tags: ['18 km', '4 échangeurs', 'Viaduc 2km'] },
    { title: 'Villa Prestige Anfa', category: 'Rénovation', location: 'Casablanca, Maroc', budget: '2.5M €', duration: '12 mois', year: 2024, image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80', description: "Rénovation d'une villa de 800m² avec piscine chauffée et domotique.", tags: ['800 m²', 'Domotique', 'Piscine chauffée'] },
    { title: 'Parc Industriel Zone Nord', category: 'Génie Civil', location: 'Tanger, Maroc', budget: '18M €', duration: '24 mois', year: 2023, image: 'https://images.unsplash.com/photo-1565636291267-7f1f0a5f5a6e?w=800&q=80', description: "Parc industriel de 50 ha avec réseaux et bâtiments logistiques.", tags: ['50 hectares', '12 unités', 'ISO 14001'] },
  ],
  services: [
    { icon: 'Building2', title: 'Construction de Bâtiments', description: 'Conception et réalisation de bâtiments résidentiels, commerciaux et industriels.', color: 'from-blue-600 to-blue-700', features: ['Maisons individuelles', 'Immeubles résidentiels', 'Bâtiments commerciaux', 'Entrepôts industriels'] },
    { icon: 'Layers', title: 'Génie Civil', description: "Projets d'infrastructure complexes : ponts, tunnels et ouvrages d'art.", color: 'from-slate-600 to-slate-800', features: ['Ponts et viaducs', "Ouvrages d'art", 'Fondations spéciales', 'Structures métalliques'] },
    { icon: 'Hammer', title: 'Rénovation', description: 'Réhabilitation et modernisation de bâtiments existants.', color: 'from-blue-500 to-indigo-600', features: ['Rénovation intérieure', 'Ravalement façade', 'Isolation thermique', 'Mise aux normes'] },
    { icon: 'PenTool', title: 'Architecture', description: "Bureau d'études architectural.", color: 'from-navy-700 to-navy-900', features: ['Conception architecturale', 'Plans et permis', 'Suivi de chantier', "Design d'intérieur"] },
    { icon: 'Construction', title: 'Travaux Publics', description: "Réalisation de projets d'infrastructure publique.", color: 'from-blue-700 to-blue-900', features: ['Routes et autoroutes', 'Aménagements urbains', 'Parkings', 'Espaces verts'] },
    { icon: 'Zap', title: 'Électricité Bâtiment', description: 'Installation électrique complète et domotique.', color: 'from-blue-400 to-blue-600', features: ['Installations électriques', 'Tableaux divisionnaires', 'Éclairage LED', 'Domotique'] },
    { icon: 'Droplets', title: 'Plomberie', description: "Réseaux d'eau potable et sanitaires.", color: 'from-sky-500 to-blue-600', features: ["Réseaux eau potable", 'Assainissement', 'Chauffage central', 'Sanitaires'] },
    { icon: 'GitBranch', title: 'Voirie & Réseaux', description: 'Aménagement de voies et réseaux enterrés.', color: 'from-slate-500 to-slate-700', features: ['Voirie urbaine', 'Réseaux enterrés', 'Drainage pluvial', 'Revêtements bitumineux'] },
    { icon: 'Home', title: 'Immobilier', description: 'Promotion immobilière et gestion de patrimoine.', color: 'from-blue-500 to-navy-700', features: ['Promotion immobilière', 'VEFA', 'Gestion locative', 'Conseil patrimonial'] },
    { icon: 'ClipboardList', title: 'Gestion de Chantier', description: 'Pilotage et contrôle qualité.', color: 'from-indigo-500 to-blue-600', features: ['Planification Gantt', 'Contrôle qualité', "Coordination corps d'état", 'Reporting temps réel'] },
  ],
  team: [
    { name: 'Karim Benali', role: 'PDG & Fondateur', specialty: "Ingénieur Génie Civil — 20 ans d'expérience", image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80', linkedin: '#', twitter: '#', bio: "Visionnaire et leader de CONSTRUCTPRO." },
    { name: 'Sofia El Mansouri', role: 'Directrice Architecte', specialty: 'Architecte DESA — Design durable', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80', linkedin: '#', twitter: '#', bio: "Design audacieux et performance environnementale." },
    { name: 'Mehdi Ouali', role: 'Directeur Technique', specialty: 'Ingénieur structure — Expert BIM', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80', linkedin: '#', twitter: '#', bio: "Supervision technique avec rigueur et précision." },
    { name: 'Nadia Tazi', role: 'Directrice des Projets', specialty: 'MBA Gestion de projets — PMP', image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80', linkedin: '#', twitter: '#', bio: "Maîtrise des délais, budgets et qualités." },
    { name: 'Youssef Berrada', role: 'Chef de Chantier Senior', specialty: 'BTP — 15 ans terrain', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', linkedin: '#', twitter: '#', bio: "Expertise terrain inégalée." },
    { name: 'Leila Chraibi', role: 'Responsable HSE', specialty: 'Sécurité & Environnement', image: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&q=80', linkedin: '#', twitter: '#', bio: "Zéro accident sur tous nos chantiers." },
  ],
  blog: [
    { title: 'Les tendances de la construction durable en 2024', category: 'Innovation', date: '15 Mars 2024', author: 'Sofia El Mansouri', authorRole: 'Directrice Architecte', authorImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&q=80', image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80', excerpt: 'Béton bas carbone et construction modulaire révolutionnent le BTP.', readTime: '5 min', tags: ['Durabilité', 'Innovation', 'Matériaux'] },
    { title: 'BIM : La révolution numérique du chantier', category: 'Technologie', date: '28 Février 2024', author: 'Mehdi Ouali', authorRole: 'Directeur Technique', authorImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', excerpt: "Le BIM transforme la conception et la gestion des bâtiments.", readTime: '7 min', tags: ['BIM', 'Numérique', 'Gestion'] },
    { title: 'Réussir la rénovation énergétique', category: 'Rénovation', date: '10 Janvier 2024', author: 'Karim Benali', authorRole: 'PDG & Fondateur', authorImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&q=80', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80', excerpt: "Guide pour optimiser la performance énergétique.", readTime: '8 min', tags: ['Énergie', 'Rénovation', 'Guide'] },
    { title: 'Sécurité chantiers : nouvelles normes 2024', category: 'Sécurité', date: '5 Décembre 2023', author: 'Leila Chraibi', authorRole: 'Responsable HSE', authorImage: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=100&q=80', image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80', excerpt: "Nouvelles réglementations HSE et protocoles de prévention.", readTime: '6 min', tags: ['HSE', 'Normes', 'Prévention'] },
    { title: 'Financement immobilier : guide complet', category: 'Finance', date: '20 Novembre 2023', author: 'Nadia Tazi', authorRole: 'Directrice des Projets', authorImage: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&q=80', image: 'https://images.unsplash.com/photo-1460472178825-e5240623afd5?w=800&q=80', excerpt: "Options de financement pour votre projet.", readTime: '9 min', tags: ['Finance', 'Immobilier', 'Investissement'] },
    { title: "Architecture bioclimatique : construire avec le soleil", category: 'Architecture', date: '8 Octobre 2023', author: 'Sofia El Mansouri', authorRole: 'Directrice Architecte', authorImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&q=80', image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80', excerpt: "Réduire la consommation énergétique jusqu'à 70%.", readTime: '6 min', tags: ['Architecture', 'Bioclimatique', 'Énergie'] },
  ],
  testimonials: [
    { name: 'Hassan Benkirane', role: 'PDG, Groupe Mabrouk', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80', rating: 5, text: "Livraison 2 semaines avant le délai. Professionnalisme exceptionnel.", project: 'Tour Horizon — Casablanca' },
    { name: 'Marie-Claire Dupont', role: 'DG, Hôtel Le Méridien', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80', rating: 5, text: "Rénovation sans interruption d'activité. Exploit remarquable.", project: 'Hôtel 5 étoiles — Marrakech' },
    { name: 'Abdelkader Moussaoui', role: 'Ministre Travaux Publics', image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&q=80', rating: 5, text: "Livraison dans les délais malgré les difficultés. Qualité au-delà des attentes.", project: 'Extension Autoroute A7' },
    { name: 'Fatima Zahra Alaoui', role: 'Promoteur Immobilier', image: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200&q=80', rating: 5, text: "Des experts qui comprennent réellement vos exigences.", project: 'Résidence Les Jardins — Rabat' },
    { name: 'Jean-Pierre Fontaine', role: 'CEO, Fontaine Logistics', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80', rating: 5, text: "Qualité impeccable et délais respectés. Partenaire de confiance.", project: 'Parc Logistique Zone Nord' },
  ],
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('✅ Connecté à MongoDB Atlas')

  await Promise.all([
    Project.deleteMany({}),
    Service.deleteMany({}),
    TeamMember.deleteMany({}),
    BlogPost.deleteMany({}),
    Testimonial.deleteMany({}),
  ])

  await Project.insertMany(data.projects)
  await Service.insertMany(data.services)
  await TeamMember.insertMany(data.team)
  await BlogPost.insertMany(data.blog)
  await Testimonial.insertMany(data.testimonials)

  console.log('✅ Données importées dans MongoDB Atlas !')
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
