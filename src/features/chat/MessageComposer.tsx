import { useRef, useState } from "react";
import { Paperclip, Send, Volume2 } from "lucide-react";

type Props = {
  onSendText: (text: string) => void;
  onSendImage: (file: File) => Promise<void>;
  onRecordStart: () => Promise<void> | void;
  onRecordStop: () => void;
  recording: boolean;
};

export function MessageComposer({ onSendText, onSendImage, onRecordStart, onRecordStop, recording }: Props) {
  const [input, setInput] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const send = () => {
    if (!input.trim()) return;
    onSendText(input);
    setInput("");
  };

  const voiceButton = recording ? (
    <button onClick={onRecordStop} className="flex items-center gap-2 rounded-full bg-rose-500 px-3 py-2 text-sm font-semibold text-white">
      <div className="flex items-end gap-[3px]">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-[3px] rounded bg-white"
            style={{
              height: `${8 + i * 3}px`,
              animation: `wave 0.8s ease-in-out ${i * 0.08}s infinite`
            }}
          />
        ))}
      </div>
      Recording...
    </button>
  ) : (
    <button onClick={() => onRecordStart()} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm text-slate-200">
      <Volume2 size={16} />
      Voice
    </button>
  );

  return (
    <div className="flex items-center gap-2">
      <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-white/5 text-slate-300 hover:bg-white/10">
        <Paperclip size={16} />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await onSendImage(file);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
      </label>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="Message..."
        className="flex-1 rounded-xl bg-white/5 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
      />
      <button
        onClick={send}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-lg shadow-cyan-500/30"
      >
        <Send size={16} />
      </button>
      {voiceButton}
    </div>
  );
}
