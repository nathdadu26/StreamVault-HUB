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
    if (v.os) osCounts[v.os] = (osCounts[v.os] || 0) + 1;
    if (v.browser) browserCounts[v.browser] = (browserCounts[v.browser] || 0) + 1;
  });

  const deviceRanking = Object.keys(osCounts).length > 0
    ? Object.entries(osCounts).map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
    : [
        { name: "Desktop", count: 0, percentage: 0 },
        { name: "Mobile", count: 0, percentage: 0 },
        { name: "Tablet", count: 0, percentage: 0 },
        { name: "Smart TV", count: 0, percentage: 0 },
        { name: "Other", count: 0, percentage: 0 },
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
        { name: "Edge", count: 0, percentage: 0 },
      ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Top Visitors Table */}
      <Card className="border border-border/40 bg-card shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
          <CardTitle className="text-sm font-bold text-foreground">
            Visitor Activity Logs ({visitors.length} Total Logs)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {visitors.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground font-medium">
              No visitor traffic recorded in D1 database yet. Access public links to register visitors.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 text-xs font-bold text-muted-foreground">
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
                        <span className={`h-6 w-6 flex items-center justify-center rounded-lg font-bold text-xs ${idx < 3 ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted/50 text-muted-foreground"}`}>
                          0{idx + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-emerald-500 font-bold">{visitor.ip}</td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{visitor.totalLinksOpened}</span>
                            <span className="text-xs text-muted-foreground">Interactions</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{visitor.os} • {visitor.browser}</td>
                      <td className="px-6 py-4 flex items-center gap-2">
                         <span className="text-foreground">{visitor.country || "Unknown"}</span>
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
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <CardTitle className="text-sm font-bold text-foreground">Device Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
             {deviceRanking.map((item) => (
               <div key={item.name} className="space-y-2">
                 <div className="flex items-center justify-between text-xs font-bold">
                   <span className="text-muted-foreground">{item.name}</span>
                   <span className="text-emerald-500">{item.percentage}%</span>
                 </div>
                 <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden border border-border/40">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                      style={{ width: `${item.percentage}%` }}
                    />
                 </div>
               </div>
             ))}
          </CardContent>
        </Card>

        {/* Browser Ranking */}
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <CardTitle className="text-sm font-bold text-foreground">Browser Ranking</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
             {browserRanking.map((item) => (
               <div key={item.name} className="space-y-2">
                 <div className="flex items-center justify-between text-xs font-bold">
                   <span className="text-muted-foreground">{item.name}</span>
                   <span className="text-emerald-500">{item.count} Sessions</span>
                 </div>
                 <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden border border-border/40">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
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
