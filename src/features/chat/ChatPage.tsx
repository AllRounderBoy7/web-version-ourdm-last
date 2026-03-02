import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Profile, useSession } from "@/state/session";
import { cacheMessages, getCachedThreadMessages } from "@/lib/db";
import { FollowingList } from "../users/FollowingList";
import { UserSearch } from "../users/UserSearch";
import { CallBar } from "../calls/CallBar";
import { ShieldCheck } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Message } from "./types";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";

export function ChatPage() {
  const { user, profile } = useSession();
  const [peer, setPeer] = useState<Profile | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const roomName = useMemo(() => (threadId ? `thread-${threadId}` : null), [threadId]);
  const subscriptionRef = useRef<() => void>();

  useEffect(() => {
    if (!threadId) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, threadId]);

  // Mark incoming messages as read (for receipts) while keeping local cache
  useEffect(() => {
    if (!threadId || !user) return;
    const foreign = messages.filter((m) => m.thread_id === threadId && m.sender_id !== user.id);
    foreign.forEach((m) =>
      supabase
        .from("message_receipts")
        .upsert({ message_id: m.id, user_id: user.id, state: "read" })
        .then(() => supabase.from("messages").update({ status: "read" }).eq("id", m.id))
    );
  }, [messages, threadId, user]);

  useEffect(() => {
    return () => subscriptionRef.current?.();
  }, []);

  const startChatWith = async (p: Profile) => {
    if (!user) return;
    setPeer(p);
    const { data, error } = await supabase.rpc("ensure_thread", { a: user.id, b: p.id });
    if (error || !data) {
      console.error(error);
      return;
    }
    subscriptionRef.current?.();
    setThreadId(data as string);
    await primeMessages(data as string);
    subscriptionRef.current = subscribeToThread(data as string);
  };

  const primeMessages = async (tid: string) => {
    const cached = await getCachedThreadMessages(tid);
    if (cached.length) setMessages(cached.map((c) => toMessage(c)));

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", tid)
      .order("created_at", { ascending: true })
      .limit(80);
    if (data) {
      setMessages(data as Message[]);
      await cacheMessages(
        (data as Message[]).map((m) => ({
          id: m.id,
          threadId: m.thread_id,
          senderId: m.sender_id,
          body: m.body,
          mediaUrl: m.media_url,
          kind: m.kind,
          createdAt: m.created_at
        }))
      );
    }
  };

  const subscribeToThread = (tid: string) => {
    const channel = supabase
      .channel(`thread-${tid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${tid}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((m) => [...m, msg]);
          cacheMessages([
            {
              id: msg.id,
              threadId: msg.thread_id,
              senderId: msg.sender_id,
              body: msg.body,
              mediaUrl: msg.media_url,
              kind: msg.kind,
              createdAt: msg.created_at
            }
          ]);
          if (msg.sender_id !== user?.id) {
            supabase.from("message_receipts").upsert({
              message_id: msg.id,
              user_id: user?.id,
              state: "delivered"
            });
            supabase.from("messages").update({ status: "delivered" }).eq("id", msg.id);
            notifyIncoming(msg);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // notify service worker for stealth ring/notification
  const notifyIncoming = (msg: Message) => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "incoming-message",
        payload: { from: peer?.username ?? "Someone", body: msg.body }
      });
    }
  };

  const sendMessage = async (kind: Message["kind"], body?: string, mediaUrl?: string) => {
    if (!threadId || !user) return;
    if (kind === "text" && !body?.trim()) return;
    const message: Partial<Message> = {
      thread_id: threadId,
      sender_id: user.id,
      body: body ?? null,
      media_url: mediaUrl ?? null,
      kind
    };
    const { data, error } = await supabase.from("messages").insert(message).select().single();
    if (error) {
      console.error(error);
      return;
    }
    setMessages((m) => [...m, data as Message]);
    await cacheMessages([
      {
        id: (data as Message).id,
        threadId,
        senderId: user.id,
        body: data.body,
        mediaUrl: data.media_url,
        kind: data.kind,
        createdAt: data.created_at
      }
    ]);
    // mark sender receipt as seen
    await supabase.from("message_receipts").upsert({
      message_id: (data as Message).id,
      user_id: user.id,
      state: "read"
    });
  };

  const handleTextSend = (text: string) => sendMessage("text", text);

  const startRecording = async () => {
    if (!navigator.mediaDevices) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];
    mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
      const path = `voice/${file.name}`;
      const { error } = await supabase.storage.from("voice-notes").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("voice-notes").getPublicUrl(path);
        await sendMessage("voice", "Voice note", urlData.publicUrl);
      }
    };
    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4 h-full">
      <div className="space-y-4">
        <FollowingList onSelect={startChatWith} />
        <UserSearch onStartChat={startChatWith} />
      </div>
      <div className="glass relative flex h-full flex-col overflow-hidden rounded-2xl">
        {!peer && (
          <div className="flex h-full items-center justify-center text-slate-500">
            Start by selecting someone you follow.
          </div>
        )}
        {peer && (
          <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div>
                <p className="text-sm text-slate-400">Chatting with</p>
                <p className="text-lg font-semibold">@{peer.username}</p>
                <div className="lock-badge mt-1">
                  <ShieldCheck size={14} />
                  E2EE active*
                </div>
              </div>
              {roomName && profile && peer && (
                <CallBar roomName={roomName} identity={profile.username} peerId={peer.id} peerName={peer.username} />
              )}
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} isMe={m.sender_id === user?.id} />
                ))}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>
            <footer className="border-t border-white/5 px-4 py-3">
              <MessageComposer
                recording={recording}
                onRecordStart={startRecording}
                onRecordStop={stopRecording}
                onSendText={handleTextSend}
                onSendImage={async (file) => {
                  if (!threadId) return;
                  const path = `media/${threadId}-${Date.now()}-${file.name}`;
                  const { error } = await supabase.storage.from("chat-media").upload(path, file);
                  if (!error) {
                    const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
                    await sendMessage("image", file.name, data.publicUrl);
                  }
                }}
              />
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}

function toMessage(cached: any): Message {
  return {
    id: cached.id,
    thread_id: cached.threadId,
    sender_id: cached.senderId,
    body: cached.body,
    media_url: cached.mediaUrl,
    kind: cached.kind,
    created_at: cached.createdAt
  };
}
