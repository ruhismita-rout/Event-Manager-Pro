import { useListEvents } from "@workspace/api-client-react";
import { Link } from "wouter";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";

export default function Landing() {
  const { data, isLoading } = useListEvents({ status: "all" });
  
  const liveEvents = data?.events.filter(e => e.status === "live") || [];
  const upcomingEvents = data?.events.filter(e => e.status === "upcoming") || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">E</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">EventFlow</span>
          </div>
          <nav>
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
              <LayoutDashboard className="w-4 h-4" />
              Organizer Login
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-sidebar py-20 px-6 border-b border-sidebar-border">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-5xl font-extrabold tracking-tight text-sidebar-foreground sm:text-6xl">
              Professional Virtual Events, <br />
              <span className="text-primary">Executed Flawlessly.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover and join high-quality virtual broadcasts, webinars, and masterclasses from industry leaders.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-80 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {liveEvents.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                    <h2 className="text-2xl font-bold">Live Now</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {liveEvents.map(event => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-2xl font-bold mb-6">Upcoming Events</h2>
                {upcomingEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upcomingEvents.map(event => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
                    <p className="text-muted-foreground">No upcoming events scheduled right now.</p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
