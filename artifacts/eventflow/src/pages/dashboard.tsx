import { AppLayout } from "@/components/layout";
import { useGetDashboardStats, useGetRecentRegistrations, useListEvents } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Link } from "wouter";
import { Activity, Users, Video, Calendar, ArrowRight, TrendingUp, Sparkles, CircleDot, Radar, Gauge, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, ComposedChart, Line, Cell, Pie, PieChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";

const shellVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, when: "beforeChildren", staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: index * 0.05 },
  }),
};

const statusColors = ["var(--color-upcoming)", "var(--color-live)", "var(--color-ended)"];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: upcomingEventsData, isLoading: eventsLoading } = useListEvents({
    status: "upcoming",
    limit: 5,
    offset: 0,
  });
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

  const momentumData = registrationByDay.map((entry, index, array) => {
    const current = entry.registrations;
    const prev = array[index - 1]?.registrations ?? current;
    const prev2 = array[index - 2]?.registrations ?? prev;
    const movingAverage = Number(((current + prev + prev2) / 3).toFixed(1));
    return {
      ...entry,
      movingAverage,
    };
  });

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
  const eventsThisMonth = stats?.eventsThisMonth ?? 0;
  const regsThisMonth = stats?.registrationsThisMonth ?? 0;
  const monthEventGrowth = totalEvents > 0 ? Math.round((eventsThisMonth / totalEvents) * 100) : 0;
  const monthRegGrowth = (stats?.totalRegistrations ?? 0) > 0 ? Math.round((regsThisMonth / (stats?.totalRegistrations ?? 1)) * 100) : 0;
  const operationalPulse = Math.min(100, Math.round((liveRatio * 0.45) + (upcomingRatio * 0.2) + (Math.min(100, engagementRatio * 10) * 0.35)));

  return (
    <AppLayout>
      <motion.div className="p-8 max-w-7xl mx-auto space-y-8" variants={shellVariants} initial="hidden" animate="show">
        <motion.div className="surface-hero surface-mesh rounded-none p-7 text-foreground" variants={cardVariants} custom={0}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-none border-2 border-border bg-white px-3 py-2 text-foreground shadow-[4px_4px_0_hsl(var(--border))]">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-black tracking-[0.18em] uppercase">Event Intelligence</span>
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight uppercase text-foreground sm:text-4xl">
                <span className="inline-block -rotate-1 border-2 border-border bg-white px-3 py-1 shadow-[5px_5px_0_hsl(var(--border))]">Executive</span>{" "}
                <span className="inline-block -rotate-1 border-2 border-border bg-indigo-600 px-3 py-1 text-white shadow-[5px_5px_0_hsl(var(--border))]">Dashboard</span>
              </h1>
              <p className="text-foreground/90 mt-3 max-w-2xl text-balance ">Real-time health, growth, and audience performance across your virtual event portfolio.</p>
            </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-[320px]">
              <div className="rounded-none border-2 border-border bg-card px-4 py-3 shadow-[4px_4px_0_hsl(var(--border))] text-left">
                <p className="text-[11px] uppercase tracking-widest font-mono font-extrabold text-muted-foreground">Monthly Events</p>
                <p className="text-[38px] leading-none font-black mt-2">{eventsThisMonth}</p>
                <p className="text-xs text-muted-foreground mt-1">{monthEventGrowth}% of total</p>
              </div>
              <div className="rounded-none border-2 border-border bg-card px-4 py-3 shadow-[4px_4px_0_hsl(var(--border))] text-left">
                <p className="text-[11px] uppercase tracking-widest font-mono font-extrabold text-muted-foreground">Monthly Registrations</p>
                <p className="text-[38px] leading-none font-black mt-2">{regsThisMonth}</p>
                <p className="text-xs text-muted-foreground mt-1">{monthRegGrowth}% of total</p>
              </div>
              <div className="rounded-none border-2 border-border bg-card px-4 py-3 shadow-[4px_4px_0_hsl(var(--border))] text-left">
                <p className="text-[11px] uppercase tracking-widest font-mono font-extrabold text-muted-foreground">Operational Pulse</p>
                <p className="text-[38px] leading-none font-black mt-2">{operationalPulse}%</p>
                <p className="text-xs text-muted-foreground mt-1">Live + pipeline + engagement</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-5">
            <Badge variant="outline" className="hidden sm:inline-flex bg-white">Last sync: <span className="text-green-600" >now </span> </Badge>
            <Button asChild variant="secondary" className="ml-auto">
              <Link href="/events/new">Create Event</Link>
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Total Events",
              value: statsLoading ? "-" : stats?.totalEvents,
              hint: statsLoading ? "-" : `+${stats?.eventsThisMonth} this month`,
              icon: Calendar,
              trend: monthEventGrowth,
            },
            {
              title: "Total Registrations",
              value: statsLoading ? "-" : stats?.totalRegistrations,
              hint: statsLoading ? "-" : `+${stats?.registrationsThisMonth} this month`,
              icon: Users,
              trend: monthRegGrowth,
            },
            {
              title: "Live Events",
              value: statsLoading ? "-" : stats?.liveEvents,
              hint: "Currently broadcasting",
              icon: Video,
              trend: liveRatio,
            },
            {
              title: "Upcoming",
              value: statsLoading ? "-" : stats?.upcomingEvents,
              hint: "Scheduled pipeline",
              icon: Activity,
              trend: upcomingRatio,
            },
          ].map((item, index) => (
            <motion.div key={item.title} custom={index + 1} variants={cardVariants} initial="hidden" animate="show" whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 220, damping: 18 }}>
              <Card className="border-border/70 shadow-panel">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{item.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{item.hint}</p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-muted-foreground">KPI strength</span>
                      <span className="font-medium">{item.trend}%</span>
                    </div>
                    <Progress value={item.trend} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <motion.div custom={5} variants={cardVariants} initial="hidden" animate="show" className="xl:col-span-2">
            <Card className="border-border/70 shadow-panel">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Registration Momentum</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Daily registrations with a 3-day moving average.</p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Moving avg
                </Badge>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={chartConfig}
                  className="h-72 w-full"
                >
                  <AreaChart data={momentumData} margin={{ left: 8, right: 8, top: 16, bottom: 0 }}>
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
                    <Line
                      type="monotone"
                      dataKey="movingAverage"
                      stroke="var(--color-events)"
                      dot={false}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div custom={6} variants={cardVariants} initial="hidden" animate="show">
            <Card className="border-border shadow-[5px_5px_0_hsl(var(--border))] h-full">
              <CardHeader>
                <CardTitle className="uppercase">Event Status Mix</CardTitle>
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
                      <span className="text-muted-foreground font-mono font-extrabold uppercase tracking-widest">Live ratio</span>
                      <span className="font-black">{liveRatio}%</span>
                    </div>
                    <Progress value={liveRatio} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground font-mono font-extrabold uppercase tracking-widest">Upcoming pipeline</span>
                      <span className="font-black">{upcomingRatio}%</span>
                    </div>
                    <Progress value={upcomingRatio} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <motion.div custom={7} variants={cardVariants} initial="hidden" animate="show" className="xl:col-span-2">
            <Card className="border-border shadow-[5px_5px_0_hsl(var(--border))]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="uppercase">Performance Comparison</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Events, registrations, and efficiency across key windows.</p>
                </div>
                <Badge variant="outline" className="gap-1"><CircleDot className="w-3 h-3" /> Benchmarks</Badge>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-72 w-full">
                  <ComposedChart data={monthlyPerformance.map((entry) => ({
                    ...entry,
                    efficiency: entry.events > 0 ? Number((entry.registrations / entry.events).toFixed(1)) : 0,
                  }))} margin={{ left: 8, right: 8, top: 16, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="events" fill="var(--color-events)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="registrations" fill="var(--color-registrations)" radius={[0, 0, 0, 0]} />
                    <Line type="monotone" dataKey="efficiency" stroke="var(--color-live)" strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div custom={8} variants={cardVariants} initial="hidden" animate="show">
            <Card className="border-border shadow-[5px_5px_0_hsl(var(--border))] h-full">
              <CardHeader>
                <CardTitle className="uppercase">Engagement Snapshot</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Average audience activation per event.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-none border-2 border-border p-4 bg-muted/20 text-left shadow-[3px_3px_0_hsl(var(--border))]">
                  <p className="text-[11px] text-muted-foreground font-mono font-extrabold uppercase tracking-widest">Registration density</p>
                  <p className="text-[38px] leading-none font-black mt-2">{engagementRatio.toFixed(1)}x</p>
                  <p className="text-xs text-muted-foreground mt-2">registrations per event (scaled)</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: Radar, label: "Pulse", value: operationalPulse },
                    { icon: Gauge, label: "Readiness", value: liveRatio },
                    { icon: CalendarClock, label: "Pipeline", value: upcomingRatio },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-none border-2 border-border bg-muted/20 p-3 text-left shadow-[3px_3px_0_hsl(var(--border))]">
                      <metric.icon className="w-4 h-4 text-muted-foreground" />
                      <p className="text-[11px] text-muted-foreground mt-2 font-mono font-extrabold uppercase tracking-widest">{metric.label}</p>
                      <p className="text-2xl leading-none font-black mt-1">{metric.value}%</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {[{ label: "Live Readiness", value: liveRatio }, { label: "Upcoming Health", value: upcomingRatio }, { label: "Audience Activation", value: Math.min(100, engagementRatio * 10) }].map((metric) => (
                    <div key={metric.label}>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground font-mono font-extrabold uppercase tracking-widest">{metric.label}</span>
                        <span className="font-black">{metric.value}%</span>
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
          <motion.div custom={9} variants={cardVariants} initial="hidden" animate="show">
            <Card className="border-border shadow-[5px_5px_0_hsl(var(--border))]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="uppercase">Upcoming Events</CardTitle>
                <Link href="/events" className="text-sm font-extrabold uppercase tracking-[0.08em] text-primary flex items-center hover:underline">
                  View all <ArrowRight className="ml-1 w-4 h-4" />
                </Link>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-none border-2 border-border" />)}
                  </div>
                ) : upcomingEvents?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground font-mono font-extrabold uppercase tracking-widest">No upcoming events</div>
                ) : (
                  <div className="space-y-4">
                    {upcomingEvents?.map((event, idx) => (
                      <motion.div key={event.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05, duration: 0.3 }} className="flex items-center justify-between p-4 border-2 border-border rounded-none hover:bg-muted/40 transition-all duration-150 shadow-[3px_3px_0_hsl(var(--border))]">
                        <div>
                          <Link href={`/events/${event.id}`} className="font-extrabold uppercase tracking-[0.08em] hover:text-primary transition-colors">
                            {event.title}
                          </Link>
                          <div className="text-sm text-muted-foreground mt-1">
                            {format(new Date(event.scheduledAt), "MMM d, yyyy • h:mm a")}
                          </div>
                        </div>
                        <Badge variant="outline">{event.registrationCount} registered</Badge>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div custom={10} variants={cardVariants} initial="hidden" animate="show">
            <Card className="border-border shadow-[5px_5px_0_hsl(var(--border))]">
              <CardHeader>
                <CardTitle className="uppercase">Recent Registrations</CardTitle>
              </CardHeader>
              <CardContent>
                {regsLoading ? (
                  <div className="space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-none border-2 border-border" />)}
                  </div>
                ) : recentRegistrations?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground font-mono font-extrabold uppercase tracking-widest">No recent registrations</div>
                ) : (
                  <div className="space-y-4">
                    {recentRegistrations?.map((reg, idx) => (
                      <motion.div key={reg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04, duration: 0.3 }} className="flex items-center justify-between p-4 border-2 border-border rounded-none hover:bg-muted/25 transition-all duration-150 shadow-[3px_3px_0_hsl(var(--border))]">
                        <div>
                          <div className="font-extrabold uppercase tracking-[0.08em]">{reg.attendeeName}</div>
                          <div className="text-sm text-muted-foreground">{reg.attendeeEmail}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-extrabold uppercase tracking-[0.08em] line-clamp-1 max-w-50">
                            {reg.event?.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(reg.registeredAt), "MMM d")}
                          </div>
                        </div>
                      </motion.div>
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
