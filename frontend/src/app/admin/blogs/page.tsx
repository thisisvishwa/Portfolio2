'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Terminal, ArrowLeft, Plus, Eye, Save, Sparkles, 
  Trash2, RefreshCw, Heading, Code, Quote, List, Edit3, Globe, ToggleLeft
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
}

export default function BlogEditorPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuCoords, setSlashMenuCoords] = useState({ top: 0, left: 0 });
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/blogs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBlogs(data.data.blogs || []);
      }
    } catch {
      console.warn('Failed to retrieve blogs from API.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(generateSlug(val));
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '/') {
      const { selectionStart } = e.currentTarget;
      const coords = getSelectionCoords(e.currentTarget, selectionStart);
      setSlashMenuCoords(coords);
      setSlashMenuOpen(true);
    } else if (e.key === 'Escape') {
      setSlashMenuOpen(false);
    }
  };

  const getSelectionCoords = (textarea: HTMLTextAreaElement, _pos: number) => {
    const rect = textarea.getBoundingClientRect();
    return {
      top: rect.top - 80,
      left: rect.left + 50,
    };
  };

  const insertBlock = (type: 'h1' | 'h2' | 'code' | 'quote' | 'list') => {
    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    const text = editorRef.current.value;

    const templates = {
      h1: '\n# New Header Title\n',
      h2: '\n## Subtitle Header\n',
      code: '\n```typescript\n// Write your code playground here\n```\n',
      quote: '\n> "Add your inspiring citation here"\n',
      list: '\n- First list item\n- Second list item\n',
    };

    const inserted = templates[type];
    const newContent = text.substring(0, start) + inserted + text.substring(end);
    setContent(newContent);
    setSlashMenuOpen(false);
    editorRef.current.focus();
  };

  const saveBlog = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const payload = {
        title,
        slug,
        content,
        htmlContent: `<p>${content.replace(/\n/g, '<br/>')}</p>`,
        status,
        featuredImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
        categories: ['Engineering'],
        tags: ['TypeScript'],
      };

      const url = selectedBlog 
        ? `${API_BASE}/blogs/${selectedBlog.id}`
        : `${API_BASE}/blogs`;
      
      const method = selectedBlog ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('Blog article saved successfully.');
        setSelectedBlog(null);
        clearForm();
        fetchBlogs();
      } else {
        const err = await response.json();
        alert(err.message || 'Validation error saving article.');
      }
    } catch {
      alert('Network failure.');
    }
  };

  const editBlog = (blog: Blog) => {
    setSelectedBlog(blog);
    setTitle(blog.title);
    setSlug(blog.slug);
    setContent(blog.content);
    setStatus(blog.status);
  };

  const clearForm = () => {
    setSelectedBlog(null);
    setTitle('');
    setSlug('');
    setContent('');
    setStatus('DRAFT');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <header className="glass sticky top-0 z-30 border-b border-slate-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin/dashboard" className="p-2 bg-slate-900 hover:bg-slate-850 rounded-lg text-slate-400 border border-slate-850">
              <ArrowLeft className="w-4 h-4" />
            </a>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <span className="font-extrabold text-lg text-white">BLOG WRITER LAB</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={clearForm}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-850 rounded-xl text-xs font-bold"
            >
              Reset Canvas
            </button>
            <button 
              onClick={saveBlog}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Save Article
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 grid lg:grid-cols-12 gap-8 relative">
        
        <div className="lg:col-span-4 glass p-6 rounded-3xl border border-slate-900 h-fit space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-4">
            <div>
              <h3 className="font-extrabold text-sm text-white">Articles Feed</h3>
              <p className="text-[10px] text-slate-500">Drafts and published modules</p>
            </div>
            <Plus className="w-4 h-4 text-indigo-400" />
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Fetching rows...
            </div>
          ) : blogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-600 font-mono">No articles found. Write one!</div>
          ) : (
            <div className="space-y-2">
              {blogs.map((b) => (
                <button
                  key={b.id}
                  onClick={() => editBlog(b)}
                  className={`w-full p-4 rounded-2xl text-left border transition-all flex items-center justify-between gap-4 ${
                    selectedBlog?.id === b.id
                      ? 'bg-indigo-600/10 border-indigo-500/30'
                      : 'bg-slate-900/40 border-slate-900/60 hover:bg-slate-900 hover:border-slate-850'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-xs text-white truncate max-w-[180px]">{b.title}</div>
                    <div className="text-[10px] text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                    b.status === 'PUBLISHED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-400 border border-slate-800'
                  }`}>
                    {b.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-8 grid md:grid-cols-2 gap-6 items-stretch">
          
          <div className="glass p-6 rounded-3xl border border-slate-900 flex flex-col space-y-4 min-h-[500px]">
            <div className="flex items-center gap-1.5 border-b border-slate-900 pb-4 mb-2">
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-slate-500 font-mono">live-markdown-canvas</span>
            </div>

            <div className="space-y-3 flex-1 flex flex-col relative">
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Unleashing TS Types..."
                className="w-full bg-transparent text-xl font-bold text-white placeholder:text-slate-700 border-none focus:outline-none focus:ring-0"
              />

              <div className="flex items-center gap-2 text-[10px] font-mono border-b border-slate-900 pb-2">
                <span className="text-slate-600">SLUG:</span>
                <span className="text-indigo-400">{slug || 'slug-placeholder'}</span>
              </div>

              <textarea
                ref={editorRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleEditorKeyDown}
                placeholder="Type your markdown here... Press '/' to trigger headers, quote blocks, or pre-syntax code blocks!"
                className="w-full flex-1 bg-transparent text-xs text-slate-300 placeholder:text-slate-700 resize-none focus:outline-none focus:ring-0 mt-3 font-mono leading-relaxed"
              />

              {slashMenuOpen && (
                <div 
                  className="absolute z-40 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 animate-fade-in"
                  style={{ top: `${slashMenuCoords.top}px`, left: `${slashMenuCoords.left}px` }}
                >
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold px-3 py-1 border-b border-slate-850">
                    Slash Blocks
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {[
                      { type: 'h1', label: 'Title Header 1', icon: <Heading className="w-3.5 h-3.5" /> },
                      { type: 'h2', label: 'Subtitle Header 2', icon: <Heading className="w-3.5 h-3.5" /> },
                      { type: 'code', label: 'Code Playground', icon: <Code className="w-3.5 h-3.5" /> },
                      { type: 'quote', label: 'Block Quote', icon: <Quote className="w-3.5 h-3.5" /> },
                      { type: 'list', label: 'Bulleted List', icon: <List className="w-3.5 h-3.5" /> }
                    ].map((btn) => (
                      <button
                        key={btn.type}
                        type="button"
                        onClick={() => insertBlock(btn.type as any)}
                        className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-2 transition-all"
                      >
                        {btn.icon} {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-900 pt-4 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Save state:</span>
              <button
                onClick={() => setStatus(status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border transition-all ${
                  status === 'PUBLISHED'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-slate-900 border-slate-850 text-slate-400'
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> {status === 'PUBLISHED' ? 'PUBLISHED (LIVE)' : 'DRAFT'}
              </button>
            </div>
          </div>

          <div className="glass p-6 rounded-3xl border border-slate-900 flex flex-col space-y-4">
            <div className="flex items-center gap-1.5 border-b border-slate-900 pb-4 mb-2">
              <Eye className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="text-[10px] text-slate-500 font-mono">live-split-preview</span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px] text-xs text-slate-300 space-y-4 prose leading-relaxed">
              <h2 className="text-lg font-bold text-white leading-tight">
                {title || 'Empty Article Title'}
              </h2>
              
              {content ? (
                <div className="space-y-4 whitespace-pre-wrap break-words">
                  {content.split('\n').map((line, i) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={i} className="text-base font-extrabold text-white pt-2 border-b border-slate-900 pb-1">{line.replace('# ', '')}</h1>;
                    }
                    if (line.startsWith('## ')) {
                      return <h2 key={i} className="text-sm font-bold text-indigo-300 pt-1">{line.replace('## ', '')}</h2>;
                    }
                    if (line.startsWith('> ')) {
                      return <blockquote key={i} className="border-l-4 border-indigo-500 pl-4 py-1 italic bg-slate-900/40 rounded text-slate-400">{line.replace('> ', '')}</blockquote>;
                    }
                    if (line.startsWith('- ')) {
                      return <li key={i} className="list-disc list-inside text-slate-400 pl-2">{line.replace('- ', '')}</li>;
                    }
                    return <p key={i}>{line}</p>;
                  })}
                </div>
              ) : (
                <div className="text-slate-600 font-mono text-center pt-24 text-[10px]">Split preview feed will populate automatically on input.</div>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
