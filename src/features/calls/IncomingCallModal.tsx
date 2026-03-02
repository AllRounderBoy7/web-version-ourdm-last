import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";

type Props = {
  open: boolean;
  fromUser: string;
  kind: "voice" | "video";
  onAccept: () => void;
  onDecline: () => void;
};

export function IncomingCallModal({ open, fromUser, kind, onAccept, onDecline }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl bg-ink-900/90 p-5 shadow-2xl ring-1 ring-white/10">
            <p className="text-sm text-slate-400">Incoming {kind === "video" ? "video" : "voice"} call</p>
            <h3 className="text-xl font-semibold text-white">@{fromUser}</h3>
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={onDecline}
                className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
              >
                <PhoneOff size={16} />
                Decline
              </button>
              <button
                onClick={onAccept}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30"
              >
                {kind === "video" ? <Video size={16} /> : <Phone size={16} />}
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
