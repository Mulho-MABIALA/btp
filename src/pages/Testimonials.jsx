import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star, Quote, Building2, ArrowRight, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHero from '../components/ui/PageHero'
import SectionTitle from '../components/ui/SectionTitle'
import SEO from '../components/ui/SEO'
import useFetch from '../hooks/useFetch'
import { testimonialsApi } from '../api'

const stats = [
  { n: '98%', l: 'Taux de satisfaction client' },
  { n: '350+', l: 'Clients référencés' },
  { n: '20 ans', l: "D'excellence" },
  { n: '6', l: 'Pays d\'intervention' },
]

const clients = [
  'Groupe OCP', 'Maroc Telecom', 'CDG', 'Banque Populaire',
  'Accor Hotels', 'Total Maroc', 'LafargeHolcim', 'Renault Maroc',
]

export default function Testimonials() {
  const [activeFilter, setActiveFilter] = useState('Tous')
  const { data } = useFetch(() => testimonialsApi.getAll(), [])
  const extendedTestimonials = data || []

  const categories = ['Tous', 'Immobilier', 'Industrie', 'Public', 'Hôtellerie']

  return (
    <div>
      <SEO
        title="Témoignages Clients"
        description="Découvrez les témoignages de nos clients satisfaits. 98% de satisfaction — des projets résidentiels, hôteliers et industriels livrés avec excellence."
        url="/testimonials"
        image="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=80"
      />
      <PageHero
        title="Témoignages Clients"
        subtitle="La confiance de nos clients est notre plus belle récompense. Découvrez leurs expériences."
        breadcrumb={[{ label: 'Témoignages' }]}
        image="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=80"
      />

      {/* ── Stats strip ── */}
      <section className="bg-blue-600 py-10">
        <div className="wrap">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 divide-x divide-blue-500/40">
            {stats.map((s, i) => (
              <motion.div
                key={s.l}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`text-center ${i > 0 ? 'pl-8' : ''}`}
              >
                <div className="text-4xl font-black text-white">{s.n}</div>
                <div className="text-blue-100 text-sm mt-1">{s.l}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main testimonials grid ── */}
      <section className="section">
        <div className="wrap">
          <SectionTitle
            label="Ce qu'ils disent de nous"
            title={<>Des clients satisfaits,<br /><span className="gradient-text">des projets réussis</span></>}
            subtitle="Chaque témoignage est une histoire de confiance et d'excellence partagée."
            center
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
            {extendedTestimonials.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.08, duration: 0.5 }}
                className={`card p-7 flex flex-col border border-slate-100 dark:border-navy-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${
                  i === 0 ? 'md:col-span-2 lg:col-span-1' : ''
                }`}
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={14} className="text-blue-500 fill-blue-500" />
                  ))}
                </div>

                {/* Quote icon */}
                <Quote size={28} className="text-blue-500/15 mb-3" />

                {/* Text */}
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed flex-1 italic">
                  "{t.text}"
                </p>

                {/* Project tag */}
                <div className="flex items-center gap-1.5 mt-4 mb-5">
                  <Building2 size={11} className="text-blue-500" />
                  <span className="text-blue-500 text-xs font-semibold">{t.project}</span>
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-100 dark:bg-navy-700 mb-5" />

                {/* Author */}
                <div className="flex items-center gap-3">
                  <img
                    src={t.image}
                    alt={t.name}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-blue-500/20"
                    loading="lazy"
                  />
                  <div>
                    <div className="text-slate-900 dark:text-white font-bold text-sm">{t.name}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{t.role}</div>
                  </div>
                  <div className="ml-auto">
                    <div className="w-8 h-8 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <CheckCircle size={14} className="text-blue-500" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured testimonial ── */}
      <section className="section bg-navy-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[20rem] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative wrap">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
          >
            <Quote size={48} className="text-blue-500/20 mx-auto mb-8" />
            <blockquote className="text-white text-2xl md:text-3xl font-medium leading-relaxed italic mb-10">
              "CONSTRUCTPRO n'est pas un simple prestataire. C'est un véritable partenaire stratégique qui comprend nos enjeux et qui livre toujours au-delà de nos attentes."
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <img
                src="https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&q=80"
                alt="Abdelkader Moussaoui"
                className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-500/40"
                loading="lazy"
              />
              <div className="text-left">
                <div className="text-white font-bold">Abdelkader Moussaoui</div>
                <div className="text-slate-400 text-sm">Ministre délégué aux Travaux Publics</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Clients logos ── */}
      <section className="section bg-slate-50 dark:bg-navy-900/40">
        <div className="wrap">
          <SectionTitle
            label="Ils nous font confiance"
            title="Nos clients de référence"
            subtitle="Des entreprises leader dans leurs secteurs nous confient leurs projets les plus ambitieux."
            center
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12">
            {clients.map((client, i) => (
              <motion.div
                key={client}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 4) * 0.07 }}
                className="card p-6 flex items-center justify-center text-center hover:border-blue-200 dark:hover:border-blue-500/30 transition-colors cursor-default"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                    <Building2 size={18} className="text-white" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm">{client}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section">
        <div className="wrap">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 p-10 md:p-16 text-center"
          >
            <div className="absolute inset-0 bg-dot opacity-15" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
                Rejoignez nos clients satisfaits
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4 text-balance">
                Prêt à démarrer votre projet ?
              </h2>
              <p className="text-blue-100 text-base max-w-lg mx-auto mb-8">
                Obtenez un devis gratuit et personnalisé sous 24 heures. Sans engagement.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/quote" className="btn-ghost-white">
                  Demander un devis <ArrowRight size={15} />
                </Link>
                <Link to="/contact" className="btn px-7 py-3.5 bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors">
                  Nous contacter
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
