import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
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
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Calendar,
  Users,
  User,
  Tag,
  Radio,
  Send,
  ArrowLeft,
  Edit,
  Trash2,
  Play,
  Square,
  MessageSquare,
} from "lucide-react";
import { Link } from "wouter";
import { ScreenSharePlayer } from "@/components/screen-share-player";

export default function EventDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const id = params.id ? parseInt(params.id) : 0;
  const queryClient = useQueryClient();

  const [chatName, setChatName] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [showRegForm, setShowRegForm] = useState(false);

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
    if (!id) return;
    const interval = setInterval(() => {
      refetchChat();
    }, 5000);
    return () => clearInterval(interval);
  }, [id, refetchChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatData]);

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
      }
    );
  };

  const handleRegister = () => {
    if (!regName.trim() || !regEmail.trim()) {
      toast.error("Please enter your name and email");
      return;
    }
    register.mutate(
      { eventId: id, data: { attendeeName: regName, attendeeEmail: regEmail } },
      {
        onSuccess: (reg) => {
          toast.success(
            reg.status === "waitlisted"
              ? "Added to waitlist!"
              : "Successfully registered!"
          );
          setShowRegForm(false);
          setRegName("");
          setRegEmail("");
          queryClient.invalidateQueries({ queryKey: getListEventRegistrationsQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(id) });
        },
        onError: () => toast.error("Registration failed"),
      }
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
      }
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
      }
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
      }
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

  const isLive = event.status === "live";
  const registrations = registrationsData?.registrations ?? [];
  const messages = chatData?.messages ?? [];

  const statusColors: Record<string, string> = {
    live: "bg-red-500 text-white",
    upcoming: "bg-blue-500 text-white",
    ended: "bg-gray-500 text-white",
    draft: "bg-yellow-500 text-white",
    cancelled: "bg-destructive text-destructive-foreground",
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/events">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Button>
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight" data-testid="text-event-title">
                {event.title}
              </h1>
              <Badge className={statusColors[event.status] ?? "bg-muted"}>
                {isLive && <span className="mr-1.5 inline-block w-2 h-2 rounded-full bg-white animate-pulse" />}
                {event.status.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {event.hostName}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {format(new Date(event.scheduledAt), "MMM d, yyyy • h:mm a")}
              </span>
              <span className="flex items-center gap-1.5">
                <Tag className="w-4 h-4" />
                {event.category}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {event.registrationCount} registered
                {event.maxAttendees ? ` / ${event.maxAttendees} max` : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card>
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
                  onStarted={() => {
                    queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(id) });
                  }}
                  onStopped={() => {
                    queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(id) });
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>About This Event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{event.description}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Attendees ({event.registrationCount})
                </CardTitle>
                {event.status !== "ended" && event.status !== "cancelled" && (
                  <Button
                    size="sm"
                    onClick={() => setShowRegForm(!showRegForm)}
                    data-testid="button-register"
                  >
                    Register
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {showRegForm && (
                  <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
                    <p className="text-sm font-medium">Register for this event</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        placeholder="Your name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        data-testid="input-reg-name"
                      />
                      <Input
                        placeholder="Your email"
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        data-testid="input-reg-email"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleRegister}
                        disabled={register.isPending}
                        data-testid="button-submit-registration"
                      >
                        {register.isPending ? "Registering..." : "Confirm Registration"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowRegForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {registrations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No attendees yet. Be the first to register!
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
                        <Badge variant="outline" className="text-xs">
                          {reg.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-1">
            <Card className="h-full flex flex-col" style={{ maxHeight: "calc(100vh - 160px)" }}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Live Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-3 overflow-hidden p-4">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ maxHeight: "400px" }}>
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No messages yet. Start the conversation!
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg text-sm ${msg.isPinned ? "border border-primary/30 bg-primary/5" : "bg-muted"}`}
                        data-testid={`chat-message-${msg.id}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-xs text-primary">{msg.senderName}</span>
                          {msg.isPinned && (
                            <Badge variant="outline" className="text-xs px-1 py-0 h-4">pinned</Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {format(new Date(msg.sentAt), "h:mm a")}
                          </span>
                        </div>
                        <p className="text-foreground/80">{msg.message}</p>
                      </div>
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
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
