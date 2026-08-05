/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/src/components/Icons";
import { MOCK_ANALYTICS, MOCK_VISITORS } from "../../data/mock";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";

const DEVICE_DATA = [
  { name: 'Desktop', value: 65, color: 'oklch(0.627 0.194 149.214)' },
  { name: 'Mobile', value: 28, color: 'oklch(0.627 0.194 149.214 / 60%)' },
  { name: 'Tablet', value: 7, color: 'oklch(0.627 0.194 149.214 / 30%)' },
];

export function Overview() {
  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-8 text-white shadow-lg dark:bg-slate-800">
        <div className="relative z-10 space-y-2">
          <h2 className="text-2xl font-black md:text-3xl">Good morning, Admin! 👋</h2>
          <p className="text-slate-300 max-w-md text-sm md:text-base">
            Here's what's happening with your stream vault today. Your views are up by 12% compared to yesterday.
          </p>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-emerald-500/20 to-transparent" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Files", value: MOCK_ANALYTICS.totalFiles, icon: Icons.FileStack, trend: "+12", trendDir: "up" },
          { label: "Total Views", value: `${(MOCK_ANALYTICS.totalViews / 1000).toFixed(1)}K`, icon: Icons.Eye, trend: "+2.4%", trendDir: "up" },
          { label: "Visitors", value: "1.2K", icon: Icons.Users, trend: "+8%", trendDir: "up" },
          { label: "Completion", value: "78%", icon: Icons.Checklist, trend: "-1%", trendDir: "down" },
        ].map((stat, i) => (
          <Card key={i} className="border bg-card shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${stat.trendDir === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {stat.trend}
                  {stat.trendDir === 'up' ? <Icons.ChevronUp className="h-3 w-3" /> : <Icons.ChevronDown className="h-3 w-3" />}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">{stat.label}</p>
                <h3 className="text-2xl font-black text-foreground/90">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-4">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">Monthly Views Analytics</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                Views
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_ANALYTICS.monthlyViews}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.627 0.194 149.214)" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="oklch(0.627 0.194 149.214)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(var(--border) / 50%)" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: "oklch(var(--muted-foreground))" }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: "oklch(var(--muted-foreground))" }}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "oklch(var(--card))", 
                      borderColor: "oklch(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
                    }}
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
        <Card className="border bg-card shadow-sm">
          <CardHeader className="border-b bg-muted/30 py-4">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">Device Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DEVICE_DATA} layout="vertical" margin={{ left: 0, right: 30 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 700, fill: "oklch(var(--foreground))" }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {DEVICE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4 mt-2">
              {DEVICE_DATA.map((device, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: device.color }} />
                    <span className="text-xs font-bold text-muted-foreground">{device.name}</span>
                  </div>
                  <span className="text-xs font-black">{device.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitors Table */}
        <Card className="border bg-card shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">Recent Traffic</CardTitle>
            <button className="text-xs font-bold text-emerald-500 hover:underline">View All</button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <tr>
                    <th className="px-6 py-4">Visitor</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {MOCK_VISITORS.slice(0, 5).map((visitor) => (
                    <tr key={visitor.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-[10px] text-muted-foreground">
                            {visitor.country.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-xs">{visitor.ip}</span>
                            <span className="text-[10px] text-muted-foreground">{visitor.browser}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium">{visitor.country}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">Verified</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Highest Visitors Ranking */}
        <Card className="border bg-card shadow-sm">
          <CardHeader className="border-b bg-muted/30 py-4 px-6">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">Top Locations</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {[
                { country: "United States", visits: "4.2K", percentage: 45 },
                { country: "India", visits: "2.1K", percentage: 22 },
                { country: "United Kingdom", visits: "1.8K", percentage: 18 },
                { country: "Germany", visits: "950", percentage: 10 },
                { country: "Other", visits: "450", percentage: 5 },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{item.country}</span>
                    <span className="text-muted-foreground">{item.visits}</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000" 
                      style={{ width: `${item.percentage}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
