'use client';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Sparkles,
  Image,
  Users,
  Shield,
  ArrowRight,
  CheckCircle2,
  Zap,
  Layers,
  Mail,
  Clock,
} from 'lucide-react';

const FEATURES = [
  {
    icon: <Sparkles size={24} className="text-purple-400" />,
    title: 'AI-Powered Generation',
    desc: 'Generate 8 perfectly consistent product images using FLUX AI with IP-Adapter technology.',
  },
  {
    icon: <Layers size={24} className="text-blue-400" />,
    title: 'Product Consistency',
    desc: 'Background removal + GPT-4o analysis ensures your product looks identical across all 8 scenes.',
  },
  {
    icon: <Users size={24} className="text-cyan-400" />,
    title: 'Team Workflow',
    desc: 'Admin assigns tasks to users. Real-time status tracking from pending to accepted.',
  },
  {
    icon: <Shield size={24} className="text-green-400" />,
    title: 'Secure & Role-Based',
    desc: 'Row-level security with Supabase. Admins and users see only what they should.',
  },
  {
    icon: <Mail size={24} className="text-yellow-400" />,
    title: 'Email Notifications',
    desc: 'Automated emails at every step: assigned, submitted, accepted, or revision requested.',
  },
  {
    icon: <Clock size={24} className="text-red-400" />,
    title: 'Background Processing',
    desc: 'All AI generation runs in background workers. Real-time polling keeps you updated.',
  },
];

const IMAGE_SLOTS = [
  { label: 'White BG', emoji: '⬜' },
  { label: 'Marble', emoji: '🪨' },
  { label: 'Velvet', emoji: '🟣' },
  { label: 'Beach', emoji: '🏖️' },
  { label: 'Studio', emoji: '🌿' },
  { label: 'Model Front', emoji: '👤' },
  { label: 'Model 45°', emoji: '🔄' },
  { label: 'Close-up', emoji: '🔍' },
];

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const check = async () => {
      const sb = createClient();
      const { data } = await sb.auth.getUser();
      if (data.user) setIsLoggedIn(true);
    };
    check();
  }, []);

  const handleLogin = async (provider: 'google' | 'github') => {
    setLoading(true);
    const sb = createClient();
    await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white overflow-x-hidden">
      {/* ── Navbar ───────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-[#334155]/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-xl font-bold font-[Outfit] gradient-text">TaskHub</span>
          </div>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <button
                onClick={() => router.push('/dashboard')}
                className="btn-primary py-2 px-5 text-sm"
              >
                Go to Dashboard <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleLogin('google')}
                  disabled={loading}
                  className="text-sm text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleLogin('google')}
                  disabled={loading}
                  className="btn-primary py-2 px-5 text-sm"
                >
                  Get Started <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
          <div className="absolute -top-20 right-0 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl" />
          <div className="absolute top-60 left-1/2 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-2 text-sm text-indigo-300 mb-8">
            <Zap size={14} className="text-indigo-400" />
            Powered by FLUX AI + GPT-4o + IP-Adapter
          </div>

          <h1 className="text-5xl md:text-7xl font-bold font-[Outfit] leading-tight mb-6">
            Generate{' '}
            <span className="gradient-text">8 Perfect</span>
            <br />
            Product Images — AI
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Upload one product photo. Our AI generates 8 studio-quality images with{' '}
            <strong className="text-slate-200">pixel-perfect consistency</strong> — white backgrounds,
            lifestyle scenes, and professional model shots.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => handleLogin('google')}
              disabled={loading}
              className="btn-primary text-base px-8 py-4 w-full sm:w-auto"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" className="fill-current">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button
              onClick={() => handleLogin('github')}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-4 border border-slate-600 rounded-xl text-base font-semibold hover:border-slate-400 transition-colors w-full sm:w-auto justify-center"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>
          </div>

          {/* 8 Image Slots Preview */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3 max-w-3xl mx-auto">
            {IMAGE_SLOTS.map((slot, i) => (
              <div
                key={i}
                className="glass rounded-xl p-3 text-center card-hover cursor-default"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="text-2xl mb-1">{slot.emoji}</div>
                <div className="text-[10px] text-slate-400 font-medium leading-tight">{slot.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold font-[Outfit] mb-4">Everything you need</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              A complete platform from task assignment to AI generation to review.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="glass rounded-2xl p-6 card-hover">
                <div className="w-12 h-12 bg-[#16213e] rounded-xl flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[#1a1a2e]/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold font-[Outfit] mb-4">How it works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Admin Creates Task', desc: 'Upload a product image and create a photography task.' },
              { step: '02', title: 'Assign to User', desc: 'Admin assigns the task to a photographer/editor user.' },
              { step: '03', title: 'AI Generation', desc: 'User uses the AI Studio to generate 8 consistent images.' },
              { step: '04', title: 'Review & Accept', desc: 'Admin reviews submissions and accepts or requests revisions.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-5xl font-bold gradient-text font-[Outfit] mb-3">{item.step}</div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 pointer-events-none" />
            <div className="relative">
              <h2 className="text-4xl font-bold font-[Outfit] mb-4">Ready to get started?</h2>
              <p className="text-slate-400 mb-8 text-lg">
                Sign in to start generating beautiful, consistent AI product images.
              </p>
              <button
                onClick={() => handleLogin('google')}
                disabled={loading}
                className="btn-primary text-base px-10 py-4"
              >
                Start for Free <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-[#334155] py-8 px-6 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} TaskHub. Built with Next.js, Flask & Supabase.</p>
      </footer>
    </div>
  );
}
