import { AppLayout } from "@/components/layout";
import { useGetDashboardStats, useGetUpcomingEvents, useGetRecentRegistrations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Link } from "wouter";
import { Activity, Users, Video, Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: upcomingEventsData, isLoading: eventsLoading } = useGetUpcomingEvents();
  const { data: recentRegistrationsData, isLoading: regsLoading } = useGetRecentRegistrations();
  const upcomingEvents = upcomingEventsData?.events;
  const recentRegistrations = recentRegistrationsData?.registrations;

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your event performance.</p>
          </div>
          <Link href="/events/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            Create Event
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                {statsLoading ? "-" : `+${stats?.eventsThisMonth} this month`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.totalRegistrations}</div>
              <p className="text-xs text-muted-foreground">
                {statsLoading ? "-" : `+${stats?.registrationsThisMonth} this month`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live Now</CardTitle>
              <Video className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.liveEvents}</div>
              <p className="text-xs text-muted-foreground">
                Currently broadcasting
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.upcomingEvents}</div>
              <p className="text-xs text-muted-foreground">
                Scheduled events
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming Events</CardTitle>
              <Link href="/events" className="text-sm font-medium text-primary flex items-center hover:underline">
                View all <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />)}
                </div>
              ) : upcomingEvents?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No upcoming events</div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents?.map(event => (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <Link href={`/events/${event.id}`} className="font-medium hover:text-primary transition-colors">
                          {event.title}
                        </Link>
                        <div className="text-sm text-muted-foreground mt-1">
                          {format(new Date(event.scheduledAt), "MMM d, yyyy • h:mm a")}
                        </div>
                      </div>
                      <Badge variant="outline">{event.registrationCount} registered</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Recent Registrations</CardTitle>
            </CardHeader>
            <CardContent>
              {regsLoading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />)}
                </div>
              ) : recentRegistrations?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No recent registrations</div>
              ) : (
                <div className="space-y-4">
                  {recentRegistrations?.map(reg => (
                    <div key={reg.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{reg.attendeeName}</div>
                        <div className="text-sm text-muted-foreground">{reg.attendeeEmail}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium line-clamp-1 max-w-[200px]">
                          {reg.event?.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(reg.registeredAt), "MMM d")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
