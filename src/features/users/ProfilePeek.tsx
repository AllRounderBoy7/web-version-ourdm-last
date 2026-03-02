import { useState } from "react";
import { Profile } from "@/state/session";
import { Info } from "lucide-react";

type Props = {
  profile: Profile;
};

export function ProfilePeek({ profile }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full bg-white/10 p-1 text-slate-300 hover:bg-white/20"
      >
        <Info size={14} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl bg-ink-900/95 p-3 shadow-xl ring-1 ring-white/10">
          <p className="text-sm font-semibold">@{profile.username}</p>
          <p className="text-xs text-slate-400">{profile.full_name}</p>
          <p className="mt-2 text-xs text-slate-300">{profile.bio || "No bio yet."}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
            <span>{profile.followers_count ?? 0} followers</span>
            <span>{profile.following_count ?? 0} following</span>
          </div>
        </div>
      )}
    </div>
  );
}
