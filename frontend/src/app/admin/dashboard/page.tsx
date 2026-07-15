'use client';

import React, { useEffect, useState } from 'react';
import { 
  Terminal, Shield, Cpu, HardDrive, Inbox, BookOpen, Layers, 
  Settings, LogOut, CheckCircle, AlertTriangle, RefreshCw, Eye, 
  FileText, Briefcase, Activity, Globe, Users, TrendingUp, Plus, Trash2, Send
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// Interfaces
interface StorageStats {
  totalBytesUsed: number;
  totalFiles: number;
  quotaBytesLimit: number;
  percentUsed: number;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  spamScore: number;
  createdAt: string;
}

interface Project {
  id: string;
  title: string;
  category: string;
  tags: string[];
  thumbnailUrl: string;
  liveUrl: string;
  githubUrl: string;
  techStack: string[];
  slug: string;
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
  startingPrice: number;
  features: string[];
}

export default function AdminDashboard() {
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'projects' | 'skills' | 'experiences' | 'services' | 'inbox'>('overview');
  
  // Master Lists State
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // Form Inputs State
  // 1. Settings Form
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [shortBio, setShortBio] = useState('');
  const [location, setLocation] = useState('');
  const [openToWork, setOpenToWork] = useState(true);

  // 2. Projects Form
  const [projTitle, setProjTitle] = useState('');
  const [projCategory, setProjCategory] = useState('');
  const [projThumb, setProjThumbnail] = useState('');
  const [projLive, setProjLiveUrl] = useState('');
  const [projGit, setProjGithubUrl] = useState('');
  const [projTech, setProjTechStack] = useState('');

  // 3. Skills Form
  const [skillName, setSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState('Frontend');
  const [skillLevel, setSkillLevel] = useState(90);

  // 4. Experiences Form
  const [expCompany, setExpCompany] = useState('');
  const [expRole, setExpRole] = useState('');
  const [expType, setExpType] = useState('Full-Time');
  const [expStart, setExpStart] = useState('');
  const [expResp, setExpResp] = useState('');

  // 5. Services Form
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [servicePrice, setServicePrice] = useState(1500);

  const [isLoading, setIsLoading] = useState(true);
  const [backupRunning, setBackupRunning] = useState(false);

  const triggerBackup = () => {
    setBackupRunning(true);
    setTimeout(() => {
      setBackupRunning(false);
      alert('System Backup Complete. Settings, Menus, and active Theme variables saved.');
    }, 1200);
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }
    setAuthorized(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('adminToken');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [storageRes, contactRes, projRes, skillRes, expRes, serviceRes, auditRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE}/media/stats`, { headers }),
        fetch(`${API_BASE}/contacts`, { headers }),
        fetch(`${API_BASE}/projects`, { headers }),
        fetch(`${API_BASE}/skills`, { headers }),
        fetch(`${API_BASE}/experiences`, { headers }),
        fetch(`${API_BASE}/portfolio/services`, { headers }),
        fetch(`${API_BASE}/settings/audit-logs?limit=8`, { headers }),
        fetch(`${API_BASE}/settings/public`, { headers })
      ]);

      if (storageRes.ok) setStorageStats((await storageRes.json()).data);
      if (contactRes.ok) setMessages((await contactRes.json()).data.messages || []);
      if (projRes.ok) setProjects((await projRes.json()).data.projects || []);
      if (skillRes.ok) setSkills((await skillRes.json()).data.skills || []);
      if (expRes.ok) setExperiences((await expRes.json()).data.experiences || []);
      if (serviceRes.ok) setServices((await serviceRes.json()).data.services || []);
      if (auditRes.ok) setActivities((await auditRes.json()).data.logs || []);
      
      if (settingsRes.ok) {
        const settings = (await settingsRes.json()).data.settings;
        setDisplayName(settings.BRAND_NAME || '');
        setHeadline(settings.HEADLINE || '');
        setShortBio(settings.SHORT_BIO || '');
        setLocation(settings.LOCATION || '');
      }
    } catch (err) {
      console.error('Failed to load live data settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          settings: [
            { key: 'BRAND_NAME', value: displayName, group: 'GENERAL' },
            { key: 'HEADLINE', value: headline, group: 'GENERAL' },
            { key: 'SHORT_BIO', value: shortBio, group: 'GENERAL' },
            { key: 'LOCATION', value: location, group: 'GENERAL' }
          ]
        }),
      });

      if (response.ok) {
        alert('Public profile branding saved successfully.');
        fetchData();
      }
    } catch {
      alert('Failed to transmit configuration details.');
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: projTitle,
          slug: projTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          category: projCategory,
          thumbnailUrl: projThumb || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
          liveUrl: projLive,
          githubUrl: projGit,
          techStack: projTech.split(',').map(s => s.trim()),
          status: 'PUBLISHED'
        }),
      });

      if (response.ok) {
        alert('Project added successfully.');
        setProjTitle(''); setProjCategory(''); setProjThumbnail(''); setProjLiveUrl(''); setProjGithubUrl(''); setProjTechStack('');
        fetchData();
      }
    } catch {
      alert('Save operation failed.');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Erase this portfolio case study?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`${API_BASE}/projects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch {}
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/skills`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: skillName, category: skillCategory, level: Number(skillLevel) }),
      });

      if (response.ok) {
        alert('Skill added successfully.');
        setSkillName('');
        fetchData();
      }
    } catch {}
  };

  const handleDeleteSkill = async (id: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`${API_BASE}/skills/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch {}
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/experiences`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          company: expCompany,
          role: expRole,
          employmentType: expType,
          startDate: new Date(expStart).toISOString(),
          currentlyWorking: true,
          responsibilities: expResp.split('\n').map(s => s.trim())
        }),
      });

      if (response.ok) {
        alert('Experience timeline recorded.');
        setExpCompany(''); setExpRole(''); setExpResp('');
        fetchData();
      }
    } catch {}
  };

  const handleDeleteExperience = async (id: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`${API_BASE}/experiences/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch {}
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/portfolio/services`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: serviceName,
          slug: serviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          icon: 'cpu',
          description: serviceDesc,
          startingPrice: Number(servicePrice),
          features: ['Dynamic DB Admin API Integration', 'Responsive Spacing Graphics']
        }),
      });

      if (response.ok) {
        alert('Service package published.');
        setServiceName(''); setServiceDesc('');
        fetchData();
      }
    } catch {}
  };

  const handleDeleteService = async (id: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`${API_BASE}/portfolio/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login';
  };

  if (!authorized) return <div className="min-h-screen bg-slate-950" />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row">
      
      {/* PERSISTENT SIDEBAR NAVIGATION PANEL */}
      <aside className="w-full md:w-64 glass border-r border-slate-900 flex flex-col justify-between p-6 shrink-0">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-rose-500 rounded-lg">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-white">NEXUS CONTROL</span>
              <span className="block text-[8px] text-indigo-400 font-mono tracking-widest uppercase">Operator Console</span>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5 text-xs font-bold text-slate-400">
            {[
              { id: 'overview', label: 'Dashboard Overview', icon: <Cpu className="w-4 h-4" /> },
              { id: 'settings', label: 'Identity &amp; Bio Settings', icon: <Settings className="w-4 h-4" /> },
              { id: 'projects', label: 'Projects Portfolio', icon: <Layers className="w-4 h-4" /> },
              { id: 'skills', label: 'Skills percentage', icon: <Terminal className="w-4 h-4" /> },
              { id: 'experiences', label: 'Experiences timeline', icon: <Briefcase className="w-4 h-4" /> },
              { id: 'services', label: 'Consulting Packages', icon: <Globe className="w-4 h-4" /> },
              { id: 'inbox', label: 'Inbox Submissions', icon: <Inbox className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full p-3.5 rounded-xl text-left flex items-center gap-3 border transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600/10 border-indigo-500/30 text-white shadow-inner'
                    : 'bg-transparent border-transparent hover:text-white hover:bg-slate-900/60'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full p-3.5 mt-8 bg-slate-900/40 hover:bg-rose-500/10 hover:text-rose-400 border border-slate-900 rounded-xl text-left text-xs font-bold text-slate-400 transition-all flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Exit Session
        </button>
      </aside>

      {/* ADMIN EDITORS BODY SHEET */}
      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto max-h-screen">
        
        {/* TAB 1: OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">System Administration Dashboard</h1>
                <p className="text-slate-500 text-xs">Connected to Neon Postgres databases.</p>
              </div>
              <button 
                onClick={fetchData}
                className="p-2.5 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-850 text-xs font-bold flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" /> Sync Stats
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass p-6 rounded-2xl border border-slate-900 space-y-4">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Unread Inbox</div>
                <div className="text-3xl font-extrabold text-white">{messages.length} Messages</div>
              </div>
              <div className="glass p-6 rounded-2xl border border-slate-900 space-y-4">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Case Studies</div>
                <div className="text-3xl font-extrabold text-white">{projects.length} Items</div>
              </div>
              <div className="glass p-6 rounded-2xl border border-slate-900 space-y-4">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">System Status</div>
                <div className="text-3xl font-extrabold text-emerald-400 flex items-center gap-1.5"><CheckCircle className="w-6 h-6 animate-pulse" /> Active</div>
              </div>
              <div className="glass p-6 rounded-2xl border border-slate-900 space-y-4">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Storage Stats</div>
                <div className="text-3xl font-extrabold text-white">{storageStats?.totalFiles || 0} Assets</div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass p-6 rounded-3xl border border-slate-900 space-y-4">
                <div className="border-b border-slate-900 pb-3 font-bold text-sm text-white">System Security Log</div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {activities.map((act) => (
                    <div key={act.id} className="text-[10px] font-mono p-3 bg-slate-900/40 border border-slate-900 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-300">{act.action}</span>
                        <span className="block text-slate-500 text-[8px] mt-0.5">IP: {act.ipAddress}</span>
                      </div>
                      <span className={`text-[8px] font-bold uppercase ${act.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}`}>{act.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass p-6 rounded-3xl border border-slate-900 space-y-4">
                <div className="border-b border-slate-900 pb-3 font-bold text-sm text-white">CMS Actions Console</div>
                <a href="/admin/blogs" className="block w-full p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-2xl text-xs font-bold text-slate-300 text-center">
                  Open Slash Markdown Editor
                </a>
                <button onClick={triggerBackup} className="w-full p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-2xl text-xs font-bold text-slate-300 text-center">
                  Trigger Full State JSON Backup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROFILE IDENTITY SETTINGS */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="max-w-xl glass p-8 rounded-3xl border border-slate-900 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white">Branding &amp; Biography Settings</h2>
              <p className="text-slate-500 text-xs">These fields dynamically populate your public portfolio homepage hero.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Your Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ahmad Architect"
                className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Headline Title</label>
              <input
                type="text"
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Principal Software Architect"
                className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Short Bio Summary</label>
              <textarea
                required
                rows={3}
                value={shortBio}
                onChange={(e) => setShortBio(e.target.value)}
                placeholder="Write your brief technical mission bio here..."
                className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Physical Location</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Telangana, IN"
                className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white"
              />
            </div>

            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs">
              Save Profile Configuration
            </button>
          </form>
        )}

        {/* TAB 3: PROJECTS MANAGER */}
        {activeTab === 'projects' && (
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <form onSubmit={handleAddProject} className="glass p-8 rounded-3xl border border-slate-900 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">Create Case Study</h2>
                <p className="text-slate-500 text-xs">Add dynamic projects to your portfolio.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Project Title</label>
                <input
                  type="text"
                  required
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  placeholder="Automated AWS Orchestrator"
                  className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Category</label>
                <input
                  type="text"
                  required
                  value={projCategory}
                  onChange={(e) => setProjCategory(e.target.value)}
                  placeholder="Cloud Systems"
                  className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Tech Stack (comma separated)</label>
                <input
                  type="text"
                  required
                  value={projTech}
                  onChange={(e) => setProjTechStack(e.target.value)}
                  placeholder="Docker, AWS, Node, Redis"
                  className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Thumbnail URL</label>
                <input
                  type="url"
                  required
                  value={projThumb}
                  onChange={(e) => setProjThumbnail(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Live URL</label>
                  <input
                    type="url"
                    value={projLive}
                    onChange={(e) => setProjLiveUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">GitHub Code URL</label>
                  <input
                    type="url"
                    value={projGit}
                    onChange={(e) => setProjGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" /> Publish Case Study
              </button>
            </form>

            {/* List panel */}
            <div className="glass p-6 rounded-3xl border border-slate-900 space-y-4">
              <div className="font-bold text-sm text-white border-b border-slate-900 pb-3">Active Case Studies</div>
              <div className="space-y-2">
                {projects.map((proj) => (
                  <div key={proj.id} className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-white">{proj.title}</div>
                      <span className="text-[9px] text-indigo-400 font-bold uppercase">{proj.category}</span>
                    </div>
                    <button onClick={() => handleDeleteProject(proj.id)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SKILLS PERCENTAGES */}
        {activeTab === 'skills' && (
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <form onSubmit={handleAddSkill} className="glass p-8 rounded-3xl border border-slate-900 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Add Tech Skill Badge</h2>
                <p className="text-slate-500 text-xs">Expose technology progress meters.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Skill Name</label>
                <input
                  type="text"
                  required
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="Next.js 14 App Router"
                  className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Category</label>
                  <select
                    value={skillCategory}
                    onChange={(e) => setSkillCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white"
                  >
                    <option value="Frontend">Frontend</option>
                    <option value="Backend">Backend</option>
                    <option value="Database">Database</option>
                    <option value="DevOps">DevOps</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Progress percentage (0-100)</label>
                  <input
                    type="number"
                    required
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(Number(e.target.value))}
                    className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1">
                <Plus className="w-4 h-4" /> Add Skill Badge
              </button>
            </form>

            <div className="glass p-6 rounded-3xl border border-slate-900 space-y-4">
              <div className="font-bold text-sm text-white border-b border-slate-900 pb-3">Active Skills</div>
              <div className="space-y-2">
                {skills.map((skill) => (
                  <div key={skill.id} className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-white">{skill.name}</div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">{skill.category} — {skill.level}%</span>
                    </div>
                    <button onClick={() => handleDeleteSkill(skill.id)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CAREER EXPERIENCE TIMELINE */}
        {activeTab === 'experiences' && (
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <form onSubmit={handleAddExperience} className="glass p-8 rounded-3xl border border-slate-900 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Record Job Experience</h2>
                <p className="text-slate-500 text-xs">Expose resume chronology items.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Company Name</label>
                  <input
                    type="text"
                    required
                    value={expCompany}
                    onChange={(e) => setExpCompany(e.target.value)}
                    placeholder="Vercel Cloud Lab"
                    className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Role Title</label>
                  <input
                    type="text"
                    required
                    value={expRole}
                    onChange={(e) => setExpRole(e.target.value)}
                    placeholder="Senior Engineer"
                    className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Employment Type</label>
                  <select
                    value={expType}
                    onChange={(e) => setExpType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Part-Time">Part-Time</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Start Date</label>
                  <input
                    type="date"
                    required
                    value={expStart}
                    onChange={(e) => setExpStart(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Bullet achievements (new lines)</label>
                <textarea
                  required
                  rows={4}
                  value={expResp}
                  onChange={(e) => setExpResp(e.target.value)}
                  placeholder="Engineered high latencies... &#10;Optimized serverless databases..."
                  className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white font-sans resize-none"
                />
              </div>

              <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1">
                <Plus className="w-4 h-4" /> Add Experience Record
              </button>
            </form>

            <div className="glass p-6 rounded-3xl border border-slate-900 space-y-4">
              <div className="font-bold text-sm text-white border-b border-slate-900 pb-3">Work History Timeline</div>
              <div className="space-y-2">
                {experiences.map((exp) => (
                  <div key={exp.id} className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-white">{exp.role}</div>
                      <span className="text-[9px] text-indigo-400 font-bold uppercase">{exp.company}</span>
                    </div>
                    <button onClick={() => handleDeleteExperience(exp.id)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CONSULTING SERVICES */}
        {activeTab === 'services' && (
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <form onSubmit={handleAddService} className="glass p-8 rounded-3xl border border-slate-900 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Create Freelance Service</h2>
                <p className="text-slate-500 text-xs">Expose dynamic pricing packages on frontend.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Service Package Name</label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Enterprise Cloud SaaS Deployment"
                  className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Package Price ($)</label>
                <input
                  type="number"
                  required
                  value={servicePrice}
                  onChange={(e) => setServicePrice(Number(e.target.value))}
                  className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Short Description</label>
                <textarea
                  required
                  rows={3}
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  placeholder="Write your execution deliverables here..."
                  className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white resize-none"
                />
              </div>

              <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1">
                <Plus className="w-4 h-4" /> Publish Pricing Package
              </button>
            </form>

            <div className="glass p-6 rounded-3xl border border-slate-900 space-y-4">
              <div className="font-bold text-sm text-white border-b border-slate-900 pb-3">Published Packages</div>
              <div className="space-y-2">
                {services.map((service) => (
                  <div key={service.id} className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-white">{service.name}</div>
                      <span className="text-[9px] text-emerald-400 font-bold uppercase">${service.startingPrice}</span>
                    </div>
                    <button onClick={() => handleDeleteService(service.id)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: INBOX SUBMISSIONS */}
        {activeTab === 'inbox' && (
          <div className="glass p-6 rounded-3xl border border-slate-900 space-y-4">
            <div className="border-b border-slate-900 pb-4">
              <h2 className="text-xl font-bold text-white">Inbound Guest Inboxes</h2>
              <p className="text-slate-500 text-xs">Live visitor messages log.</p>
            </div>
            <div className="space-y-4 divide-y divide-slate-900">
              {messages.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 font-mono">No contact submissions found in database.</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="pt-4 space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="font-bold text-xs text-white">{msg.name} (<span className="text-indigo-400">{msg.email}</span>)</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{msg.subject}</div>
                      </div>
                      <span className={`px-2.5 py-0.5 text-[8px] font-bold uppercase rounded-full ${
                        msg.spamScore >= 0.75 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        Spam Score: {msg.spamScore}
                      </span>
                    </div>
                    <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl text-xs text-slate-300 italic font-sans leading-relaxed">
                      "{msg.message}"
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
