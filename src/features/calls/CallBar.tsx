import { useEffect, useRef, useState } from "react";
import { joinLiveKitRoom } from "@/lib/livekit";
import { Room, RoomEvent, createLocalTracks, RemoteTrack } from "livekit-client";
import { Phone, PhoneOff, Video } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/state/session";
import { useRinger } from "./useRinger";

type Props = {
  roomName: string;
  identity: string;
  peerId: string;
  peerName: string;
};

export function CallBar({ roomName, identity, peerId, peerName }: Props) {
  const { user } = useSession();
  const [room, setRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "ringing" | "live" | "declined">("idle");
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<"ringing" | "accepted" | "declined" | "ended" | null>(null);
  const remoteRef = useRef<HTMLDivElement | null>(null);
  const localRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ringer = useRinger();

  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

    channelRef.current && supabase.removeChannel(channelRef.current);
  }, [room]);

  const watchInvite = (id: string) => {
    channelRef.current?.unsubscribe();
    const channel = supabase
      .channel(`call-invite-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "call_invites", filter: `id=eq.${id}` },
        (payload) => {
          const next = payload.new as any;
          setInviteStatus(next.status);
          if (next.status === "declined" || next.status === "ended") {
            setStatus("declined");
            hangUp();
          }
          if (next.status === "accepted") {
            setStatus("live");
            ringer.stop();
          }
        }
      )
      .subscribe();
    channelRef.current = channel;
  };

  const startCall = async (withVideo: boolean) => {
    if (!user) return;
    setStatus("connecting");
    // alert peer via Supabase for background notifications
    const { data, error } = await supabase
      .from("call_invites")
      .insert({
        room_name: roomName,
        caller_id: user.id,
        callee_id: peerId,
        kind: withVideo ? "video" : "voice",
        status: "ringing"
      })
      .select()
      .single();
    if (error || !data) {
      setStatus("idle");
      return;
    }
    setInviteId(data.id);
    setInviteStatus("ringing");
    watchInvite(data.id);

    const lkRoom = await joinLiveKitRoom(roomName, identity);
    setRoom(lkRoom);

    const tracks = await createLocalTracks({ audio: true, video: withVideo });
    for (const track of tracks) {
      await lkRoom.localParticipant.publishTrack(track);
      const el = track.attach();
      localRef.current?.replaceChildren(el);
    }

    lkRoom
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        const el = track.attach();
        remoteRef.current?.replaceChildren(el);
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach();
      })
      .on(RoomEvent.Disconnected, () => {
        setStatus("idle");
        remoteRef.current?.replaceChildren();
        localRef.current?.replaceChildren();
      });
    setStatus("live");

    // notify SW that we initiated a call (helps keep it alive)
    navigator.serviceWorker?.controller?.postMessage({
      type: "incoming-call",
      payload: { from: peerName }
    });
  };

  const hangUp = () => {
    room?.disconnect();
    setRoom(null);
    setStatus("idle");
    remoteRef.current?.replaceChildren();
    localRef.current?.replaceChildren();
    if (user) {
      const query = supabase.from("call_invites").update({ status: "ended" });
      if (inviteId) query.eq("id", inviteId);
      else query.eq("room_name", roomName).eq("caller_id", user.id);
      query.then(() => {});
    }
    ringer.stop();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => startCall(false)}
        disabled={status === "connecting"}
        className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs text-slate-200"
      >
        <Phone size={14} />
        Voice
      </button>
      <button
        onClick={() => startCall(true)}
        disabled={status === "connecting"}
        className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs text-slate-200"
      >
        <Video size={14} />
        Video
      </button>
      {status === "live" && (
        <button onClick={hangUp} className="flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-1 text-xs text-rose-100">
          <PhoneOff size={14} />
          Hang
        </button>
      )}
      {inviteStatus && status !== "idle" && (
        <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-slate-300 capitalize">
          {inviteStatus}
        </span>
      )}
      <div className="hidden md:flex items-center gap-2">
        <div ref={remoteRef} className="h-20 w-20 overflow-hidden rounded-xl bg-black/50" />
        <div ref={localRef} className="h-16 w-16 overflow-hidden rounded-xl bg-black/30" />
      </div>
    </div>
  );
}
