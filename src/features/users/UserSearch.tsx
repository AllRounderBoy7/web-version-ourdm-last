import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession, Profile } from "@/state/session";
import { Search, UserPlus, Check } from "lucide-react";
import { ProfilePeek } from "./ProfilePeek";

type Props = {
  onStartChat?: (profile: Profile) => void;
};

export function UserSearch({ onStartChat }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const { user } = useSession();
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .then(({ data }) => {
        if (!data) return;
        setFollowingIds(new Set(data.map((f) => f.following_id)));
      });
  }, [user]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, followers_count")
        .ilike("username", `%${query}%`)
        .neq("id", user?.id)
        .limit(10);
      if (!error && data) setResults(data as Profile[]);
    };
    fetchUsers();
    return () => controller.abort();
  }, [query, user?.id]);

  const toggleFollow = async (targetId: string) => {
    if (!user) return;
    const isFollowing = followingIds.has(targetId);
    if (isFollowing) {
      await supabase.from("follows").delete().match({ follower_id: user.id, following_id: targetId });
      const next = new Set(followingIds);
      next.delete(targetId);
      setFollowingIds(next);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
      const next = new Set(followingIds);
      next.add(targetId);
      setFollowingIds(next);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2">
        <Search size={16} className="text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search usernames..."
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((p) => {
            const isFollowing = followingIds.has(p.id);
            return (
              <div key={p.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">@{p.username}</p>
                  <p className="text-xs text-slate-400">{p.full_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFollow(p.id)}
                    className="flex items-center gap-1 rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200"
                  >
                    {isFollowing ? <Check size={14} /> : <UserPlus size={14} />}
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                  {onStartChat && (
                    <button
                      onClick={() => onStartChat(p)}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 hover:border-cyan-400/60 hover:text-cyan-100"
                    >
                      Chat
                    </button>
                  )}
                  <ProfilePeek profile={p} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
