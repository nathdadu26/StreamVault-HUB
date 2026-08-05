/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Icons } from "@/src/components/Icons";
import { useTheme } from "@/src/components/ThemeProvider";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform">
             <Icons.ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-xl font-black tracking-tight text-foreground/90">
            StreamVault
          </span>
          <span className="bg-emerald-500 px-2.5 py-0.5 rounded-lg text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
            HUB
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 p-1 rounded-xl bg-muted/30 border border-border/40">
            <button 
              onClick={() => setTheme("light")}
              className={`p-1.5 rounded-lg transition-all ${theme === "light" ? "bg-background shadow-sm text-emerald-500" : "text-muted-foreground hover:text-foreground"}`}
            >
               <Icons.Sun className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={() => setTheme("dark")}
              className={`p-1.5 rounded-lg transition-all ${theme === "dark" ? "bg-background shadow-sm text-emerald-500" : "text-muted-foreground hover:text-foreground"}`}
            >
               <Icons.Moon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
