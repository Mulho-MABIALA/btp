/**
 * generate-pdf.js
 * Génère PRESENTATION_PROJET.pdf depuis PRESENTATION_PROJET.md
 * Utilise Chrome headless — aucune dépendance npm requise.
 * Usage : node generate-pdf.js
 */

const fs            = require('fs')
const path          = require('path')
const { execSync }  = require('child_process')

// ── Chemins ───────────────────────────────────────────────────────────────────
const ROOT     = __dirname
const MD_PATH  = path.join(ROOT, 'PRESENTATION_PROJET.md')
const HTML_PATH= path.join(ROOT, 'PRESENTATION_PROJET.html')
const PDF_PATH = path.join(ROOT, 'PRESENTATION_PROJET.pdf')

// ── Chrome : cherche l'exécutable ────────────────────────────────────────────
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]
const chromePath = CHROME_PATHS.find(p => fs.existsSync(p))
if (!chromePath) { console.error('❌ Chrome introuvable.'); process.exit(1) }

// ── Lecture du Markdown ───────────────────────────────────────────────────────
const md = fs.readFileSync(MD_PATH, 'utf8')

// ── Convertisseur Markdown → HTML (sans dépendances) ─────────────────────────
function mdToHtml(src) {
  let html = src

  // Échapper les caractères HTML dangereux (hors balises)
  // On travaille ligne par ligne pour un meilleur contrôle
  const lines = html.split('\n')
  const out   = []
  let inTable  = false
  let inCode   = false
  let inList   = false   // ul
  let inOList  = false   // ol
  let listDepth = 0

  const closeList = () => {
    if (inList)  { out.push('</ul>'); inList = false }
    if (inOList) { out.push('</ol>'); inOList = false }
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // ── Blocs de code ─────────────────────────────────────────────────────────
    if (line.startsWith('```')) {
      if (!inCode) {
        closeList()
        const lang = line.slice(3).trim()
        out.push(`<pre><code class="lang-${lang}">`)
        inCode = true
      } else {
        out.push('</code></pre>')
        inCode = false
      }
      continue
    }
    if (inCode) {
      out.push(line.replace(/</g,'&lt;').replace(/>/g,'&gt;'))
      continue
    }

    // ── Tables Markdown ───────────────────────────────────────────────────────
    if (line.startsWith('|')) {
      if (!inTable) {
        closeList()
        out.push('<table>')
        inTable = true
        // Première ligne = thead
        const cells = line.split('|').filter((_,j,a)=>j>0&&j<a.length-1).map(c=>`<th>${inlineHtml(c.trim())}</th>`)
        out.push(`<thead><tr>${cells.join('')}</tr></thead><tbody>`)
        continue
      }
      // Ligne séparateur (---|---) : ignorer
      if (/^\|[-\s|:]+\|$/.test(line)) continue
      const cells = line.split('|').filter((_,j,a)=>j>0&&j<a.length-1).map(c=>`<td>${inlineHtml(c.trim())}</td>`)
      out.push(`<tr>${cells.join('')}</tr>`)
      continue
    } else if (inTable) {
      out.push('</tbody></table>')
      inTable = false
    }

    // ── Titres ────────────────────────────────────────────────────────────────
    const h6 = line.match(/^######\s+(.+)/)
    const h5 = line.match(/^#####\s+(.+)/)
    const h4 = line.match(/^####\s+(.+)/)
    const h3 = line.match(/^###\s+(.+)/)
    const h2 = line.match(/^##\s+(.+)/)
    const h1 = line.match(/^#\s+(.+)/)
    if (h6) { closeList(); out.push(`<h6>${inlineHtml(h6[1])}</h6>`); continue }
    if (h5) { closeList(); out.push(`<h5>${inlineHtml(h5[1])}</h5>`); continue }
    if (h4) { closeList(); out.push(`<h4>${inlineHtml(h4[1])}</h4>`); continue }
    if (h3) { closeList(); out.push(`<h3>${inlineHtml(h3[1])}</h3>`); continue }
    if (h2) { closeList(); out.push(`<h2>${inlineHtml(h2[1])}</h2>`); continue }
    if (h1) { closeList(); out.push(`<h1>${inlineHtml(h1[1])}</h1>`); continue }

    // ── Listes à puces ────────────────────────────────────────────────────────
    const ulM = line.match(/^(\s*)[-*]\s+(.+)/)
    if (ulM) {
      if (!inList) { if (inOList) { out.push('</ol>'); inOList=false }; out.push('<ul>'); inList=true }
      out.push(`<li>${inlineHtml(ulM[2])}</li>`)
      continue
    }

    // ── Listes numérotées ─────────────────────────────────────────────────────
    const olM = line.match(/^\d+\.\s+(.+)/)
    if (olM) {
      if (!inOList) { if (inList) { out.push('</ul>'); inList=false }; out.push('<ol>'); inOList=true }
      out.push(`<li>${inlineHtml(olM[1])}</li>`)
      continue
    }

    // ── Règle horizontale ─────────────────────────────────────────────────────
    if (/^[-*_]{3,}\s*$/.test(line)) { closeList(); out.push('<hr>'); continue }

    // ── Ligne vide ────────────────────────────────────────────────────────────
    if (line.trim() === '') {
      closeList()
      out.push('')
      continue
    }

    // ── Paragraphe / citation ─────────────────────────────────────────────────
    closeList()
    if (line.startsWith('> ')) {
      out.push(`<blockquote>${inlineHtml(line.slice(2))}</blockquote>`)
    } else {
      out.push(`<p>${inlineHtml(line)}</p>`)
    }
  }

  closeList()
  if (inTable) out.push('</tbody></table>')
  if (inCode)  out.push('</code></pre>')

  return out.join('\n')
}

// Transformations inline (bold, italic, code, liens, ancres)
function inlineHtml(s) {
  return s
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
}

// ── Template HTML complet ─────────────────────────────────────────────────────
const body = mdToHtml(md)

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>CONSTRUCTPRO — Documentation Projet</title>
<style>
  /* ── Reset & base ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --blue:    #2563eb;
    --blueD:   #1e40af;
    --orange:  #f97316;
    --slate:   #1e293b;
    --slateL:  #334155;
    --gray:    #64748b;
    --grayL:   #94a3b8;
    --border:  #e2e8f0;
    --bg:      #f8fafc;
    --white:   #ffffff;
    --code-bg: #1e293b;
  }

  @page {
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
  }

  html { font-size: 10.5pt; }

  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: var(--slate);
    line-height: 1.65;
    background: var(--white);
  }

  /* ── Page de couverture ── */
  .cover {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 60px;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #1e3a5f 100%);
    color: white;
    page-break-after: always;
    position: relative;
    overflow: hidden;
  }
  .cover::before {
    content: '';
    position: absolute;
    top: -100px; right: -100px;
    width: 500px; height: 500px;
    border-radius: 50%;
    background: rgba(37,99,235,.18);
  }
  .cover::after {
    content: '';
    position: absolute;
    bottom: -80px; left: -60px;
    width: 360px; height: 360px;
    border-radius: 50%;
    background: rgba(249,115,22,.1);
  }
  .cover-badge {
    background: var(--orange);
    color: white;
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    margin-bottom: 28px;
    display: inline-block;
  }
  .cover h1 {
    font-size: 38pt;
    font-weight: 900;
    line-height: 1.1;
    margin-bottom: 10px;
    color: white;
    border: none;
    padding: 0;
  }
  .cover-sub {
    font-size: 16pt;
    color: rgba(255,255,255,.65);
    margin-bottom: 40px;
    font-weight: 300;
  }
  .cover-line {
    width: 80px; height: 4px;
    background: var(--orange);
    border-radius: 2px;
    margin-bottom: 36px;
  }
  .cover-desc {
    font-size: 11pt;
    color: rgba(255,255,255,.8);
    max-width: 520px;
    line-height: 1.7;
    margin-bottom: 48px;
  }
  .cover-stats {
    display: flex;
    gap: 40px;
    flex-wrap: wrap;
  }
  .cover-stat { text-align: center; }
  .cover-stat .n {
    font-size: 26pt;
    font-weight: 900;
    color: var(--orange);
    display: block;
    line-height: 1;
  }
  .cover-stat .l {
    font-size: 8pt;
    color: rgba(255,255,255,.55);
    text-transform: uppercase;
    letter-spacing: .1em;
    margin-top: 4px;
  }
  .cover-footer {
    position: absolute;
    bottom: 30px; right: 40px;
    font-size: 8pt;
    color: rgba(255,255,255,.35);
  }
  .cover-tech {
    position: absolute;
    bottom: 30px; left: 60px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .tech-pill {
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.15);
    color: rgba(255,255,255,.7);
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 7.5pt;
    font-weight: 600;
  }

  /* ── Typographie ── */
  h1 {
    font-size: 20pt;
    font-weight: 800;
    color: var(--blue);
    border-bottom: 3px solid var(--blue);
    padding-bottom: 8px;
    margin: 36px 0 16px;
    page-break-after: avoid;
  }
  h2 {
    font-size: 14pt;
    font-weight: 700;
    color: var(--slateL);
    border-left: 4px solid var(--orange);
    padding-left: 12px;
    margin: 28px 0 12px;
    page-break-after: avoid;
  }
  h3 {
    font-size: 11.5pt;
    font-weight: 700;
    color: var(--blue);
    margin: 20px 0 8px;
    page-break-after: avoid;
  }
  h4 {
    font-size: 10.5pt;
    font-weight: 700;
    color: var(--slateL);
    margin: 16px 0 6px;
    page-break-after: avoid;
  }
  h5, h6 {
    font-size: 10pt;
    font-weight: 600;
    color: var(--gray);
    margin: 12px 0 4px;
  }

  p {
    margin: 0 0 8px;
    color: #374151;
  }

  strong { color: var(--slate); }
  em     { color: var(--gray); }

  a { color: var(--blue); text-decoration: none; }

  /* ── Listes ── */
  ul, ol {
    margin: 8px 0 12px 22px;
    padding: 0;
  }
  li {
    margin-bottom: 4px;
    color: #374151;
  }
  li::marker { color: var(--orange); }

  /* ── Tables ── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0 18px;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }
  thead {
    background: var(--blue);
    color: white;
  }
  th {
    padding: 8px 12px;
    text-align: left;
    font-weight: 700;
    font-size: 9pt;
  }
  td {
    padding: 7px 12px;
    border-bottom: 1px solid var(--border);
    color: #374151;
    vertical-align: top;
  }
  tr:nth-child(even) td { background: #f1f5f9; }
  tr:hover td { background: #e0f2fe; }

  /* ── Code ── */
  code {
    background: #f1f5f9;
    color: var(--blue);
    border-radius: 4px;
    padding: 1px 6px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 9pt;
  }
  pre {
    background: var(--code-bg);
    color: #e2e8f0;
    border-radius: 8px;
    padding: 16px 18px;
    margin: 12px 0 16px;
    overflow-x: auto;
    font-size: 8.5pt;
    line-height: 1.6;
    page-break-inside: avoid;
  }
  pre code {
    background: transparent;
    color: #e2e8f0;
    padding: 0;
    font-size: inherit;
  }

  /* ── Blockquote ── */
  blockquote {
    border-left: 4px solid var(--orange);
    background: #fff7ed;
    padding: 12px 16px;
    margin: 12px 0;
    border-radius: 0 6px 6px 0;
    color: #92400e;
    font-style: italic;
    page-break-inside: avoid;
  }

  /* ── Règle horizontale ── */
  hr {
    border: none;
    border-top: 2px solid var(--border);
    margin: 24px 0;
  }

  /* ── Numérotation des pages ── */
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    h1, h2, h3, h4 { page-break-after: avoid; }
    pre, table, blockquote { page-break-inside: avoid; }
    .no-break { page-break-inside: avoid; }
  }

  /* ── Contenu principal ── */
  .content {
    max-width: 100%;
    padding: 0;
  }

  /* ── En-tête de section (numérotée) ── */
  .section-header {
    background: linear-gradient(90deg, #eff6ff, #fff);
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 12px 16px;
    margin: 20px 0 14px;
    page-break-inside: avoid;
    page-break-after: avoid;
  }
</style>
</head>
<body>

<!-- ══ PAGE DE COUVERTURE ══════════════════════════════════════════════════ -->
<div class="cover">
  <span class="cover-badge">Documentation Projet</span>
  <h1>CONSTRUCTPRO</h1>
  <p class="cover-sub">Plateforme de gestion BTP — Full Stack</p>
  <div class="cover-line"></div>
  <p class="cover-desc">
    Solution complète de gestion pour les entreprises du BTP : site vitrine public,
    espace employé, kiosque de pointage et panneau d'administration avec 32 modules métier.
    100&nbsp;% responsive, mode sombre, génération PDF, export CSV et envoi email intégrés.
  </p>
  <div class="cover-stats">
    <div class="cover-stat"><span class="n">38</span><span class="l">Pages Admin</span></div>
    <div class="cover-stat"><span class="n">12</span><span class="l">Pages Client</span></div>
    <div class="cover-stat"><span class="n">30+</span><span class="l">Collections MongoDB</span></div>
    <div class="cover-stat"><span class="n">25+</span><span class="l">Routes API REST</span></div>
    <div class="cover-stat"><span class="n">100%</span><span class="l">Responsive</span></div>
  </div>
  <div class="cover-tech">
    <span class="tech-pill">React 18</span>
    <span class="tech-pill">Vite 5</span>
    <span class="tech-pill">Tailwind CSS</span>
    <span class="tech-pill">Node.js</span>
    <span class="tech-pill">Express.js</span>
    <span class="tech-pill">MongoDB Atlas</span>
    <span class="tech-pill">JWT</span>
    <span class="tech-pill">Framer Motion</span>
    <span class="tech-pill">Recharts</span>
    <span class="tech-pill">jsPDF</span>
  </div>
  <div class="cover-footer">Généré le ${new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}</div>
</div>

<!-- ══ CONTENU ═════════════════════════════════════════════════════════════ -->
<div class="content">
${body}
</div>

</body>
</html>`

// ── Écriture HTML ─────────────────────────────────────────────────────────────
fs.writeFileSync(HTML_PATH, html, 'utf8')
console.log(`✅ HTML généré : ${HTML_PATH}`)

// ── Chrome headless → PDF ─────────────────────────────────────────────────────
const fileUrl = `file:///${HTML_PATH.replace(/\\/g,'/')}`

const cmd = `"${chromePath}" --headless=new --no-sandbox --disable-gpu `
          + `--print-to-pdf="${PDF_PATH}" `
          + `--print-to-pdf-no-header `
          + `--no-pdf-header-footer `
          + `"${fileUrl}"`

console.log('⏳ Génération du PDF en cours...')
try {
  execSync(cmd, { stdio: 'pipe', timeout: 60000 })
  const size = (fs.statSync(PDF_PATH).size / 1024).toFixed(1)
  console.log(`✅ PDF généré  : ${PDF_PATH}  (${size} Ko)`)
  console.log('\n🎉 Terminé ! Ouvre PRESENTATION_PROJET.pdf pour vérifier.')
} catch (err) {
  console.warn('⚠️  Chrome headless a échoué. Ouvre PRESENTATION_PROJET.html dans Chrome et fais Ctrl+P → "Enregistrer en PDF".')
  console.warn(err.stderr?.toString()?.slice(0, 300) || err.message)
}
