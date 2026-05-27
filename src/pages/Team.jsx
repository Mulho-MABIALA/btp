import { motion } from 'framer-motion'
import { Linkedin, Twitter, Mail } from 'lucide-react'
import PageHero from '../components/ui/PageHero'
import SectionTitle from '../components/ui/SectionTitle'
import SEO from '../components/ui/SEO'
import useFetch from '../hooks/useFetch'
import { teamApi } from '../api'

export default function Team() {
  const { data: team } = useFetch(() => teamApi.getAll(), [])

  return (
    <div>
      <SEO
        title="Notre Équipe"
        description="Rencontrez les 280 experts de CONSTRUCTPRO : ingénieurs, architectes, techniciens et managers qui font l'excellence de nos projets."
        url="/team"
        image="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=80"
      />
      <PageHero
        title="Notre Équipe"
        subtitle="Des experts passionnés qui font de chaque projet une réussite exceptionnelle."
        breadcrumb={[{ label: 'Équipe' }]}
        image="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=80"
      />

      <section className="section">
        <div className="wrap">
          <SectionTitle
            label="Les humains derrière les projets"
            title={<>280+ experts<br /><span className="gradient-text">à votre service</span></>}
            subtitle="Notre équipe réunit les meilleurs ingénieurs, architectes et techniciens de la région."
            center
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
            {(team || []).map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.1 }}
                className="group card-hover overflow-hidden"
              >
                {/* Photo */}
                <div className="relative overflow-hidden h-64">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-navy-950/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                    <div className="flex gap-2.5">
                      {[
                        { icon: Linkedin, href: member.linkedin },
                        { icon: Twitter,  href: member.twitter },
                        { icon: Mail,     href: 'mailto:contact@constructpro.ma' },
                      ].map(({ icon: Icon, href }, j) => (
                        <motion.a
                          key={j}
                          href={href}
                          initial={{ scale: 0.8, opacity: 0 }}
                          whileInView={{ scale: 1, opacity: 1 }}
                          transition={{ delay: j * 0.05 }}
                          className="w-9 h-9 rounded-xl glass text-white hover:bg-blue-500 transition-colors flex items-center justify-center"
                        >
                          <Icon size={15} />
                        </motion.a>
                      ))}
                    </div>
                  </div>
                  {/* Role badge */}
                  <span className="absolute top-3 left-3 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                    {member.role}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-slate-900 dark:text-white font-bold text-lg">{member.name}</h3>
                  <p className="text-blue-500 text-xs font-semibold mt-0.5 mb-3">{member.specialty}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{member.bio}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Join us */}
      <section className="section bg-navy-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot opacity-25" />
        <div className="relative wrap">
          <div className="glass-dark p-10 md:p-16 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Rejoignez notre équipe</h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto mb-8">
              Nous recrutons des talents passionnés. Envoyez votre candidature et construisez votre carrière avec nous.
            </p>
            <a href="mailto:rh@constructpro.ma" className="btn-primary">
              Candidature spontanée
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
