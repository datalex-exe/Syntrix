"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppAuth } from "@/lib/auth-context";
import { 
  Plus, 
  LogOut, 
  Globe, 
  Trash2, 
  ArrowRight, 
  BarChart2, 
  PlusCircle, 
  LayoutGrid, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Activity,
  Layers
} from "lucide-react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
  _count: {
    keywords: number;
    competitors: number;
  };
}

export default function DashboardPage() {
  const { user, signOut } = useAppAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State
  const [projectName, setProjectName] = useState("");
  const [projectDomain, setProjectDomain] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error("Failed to fetch projects:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the site "${projectName}"? This will delete all tracked keywords, competitors, and audit logs permanently.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      if (res.ok) {
        fetchProjects();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete project");
      }
    } catch (e) {
      console.error("Failed to delete project:", e);
      alert("Failed to delete project. Please check network logs.");
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, domain: projectDomain }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      setProjectName("");
      setProjectDomain("");
      setShowAddModal(false);
      fetchProjects();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalTrackedKeywords = projects.reduce((acc, p) => acc + (p._count?.keywords || 0), 0);
  const totalTrackedCompetitors = projects.reduce((acc, p) => acc + (p._count?.competitors || 0), 0);

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="border-b border-white/10 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-600/25">
              <span className="font-extrabold text-white text-lg">S</span>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Syn<span className="text-indigo-400">trix</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-xs text-gray-400 font-mono hidden sm:inline">{user?.email}</span>
            <button
              onClick={() => signOut()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-gray-900/60 text-gray-400 hover:text-white text-xs font-semibold transition-all-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Workspace Summary Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Project Sites</h1>
              <span className="bento-badge">{projects.length} Active</span>
            </div>
            <p className="text-gray-400 text-sm font-normal">
              Manage website properties, track SERP positions, and launch automated site audits.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-xl shadow-indigo-600/25 transition-all-300 cursor-pointer self-start md:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add Website Domain</span>
          </button>
        </div>

        {/* Global Stats Bento Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="bento-card p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Connected Sites</span>
              <p className="text-2xl font-extrabold text-white mt-1">{projects.length}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Globe className="h-5 w-5" />
            </div>
          </div>

          <div className="bento-card p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tracked Keywords</span>
              <p className="text-2xl font-extrabold text-indigo-400 mt-1">{totalTrackedKeywords}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="bento-card p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Monitored Competitors</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">{totalTrackedCompetitors}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shadow-lg shadow-indigo-500/20"></div>
          </div>
        ) : projects.length === 0 ? (
          /* Empty State Bento Card */
          <div className="bento-card p-12 text-center max-w-xl mx-auto my-10 space-y-5">
            <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
              <Globe className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-white">No Website Domains Connected</h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-md mx-auto font-normal">
              Connect your domain to start tracking daily search positions, executing technical site audits, and analyzing competitor overlaps.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition-all-300 cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Connect First Domain</span>
            </button>
          </div>
        ) : (
          /* Bento Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bento-card p-6 flex flex-col justify-between group hover:border-indigo-500/40 transition-all-300"
              >
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-white leading-snug group-hover:text-indigo-300 transition-colors">
                        {project.name}
                      </h3>
                      <a
                        href={`https://${project.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-gray-400 hover:text-indigo-400 flex items-center space-x-1.5 font-mono"
                      >
                        <Globe className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{project.domain}</span>
                      </a>
                    </div>

                    <button
                      onClick={() => handleDeleteProject(project.id, project.name)}
                      className="p-2 rounded-lg border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all-300 cursor-pointer"
                      title="Delete property"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Stat Grid Pill */}
                  <div className="grid grid-cols-2 gap-3 bg-gray-950/60 p-3.5 rounded-xl border border-white/5 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold">Keywords</span>
                      <p className="text-base font-bold text-white mt-0.5">{project._count.keywords}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold">Competitors</span>
                      <p className="text-base font-bold text-white mt-0.5">{project._count.competitors}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <Link
                    href={`/projects/${project.id}`}
                    className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 border border-white/10 hover:border-indigo-500/40 bg-gray-900/60 hover:bg-indigo-600/20 rounded-xl text-xs font-bold text-gray-200 hover:text-white transition-all-300"
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 bg-[#060911]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="font-extrabold text-white text-[10px]">S</span>
            </div>
            <span className="font-bold text-white tracking-wider">Syntrix Dashboard</span>
          </div>
          <p className="font-medium text-gray-300" suppressHydrationWarning>
            &copy; 2026 Datalex. All Rights Reserved.
          </p>
        </div>
      </footer>

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bento-card w-full max-w-md p-6 border border-white/10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Add New Property</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="bg-red-950/40 border border-red-500/40 text-red-200 text-xs rounded-xl p-3">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Project Name</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="mt-1 block w-full rounded-xl px-3.5 py-2.5 glass-input text-white placeholder-gray-500 sm:text-sm font-sans"
                  placeholder="My Portfolio"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Domain Name</label>
                <input
                  type="text"
                  required
                  value={projectDomain}
                  onChange={(e) => setProjectDomain(e.target.value)}
                  className="mt-1 block w-full rounded-xl px-3.5 py-2.5 glass-input text-white placeholder-gray-500 sm:text-sm font-mono"
                  placeholder="mysite.com"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">Specify root domain without protocol prefix</span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-white/10 bg-gray-900/60 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-all-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs disabled:opacity-50 transition-all-300 cursor-pointer shadow-lg shadow-indigo-600/25"
                >
                  {isSubmitting ? "Creating..." : "Connect Domain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
