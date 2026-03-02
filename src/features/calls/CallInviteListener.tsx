import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/state/session";
import { joinLiveKitRoom } from "@/lib/livekit";
import { Room, RoomEvent, RemoteTrack, createLocalTracks } from "livekit-client";
import { IncomingCallModal } from "./IncomingCallModal";
import { useRinger } from "./useRinger";

type Invite = {
  id: string;
  room_name: string;
  caller_id: string;
  callee_id: string;
  kind: "voice" | "video";
  status: "ringing" | "accepted" | "declined" | "ended";
  created_at: string;
  caller?: { username: string };
};

export function CallInviteListener() {
  const { user, profile } = useSession();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const localRef = useRef<HTMLDivElement | null>(null);
  const remoteRef = useRef<HTMLDivElement | null>(null);
  const ringer = useRinger();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("call-invites")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_invites", filter: `callee_id=eq.${user.id}` },
        async (payload) => {
          const inv = payload.new as Invite;
          const { data: caller } = await supabase.from("profiles").select("username").eq("id", inv.caller_id).single();
          const enriched = { ...inv, caller: caller ?? { username: "someone" } };
          setInvite(enriched);
          ringer.start();
          navigator.serviceWorker?.controller?.postMessage({
            type: "incoming-call",
            payload: { from: enriched.caller.username }
          });
          if (Notification.permission === "granted") {
            new Notification("Incoming call", { body: `@${enriched.caller.username} is calling`, tag: "ourdm-call" });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const accept = async () => {
    if (!invite || !profile) return;
    await supabase.from("call_invites").update({ status: "accepted" }).eq("id", invite.id);
    ringer.stop();
    const lkRoom = await joinLiveKitRoom(invite.room_name, profile.username);
    setRoom(lkRoom);
    const tracks = await createLocalTracks({ audio: true, video: invite.kind === "video" });
    for (const t of tracks) {
      await lkRoom.localParticipant.publishTrack(t);
      const el = t.attach();
      localRef.current?.replaceChildren(el);
    }
    lkRoom
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        const el = track.attach();
        remoteRef.current?.replaceChildren(el);
      })
      .on(RoomEvent.Disconnected, () => cleanup());
    setInvite(null);
  };

  const decline = async () => {
    if (!invite) return;
    await supabase.from("call_invites").update({ status: "declined" }).eq("id", invite.id);
    setInvite(null);
    ringer.stop();
  };

  const cleanup = () => {
    room?.disconnect();
    setRoom(null);
    localRef.current?.replaceChildren();
    remoteRef.current?.replaceChildren();
    ringer.stop();
    if (invite) {
      supabase.from("call_invites").update({ status: "ended" }).eq("id", invite.id);
    }
  };

  return (
    <>
      <IncomingCallModal
        open={!!invite}
        fromUser={invite?.caller?.username ?? "Unknown"}
        kind={invite?.kind ?? "voice"}
        onAccept={accept}
        onDecline={decline}
      />
      {room && (
        <div className="fixed bottom-4 right-4 z-30 flex items-end gap-2 rounded-2xl bg-ink-900/90 p-3 ring-1 ring-white/10 shadow-xl">
          <div ref={remoteRef} className="h-24 w-32 overflow-hidden rounded-xl bg-black/40" />
          <div ref={localRef} className="h-16 w-20 overflow-hidden rounded-xl bg-black/30" />
          <button
            onClick={cleanup}
            className="rounded-full bg-rose-500/80 px-3 py-2 text-xs font-semibold text-white shadow-lg"
          >
            Hang up
          </button>
        </div>
      )}
    </>
  );
}
