import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout";
import {
  useGetEvent,
  useListEventRegistrations,
  useListChatMessages,
  useSendChatMessage,
  useRegisterForEvent,
  useStartStream,
  useEndStream,
  useDeleteEvent,
  getGetEventQueryKey,
  getListEventRegistrationsQueryKey,
  getListChatMessagesQueryKey,
  type StartStreamMutationError,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Calendar,
  Users,
  User,
  Radio,
  Send,
  ArrowLeft,
  Edit,
  Trash2,
  Play,
  Square,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Clock3,
  MailCheck,
  CheckCircle2,
  PartyPopper,
  ChevronRight,
} from "lucide-react";
import { Link } from "wouter";
import { ScreenSharePlayer } from "@/components/screen-share-player";
import { useAuth } from "@/lib/auth";

const pageVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const panelVariants = {
  hidden: { opacity: 0, y: 18 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: index * 0.06 },
  }),
};

type RegistrationStep = 0 | 1 | 2;

const RSVP_NOTES_STORAGE_KEY = "eventflow:rsvp-notes";
const RSVP_PROFILE_STORAGE_KEY = "eventflow:rsvp-profile";

export default function EventDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const id = params.id ? parseInt(params.id) : 0;
  const queryClient = useQueryClient();
  const { isOrganizer } = useAuth();

  const [chatName, setChatName] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [showRegForm, setShowRegForm] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>(0);
  const [attendanceGoal, setAttendanceGoal] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [notes, setNotes] = useState("");
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: event, isLoading } = useGetEvent(id, {
    query: { enabled: !!id, queryKey: getGetEventQueryKey(id) },
  });
  const { data: registrationsData } = useListEventRegistrations(id, {
    query: { enabled: !!id, queryKey: getListEventRegistrationsQueryKey(id) },
  });
  const { data: chatData, refetch: refetchChat } = useListChatMessages(id, undefined, {
    query: { enabled: !!id, queryKey: getListChatMessagesQueryKey(id, undefined) },
  });

  const sendMessage = useSendChatMessage();
  const register = useRegisterForEvent();
  const startStream = useStartStream();
  const endStream = useEndStream();
  const deleteEvent = useDeleteEvent();

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(RSVP_PROFILE_STORAGE_KEY);
      const savedNotes = localStorage.getItem(RSVP_NOTES_STORAGE_KEY);

      if (savedProfile) {
        const parsed = JSON.parse(savedProfile) as {
          regName?: string;
          regEmail?: string;
          attendanceGoal?: string;
          teamSize?: string;
        };
        setRegName(parsed.regName ?? "");
        setRegEmail(parsed.regEmail ?? "");
        setAttendanceGoal(parsed.attendanceGoal ?? "");
        setTeamSize(parsed.teamSize ?? "");
      }

      if (savedNotes) {
        setNotes(savedNotes);
      }
    } catch {
      // Ignore malformed local storage content.
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      refetchChat();
    }, 5000);
    return () => clearInterval(interval);
  }, [id, refetchChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatData]);

  const registrations = registrationsData?.registrations ?? [];
  const messages = chatData?.messages ?? [];
  const isLive = event?.status === "live";
  const remainingSeats =
    event?.maxAttendees == null ? null : Math.max(0, event.maxAttendees - event.registrationCount);
  const capacityPercent =
    event?.maxAttendees != null && event.maxAttendees > 0
      ? Math.min(100, Math.round((event.registrationCount / event.maxAttendees) * 100))
      : Math.min(100, (event?.registrationCount ?? 0) * 12);
  const registrationPulse =
    registrations.length === 0
      ? "First attendee"
      : registrations.length < 8
        ? "Early room"
        : remainingSeats !== null && remainingSeats <= 5
          ? "Nearly full"
          : "Momentum building";

  const registrationStepLabels = ["Identity", "Intent", "Confirm"];
  const registrationProgress = ((registrationStep + 1) / registrationStepLabels.length) * 100;

  const recentAttendees = useMemo(
    () => registrations.slice().sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()).slice(0, 4),
    [registrations],
  );

  const nextRegistrantPreview = useMemo(() => {
    const fallback = "You";
    if (!regName.trim()) return fallback;
    return regName.trim().split(" ")[0];
  }, [regName]);

  const resetRegistrationFlow = () => {
    setShowRegForm(false);
    setRegistrationStep(0);
    setAcceptPolicy(false);
  };

  const handleSendMessage = () => {
    if (!chatName.trim() || !chatMessage.trim()) {
      toast.error("Please enter your name and a message");
      return;
    }
    sendMessage.mutate(
      { eventId: id, data: { senderName: chatName, message: chatMessage } },
      {
        onSuccess: () => {
          setChatMessage("");
          queryClient.invalidateQueries({ queryKey: getListChatMessagesQueryKey(id, undefined) });
        },
        onError: () => toast.error("Failed to send message"),
      },
    );
  };

  const handleRegister = () => {
    if (!regName.trim() || !regEmail.trim()) {
      toast.error("Please enter your name and email");
      return;
    }

    if (!acceptPolicy) {
      toast.error("Please confirm the attendee policy");
      return;
    }

    if (rememberMe) {
      localStorage.setItem(
        RSVP_PROFILE_STORAGE_KEY,
        JSON.stringify({ regName, regEmail, attendanceGoal, teamSize }),
      );
      localStorage.setItem(RSVP_NOTES_STORAGE_KEY, notes);
    }

    register.mutate(
      { eventId: id, data: { attendeeName: regName, attendeeEmail: regEmail } },
      {
        onSuccess: (reg) => {
          toast.success(reg.status === "waitlisted" ? "Added to waitlist!" : "Registration confirmed!");
          resetRegistrationFlow();
          setRegName("");
          setRegEmail("");
          setAttendanceGoal("");
          setTeamSize("");
          setNotes("");
          queryClient.invalidateQueries({ queryKey: getListEventRegistrationsQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(id) });
        },
        onError: () => toast.error("Registration failed"),
      },
    );
  };

  const handleStartStream = () => {
    startStream.mutate(
      { eventId: id },
      {
        onSuccess: () => {
          toast.success("Stream started!");
          queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(id) });
        },
        onError: (error) => {
          const apiError = error as StartStreamMutationError;
          const detail =
            apiError?.data && typeof apiError.data === "object"
              ? (apiError.data as { error?: string }).error
              : undefined;
          toast.error(detail ?? "Failed to start stream");
        },
      },
    );
  };

  const handleEndStream = () => {
    endStream.mutate(
      { eventId: id },
      {
        onSuccess: () => {
          toast.success("Stream ended");
          queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(id) });
        },
        onError: () => toast.error("Failed to end stream"),
      },
    );
  };

  const handleDelete = () => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    deleteEvent.mutate(
      { eventId: id },
      {
        onSuccess: () => {
          toast.success("Event deleted");
          setLocation("/events");
        },
        onError: () => toast.error("Failed to delete event"),
      },
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-8 space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Event not found.</p>
          <Link href="/events">
            <Button variant="outline" className="mt-4">Back to Events</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const statusColors: Record<string, string> = {
    live: "bg-red-500 text-white",
    upcoming: "bg-primary text-primary-foreground",
    ended: "bg-slate-500 text-white",
    draft: "bg-amber-500 text-white",
    cancelled: "bg-destructive text-destructive-foreground",
  };

  const stepCanContinue =
    registrationStep === 0
      ? Boolean(regName.trim()) && /\S+@\S+\.\S+/.test(regEmail)
      : registrationStep === 1
        ? true
        : acceptPolicy;

  return (
    <AppLayout>
      <motion.div className="mx-auto max-w-7xl space-y-6 p-8" variants={pageVariants} initial="hidden" animate="show">
        <div className="flex items-center gap-4">
          <Link href="/events">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Button>
          </Link>
        </div>

        <motion.section
          custom={0}
          variants={panelVariants}
          initial="hidden"
          animate="show"
          className="surface-hero surface-mesh overflow-hidden rounded-[28px] border border-white/10 p-8 text-white shadow-soft"
        >
          <div className="grid gap-8 xl:grid-cols-[1.35fr_0.65fr] xl:items-end">
            <div className="space-y-5">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={statusColors[event.status] ?? "bg-muted"}>
                  {isLive && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-white animate-pulse" />}
                  {event.status.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="border-white/15 bg-white/8 text-white/80">
                  {event.category}
                </Badge>
              </div>
              <div className="rounded-none border-2 border-border bg-card p-5 text-foreground shadow-[5px_5px_0_hsl(var(--border))] sm:p-6">
                <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl" data-testid="text-event-title">
                  {event.title}
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">{event.description}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { icon: User, label: "Host", value: event.hostName },
                  { icon: Calendar, label: "Schedule", value: format(new Date(event.scheduledAt), "MMM d, yyyy • h:mm a") },
                  { icon: Users, label: "Attendees", value: `${event.registrationCount}${event.maxAttendees ? ` / ${event.maxAttendees}` : ""}` },
                  { icon: Sparkles, label: "Room feel", value: registrationPulse },
                ].map((item) => (
                  <div key={item.label} className="rounded-none border-2 border-border bg-card p-4 text-sm text-foreground shadow-[4px_4px_0_hsl(var(--border))]">
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-none border border-border bg-muted/60">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.16em] font-mono font-extrabold text-muted-foreground">{item.label}</p>
                    <p className="mt-1 font-black text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-none border-2 border-border bg-card p-5 text-foreground shadow-[6px_6px_0_hsl(var(--border))]">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] font-mono font-extrabold text-muted-foreground">Registration readiness</p>
                  <p className="mt-2 text-3xl font-black">{capacityPercent}%</p>
                </div>
                <div className="rounded-none border-2 border-border bg-muted/50 px-3 py-2 text-right shadow-[3px_3px_0_hsl(var(--border))]">
                  <p className="text-xs text-muted-foreground font-mono font-extrabold uppercase tracking-[0.16em]">Remaining</p>
                  <p className="text-lg font-black">{remainingSeats ?? "Open"}</p>
                </div>
              </div>
              <Progress value={capacityPercent} className="h-2.5" />
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Guided RSVP with confirmation and waitlist-aware messaging
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" />
                  Quick check-in flow designed for fast conversions
                </div>
                <div className="flex items-center gap-2">
                  <MailCheck className="h-4 w-4 text-primary" />
                  Contact details remembered locally when you opt in
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {isOrganizer && (
          <div className="flex items-center justify-end gap-2">
            {event.status === "upcoming" && (
              <Button
                variant="default"
                size="sm"
                onClick={handleStartStream}
                disabled={startStream.isPending}
                data-testid="button-start-stream"
              >
                <Play className="w-4 h-4 mr-2" />
                {startStream.isPending ? "Starting..." : "Start Stream"}
              </Button>
            )}
            {isLive && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEndStream}
                disabled={endStream.isPending}
                data-testid="button-end-stream"
              >
                <Square className="w-4 h-4 mr-2" />
                {endStream.isPending ? "Ending..." : "End Stream"}
              </Button>
            )}
            <Link href={`/events/${id}/edit`}>
              <Button variant="outline" size="sm" data-testid="button-edit-event">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleteEvent.isPending}
              className="text-destructive hover:text-destructive"
              data-testid="button-delete-event"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <motion.div custom={1} variants={panelVariants} initial="hidden" animate="show">
              <Card className="overflow-hidden rounded-[26px] border-white/60 bg-white/82 shadow-panel">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="w-5 h-5 text-primary" />
                    Live Stream
                    {isLive && (
                      <Badge className="bg-red-500 text-white ml-auto">
                        <span className="mr-1.5 inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
                        LIVE
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScreenSharePlayer
                    eventId={id}
                    fallbackStreamUrl={isLive ? event.streamUrl : null}
                    eventStatus={event.status}
                    canControl={isOrganizer}
                    onStarted={() => {
                      queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(id) });
                    }}
                    onStopped={() => {
                      queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(id) });
                    }}
                  />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div custom={2} variants={panelVariants} initial="hidden" animate="show">
              <Card className="rounded-[26px] border-white/60 bg-white/82 shadow-panel">
                <CardHeader>
                  <CardTitle>About This Event</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="leading-8 text-muted-foreground">{event.description}</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      { title: "Audience", text: event.maxAttendees ? `${event.maxAttendees} max seats` : "Open attendance" },
                      { title: "Format", text: isLive ? "In-broadcast experience" : "Scheduled live session" },
                      { title: "Category", text: event.category },
                    ].map((item) => (
                      <div key={item.title} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.title}</p>
                        <p className="mt-2 text-sm font-medium text-foreground">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {!isOrganizer && (
            <motion.div custom={3} variants={panelVariants} initial="hidden" animate="show">
              <Card className="rounded-[26px] border-white/60 bg-white/82 shadow-panel">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Attendees ({event.registrationCount})
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Show social proof, reveal room energy, and make registration feel worth completing.
                    </p>
                  </div>
                  {event.status !== "ended" && event.status !== "cancelled" && (
                    <Button
                      size="sm"
                      className="rounded-full px-5"
                      onClick={() => setShowRegForm((current) => !current)}
                      data-testid="button-register"
                    >
                      {showRegForm ? "Close RSVP" : "Reserve Your Spot"}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-2xl border border-border/70 bg-muted/25 p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Audience pulse</p>
                          <p className="mt-1 text-2xl font-semibold text-foreground">{registrationPulse}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Filled</p>
                          <p className="text-lg font-semibold">{capacityPercent}%</p>
                        </div>
                      </div>
                      <Progress value={capacityPercent} className="h-2.5" />
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Seats left</p>
                          <p className="mt-1 text-xl font-semibold">{remainingSeats ?? "Unlimited"}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Next on deck</p>
                          <p className="mt-1 text-xl font-semibold">{nextRegistrantPreview}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background/80 p-5">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Recent arrivals</p>
                      <div className="mt-4 space-y-3">
                        {recentAttendees.length === 0 ? (
                          <p className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                            No attendees yet. The first RSVP sets the tone.
                          </p>
                        ) : (
                          recentAttendees.map((reg) => (
                            <div key={reg.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                              <div>
                                <p className="text-sm font-medium">{reg.attendeeName}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(reg.registeredAt), "MMM d • h:mm a")}</p>
                              </div>
                              <Badge variant="outline" className="capitalize">{reg.status}</Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {showRegForm && (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden rounded-none border-2 border-primary/20 bg-card shadow-[6px_6px_0_hsl(var(--border))]"
                      >
                        <div className="border-b-2 border-border px-5 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] font-mono font-extrabold text-primary">Guided RSVP</p>
                              <h3 className="mt-1 text-xl font-black text-foreground">Reserve your seat with a little more intent</h3>
                            </div>
                            <Badge variant="outline" className="rounded-none px-3 py-1 font-mono font-extrabold uppercase tracking-[0.12em]">
                              Step {registrationStep + 1} of {registrationStepLabels.length}
                            </Badge>
                          </div>
                          <div className="mt-4 space-y-3">
                            <Progress value={registrationProgress} className="h-2.5" />
                            <div className="grid gap-2 sm:grid-cols-3">
                              {registrationStepLabels.map((label, index) => (
                                <div
                                  key={label}
                                  className={`rounded-none border-2 px-3 py-2 text-sm transition-colors ${
                                    registrationStep === index
                                      ? "border-primary/30 bg-primary/10 text-primary"
                                      : index < registrationStep
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-border/70 bg-white/80 text-muted-foreground"
                                  }`}
                                >
                                  <span className="font-mono font-extrabold uppercase tracking-[0.12em]">{label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_0.8fr]">
                          <div>
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={registrationStep}
                                initial={{ opacity: 0, x: 18 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -18 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                              >
                                {registrationStep === 0 && (
                                  <>
                                    <div>
                                      <p className="text-sm font-medium">Introduce yourself</p>
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        Give the host a polished attendee roster instead of an anonymous headcount.
                                      </p>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <Input
                                        placeholder="Your full name"
                                        value={regName}
                                        onChange={(e) => setRegName(e.target.value)}
                                        data-testid="input-reg-name"
                                      />
                                      <Input
                                        placeholder="Work email"
                                        type="email"
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        data-testid="input-reg-email"
                                      />
                                    </div>
                                  </>
                                )}

                                {registrationStep === 1 && (
                                  <>
                                    <div>
                                      <p className="text-sm font-medium">Add context</p>
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        This is still lightweight, but it feels much more deliberate than a bare two-field form.
                                      </p>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <Input
                                        placeholder="What do you want from this session?"
                                        value={attendanceGoal}
                                        onChange={(e) => setAttendanceGoal(e.target.value)}
                                      />
                                      <Input
                                        placeholder="Attending solo or with a team?"
                                        value={teamSize}
                                        onChange={(e) => setTeamSize(e.target.value)}
                                      />
                                    </div>
                                    <Textarea
                                      placeholder="Anything the host should know before you join?"
                                      value={notes}
                                      onChange={(e) => setNotes(e.target.value)}
                                      className="min-h-30 bg-white"
                                    />
                                  </>
                                )}

                                {registrationStep === 2 && (
                                  <>
                                    <div>
                                      <p className="text-sm font-medium">Final confirmation</p>
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        One last check before we place you in the room.
                                      </p>
                                    </div>

                                    <div className="rounded-none border-2 border-border bg-white p-4 shadow-[3px_3px_0_hsl(var(--border))]">
                                      <div className="flex items-start gap-3">
                                        <PartyPopper className="mt-0.5 h-5 w-5 text-primary" />
                                        <div className="space-y-2 text-sm">
                                          <p className="font-medium text-foreground">{regName || "Your registration"}</p>
                                          <p className="text-muted-foreground">{regEmail || "Email pending"}</p>
                                          <p className="text-muted-foreground">
                                            {attendanceGoal || "Attendee intent not added"}{teamSize ? ` • ${teamSize}` : ""}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    <label className="flex items-start gap-3 rounded-none border-2 border-border bg-white p-4">
                                      <Checkbox checked={acceptPolicy} onCheckedChange={(checked) => setAcceptPolicy(Boolean(checked))} />
                                      <span className="text-sm text-muted-foreground">
                                        I understand the host may reach out using this email and that capacity-limited events may place me on a waitlist.
                                      </span>
                                    </label>

                                    <label className="flex items-start gap-3 rounded-none border-2 border-border bg-white p-4">
                                      <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(Boolean(checked))} />
                                      <span className="text-sm text-muted-foreground">
                                        Remember my RSVP details on this device so future registrations are faster.
                                      </span>
                                    </label>
                                  </>
                                )}
                              </motion.div>
                            </AnimatePresence>

                            <div className="mt-6 flex flex-wrap gap-2">
                              {registrationStep > 0 && (
                                <Button variant="ghost" onClick={() => setRegistrationStep((registrationStep - 1) as RegistrationStep)}>
                                  Back
                                </Button>
                              )}

                              {registrationStep < 2 ? (
                                <Button
                                  onClick={() => setRegistrationStep((registrationStep + 1) as RegistrationStep)}
                                  disabled={!stepCanContinue}
                                  className="rounded-full px-5"
                                >
                                  Continue
                                  <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  onClick={handleRegister}
                                  disabled={register.isPending || !stepCanContinue}
                                  className="rounded-full px-5"
                                  data-testid="button-submit-registration"
                                >
                                  {register.isPending ? "Confirming..." : "Confirm Registration"}
                                </Button>
                              )}

                              <Button variant="outline" onClick={resetRegistrationFlow}>
                                Cancel
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-4 rounded-none border-2 border-border bg-white/75 p-5 shadow-[3px_3px_0_hsl(var(--border))]">
                            <p className="text-xs uppercase tracking-[0.18em] font-mono font-extrabold text-muted-foreground">Why this flow feels better</p>
                            <div className="space-y-3">
                              {[
                                "Attendees know how far through the RSVP they are.",
                                "The host gets a more premium-looking registration moment.",
                                "Confirmation feels like joining a room, not submitting a boring form.",
                              ].map((item) => (
                                <div key={item} className="flex gap-3 rounded-none border-2 border-border bg-muted/20 p-3 text-sm shadow-[2px_2px_0_hsl(var(--border))]">
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                                  <span className="text-muted-foreground">{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {registrations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No attendees yet. Be the first to register.
                    </p>
                  ) : (
                    <div className="divide-y">
                      {registrations.map((reg) => (
                        <div
                          key={reg.id}
                          className="flex items-center justify-between py-3"
                          data-testid={`row-attendee-${reg.id}`}
                        >
                          <div>
                            <p className="text-sm font-medium">{reg.attendeeName}</p>
                            <p className="text-xs text-muted-foreground">{reg.attendeeEmail}</p>
                          </div>
                          <Badge variant="outline" className="text-xs capitalize">
                            {reg.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            )}
          </div>

          {!isOrganizer && (
          <motion.div custom={4} variants={panelVariants} initial="hidden" animate="show" className="xl:col-span-1">
            <Card className="flex h-full max-h-[calc(100vh-160px)] flex-col rounded-[26px] border-white/60 bg-white/82 shadow-panel">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Live Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
                <div className="flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: "400px" }}>
                  {messages.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border/70 bg-muted/15 py-8 text-center text-sm text-muted-foreground">
                      No messages yet. Start the conversation.
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-2xl p-3 text-sm ${msg.isPinned ? "border border-primary/30 bg-primary/5" : "bg-muted/45"}`}
                        data-testid={`chat-message-${msg.id}`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-semibold text-primary">{msg.senderName}</span>
                          {msg.isPinned && (
                            <Badge variant="outline" className="h-4 px-1 py-0 text-xs">pinned</Badge>
                          )}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {format(new Date(msg.sentAt), "h:mm a")}
                          </span>
                        </div>
                        <p className="text-foreground/80">{msg.message}</p>
                      </motion.div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Input
                    placeholder="Your name"
                    value={chatName}
                    onChange={(e) => setChatName(e.target.value)}
                    className="text-sm"
                    data-testid="input-chat-name"
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="text-sm"
                      data-testid="input-chat-message"
                    />
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={sendMessage.isPending}
                      data-testid="button-send-chat"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          )}
        </div>
      </motion.div>
    </AppLayout>
  );
}
