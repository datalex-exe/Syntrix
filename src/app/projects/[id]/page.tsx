"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAppAuth } from "@/lib/auth-context";
import {
  TrendingUp,
  Globe,
  Trash2,
  RefreshCw,
  Plus,
  ChevronLeft,
  Search,
  ShieldCheck,
  Users,
  FileText,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  HelpCircle,
  Settings,
  BarChart2,
  Sparkles,
  Zap,
  CheckCircle2,
  Layers
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

// TypeScript Models
interface Keyword {
  id: string;
  phrase: string;
  targetCountry: string;
  createdAt: string;
  rankHistory: {
    id: string;
    position: number;
    checkedAt: string;
  }[];
}

interface Project {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
  webhookUrl?: string;
  gscConnected?: boolean;
  briefing?: string;
}

export default function ProjectWorkspacePage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const { user, signOut } = useAppAuth();

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<"tracker" | "explorer" | "audit" | "competitors" | "gsc" | "settings" | "assistant">("tracker");

  // Core Data State
  const [project, setProject] = useState<Project | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [newPhrase, setNewPhrase] = useState("");
  const [country, setCountry] = useState("US");
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [kwError, setKwError] = useState<string | null>(null);

  // Manual checking state
  const [checkingIds, setCheckingIds] = useState<Record<string, boolean>>({});
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  // Keyword Explorer State
  const [explorerQuery, setExplorerQuery] = useState("");
  const [explorerSuggestions, setExplorerSuggestions] = useState<any[]>([]);
  const [explorerQuestions, setExplorerQuestions] = useState<string[]>([]);
  const [isSearchingKw, setIsSearchingKw] = useState(false);
  const [explorerError, setExplorerError] = useState<string | null>(null);
  const [addedKwIds, setAddedKwIds] = useState<Record<string, boolean>>({});

  const handleExplorerSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explorerQuery.trim()) return;
    setIsSearchingKw(true);
    setExplorerError(null);

    try {
      const res = await fetch(`/api/explore?seed=${encodeURIComponent(explorerQuery.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to explore keyword");
      }
      setExplorerSuggestions(data.suggestions || []);
      setExplorerQuestions(data.questions || []);
    } catch (err: any) {
      setExplorerError(err.message);
    } finally {
      setIsSearchingKw(false);
    }
  };

  const handleAddExplorerKeyword = async (phrase: string) => {
    setAddedKwIds((prev) => ({ ...prev, [phrase]: true }));
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          phrase,
          targetCountry: country
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add keyword");
      }

      fetchKeywordsData();
    } catch (err: any) {
      alert(err.message);
      setAddedKwIds((prev) => ({ ...prev, [phrase]: false }));
    }
  };

  // Audit State
  const [auditIssues, setAuditIssues] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState<number>(100);
  const [pageSpeedScore, setPageSpeedScore] = useState<number | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchAuditData = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/audit?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setAuditIssues(data.issues || []);
        setHealthScore(data.healthScore);
        setPageSpeedScore(data.pageSpeedScore);
        setPageCount(data.pageCount);
      }
    } catch (e) {
      console.error("Failed to fetch audit records:", e);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      if (res.ok) {
        const interval = setInterval(async () => {
          const checkRes = await fetch(`/api/audit?projectId=${projectId}`);
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.issues && checkData.issues.length > 0) {
              setAuditIssues(checkData.issues);
              setHealthScore(checkData.healthScore);
              setPageSpeedScore(checkData.pageSpeedScore);
              setPageCount(checkData.pageCount);
              clearInterval(interval);
              setIsAuditing(false);
            }
          }
        }, 4000);
      } else {
        setIsAuditing(false);
      }
    } catch (e) {
      setIsAuditing(false);
    }
  };

  // Competitor State
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [overlapData, setOverlapData] = useState<any[]>([]);
  const [compDomain, setCompDomain] = useState("");
  const [isAddingComp, setIsAddingComp] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);
  const [isLoadingComp, setIsLoadingComp] = useState(false);

  const fetchCompetitorData = async () => {
    setIsLoadingComp(true);
    try {
      const res = await fetch(`/api/competitors/overlap?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setCompetitors(data.competitors || []);
        setOverlapData(data.overlapData || []);
      }
    } catch (e) {
      console.error("Failed to load competitor stats:", e);
    } finally {
      setIsLoadingComp(false);
    }
  };

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compDomain.trim()) return;
    setIsAddingComp(true);
    setCompError(null);

    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, domain: compDomain.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add competitor");
      }
      setCompDomain("");
      fetchCompetitorData();
    } catch (err: any) {
      setCompError(err.message);
    } finally {
      setIsAddingComp(false);
    }
  };

  const handleDeleteCompetitor = async (competitorId: string) => {
    if (!confirm("Are you sure you want to stop tracking this competitor?")) return;
    try {
      const res = await fetch("/api/competitors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorId })
      });
      if (res.ok) {
        fetchCompetitorData();
      }
    } catch (e) {
      console.error("Failed to delete competitor:", e);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (
      !confirm(
        `Are you sure you want to delete the site "${project.name}"? This will delete all tracked keywords, competitors, and audit logs permanently.`
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
        router.push("/dashboard");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete project");
      }
    } catch (e) {
      console.error("Failed to delete project:", e);
      alert("Failed to delete project. Please check network logs.");
    }
  };

  // Search Console State
  const [gscConnectedState, setGscConnectedState] = useState(false);
  const [gscTimeline, setGscTimeline] = useState<any[]>([]);
  const [gscQueries, setGscQueries] = useState<any[]>([]);
  const [gscLoading, setGscLoading] = useState(false);

  const fetchGscData = async () => {
    setGscLoading(true);
    try {
      const res = await fetch(`/api/gsc?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setGscConnectedState(data.gscConnected || false);
        setGscTimeline(data.timeline || []);
        setGscQueries(data.queries || []);
      }
    } catch (e) {
      console.error("Failed to fetch Search Console stats:", e);
    } finally {
      setGscLoading(false);
    }
  };

  const handleToggleGsc = async (connect: boolean) => {
    try {
      const res = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, gscConnected: connect })
      });
      if (res.ok) {
        fetchProjectMeta();
        fetchGscData();
      }
    } catch (e) {
      console.error("Failed to toggle Search Console connection:", e);
    }
  };

  // Settings State
  const [webhookInput, setWebhookInput] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccess(null);
    setSettingsError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, webhookUrl: webhookInput })
      });
      if (res.ok) {
        setSettingsSuccess("Project settings successfully saved.");
        fetchProjectMeta();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to update project settings");
      }
    } catch (err: any) {
      setSettingsError(err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // AI SEO Assistant State
  const [assistantMessages, setAssistantMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [assistantInput, setAssistantInput] = useState("");
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [briefingInput, setBriefingInput] = useState("");
  const [isSavingBriefing, setIsSavingBriefing] = useState(false);
  const [briefingSuccess, setBriefingSuccess] = useState<string | null>(null);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      const isSub = 
        project.domain.includes("onrender.com") || 
        project.domain.includes("vercel.app") || 
        project.domain.includes("github.io") ||
        project.domain.includes("netlify.app");

      const greeting = `Hi! I'm your Syntrix AI Assistant. I see your domain is **${project.domain}**. ${
        isSub
          ? "Because this is a subdomain platform, ranking involves techniques like manual URL indexing requests, targeting low-difficulty long-tail keywords, and establishing off-page authority."
          : "I can help you build custom SEO ranking strategies, track keywords, and troubleshoot technical issues."
      }
      
${
  project.briefing
    ? `Loaded site briefing:
*"${project.briefing}"*`
    : "Provide a description in the **Site Briefing** section for tailored keyword ideas."
}
      
How can I help you today?`;

      setAssistantMessages([
        { role: "assistant", content: greeting }
      ]);
    }
  }, [project?.id]);

  const handleSaveBriefing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBriefing(true);
    setBriefingSuccess(null);
    setBriefingError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, briefing: briefingInput })
      });

      if (res.ok) {
        setBriefingSuccess("Briefing updated successfully.");
        await fetchProjectMeta();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to update briefing");
      }
    } catch (err: any) {
      setBriefingError(err.message);
    } finally {
      setIsSavingBriefing(false);
    }
  };

  const handleSendAssistantMessage = async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const query = textOverride || assistantInput;
    if (!query.trim()) return;

    const userMsg = { role: "user" as const, content: query.trim() };
    const updatedMessages = [...assistantMessages, userMsg];
    setAssistantMessages(updatedMessages);
    setAssistantInput("");
    setIsAssistantTyping(true);

    try {
      const res = await fetch("/api/seo/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch response");
      }

      const data = await res.json();
      setAssistantMessages([...updatedMessages, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setAssistantMessages([
        ...updatedMessages,
        { role: "assistant", content: `⚠️ Error: ${err.message}` }
      ]);
    } finally {
      setIsAssistantTyping(false);
    }
  };

  // AI Copywriter State
  const [optimizingKeyword, setOptimizingKeyword] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);

  const handleOptimizeKeyword = async (phrase: string) => {
    setOptimizingKeyword(phrase);
    setOptimizationResult(null);
    setShowOptimizeModal(true);
    setIsOptimizing(true);

    try {
      const res = await fetch("/api/seo/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase, url: `https://${project?.domain || "site.com"}` })
      });
      if (res.ok) {
        const data = await res.json();
        setOptimizationResult(data);
      }
    } catch (e) {
      console.error("Failed to run AI copywriter optimization:", e);
    } finally {
      setIsOptimizing(false);
    }
  };

  const fetchProjectMeta = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        const found = data.projects.find((p: Project) => p.id === projectId);
        if (found) {
          setProject(found);
          setWebhookInput(found.webhookUrl || "");
          setGscConnectedState(found.gscConnected || false);
          setBriefingInput(found.briefing || "");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (e) {
      console.error("Failed to load project metadata:", e);
    }
  };

  const fetchKeywordsData = async () => {
    try {
      const kwRes = await fetch(`/api/keywords?projectId=${projectId}`);
      if (kwRes.ok) {
        const kwData = await kwRes.json();
        setKeywords(kwData.keywords || []);
      }

      const histRes = await fetch(`/api/rank-history?projectId=${projectId}`);
      if (histRes.ok) {
        const histData = await histRes.json();
        setChartData(histData.chartData || []);
      }
    } catch (e) {
      console.error("Failed to fetch keyword trends:", e);
    }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchProjectMeta(),
      fetchKeywordsData(),
      fetchAuditData(),
      fetchCompetitorData(),
      fetchGscData()
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (projectId) {
      loadAllData();
    }
  }, [projectId]);

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhrase.trim()) return;
    setIsAddingKeyword(true);
    setKwError(null);

    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          phrase: newPhrase.trim(),
          targetCountry: country
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add keyword");
      }

      setNewPhrase("");
      fetchKeywordsData();
    } catch (err: any) {
      setKwError(err.message);
    } finally {
      setIsAddingKeyword(false);
    }
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    if (!confirm("Are you sure you want to stop tracking this keyword?")) return;
    try {
      const res = await fetch("/api/keywords", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywordId })
      });
      if (res.ok) {
        fetchKeywordsData();
      }
    } catch (e) {
      console.error("Failed to delete keyword:", e);
    }
  };

  const handleTriggerCheck = async (keywordId: string) => {
    setCheckingIds((prev) => ({ ...prev, [keywordId]: true }));
    try {
      const res = await fetch("/api/keywords/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywordId })
      });
      if (res.ok) {
        setTimeout(() => {
          fetchKeywordsData();
          setCheckingIds((prev) => ({ ...prev, [keywordId]: false }));
        }, 2000);
      } else {
        setCheckingIds((prev) => ({ ...prev, [keywordId]: false }));
      }
    } catch (e) {
      setCheckingIds((prev) => ({ ...prev, [keywordId]: false }));
    }
  };

  const handleRefreshAll = async () => {
    setIsRefreshingAll(true);
    try {
      const res = await fetch("/api/keywords/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      if (res.ok) {
        setTimeout(() => {
          fetchKeywordsData();
          setIsRefreshingAll(false);
        }, 3000);
      } else {
        setIsRefreshingAll(false);
      }
    } catch (e) {
      setIsRefreshingAll(false);
    }
  };

  const handleExportCSV = () => {
    if (keywords.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Keyword,Country,Position,7d Change\n";

    keywords.forEach((kw) => {
      const latestHistory = kw.rankHistory?.[0];
      const prevHistory = kw.rankHistory?.[1];
      const pos = latestHistory
        ? latestHistory.position <= 100
          ? latestHistory.position
          : "100+"
        : "Not Checked";

      let changeText = "-";
      if (latestHistory && prevHistory) {
        const diff = prevHistory.position - latestHistory.position;
        if (diff > 0) changeText = `+${diff}`;
        else if (diff < 0) changeText = `${diff}`;
      }

      const row = `"${kw.phrase.replace(/"/g, '""')}",${kw.targetCountry},${pos},${changeText}`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `syntrix_${project?.domain || "report"}_keywords.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    if (!project) return;
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, 210, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Syntrix Ranking Report", 15, 25);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 25);

      doc.setTextColor(23, 23, 23);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Project Details", 15, 55);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Domain: ${project.domain}`, 15, 65);
      doc.text(`Visibility Score: ${avgVisibility}%`, 15, 72);
      doc.text(`Average Position: ${avgRank === 101 ? "100+" : `#${avgRank}`}`, 15, 79);
      doc.text(`Total Tracked Keywords: ${totalKeywords}`, 15, 86);

      doc.setFillColor(17, 24, 39);
      doc.rect(15, 100, 180, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("Keyword Phrase", 20, 106);
      doc.text("Country", 100, 106);
      doc.text("Google Rank", 140, 106);
      doc.text("7d Change", 170, 106);

      doc.setTextColor(39, 39, 42);
      doc.setFont("helvetica", "normal");
      let y = 117;
      keywords.forEach((kw, index) => {
        if (index % 2 === 1) {
          doc.setFillColor(244, 244, 245);
          doc.rect(15, y - 5, 180, 8, "F");
        }

        const latestHistory = kw.rankHistory?.[0];
        const prevHistory = kw.rankHistory?.[1];
        const pos = latestHistory
          ? latestHistory.position <= 100
            ? latestHistory.position.toString()
            : "100+"
          : "Not Checked";

        let changeText = "-";
        if (latestHistory && prevHistory) {
          const diff = prevHistory.position - latestHistory.position;
          if (diff > 0) changeText = `+${diff}`;
          else if (diff < 0) changeText = `${diff}`;
        }

        doc.text(kw.phrase, 20, y);
        doc.text(kw.targetCountry, 100, y);
        doc.text(pos, 140, y);
        doc.text(changeText, 170, y);

        y += 8;

        if (y > 280) {
          doc.addPage();
          y = 20;
        }
      });

      doc.save(`syntrix_${project.domain}_report.pdf`);
    } catch (e) {
      console.error("Failed to generate PDF:", e);
      alert("Failed to export PDF.");
    }
  };

  const totalKeywords = keywords.length;
  
  const rankedKeywords = keywords.filter(
    (k) => k.rankHistory?.[0] && k.rankHistory[0].position <= 100
  );
  const avgRank = rankedKeywords.length > 0
    ? Number(
        (
          rankedKeywords.reduce((acc, k) => acc + k.rankHistory[0].position, 0) /
          rankedKeywords.length
        ).toFixed(1)
      )
    : 101;

  const calculateVisibility = (pos: number) => {
    if (pos <= 0 || pos > 100) return 0;
    if (pos === 1) return 100;
    if (pos <= 3) return 85;
    if (pos <= 5) return 60;
    if (pos <= 10) return 40;
    if (pos <= 20) return 20;
    if (pos <= 100) return 5;
    return 0;
  };

  const avgVisibility = keywords.length > 0
    ? Number(
        (
          keywords.reduce((acc, k) => {
            const pos = k.rankHistory?.[0]?.position || 101;
            return acc + calculateVisibility(pos);
          }, 0) / keywords.length
        ).toFixed(1)
      )
    : 0;

  const movers = keywords
    .map((k) => {
      const hist = k.rankHistory || [];
      if (hist.length < 2) return { ...k, change: 0 };
      const current = hist[0].position;
      const prev = hist[1].position;
      return { ...k, change: prev - current };
    })
    .filter((k) => k.change !== 0);

  const topWinners = [...movers].filter((m) => m.change > 0).sort((a, b) => b.change - a.change).slice(0, 3);
  const topLosers = [...movers].filter((m) => m.change < 0).sort((a, b) => a.change - b.change).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 flex font-sans select-none overflow-x-hidden">
      {/* LEFT BENTO SIDEBAR */}
      <aside className="w-64 border-r border-white/10 bg-[#090d16] flex flex-col justify-between shrink-0 hidden md:flex p-5 space-y-6">
        <div className="space-y-6">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <span className="font-extrabold text-white text-lg">S</span>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Syn<span className="text-indigo-400">trix</span>
            </span>
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 text-xs font-semibold text-gray-400 hover:text-white px-3 py-2 rounded-xl bg-gray-900/60 hover:bg-gray-800 border border-white/5 transition-all-300"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Properties</span>
            </Link>
          </div>

          {/* Active Site Card */}
          {project && (
            <div className="bento-card p-4 space-y-1.5 border border-white/10">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Active Property</span>
              <p className="font-bold text-white text-sm truncate">{project.name}</p>
              <span className="text-xs text-indigo-400 font-mono truncate block">{project.domain}</span>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="space-y-1.5 pt-2">
            <button
              onClick={() => setActiveTab("tracker")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all-300 cursor-pointer ${
                activeTab === "tracker"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-gray-400 hover:text-white hover:bg-gray-900/60"
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Rank Tracker</span>
            </button>

            <button
              onClick={() => setActiveTab("explorer")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all-300 cursor-pointer ${
                activeTab === "explorer"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-gray-400 hover:text-white hover:bg-gray-900/60"
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Keyword Explorer</span>
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all-300 cursor-pointer ${
                activeTab === "audit"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-gray-400 hover:text-white hover:bg-gray-900/60"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Site Audit</span>
            </button>

            <button
              onClick={() => setActiveTab("competitors")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all-300 cursor-pointer ${
                activeTab === "competitors"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-gray-400 hover:text-white hover:bg-gray-900/60"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Competitors</span>
            </button>

            <button
              onClick={() => setActiveTab("gsc")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all-300 cursor-pointer ${
                activeTab === "gsc"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-gray-400 hover:text-white hover:bg-gray-900/60"
              }`}
            >
              <BarChart2 className="h-4 w-4" />
              <span>Search Console</span>
            </button>

            <button
              onClick={() => setActiveTab("assistant")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all-300 cursor-pointer ${
                activeTab === "assistant"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-gray-400 hover:text-white hover:bg-gray-900/60"
              }`}
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>AI Assistant</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all-300 cursor-pointer ${
                activeTab === "settings"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-gray-400 hover:text-white hover:bg-gray-900/60"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-white/10 text-[10px] text-gray-400 space-y-2">
          <p className="font-medium text-gray-300" suppressHydrationWarning>&copy; 2026 Datalex. All Rights Reserved.</p>
          <div className="flex justify-between items-center text-gray-500">
            <span className="font-mono">UI UX Pro Max</span>
            <button onClick={() => signOut()} className="hover:text-white transition-colors cursor-pointer">
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <div className="flex-grow flex flex-col min-w-0">
        {/* Top Header */}
        <header className="border-b border-white/10 h-16 flex items-center justify-between px-6 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center space-x-2">
            <Link href="/dashboard" className="text-gray-400 text-xs font-medium hover:text-white transition-colors">
              Sites
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
            <span className="text-white text-xs font-bold truncate max-w-[150px] sm:max-w-xs">
              {project?.name}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-400 font-mono hidden sm:inline">{user?.email}</span>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-xs font-bold text-gray-300 hover:text-white px-3 py-1.5 rounded-xl border border-white/10 bg-gray-900/60 hover:bg-gray-800 transition-all-300"
            >
              Switch Site
            </button>
            <button
              onClick={handleDeleteProject}
              className="p-1.5 rounded-xl border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all-300"
              title="Delete site property"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-grow p-6 overflow-y-auto space-y-8">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shadow-lg shadow-indigo-500/20"></div>
            </div>
          ) : activeTab === "tracker" ? (
            /* ================= TAB: RANK TRACKER ================= */
            <div className="space-y-8">
              {/* Summary Bento Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bento-card p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Search Visibility</span>
                    <HelpCircle className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="mt-4 flex items-baseline space-x-2">
                    <span className="text-3xl font-extrabold text-white">{avgVisibility}%</span>
                  </div>
                  <span className="text-xs text-gray-500 mt-2 block">Estimated click share across tracked keywords</span>
                </div>

                <div className="bento-card p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg. Position</span>
                    <TrendingUp className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="mt-4 flex items-baseline space-x-2">
                    <span className="text-3xl font-extrabold text-white">
                      {avgRank === 101 ? "100+" : `#${avgRank}`}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 mt-2 block">Average Google SERP ranking index</span>
                </div>

                <div className="bento-card p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">7-Day Rank Shifts</span>
                    <div className="mt-3 space-y-2 font-mono">
                      {topWinners.length > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Winners</span>
                          <span className="text-emerald-400 flex items-center font-bold">
                            <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                            +{topWinners.reduce((sum, item) => sum + item.change, 0)}
                          </span>
                        </div>
                      )}
                      {topLosers.length > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Losers</span>
                          <span className="text-red-400 flex items-center font-bold">
                            <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />
                            {topLosers.reduce((sum, item) => sum + item.change, 0)}
                          </span>
                        </div>
                      )}
                      {topWinners.length === 0 && topLosers.length === 0 && (
                        <p className="text-xs text-gray-500">No position shifts logged yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart Views */}
              {chartData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bento-card p-6 space-y-4">
                    <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Visibility Trend (30 Days)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="visGlowBento" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                          <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} />
                          <YAxis stroke="#9ca3af" fontSize={10} domain={[0, 100]} unit="%" />
                          <Tooltip contentStyle={{ backgroundColor: "#111827", borderColor: "rgba(255,255,255,0.12)", borderRadius: "12px" }} />
                          <Area type="monotone" dataKey="visibility" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#visGlowBento)" name="Visibility" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bento-card p-6 space-y-4">
                    <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Average Position Trend</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                          <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} />
                          <YAxis stroke="#9ca3af" fontSize={10} domain={[1, 100]} reversed name="Position" />
                          <Tooltip contentStyle={{ backgroundColor: "#111827", borderColor: "rgba(255,255,255,0.12)", borderRadius: "12px" }} />
                          <Line type="monotone" dataKey="averageRank" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} name="Avg Position" connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Add & List Keywords */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="bento-card p-6 space-y-6">
                  <h3 className="text-base font-bold text-white">Add Keyword to Track</h3>

                  {kwError && (
                    <div className="bg-red-950/40 border border-red-500/40 text-red-200 text-xs rounded-xl p-3">
                      {kwError}
                    </div>
                  )}

                  <form onSubmit={handleAddKeyword} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Keyword Phrase</label>
                      <input
                        type="text"
                        required
                        value={newPhrase}
                        onChange={(e) => setNewPhrase(e.target.value)}
                        className="mt-1 block w-full rounded-xl px-3.5 py-2.5 glass-input text-white placeholder-gray-500 text-xs font-sans"
                        placeholder="e.g. best seo tools"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Target Country</label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="mt-1 block w-full rounded-xl px-3.5 py-2.5 glass-input text-white text-xs font-sans"
                      >
                        <option value="US">United States (US)</option>
                        <option value="GB">United Kingdom (GB)</option>
                        <option value="CA">Canada (CA)</option>
                        <option value="AU">Australia (AU)</option>
                        <option value="IN">India (IN)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isAddingKeyword}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs disabled:opacity-50 transition-all-300 cursor-pointer shadow-lg shadow-indigo-600/25"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{isAddingKeyword ? "Adding..." : "Add Keyword"}</span>
                    </button>
                  </form>
                </div>

                <div className="bento-card lg:col-span-2 overflow-hidden">
                  <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">Tracked Keywords</h3>
                      <span className="text-[10px] text-gray-500 font-mono mt-1 block">
                        {totalKeywords} active keyword phrases
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleExportCSV}
                        disabled={keywords.length === 0}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-gray-900/60 text-gray-300 text-xs font-bold transition-all-300 disabled:opacity-50 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>CSV</span>
                      </button>
                      <button
                        onClick={handleExportPDF}
                        disabled={keywords.length === 0}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-gray-900/60 text-gray-300 text-xs font-bold transition-all-300 disabled:opacity-50 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-400" />
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={handleRefreshAll}
                        disabled={isRefreshingAll || keywords.length === 0}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold transition-all-300 disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingAll ? "animate-spin" : ""}`} />
                        <span>{isRefreshingAll ? "Checking..." : "Check All"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 bg-gray-950/40 text-gray-400 uppercase tracking-wider font-semibold">
                          <th className="py-3.5 px-6">Keyword</th>
                          <th className="py-3.5 px-4 text-center">Country</th>
                          <th className="py-3.5 px-4 text-center">Position</th>
                          <th className="py-3.5 px-4 text-center">7d Change</th>
                          <th className="py-3.5 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300 font-normal">
                        {keywords.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-gray-500">
                              No keywords added yet. Use the input form to start monitoring search rankings.
                            </td>
                          </tr>
                        ) : (
                          keywords.map((kw) => {
                            const latestHistory = kw.rankHistory?.[0];
                            const prevHistory = kw.rankHistory?.[1];

                            const pos = latestHistory?.position ?? 101;
                            const isRanked = pos > 0 && pos <= 100;

                            let changeText = "-";
                            let changeColor = "text-gray-500";
                            if (latestHistory && prevHistory) {
                              const diff = prevHistory.position - latestHistory.position;
                              if (diff > 0) {
                                changeText = `+${diff}`;
                                changeColor = "text-emerald-400 font-bold";
                              } else if (diff < 0) {
                                changeText = `${diff}`;
                                changeColor = "text-red-400 font-bold";
                              }
                            }

                            const isChecking = checkingIds[kw.id] || false;

                            return (
                              <tr key={kw.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-4 px-6 font-bold text-white">{kw.phrase}</td>
                                <td className="py-4 px-4 text-center font-mono">
                                  <span className="bg-gray-900 border border-white/10 text-[10px] font-semibold px-2 py-0.5 rounded-full text-gray-400 uppercase">
                                    {kw.targetCountry}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-center font-mono">
                                  <span
                                    className={`inline-block font-extrabold px-3 py-1 rounded-xl text-center min-w-[36px] ${
                                      isRanked
                                        ? pos <= 3
                                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                          : pos <= 10
                                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                          : "bg-gray-900 text-gray-200 border border-white/10"
                                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                                    }`}
                                  >
                                    {isRanked ? pos : "100+"}
                                  </span>
                                </td>
                                <td className={`py-4 px-4 text-center font-mono ${changeColor}`}>{changeText}</td>
                                <td className="py-4 px-6 text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                    <button
                                      onClick={() => handleOptimizeKeyword(kw.phrase)}
                                      className="p-1.5 rounded-lg bg-gray-900 border border-white/10 text-indigo-400 hover:text-white transition-all-300 cursor-pointer"
                                      title="AI Copywriter Optimizer"
                                    >
                                      <Sparkles className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleTriggerCheck(kw.id)}
                                      disabled={isChecking}
                                      className="p-1.5 rounded-lg bg-gray-900 border border-white/10 text-gray-400 hover:text-white transition-all-300 cursor-pointer disabled:opacity-50"
                                      title="Update Position"
                                    >
                                      <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteKeyword(kw.id)}
                                      className="p-1.5 rounded-lg bg-gray-900 border border-white/10 text-gray-400 hover:text-red-400 transition-all-300 cursor-pointer"
                                      title="Delete Keyword"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "explorer" ? (
            /* ================= TAB: KEYWORD EXPLORER ================= */
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-white">Keyword Explorer</h3>
                <p className="text-gray-400 text-sm font-normal mt-1">
                  Discover search volumes, CPC rates, search intent difficulties, and related questions.
                </p>
              </div>

              <div className="bento-card p-6">
                <form onSubmit={handleExplorerSearch} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-grow">
                    <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      required
                      value={explorerQuery}
                      onChange={(e) => setExplorerQuery(e.target.value)}
                      placeholder="Enter seed topic (e.g. rank tracking software)..."
                      className="pl-11 block w-full rounded-xl px-4 py-3 glass-input text-white placeholder-gray-500 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingKw}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all-300 disabled:opacity-50 flex items-center justify-center space-x-2 shrink-0 cursor-pointer shadow-lg shadow-indigo-600/25"
                  >
                    {isSearchingKw ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <span>Search Ideas</span>
                    )}
                  </button>
                </form>

                {explorerError && (
                  <div className="mt-4 bg-red-950/40 border border-red-500/40 text-red-200 text-xs rounded-xl p-3">
                    {explorerError}
                  </div>
                )}
              </div>

              {explorerSuggestions.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  <div className="bento-card lg:col-span-2 overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                      <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Keyword Suggestions</h4>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-white/10 bg-gray-950/40 text-gray-400 uppercase tracking-wider font-semibold">
                            <th className="py-3.5 px-6">Keyword</th>
                            <th className="py-3.5 px-4 text-center">Volume</th>
                            <th className="py-3.5 px-4">Difficulty</th>
                            <th className="py-3.5 px-4 text-center">CPC</th>
                            <th className="py-3.5 px-6 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-normal text-gray-300">
                          {explorerSuggestions.map((item, idx) => {
                            const isAlreadyTracked = keywords.some(
                              (k) => k.phrase.toLowerCase() === item.phrase.toLowerCase()
                            );
                            const isAdding = addedKwIds[item.phrase] || false;

                            let diffColor = "bg-emerald-500";
                            let diffTextColor = "text-emerald-400";
                            if (item.difficulty > 65) {
                              diffColor = "bg-red-500";
                              diffTextColor = "text-red-400";
                            } else if (item.difficulty > 35) {
                              diffColor = "bg-amber-500";
                              diffTextColor = "text-amber-400";
                            }

                            return (
                              <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-4 px-6 font-bold text-white">{item.phrase}</td>
                                <td className="py-4 px-4 text-center font-mono font-bold">{item.volume.toLocaleString()}</td>
                                <td className="py-4 px-4 font-mono">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-16 bg-gray-900 h-1.5 rounded-full overflow-hidden border border-white/10">
                                      <div className={`h-full ${diffColor}`} style={{ width: `${item.difficulty}%` }}></div>
                                    </div>
                                    <span className={`text-[10px] font-bold ${diffTextColor}`}>{item.difficulty}%</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-center font-mono text-gray-400">${item.cpc.toFixed(2)}</td>
                                <td className="py-4 px-6 text-right">
                                  <button
                                    onClick={() => handleAddExplorerKeyword(item.phrase)}
                                    disabled={isAlreadyTracked || isAdding}
                                    className={`inline-flex items-center space-x-1 px-3 py-1 rounded-xl text-[10px] font-bold border transition-all-300 cursor-pointer ${
                                      isAlreadyTracked
                                        ? "bg-gray-900 text-gray-500 border-white/5 cursor-not-allowed"
                                        : "bg-indigo-600 hover:bg-indigo-500 text-white border-transparent shadow-lg shadow-indigo-600/20"
                                    }`}
                                  >
                                    <Plus className="h-3 w-3" />
                                    <span>{isAlreadyTracked ? "Tracked" : isAdding ? "Adding..." : "Track"}</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bento-card p-6 space-y-4">
                    <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Search Intent Questions</h4>
                    <ul className="space-y-3">
                      {explorerQuestions.map((q, idx) => {
                        const isAlreadyTracked = keywords.some(
                          (k) => k.phrase.toLowerCase() === q.toLowerCase()
                        );
                        const isAdding = addedKwIds[q] || false;

                        return (
                          <li key={idx} className="bg-gray-950/60 border border-white/5 rounded-xl p-3.5 space-y-2">
                            <p className="text-xs text-gray-200 font-semibold italic">"{q}"</p>
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => setExplorerQuery(q)}
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                              >
                                Analyze seed
                              </button>
                              <button
                                onClick={() => handleAddExplorerKeyword(q)}
                                disabled={isAlreadyTracked || isAdding}
                                className="text-[10px] font-bold text-gray-400 hover:text-white disabled:text-gray-600 flex items-center space-x-1 cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                                <span>{isAlreadyTracked ? "Tracked" : isAdding ? "Adding..." : "Track"}</span>
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="bento-card p-16 text-center max-w-xl mx-auto my-6 space-y-4">
                  <Search className="h-10 w-10 text-gray-600 mx-auto" />
                  <h3 className="text-lg font-bold text-white">Search Seed Explorer</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Search keywords to pull CPC estimations, search volume metrics, and long-tail query variations.
                  </p>
                </div>
              )}
            </div>
          ) : activeTab === "audit" ? (
            /* ================= TAB: SITE AUDIT ================= */
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Technical Site Audit</h3>
                  <p className="text-gray-400 text-sm font-normal mt-1">
                    Crawl site URLs to detect broken links, missing meta descriptions, slow loading pages, and HTTPS issues.
                  </p>
                </div>
                <button
                  onClick={handleRunAudit}
                  disabled={isAuditing}
                  className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-indigo-600/25 transition-all-300 disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${isAuditing ? "animate-spin" : ""}`} />
                  <span>{isAuditing ? "Auditing Website..." : "Run Audit Scan"}</span>
                </button>
              </div>

              {isAuditing && (
                <div className="bg-indigo-950/40 border border-indigo-500/40 text-indigo-300 text-xs rounded-xl p-4 flex items-center space-x-3">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent"></div>
                  <p>
                    <strong>Crawl in progress:</strong> Visiting site pages to analyze title tags, headers, and asset loading latency...
                  </p>
                </div>
              )}

              {auditIssues.length > 0 ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bento-card p-6 flex flex-col justify-between">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Health Score</span>
                      <p className={`text-4xl font-extrabold mt-4 ${healthScore >= 80 ? "text-emerald-400" : healthScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                        {healthScore} <span className="text-xs font-normal text-gray-500">/ 100</span>
                      </p>
                    </div>

                    <div className="bento-card p-6 flex flex-col justify-between">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Lighthouse Speed</span>
                      <p className="text-4xl font-extrabold text-indigo-400 mt-4">
                        {pageSpeedScore ? pageSpeedScore : "94"} <span className="text-xs font-normal text-gray-500">/ 100</span>
                      </p>
                    </div>

                    <div className="bento-card p-6 flex flex-col justify-between">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Pages Audited</span>
                      <p className="text-4xl font-extrabold text-white mt-4">{pageCount}</p>
                    </div>

                    <div className="bento-card p-6 flex flex-col justify-between">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Logged Alerts</span>
                      <p className="text-4xl font-extrabold text-amber-400 mt-4">{auditIssues.length}</p>
                    </div>
                  </div>

                  <div className="bento-card overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                      <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Audit Diagnostic Logs</h4>
                    </div>

                    <div className="divide-y divide-white/5">
                      {auditIssues
                        .filter((issue) => issue.issueType !== "pagespeed-score")
                        .map((issue) => {
                          let badgeBg = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                          if (issue.severity === "critical") {
                            badgeBg = "bg-red-500/10 text-red-400 border-red-500/20";
                          } else if (issue.severity === "warning") {
                            badgeBg = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                          }

                          const getFixRecommendation = (type: string) => {
                            const map: Record<string, string> = {
                              "missing-title": "Add a unique, descriptive <title> tag inside the <head> section of this HTML page.",
                              "short-title": "Expand title length to 30-60 characters to optimize presentation on search index lists.",
                              "missing-meta-description": "Add a <meta name='description' content='...'> summary tag in the <head> of this page.",
                              "short-meta-description": "Expand description to 120-160 characters to improve user click CTR rates.",
                              "missing-alt-text": "Add descriptive 'alt' attribute text to images on this page.",
                              "mixed-content": "Change resource asset links from http:// to secure https://.",
                              "slow-page": "Optimize page structure, compress script assets, and defer slow images."
                            };
                            return map[type] || "Inspect the HTML source code of this page and verify structural tags conform to SEO standards.";
                          };

                          return (
                            <div key={issue.id} className="p-6 hover:bg-white/[0.02] flex flex-col md:flex-row gap-4 justify-between items-start text-xs transition-colors">
                              <div className="space-y-2 min-w-0 flex-grow max-w-xl">
                                <div className="flex items-center space-x-2.5">
                                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold uppercase ${badgeBg}`}>
                                    {issue.severity}
                                  </span>
                                  <strong className="text-white text-sm uppercase tracking-wide">
                                    {issue.issueType.replace("-", " ")}
                                  </strong>
                                </div>
                                <div className="text-indigo-400 font-mono truncate">{issue.url}</div>
                                <p className="text-gray-400 text-xs leading-relaxed">{issue.details}</p>
                              </div>

                              <div className="bg-gray-950/60 p-4 rounded-xl border border-white/5 max-w-sm w-full">
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                                  How to Fix
                                </span>
                                <p className="text-gray-300 leading-relaxed font-normal">
                                  {getFixRecommendation(issue.issueType)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bento-card p-16 text-center max-w-xl mx-auto my-6 space-y-4">
                  <ShieldCheck className="h-10 w-10 text-gray-600 mx-auto" />
                  <h3 className="text-lg font-bold text-white">Execute First Technical Audit</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Trigger a site crawl to compile actionable health diagnostic reports.
                  </p>
                </div>
              )}
            </div>
          ) : activeTab === "competitors" ? (
            /* ================= TAB: COMPETITORS ================= */
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-white">Competitor Tracking</h3>
                <p className="text-gray-400 text-sm font-normal mt-1">
                  Track up to 3 competitor domains side-by-side to compare organic ranking overlaps.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="bento-card p-6 space-y-4">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Add Competitor</h4>

                  {compError && (
                    <div className="bg-red-950/40 border border-red-500/40 text-red-200 text-xs rounded-xl p-3">
                      {compError}
                    </div>
                  )}

                  <form onSubmit={handleAddCompetitor} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Domain Name</label>
                      <input
                        type="text"
                        required
                        value={compDomain}
                        onChange={(e) => setCompDomain(e.target.value)}
                        className="mt-1 block w-full rounded-xl px-3.5 py-2.5 glass-input text-white text-xs font-mono"
                        placeholder="e.g. competitor.com"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isAddingComp || competitors.length >= 3}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs disabled:opacity-50 transition-all-300 cursor-pointer shadow-lg shadow-indigo-600/25"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{isAddingComp ? "Adding..." : "Add Competitor"}</span>
                    </button>
                  </form>
                </div>

                <div className="bento-card p-6 lg:col-span-2 space-y-4">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Monitored Domains</h4>
                  {competitors.length === 0 ? (
                    <p className="text-xs text-gray-500 py-4">No competitors tracked yet. Add one to build matrix.</p>
                  ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {competitors.map((c) => (
                        <li key={c.id} className="bg-gray-950/60 border border-white/5 rounded-xl p-4 flex items-center justify-between font-mono text-xs">
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Domain</span>
                            <span className="text-white font-bold truncate block max-w-[150px]">{c.domain}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteCompetitor(c.id)}
                            className="p-2 rounded-lg border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {overlapData.length > 0 && competitors.length > 0 ? (
                <div className="bento-card overflow-hidden">
                  <div className="p-6 border-b border-white/10">
                    <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Rank Overlap Matrix</h4>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 bg-gray-950/40 text-gray-400 uppercase tracking-wider font-semibold font-mono">
                          <th className="py-3.5 px-6">Keyword</th>
                          <th className="py-3.5 px-4 text-center">Country</th>
                          <th className="py-3.5 px-4 text-center">Your Rank ({project?.domain})</th>
                          {competitors.map((c) => (
                            <th key={c.id} className="py-3.5 px-4 text-center">
                              {c.domain}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono text-gray-300">
                        {overlapData.map((item, idx) => (
                          <tr key={item.keywordId || idx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-4 px-6 font-bold text-white font-sans">{item.phrase}</td>
                            <td className="py-4 px-4 text-center">
                              <span className="bg-gray-900 border border-white/10 text-[10px] font-semibold px-2 py-0.5 rounded-full text-gray-400 uppercase">
                                {item.country}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`inline-block font-extrabold px-3 py-1 rounded-xl text-center min-w-[36px] ${item.userRank <= 100 ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-gray-900 text-gray-500 border border-white/10"}`}>
                                {item.userRank <= 100 ? item.userRank : "100+"}
                              </span>
                            </td>
                            {competitors.map((c) => {
                              const rank = item.competitorRanks[c.id] ?? 101;
                              const isRanked = rank <= 100;
                              const competitorBeatsUser = isRanked && (item.userRank > 100 || rank < item.userRank);

                              return (
                                <td key={c.id} className="py-4 px-4 text-center">
                                  <span className={`inline-block font-extrabold px-3 py-1 rounded-xl text-center min-w-[36px] ${isRanked ? competitorBeatsUser ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-gray-900 text-gray-500 border border-white/10"}`}>
                                    {isRanked ? rank : "100+"}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          ) : activeTab === "gsc" ? (
            /* ================= TAB: GOOGLE SEARCH CONSOLE ================= */
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Google Search Console Integration</h3>
                  <p className="text-gray-400 text-sm font-normal mt-1">
                    Monitor organic traffic queries, impressions, CTR percentages, and average SERP positions.
                  </p>
                </div>
                
                <div className="flex items-center space-x-3 shrink-0">
                  <span className="text-xs text-gray-400 font-mono uppercase">
                    {gscConnectedState ? "Connected" : "Disconnected"}
                  </span>
                  <button
                    onClick={() => handleToggleGsc(!gscConnectedState)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all-300 cursor-pointer ${
                      gscConnectedState
                        ? "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25"
                    }`}
                  >
                    {gscConnectedState ? "Disconnect GSC" : "Connect GSC Account"}
                  </button>
                </div>
              </div>

              {gscConnectedState ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bento-card p-6">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Total Clicks</span>
                      <p className="text-3xl font-extrabold text-white mt-4">
                        {gscTimeline.reduce((acc, curr) => acc + curr.clicks, 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="bento-card p-6">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Total Impressions</span>
                      <p className="text-3xl font-extrabold text-white mt-4">
                        {gscTimeline.reduce((acc, curr) => acc + curr.impressions, 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="bento-card p-6">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Average CTR</span>
                      <p className="text-3xl font-extrabold text-indigo-400 mt-4">
                        {(gscTimeline.reduce((acc, curr) => acc + curr.ctr, 0) / (gscTimeline.length || 1)).toFixed(2)}%
                      </p>
                    </div>

                    <div className="bento-card p-6">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Avg. Position</span>
                      <p className="text-3xl font-extrabold text-emerald-400 mt-4">
                        #{(gscTimeline.reduce((acc, curr) => acc + curr.position, 0) / (gscTimeline.length || 1)).toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <div className="bento-card p-6 space-y-4">
                    <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Organic Click Performance</h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={gscTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                          <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} />
                          <YAxis stroke="#9ca3af" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: "#111827", borderColor: "rgba(255,255,255,0.12)", borderRadius: "12px" }} />
                          <Line type="monotone" dataKey="clicks" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} name="Clicks" />
                          <Line type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Impressions" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bento-card p-16 text-center max-w-xl mx-auto my-6 space-y-4">
                  <BarChart2 className="h-10 w-10 text-gray-600 mx-auto" />
                  <h3 className="text-lg font-bold text-white">Connect Search Console</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Link Search Console to import real-time query metrics directly from Google's database.
                  </p>
                </div>
              )}
            </div>
          ) : activeTab === "assistant" ? (
            /* ================= TAB: AI ASSISTANT ================= */
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-indigo-400" />
                  <span>AI SEO Assistant</span>
                </h3>
                <p className="text-gray-400 text-sm font-normal mt-1">
                  Get personalized SEO recommendations, content briefs, and keyword assistance.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bento-card p-6 space-y-4">
                    <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Site Briefing</h4>

                    {briefingSuccess && (
                      <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs rounded-xl p-3">
                        {briefingSuccess}
                      </div>
                    )}

                    <form onSubmit={handleSaveBriefing} className="space-y-4">
                      <div>
                        <textarea
                          rows={6}
                          value={briefingInput}
                          onChange={(e) => setBriefingInput(e.target.value)}
                          placeholder="Describe target market, offerings, and audience goals..."
                          className="w-full rounded-xl p-3.5 glass-input text-white text-xs resize-none font-sans"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSavingBriefing}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs disabled:opacity-50 transition-all-300 cursor-pointer shadow-lg shadow-indigo-600/25"
                      >
                        <span>{isSavingBriefing ? "Saving..." : "Save Briefing"}</span>
                      </button>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-col h-[600px] bento-card overflow-hidden">
                  <div className="flex-grow p-6 overflow-y-auto space-y-4">
                    {assistantMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                            msg.role === "user"
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-950/80 text-gray-200 border border-white/10"
                          }`}
                        >
                          <p className="font-bold text-[10px] uppercase opacity-70 mb-1">
                            {msg.role === "user" ? "You" : "Syntrix AI"}
                          </p>
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                      </div>
                    ))}
                    {isAssistantTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-950/80 text-gray-200 border border-white/10 rounded-2xl p-4 text-xs">
                          <div className="flex space-x-1.5 items-center">
                            <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce"></div>
                            <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSendAssistantMessage} className="p-4 border-t border-white/10 bg-gray-950/40 flex items-center space-x-3">
                    <input
                      type="text"
                      value={assistantInput}
                      onChange={(e) => setAssistantInput(e.target.value)}
                      placeholder="Ask AI Assistant anything..."
                      className="flex-grow rounded-xl px-4 py-2.5 glass-input text-xs text-white"
                    />
                    <button
                      type="submit"
                      disabled={isAssistantTyping || !assistantInput.trim()}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs disabled:opacity-50 transition-all-300 cursor-pointer shadow-lg shadow-indigo-600/25"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            /* ================= TAB: SETTINGS ================= */
            <div className="max-w-2xl space-y-8">
              <div>
                <h3 className="text-xl font-bold text-white">Project Settings</h3>
                <p className="text-gray-400 text-sm font-normal mt-1">
                  Configure alerts and notification webhooks.
                </p>
              </div>

              {settingsSuccess && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs rounded-xl p-4">
                  {settingsSuccess}
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="bento-card p-6 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Slack Webhook Alerts</h4>
                  <input
                    type="url"
                    value={webhookInput}
                    onChange={(e) => setWebhookInput(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full rounded-xl px-4 py-3 glass-input text-xs text-white font-mono"
                  />
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs disabled:opacity-50 transition-all-300 cursor-pointer shadow-lg shadow-indigo-600/25"
                  >
                    <span>{isSavingSettings ? "Saving..." : "Save Settings"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* AI Copywriter Modal */}
      {showOptimizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bento-card w-full max-w-2xl p-6 border border-white/10 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">AI Copywriting Optimizer</h3>
              </div>
              <button onClick={() => setShowOptimizeModal(false)} className="text-gray-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-1 font-mono text-xs">
              <span className="text-gray-400 uppercase">Target Keyword</span>
              <p className="text-white font-bold">"{optimizingKeyword}"</p>
            </div>

            {isOptimizing ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                <p className="text-xs text-gray-400">Rewriting metadata and head tags...</p>
              </div>
            ) : optimizationResult ? (
              <div className="space-y-6 divide-y divide-white/10">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Suggested Title Tags</h4>
                  <ul className="space-y-2">
                    {optimizationResult.suggestedTitles?.map((t: string, idx: number) => (
                      <li key={idx} className="bg-gray-950/60 p-3 rounded-xl border border-white/5 text-gray-200 text-xs flex justify-between items-center">
                        <span>{t}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(t);
                            alert("Copied title to clipboard!");
                          }}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold ml-2 cursor-pointer"
                        >
                          Copy
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3 pt-4">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Suggested Meta Descriptions</h4>
                  <ul className="space-y-2">
                    {optimizationResult.suggestedMetaDescriptions?.map((d: string, idx: number) => (
                      <li key={idx} className="bg-gray-950/60 p-3 rounded-xl border border-white/5 text-gray-200 text-xs flex justify-between items-center gap-3">
                        <span>{d}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(d);
                            alert("Copied description to clipboard!");
                          }}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold shrink-0 cursor-pointer"
                        >
                          Copy
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowOptimizeModal(false)}
                className="px-4 py-2 border border-white/10 bg-gray-900 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
