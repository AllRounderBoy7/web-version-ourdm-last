import { motion } from "framer-motion";
import { Message } from "./types";

type Props = {
  message: Message;
  isMe: boolean;
};

export function MessageBubble({ message, isMe }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`max-w-lg rounded-2xl px-3 py-2 ${isMe ? "ml-auto bg-cyan-500/20" : "bg-white/5"}`}
    >
      <p className="text-xs text-slate-400">{new Date(message.created_at).toLocaleTimeString()}</p>
      {message.kind === "text" && <p className="mt-1 text-sm text-slate-100">{message.body}</p>}
      {message.kind === "voice" && message.media_url && <audio controls src={message.media_url} className="mt-2 w-full" />}
      {message.media_url && message.kind === "image" && (
        <img src={message.media_url} alt="media" className="mt-2 max-h-60 rounded-xl object-cover" />
      )}
    </motion.div>
  );
}
