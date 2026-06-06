import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, RefreshCw, Search, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function TopHeader() {
  const [time, setTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [light, setLight] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
  }, [light]);

  const fmt = time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const date = time.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border glass-panel">
      <div className="flex h-full items-center gap-3 px-4">
        <SidebarTrigger className="h-8 w-8" />

        <div className="relative hidden md:block flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Link to="/search">
            <Input
              readOnly
              placeholder="Search intelligence, markets, regions…"
              className="pl-9 pr-16 h-9 bg-secondary/50 border-border cursor-pointer focus-visible:ring-1"
            />
          </Link>
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground bg-background/40">⌘K</kbd>
        </div>

        <div className="flex-1 md:hidden" />

        <div className="hidden lg:flex flex-col items-end leading-tight font-mono mr-2">
          <span className="text-sm tabular-nums text-foreground">{fmt}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{date} · IST</span>
        </div>

        <Button
          variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 900); }}
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>

        <Button
          variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => setLight((l) => !l)}
          aria-label="Toggle theme"
        >
          {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        <Link to="/notifications">
          <Button variant="ghost" size="icon" className="h-8 w-8 relative" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-critical animate-pulse-dot" />
          </Button>
        </Link>

        <button className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/30 grid place-items-center text-xs font-semibold text-primary-foreground ring-1 ring-border">
          AI
        </button>
      </div>
    </header>
  );
}
