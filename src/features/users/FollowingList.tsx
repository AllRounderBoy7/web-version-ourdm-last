import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Profile, useSession } from "@/state/session";
import { ProfilePeek } from "./ProfilePeek";

type Props = {
  onSelect: (profile: Profile) => void;
};

export function FollowingList({ onSelect }: Props) {
  const { user } = useSession();
  const [following, setFollowing] = useState<Profile[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("following:following_id(id, username, full_name, avatar_url, bio, followers_count, following_count)")
        .eq("follower_id", user.id);
      if (error || !data) return;
      const mapped = data
        .map((row: any) => row.following)
        .filter(Boolean)
        .sort((a: Profile, b: Profile) => a.username.localeCompare(b.username));
      setFollowing(mapped);
    };
    load();
  }, [user]);

  return (
    <div className="space-y-2">
      <div className="text-sm text-slate-300">Following</div>
      <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
        {following.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="w-full rounded-xl bg-white/5 px-3 py-2 text-left transition hover:bg-white/10"
          >
            <p className="text-sm font-semibold">@{p.username}</p>
            <p className="text-xs text-slate-400">{p.full_name}</p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>{p.followers_count ?? 0} followers</span>
              <ProfilePeek profile={p} />
            </div>
          </button>
        ))}
        {!following.length && <p className="text-xs text-slate-500">Follow people to start chats.</p>}
      </div>
    </div>
  );
}
