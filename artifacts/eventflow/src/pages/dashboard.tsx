import { AppLayout } from "@/components/layout";
import { useGetDashboardStats, useGetUpcomingEvents, useGetRecentRegistrations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Link } from "wouter";
import { Activity, Users, Video, Calendar, ArrowRight, TrendingUp, Sparkles, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis, CartesianGrid } from "recharts";

const shellVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: index * 0.06 },
  }),
};

const statusColors = ["var(--color-upcoming)", "var(--color-live)", "var(--color-ended)"];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: upcomingEventsData, isLoading: eventsLoading } = useGetUpcomingEvents();
  const { data: recentRegistrationsData, isLoading: regsLoading } = useGetRecentRegistrations();
  const upcomingEvents = upcomingEventsData?.events;
  const recentRegistrations = recentRegistrationsData?.registrations;

  const totalEvents = stats?.totalEvents ?? 0;
  const liveEvents = stats?.liveEvents ?? 0;
  const upcomingCount = stats?.upcomingEvents ?? 0;
  const endedCount = Math.max(0, totalEvents - liveEvents - upcomingCount);

  const statusBreakdown = [
    { name: "Upcoming", value: upcomingCount, fill: "var(--color-upcoming)" },
    { name: "Live", value: liveEvents, fill: "var(--color-live)" },
    { name: "Ended", value: endedCount, fill: "var(--color-ended)" },
  ];

  const chartConfig = {
    upcoming: { label: "Upcoming", color: "hsl(var(--primary))" },
    live: { label: "Live", color: "hsl(var(--destructive))" },
    ended: { label: "Ended", color: "hsl(var(--muted-foreground))" },
    registrations: { label: "Registrations", color: "hsl(var(--primary))" },
    events: { label: "Events", color: "hsl(var(--accent-foreground))" },
  };

  const registrationByDay = (() => {
    const map = new Map<string, number>();
    const now = new Date();
    for (let index = 6; index >= 0; index -= 1) {
      const day = new Date(now);
      day.setDate(now.getDate() - index);
      map.set(format(day, "MMM d"), 0);
    }
    for (const registration of recentRegistrations ?? []) {
      const key = format(new Date(registration.registeredAt), "MMM d");
      if (map.has(key)) {
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([date, registrations]) => ({ date, registrations }));
  })();

  const monthlyPerformance = [
    { label: "This Month", events: stats?.eventsThisMonth ?? 0, registrations: stats?.registrationsThisMonth ?? 0 },
    {
      label: "Lifetime",
      events: stats?.totalEvents ?? 0,
      registrations: stats?.totalRegistrations ?? 0,
    },
  ];

  const liveRatio = totalEvents > 0 ? Math.round((liveEvents / totalEvents) * 100) : 0;
  const upcomingRatio = totalEvents > 0 ? Math.round((upcomingCount / totalEvents) * 100) : 0;
  const engagementRatio = totalEvents > 0 ? Math.round(((stats?.totalRegistrations ?? 0) / totalEvents) * 10) : 0;

  return (
    <AppLayout>
      <motion.div className="p-8 max-w-7xl mx-auto space-y-8" variants={shellVariants} initial="hidden" animate="show">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-[0.16em] uppercase">Event Intelligence</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">Executive Dashboard</h1>
            <p className="text-muted-foreground mt-1">Real-time health, growth, and engagement across your virtual events.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">Last sync: now</Badge>
            <Link href="/events/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              Create Event
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Total Events",
              value: statsLoading ? "-" : stats?.totalEvents,
              hint: statsLoading ? "-" : `+${stats?.eventsThisMonth} this month`,
              icon: Calendar,
            },
            {
              title: "Total Registrations",
              value: statsLoading ? "-" : stats?.totalRegistrations,
              hint: statsLoading ? "-" : `+${stats?.registrationsThisMonth} this month`,
              icon: Users,
            },
            {
              title: "Live Events",
              value: statsLoading ? "-" : stats?.liveEvents,
              hint: "Currently broadcasting",
              icon: Video,
            },
            {
              title: "Upcoming",
              value: statsLoading ? "-" : stats?.upcomingEvents,
              hint: "Scheduled pipeline",
              icon: Activity,
            },
          ].map((item, index) => (
            <motion.div key={item.title} custom={index} variants={cardVariants} initial="hidden" animate="show">
              <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{item.value}</div>
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <motion.div custom={0} variants={cardVariants} initial="hidden" animate="show" className="xl:col-span-2">
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Registration Momentum</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Daily registrations for the past 7 days.</p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Trendline
                </Badge>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={chartConfig}
                  className="h-72 w-full"
                >
                  <AreaChart data={registrationByDay} margin={{ left: 8, right: 8, top: 16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="registrationsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-registrations)" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="var(--color-registrations)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="registrations"
                      stroke="var(--color-registrations)"
                      fill="url(#registrationsGradient)"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div custom={1} variants={cardVariants} initial="hidden" animate="show">
            <Card className="border-border/70 shadow-sm h-full">
              <CardHeader>
                <CardTitle>Event Status Mix</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Portfolio balance across lifecycle stages.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ChartContainer config={chartConfig} className="h-56 w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {statusBreakdown.map((entry, index) => (
                        <Cell key={entry.name} fill={statusColors[index % statusColors.length]} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>

                <div className="space-y-4 pt-2">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Live ratio</span>
                      <span className="font-medium">{liveRatio}%</span>
                    </div>
                    <Progress value={liveRatio} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Upcoming pipeline</span>
                      <span className="font-medium">{upcomingRatio}%</span>
                    </div>
                    <Progress value={upcomingRatio} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <motion.div custom={0} variants={cardVariants} initial="hidden" animate="show" className="xl:col-span-2">
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Performance Comparison</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Events vs registrations across key windows.</p>
                </div>
                <Badge variant="outline" className="gap-1"><CircleDot className="w-3 h-3" /> Benchmarks</Badge>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-72 w-full">
                  <BarChart data={monthlyPerformance} margin={{ left: 8, right: 8, top: 16, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="events" fill="var(--color-events)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="registrations" fill="var(--color-registrations)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div custom={1} variants={cardVariants} initial="hidden" animate="show">
            <Card className="border-border/70 shadow-sm h-full">
              <CardHeader>
                <CardTitle>Engagement Snapshot</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Average audience activation per event.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-xl border p-4 bg-muted/20">
                  <p className="text-sm text-muted-foreground">Registration density</p>
                  <p className="text-3xl font-bold mt-1">{engagementRatio.toFixed(1)}x</p>
                  <p className="text-xs text-muted-foreground mt-2">registrations per event (scaled)</p>
                </div>
                <div className="space-y-3">
                  {[{ label: "Live Readiness", value: liveRatio }, { label: "Upcoming Health", value: upcomingRatio }, { label: "Audience Activation", value: Math.min(100, engagementRatio * 10) }].map((metric) => (
                    <div key={metric.label}>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">{metric.label}</span>
                        <span className="font-medium">{metric.value}%</span>
                      </div>
                      <Progress value={metric.value} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div custom={0} variants={cardVariants} initial="hidden" animate="show">
            <Card className="border-border/70 shadow-sm">
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
                      <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/40 transition-colors">
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
          </motion.div>

          <motion.div custom={1} variants={cardVariants} initial="hidden" animate="show">
            <Card className="border-border/70 shadow-sm">
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
          </motion.div>
        </div>
      </motion.div>
    </AppLayout>
  );
}
