import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2, Settings, Building2, Phone, Globe, CreditCard, FileText, Save, CheckCircle, Mail, Eye, EyeOff, Download, Database, Bell } from 'lucide-react'
import { adminSettings, adminBackup } from '../adminApi'

const inp = "w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
  </div>
)

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-6">
      <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-5 pb-4 border-b border-slate-100 dark:border-navy-700">
        <Icon size={16} className="text-blue-500" /> {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

export default function AdminSettings() {
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [logoPreview, setLogoPreview] = useState('')
  const [showSmtpPass, setShowSmtpPass] = useState(false)
  const [exporting, setExporting]     = useState(false)
  const { register, handleSubmit, reset, watch } = useForm()
  const logoVal = watch('logo')

  useEffect(() => { adminSettings.get().then(r => { reset(r.data); setLogoPreview(r.data.logo || '') }).finally(() => setLoading(false)) }, [])
  useEffect(() => { setLogoPreview(logoVal || '') }, [logoVal])

  const onSubmit = async (v) => {
    setSaving(true)
    try { await adminSettings.update(v); setSaved(true); setTimeout(() => setSaved(false), 3000) }
    finally { setSaving(false) }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const r = await adminBackup.export()
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `btp-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Erreur lors de l\'export : ' + (e.response?.data?.error || e.message))
    } finally { setExporting(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-500"/></div>

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Paramètres</h1>
          <p className="text-slate-500 text-sm mt-1">Informations de votre entreprise — utilisées dans les factures PDF</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400 px-4 py-2 rounded-xl text-sm font-semibold">
            <CheckCircle size={16}/> Enregistré !
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Identité */}
        <Section icon={Building2} title="Identité de l'entreprise">
          <div className="flex gap-4 items-start">
            {logoPreview && <img src={logoPreview} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-slate-200 dark:border-navy-600 bg-slate-50 dark:bg-navy-800 shrink-0" onError={() => setLogoPreview('')} />}
            <div className="flex-1 grid sm:grid-cols-2 gap-4">
              <Field label="Nom de la société *"><input {...register('companyName', { required: true })} className={inp} placeholder="CONSTRUCTPRO"/></Field>
              <Field label="Slogan / Activité"><input {...register('tagline')} className={inp} placeholder="Bâtir l'avenir ensemble"/></Field>
            </div>
          </div>
          <Field label="URL du Logo" hint="Lien vers votre logo (PNG ou SVG recommandé)"><input {...register('logo')} className={inp} placeholder="https://votre-site.ma/logo.png"/></Field>
        </Section>

        {/* Contact */}
        <Section icon={Phone} title="Coordonnées">
          <Field label="Adresse complète"><input {...register('address')} className={inp} placeholder="45 Boulevard Zerktouni"/></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Ville"><input {...register('city')} className={inp} placeholder="Casablanca"/></Field>
            <Field label="Pays"><input {...register('country')} className={inp} placeholder="Maroc"/></Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Téléphone"><input {...register('phone')} className={inp} placeholder="+212 522 000 000"/></Field>
            <Field label="Email"><input {...register('email')} type="email" className={inp} placeholder="contact@constructpro.ma"/></Field>
            <Field label="Site web"><input {...register('website')} className={inp} placeholder="www.constructpro.ma"/></Field>
          </div>
        </Section>

        {/* Légal */}
        <Section icon={FileText} title="Informations légales">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="ICE"><input {...register('ice')} className={inp} placeholder="001234567890123"/></Field>
            <Field label="RC (Registre du commerce)"><input {...register('rc')} className={inp} placeholder="123456 — Casablanca"/></Field>
            <Field label="Patente"><input {...register('patente')} className={inp} placeholder="12345678"/></Field>
            <Field label="Capital social"><input {...register('capital')} className={inp} placeholder="1 000 000 MAD"/></Field>
            <Field label="N° IF (Identifiant fiscal)"><input {...register('tvaNumber')} className={inp} placeholder="12345678"/></Field>
            <Field label="Devise"><input {...register('currency')} className={inp} placeholder="FCFA"/></Field>
          </div>
        </Section>

        {/* Banque */}
        <Section icon={CreditCard} title="Coordonnées bancaires">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nom de la banque"><input {...register('bankName')} className={inp} placeholder="Attijariwafa Bank"/></Field>
            <Field label="RIB / IBAN"><input {...register('iban')} className={inp} placeholder="MA64 XXXX XXXX XXXX XXXX XXXX XXX"/></Field>
          </div>
        </Section>

        {/* Notes factures */}
        <Section icon={Settings} title="Mentions sur les factures">
          <Field label="Note de bas de facture" hint="Affiché sur chaque facture PDF générée">
            <textarea {...register('invoiceNotes')} rows={2} className={`${inp} resize-none`} placeholder="Paiement à 30 jours. TVA non applicable selon l'article 91-I-3° du CGI."/>
          </Field>
        </Section>

        {/* Objectifs */}
        <Section icon={Settings} title="Objectifs & Pilotage">
          <Field label="Objectif chiffre d'affaires mensuel (MAD)" hint="Affiché comme barre de progression sur le tableau de bord">
            <input {...register('monthlyRevenueTarget', { valueAsNumber: true })} type="number" className={inp} placeholder="500000"/>
          </Field>
        </Section>

        {/* Seuils d'alertes automatiques */}
        <Section icon={Bell} title="Seuils des alertes automatiques">
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl text-xs text-amber-700 dark:text-amber-300 mb-1">
            Ces valeurs définissent combien de jours (ou heures) <span className="font-semibold">à l'avance</span> le système vous signale une échéance. Réduisez-les si vous recevez trop d'alertes, augmentez-les pour plus d'anticipation.
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Factures (jours avant échéance)" hint="Défaut : 7 jours">
              <input {...register('alertThresholds.invoiceDays', { valueAsNumber: true })} type="number" min="1" max="60" className={inp} placeholder="7"/>
            </Field>
            <Field label="Tâches (jours avant échéance)" hint="Défaut : 3 jours">
              <input {...register('alertThresholds.taskDays', { valueAsNumber: true })} type="number" min="1" max="30" className={inp} placeholder="3"/>
            </Field>
            <Field label="Bons de commande (jours avant livraison)" hint="Défaut : 5 jours">
              <input {...register('alertThresholds.purchaseOrderDays', { valueAsNumber: true })} type="number" min="1" max="30" className={inp} placeholder="5"/>
            </Field>
            <Field label="Équipements (jours avant maintenance)" hint="Défaut : 7 jours">
              <input {...register('alertThresholds.equipmentDays', { valueAsNumber: true })} type="number" min="1" max="60" className={inp} placeholder="7"/>
            </Field>
            <Field label="Congés en attente (heures)" hint="Défaut : 48 heures — alerte si une demande de congé n'est pas traitée">
              <input {...register('alertThresholds.leavePendingHours', { valueAsNumber: true })} type="number" min="1" max="240" className={inp} placeholder="48"/>
            </Field>
          </div>
        </Section>

        {/* SMTP Email */}
        <Section icon={Mail} title="Configuration email (SMTP)">
          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-xs text-blue-700 dark:text-blue-300 mb-2">
            Ces paramètres permettent l'envoi automatique des factures par email. Pour Gmail, utilisez un <span className="font-semibold">mot de passe d'application</span> (non le mot de passe du compte).
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Serveur SMTP (host)" hint="Ex : smtp.gmail.com, smtp.mailtrap.io">
              <input {...register('smtpHost')} className={inp} placeholder="smtp.gmail.com"/>
            </Field>
            <Field label="Port SMTP" hint="587 (TLS) ou 465 (SSL)">
              <input {...register('smtpPort')} type="number" className={inp} placeholder="587"/>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Utilisateur SMTP">
              <input {...register('smtpUser')} className={inp} placeholder="votre@email.com"/>
            </Field>
            <Field label="Mot de passe SMTP">
              <div className="relative">
                <input {...register('smtpPass')} type={showSmtpPass ? 'text' : 'password'} className={`${inp} pr-10`} placeholder="••••••••••••"/>
                <button type="button" onClick={() => setShowSmtpPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {showSmtpPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </Field>
          </div>
          <Field label="Expéditeur (adresse affichée)" hint="Ex : CONSTRUCTPRO <facturation@constructpro.ma>">
            <input {...register('smtpFrom')} className={inp} placeholder="CONSTRUCTPRO <facturation@constructpro.ma>"/>
          </Field>
        </Section>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/25 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
            {saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}
          </button>
        </div>
      </form>

      {/* Backup section — outside the form */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 p-6">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-5 pb-4 border-b border-slate-100 dark:border-navy-700">
          <Database size={16} className="text-blue-500" /> Sauvegarde & Export
        </h2>
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Export complet de toutes vos données en JSON. Utile pour sauvegarde ou migration.
          </p>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-60">
            {exporting ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>}
            {exporting ? 'Export en cours…' : 'Exporter toutes les données (JSON)'}
          </button>
        </div>
      </div>
    </div>
  )
}
