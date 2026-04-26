import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, ScreenShare, Square } from "lucide-react";

type ScreenShareState = {
  active: boolean;
  broadcasterPeerId: string | null;
  startedAt: string | null;
};

type SignalMessage = {
  seq: number;
  fromPeerId: string;
  toPeerId: string;
  type: "offer" | "answer" | "candidate";
  payload: unknown;
};

type ScreenSharePlayerProps = {
  eventId: number;
  fallbackStreamUrl?: string | null;
  eventStatus: "draft" | "upcoming" | "live" | "ended" | "cancelled";
  onStarted?: () => void;
  onStopped?: () => void;
};

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

function storageKey(eventId: number): string {
  return `eventflow.screen-share.peer.${eventId}`;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed with status ${response.status}`);
  }

  return body as T;
}

async function captureScreen(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  } catch {
    return navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  }
}

function ensureVideoStream(video: HTMLVideoElement | null, stream: MediaStream | null): void {
  if (!video) return;
  video.srcObject = stream;
  if (stream) {
    video.onloadedmetadata = () => {
      void video.play().catch(() => undefined);
    };
    if (video.readyState >= 1) {
      void video.play().catch(() => undefined);
    }
  }
}

function openPreviewWindow(stream: MediaStream): Window | null {
  const previewWindow = window.open("", "EventFlow Screen Preview", "width=1280,height=720");
  if (!previewWindow) {
    return null;
  }

  previewWindow.document.title = "EventFlow Screen Preview";
  previewWindow.document.body.style.margin = "0";
  previewWindow.document.body.style.background = "#000";
  previewWindow.document.body.style.color = "#fff";
  previewWindow.document.body.innerHTML = `
    <div style="width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;background:#000;">
      <video id="preview" autoplay playsinline muted style="width:100%;height:100%;object-fit:contain;background:#000;"></video>
    </div>
  `;

  const video = previewWindow.document.getElementById("preview") as HTMLVideoElement | null;
  if (video) {
    ensureVideoStream(video, stream);
  }

  previewWindow.addEventListener("beforeunload", () => {
    try {
      previewWindow.close();
    } catch {
      // noop
    }
  });

  return previewWindow;
}

export function ScreenSharePlayer({
  eventId,
  fallbackStreamUrl,
  eventStatus,
  onStarted,
  onStopped,
}: ScreenSharePlayerProps) {
  const [rtcState, setRtcState] = useState<ScreenShareState>({
    active: false,
    broadcasterPeerId: null,
    startedAt: null,
  });
  const [hostPeerId, setHostPeerId] = useState<string | null>(() => localStorage.getItem(storageKey(eventId)));
  const [viewerPeerId, setViewerPeerId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Waiting for a live screen share...");
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isViewerConnected, setIsViewerConnected] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewWindowRef = useRef<Window | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStreamState, setLocalStreamState] = useState<MediaStream | null>(null);
  const [remoteStreamState, setRemoteStreamState] = useState<MediaStream | null>(null);
  const hostPeersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const viewerPeerRef = useRef<RTCPeerConnection | null>(null);
  const hostPeerIdRef = useRef<string | null>(hostPeerId);
  const viewerPeerIdRef = useRef<string | null>(viewerPeerId);
  const hostSeqRef = useRef(0);
  const viewerSeqRef = useRef(0);
  const pollRef = useRef<number | null>(null);
  const hostPollingRef = useRef<number | null>(null);

  const isLocalHost = useMemo(() => {
    return Boolean(hostPeerId && rtcState.active && rtcState.broadcasterPeerId === hostPeerId);
  }, [hostPeerId, rtcState.active, rtcState.broadcasterPeerId]);

  const stopAllPeers = () => {
    for (const pc of hostPeersRef.current.values()) {
      pc.close();
    }
    hostPeersRef.current.clear();

    viewerPeerRef.current?.close();
    viewerPeerRef.current = null;
    setIsViewerConnected(false);
    setRemoteStreamState(null);
  };

  const stopHostPolling = () => {
    if (hostPollingRef.current !== null) {
      window.clearInterval(hostPollingRef.current);
      hostPollingRef.current = null;
    }
  };

  const stopViewerPolling = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const endHostSession = async () => {
    setIsStopping(true);
    try {
      stopHostPolling();
      stopViewerPolling();
      stopAllPeers();

      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStreamState(null);
      ensureVideoStream(localVideoRef.current, null);
      ensureVideoStream(remoteVideoRef.current, null);

      try {
        previewWindowRef.current?.close();
      } catch {
        // noop
      }
      previewWindowRef.current = null;

      if (hostPeerId) {
        await apiJson<void>(`/api/events/${eventId}/screen-share/stop`, {
          method: "POST",
          body: JSON.stringify({ peerId: hostPeerId }),
        });
      }

      localStorage.removeItem(storageKey(eventId));
      hostPeerIdRef.current = null;
      viewerPeerIdRef.current = null;
      setHostPeerId(null);
      setViewerPeerId(null);
      setStatusText("Screen share stopped");
      onStopped?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to stop screen share");
    } finally {
      setIsStopping(false);
    }
  };

  const sendSignal = async (
    fromPeerId: string,
    toPeerId: string,
    type: "offer" | "answer" | "candidate",
    payload: unknown,
  ) => {
    await apiJson(`/api/events/${eventId}/screen-share/signals`, {
      method: "POST",
      body: JSON.stringify({ fromPeerId, toPeerId, type, payload }),
    });
  };

  const pollHostSignals = async () => {
    const currentHostPeerId = hostPeerIdRef.current;
    if (!currentHostPeerId) return;

    const response = await apiJson<{ signals: SignalMessage[] }>(
      `/api/events/${eventId}/screen-share/signals?peerId=${encodeURIComponent(currentHostPeerId)}&since=${hostSeqRef.current}`,
    );

    for (const signal of response.signals) {
      hostSeqRef.current = Math.max(hostSeqRef.current, signal.seq);

      if (signal.type === "offer") {
        const viewerId = signal.fromPeerId;
        let pc = hostPeersRef.current.get(viewerId);
        if (!pc) {
          pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
          hostPeersRef.current.set(viewerId, pc);

          const stream = localStreamRef.current;
          if (stream) {
            stream.getTracks().forEach((track) => pc?.addTrack(track, stream));
          }

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              void sendSignal(currentHostPeerId, viewerId, "candidate", event.candidate.toJSON());
            }
          };
        }

        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal(currentHostPeerId, viewerId, "answer", { type: answer.type, sdp: answer.sdp });
      }

      if (signal.type === "candidate") {
        const pc = hostPeersRef.current.get(signal.fromPeerId);
        if (pc && signal.payload) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.payload as RTCIceCandidateInit));
        }
      }
    }
  };

  const pollViewerSignals = async () => {
    const currentViewerPeerId = viewerPeerIdRef.current;
    if (!currentViewerPeerId) return;

    const response = await apiJson<{ signals: SignalMessage[] }>(
      `/api/events/${eventId}/screen-share/signals?peerId=${encodeURIComponent(currentViewerPeerId)}&since=${viewerSeqRef.current}`,
    );

    for (const signal of response.signals) {
      viewerSeqRef.current = Math.max(viewerSeqRef.current, signal.seq);

      if (signal.type === "answer" && viewerPeerRef.current) {
        await viewerPeerRef.current.setRemoteDescription(new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit));
        setIsViewerConnected(true);
        setStatusText("Connected to live screen share");
      }

      if (signal.type === "candidate" && viewerPeerRef.current && signal.payload) {
        await viewerPeerRef.current.addIceCandidate(new RTCIceCandidate(signal.payload as RTCIceCandidateInit));
      }
    }
  };

  const startViewerConnection = async (broadcasterPeerId: string) => {
    if (viewerPeerRef.current || isLocalHost) return;

    const peerIdResponse = await apiJson<{ peerId: string }>(`/api/events/${eventId}/screen-share/peer`, {
      method: "POST",
      body: JSON.stringify({ role: "viewer" }),
    });

    const peerId = peerIdResponse.peerId;
    viewerPeerIdRef.current = peerId;
    setViewerPeerId(peerId);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    viewerPeerRef.current = pc;

    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });

    pc.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      setRemoteStreamState(stream);
      ensureVideoStream(remoteVideoRef.current, stream);
      setIsViewerConnected(true);
      setStatusText("Watching live screen share");
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        void sendSignal(peerId, broadcasterPeerId, "candidate", event.candidate.toJSON());
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal(peerId, broadcasterPeerId, "offer", { type: offer.type, sdp: offer.sdp });

    if (pollRef.current === null) {
      pollRef.current = window.setInterval(() => {
        void pollViewerSignals().catch(() => undefined);
      }, 500);
    }
  };

  const startScreenShare = async () => {
    setIsStarting(true);
    try {
      const stream = await captureScreen();
      const result = await apiJson<{ eventId: number; broadcasterPeerId: string; startedAt: string }>(
        `/api/events/${eventId}/screen-share/start`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      localStorage.setItem(storageKey(eventId), result.broadcasterPeerId);
      hostPeerIdRef.current = result.broadcasterPeerId;
      setHostPeerId(result.broadcasterPeerId);
      localStreamRef.current = stream;
      setLocalStreamState(stream);
      ensureVideoStream(localVideoRef.current, null);
      try {
        previewWindowRef.current?.close();
      } catch {
        // noop
      }
      previewWindowRef.current = openPreviewWindow(stream);
      setStatusText("Broadcasting your screen to attendees");
      onStarted?.();

      if (hostPollingRef.current === null) {
        hostPollingRef.current = window.setInterval(() => {
          void pollHostSignals().catch(() => undefined);
        }, 350);
      }

      if (stream.getVideoTracks()[0]) {
        stream.getVideoTracks()[0].addEventListener("ended", () => {
          void endHostSession().catch(() => undefined);
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start screen share");
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    let alive = true;
    const loadState = async () => {
      try {
        const state = await apiJson<ScreenShareState>(`/api/events/${eventId}/screen-share/state`);
        if (!alive) return;
        setRtcState(state);
        if (!state.active) {
          setStatusText(eventStatus === "live" ? "Live stream waiting to start" : "Waiting for a live screen share...");
        } else if (state.broadcasterPeerId === hostPeerIdRef.current) {
          setStatusText("Broadcasting your screen to attendees");
        }

        if (state.active && state.broadcasterPeerId && state.broadcasterPeerId !== hostPeerIdRef.current) {
          await startViewerConnection(state.broadcasterPeerId);
        }
      } catch {
        if (alive) {
          setStatusText("Waiting for live screen share...");
        }
      }
    };

    void loadState();
    const interval = window.setInterval(() => {
      void loadState();
    }, 2000);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [eventId, eventStatus]);

  useEffect(() => {
    hostPeerIdRef.current = hostPeerId;
  }, [hostPeerId]);

  useEffect(() => {
    viewerPeerIdRef.current = viewerPeerId;
  }, [viewerPeerId]);

  useEffect(() => {
    return () => {
      stopHostPolling();
      stopViewerPolling();
      stopAllPeers();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    ensureVideoStream(localVideoRef.current, localStreamState);
  }, [localStreamState]);

  useEffect(() => {
    ensureVideoStream(remoteVideoRef.current, remoteStreamState);
  }, [remoteStreamState]);

  const canStartHost = !isLocalHost && eventStatus !== "ended" && eventStatus !== "cancelled";

  return (
    <div className="space-y-4">
      {isLocalHost ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-red-500 text-white">
              <span className="mr-1.5 inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
              SCREEN LIVE
            </Badge>
            <span className="text-sm text-muted-foreground">{statusText}</span>
          </div>
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30 p-6 text-center">
            <Camera className="h-10 w-10 text-muted-foreground opacity-60" />
            <p className="max-w-md text-sm text-muted-foreground">
              Your screen is being broadcast. The preview is opened in a separate window to avoid black self-capture in the live page.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (localStreamRef.current) {
                    try {
                      previewWindowRef.current?.close();
                    } catch {
                      // noop
                    }
                    previewWindowRef.current = openPreviewWindow(localStreamRef.current);
                  }
                }}
              >
                Open Preview Window
              </Button>
              <Button variant="destructive" onClick={() => void endHostSession()} disabled={isStopping}>
                <Square className="mr-2 h-4 w-4" />
                {isStopping ? "Stopping..." : "Stop Screen Share"}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
          </div>
        </div>
      ) : rtcState.active && rtcState.broadcasterPeerId ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-red-500 text-white">
              <span className="mr-1.5 inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE
            </Badge>
            <span className="text-sm text-muted-foreground">{statusText}</span>
          </div>
          <div className="relative w-full overflow-hidden rounded-lg border bg-black" style={{ paddingTop: "56.25%" }}>
            <video ref={remoteVideoRef} autoPlay playsInline muted controls className="absolute inset-0 h-full w-full object-contain" />
          </div>
        </div>
      ) : fallbackStreamUrl ? (
        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
          <iframe
            src={fallbackStreamUrl}
            title="Live Stream"
            className="absolute inset-0 h-full w-full rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30 p-6 text-center">
          <Camera className="h-10 w-10 text-muted-foreground opacity-60" />
          <p className="text-sm text-muted-foreground">{statusText}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {canStartHost && (
              <Button onClick={() => void startScreenShare()} disabled={isStarting}>
                <ScreenShare className="mr-2 h-4 w-4" />
                {isStarting ? "Starting..." : "Share My Screen"}
              </Button>
            )}
          </div>
        </div>
      )}

      {!isLocalHost && canStartHost && !rtcState.active && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void startScreenShare()} disabled={isStarting}>
            <ScreenShare className="mr-2 h-4 w-4" />
            {isStarting ? "Starting..." : "Share My Screen"}
          </Button>
        </div>
      )}
    </div>
  );
}
