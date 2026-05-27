# CONSTRUCTPRO — Documentation Complète du Projet
> Plateforme de gestion BTP full-stack (React + Node.js + MongoDB)
> Document destiné au montage vidéo de présentation

---

## TABLE DES MATIÈRES

1. [Vue d'ensemble du projet](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [CÔTÉ CLIENT — Site vitrine public](#3-côté-client--site-vitrine-public)
   - 3.1 Page d'accueil (Home)
   - 3.2 Services
   - 3.3 Projets (Portfolio)
   - 3.4 Équipe
   - 3.5 Blog
   - 3.6 Témoignages
   - 3.7 Contact
   - 3.8 Demande de devis
   - 3.9 Espace Employé
   - 3.10 Kiosque de pointage
4. [CÔTÉ ADMIN — Panneau de gestion](#4-côté-admin--panneau-de-gestion)
   - 4.01 Connexion Admin
   - 4.02 Tableau de bord (Dashboard)
   - 4.03 Projets
   - 4.04 Ressources Humaines (RH)
   - 4.05 Finance — Factures & Dépenses
   - 4.06 Clients
   - 4.07 Fournisseurs
   - 4.08 Bons de commande
   - 4.09 Avoirs (Notes de crédit)
   - 4.10 Budget chantiers
   - 4.11 TVA
   - 4.12 Paie (Payroll)
   - 4.13 Présences (Pointage)
   - 4.14 Congés
   - 4.15 Plannings horaires
   - 4.16 Historique kiosque
   - 4.17 Tâches
   - 4.18 Ordres de travail
   - 4.19 Équipements & Engins
   - 4.20 Inventaire / Matériaux
   - 4.21 Sous-traitants
   - 4.22 HSE — Hygiène Sécurité Environnement
   - 4.23 Documents RH
   - 4.24 Rapports de chantier
   - 4.25 Rappels & Échéances
   - 4.26 Journal d'activité
   - 4.27 Calendrier
   - 4.28 Rapports & Analyses
   - 4.29 Gestion des utilisateurs admin
   - 4.30 Paramètres de l'entreprise
   - 4.31 Contenu du site (Blog, Services, Équipe, Témoignages)
   - 4.32 Contacts entrants & Devis reçus
5. [Fonctionnalités transversales](#5-fonctionnalités-transversales)
6. [Script de tournage vidéo](#6-script-de-tournage-vidéo)

---

## 1. VUE D'ENSEMBLE

**CONSTRUCTPRO** est une application web complète conçue pour une entreprise du secteur BTP (Bâtiment et Travaux Publics). Elle regroupe deux espaces distincts :

| Espace | Public cible | Accès |
|--------|-------------|-------|
| **Site vitrine** | Clients potentiels, grand public | Libre |
| **Espace employé** | Salariés de l'entreprise | Recherche par nom ou QR code |
| **Kiosque de pointage** | Salariés sur site (tablette/écran) | Scan QR code |
| **Panneau d'administration** | Direction, RH, Comptabilité | Login JWT sécurisé |

**Chiffres du projet :**
- 38 pages admin
- 12 pages côté client
- 25+ routes API REST
- 30+ modèles de données MongoDB
- 100% responsive (mobile, tablette, desktop)
- Mode sombre/clair (dark mode)

---

## 2. ARCHITECTURE TECHNIQUE

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Netlify)                        │
│  React 18 + Vite 5 + Tailwind CSS v3 + Framer Motion        │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │  Site public     │  │  Admin Panel                      │ │
│  │  /               │  │  /admin/*                         │ │
│  └──────────────────┘  └──────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS + JWT
┌────────────────────────▼────────────────────────────────────┐
│                    BACKEND (Render)                          │
│  Node.js + Express.js                                        │
│  25+ routes REST (/api/*)                                    │
│  Authentification JWT (bcryptjs)                             │
│  Upload fichiers (Multer)                                    │
└────────────────────────┬────────────────────────────────────┘
                         │ Mongoose ODM
┌────────────────────────▼────────────────────────────────────┐
│                 MongoDB Atlas (Cloud)                         │
│  30+ collections : employees, invoices, projects,            │
│  clients, attendance, leaves, payroll, equipment…            │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. CÔTÉ CLIENT — SITE VITRINE PUBLIC

### 3.1 Page d'accueil (`/`)

**Description :** Page principale du site vitrine. C'est la première impression de l'entreprise.

**Sections visibles :**
- **Hero Slider** : Diaporama automatique de 4 slides avec photos plein écran de chantiers, animations de texte en cascade, statistiques flottantes (350+ projets, 20 ans, 280+ experts, 98% satisfaction). Contrôles précédent/suivant et pagination par points.
- **Bande de confiance** : Logos ou badges de partenaires/certifications défilant en continu.
- **Services en vedette** : 6 cartes de services avec icône colorée, titre et description courte. Hover animé.
- **À propos rapide** : Bloc texte avec chiffres animés (compteurs qui s'incrémentent au scroll), liste de points forts, photo illustrative.
- **Projets récents** : Grille de 3 projets phares avec photo, catégorie, titre et lien vers le portfolio.
- **Processus de travail** : Timeline visuelle en 4 étapes (Consultation → Conception → Réalisation → Livraison).
- **Témoignages clients** : Carrousel de témoignages avec photo, note étoiles, citation.
- **Blog / Actualités** : 3 derniers articles avec vignette, catégorie, date et extrait.
- **Bandeau CTA** : Appel à l'action avec bouton "Demander un devis" et "Nous contacter".

**Interactions notables :**
- Animations au scroll via `react-intersection-observer`
- Compteurs animés via `react-countup`
- Slider via `Swiper.js` avec effet fade

---

### 3.2 Services (`/services`)

**Description :** Catalogue complet des prestations de l'entreprise.

**Contenu :**
- En-tête avec titre animé et sous-titre
- Grille de cartes services avec : icône SVG colorée, nom du service, description détaillée, liste des prestations incluses
- Services disponibles : Construction résidentielle, Génie civil, Architecture & Design, Rénovation, Électricité & Plomberie, Gestion de chantier, etc.
- Chaque carte a un hover avec élévation et couleur d'accentuation

---

### 3.3 Projets — Portfolio (`/projects`)

**Description :** Portfolio complet des réalisations de l'entreprise.

**Fonctionnalités :**
- **Filtres par catégorie** : Boutons de filtrage (Tous, Résidentiel, Commercial, Industriel, Infrastructure…) — animation fluide au changement
- **Grille de projets** : Cartes avec photo principale, badge de catégorie, titre, localisation, année
- **Chargement depuis l'API** : Les projets sont récupérés depuis la base de données (gérés par l'admin)
- **Responsive** : 1 colonne mobile → 2 tablette → 3 desktop

---

### 3.4 Équipe (`/team`)

**Description :** Présentation de l'équipe dirigeante et des experts.

**Contenu :**
- Cartes membre avec photo, nom, poste, département
- Liens réseaux sociaux (LinkedIn, email)
- Données dynamiques depuis la base de données

---

### 3.5 Blog (`/blog`)

**Description :** Section actualités et articles de fond sur le secteur BTP.

**Fonctionnalités :**
- Liste d'articles avec vignette, catégorie, auteur, date et extrait
- Filtrage par catégorie
- Données gérées depuis le panneau admin

---

### 3.6 Témoignages (`/testimonials`)

**Description :** Page dédiée aux avis et témoignages clients.

**Contenu :**
- Grille de témoignages avec photo, nom, entreprise, note (étoiles), commentaire
- Données gérées depuis l'admin

---

### 3.7 Contact (`/contact`)

**Description :** Page de prise de contact.

**Fonctionnalités :**
- **Formulaire** : Nom, email, téléphone, sujet, message
- **Validation** : Champs obligatoires, format email
- **Envoi API** : Soumis à `/api/contact`, visible dans l'admin sous "Messages"
- **Informations de contact** : Adresse, téléphone, email, horaires
- **Carte / Map** : Intégration carte pour localisation du siège

---

### 3.8 Demande de devis (`/quote`)

**Description :** Formulaire de demande de devis en ligne.

**Fonctionnalités :**
- **Formulaire enrichi** : Nom, email, téléphone, type de projet, description, budget estimé, délai souhaité, localisation
- **Envoi API** : Soumis à `/api/quotes`, visible dans l'admin sous "Devis reçus"
- Confirmation visuelle après envoi

---

### 3.9 Espace Employé (`/employee`)

**Description :** Portail libre-service pour les employés de l'entreprise. Permet à chaque salarié de consulter ses informations sans passer par l'admin.

**Fonctionnalités :**
- **Recherche** : Par nom ou prénom — liste déroulante des employés correspondants
- **Identification par QR code** : Scan de la caméra pour s'identifier instantanément
- **Tableau de bord personnel :**
  - Carte identité (nom, poste, département, ancienneté)
  - Statut du jour (Présent / Absent / En congé / Retard)
  - Heures pointées ce mois
  - Solde de congés restants
- **Onglets disponibles :**
  - **Présences** : Historique des pointages (entrée, sortie, heures travaillées, statut)
  - **Planning** : Horaires de travail programmés par semaine
  - **Congés** : Demandes passées et statut (En attente / Approuvé / Refusé)
  - **Bulletins de paie** : Liste des fiches de paie mensuelles (montant net, statut)

**Couleurs par département :** Chaque département a son propre dégradé de couleur (Chantier = bleu, RH = rose, Direction = ardoise, etc.)

---

### 3.10 Kiosque de Pointage (`/kiosk`)

**Description :** Application de pointage conçue pour être affichée sur une tablette ou un grand écran à l'entrée du chantier ou des bureaux.

**Fonctionnalités :**
- **Horloge en direct** : Affichage heure/date en temps réel, grand format
- **Scan QR code** : Activation de la caméra, détection automatique du QR code employé
- **Résultat instantané :**
  - Carte employé avec photo, nom, poste, département (couleur du dégradé)
  - Heure de pointage enregistrée
  - Type d'action : Arrivée ✅ ou Départ 🚪
  - Message de bienvenue ou au revoir
- **Mode automatique** : Retour à l'écran d'accueil après 5 secondes
- **États gérés :** Inactif → Scan en cours → Chargement → Succès / Erreur

---

## 4. CÔTÉ ADMIN — PANNEAU DE GESTION

> Accès : `/admin/login`
> Credentials : `admin@constructpro.com` / `admin123`

### 4.01 Connexion Admin (`/admin/login`)

**Description :** Page de connexion sécurisée avec JWT.

**Fonctionnalités :**
- Formulaire email + mot de passe
- Token JWT stocké en localStorage
- Redirection automatique si déjà connecté
- Gestion des erreurs (mauvais identifiants)
- Design : fond dégradé sombre avec logo centré

---

### 4.02 Tableau de Bord (`/admin`) — DASHBOARD

**Description :** Page d'accueil de l'admin. Vue synthétique de toute l'activité de l'entreprise. C'est la page la plus riche du projet.

**KPIs en haut de page (4 cartes) :**
- Chiffre d'affaires du mois (avec évolution % vs mois précédent)
- Projets actifs (avec progression visuelle)
- Tâches en cours
- Alertes diverses (impayés, stock bas, maintenance due)

**Système de widgets personnalisables (22 widgets) :**
L'administrateur peut activer/désactiver chaque widget et les réorganiser par glisser-déposer (drag & drop).

| Widget | Contenu |
|--------|---------|
| Projets actifs | Barre de progression par projet |
| Dernières factures | Tableau des 5 dernières factures avec statut |
| Tâches prioritaires | Tâches urgentes à traiter |
| Top clients CA | Classement clients par chiffre d'affaires |
| Vieillissement créances | Impayés par tranche 0-30 / 30-60 / 60-90 / 90+ jours |
| Flux de trésorerie | Créances vs dettes fournisseurs |
| Budget chantiers | Consommation budgétaire par projet (barre) |
| Rapports de chantier | Derniers rapports journaliers |
| RH du jour | Présents / Absents / En congé aujourd'hui |
| Heures semaine | Total heures pointées cette semaine |
| Rappels & Échéances | Rappels urgents dans les 7 prochains jours |
| Maintenance équipements | Engins dont la maintenance est due |
| HSE / Sécurité | Incidents ouverts et alertes critiques |
| Paiements fournisseurs | Échéances à 30 jours |
| Soldes sous-traitants | Montants restants à payer par sous-traitant |
| Bons de commande | Commandes fournisseurs en attente |
| Activité récente | Journal des 5 dernières actions |
| Alertes stock | Matériaux sous le seuil minimum |
| Revenus & Dépenses | Graphique en aires des 6 derniers mois |
| Statut des tâches | Donut chart par statut (À faire / En cours / Fait) |
| Derniers messages | Contacts entrants non lus |
| Derniers devis | Devis reçus récemment |

**Graphiques :**
- Graphique en aires (Recharts) — revenus vs dépenses sur 6 mois
- Diagramme en donut (PieChart) — répartition des statuts de tâches

**Filtres période :** Semaine / Mois / Trimestre / Année

---

### 4.03 Projets (`/admin/projects`)

**Description :** Gestion du portfolio de projets de l'entreprise.

**Liste des projets :**
- Cartes avec photo de couverture, nom, catégorie, statut, client associé, budget
- Filtres par statut (En cours / Terminé / En attente / Annulé)
- Recherche par nom

**Formulaire de création/édition :**
- Nom du projet, description, catégorie, statut
- Client associé (sélecteur)
- Dates (début, fin prévue)
- Budget alloué, coût actuel
- Avancement (%) — curseur
- Localisation, chef de projet
- Upload photo de couverture
- Galerie photos (upload multiple + suppression individuelle)

**Page détail projet** (`/admin/projects/:id`) :
- Toutes les infos du projet
- Tâches associées
- Rapports de chantier liés
- Équipe affectée

---

### 4.04 Ressources Humaines — RH (`/admin/hr`)

**Description :** Module complet de gestion des employés. Page la plus riche côté RH.

**Liste des employés :**
- Cartes avec photo, nom, poste, département, statut (Actif/Inactif)
- Codes couleurs par département
- Filtres par département, statut
- Recherche par nom

**Formulaire employé :**
- Informations personnelles : Nom, prénom, CIN, date de naissance, adresse, téléphone, email
- Informations professionnelles : Poste, département, date d'embauche, type de contrat (CDI/CDD/Intérim/Freelance)
- Rémunération : Salaire de base, primes, avances sur salaire
- Upload photo de profil

**Fiche employé détaillée** (`/admin/employees/:id`) — vue complète avec onglets :
- **Profil** : Toutes les données personnelles et professionnelles + ancienneté calculée
- **QR Code** : QR code personnel pour le pointage au kiosque (téléchargeable)
- **Présences** : Tableau de l'historique des pointages du mois
- **Congés** : Solde et historique des demandes de congé
- **Paie** : Bulletins de paie archivés
- **Tâches** : Tâches assignées à cet employé
- **Documents** : Documents RH (contrat, diplômes, certificats)
- **Formations** : Historique des formations et habilitations avec dates d'expiration
- **Avances** : Gestion des avances sur salaire avec statut (Accordé/Refusé/En attente)

---

### 4.05 Finance — Factures & Dépenses (`/admin/finance`)

**Description :** Module financier central. Gestion des factures clients et des dépenses.

**Onglet Factures :**
- **KPIs** : Total facturé / Encaissé / En attente / En retard (avec montants)
- **Tableau** : Numéro, client, date, échéance, montant HT, TVA, TTC, statut
- **Statuts** : Brouillon / Envoyée / Payée / En retard / Paiement partiel
- **Filtres** : Par statut, par période, par client, recherche texte
- **Export CSV** : Téléchargement de la liste filtrée

**Création/édition de facture :**
- Sélection du client (chargé depuis la base)
- Type : Facture standard / Situation / Acompte / Définitive
- Numéro auto-généré (ex: FAC-2026-0042)
- Date de facture et date d'échéance
- Conditions de paiement (Comptant / 15j / 30j / 45j / 60j / 90j)
- **Lignes de facturation** : Description, quantité, unité, prix unitaire HT → total HT auto-calculé
- Taux de TVA (applicable depuis les paramètres)
- Total HT / TVA / TTC calculés automatiquement
- Notes et conditions générales
- **Génération PDF** : Bouton "Télécharger PDF" — génère un PDF formaté avec logo, coordonnées, tableau des lignes, totaux, mentions légales
- **Envoi par email** : Modal pour envoyer la facture au client par email (NodeMailer)
- **Enregistrement de paiement** : Ajouter des paiements partiels ou complets avec mode (Espèces/Virement/Chèque/Carte) et date
- **Relance en masse** : Bouton pour envoyer des rappels email à tous les clients en retard

**Onglet Dépenses :**
- Tableau des dépenses avec catégorie, description, montant, date, projet lié
- Catégories : Matériaux / Main d'œuvre / Équipements / Transport / Sous-traitance / Bureau / Autre
- Graphique en barres par catégorie
- Formulaire d'ajout rapide

---

### 4.06 Clients (`/admin/clients`)

**Description :** CRM simplifié pour la gestion des clients de l'entreprise.

**Liste clients :**
- Tableau avec nom, type (Particulier/Entreprise/Promoteur), téléphone, email, ville, CA total
- Recherche et filtres

**Formulaire client :**
- Raison sociale / nom, type, numéro de client
- Coordonnées : adresse complète, téléphone, email, site web
- Contact référent (pour les entreprises)
- Notes internes

**Fiche client détaillée** (`/admin/clients/:id`) :
- Toutes les infos du client
- Liste de toutes ses factures avec statuts
- Historique des projets
- Total CA généré
- Bouton envoi email direct depuis la fiche

---

### 4.07 Fournisseurs (`/admin/suppliers`)

**Description :** Répertoire des fournisseurs de l'entreprise.

**Fonctionnalités :**
- Tableau : Nom, catégorie, contact, téléphone, email, ville
- Catégories : Matériaux / Équipements / Services / Sous-traitants / Autre
- Formulaire création/édition avec IBAN, conditions de paiement habituelles
- Notes internes par fournisseur

---

### 4.08 Bons de Commande (`/admin/purchase-orders`)

**Description :** Gestion des commandes passées aux fournisseurs.

**Tableau des BdC :**
- Numéro (BC-2026-XXXX), fournisseur, date, montant, statut
- **Statuts** : Brouillon / Envoyé / Confirmé / Reçu partiellement / Reçu / Annulé
- Filtres par statut et fournisseur

**Formulaire BdC :**
- Sélection du fournisseur, projet lié
- Lignes de commande : article, quantité, unité, prix unitaire
- Total HT/TVA/TTC calculé
- Conditions de livraison et de paiement
- **Envoi par email** au fournisseur
- **Génération PDF**
- Changement de statut en un clic

---

### 4.09 Avoirs — Notes de Crédit (`/admin/credit-notes`)

**Description :** Gestion des avoirs (annulations partielles ou totales de factures).

**Fonctionnalités :**
- Liste des avoirs avec numéro (AV-2026-XXXX), facture liée, client, montant, statut
- Statuts : Brouillon / Envoyé / Appliqué
- Création d'avoir avec lignes détaillées (identique aux factures)
- Génération PDF et envoi email
- Lien automatique avec la facture d'origine

---

### 4.10 Budget Chantiers (`/admin/budget`)

**Description :** Suivi budgétaire par projet.

**Vue globale :**
- Tableau de tous les projets avec : budget alloué, dépenses réelles, écart, % consommé
- Barre de progression colorée (vert → orange → rouge selon dépassement)
- KPIs globaux : Budget total, Dépensé total, Solde disponible

**Vue détaillée par projet :**
- Répartition du budget par catégorie de dépense
- Graphique en barres Prévu vs Réel
- Historique des dépenses imputées au projet
- Alertes de dépassement budgétaire

---

### 4.11 TVA (`/admin/tva`)

**Description :** Récapitulatif de la TVA collectée et déductible.

**Fonctionnalités :**
- Sélection de l'année fiscale
- Tableau mensuel : TVA collectée (sur factures) / TVA déductible (sur achats) / TVA nette à payer
- Totaux annuels
- Graphique d'évolution mensuelle

---

### 4.12 Paie — Payroll (`/admin/payroll`)

**Description :** Génération et gestion des fiches de paie mensuelles.

**Fonctionnalités :**
- **Génération automatique** : Bouton "Générer la paie de [mois]" → crée les bulletins pour tous les employés actifs
- Tableau : Employé, mois, salaire base, primes, avances déduites, cotisations, **net à payer**, statut
- **Statuts** : En attente / Validé / Payé
- Changement de statut en masse ou individuel
- **Envoi bulletin par email** à chaque employé
- Filtres par mois et statut
- Export CSV

---

### 4.13 Présences — Pointage (`/admin/attendance`)

**Description :** Module de gestion des présences des employés.

**Fonctionnalités :**
- **Vue journalière** : Tableau de tous les employés avec statut du jour (Présent / Absent / Retard / Mi-temps / Congé), heure d'arrivée, heure de départ, heures travaillées
- **Filtres** : Par date, par département, par statut
- **Saisie manuelle** : L'admin peut saisir ou corriger un pointage
- **Employés manquants** : Onglet dédié aux absents non justifiés du jour
- Résumé : Nombre de présents, absents, retards, en congé

---

### 4.14 Congés (`/admin/leaves`)

**Description :** Gestion des demandes de congé.

**KPIs (3 cartes) :**
- Demandes en attente
- Congés approuvés ce mois
- Employés absents aujourd'hui

**Tableau des demandes :**
- Employé, type de congé (Annuel / Maladie / Maternité / Sans solde / Autre), dates, durée, statut
- **Statuts** : En attente / Approuvé / Refusé
- **Actions** : Approuver ✅ / Refuser ❌ en un clic

**Soldes de congé** : Consultation du solde de jours restants par employé et par année

---

### 4.15 Plannings Horaires (`/admin/work-schedules`)

**Description :** Programmation des horaires de travail par employé.

**Fonctionnalités :**
- Vue semaine : Grille employés × jours avec créneaux horaires
- Saisie des horaires : Heure début, heure fin, pause (en minutes), jour(s)
- **Copier la semaine** : Dupliquer un planning d'une semaine sur une autre
- Navigation semaine par semaine
- Filtres par département

---

### 4.16 Historique Kiosque (`/admin/kiosk-history`)

**Description :** Journal de tous les pointages effectués via le kiosque QR code.

**Fonctionnalités :**
- Tableau : Employé, action (Arrivée/Départ), heure, date, département
- Filtres par date et par employé
- Résumé du jour : Total pointages, arrivées, départs

---

### 4.17 Tâches (`/admin/tasks`)

**Description :** Gestion des tâches de travail.

**Vue Kanban / Liste :**
- Colonnes : À faire / En cours / En révision / Terminé
- Drag & Drop entre colonnes
- Cartes tâches avec : titre, priorité (Urgente/Haute/Normale/Basse), assigné, échéance, projet lié

**Formulaire tâche :**
- Titre, description
- Priorité et statut
- Assignation à un ou plusieurs employés
- Projet lié
- Date d'échéance
- Pièces jointes

---

### 4.18 Ordres de Travail (`/admin/work-orders`)

**Description :** Gestion des ordres de travail de maintenance et d'intervention.

**Fonctionnalités :**
- Tableau : Numéro, titre, type, priorité, assigné, statut, date d'échéance
- **Types** : Maintenance préventive / Corrective / Installation / Inspection
- **Statuts** : Ouvert / En cours / Terminé / Annulé
- Formulaire avec description détaillée, équipement concerné, technicien assigné

---

### 4.19 Équipements & Engins (`/admin/equipment`)

**Description :** Gestion du parc matériel et des engins de chantier.

**Fonctionnalités :**
- Cartes équipements avec photo, nom, type, numéro de série, statut
- **Statuts** : Disponible / En service / En maintenance / Hors service
- **Fiche équipement :**
  - Infos générales : Marque, modèle, année, immatriculation
  - Compteurs : Heures de fonctionnement, kilométrage
  - Valeur d'achat, date de mise en service
  - Galerie photos
  - **Historique maintenance** : Date, type, description, coût, technicien, prochain entretien
  - Alertes maintenance due (visibles depuis le dashboard)

---

### 4.20 Inventaire / Matériaux (`/admin/inventory`)

**Description :** Gestion du stock de matériaux et consommables.

**Fonctionnalités :**
- Tableau : Référence, désignation, catégorie, unité, stock actuel, stock minimum, prix unitaire, valeur totale
- **Alertes stock bas** : Ligne rouge quand stock < seuil minimum
- **Mouvements de stock** : Entrée (réception) / Sortie (utilisation chantier) avec projet lié et date
- Filtres par catégorie

---

### 4.21 Sous-traitants (`/admin/subcontractors`)

**Description :** Gestion des entreprises sous-traitantes.

**Fonctionnalités :**
- Tableau : Nom, spécialité, SIRET, contact, téléphone, montant contractuel, montant payé, solde restant
- **Suivi des paiements** : Ajout de paiements partiels avec date et mode
- Statut de paiement : En cours / Soldé / En retard
- Notes par sous-traitant

---

### 4.22 HSE — Hygiène, Sécurité, Environnement (`/admin/hse`)

**Description :** Module de suivi des incidents, accidents et situations dangereuses sur les chantiers.

**Liste des événements :**
- Titre, type, gravité, chantier, date, statut (Ouvert / Fermé)
- **Types** : Accident du travail / Incident / Presqu'accident / Observation sécurité / Non-conformité
- **Gravités** : Critique / Élevée / Moyenne / Faible

**Fiche HSE détaillée :**
- Description complète de l'événement
- Personnes impliquées
- Mesures correctives prises
- Photos de l'incident (upload multiple)
- Date de clôture et actions de suivi
- Archivage des événements résolus

---

### 4.23 Documents RH (`/admin/documents`)

**Description :** Bibliothèque centralisée des documents des employés.

**Fonctionnalités :**
- Tableau/Cartes : Nom du document, type, employé concerné, date d'upload, date d'expiration
- **Types** : Contrat / Diplôme / Certification / Pièce d'identité / Visite médicale / Autre
- Alertes documents expirés ou proches de l'expiration
- Upload de fichiers (PDF, images)
- Filtres par employé, type, statut d'expiration
- Téléchargement direct

---

### 4.24 Rapports de Chantier (`/admin/site-reports`)

**Description :** Journal quotidien des rapports d'avancement sur les chantiers.

**Fonctionnalités :**
- Liste des rapports : Date, chantier, auteur, météo, nb de travailleurs
- **Contenu du rapport** :
  - Activités réalisées dans la journée
  - Main d'œuvre présente (nombre)
  - Météo (Ensoleillé / Nuageux / Pluie / Tempête)
  - Matériaux utilisés
  - Problèmes rencontrés / Observations
  - Photos de chantier (galerie upload)
- Filtres par projet et par date

---

### 4.25 Rappels & Échéances (`/admin/reminders`)

**Description :** Gestionnaire de rappels manuels et alertes automatiques.

**Onglet Rappels manuels :**
- Titre, description, date d'échéance, priorité (Haute/Normale/Basse), statut
- Marquer comme fait ✅
- Rappels en retard mis en évidence

**Onglet Alertes automatiques :**
- Générées automatiquement par le système :
  - Factures en retard de paiement
  - Contrats employés arrivant à échéance
  - Équipements nécessitant une maintenance
  - Documents expirés
  - Stocks en dessous du seuil
- **Snooze** : Reporter une alerte de N jours
- Visible aussi dans le widget dashboard

---

### 4.26 Journal d'Activité (`/admin/activity-log`)

**Description :** Traçabilité de toutes les actions effectuées dans le système.

**Fonctionnalités :**
- Tableau horodaté : Date/heure, action, module concerné, utilisateur, description détaillée
- Filtres : Par module (Finance, RH, Projets…), par période, par utilisateur
- Recherche textuelle
- Suppression du journal (bouton "Vider le journal" avec confirmation)
- Pagination

---

### 4.27 Calendrier (`/admin/calendar`)

**Description :** Vue calendrier unifiée de tous les événements de l'entreprise.

**Fonctionnalités :**
- Vue mensuelle / hebdomadaire
- Événements affichés : Échéances factures, congés approuvés, maintenances planifiées, rappels, dates de fin de projet
- Code couleur par type d'événement
- Navigation mois par mois

---

### 4.28 Rapports & Analyses (`/admin/reports`)

**Description :** Tableau de bord analytique pour la direction.

**Rapports disponibles :**
- **Financier** : CA mensuel, évolution, répartition par type de prestation
- **Projets** : Taux d'avancement, délais, budgets
- **RH** : Taux de présence, absentéisme, heures travaillées
- **Commercial** : Top clients, devis convertis, taux de conversion
- Graphiques Recharts (barres, aires, camembert)
- Filtres par période

---

### 4.29 Gestion des Utilisateurs Admin (`/admin/users`)

**Description :** Gestion des comptes ayant accès au panneau d'administration.

**Fonctionnalités :**
- Liste des utilisateurs avec nom, email, rôle, statut (Actif/Inactif)
- **Rôles** : Super Admin / Admin / RH / Comptable / Lecteur
- Création de nouveaux comptes admin
- Modification email, mot de passe, rôle
- Activation / désactivation d'un compte
- L'utilisateur connecté ne peut pas se supprimer lui-même

---

### 4.30 Paramètres de l'Entreprise (`/admin/settings`)

**Description :** Configuration globale de l'application.

**Sections :**
- **Identité entreprise** : Nom, adresse, téléphone, email, site web, RC, SIRET/ICE
- **Logo** : Upload du logo de l'entreprise (utilisé sur les PDFs)
- **Finance** : Taux de TVA par défaut (ex: 20%), devise, format de numérotation des factures
- **Email** : Configuration SMTP (hôte, port, utilisateur, mot de passe) pour les envois automatiques
- **Notifications** : Préférences des alertes automatiques

---

### 4.31 Gestion du Contenu du Site

**Blog** (`/admin/blog`) :
- CRUD complet des articles
- Titre, contenu, catégorie, image de couverture, auteur, date de publication
- Statuts : Brouillon / Publié

**Services** (`/admin/services`) :
- CRUD des services proposés
- Nom, description, icône (sélecteur), ordre d'affichage, statut

**Équipe** (`/admin/team`) :
- CRUD des membres de l'équipe
- Nom, poste, département, photo, réseaux sociaux, ordre d'affichage

**Témoignages** (`/admin/testimonials`) :
- CRUD des avis clients
- Nom, entreprise, texte, note (1-5 étoiles), photo

---

### 4.32 Contacts entrants & Devis reçus

**Messages** (`/admin/contacts`) :
- Tableau des messages reçus via le formulaire contact du site
- Nom, email, sujet, message complet, date
- Statuts : Nouveau / Lu / Répondu / Archivé
- Changement de statut en un clic

**Devis reçus** (`/admin/quotes`) :
- Tableau des demandes de devis soumises via le site
- Toutes les infos du prospect (nom, email, téléphone, type projet, budget, délai)
- Statuts : Nouveau / En cours / Converti en facture / Refusé
- **Conversion en facture** : Bouton qui crée automatiquement une facture pré-remplie depuis le devis

---

## 5. FONCTIONNALITÉS TRANSVERSALES

### Mode Sombre / Clair
- Toggle dans la barre latérale admin
- Mémorisation du choix en localStorage
- Toutes les pages (admin + client) supportent le dark mode
- Palette : Fond `slate-900` / `navy-900`, textes blancs, accents bleu

### 100% Responsive — Mobile First
- Sidebar admin : Menu burger sur mobile → panneau latéral glissant avec overlay
- Tous les tableaux : Défilement horizontal (`overflow-x-auto`) sur petit écran
- En-têtes de page : Titre + boutons s'adaptent en colonne sur mobile
- Grilles de statistiques : 1 colonne mobile → 3 colonnes desktop
- Modals : Padding adapté mobile

### Génération PDF
- Disponible sur : Factures, Avoirs, Bons de commande, Bulletins de paie
- Librairie : `jsPDF` + `jspdf-autotable`
- Contenu : Logo entreprise, coordonnées, tableau des lignes, totaux, mentions légales
- Qualité professionnelle, prêt à l'envoi

### Export CSV
- Disponible sur : Factures, Paie, Présences
- Librairie interne `exportCsv.js`
- Un clic → téléchargement immédiat du fichier

### Envoi d'emails
- Factures → Client par email
- Bulletins de paie → Employé par email
- Bons de commande → Fournisseur par email
- Relances automatiques des factures en retard
- Backend : NodeMailer configuré via les paramètres admin

### QR Codes employés
- Chaque employé a un QR code unique généré (`qrcode.react`)
- Utilisé pour le pointage au kiosque et dans l'espace employé
- Téléchargeable depuis la fiche employé

### Recherche globale
- Barre de recherche dans le header admin
- Recherche simultanée dans : projets, clients, employés, factures, fournisseurs

### Notifications internes
- Cloche dans le header admin
- Affiche les derniers événements importants (nouveau message, facture en retard, etc.)

---

## 6. SCRIPT DE TOURNAGE VIDÉO

### Durée recommandée : 8 à 12 minutes

---

#### 🎬 INTRO (0:00 – 0:30)
> *Musique dynamique, montage rapide de captures d'écran ou screencast*

**À dire / afficher :**
"Voici CONSTRUCTPRO — une plateforme de gestion complète pour les entreprises du secteur BTP, développée avec React, Node.js et MongoDB."

**Shots recommandés :**
- Page d'accueil du site public (hero slider en action)
- Dashboard admin avec les widgets
- Vue mobile côte à côte avec desktop

---

#### 🌐 PARTIE 1 — SITE PUBLIC (0:30 – 2:30)

**Ordre des captures :**
1. **Accueil** — Montrer le slider qui défile automatiquement, scroller pour montrer les sections (services, projets, compteurs animés, témoignages)
2. **Services** — Grille de services, survol des cartes
3. **Projets** — Portfolio avec filtres (cliquer sur une catégorie)
4. **Contact** — Remplir rapidement le formulaire
5. **Demande de devis** — Montrer le formulaire enrichi
6. **Responsive** — Réduire le navigateur à taille mobile, rescroller l'accueil

---

#### 👷 PARTIE 2 — ESPACE EMPLOYÉ & KIOSQUE (2:30 – 3:30)

1. **Espace Employé** — Taper un nom dans la recherche, sélectionner un employé, montrer les 4 onglets (présences, planning, congés, paie)
2. **Kiosque** — Afficher l'écran de kiosque, activer la caméra, montrer l'interface d'attente de scan

---

#### 🔐 PARTIE 3 — CONNEXION ADMIN (3:30 – 3:50)
- Page de login, saisir les identifiants, animation de connexion, arrivée sur le dashboard

---

#### 📊 PARTIE 4 — DASHBOARD (3:50 – 5:00)
1. Montrer les 4 KPIs du haut
2. Scroller pour montrer plusieurs widgets
3. Cliquer sur le bouton "Personnaliser" — montrer les toggles pour activer/désactiver
4. Glisser-déposer un widget (drag & drop)
5. Montrer le graphique revenus vs dépenses

---

#### 💼 PARTIE 5 — MODULES MÉTIER (5:00 – 9:00)

**Finance (1 min) :**
- Ouvrir Factures, montrer le tableau avec les statuts colorés
- Cliquer "Nouvelle facture", montrer le formulaire avec les lignes auto-calculées
- Cliquer "Télécharger PDF" (montrer le PDF généré)

**Clients & Projets (45s) :**
- Ouvrir la liste clients, cliquer sur un client → fiche avec toutes ses factures
- Ouvrir Projets, montrer les cartes avec barres de progression

**RH — Employés (1 min) :**
- Liste avec cartes colorées par département
- Ouvrir une fiche employé → montrer les onglets (QR code, présences, formations, avances)

**Paie & Congés (30s) :**
- Paie : bouton "Générer la paie de mai 2026", tableau des bulletins
- Congés : tableau avec boutons Approuver/Refuser

**Présences & Kiosque (30s) :**
- Vue journalière des présences
- Historique kiosque

**HSE & Sécurité (20s) :**
- Liste des incidents avec gravités colorées
- Ouvrir un incident avec photos

**Équipements (20s) :**
- Cartes équipements, montrer l'historique de maintenance

---

#### ⚙️ PARTIE 6 — PARAMÈTRES & CONTENU (9:00 – 10:00)

- **Paramètres** : Formulaire infos entreprise + config email
- **Gestion contenu** : Blog (éditeur article), équipe (upload photo), témoignages
- **Utilisateurs admin** : Liste des comptes avec rôles

---

#### 📱 PARTIE 7 — RESPONSIVE MOBILE (10:00 – 10:30)

- DevTools Chrome → basculer en vue mobile (375px iPhone)
- Montrer le dashboard admin sur mobile avec le burger menu
- Montrer un tableau avec scroll horizontal
- Revenir sur le site public en mobile

---

#### 🎯 CONCLUSION (10:30 – 11:00)

**À dire :**
"Une solution 100% opérationnelle, déployée sur Netlify + Render, avec MongoDB Atlas. Gestion financière, RH, chantiers, sécurité — tout est centralisé en un seul outil."

**Shot final :** Split screen desktop / mobile côte à côte sur le dashboard.

---

*Document généré le 26/05/2026 — CONSTRUCTPRO BTP Management Platform*
