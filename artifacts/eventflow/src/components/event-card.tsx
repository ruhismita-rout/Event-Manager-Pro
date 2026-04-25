import { format } from "date-fns";
import { Link } from "wouter";
import { Users, Calendar, Video, MapPin } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Event } from "@workspace/api-client-react";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const isLive = event.status === "live";

  return (
    <Card className="group overflow-hidden flex flex-col h-full hover-elevate transition-all duration-200">
      {event.thumbnailUrl ? (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img 
            src={event.thumbnailUrl} 
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-muted flex items-center justify-center border-b">
          <Video className="w-12 h-12 text-muted-foreground/30" />
        </div>
      )}
      
      <CardHeader className="p-5 pb-2">
        <div className="flex justify-between items-start gap-4 mb-2">
          <Badge variant={isLive ? "destructive" : "secondary"} className="uppercase text-[10px] tracking-wider font-semibold">
            {event.status}
          </Badge>
          <Badge variant="outline" className="text-[10px] tracking-wider">
            {event.category}
          </Badge>
        </div>
        <h3 className="font-semibold text-lg line-clamp-2 text-foreground mb-1 leading-tight group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {event.description}
        </p>
      </CardHeader>
      
      <CardContent className="p-5 pt-4 flex-1">
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0 text-primary/70" />
            <span>{format(new Date(event.scheduledAt), "MMM d, yyyy • h:mm a")}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0 text-primary/70" />
            <span className="truncate">Hosted by {event.hostName}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-5 pt-0 mt-auto flex justify-between items-center border-t border-border/50 bg-muted/20">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground mt-4">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span>
            {event.registrationCount} {event.maxAttendees ? `/ ${event.maxAttendees}` : ""} registered
          </span>
        </div>
        <Link href={`/events/${event.id}`} className="mt-4 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
          View Details &rarr;
        </Link>
      </CardFooter>
    </Card>
  );
}
