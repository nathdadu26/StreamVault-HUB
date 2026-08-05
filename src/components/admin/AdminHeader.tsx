import { Icons } from "@/src/components/Icons";
import { useTheme } from "@/src/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { useBackendHealth } from "@/src/hooks/useBackendHealth";

export function AdminHeader({ title, onMenuClick, isMobile }: { 
  title: string; 
  onMenuClick: () => void;
  isMobile: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const { isOnline } = useBackendHealth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 md:px-8 transition-colors">
      <div className="flex items-center gap-4">
        {isMobile && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg bg-muted/50 text-foreground hover:bg-muted transition-colors md:hidden border"
          >
            <Icons.Menu className="h-5 w-5" />
          </button>
        )}
        <div className="flex flex-col">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 md:text-xs">Admin Panel</h2>
          <h1 className="text-lg font-black tracking-tight md:text-xl text-foreground/90">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-wider">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SYSTEM ONLINE
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-wider">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              SYSTEM OFFLINE
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-border/50 mx-1 hidden sm:block" />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-lg hover:bg-muted transition-all h-9 w-9 border"
        >
          {theme === "dark" ? (
            <Icons.Sun className="h-4 w-4" />
          ) : (
            <Icons.Moon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
