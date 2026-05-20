import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

export default function SectionTitle({ label, title, subtitle, center = false, light = false }) {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      className={center ? 'text-center' : ''}
    >
      {label && (
        <div className={`label-tag mb-4 ${center ? 'justify-center' : ''}`}>
          {label}
        </div>
      )}

      <h2 className={`display-md ${light ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
        {title}
      </h2>

      {subtitle && (
        <p className={`body-lg mt-4 ${center ? 'mx-auto max-w-2xl' : 'max-w-2xl'} ${light ? '!text-white/65' : ''}`}>
          {subtitle}
        </p>
      )}
    </motion.div>
  )
}
