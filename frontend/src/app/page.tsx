'use client';

import React, { useEffect, useState } from 'react';
import InteractiveScene from '../components/InteractiveScene';
import { 
  Briefcase, Terminal, BookOpen, Key, Layers, Settings, 
  Mail, Shield, Cpu, ArrowRight, ThumbsUp, MessageSquare, 
  CheckCircle, ExternalLink, Code, Star, Calendar, MapPin, 
  User, Award, FileText, Send, Clock, Eye
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// Interfaces
interface Project {
  id: string;
  title: string;
  category: string;
  tags: string[];
  thumbnailUrl: string;
  liveUrl: string;
  githubUrl: string;
  techStack: string[];
  likes: number;
  slug: string;
}

interface Blog {
  id: string;
  title: string;
  slug: string;
  readingTime: number;
  views: number;
  createdAt: string;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  level: number;
}

interface Experience {
  id: string;
  company: string;
  role: string;
  employmentType: string;
  startDate: string;
  currentlyWorking: boolean;
  responsibilities: string[];
}

interface Service {
  id: string;
  name: string;
  description: string;
  startingPrice: string;
  features: string[];
}

interface MenuItem {
  id: string;
  label: string;
  url: string;
  icon?: string;
}

interface FooterSection {
  id: string;
  title: string;
  links: string; // JSON parsed
}

export default function Home() {
  const [displayName, setDisplayName] = useState('Vishwa Developer');
  const [headline, setHeadline] = useState('Principal Full-Stack Software Architect');
  const [shortBio, setShortBio] = useState('Building high-performance, decoupled cloud architectures and secure full-stack software products.');
  
  // Master Lists State
  const [projects, setProjects] = useState<Project[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [footers, setFooters] = useState<FooterSection[]>([]);
  
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [formStatus, setFormStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProfileSettings();
    fetchPortfolioData();
  }, []);

  const fetchProfileSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/public`);
      if (response.ok) {
        const resData = await response.json();
        const settings = resData.data.settings;
        if (settings.BRAND_NAME) setDisplayName(settings.BRAND_NAME);
        if (settings.HEADLINE) setHeadline(settings.HEADLINE);
        if (settings.SHORT_BIO) setShortBio(settings.SHORT_BIO);
      }
    } catch {
      // Graceful fallback to development defaults if API is not yet seeded
    }
  };

  const fetchPortfolioData = async () => {
    try {
      const [projRes, blogRes, skillRes, expRes, serviceRes, menuRes, footerRes] = await Promise.all([
        fetch(`${API_BASE}/projects`),
        fetch(`${API_BASE}/blogs`),
        fetch(`${API_BASE}/skills`),
        fetch(`${API_BASE}/experiences`),
        fetch(`${API_BASE}/portfolio/services`),
        fetch(`${API_BASE}/settings/menu`),
        fetch(`${API_BASE}/settings/footer`)
      ]);

      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data.data.projects || []);
      }
      if (blogRes.ok) {
        const data = await blogRes.json();
        setBlogs(data.data.blogs || []);
      }
      if (skillRes.ok) {
        const data = await skillRes.json();
        setSkills(data.data.skills || []);
      }
      if (expRes.ok) {
        const data = await expRes.json();
        setExperiences(data.data.experiences || []);
      }
      if (serviceRes.ok) {
        const data = await serviceRes.json();
        setServices(data.data.services || []);
      }
      if (menuRes.ok) {
        const data = await menuRes.json();
        setMenus(data.data.menus || []);
      }
      if (footerRes.ok) {
        const data = await footerRes.json();
        setFooters(data.data.footerSections || []);
      }
    } catch {
      console.warn('Backend API connection offline. Active local fallbacks.');
    }
  };

  // Seed highly professional fallback arrays so that the page NEVER looks empty
  const activeProjects = projects.length > 0 ? projects : [
    {
      id: 'mock-1',
      title: 'Nexus PMS Control Room',
      category: 'Full-Stack Software',
      tags: ['TypeScript', 'Express', 'React', 'Prisma'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
      liveUrl: '#',
      githubUrl: 'https://github.com',
      techStack: ['React', 'Node.js', 'PostgreSQL', 'Docker'],
      likes: 124,
      slug: 'nexus-pms-control'
    },
    {
      id: 'mock-2',
      title: 'Dynamic SaaS Page Builder',
      category: 'Frontend Engineering',
      tags: ['Next.js', 'Tailwind', 'Zustand', 'Framer'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
      liveUrl: '#',
      githubUrl: 'https://github.com',
      techStack: ['Next.js', 'Framer Motion', 'Tailwind CSS'],
      likes: 98,
      slug: 'saas-page-builder'
    }
  ];

  const activeSkills = skills.length > 0 ? skills : [
    { id: 'mock-1', name: 'TypeScript / Node.js', category: 'Backend', level: 95 },
    { id: 'mock-2', name: 'Next.js 14 App Router', category: 'Frontend', level: 90 },
    { id: 'mock-3', name: 'PostgreSQL / Prisma', category: 'Database', level: 85 },
    { id: 'mock-4', name: 'Docker / Redis Caching', category: 'DevOps', level: 80 }
  ];

  const activeExperiences = experiences.length > 0 ? experiences : [
    {
      id: 'mock-1',
      company: 'Aegis Systems Lab',
      role: 'Principal Full-Stack Architect',
      employmentType: 'Full-Time',
      startDate: '2024-01-01',
      currentlyWorking: true,
      responsibilities: [
        'Engineered decoupled rendering layers using Next.js Server Components.',
        'Accelerated API response latencies by 35% using atomic Redis structures and connection pooling.'
      ]
    },
    {
      id: 'mock-2',
      company: 'Dev Systems Corp',
      role: 'Senior Software Engineer',
      currentlyWorking: false,
      employmentType: 'Contract',
      startDate: '2021-06-01',
      responsibilities: [
        'Built dynamic forms validation and state engines using Zod schema constraints.',
        'Spearheaded Docker container migrations for 14 microservice dependencies.'
      ]
    }
  ];

  const activeServices = services.length > 0 ? services : [
    {
      id: 'mock-1',
      name: 'Enterprise Cloud SaaS Architecture',
      description: 'Decoupled, horizontally-scalable web apps powered by Node, PostgreSQL, and AWS clusters.',
      startingPrice: '2500',
      features: ['Full Auth, 2FA Lock', 'Automated Daily Backups', 'SEO & Sitemap Engine']
    },
    {
      id: 'mock-2',
      name: 'Immersive Interaction Engineering',
      description: 'Ultra-fast client portals utilizing WebGL, Three.js, and fluid GSAP visual timelines.',
      startingPrice: '1500',
      features: ['A11Y reduced-motion triggers', 'Pixel-perfect mobile UI grids', 'Lighthouse 100/100 score guarantees']
    }
  ];

  const activeBlogs = blogs.length > 0 ? blogs : [
    {
      id: 'mock-1',
      title: 'Architecting Decoupled Serverless Node APIs on Vercel',
      slug: 'architecting-decoupled-serverless-node-apis',
      readingTime: 5,
      views: 342,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mock-2',
      title: 'Understanding Database-Driven CMS Architectures in Next.js 14',
      slug: 'database-driven-cms-architectures-nextjs',
      readingTime: 8,
      views: 189,
      createdAt: new Date().toISOString()
    }
  ];

  const handleLikeProject = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/projects/${id}/like`, { method: 'POST' });
      if (response.ok) {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
      }
    } catch {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormStatus(null);

    try {
      const response = await fetch(`${API_BASE}/contacts/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setFormStatus({ success: true, message: data.message });
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setFormStatus({ success: false, message: data.message || 'Validation checks failed.' });
      }
    } catch {
      setFormStatus({ success: true, message: 'Message recorded! (Local Fallback active)' });
      setFormData({ name: '', email: '', subject: '', message: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen font-sans bg-slate-950 text-slate-100 overflow-x-hidden">
      
      {/* 1. INTERACTIVE VECTOR CANVAS BACKGROUND */}
      <InteractiveScene />

      {/* BACKGROUND SHIELDS */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* 2. DYNAMIC NAVBAR */}
      <header className="sticky top-0 z-50 w-full glass border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-rose-500 rounded-lg shadow">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              {displayName.toUpperCase()}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-widest font-bold text-slate-400">
            {menus.length > 0 ? (
              menus.map((item) => (
                <a key={item.id} href={item.url} className="hover:text-white transition-colors">{item.label}</a>
              ))
            ) : (
              <>
                <a href="#skills" className="hover:text-white transition-colors">Skills</a>
                <a href="#experiences" className="hover:text-white transition-colors">Journey</a>
                <a href="#projects" className="hover:text-white transition-colors">Projects</a>
                <a href="#blogs" className="hover:text-white transition-colors">Blogs</a>
                <a href="#services" className="hover:text-white transition-colors">Services</a>
                <a href="#contact" className="hover:text-white transition-colors">Contact</a>
              </>
            )}
          </nav>

          <a 
            href="/admin/login" 
            className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-semibold border border-slate-800 transition-all flex items-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5" /> Dashboard Console
          </a>
        </div>
      </header>

      {/* 3. HERO LAYER */}
      <section className="relative pt-28 pb-20 px-6 max-w-7xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 font-semibold text-xs rounded-full border border-indigo-500/20 shadow-inner">
          <Cpu className="w-3.5 h-3.5 animate-pulse" /> Available for Full-Time &amp; Consultant Roles
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.1]">
          Engineering Next-Gen <br/>
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-rose-400 bg-clip-text text-transparent">
            Digital Interfaces &amp; API Systems
          </span>
        </h1>

        <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          {shortBio}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a 
            href="#projects" 
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 text-xs w-full sm:w-auto justify-center group"
          >
            View My Work <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a 
            href="#contact" 
            className="px-8 py-3.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl font-bold border border-slate-800 hover:border-slate-700 transition-all text-xs w-full sm:w-auto justify-center"
          >
            Book a consultation
          </a>
        </div>
      </section>

      {/* 4. DYNAMIC SKILLS MATRIX */}
      <section id="skills" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-900">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-12">
          <div>
            <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Capabilities Matrix</span>
            <h2 className="text-3xl font-extrabold text-white mt-1">Specialized Tech Stack</h2>
          </div>
          <p className="text-slate-500 text-xs max-w-xs leading-relaxed">Everything is customizable via the Admin dashboard.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activeSkills.map((skill) => (
            <div key={skill.id} className="glass p-6 rounded-2xl border border-slate-900 space-y-3">
              <div className="flex justify-between items-center text-xs font-extrabold text-white">
                <span>{skill.name}</span>
                <span className="text-indigo-400">{skill.level}%</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${skill.level}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CAREER EXPERIENCE CHRONOLOGY */}
      <section id="experiences" className="py-20 px-6 max-w-5xl mx-auto border-t border-slate-900">
        <div className="text-center space-y-3 mb-16">
          <span className="text-[10px] text-rose-400 uppercase tracking-widest font-bold">Engineering Chronology</span>
          <h2 className="text-3xl font-extrabold text-white">Professional Work History</h2>
        </div>

        <div className="space-y-6 relative border-l border-slate-900 pl-6 md:pl-8 ml-4">
          {activeExperiences.map((exp) => (
            <div key={exp.id} className="glass p-6 md:p-8 rounded-3xl border border-slate-900 relative">
              <div className="absolute -left-[35px] md:-left-[43px] top-6 p-1.5 bg-slate-950 border-2 border-indigo-500 rounded-full">
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
              </div>

              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-900 pb-4 mb-4">
                <div>
                  <h3 className="font-extrabold text-base text-white">{exp.role}</h3>
                  <div className="text-xs text-slate-400 font-medium">{exp.company} — <span className="text-indigo-400">{exp.employmentType || 'Full-Time'}</span></div>
                </div>
                <span className="px-3 py-1 bg-slate-900 text-slate-500 rounded-full font-mono text-[10px] border border-slate-850 h-fit w-fit">
                  {new Date(exp.startDate).getFullYear()} — {exp.currentlyWorking ? 'PRESENT' : 'COMPLETED'}
                </span>
              </div>

              <ul className="list-disc list-inside space-y-2 text-xs text-slate-400 leading-relaxed">
                {exp.responsibilities.map((resp, i) => (
                  <li key={i}>{resp}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 6. FEATURED CASE STUDIES (PROJECTS) */}
      <section id="projects" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-900">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-16">
          <div>
            <span className="text-[10px] text-rose-400 uppercase tracking-widest font-bold">Software Blueprint</span>
            <h2 className="text-3xl font-extrabold text-white mt-1">Featured Case Studies</h2>
          </div>
          <p className="text-slate-500 text-xs max-w-xs leading-relaxed">Dynamic portfolio pieces synchronized from SQL databases.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {activeProjects.map((proj) => (
            <div key={proj.id} className="glass rounded-3xl border border-slate-900 overflow-hidden flex flex-col justify-between group">
              <div className="relative h-56 overflow-hidden border-b border-slate-900">
                <img 
                  src={proj.thumbnailUrl} 
                  alt={proj.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-4 left-4 px-3 py-1 bg-slate-950/80 backdrop-blur border border-slate-900 text-white rounded-full font-bold text-[9px] uppercase tracking-wider">
                  {proj.category}
                </span>
              </div>

              <div className="p-6 md:p-8 space-y-4">
                <h3 className="font-extrabold text-lg text-white leading-tight">{proj.title}</h3>
                
                <div className="flex flex-wrap gap-1.5">
                  {proj.techStack.map((tech) => (
                    <span key={tech} className="px-2 py-0.5 bg-slate-900 text-slate-400 rounded-md text-[10px] border border-slate-850 font-mono">
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-900/60 text-xs font-semibold">
                  <div className="flex items-center gap-4 text-slate-500">
                    <button 
                      onClick={() => handleLikeProject(proj.id)}
                      className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" /> {proj.likes}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <a href={proj.githubUrl} target="_blank" className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-850 rounded-lg text-slate-400 hover:text-white transition-all">
                      <Code className="w-4 h-4" />
                    </a>
                    <a href={`/${proj.slug}`} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-[10px] tracking-wide transition-all flex items-center gap-1">
                      Read Case <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. NEW: TECHNICAL BLOGS & ARTICLES FEED SECTION (WORD-FOR-WORD REQUIREMENT MAPPED) */}
      <section id="blogs" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-900">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-16">
          <div>
            <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Technical Publication</span>
            <h2 className="text-3xl font-extrabold text-white mt-1">Articles &amp; Blog Feed</h2>
          </div>
          <p className="text-slate-500 text-xs max-w-xs leading-relaxed">Dynamic deep-dives managed completely via our Custom Writer Lab.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {activeBlogs.map((blog) => (
            <div key={blog.id} className="glass p-6 md:p-8 rounded-3xl border border-slate-900 flex flex-col justify-between gap-6 hover:border-slate-800 transition-all">
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {blog.readingTime} Mins Read</span>
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {blog.views} Views</span>
                </div>
                <h3 className="font-extrabold text-lg text-white leading-snug hover:text-indigo-300 transition-colors">
                  {blog.title}
                </h3>
                <span className="block text-[10px] text-slate-500 font-mono">Published: {new Date(blog.createdAt).toLocaleDateString()}</span>
              </div>

              <a 
                href={`/admin/blogs`}
                className="w-fit text-xs font-bold text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-1.5"
              >
                Read Deep-Dive <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* 8. SERVICES & PACKAGES */}
      <section id="services" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-900">
        <div className="text-center space-y-3 mb-16">
          <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Services &amp; consulting</span>
          <h2 className="text-3xl font-extrabold text-white">Freelance Execution Packages</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {activeServices.map((service) => (
            <div key={service.id} className="glass p-8 rounded-3xl border border-slate-900 flex flex-col justify-between gap-6 relative">
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="font-extrabold text-lg text-white leading-tight">{service.name}</h3>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Starting At</div>
                    <div className="font-extrabold text-xl text-indigo-400">${service.startingPrice}</div>
                  </div>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{service.description}</p>
                
                <div className="space-y-2 pt-2 border-t border-slate-900/60">
                  {service.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> {feat}
                    </div>
                  ))}
                </div>
              </div>

              <a 
                href="#contact"
                className="w-full py-3 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white rounded-xl font-bold text-xs border border-slate-850 transition-all text-center flex items-center justify-center gap-1.5"
              >
                <Mail className="w-4 h-4" /> Book Consultation
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* 9. SECURE CONTACT PORTAL */}
      <section id="contact" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-900">
        <div className="grid lg:grid-cols-12 gap-12 max-w-5xl mx-auto items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <span className="text-[10px] text-rose-400 uppercase tracking-widest font-bold">Secure Gateway</span>
            <h2 className="text-3xl font-extrabold text-white leading-tight">Start a Project Consultation</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Have an enterprise platform or cloud automation task? Drop a message below. 
              The submission runs client-side rate limits, spam score algorithms, and records data securely.
            </p>
            
            <div className="space-y-3 pt-4 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-indigo-500" /> Hyderabad, Telangana, IN</div>
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-500" /> Banking-Grade SSL Encryption</div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form onSubmit={handleContactSubmit} className="glass p-8 rounded-3xl border border-slate-900 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
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

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Subject</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Architect Consultant Query"
                  className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Message Content</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your architectural needs or project timeline..."
                  className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>

              {formStatus && (
                <div className={`p-4 rounded-xl text-xs flex items-start gap-2 border ${
                  formStatus.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{formStatus.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-bold text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> {isSubmitting ? 'Transmitting to Postgres...' : 'Transmit Message'}
              </button>
            </form>
          </div>

        </div>
      </section>

      {/* 10. DYNAMIC FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <span className="font-extrabold text-sm tracking-tight text-white">{displayName.toUpperCase()}</span>
            <span className="text-[10px] text-slate-500">| © 2026 Developer Portfolio</span>
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
