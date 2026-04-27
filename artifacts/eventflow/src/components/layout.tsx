import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: CalendarDays, label: "Events", href: "/events" },
  ];

  return (
    <div className="w-64 border-r-4 border-sidebar-border bg-sidebar flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b-4 border-sidebar-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-md border-2 border-sidebar-border flex items-center justify-center shadow-[3px_3px_0_hsl(var(--sidebar-border))]">
            <span className="text-primary-foreground font-bold text-xl">E</span>
          </div>
          <div>
            <span className="text-sidebar-foreground font-bold text-xl tracking-tight">EventFlow</span>
            <p className="text-[11px] text-sidebar-foreground/80 uppercase tracking-[0.12em]">Neubrutal Console</p>
          </div>
        </Link>
      </div>



      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-extrabold uppercase tracking-wide transition-colors border-2",
              location === item.href
                ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border shadow-[3px_3px_0_hsl(var(--sidebar-border))]"
                : "text-sidebar-foreground/80 border-transparent hover:bg-sidebar-accent hover:text-black hover:border-sidebar-border"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t-4 border-sidebar-border">
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
