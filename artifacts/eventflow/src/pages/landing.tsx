import { useListEvents } from "@workspace/api-client-react";
import { Link } from "wouter";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { LayoutDashboard, Radio, CalendarRange, Users, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Landing() {
  const { isOrganizer, logout } = useAuth();
  const { data, isLoading } = useListEvents({ status: "all" });

  const liveEvents = data?.events.filter(e => e.status === "live") || [];
  const upcomingEvents = data?.events.filter(e => e.status === "upcoming") || [];
  const totalRegistrations = data?.events.reduce((sum, event) => sum + event.registrationCount, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 border-b-4 border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md border-2 border-border flex items-center justify-center shadow-[3px_3px_0_hsl(var(--border))]">
              <span className="text-primary-foreground font-bold text-xl">E</span>
            </div>
            <span className="font-black text-xl tracking-tight text-foreground uppercase">EventFlow</span>
          </div>
          <nav>
            {isOrganizer ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboard" className="text-sm font-bold uppercase tracking-wide text-foreground hover:text-primary flex items-center gap-2 transition-colors">
                  <LayoutDashboard className="w-4 h-4" />
                  Organizer Dashboard
                </Link>
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            ) : (
              <Link href="/login" className="text-sm font-bold uppercase tracking-wide text-foreground hover:text-primary flex items-center gap-2 transition-colors">
                <LayoutDashboard className="w-4 h-4" />
                Organizer Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="surface-hero relative overflow-hidden px-6 py-16 text-foreground">
          <div className="surface-mesh absolute inset-0 opacity-35" />
          <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.3fr_0.9fr] lg:items-end">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="space-y-7"
            >
              <div className="inline-flex items-center gap-2 rounded-none border-2 border-border bg-card px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-foreground shadow-[4px_4px_0_hsl(var(--border))]">
                <Radio className="h-3.5 w-3.5" />
                Live experiences, brutal clarity
              </div>
              <div className="space-y-5">
                <h1 className="text-balance text-5xl font-black leading-tight tracking-tight text-foreground sm:text-6xl">
                  Virtual events with
                  <span className="mt-2 inline-block -rotate-1 border-2 border-border bg-white px-3 py-1 text-primary shadow-[5px_5px_0_hsl(var(--border))]">bold structure and</span>
                  <span className="mt-2 inline-block -rotate-1 border-2 border-border bg-card px-3 py-1 text-indigo-600 shadow-[5px_5px_0_hsl(var(--border))]">instant impact.</span>
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-foreground/90">
                  Discover live sessions, launches, and masterclasses with a faster RSVP flow, clearer analytics, and a high-contrast interface built to command attention.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href={liveEvents[0] ? `/events/${liveEvents[0].id}` : upcomingEvents[0] ? `/events/${upcomingEvents[0].id}` : "/events"}>
                  <Button className="h-11 px-6 text-sm">
                    Enter Featured Event
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/events">
                  <Button variant="secondary" className="h-11 px-6 text-sm">
                    Explore Schedule
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1"
            >
              {[
                { label: "Live now", value: liveEvents.length, icon: Radio },
                { label: "Upcoming", value: upcomingEvents.length, icon: CalendarRange },
                { label: "Registrations", value: totalRegistrations, icon: Users },
              ].map((item) => (
                <div key={item.label} className="surface-glass rounded-lg p-5 bg-card">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border-2 border-border bg-accent">
                    <item.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="text-3xl font-black">{item.value}</div>
                  <p className="mt-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </motion.div>
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
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                    <h2 className="text-2xl font-black uppercase">Live Now</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">Join sessions that are already in motion.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {liveEvents.map(event => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black uppercase">Upcoming Events</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Browse the next wave of sessions and save your seat with a smoother RSVP flow.</p>
                  </div>
                </div>
                {upcomingEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upcomingEvents.map(event => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-card rounded-lg border-2 border-dashed border-border shadow-[4px_4px_0_hsl(var(--border))]">
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
