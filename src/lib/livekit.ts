import { Room, RoomEvent, RemoteParticipant, createLocalTracks, TrackSource } from "livekit-client";

export async function fetchLiveKitToken(roomName: string, identity: string) {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE ?? ""}/api/livekit-token?room=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(identity)}`
  );
  if (!res.ok) throw new Error("Failed to fetch LiveKit token");
  const { token, url } = await res.json();
  return { token: token as string, url: (url as string) || import.meta.env.VITE_LK_URL };
}

export async function joinLiveKitRoom(roomName: string, identity: string) {
  const { token, url } = await fetchLiveKitToken(roomName, identity);
  const room = new Room({
    publishDefaults: { simulcast: true },
    adaptiveStream: true,
    dynacast: true
  });

  const lkUrl = url ?? import.meta.env.VITE_LK_URL;

  await room.connect(lkUrl, token);
  await room.prepareConnection(lkUrl, token);

  return room;
}

export async function startVoiceTrack(room: Room) {
  const [audioTrack] = await createLocalTracks({ audio: true });
  await room.localParticipant.publishTrack(audioTrack, {
    source: TrackSource.Microphone
  });
}
