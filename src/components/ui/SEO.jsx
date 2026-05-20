import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'CONSTRUCTPRO'
const SITE_URL = 'https://constructpro.ma'
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80'

export default function SEO({
  title,
  description = 'CONSTRUCTPRO — Leader BTP depuis 2004. Construction, génie civil, rénovation, architecture. 350+ projets livrés dans 6 pays.',
  image = DEFAULT_IMAGE,
  url = '',
  type = 'website',
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Excellence en Construction`
  const fullUrl = `${SITE_URL}${url}`

  return (
    <Helmet>
      {/* Primary */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Misc */}
      <meta name="theme-color" content="#1652f0" />
      <meta name="robots" content="index, follow" />
    </Helmet>
  )
}
