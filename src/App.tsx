import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { demoSchemes } from './data/schemes'
import { matchSchemes } from './lib/eligibility'
import type {
  ApplicationStatus,
  CitizenProfile,
  DocumentChecklist,
  DocumentStatus,
  Scheme,
  TrackedApplication,
} from './types'
import './App.css'

type Page = 'home' | 'onboarding' | 'dashboard' | 'scheme' | 'applications' | 'admin' | 'privacy'
type OnboardingStep = 'describe' | 'review'

const STORAGE_KEYS = {
  profile: 'claim-yours-profile',
  schemes: 'claim-yours-schemes',
  applications: 'claim-yours-applications',
  documents: 'claim-yours-documents',
  reminders: 'claim-yours-reminders',
}

const applicationStatuses: ApplicationStatus[] = [
  'Not started',
  'Documents pending',
  'Ready to apply',
  'Applied',
  'Under review',
  'Action required',
  'Approved',
  'Rejected',
  'Completed',
]
const timelineStatuses: ApplicationStatus[] = [
  'Not started',
  'Documents pending',
  'Ready to apply',
  'Applied',
  'Under review',
  'Completed',
]

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch (error) {
    console.error(`Could not read saved ${key} data.`, error)
    return fallback
  }
}

function formatDate(value?: string) {
  if (!value) return 'No sample date'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function parseDescription(text: string, current: CitizenProfile): CitizenProfile {
  const next = { ...current }
  const ageMatch = text.match(/\b(\d{1,2})[-\s]*(?:years?[-\s]*old|yo)\b/i)
  if (ageMatch) next.age = Number(ageMatch[1])

  const incomeMatch = text.match(/(?:income|family|household)[^\d₹]{0,30}(?:₹\s*)?([\d,]+(?:\.\d+)?)\s*(lakh|lakhs|l|thousand|k)?\b/i)
  if (incomeMatch) {
    const amount = Number(incomeMatch[1].replaceAll(',', ''))
    const unit = incomeMatch[2]?.toLowerCase()
    next.annualIncome = Math.round(amount * (unit === 'lakh' || unit === 'lakhs' || unit === 'l' ? 100000 : unit === 'thousand' || unit === 'k' ? 1000 : 1))
  }

  if (/karnataka/i.test(text)) next.state = 'Karnataka'
  const district = text.match(/\b(?:in|from|district of)\s+(Bengaluru|Bangalore|Mysuru|Mysore|Mangaluru|Mangalore|Dharwad|Belagavi|Kalaburagi|Hubballi)\b/i)
  if (district) next.district = district[1]

  if (/\b(b\.?\s?tech|btech|engineering)\b/i.test(text)) {
    next.educationLevel = 'Undergraduate'
    next.course = /computer|software|cs\b/i.test(text) ? 'B.Tech Computer Science' : 'B.Tech Engineering'
  } else if (/\b(postgraduate|master'?s|m\.?tech)\b/i.test(text)) {
    next.educationLevel = 'Postgraduate'
    next.course ||= 'Postgraduate course'
  } else if (/\b(diploma)\b/i.test(text)) {
    next.educationLevel = 'Diploma'
    next.course ||= 'Diploma'
  }

  return next
}

function App() {
  const [page, setPage] = useState<Page>('home')
  const [profile, setProfile] = useState<CitizenProfile>(() => readStorage(STORAGE_KEYS.profile, {}))
  const [schemes, setSchemes] = useState<Scheme[]>(() => readStorage(STORAGE_KEYS.schemes, demoSchemes))
  const [applications, setApplications] = useState<TrackedApplication[]>(() => readStorage(STORAGE_KEYS.applications, []))
  const [documentStatus, setDocumentStatus] = useState<DocumentChecklist>(() => readStorage(STORAGE_KEYS.documents, {}))
  const [reminders, setReminders] = useState<string[]>(() => readStorage(STORAGE_KEYS.reminders, []))
  const [description, setDescription] = useState('')
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('describe')
  const [activeSchemeId, setActiveSchemeId] = useState<string>()
  const [notice, setNotice] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminDescription, setAdminDescription] = useState('')
  const [adminIncome, setAdminIncome] = useState('')

  useEffect(() => localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile)), [profile])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.schemes, JSON.stringify(schemes)), [schemes])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.applications, JSON.stringify(applications)), [applications])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.documents, JSON.stringify(documentStatus)), [documentStatus])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(reminders)), [reminders])

  const matches = useMemo(() => matchSchemes(schemes, profile), [profile, schemes])
  const activeScheme = schemes.find((scheme) => scheme.id === activeSchemeId)
  const activeMatch = matches.find((match) => match.scheme.id === activeSchemeId)
  const sampleApplications = applications.filter((application) => schemes.find((scheme) => scheme.id === application.schemeId)?.sample)
  const enabledReminders = reminders.filter((schemeId) => schemes.some((scheme) => scheme.id === schemeId && scheme.active))

  function navigate(nextPage: Page) {
    setNotice('')
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function beginOnboarding() {
    setDescription('')
    setOnboardingStep('describe')
    navigate('onboarding')
  }

  function useSampleProfile() {
    setDescription('I am a 20-year-old student studying B.Tech in Karnataka. My family income is around ₹2.5 lakh per year.')
    setProfile({
      age: 20,
      state: 'Karnataka',
      district: 'Bengaluru',
      educationLevel: 'Undergraduate',
      course: 'B.Tech Engineering',
      institutionType: 'College',
      annualIncome: 250000,
    })
    setOnboardingStep('review')
  }

  function extractProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfile((current) => parseDescription(description, current))
    setOnboardingStep('review')
  }

  function setProfileField<K extends keyof CitizenProfile>(field: K, value: CitizenProfile[K]) {
    setProfile((current) => ({ ...current, [field]: value }))
  }

  function viewScheme(schemeId: string) {
    setActiveSchemeId(schemeId)
    navigate('scheme')
  }

  function addToApplications(scheme: Scheme) {
    if (applications.some((application) => application.schemeId === scheme.id)) {
      setNotice('This scheme is already in My Applications.')
      return
    }
    setApplications((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        schemeId: scheme.id,
        status: 'Not started',
        expectedDeadline: scheme.deadline,
        notes: '',
        updatedAt: new Date().toISOString(),
      },
    ])
    setNotice('Added to My Applications on this device.')
  }

  function updateApplication(id: string, patch: Partial<TrackedApplication>) {
    setApplications((current) =>
      current.map((application) =>
        application.id === id ? { ...application, ...patch, updatedAt: new Date().toISOString() } : application,
      ),
    )
  }

  function updateDocument(schemeId: string, name: string, status: DocumentStatus) {
    const key = `${schemeId}:${name}`
    setDocumentStatus((current) => ({ ...current, [key]: status }))
  }

  function toggleReminder(schemeId: string) {
    const isEnabled = reminders.includes(schemeId)
    setReminders((current) => isEnabled ? current.filter((id) => id !== schemeId) : [...current, schemeId])
    setNotice(isEnabled ? 'In-app reminder removed.' : 'In-app reminder enabled for this sample deadline.')
  }

  function addDemoScheme(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = adminName.trim()
    if (!name) return

    const newScheme: Scheme = {
      id: crypto.randomUUID(),
      name,
      description: adminDescription.trim() || 'A locally added demo record. Verify all details before relying on them.',
      benefit: 'Demo benefit — not verified',
      state: 'Karnataka',
      targetGroup: 'Students',
      incomeLimit: adminIncome ? Number(adminIncome) : undefined,
      documents: ['Income certificate', 'College bonafide certificate'],
      steps: ['Verify eligibility with an official source', 'Confirm required documents', 'Use only a verified official application channel'],
      sourceName: 'Local demo record — official source not verified',
      active: true,
      sample: true,
    }
    setSchemes((current) => [newScheme, ...current])
    setAdminName('')
    setAdminDescription('')
    setAdminIncome('')
    setNotice('Demo scheme added on this device only.')
  }

  function resetDemoData() {
    if (!window.confirm('Clear the saved demo profile, applications, checklists, and custom schemes from this browser?')) return
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
    setProfile({})
    setSchemes(demoSchemes)
    setApplications([])
    setDocumentStatus({})
    setReminders([])
    setNotice('Demo data cleared from this browser.')
  }

  function goToMatches() {
    navigate('dashboard')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => navigate('home')} aria-label="Claim What's Yours home">
          <span className="brand-mark">cw</span>
          <span className="brand-copy"><strong>Claim What’s Yours</strong><small>Student benefits guide</small></span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          <button type="button" className={page === 'dashboard' ? 'nav-link active' : 'nav-link'} onClick={() => navigate('dashboard')}>Explore schemes</button>
          <button type="button" className={page === 'applications' ? 'nav-link active' : 'nav-link'} onClick={() => navigate('applications')}>My applications <span className="nav-count">{sampleApplications.length}</span></button>
        </nav>
        <div className="topbar-actions">
          <span className="demo-pill"><span /> Demo mode</span>
          <button className="icon-button" type="button" onClick={() => navigate('privacy')} aria-label="Privacy settings" title="Privacy settings">⚙</button>
        </div>
      </header>

      <main>
        {page === 'home' && <LandingPage onStart={beginOnboarding} onHow={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} />}
        {page === 'onboarding' && (
          <Onboarding
            step={onboardingStep}
            profile={profile}
            description={description}
            onDescription={setDescription}
            onExtract={extractProfile}
            onSample={useSampleProfile}
            onField={setProfileField}
            onBack={() => setOnboardingStep('describe')}
            onContinue={goToMatches}
          />
        )}
        {page === 'dashboard' && (
          <Dashboard
            matches={matches}
            applicationsCount={sampleApplications.length}
            remindersCount={enabledReminders.length}
            onEditProfile={beginOnboarding}
            onViewScheme={viewScheme}
            onApplications={() => navigate('applications')}
            onPrivacy={() => navigate('privacy')}
          />
        )}
        {page === 'scheme' && activeScheme && (
          <SchemeDetails
            scheme={activeScheme}
            match={activeMatch}
            application={applications.find((item) => item.schemeId === activeScheme.id)}
            checklist={documentStatus}
            reminderEnabled={reminders.includes(activeScheme.id)}
            onBack={() => navigate('dashboard')}
            onAdd={() => addToApplications(activeScheme)}
            onToggleReminder={() => toggleReminder(activeScheme.id)}
            onDocument={(name, status) => updateDocument(activeScheme.id, name, status)}
            onNotice={setNotice}
          />
        )}
        {page === 'scheme' && !activeScheme && <EmptyPage title="Scheme not found" message="This demo record may have been removed." onAction={() => navigate('dashboard')} action="Back to schemes" />}
        {page === 'applications' && (
          <ApplicationsPage
            applications={sampleApplications}
            schemes={schemes}
            onUpdate={updateApplication}
            onExplore={() => navigate('dashboard')}
            onViewScheme={viewScheme}
          />
        )}
        {page === 'admin' && (
          <AdminPage
            schemes={schemes}
            name={adminName}
            description={adminDescription}
            income={adminIncome}
            onName={setAdminName}
            onDescription={setAdminDescription}
            onIncome={setAdminIncome}
            onAdd={addDemoScheme}
            onToggle={(id) => setSchemes((current) => current.map((scheme) => scheme.id === id ? { ...scheme, active: !scheme.active } : scheme))}
            onDelete={(id) => setSchemes((current) => current.filter((scheme) => scheme.id !== id))}
            onUpdate={(id, patch) => setSchemes((current) => current.map((scheme) => scheme.id === id ? { ...scheme, ...patch } : scheme))}
          />
        )}
        {page === 'privacy' && <PrivacyPage onReset={resetDemoData} onAdmin={() => navigate('admin')} />}
      </main>

      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button>
        </div>
      )}

      <footer className="site-footer">
        <div className="footer-inner">
          <span className="footer-brand"><span className="brand-mark small">cw</span> Claim What’s Yours</span>
          <span>Independent demo. Always verify scheme details with an official source.</span>
          <div className="footer-links">
            <button type="button" onClick={() => navigate('privacy')}>Privacy</button>
            <button type="button" onClick={() => navigate('admin')}>Admin demo</button>
          </div>
        </div>
      </footer>
    </div>
  )
}

function LandingPage({ onStart, onHow }: { onStart: () => void; onHow: () => void }) {
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> A simpler way to find student support</div>
          <h1>Claim what’s<br /><span>yours.</span></h1>
          <p className="hero-lede">Tell us about your situation. We’ll help you discover government schemes you may be eligible for.</p>
          <div className="hero-actions">
            <button className="button button-primary" type="button" onClick={onStart}>Find my schemes <span aria-hidden="true">→</span></button>
            <button className="button button-quiet" type="button" onClick={onHow}><span className="play-icon">▶</span> How it works</button>
          </div>
          <div className="trust-row"><span className="trust-icon">✓</span> No Aadhaar, PAN, or bank details needed <span className="trust-separator">·</span> Takes about 2 minutes</div>
        </div>
        <div className="hero-art" aria-label="Illustration of a student exploring support options" role="img">
          <div className="art-sun" />
          <div className="art-building"><span /><span /><span /><span /><i /></div>
          <div className="art-person"><div className="person-head" /><div className="person-body" /><div className="person-book" /></div>
          <div className="floating-card card-check"><span className="mini-check">✓</span><span><b>Clear next steps</b><small>One at a time</small></span></div>
          <div className="floating-card card-match"><span className="sparkle">✳</span><span><b>Possible matches</b><small>With reasons you can see</small></span></div>
          <div className="art-ground" />
        </div>
      </section>

      <section className="proof-strip">
        <div><span className="proof-icon">◎</span><span><b>Made for students</b><small>Starting with Karnataka</small></span></div>
        <div><span className="proof-icon">⌕</span><span><b>Plain-language guidance</b><small>No confusing forms to start</small></span></div>
        <div><span className="proof-icon">◇</span><span><b>Your data stays yours</b><small>Saved on this device in demo mode</small></span></div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-heading">
          <span className="section-kicker">A little help goes a long way</span>
          <h2>From “where do I start?”<br />to a clear next step.</h2>
          <p>No middlemen. No guesswork. Just guidance you can understand.</p>
        </div>
        <div className="steps-grid">
          <Step number="01" icon="✎" title="Tell us about yourself" text="Describe your situation in everyday words. Share only what is needed." />
          <Step number="02" icon="⌕" title="See what may fit" text="Get possible scheme matches with the rules and missing details shown." />
          <Step number="03" icon="↗" title="Move forward confidently" text="Use a document checklist, application guide, and personal tracker." />
        </div>
      </section>

      <section className="privacy-callout">
        <div className="privacy-shield">✓</div>
        <div><span className="section-kicker">Your privacy matters</span><h2>We don’t need your ID to help you get started.</h2><p>Never enter Aadhaar, PAN, bank account numbers, OTPs, or passwords. This demo keeps the profile you enter in your browser only.</p></div>
        <button className="text-button" type="button" onClick={onStart}>Explore in demo <span>→</span></button>
      </section>
      <div className="demo-disclaimer"><span>i</span><p><strong>Prototype notice:</strong> Scheme records in this demo are illustrative examples, not verified government benefits. No official application is submitted here.</p></div>
    </>
  )
}

function Step({ number, icon, title, text }: { number: string; icon: string; title: string; text: string }) {
  return <article className="step-card"><div className="step-top"><span className="step-icon">{icon}</span><span className="step-number">{number}</span></div><h3>{title}</h3><p>{text}</p></article>
}

function Onboarding({
  step,
  profile,
  description,
  onDescription,
  onExtract,
  onSample,
  onField,
  onBack,
  onContinue,
}: {
  step: OnboardingStep
  profile: CitizenProfile
  description: string
  onDescription: (value: string) => void
  onExtract: (event: FormEvent<HTMLFormElement>) => void
  onSample: () => void
  onField: <K extends keyof CitizenProfile>(field: K, value: CitizenProfile[K]) => void
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <section className="onboarding-page page-container">
      <button className="back-link" type="button" onClick={onBack}>← Back</button>
      <div className="onboarding-layout">
        <div className="onboarding-main">
          <div className="progress-label"><span>YOUR PROFILE</span><span>Step {step === 'describe' ? '1' : '2'} of 2</span></div>
          <div className="progress-track"><span style={{ width: step === 'describe' ? '50%' : '100%' }} /></div>
          {step === 'describe' ? (
            <>
              <span className="section-kicker">Let’s get to know you</span>
              <h1 className="page-title">Start with your story.</h1>
              <p className="page-intro">Tell us a little about your studies and situation. Write naturally — you don’t need to know the right words.</p>
              <form onSubmit={onExtract}>
                <label className="field-label" htmlFor="situation">What would you like help with?</label>
                <div className="chat-input-wrap">
                  <textarea id="situation" maxLength={500} value={description} onChange={(event) => onDescription(event.target.value)} placeholder="For example: I’m studying B.Tech in Karnataka. My family earns around ₹2.5 lakh a year and I’m looking for help with education costs." rows={5} />
                  <div className="input-tools"><span>⌘ &nbsp; Voice input is coming soon</span><span>{description.length}/500</span></div>
                </div>
                <div className="privacy-inline"><span className="privacy-shield tiny">✓</span><span>Please don’t include Aadhaar, PAN, bank details, OTPs, or passwords.</span></div>
                <div className="form-actions"><button className="button button-primary" type="submit" disabled={!description.trim()}>Review my details <span>→</span></button><button className="text-button" type="button" onClick={onSample}>Try a sample student profile</button></div>
              </form>
              <div className="demo-explainer"><span className="demo-label">DEMO MODE</span><p>This prototype uses a simple on-device text reader and illustrative scheme records. It does not send your information to an AI service.</p></div>
            </>
          ) : (
            <>
              <span className="section-kicker">Check before we match</span>
              <h1 className="page-title">Does this look right?</h1>
              <p className="page-intro">You can leave anything blank. We’ll show when a scheme needs more information.</p>
              <div className="profile-form">
                <div className="field-grid">
                  <label className="field-label">Age <input type="number" min="14" max="120" value={profile.age ?? ''} onChange={(event) => onField('age', event.target.value ? Number(event.target.value) : undefined)} placeholder="e.g. 20" /></label>
                  <label className="field-label">State <input value={profile.state ?? ''} onChange={(event) => onField('state', event.target.value)} placeholder="e.g. Karnataka" /></label>
                  <label className="field-label">District <input value={profile.district ?? ''} onChange={(event) => onField('district', event.target.value)} placeholder="Optional" /></label>
                  <label className="field-label">Education level <select value={profile.educationLevel ?? ''} onChange={(event) => onField('educationLevel', event.target.value as CitizenProfile['educationLevel'])}><option value="">Choose if you like</option><option>High school</option><option>Diploma</option><option>Undergraduate</option><option>Postgraduate</option><option>Other</option></select></label>
                  <label className="field-label">Course <input value={profile.course ?? ''} onChange={(event) => onField('course', event.target.value)} placeholder="e.g. B.Tech" /></label>
                  <label className="field-label">Institution type <select value={profile.institutionType ?? ''} onChange={(event) => onField('institutionType', event.target.value)}><option value="">Choose if you like</option><option>College</option><option>University</option><option>Government institution</option><option>Private institution</option><option>Other</option></select></label>
                  <label className="field-label">Approx. annual family income <div className="input-prefix"><span>₹</span><input type="number" min="0" value={profile.annualIncome ?? ''} onChange={(event) => onField('annualIncome', event.target.value ? Number(event.target.value) : undefined)} placeholder="e.g. 250000" /></div></label>
                  <label className="field-label">Category <select value={profile.category ?? ''} onChange={(event) => onField('category', event.target.value)}><option value="">Prefer not to say / not relevant</option><option>SC</option><option>ST</option><option>OBC</option><option>General</option><option>Other</option></select></label>
                  <label className="field-label">Gender <select value={profile.gender ?? ''} onChange={(event) => onField('gender', event.target.value)}><option value="">Prefer not to say / not relevant</option><option>Woman</option><option>Man</option><option>Non-binary</option><option>Prefer not to say</option></select></label>
                  <label className="field-label">Disability-related criterion <select value={profile.disability ?? ''} onChange={(event) => onField('disability', event.target.value)}><option value="">Not provided / not relevant</option><option>Yes</option><option>No</option></select></label>
                  <label className="field-label">First in your family to attend college? <select value={profile.firstGeneration ?? ''} onChange={(event) => onField('firstGeneration', event.target.value)}><option value="">Not provided / not relevant</option><option>Yes</option><option>No</option></select></label>
                </div>
                <div className="privacy-inline"><span className="privacy-shield tiny">✓</span><span>These details are saved only in this browser in the demo. No ID numbers are requested.</span></div>
                <div className="form-actions"><button className="button button-primary" type="button" onClick={onContinue}>See possible matches <span>→</span></button><button className="text-button" type="button" onClick={onBack}>Edit my description</button></div>
              </div>
            </>
          )}
        </div>
        <aside className="onboarding-aside">
          <div className="aside-icon">✳</div><h3>Only what helps.</h3><p>We use your details to compare against sample eligibility rules and explain what matched.</p>
          <ul><li><span>✓</span> Approximate income is enough</li><li><span>✓</span> Sensitive IDs are never needed</li><li><span>✓</span> You choose what to share</li></ul>
          <div className="aside-lock">⌑ <span>Your information stays in this browser.</span></div>
        </aside>
      </div>
    </section>
  )
}

function Dashboard({
  matches,
  applicationsCount,
  remindersCount,
  onEditProfile,
  onViewScheme,
  onApplications,
  onPrivacy,
}: {
  matches: ReturnType<typeof matchSchemes>
  applicationsCount: number
  remindersCount: number
  onEditProfile: () => void
  onViewScheme: (id: string) => void
  onApplications: () => void
  onPrivacy: () => void
}) {
  return (
    <section className="page-container dashboard-page">
      <div className="dashboard-welcome">
        <div><span className="section-kicker">YOUR STUDENT SUPPORT OVERVIEW</span><h1>Your Government Benefits</h1><p>Based on the information you shared, here are schemes you may qualify for.</p></div>
        <button className="button button-outline" type="button" onClick={onEditProfile}>Edit my profile <span>↗</span></button>
      </div>
      <div className="demo-banner"><span className="demo-label">DEMO DATA</span><p>These are illustrative records, not verified government schemes. Official sources and benefit details are unavailable in this prototype.</p><button type="button" onClick={onPrivacy}>Privacy details</button></div>
      <div className="summary-grid">
        <SummaryCard icon="✳" label="Possible matches" value={String(matches.length)} detail="Based on your profile" tone="sage" />
        <SummaryCard icon="▤" label="Documents to prepare" value={String(matches.reduce((sum, item) => sum + item.scheme.documents.length, 0))} detail="Across matched schemes" tone="lavender" />
        <SummaryCard icon="↗" label="In your applications" value={String(applicationsCount)} detail="Tracked on this device" tone="peach" onClick={onApplications} />
        <SummaryCard icon="◷" label="Reminders set" value={String(remindersCount)} detail="In-app demo reminders" tone="blue" onClick={onApplications} />
      </div>
      <div className="results-heading"><div><h2>Schemes you may qualify for</h2><p>We show the rules behind every match. Final eligibility is decided by the official authority.</p></div><span className="results-count">{matches.length} {matches.length === 1 ? 'result' : 'results'}</span></div>
      {matches.length ? (
        <div className="scheme-grid">
          {matches.map((match) => <SchemeCard key={match.scheme.id} match={match} onView={() => onViewScheme(match.scheme.id)} />)}
        </div>
      ) : (
        <div className="empty-state"><div className="empty-illustration">⌕</div><h3>No possible match yet</h3><p>We couldn't find a strong match based on the information provided. You can add more details or explore the available demo records.</p><button className="button button-primary" type="button" onClick={onEditProfile}>Add profile details <span>→</span></button></div>
      )}
      <div className="reasoning-note"><span className="reasoning-icon">i</span><p><strong>Transparent matching.</strong> “Strong match” means all sample rules were matched with the details provided. “Possible match” means some details are still missing. This is not a guarantee of eligibility.</p></div>
    </section>
  )
}

function SummaryCard({ icon, label, value, detail, tone, onClick }: { icon: string; label: string; value: string; detail: string; tone: string; onClick?: () => void }) {
  return <button type="button" className={`summary-card ${tone}`} onClick={onClick} disabled={!onClick}><span className="summary-icon">{icon}</span><span className="summary-content"><span>{label}</span><strong>{value}</strong><small>{detail}</small></span></button>
}

function SchemeCard({ match, onView }: { match: ReturnType<typeof matchSchemes>[number]; onView: () => void }) {
  const { scheme } = match
  return (
    <article className="scheme-card">
      <div className="scheme-card-top"><span className={`match-badge ${match.strength === 'Strong match' ? 'strong' : 'possible'}`}><span />{match.strength}</span><span className="sample-tag">SAMPLE</span></div>
      <h3>{scheme.name}</h3><p className="scheme-description">{scheme.description}</p>
      <div className="benefit-line"><span className="benefit-icon">✳</span><span><small>Potential support</small><strong>{scheme.benefit}</strong></span></div>
      <div className="scheme-card-meta"><span>Deadline <b>{formatDate(scheme.deadline)}</b></span><span>{match.matchedCount} rules matched</span></div>
      <div className="scheme-why"><span>WHY IT MAY FIT</span><p>{match.matchedCount} eligibility {match.matchedCount === 1 ? 'rule appears' : 'rules appear'} to match your profile{match.missingCount ? ` · ${match.missingCount} ${match.missingCount === 1 ? 'detail is' : 'details are'} still unknown` : ''}.</p></div>
      <button className="button button-card" type="button" onClick={onView}>View reasoning & details <span>→</span></button>
      <div className="card-source">Source not verified · Demo record</div>
    </article>
  )
}

function SchemeDetails({
  scheme,
  match,
  application,
  checklist,
  reminderEnabled,
  onBack,
  onAdd,
  onToggleReminder,
  onDocument,
  onNotice,
}: {
  scheme: Scheme
  match?: ReturnType<typeof matchSchemes>[number]
  application?: TrackedApplication
  checklist: DocumentChecklist
  reminderEnabled: boolean
  onBack: () => void
  onAdd: () => void
  onToggleReminder: () => void
  onDocument: (name: string, status: DocumentStatus) => void
  onNotice: (value: string) => void
}) {
  const documentStates: DocumentStatus[] = ['Not started', 'Ready', 'Prepared']
  return (
    <section className="page-container details-page">
      <button className="back-link" type="button" onClick={onBack}>← Back to possible matches</button>
      <div className="detail-header"><div><span className="section-kicker">SAMPLE SCHEME · NOT VERIFIED</span><h1 className="page-title">{scheme.name}</h1><p>{scheme.description}</p></div><span className={`match-badge ${match?.strength === 'Strong match' ? 'strong' : 'possible'}`}><span />{match?.strength ?? 'More information needed'}</span></div>
      <div className="detail-columns">
        <div className="detail-main">
          <section className="detail-panel"><div className="panel-title"><span className="panel-icon">✳</span><div><h2>About this sample record</h2><p>{scheme.benefit}</p></div></div><p>{scheme.targetGroup}. This record is illustrative only; its benefit, deadline, and criteria are not official information.</p><div className="source-warning"><span>!</span><p><strong>Official source unavailable.</strong> We have not verified this programme or its rules. Confirm details with a government or institution source before taking action.</p></div></section>
          <section className="detail-panel"><div className="panel-title"><span className="panel-icon">⌕</span><div><h2>Why you may qualify</h2><p>Here’s how your details compare with this record’s sample rules.</p></div></div>
            {match?.rules.length ? <div className="rule-table-wrap"><table className="rule-table"><thead><tr><th>Sample rule</th><th>Your information</th><th>Result</th></tr></thead><tbody>{match.rules.map((rule) => <tr key={rule.rule}><td>{rule.rule}</td><td>{rule.provided}</td><td><span className={`rule-result ${rule.result}`}>{rule.result === 'match' ? '✓ Match' : rule.result === 'miss' ? '× Not matched' : '? Unknown'}</span></td></tr>)}</tbody></table></div> : <p>No eligibility rules were provided for this sample record.</p>}
            {match?.missingCount ? <div className="missing-info"><span>!</span><p><strong>More information needed.</strong> Some details were not provided, so we couldn’t evaluate every sample rule. We have not guessed the missing information.</p></div> : null}
            <p className="eligibility-disclaimer">You may qualify based on these sample criteria. Only the official authority can determine final eligibility.</p>
          </section>
          <section className="detail-panel"><div className="panel-title"><span className="panel-icon">☷</span><div><h2>Your document checklist</h2><p>Track preparation on this device. No uploads are collected.</p></div></div><div className="document-list">{scheme.documents.map((name) => {
            const status = checklist[`${scheme.id}:${name}`] ?? 'Not started'
            return <div className="document-row" key={name}><span className={`document-check ${status !== 'Not started' ? 'done' : ''}`}>{status !== 'Not started' ? '✓' : ''}</span><span className="document-name">{name}</span><select aria-label={`Status for ${name}`} value={status} onChange={(event) => onDocument(name, event.target.value as DocumentStatus)}>{documentStates.map((item) => <option key={item}>{item}</option>)}</select></div>
          })}</div></section>
          <section className="detail-panel"><div className="panel-title"><span className="panel-icon">☰</span><div><h2>Application guide</h2><p>General steps only — this demo cannot submit an application.</p></div></div><ol className="application-steps">{scheme.steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol><button className="button button-disabled" type="button" disabled title="No official URL has been verified">Apply on official website <span>↗</span></button><p className="button-help">No verified official URL is available for this sample record.</p></section>
        </div>
        <aside className="detail-aside">
          <div className="aside-card deadline-card"><span className="section-kicker">SAMPLE DATE · NOT OFFICIAL</span><h3>Application deadline</h3><strong>{formatDate(scheme.deadline)}</strong><p>Confirm current dates from an official source.</p><button className={reminderEnabled ? 'button button-outline full-width' : 'button button-primary full-width'} type="button" onClick={onToggleReminder}>{reminderEnabled ? '✓ Reminder enabled' : 'Set an in-app reminder'}</button></div>
          <div className="aside-card"><span className="section-kicker">KEEP IT ORGANIZED</span><h3>{application ? 'Already in your tracker' : 'Want to keep track?'}</h3><p>Add this record to My Applications to track your own progress. It does not submit anything.</p><button className="button button-outline full-width" type="button" onClick={application ? () => onNotice('This sample record is already in My Applications.') : onAdd}>{application ? 'Added to My Applications' : 'Add to My Applications'}</button></div>
          <div className="verification-card"><span>◷</span><div><b>Verification status</b><small>Needs verification</small><small>Last verified: unavailable</small></div></div>
        </aside>
      </div>
    </section>
  )
}

function ApplicationsPage({
  applications,
  schemes,
  onUpdate,
  onExplore,
  onViewScheme,
}: {
  applications: TrackedApplication[]
  schemes: Scheme[]
  onUpdate: (id: string, patch: Partial<TrackedApplication>) => void
  onExplore: () => void
  onViewScheme: (id: string) => void
}) {
  return (
    <section className="page-container applications-page">
      <div className="dashboard-welcome"><div><span className="section-kicker">YOUR PERSONAL TRACKER</span><h1>My Applications</h1><p>Keep notes on your next steps. Your updates stay in this browser.</p></div><button className="button button-primary" type="button" onClick={onExplore}>Explore schemes <span>→</span></button></div>
      <div className="demo-banner"><span className="demo-label">PRIVATE TO THIS DEVICE</span><p>Tracker entries are saved locally for this prototype. They are not sent to any government portal.</p></div>
      {applications.length ? <div className="application-list">{applications.map((application) => {
        const scheme = schemes.find((item) => item.id === application.schemeId)
        if (!scheme) return null
        const activeIndex = Math.max(0, applicationStatuses.indexOf(application.status))
        return <article className="application-card" key={application.id}>
          <div className="application-card-heading"><div><span className="sample-tag">SAMPLE RECORD</span><h2>{scheme.name}</h2><button className="text-button" type="button" onClick={() => onViewScheme(scheme.id)}>View scheme details →</button></div><label className="status-control">Current status<select value={application.status} onChange={(event) => onUpdate(application.id, { status: event.target.value as ApplicationStatus })}>{applicationStatuses.map((status) => <option key={status}>{status}</option>)}</select></label></div>
          <div className="timeline" aria-label={`Progress status: ${application.status}`}><div className="timeline-line"><span style={{ width: `${application.status === 'Rejected' ? 0 : (activeIndex / (applicationStatuses.length - 1)) * 100}%` }} /></div>{timelineStatuses.map((step) => <div className={`timeline-step ${application.status === step ? 'current' : ''} ${applicationStatuses.indexOf(application.status) > applicationStatuses.indexOf(step) ? 'passed' : ''}`} key={step}><i>{applicationStatuses.indexOf(application.status) > applicationStatuses.indexOf(step) ? '✓' : ''}</i><span>{step}</span></div>)}</div>
          <div className="application-fields"><label>Application date<input type="date" value={application.applicationDate ?? ''} onChange={(event) => onUpdate(application.id, { applicationDate: event.target.value })} /></label><label>Expected deadline<input type="date" value={application.expectedDeadline ?? ''} onChange={(event) => onUpdate(application.id, { expectedDeadline: event.target.value })} /></label><label className="notes-field">Personal notes<textarea rows={2} maxLength={300} value={application.notes} onChange={(event) => onUpdate(application.id, { notes: event.target.value })} placeholder="A reminder for yourself (do not enter passwords or ID numbers)" /></label></div>
        </article>
      })}</div> : <EmptyPage title="Your tracker is ready when you are" message="Add a sample scheme to keep your documents, dates, and next steps in one place. Nothing is submitted from this demo." onAction={onExplore} action="Explore possible matches" />}
      <div className="deadline-reminder-section"><div><span className="section-kicker">DATES TO DOUBLE-CHECK</span><h2>Sample deadlines</h2><p>Dates are illustrative and may not reflect a real programme.</p></div>{applications.length ? applications.map((application) => {
        const scheme = schemes.find((item) => item.id === application.schemeId)
        return scheme ? <div className="deadline-row" key={application.id}><span className="deadline-calendar">◷</span><span><b>{scheme.name}</b><small>Sample date · {formatDate(application.expectedDeadline)}</small></span><span className="deadline-notice">Verify date</span></div> : null
      }) : <p className="no-deadlines">Add a scheme to see its sample date here.</p>}</div>
    </section>
  )
}

function EmptyPage({ title, message, onAction, action }: { title: string; message: string; onAction: () => void; action: string }) {
  return <div className="empty-state"><div className="empty-illustration">◇</div><h3>{title}</h3><p>{message}</p><button className="button button-primary" type="button" onClick={onAction}>{action} <span>→</span></button></div>
}

function AdminPage({
  schemes,
  name,
  description,
  income,
  onName,
  onDescription,
  onIncome,
  onAdd,
  onToggle,
  onDelete,
  onUpdate,
}: {
  schemes: Scheme[]
  name: string
  description: string
  income: string
  onName: (value: string) => void
  onDescription: (value: string) => void
  onIncome: (value: string) => void
  onAdd: (event: FormEvent<HTMLFormElement>) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Scheme>) => void
}) {
  const [editingId, setEditingId] = useState<string>()
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editIncome, setEditIncome] = useState('')

  function beginEdit(scheme: Scheme) {
    setEditingId(scheme.id)
    setEditName(scheme.name)
    setEditDescription(scheme.description)
    setEditIncome(scheme.incomeLimit?.toString() ?? '')
  }

  function saveEdit(scheme: Scheme) {
    const trimmedName = editName.trim()
    if (!trimmedName) return
    onUpdate(scheme.id, {
      name: trimmedName,
      description: editDescription.trim(),
      incomeLimit: editIncome ? Number(editIncome) : undefined,
    })
    setEditingId(undefined)
  }

  return (
    <section className="page-container admin-page">
      <div className="dashboard-welcome"><div><span className="section-kicker">LOCAL DEMO TOOLS</span><h1>Scheme management</h1><p>Manage illustrative scheme records saved in this browser.</p></div><span className="demo-pill"><span /> Admin demo</span></div>
      <div className="source-warning"><span>!</span><p><strong>Not a secure admin area.</strong> This frontend-only prototype has no login or server authorization. Changes are local to this browser and must not be used to publish unverified scheme information.</p></div>
      <form className="admin-add-form" onSubmit={onAdd}><div><span className="section-kicker">ADD A LOCAL SAMPLE RECORD</span><h2>Create a demo scheme</h2></div><label>Scheme name<input required value={name} onChange={(event) => onName(event.target.value)} placeholder="Example: Local student support" /></label><label>Short description<textarea rows={2} value={description} onChange={(event) => onDescription(event.target.value)} placeholder="Clearly describe this as an unverified sample." /></label><label>Sample income limit (₹ per year)<input type="number" min="0" value={income} onChange={(event) => onIncome(event.target.value)} placeholder="Optional" /></label><button className="button button-primary" type="submit">Add sample record <span>+</span></button></form>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Scheme record</th><th>Verification</th><th>Status</th><th>Actions</th></tr></thead><tbody>{schemes.map((scheme) => <tr key={scheme.id}><td>{editingId === scheme.id ? <div className="admin-edit-fields"><input aria-label="Edit scheme name" value={editName} onChange={(event) => setEditName(event.target.value)} /><textarea aria-label="Edit scheme description" rows={2} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} /><input aria-label="Edit sample income limit" type="number" min="0" value={editIncome} onChange={(event) => setEditIncome(event.target.value)} placeholder="Income limit (optional)" /></div> : <><b>{scheme.name}</b><small>{scheme.state} · {scheme.sourceName}</small></>}</td><td><span className="verification-status">Needs verification</span></td><td>{scheme.active ? 'Active in demo' : 'Inactive'}</td><td><div className="table-actions">{editingId === scheme.id ? <><button type="button" onClick={() => saveEdit(scheme)}>Save</button><button type="button" onClick={() => setEditingId(undefined)}>Cancel</button></> : <><button type="button" onClick={() => beginEdit(scheme)}>Edit</button><button type="button" onClick={() => onToggle(scheme.id)}>{scheme.active ? 'Deactivate' : 'Activate'}</button><button type="button" onClick={() => onDelete(scheme.id)} aria-label={`Delete ${scheme.name}`}>Delete</button></>}</div></td></tr>)}</tbody></table></div>
    </section>
  )
}

function PrivacyPage({ onReset, onAdmin }: { onReset: () => void; onAdmin: () => void }) {
  return (
    <section className="page-container privacy-page">
      <span className="section-kicker">YOUR INFORMATION</span><h1 className="page-title">Privacy & settings</h1><p className="page-intro">This is a browser-only prototype. There is no account, backend, or external AI service connected.</p>
      <div className="privacy-setting-list">
        <article className="privacy-setting"><span className="setting-icon">⌑</span><div><h2>Saved on this device</h2><p>Your profile, checklist, reminders, and application notes use this browser’s local storage. Clearing browser data removes them.</p></div><span className="setting-state">On this device</span></article>
        <article className="privacy-setting"><span className="setting-icon">⊘</span><div><h2>Sensitive ID information</h2><p>We never ask for Aadhaar, PAN, bank account numbers, OTPs, or passwords. Do not enter these in free-text fields.</p></div><span className="setting-state">Not collected</span></article>
        <article className="privacy-setting"><span className="setting-icon">◷</span><div><h2>Reminders</h2><p>Reminders are labels shown inside this demo only. Browser notifications and email reminders are not connected.</p></div><span className="setting-state">In-app only</span></article>
        <article className="privacy-setting"><span className="setting-icon">✳</span><div><h2>Scheme information</h2><p>All included records are sample data. No official URLs or verification dates are claimed.</p></div><span className="setting-state">Sample data</span></article>
      </div>
      <div className="privacy-actions"><button className="button button-outline" type="button" onClick={onAdmin}>Open admin demo</button><button className="button button-danger" type="button" onClick={onReset}>Clear my demo data</button></div>
    </section>
  )
}

export default App
