'use client';

import React from 'react';
import { Terminal, Shield, Briefcase, Cpu, Layers, Mail, CheckCircle } from 'lucide-react';

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

interface PageBuilderProps {
  layoutBlocks: SectionBlock[];
}

export default function PageBuilder({ layoutBlocks }: PageBuilderProps) {
  return (
    <div className="space-y-20 pb-20">
      {layoutBlocks.map((block, index) => {
        switch (block.section) {
          case 'hero':
            return (
              <section 
                key={index} 
                className={`pt-24 pb-16 px-6 max-w-5xl mx-auto text-center space-y-6 ${
                  block.props.background === 'gradient' 
                    ? 'bg-gradient-to-b from-indigo-950/20 to-transparent rounded-3xl p-8 border border-slate-900/40' 
                    : ''
                }`}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 font-semibold text-xs rounded-full border border-indigo-500/20">
                  <Terminal className="w-3.5 h-3.5" /> Dynamic Layout Section
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
                  {block.props.headline || "Welcome to my Space"}
                </h1>
                <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                  {block.props.subheadline || "This section is generated dynamically from database layouts."}
                </p>
              </section>
            );

          case 'skills':
            return (
              <section key={index} className="max-w-5xl mx-auto px-6 space-y-6">
                <div className="border-b border-slate-900 pb-4">
                  <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-emerald-400" /> Technologies Grid
                  </h2>
                  <p className="text-slate-500 text-xs">Skills matrices managed completely via CMS controllers.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['TypeScript', 'Next.js', 'PostgreSQL', 'Docker', 'Prisma', 'Express', 'Redis', 'Jest'].map((skill) => (
                    <div key={skill} className="glass p-5 rounded-2xl border border-slate-900 flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-300">{skill}</span>
                    </div>
                  ))}
                </div>
              </section>
            );

          case 'experience':
            return (
              <section key={index} className="max-w-5xl mx-auto px-6 space-y-6">
                <div className="border-b border-slate-900 pb-4">
                  <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-400" /> Work History
                  </h2>
                  <p className="text-slate-500 text-xs">Career progression milestones.</p>
                </div>
                <div className="space-y-4">
                  {[
                    { role: "Principal Software Architect", company: "Aegis Cloud Corp", duration: "2024 - Present" },
                    { role: "Senior Full Stack Engineer", company: "Dev Systems Lab", duration: "2021 - 2024" }
                  ].map((job, idx) => (
                    <div key={idx} className="glass p-6 rounded-2xl border border-slate-900 flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div className="space-y-1">
                        <div className="font-extrabold text-sm text-white">{job.role}</div>
                        <div className="text-xs text-slate-400">{job.company}</div>
                      </div>
                      <span className="px-3 py-1 bg-slate-900 text-slate-500 rounded-full font-mono text-[10px] border border-slate-850">{job.duration}</span>
                    </div>
                  ))}
                </div>
              </section>
            );

          case 'custom':
            return (
              <section key={index} className="max-w-3xl mx-auto px-6 text-center space-y-4">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-full w-fit mx-auto">
                  <Layers className="w-5 h-5 text-rose-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Custom Block Section</h2>
                <p className="text-slate-400 text-xs leading-relaxed font-mono">
                  {block.props.bodyText || "Add raw data paragraphs inside the setting custom properties panel."}
                </p>
              </section>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
