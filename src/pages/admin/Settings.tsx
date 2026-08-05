import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/src/components/Icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { TaskLinksManagement } from "@/src/components/admin/TaskLinksManagement";

export function Settings() {
  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="grid grid-cols-1 gap-8">
        {/* Task Links Management */}
        <TaskLinksManagement />

        {/* General Settings */}
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground/80">General Configuration</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Basic system parameters and branding</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Platform Name</Label>
                <Input defaultValue="StreamVault HUB" className="h-11 rounded-xl bg-muted/20 border-border/40 focus-visible:ring-emerald-500/20" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Contact Email</Label>
                <Input defaultValue="support@streamvault.hub" className="h-11 rounded-xl bg-muted/20 border-border/40 focus-visible:ring-emerald-500/20" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground/80">Security & Access</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Protection and verification controls</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              {[
                { title: "VPN Protection", desc: "Block visitors using VPN or Proxies", enabled: true },
                { title: "Link Expiration", desc: "Download links expire after 24 hours", enabled: true },
                { title: "AdBlock Detection", desc: "Force users to disable AdBlock to continue", enabled: false },
                { title: "Anti-Bot Verification", desc: "Enable CAPTCHA for sensitive actions", enabled: true },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between group">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-black text-foreground/80">{item.title}</h4>
                      <p className="text-xs text-muted-foreground/60 font-medium">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={item.enabled} className="data-[state=checked]:bg-emerald-500" />
                  </div>
                  {idx < 3 && <Separator className="my-4 bg-border/40" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Integration Settings */}
        <Card className="border border-border/40 bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/40 bg-muted/20">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground/80">External Integrations</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Connect third-party services</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid gap-6">
               <div className="p-6 rounded-2xl bg-sky-500/5 border border-sky-500/10 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                     <div className="h-12 w-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600">
                        <Icons.Telegram className="h-6 w-6" />
                     </div>
                     <div className="space-y-0.5">
                        <h4 className="text-sm font-black text-sky-700">Telegram Bot API</h4>
                        <p className="text-xs text-sky-600/60 font-medium">Auto-post updates to your channel</p>
                     </div>
                  </div>
                  <Button variant="outline" className="border-sky-500/20 text-sky-600 hover:bg-sky-500/10 h-10 rounded-xl px-6 font-black text-xs uppercase tracking-widest">Configure</Button>
               </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4 pt-4">
           <Button variant="outline" className="h-12 px-8 rounded-xl font-black text-xs uppercase tracking-widest border-border/40">Cancel</Button>
           <Button className="h-12 px-10 rounded-xl font-black text-xs uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20">Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
