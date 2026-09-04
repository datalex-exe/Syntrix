"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppAuth } from "@/lib/auth-context";
import { 
  TrendingUp, 
  Search, 
  ShieldCheck, 
  Users, 
  FileText, 
  Activity, 
  ArrowUpRight, 
  Zap, 
  Sparkles, 
  Globe, 
  ChevronRight,
  BarChart3,
  CheckCircle2,
  Lock
} from "lucide-react";

export default function LandingPage() {
  const { isSignedIn, isLoading } = useAppAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090d16]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shadow-lg shadow-indigo-500/20"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Floating Bento Header */}
      <div className="sticky top-4 z-50 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <header className="bento-card px-6 h-16 flex items-center justify-between border border-white/10 shadow-2xl">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="font-extrabold text-white text-lg tracking-wider">S</span>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Syn<span className="text-indigo-400">trix</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-gray-400 hover:text-white text-sm font-semibold transition-all-300 px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/30 transition-all-300 flex items-center space-x-1.5"
            >
              <span>Get Started</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </header>
      </div>

      {/* Hero Section */}
      <main className="flex-grow pt-16 pb-24">
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center space-x-2 bento-badge py-1.5 px-4 shadow-inner">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              AI-Powered SEO Intelligence & Rank Suite
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight max-w-5xl mx-auto">
            Track search rankings & audit site health in <span className="gradient-text">real-time</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto font-normal leading-relaxed">
            Syntrix provides founders and digital teams with real-time rank tracking, automated site audits, competitor visibility matrices, and instant keyword suggestions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold px-8 py-3.5 rounded-xl text-base shadow-xl shadow-indigo-600/30 transition-all-300 text-center flex items-center justify-center space-x-2 group"
            >
              <span>Launch Free Dashboard</span>
              <ArrowUpRight className="h-5 w-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto bg-gray-900/80 hover:bg-gray-800 border border-white/10 text-gray-300 font-bold px-8 py-3.5 rounded-xl text-base transition-all-300 text-center"
            >
              Sign In to Project
            </Link>
          </div>

          {/* Real-time Stat Pills */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 font-medium">
            <div className="flex items-center space-x-2 bg-gray-900/60 px-3 py-1.5 rounded-lg border border-white/5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Unlimited Tracked Keywords</span>
            </div>
            <div className="flex items-center space-x-2 bg-gray-900/60 px-3 py-1.5 rounded-lg border border-white/5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Automated Site Crawls</span>
            </div>
            <div className="flex items-center space-x-2 bg-gray-900/60 px-3 py-1.5 rounded-lg border border-white/5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>PDF & CSV Exporting</span>
            </div>
          </div>
        </section>

        {/* Bento Grid Features Section */}
        <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Bento Precision Suite
            </h2>
            <p className="text-gray-400 text-base font-normal">
              Modular data cards engineered for maximum visibility into search positions, site issues, and competitor overlaps.
            </p>
          </div>

          {/* Asymmetric Bento Box Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bento Card 1: Main Rank Tracking Feature (Spans 2 Cols) */}
            <div className="md:col-span-2 bento-card p-8 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <span className="bento-badge">Real-time Data</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Live SERP Position Tracking</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  Monitor position changes daily across Google search engines. Track rank trajectories, SERP volatility, and 7-day delta shifts with precision charts.
                </p>
              </div>

              {/* Demo Mini Chart UI */}
              <div className="bg-gray-950/60 rounded-xl p-4 border border-white/5 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-gray-400 pb-2 border-b border-white/5">
                  <span className="flex items-center space-x-2">
                    <Globe className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="text-gray-200">syntrix.com</span>
                  </span>
                  <span className="text-emerald-400 font-semibold">+4 Positions</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">"seo rank tracker"</span>
                    <span className="text-indigo-400 font-bold">#2</span>
                  </div>
                  <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-1.5 rounded-full w-[85%]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Technical Audit */}
            <div className="bento-card p-8 flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Automated Site Audits</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  Crawl every URL on your site to flag broken links, missing title tags, HTTPS vulnerabilities, and slow loading assets.
                </p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Health Score</span>
                <span className="text-2xl font-extrabold text-emerald-400">98 / 100</span>
              </div>
            </div>

            {/* Bento Card 3: Keyword Explorer */}
            <div className="bento-card p-8 flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Keyword Explorer</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  Discover high-intent keyword ideas, estimated search volumes, CPC rates, and long-tail question suggestions.
                </p>
              </div>
              <div className="bg-gray-950/60 rounded-xl p-3 border border-white/5 flex items-center space-x-2 text-xs text-gray-400 font-mono">
                <Zap className="h-4 w-4 text-amber-400" />
                <span>Search Intent: High Commercial</span>
              </div>
            </div>

            {/* Bento Card 4: Competitor Overlap Matrix */}
            <div className="bento-card p-8 flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Competitor Intelligence</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  Benchmark up to 3 competitors side-by-side to map out shared keyword visibilities and ranking gaps.
                </p>
              </div>
              <div className="bg-gray-950/60 rounded-xl p-3 border border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-gray-400">Overlap Share</span>
                <span className="text-amber-400 font-bold">64% Match</span>
              </div>
            </div>

            {/* Bento Card 5: Instant Exporting */}
            <div className="bento-card p-8 flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">PDF & CSV Exporting</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  Export formatted PDF summaries or complete CSV ranking history logs for your team and clients in one click.
                </p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center text-xs font-semibold text-purple-300">
                1-Click Export Ready
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* Enhanced Sleek Footer */}
      <footer className="border-t border-white/10 py-12 bg-[#060911] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/5">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <span className="font-extrabold text-white text-lg">S</span>
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-white block">
                  Syn<span className="text-indigo-400">trix</span>
                </span>
                <span className="text-[10px] text-gray-400 font-mono block">AI Rank & Crawl Intelligence</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 font-medium">
              <Link href="/login" className="hover:text-indigo-400 transition-colors">Sign In</Link>
              <Link href="/register" className="hover:text-indigo-400 transition-colors">Get Started</Link>
              <a href="#features" className="hover:text-indigo-400 transition-colors">Features</a>
              <span className="bento-badge py-0.5 px-2.5 text-[10px]">v1.0 System</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <p className="font-medium text-gray-300" suppressHydrationWarning>
              &copy; 2026 Datalex. All Rights Reserved.
            </p>
            <div className="flex items-center space-x-4 text-gray-400 font-mono text-[11px]">
              <span className="hover:text-gray-300 transition-colors cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-gray-300 transition-colors cursor-pointer">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-gray-300 transition-colors cursor-pointer">Security</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
