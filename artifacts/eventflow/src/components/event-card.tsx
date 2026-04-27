import { format } from "date-fns";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Users, Calendar, Video, MapPin, ArrowUpRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Event } from "@workspace/api-client-react";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const isLive = event.status === "live";
  const fillRate = event.maxAttendees
    ? Math.min(100, Math.round((event.registrationCount / event.maxAttendees) * 100))
    : Math.min(100, event.registrationCount * 10);

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card className="group flex h-full flex-col overflow-hidden rounded-lg border-2 border-border bg-card shadow-[6px_6px_0_hsl(var(--border))] transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px]">
        {event.thumbnailUrl ? (
          <div className="aspect-video w-full overflow-hidden bg-muted border-b-2 border-border">
            <img
              src={event.thumbnailUrl}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="surface-hero aspect-video w-full border-b-2 border-border">
            <div className="flex h-full items-center justify-center">
              <div className="surface-glass rounded-lg px-5 py-4 text-foreground bg-card">
                <div className="flex items-center gap-3">
                  <div className="rounded-md border-2 border-border bg-accent p-3">
                    <Video className="h-8 w-8 text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase">Broadcast Preview</p>
                    <p className="text-xs text-muted-foreground">Stage goes live on schedule</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <CardHeader className="p-5 pb-2">
          <div className="mb-2 flex items-start justify-between gap-4">
            <Badge variant={isLive ? "destructive" : "secondary"} className="text-[10px]">
              {event.status}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {event.category}
            </Badge>
          </div>
          <h3 className="mb-1 line-clamp-2 text-lg font-black leading-tight text-foreground transition-colors group-hover:text-primary">
            {event.title}
          </h3>
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {event.description}
          </p>
        </CardHeader>

        <CardContent className="flex-1 p-5 pt-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-primary/70" />
              <span>{format(new Date(event.scheduledAt), "MMM d, yyyy • h:mm a")}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
              <span className="truncate">Hosted by {event.hostName}</span>
            </div>
          </div>

          <div className="mt-5 rounded-md border-2 border-border bg-muted/50 p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wide text-muted-foreground">
              <span>Seat momentum</span>
              <span>{fillRate}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-md border-2 border-border bg-card">
              <div
                className="h-full bg-primary transition-all duration-700"
                style={{ width: `${fillRate}%` }}
              />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-foreground/80">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>{isLive ? "Audience is gathering live now" : "RSVP flow stays open until broadcast ends"}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="mt-auto flex items-center justify-between border-t-2 border-border bg-muted/20 p-5 pt-0">
          <div className="mt-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {event.registrationCount} {event.maxAttendees ? `/ ${event.maxAttendees}` : ""} registered
            </span>
          </div>
          <Link href={`/events/${event.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/80">
            Experience
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
