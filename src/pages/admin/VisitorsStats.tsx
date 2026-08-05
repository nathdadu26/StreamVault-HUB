import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStoredVisitors } from "../../lib/api";
import { Visitor } from "../../types";

export function VisitorsStats() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);

  useEffect(() => {
    // Load stored visitors from Cloudflare D1 local store
    const local = getStoredVisitors();
    setVisitors(local);

    // Also fetch from Cloudflare Pages Function endpoint /api/visitors
    fetch("/api/visitors")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setVisitors(data);
      })
      .catch(() => {});
  }, []);

  // Calculate real device & browser metrics from D1 visitors
  const total = visitors.length || 1;
  
  const osCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};

  visitors.forEach((v) => {
    osCounts[v.os] = (osCounts[v.os] || 0) + 1;
    browserCounts[v.browser] = (browserCounts[v.browser] || 0) + 1;
  });

  const deviceRanking = Object.keys(osCounts).length > 0
    ? Object.entries(osCounts).map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
    : [
        { name: "Windows", count: 0, percentage: 0 },
        { name: "Android", count: 0, percentage: 0 },
        { name: "iOS", count: 0, percentage: 0 },
        { name: "macOS", count: 0, percentage: 0 },
      ];

  const browserRanking = Object.keys(browserCounts).length > 0
    ? Object.entries(browserCounts).map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
    : [
        { name: "Chrome", count: 0, percentage: 0 },
        { name: "Safari", count: 0, percentage: 0 },
        { name: "Firefox", count: 0, percentage: 0 },
      ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Top Visitors Table */}
      <Card className="border border-border/40 bg-card shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground/80">
            Cloudflare D1 Visitor Activity ({visitors.length} Total Logs)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {visitors.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground font-bold">
              No visitor traffic recorded in D1 yet. Access public links to register visitors.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">IP Address</th>
                    <th className="px-6 py-4">Interactions</th>
                    <th className="px-6 py-4">System</th>
                    <th className="px-6 py-4">Origin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {visitors.slice(0, 10).map((visitor, idx) => (
                    <tr key={visitor.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`h-6 w-6 flex items-center justify-center rounded-lg font-black text-[10px] ${idx < 3 ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted/50 text-muted-foreground/60"}`}>
                          0{idx + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-emerald-500 font-bold">{visitor.ip}</td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                            <span className="font-black text-foreground/80">{visitor.totalLinksOpened}</span>
                            <span className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-tighter">interactions</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground/80">{visitor.os} • {visitor.browser}</td>
                      <td className="px-6 py-4 flex items-center gap-2">
                         <div className="h-4 w-6 bg-muted/50 rounded-sm" />
                         <span className="text-foreground/80">{visitor.country}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Devices Ranking */}
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground/80">Device Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
             {deviceRanking.map((item) => (
               <div key={item.name} className="space-y-3">
                 <div className="flex items-center justify-between text-[10px] font-black">
                   <span className="uppercase tracking-[0.2em] text-muted-foreground/60">{item.name}</span>
                   <span className="text-emerald-500">{item.percentage}%</span>
                 </div>
                 <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden border border-border/40">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                      style={{ width: `${item.percentage}%` }}
                    />
                 </div>
               </div>
             ))}
          </CardContent>
        </Card>

        {/* Browser Ranking */}
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground/80">Browser Ranking</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
             {browserRanking.map((item) => (
               <div key={item.name} className="space-y-3">
                 <div className="flex items-center justify-between text-[10px] font-black">
                   <span className="uppercase tracking-[0.2em] text-muted-foreground/60">{item.name}</span>
                   <span className="text-emerald-500">{item.count} sessions</span>
                 </div>
                 <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden border border-border/40">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                      style={{ width: `${item.percentage}%` }}
                    />
                 </div>
               </div>
             ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
