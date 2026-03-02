import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Profile, useSession } from "@/state/session";
import { Sparkles } from "lucide-react";

export function SuggestedUsers() {
  const { user } = useSession();
  const [users, setUsers] = useState<Profile[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("suggested_users", { uid: user.id }).then(({ data }) => {
      if (data) setUsers(data as Profile[]);
    });
  }, [user]);

  if (!users.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <Sparkles size={14} className="text-amber-300" />
        Suggested for you
      </div>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
            <div>
              <p className="text-sm font-semibold">@{u.username}</p>
              <p className="text-xs text-slate-400">{u.bio || "—"}</p>
            </div>
            <span className="text-xs text-slate-400">{u.followers_count ?? 0} followers</span>
          </div>
        ))}
      </div>
    </div>
  );
}
