import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { MapPin, Phone, Mail, Clock, MessageCircle, Send, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import PageHero from '../components/ui/PageHero'
import SectionTitle from '../components/ui/SectionTitle'
import SEO from '../components/ui/SEO'

const faqs = [
  { q: 'Quel est votre délai de réponse pour un devis ?', a: 'Sous 24 heures ouvrées. Pour les projets urgents, contactez-nous directement par téléphone.' },
  { q: 'Intervenez-vous à l\'international ?', a: 'Oui, CONSTRUCTPRO opère dans 6 pays. Nous étudions également tout projet hors de ces zones sur demande.' },
  { q: 'Proposez-vous une garantie sur vos travaux ?', a: 'Tous nos ouvrages sont couverts par la garantie décennale légale, la garantie de parfait achèvement et la biennale.' },
  { q: 'Puis-je visiter des chantiers en cours ?', a: 'Oui, dans le respect des normes HSE. Contactez notre commercial pour une visite accompagnée.' },
  { q: 'Travaillez-vous avec des sous-traitants ?', a: 'Uniquement des sous-traitants certifiés agréés CONSTRUCTPRO. Nous restons l\'interlocuteur unique responsable.' },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${open ? 'border-blue-200 dark:border-blue-500/30' : 'border-slate-100 dark:border-navy-700'}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">
        <span className="font-medium text-slate-900 dark:text-white text-sm pr-4">{q}</span>
        {open ? <ChevronUp size={16} className="text-blue-500 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 text-slate-500 dark:text-slate-400 text-sm leading-relaxed border-t border-slate-100 dark:border-navy-700 pt-4">
          {a}
        </div>
      )}
    </div>
  )
}

export default function Contact() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()
  const [sent, setSent] = useState(false)

  const onSubmit = async () => {
    await new Promise(r => setTimeout(r, 1500))
    setSent(true); reset()
    setTimeout(() => setSent(false), 5000)
  }

  return (
    <div>
      <SEO
        title="Contact"
        description="Contactez CONSTRUCTPRO : +212 5 22 00 00 00 — Réponse garantie sous 24h. Bureaux à Casablanca, Rabat, Marrakech et international."
        url="/contact"
      />
      <PageHero
        title="Contactez-nous"
        subtitle="Notre équipe est là pour répondre à toutes vos questions."
        breadcrumb={[{ label: 'Contact' }]}
        image="https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&q=80"
      />

      <section className="section">
        <div className="wrap">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* Info */}
            <div className="space-y-6">
              <SectionTitle label="Coordonnées" title="Parlons de votre projet" />

              {[
                { icon: MapPin, title: 'Adresse', lines: ['123 Boulevard Mohammed V', 'Casablanca 20000, Maroc'] },
                { icon: Phone, title: 'Téléphone', lines: ['+212 5 22 00 00 00', '+212 6 00 00 00 00 (Urgences)'] },
                { icon: Mail, title: 'Email', lines: ['contact@constructpro.ma', 'devis@constructpro.ma'] },
                { icon: Clock, title: 'Horaires', lines: ['Lun–Ven : 08h00 – 18h00', 'Samedi : 09h00 – 13h00'] },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-blue-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm mb-0.5">{item.title}</div>
                      {item.lines.map(l => <p key={l} className="text-slate-400 text-sm">{l}</p>)}
                    </div>
                  </motion.div>
                )
              })}

              <a
                href="https://wa.me/212600000000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-5 py-3.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <MessageCircle size={18} />WhatsApp — réponse immédiate
              </a>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              <div className="card p-8 md:p-10 border border-slate-100 dark:border-navy-700">
                {sent ? (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12">
                    <div className="w-20 h-20 bg-green-50 dark:bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-5">
                      <CheckCircle size={36} className="text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Message envoyé !</h3>
                    <p className="text-slate-500 dark:text-slate-400">Nous vous répondrons sous 24 heures.</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Nom complet *</label>
                        <input {...register('name', { required: true })} className="input" placeholder="Jean Dupont" />
                        {errors.name && <p className="text-red-500 text-xs mt-1">Champ requis</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Email *</label>
                        <input {...register('email', { required: true, pattern: /\S+@\S+\.\S+/ })} type="email" className="input" placeholder="votre@email.com" />
                        {errors.email && <p className="text-red-500 text-xs mt-1">Email invalide</p>}
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Téléphone</label>
                        <input {...register('phone')} className="input" placeholder="+212 6 00 00 00 00" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Sujet *</label>
                        <select {...register('subject', { required: true })} className="input">
                          <option value="">Sélectionner...</option>
                          <option>Demande de devis</option>
                          <option>Renseignements</option>
                          <option>Partenariat</option>
                          <option>Candidature</option>
                          <option>Autre</option>
                        </select>
                        {errors.subject && <p className="text-red-500 text-xs mt-1">Champ requis</p>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Message *</label>
                      <textarea
                        {...register('message', { required: true, minLength: 20 })}
                        rows={5}
                        className="input resize-none"
                        placeholder="Décrivez votre projet ou votre demande..."
                      />
                      {errors.message && <p className="text-red-500 text-xs mt-1">20 caractères minimum</p>}
                    </div>
                    <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-4 text-base">
                      {isSubmitting
                        ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Envoi...</>
                        : <><Send size={16}/> Envoyer le message</>
                      }
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="mt-12 rounded-3xl overflow-hidden shadow-md h-72 border border-slate-100 dark:border-navy-700">
            <iframe
              title="Localisation CONSTRUCTPRO"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d53250.87060614847!2d-7.6527148!3d33.5731104!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xda7cd4778aa113b%3A0xb06c1d84f310fd3!2sCasablanca!5e0!3m2!1sfr!2sma!4v1677000000000!5m2!1sfr!2sma"
              className="w-full h-full border-0"
              allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section bg-slate-50 dark:bg-navy-900/40">
        <div className="wrap max-w-3xl">
          <SectionTitle label="FAQ" title="Questions fréquentes" center />
          <div className="mt-10 space-y-2.5">
            {faqs.map(faq => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>
    </div>
  )
}
