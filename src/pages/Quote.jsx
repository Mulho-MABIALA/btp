import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { CheckCircle, Send, Upload, User, Mail, Phone, Building2, DollarSign, Calendar, FileText, Tag } from 'lucide-react'
import PageHero from '../components/ui/PageHero'
import SEO from '../components/ui/SEO'
import { quotesApi } from '../api'

const workTypes = [
  'Construction neuve', 'Rénovation / Réhabilitation', 'Génie civil',
  'Architecture & Design', 'Travaux publics', 'Électricité bâtiment',
  'Plomberie & Sanitaires', 'Voirie & Réseaux', 'Gestion de chantier', 'Autre',
]

const budgets = [
  'Moins de 100 000 €', '100 000 € – 500 000 €', '500 000 € – 1 M €',
  '1 M € – 5 M €', '5 M € – 20 M €', 'Plus de 20 M €',
]

const steps = [
  { num: 1, label: 'Vos infos' },
  { num: 2, label: 'Le projet' },
  { num: 3, label: 'Budget' },
  { num: 4, label: 'Détails' },
]

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              current > s.num  ? 'bg-green-500 text-white' :
              current === s.num ? 'bg-blue-500 text-white shadow-blue' :
              'bg-slate-100 dark:bg-navy-800 text-slate-400'
            }`}>
              {current > s.num ? <CheckCircle size={16} /> : s.num}
            </div>
            <span className={`hidden sm:block text-[10px] mt-1.5 font-medium uppercase tracking-wide transition-colors ${
              current === s.num ? 'text-blue-500' : 'text-slate-400'
            }`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-14 md:w-20 h-0.5 mb-4 mx-1 transition-colors duration-300 ${current > s.num ? 'bg-green-400' : 'bg-slate-200 dark:bg-navy-700'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function Quote() {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [fileName, setFileName] = useState('')

  const { register, handleSubmit, trigger, formState: { errors, isSubmitting } } = useForm()

  const fieldsPerStep = {
    1: ['name', 'email', 'phone'],
    2: ['workType', 'location'],
    3: ['budget', 'startDate'],
  }

  const next = async () => {
    const valid = await trigger(fieldsPerStep[step] || [])
    if (valid) setStep(s => s + 1)
  }

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        serviceType: data.workType,
        budget: data.budget,
        location: data.location,
        description: data.description,
      }
      await quotesApi.send(payload)
      setSubmitted(true)
    } catch (err) {
      alert('Erreur lors de l\'envoi. Veuillez réessayer.')
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-navy-950 px-4 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-dot opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-blue-500/6 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          className="relative card border border-slate-100 dark:border-navy-700 max-w-lg w-full p-10 md:p-14 text-center shadow-xl"
        >
          {/* Confetti-like top accent */}
          <div className="absolute top-0 inset-x-0 h-1 rounded-t-2xl bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600" />

          {/* Animated checkmark */}
          <div className="relative mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 280, damping: 18 }}
              className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg"
            >
              <CheckCircle size={48} className="text-white" strokeWidth={2.5} />
            </motion.div>
            {/* Ripple rings */}
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                initial={{ scale: 0.8, opacity: 0.6 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 1.2, ease: 'easeOut' }}
                className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-2 border-green-400"
                style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }}
              />
            ))}
          </div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
              Demande envoyée !
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-base mb-6">
              Merci pour votre confiance.
            </p>
          </motion.div>

          {/* Steps timeline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="bg-slate-50 dark:bg-navy-800 rounded-2xl p-6 mb-8 text-left space-y-4"
          >
            {[
              { icon: '📨', title: 'Demande reçue', desc: 'Votre demande est enregistrée dans notre système.' },
              { icon: '⏰', title: 'Réponse sous 24h', desc: 'Un expert vous contactera sous 24 heures ouvrées.' },
              { icon: '📋', title: 'Devis personnalisé', desc: 'Proposition détaillée et chiffrée pour votre projet.' },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.65 + i * 0.12 }}
                className="flex items-start gap-3.5"
              >
                <span className="text-xl shrink-0 mt-0.5">{step.icon}</span>
                <div>
                  <div className="text-slate-900 dark:text-white font-semibold text-sm">{step.title}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{step.desc}</div>
                </div>
                <CheckCircle size={14} className="text-green-500 shrink-0 ml-auto mt-1" />
              </motion.div>
            ))}
          </motion.div>

          {/* Reference number */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mb-8"
          >
            <p className="text-slate-400 text-xs mb-1">Numéro de référence</p>
            <p className="font-mono font-bold text-blue-500 text-sm tracking-wider">
              CP-{new Date().getFullYear()}-{Math.random().toString(36).substring(2, 8).toUpperCase()}
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <button
              onClick={() => { setSubmitted(false); setStep(1) }}
              className="flex-1 btn px-5 py-3 border border-slate-200 dark:border-navy-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800 rounded-xl font-semibold text-sm transition-colors"
            >
              Nouvelle demande
            </button>
            <a href="/" className="flex-1 btn-primary py-3 text-sm justify-center">
              Retour à l'accueil
            </a>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div>
      <SEO
        title="Demande de Devis Gratuit"
        description="Obtenez un devis personnalisé pour votre projet BTP sous 24h. Construction, rénovation, génie civil — réponse gratuite et sans engagement."
        url="/quote"
      />
      <PageHero
        title="Demande de Devis"
        subtitle="Remplissez ce formulaire et recevez une proposition personnalisée sous 24h."
        breadcrumb={[{ label: 'Devis' }]}
        image="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80"
      />

      <section className="section">
        <div className="wrap max-w-3xl">
          <StepIndicator current={step} />

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="card border border-slate-100 dark:border-navy-700 p-8 md:p-10">

              {/* ── Step 1 ── */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Vos informations</h2>
                    <p className="text-slate-400 text-sm mt-1">Pour vous recontacter avec notre proposition.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <User size={12} className="text-blue-500" /> Nom complet *
                      </label>
                      <input {...register('name', { required: true })} className="input" placeholder="Jean Dupont" />
                      {errors.name && <p className="text-red-500 text-xs mt-1">Requis</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Mail size={12} className="text-blue-500" /> Email *
                      </label>
                      <input {...register('email', { required: true, pattern: /\S+@\S+\.\S+/ })} type="email" className="input" placeholder="votre@email.com" />
                      {errors.email && <p className="text-red-500 text-xs mt-1">Email invalide</p>}
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Phone size={12} className="text-blue-500" /> Téléphone *
                      </label>
                      <input {...register('phone', { required: true })} className="input" placeholder="+212 6 00 00 00 00" />
                      {errors.phone && <p className="text-red-500 text-xs mt-1">Requis</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Building2 size={12} className="text-blue-500" /> Société
                      </label>
                      <input {...register('company')} className="input" placeholder="Votre société (optionnel)" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2 ── */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Détails du projet</h2>
                    <p className="text-slate-400 text-sm mt-1">Quel type de travaux souhaitez-vous ?</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Tag size={12} className="text-blue-500" /> Type de travaux *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {workTypes.map(type => (
                        <label key={type} className="cursor-pointer">
                          <input {...register('workType', { required: true })} type="radio" value={type} className="peer sr-only" />
                          <div className="px-3.5 py-2.5 border border-slate-200 dark:border-navy-600 rounded-xl text-xs text-center
                                          text-slate-600 dark:text-slate-300 cursor-pointer transition-all
                                          peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-500/10
                                          peer-checked:text-blue-600 dark:peer-checked:text-blue-400
                                          hover:border-blue-300 dark:hover:border-blue-500/50">
                            {type}
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.workType && <p className="text-red-500 text-xs mt-2">Sélectionnez un type</p>}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Localisation *</label>
                      <input {...register('location', { required: true })} className="input" placeholder="Ville, Pays" />
                      {errors.location && <p className="text-red-500 text-xs mt-1">Requis</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Surface (m²)</label>
                      <input {...register('surface')} type="number" className="input" placeholder="Ex: 500" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3 ── */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Budget & Délais</h2>
                    <p className="text-slate-400 text-sm mt-1">Ces infos nous aident à calibrer notre proposition.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <DollarSign size={12} className="text-blue-500" /> Budget estimatif *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {budgets.map(b => (
                        <label key={b} className="cursor-pointer">
                          <input {...register('budget', { required: true })} type="radio" value={b} className="peer sr-only" />
                          <div className="px-3 py-2.5 border border-slate-200 dark:border-navy-600 rounded-xl text-xs text-center
                                          text-slate-600 dark:text-slate-300 cursor-pointer transition-all
                                          peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-500/10
                                          peer-checked:text-blue-600 dark:peer-checked:text-blue-400
                                          hover:border-blue-300 dark:hover:border-blue-500/50">
                            {b}
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.budget && <p className="text-red-500 text-xs mt-2">Sélectionnez un budget</p>}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Calendar size={12} className="text-blue-500" /> Date début souhaitée *
                      </label>
                      <input {...register('startDate', { required: true })} type="date" className="input" />
                      {errors.startDate && <p className="text-red-500 text-xs mt-1">Requis</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Délai souhaité</label>
                      <select {...register('duration')} className="input">
                        <option value="">Sélectionner...</option>
                        <option>Moins de 3 mois</option>
                        <option>3 – 6 mois</option>
                        <option>6 – 12 mois</option>
                        <option>1 – 2 ans</option>
                        <option>Plus de 2 ans</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Step 4 ── */}
              {step === 4 && (
                <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Description du projet</h2>
                    <p className="text-slate-400 text-sm mt-1">Plus vous êtes précis, meilleure sera notre proposition.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <FileText size={12} className="text-blue-500" /> Description détaillée *
                    </label>
                    <textarea
                      {...register('description', { required: true, minLength: 30 })}
                      rows={6} className="input resize-none"
                      placeholder="Décrivez votre projet : type de construction, niveaux, matériaux souhaités, contraintes spécifiques..."
                    />
                    {errors.description && <p className="text-red-500 text-xs mt-1">30 caractères minimum</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Documents annexes</label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-navy-600
                                      rounded-xl p-8 cursor-pointer hover:border-blue-400 transition-colors group">
                      <Upload size={24} className="text-slate-300 group-hover:text-blue-400 mb-2 transition-colors" />
                      <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                        {fileName || 'Cliquez pour uploader'}
                      </span>
                      <span className="text-slate-400 text-xs mt-1">PDF, DWG, JPG, PNG — Max 10 MB</span>
                      <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,.dwg,.doc,.docx"
                        onChange={e => setFileName(e.target.files[0]?.name || '')} />
                    </label>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-500/8 rounded-xl border border-blue-100 dark:border-blue-500/20">
                    <input {...register('consent', { required: true })} type="checkbox" id="consent" className="mt-0.5 accent-blue-500" />
                    <label htmlFor="consent" className="text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                      J'accepte que CONSTRUCTPRO traite mes données pour cette demande de devis. *
                    </label>
                  </div>
                  {errors.consent && <p className="text-red-500 text-xs">Vous devez accepter</p>}
                </motion.div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100 dark:border-navy-700">
                <button
                  type="button"
                  onClick={() => setStep(s => s - 1)}
                  disabled={step === 1}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-600 text-slate-600 dark:text-slate-300
                             text-sm font-medium hover:bg-slate-50 dark:hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Précédent
                </button>
                {step < 4
                  ? <button type="button" onClick={next} className="btn-primary py-2.5 px-7">Suivant →</button>
                  : <button type="submit" disabled={isSubmitting} className="btn-primary py-2.5 px-7">
                      {isSubmitting
                        ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Envoi...</>
                        : <><Send size={15}/> Envoyer ma demande</>
                      }
                    </button>
                }
              </div>
            </div>
          </form>

          {/* Reassurance */}
          <div className="grid sm:grid-cols-3 gap-4 mt-6">
            {[
              { title: 'Gratuit & Sans engagement', desc: '100% gratuit, aucune obligation.' },
              { title: 'Réponse sous 24h', desc: 'Notre équipe vous répond le lendemain.' },
              { title: 'Données sécurisées', desc: 'Vos infos restent confidentielles.' },
            ].map(item => (
              <div key={item.title} className="flex gap-2.5 p-4 bg-slate-50 dark:bg-navy-800 rounded-xl">
                <CheckCircle size={15} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-900 dark:text-white font-semibold text-xs">{item.title}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
