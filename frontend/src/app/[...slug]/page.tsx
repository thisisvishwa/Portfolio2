'use client';

import React, { useEffect, useState } from 'react';
import PageBuilder from '../../components/PageBuilder';
import { Terminal, AlertTriangle, ArrowLeft } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface SectionBlock {
  section: 'hero' | 'skills' | 'experience' | 'contact' | 'custom';
  props: {
    headline?: string;
    subheadline?: string;
    background?: 'gradient' | 'minimal' | 'dark';
    bodyText?: string;
    [key: string]: any;
  };
}

export default function CustomDynamicPage({ params }: { params: { slug: string[] } }) {
  const slugPath = params.slug.join('/');
  const [layout, setLayout] = useState<SectionBlock[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPageLayout = async () => {
      try {
        const response = await fetch(`${API_BASE}/settings/pages/${slugPath}`);
        if (response.ok) {
          const data = await response.json();
          const parsedLayout = JSON.parse(data.data.page.layout);
          setLayout(parsedLayout);
        } else {
          fallbackDefaults();
        }
      } catch {
        fallbackDefaults();
      } finally {
        setIsLoading(false);
      }
    };

    const fallbackDefaults = () => {
      if (slugPath === 'about-me' || slugPath === 'privacy-policy') {
        setLayout([
          { 
            section: 'hero', 
            props: { 
              headline: slugPath === 'about-me' ? 'About My Journey' : 'Privacy Statement',
              subheadline: slugPath === 'about-me' 
                ? 'Discover the technologies, decisions, and challenges that shape my architecture.' 
                : 'Your security and privacy are of utmost importance to this portfolio system.',
              background: 'gradient' 
            } 
          },
          { section: 'skills', props: {} },
          { section: 'experience', props: {} }
        ]);
      } else {
        setLayout(null);
      }
    };

    fetchPageLayout();
  }, [slugPath]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs font-mono text-slate-500">
        Compiling layout blocks...
      </div>
    );
  }

  if (!layout) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100 font-sans relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-rose-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="max-w-md w-full text-center space-y-6 relative z-10 glass p-8 rounded-3xl border border-slate-900">
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-full w-fit mx-auto animate-pulse">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>
          <h2 className="text-xl font-extrabold text-white">404 Node Not Found</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            The database dynamic routing engine did not locate a layout definition corresponding to <span className="font-mono text-indigo-400">/{slugPath}</span>.
          </p>
          <a 
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold border border-slate-850 transition-all mx-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Safety
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12">
      <PageBuilder layoutBlocks={layout} />
    </div>
  );
}
