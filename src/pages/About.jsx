import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import CountUp from 'react-countup'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle, Award, Target, Eye, Heart, TrendingUp } from 'lucide-react'
import PageHero from '../components/ui/PageHero'
import SectionTitle from '../components/ui/SectionTitle'
import SEO from '../components/ui/SEO'

const timeline = [
  { year: '2004', title: 'Fondation', desc: 'CONSTRUCTPRO est fondée à Casablanca avec 12 collaborateurs et une vision claire : l\'excellence en construction.' },
  { year: '2008', title: 'Premier grand projet', desc: 'Réalisation du complexe Jardins d\'Anfa — 200 logements. Première certification ISO obtenue.' },
  { year: '2012', title: 'Expansion internationale', desc: 'Ouverture de bureaux en Tunisie et au Sénégal. 50+ projets livrés en Afrique du Nord.' },
  { year: '2016', title: 'HQE & LEED Gold', desc: 'Double certification environnementale. Leader en construction durable dans la région MENA.' },
  { year: '2020', title: '200 projets livrés', desc: 'Cap des 200 projets franchi. Adoption complète du BIM niveau 3 sur tous les chantiers.' },
  { year: '2024', title: 'Prix de l\'année BTP', desc: '350+ projets, 280 collaborateurs, 6 pays. Prix de l\'entreprise BTP de l\'année MENA.' },
]

function StatNum({ value, suffix, label, index }) {
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true })
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: index * 0.1 }}>
      <div className="text-4xl font-black text-blue-500 tabular-nums">
        {inView ? <CountUp end={value} duration={2.2} /> : 0}{suffix}
      </div>
      <div className="text-slate-500 dark:text-slate-400 text-sm mt-1">{label}</div>
    </motion.div>
  )
}

export default function About() {
  return (
    <div>
      <SEO
        title="À propos — Notre histoire"
        description="20 ans d'excellence en construction. Découvrez l'histoire de CONSTRUCTPRO, nos valeurs, nos certifications et notre équipe de 280 experts."
        url="/about"
        image="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80"
      />
      <PageHero
        title="Notre histoire"
        subtitle="20 ans d'excellence au service de vos projets de construction et de génie civil."
        breadcrumb={[{ label: 'À propos' }]}
        image="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80"
      />

      {/* Intro */}
      <section className="section">
        <div className="wrap">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <SectionTitle
                label="Qui sommes-nous"
                title={<>Bâtisseurs d'un <span className="gradient-text">avenir durable</span></>}
                subtitle="CONSTRUCTPRO est bien plus qu'une entreprise de BTP. Nous sommes des architectes du futur, des créateurs d'espaces qui améliorent la vie des gens."
              />
              <div className="mt-6 space-y-4 text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                <p>Fondée en 2004 à Casablanca, CONSTRUCTPRO s'est imposée comme le leader régional en construction et génie civil. Notre approche unique combine expertise technique, design innovant et engagement environnemental fort.</p>
                <p>Avec plus de 350 projets réalisés dans 6 pays, nous avons construit des hôpitaux, des tours de bureaux, des autoroutes, des complexes résidentiels haut de gamme et des infrastructures industrielles majeures.</p>
              </div>
              <div className="flex flex-wrap gap-2 mt-7">
                {['ISO 9001:2015', 'HQE Certifié', 'LEED Gold', 'OHSAS 18001'].map(c => (
                  <span key={c} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold">
                    <CheckCircle size={12} />{c}
                  </span>
                ))}
              </div>
              <Link to="/quote" className="btn-primary mt-8">Démarrer un projet <ArrowRight size={15} /></Link>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <img src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&q=80" alt="" className="rounded-2xl object-cover h-52 w-full" />
                <img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80" alt="" className="rounded-2xl object-cover h-52 w-full mt-8" />
              </div>
              <div className="card p-6 grid grid-cols-3 gap-6 border-l-4 border-blue-500">
                <StatNum value={350} suffix="+" label="Projets" index={0} />
                <StatNum value={20} suffix="" label="Ans exp." index={1} />
                <StatNum value={280} suffix="+" label="Experts" index={2} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="section bg-slate-50 dark:bg-navy-900/40">
        <div className="wrap">
          <SectionTitle label="Notre boussole" title="Mission, Vision & Valeurs" center />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
            {[
              {
                icon: Target, title: 'Notre Mission',
                text: 'Réaliser des ouvrages d\'excellence qui améliorent la qualité de vie tout en respectant l\'environnement et les délais contractuels.',
                highlight: true,
              },
              {
                icon: Eye, title: 'Notre Vision',
                text: 'Devenir le leader africain en construction durable à horizon 2030, en alliant innovation technologique et engagement environnemental.',
              },
              {
                icon: Heart, title: 'Nos Valeurs',
                items: ['Excellence sans compromis', 'Intégrité et transparence', 'Innovation continue', 'Respect humain & environnemental'],
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className={`rounded-2xl p-8 border ${
                    item.highlight
                      ? 'bg-blue-500 border-blue-600'
                      : 'bg-white dark:bg-navy-800 border-slate-100 dark:border-navy-700'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${item.highlight ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-500/10'}`}>
                    <Icon size={20} className={item.highlight ? 'text-white' : 'text-blue-500'} />
                  </div>
                  <h3 className={`text-xl font-bold mb-3 ${item.highlight ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{item.title}</h3>
                  {item.text && <p className={`text-sm leading-relaxed ${item.highlight ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{item.text}</p>}
                  {item.items && (
                    <ul className="space-y-2.5">
                      {item.items.map(v => (
                        <li key={v} className="flex items-start gap-2 text-slate-600 dark:text-slate-300 text-sm">
                          <CheckCircle size={13} className="text-blue-500 shrink-0 mt-0.5" />{v}
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section bg-navy-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot opacity-25" />
        <div className="relative wrap">
          <SectionTitle label="Notre parcours" title={<>20 ans de <span className="gradient-text">croissance</span></>} light center />
          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {timeline.map((item, i) => (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.1 }}
                className="glass-dark p-6 hover:border-blue-500/30 transition-colors"
              >
                <div className="text-3xl font-black text-blue-500 mb-2">{item.year}</div>
                <h3 className="text-white font-bold mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
