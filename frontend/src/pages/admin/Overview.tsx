import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/src/components/Icons";
import { getStoredFiles, getStoredVisitors } from "../../lib/api";
import { Video, Visitor } from "../../types";
import { Link } from "react-router-dom";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";

export function Overview() {
  const [files, setFiles] = useState<Video[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [backendStatus, setBackendStatus] = useState<"online" | "offline" | "checking">("checking");

  useEffect(() => {
    // Check Backend Health
    const KOYEB_URL = import.meta.env.VITE_KOYEB_PROCESSING_SERVER_URL;
    if (KOYEB_URL) {
      fetch(`${KOYEB_URL}/health`)
        .then(res => res.ok ? setBackendStatus("online") : setBackendStatus("offline"))
        .catch(() => setBackendStatus("offline"));
    } else {
      setBackendStatus("offline");
    }
    // Load directly from D1 store
    const localFiles = getStoredFiles();
    const localVisitors = getStoredVisitors();
    setFiles(localFiles);
    setVisitors(localVisitors);

    // Fetch from Cloudflare Pages D1 API if available
    fetch("/api/videos")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setFiles(data);
      })
      .catch(() => {});

    fetch("/api/visitors")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setVisitors(data);
      })
      .catch(() => {});
  }, []);

  const totalFiles = files.length;
  const totalViews = files.reduce((acc, f) => acc + (f.views || 0), 0);
  const totalVisitorsCount = visitors.length;

  // Navigation for Monthly Views Analytics
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  // Generate complete days (1 to daysInMonth) for selected month
  const monthlyViewsData = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    // Calculate real visitor views for this date
    const dayViews = visitors.filter((v) => {
      if (!v.visitedAt) return false;
      const vDate = new Date(v.visitedAt);
      return (
        vDate.getFullYear() === currentYear &&
        vDate.getMonth() === currentMonth &&
        vDate.getDate() === dayNum
      );
    }).length;

    return {
      day: `${dayNum}`,
      views: dayViews,
    };
  });

  // Device categories and distribution calculation
  const deviceCategories = [
    { key: "Desktop", label: "Desktop", icon: Icons.Monitor, color: "bg-emerald-500 text-emerald-500" },
    { key: "Mobile", label: "Mobile", icon: Icons.Smartphone, color: "bg-indigo-500 text-indigo-500" },
    { key: "Tablet", label: "Tablet", icon: Icons.Tablet, color: "bg-amber-500 text-amber-500" },
    { key: "Smart TV", label: "Smart TV", icon: Icons.Tv, color: "bg-sky-500 text-sky-500" },
    { key: "Other", label: "Other", icon: Icons.HelpCircle, color: "bg-rose-500 text-rose-500" },
  ];

  const counts: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0, "Smart TV": 0, Other: 0 };
  visitors.forEach((v) => {
    const osLower = (v.os || "").toLowerCase();
    const uaLower = (v.browser || "").toLowerCase();
    if (osLower.includes("windows") || osLower.includes("mac") || osLower.includes("linux")) {
      counts.Desktop++;
    } else if (osLower.includes("android") || osLower.includes("ios") || osLower.includes("iphone")) {
      counts.Mobile++;
    } else if (osLower.includes("ipad") || osLower.includes("tablet")) {
      counts.Tablet++;
    } else if (osLower.includes("tv") || uaLower.includes("smarttv") || uaLower.includes("tizen")) {
      counts["Smart TV"]++;
    } else {
      counts.Other++;
    }
  });

  const deviceData = deviceCategories.map((cat) => ({
    ...cat,
    percentage: totalVisitorsCount > 0 ? Math.round((counts[cat.key] / totalVisitorsCount) * 100) : 0,
    count: counts[cat.key],
  }));

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-8 text-white shadow-lg dark:bg-slate-800">
        <div className="relative z-10 space-y-2">
          <h2 className="text-2xl font-black md:text-3xl">Good Morning, Admin! 👋</h2>
          <p className="text-slate-300 max-w-md text-sm md:text-base">
            All media metrics and analytics are synchronized live from Cloudflare D1 database.
          </p>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-emerald-500/20 to-transparent" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Files", value: totalFiles.toString(), icon: Icons.FolderOpen },
          { label: "Total Views", value: totalViews > 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews.toString(), icon: Icons.Eye },
          { label: "Visitors", value: totalVisitorsCount.toString(), icon: Icons.Users },
          { 
            label: "Backend Server", 
            value: backendStatus === "online" ? "SYSTEM ONLINE" : backendStatus === "offline" ? "SYSTEM OFFLINE" : "CHECKING...", 
            icon: Icons.ShieldCheck,
            isOffline: backendStatus === "offline"
          },
        ].map((stat, i) => (
          <Card key={i} className={`border bg-card shadow-sm hover:shadow-md transition-shadow ${(stat as any).isOffline ? 'border-destructive/50 bg-destructive/5' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${(stat as any).isOffline ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground">{stat.label}</p>
                <h3 className={`text-2xl font-black ${(stat as any).isOffline ? 'text-destructive' : 'text-foreground'}`}>{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Views Analytics Chart */}
        <Card className="lg:col-span-2 border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 py-4 px-6">
            <CardTitle className="text-sm font-bold text-foreground">
              Monthly Views Analytics ({monthName} {currentYear})
            </CardTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Previous Month"
              >
                <Icons.ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold min-w-[100px] text-center text-foreground">
                {monthName} {currentYear}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Next Month"
              >
                <Icons.ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyViewsData}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.627 0.194 149.214)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="oklch(0.627 0.194 149.214)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(var(--border) / 50%)" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fontWeight: 600, fill: "oklch(var(--muted-foreground))" }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fontWeight: 600, fill: "oklch(var(--muted-foreground))" }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "oklch(var(--card))", 
                      borderColor: "oklch(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
                    }}
                    formatter={(value: number) => [`${value} Views`, "Views"]}
                    labelFormatter={(label) => `Day ${label} of ${monthName}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="views" 
                    stroke="oklch(0.627 0.194 149.214)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorViews)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Device Distribution */}
        <Card className="border bg-card shadow-sm flex flex-col justify-between">
          <CardHeader className="border-b bg-muted/20 py-4 px-6">
            <CardTitle className="text-sm font-bold text-foreground">Device Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {deviceData.map((device) => (
              <div key={device.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-muted/50 ${device.color.split(" ")[1]}`}>
                      <device.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground">{device.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">({device.count})</span>
                    <span className="text-xs font-black text-foreground">{device.percentage}%</span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${device.color.split(" ")[0]}`}
                    style={{ width: `${device.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitors Table */}
        <Card className="border bg-card shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/20 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground">Recent Traffic Logs</CardTitle>
            <Link to="/admin_dashboard/visitors" className="text-xs font-bold text-emerald-500 hover:underline">View All</Link>
          </CardHeader>
          <CardContent className="p-0">
            {visitors.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-medium">
                No visitor traffic logged in D1 database yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/10 text-xs font-bold text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4">Visitor</th>
                      <th className="px-6 py-4">Location</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visitors.slice(0, 5).map((visitor) => (
                      <tr key={visitor.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground">
                              {visitor.country ? visitor.country.slice(0, 2).toUpperCase() : "??"}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-foreground">{visitor.ip}</span>
                              <span className="text-xs text-muted-foreground">{visitor.browser}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-foreground">{visitor.country || "Unknown"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold">D1 Logged</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Media Library Quick Peek */}
        <Card className="border bg-card shadow-sm">
          <CardHeader className="border-b bg-muted/20 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground">Media Files Library</CardTitle>
            <Link to="/admin_dashboard/files" className="text-xs font-bold text-emerald-500 hover:underline">Manage Files</Link>
          </CardHeader>
          <CardContent className="p-6">
            {files.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground font-medium">
                No videos stored in D1 database. Upload your first video from the Media Library!
              </div>
            ) : (
              <div className="space-y-4">
                {files.slice(0, 5).map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
                    <div className="flex items-center gap-3">
                      <img src={file.thumbnailUrl} alt="" className="h-10 w-16 rounded-lg object-cover" />
                      <div className="space-y-0.5 max-w-xs">
                        <h4 className="text-xs font-bold text-foreground truncate">{file.title}</h4>
                        <p className="text-xs text-muted-foreground font-mono">/ad/{file.slug}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-500">{file.views} views</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
