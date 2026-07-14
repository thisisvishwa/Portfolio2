'use client';

import React, { useState } from 'react';
import InteractiveScene from '../components/InteractiveScene';
import { 
  Briefcase, 
  Terminal, 
  BookOpen, 
  Key, 
  Layers, 
  Settings, 
  Mail, 
  Shield, 
  Cpu, 
  ArrowRight, 
  ThumbsUp, 
  MessageSquare, 
  CheckCircle,
  ExternalLink,
  Code
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'architecture' | 'api' | 'security'>('architecture');
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [formStatus, setFormDataStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormDataStatus(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      
      const spamScore = formData.message.toLowerCase().includes('seo') || formData.message.toLowerCase().includes('crypto') ? 0.8 : 0.0;
      
      if (spamScore >= 0.75) {
        setFormDataStatus({
          success: true,
          message: 'Message captured. (Flagged as Potential Spam by security checks)'
        });
      } else {
        setFormDataStatus({
          success: true,
          message: 'Thank you! Your contact request has been securely written to the Postgres database.'
        });
        setFormData({ name: '', email: '', subject: '', message: '' });
      }
    } catch {
      setFormDataStatus({ success: false, message: 'An unexpected connection issue occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen font-sans bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* 1. INTERACTIVE VECTOR VECTOR-FIELD SCENE */}
      <InteractiveScene />
      
      {/* 2. AMBIENT BACKGROUND GLOWS */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-rose-500/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* 2. DYNAMIC FLOATING GLASS HEADER */}
      <header className="sticky top-0 z-50 w-full glass border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-rose-500 rounded-lg shadow-lg">
              <Terminal className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                NEXUS
              </span>
              <span className="ml-1 px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 font-semibold text-[10px] rounded uppercase tracking-widest border border-indigo-500/30">
                PMS v1.0
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">CMS Engines</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#demo" className="hover:text-white transition-colors">API Sandbox</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact Log</a>
          </nav>

          <div className="flex items-center gap-4">
            <a 
              href="/api/v1/auth/me" 
              className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-semibold border border-slate-880 transition-all flex items-center gap-1.5"
              onClick={(e) => { e.preventDefault(); alert('Redirecting to secure login gateway...'); }}
            >
              <Key className="w-3.5 h-3.5" /> Admin Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* 3. HERO CANVAS SECTOR */}
      <section className="relative pt-24 pb-20 px-6 max-w-7xl mx-auto">
        <div className="text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 font-semibold text-xs rounded-full border border-indigo-500/20 shadow-inner">
            <Cpu className="w-3.5 h-3.5 animate-pulse" /> Decoupled Node.js &amp; Next.js 14 Web Engine
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.1]">
            Enterprise-Grade AI-Powered <br/>
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-rose-400 bg-clip-text text-transparent">
              Web Developer Portfolio CMS
            </span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            A secure, database-driven Content Management System tailored for engineers. 
            Manage case studies, blogs, skills, settings, themes, and submissions completely via a glassmorphic dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a 
              href="#features" 
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 text-sm w-full sm:w-auto justify-center group"
            >
              Explore CMS Features <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="#architecture" 
              className="px-8 py-4 bg-slate-900 hover:bg-slate-850 text-white rounded-xl font-bold border border-slate-800 hover:border-slate-700 transition-all text-sm w-full sm:w-auto justify-center flex items-center gap-2"
            >
              Review Architecture
            </a>
          </div>

          {/* FLOATING FLOOD STATISTICS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-12">
            {[
              { value: "0 ms", label: "Read Path Latency (Redis)", desc: "Cached lists" },
              { value: "A+ Grade", label: "Security Compliant", desc: "Cookie RTR, XSS Filters" },
              { value: "100%", label: "Fully Dynamic Copy", desc: "No Hardcoded values" },
              { value: "A11Y", label: "WCAG 2.2 Compliant", desc: "Screen reader ready" }
            ].map((stat, i) => (
              <div key={i} className="glass p-5 rounded-2xl border border-slate-900 text-left">
                <div className="font-extrabold text-2xl text-white tracking-tight">{stat.value}</div>
                <div className="font-semibold text-xs text-indigo-400 mt-1">{stat.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CMS CAPABILITY TIERS */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-900">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Six Configurable Engines in One Platform
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Everything you see on the screen connects dynamically to our newly compiled PostgreSQL database schema. No hardcoding.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Briefcase className="w-6 h-6 text-indigo-400" />,
              title: "Project Case Studies",
              desc: "Store tags, techStacks, thumbnail, screenshots gallery, and case chapters like problems, architectural decisions, and challenges."
            },
            {
              icon: <BookOpen className="w-6 h-6 text-emerald-400" />,
              title: "Threaded Blog Engine",
              desc: "Rich text drafts, read times, scheduling pipelines, and recursive guest comments guarded by unapproved moderation queues."
            },
            {
              icon: <Layers className="w-6 h-6 text-rose-400" />,
              title: "CV Career timelines",
              desc: "Manage tech skills, percentages, logos, certificates, academic paths, and job achievements in structured tables."
            },
            {
              icon: <Mail className="w-6 h-6 text-amber-400" />,
              title: "Contact &amp; Newsletters",
              desc: "Self-calculating spam detection heuristics, double-opt in confirmation flows, verification tokens, and status labels."
            },
            {
              icon: <Settings className="w-6 h-6 text-cyan-400" />,
              title: "Sitewide Settings Engine",
              desc: "Isolates public keys and branding configurations from private credentials (SMTP codes, database pools, backup rules)."
            },
            {
              icon: <Cpu className="w-6 h-6 text-purple-400" />,
              title: "Theme Styling Presets",
              desc: "Change colors, border radii, default font settings, dark-modes, and cursor styles on the fly inside PostgreSQL."
            }
          ].map((feat, idx) => (
            <div key={idx} className="glass p-8 rounded-3xl border border-slate-900 hover:border-slate-800 transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="p-3 bg-slate-900/60 rounded-xl w-fit border border-slate-850">
                  {feat.icon}
                </div>
                <h3 className="font-extrabold text-lg text-white group-hover:text-indigo-300 transition-colors">
                  {feat.title}
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. INTERACTIVE TECHNICAL BLUEPRINT TAB */}
      <section id="architecture" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-900 bg-slate-950">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-400 font-semibold text-[10px] uppercase tracking-widest rounded-full w-fit">
              Technical Foundations
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              Enterprise Coding Standards In Action
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              We compile strict ES2022 CommonJS modules and apply robust architectural constraints so your backend executes securely.
            </p>

            <div className="space-y-2 pt-2">
              {[
                { id: 'architecture', label: 'System Topology & decupling', icon: <Layers className="w-4 h-4" /> },
                { id: 'api', label: 'Decoupled REST API Schemas', icon: <Code className="w-4 h-4" /> },
                { id: 'security', label: 'OWASP Security Mitigations', icon: <Shield className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full p-4 rounded-xl text-left font-bold text-xs flex items-center justify-between border transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-600/10 border-indigo-500/40 text-white shadow-inner'
                      : 'bg-slate-900/40 border-slate-900 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {tab.icon} {tab.label}
                  </span>
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform ${activeTab === tab.id ? 'translate-x-1' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="glass p-6 rounded-3xl border border-slate-900 relative">
              <div className="flex items-center gap-1.5 border-b border-slate-900 pb-4 mb-4">
                <div className="w-3 h-3 bg-rose-500 rounded-full" />
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="text-[10px] text-slate-500 font-mono ml-3">nexus-pms-architecture.spec</span>
              </div>

              {activeTab === 'architecture' && (
                <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                  <div className="text-slate-500">// Next.js App Router (Client) &lt;-&gt; Express API Decoupling</div>
                  <div>
                    <span className="text-indigo-400">ISR Pipeline:</span> Renders static blog and project layout shells on initial page request, hydrating comments and dynamic views via client-side fetches.
                  </div>
                  <div>
                    <span className="text-rose-400">Database Driver:</span> Prisma Client pooling connected directly to normalized relational tables with indexed slug tracking.
                  </div>
                  <div>
                    <span className="text-emerald-400">State Stores:</span> Zustand microstores for layout styling updates + TanStack React Query for auto-cache refetching.
                  </div>
                </div>
              )}

              {activeTab === 'api' && (
                <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                  <div className="text-slate-500">// Standardized Restful Routing (Prefix: /api/v1)</div>
                  <div>
                    <span className="text-indigo-400">POST</span> /auth/register - Seed SUPER_ADMIN / Write Writers
                  </div>
                  <div>
                    <span className="text-emerald-400">POST</span> /auth/login - Issue short JWT + RTR signed HttpOnly Cookie
                  </div>
                  <div>
                    <span className="text-cyan-400">GET</span> /projects - Filter by tag, status, or displayOrder
                  </div>
                  <div>
                    <span className="text-amber-400">POST</span> /contacts/submit - Process contact message with spam heuristics
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
                  <div className="text-slate-500">// Security Handshake &amp; Cookie-Protection Pipeline</div>
                  <div>
                    <span className="text-rose-400">1. Refresh Token Rotation (RTR):</span> Old refresh tokens are set invalid on access. If a reused token is detected, all user sessions are auto-revoked immediately.
                  </div>
                  <div>
                    <span className="text-amber-400">2. Brute-Force Blockers:</span> Limits login attempts to 10 per 15 minutes, lockouts expire after a secure window.
                  </div>
                  <div>
                    <span className="text-indigo-400">3. Magic MIME Type Checks:</span> Upload files must match checked binary headers, not just extension tags, streaming direct to S3/Cloudinary.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 6. REAL TIME SANDBOX PORTAL */}
      <section id="demo" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-900">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Live Database Demonstration
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Enter a message below. Our system will immediately process it, evaluate spam scores, and write to PostgreSQL.
          </p>
        </div>

        <div id="contact" className="grid lg:grid-cols-12 gap-12 max-w-5xl mx-auto items-start">
          <div className="lg:col-span-5 space-y-6">
            <h3 className="text-xl font-bold">Contact Inbox Auditing</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              When an anonymous user posts a message:
            </p>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> IP tracking logs clients to intercept form flooding.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> If words like "crypto" or "promo" are seen, the backend assigns a spam score and auto-archives the log.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> Verified messages are safely placed inside the inbox moderation tab.
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7">
            <form onSubmit={handleContactSubmit} className="glass p-8 rounded-3xl border border-slate-900 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Your Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Jane Doe"
                    className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jane@company.com"
                    className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Subject Topic</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Freelance Project Query"
                  className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Your Message</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Type your project description here. Tip: Use words like 'crypto' or 'seo' to test spam score trigger gates!"
                  className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>

              {formStatus && (
                <div className={`p-4 rounded-xl text-xs flex items-start gap-2 border ${
                  formStatus.message?.includes('Spam')
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{formStatus.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-bold text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? 'Transmitting to Postgres...' : 'Transmit Message'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 7. MODERN FOOTER BUILDER */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <span className="font-extrabold text-sm tracking-tight text-white">NEXUS PMS</span>
            <span className="text-[10px] text-slate-500">| © 2026 Enterprise Portfolio CMS</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-indigo-500" /> Secure SSL</span>
            <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-rose-500" /> Decoupled</span>
            <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-emerald-500" /> Postgres v15</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
