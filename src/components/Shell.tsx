import { ReactNode } from "react";
import { useSession } from "@/state/session";
import { SuggestedUsers } from "@/features/users/SuggestedUsers";
import { UserSearch } from "@/features/users/UserSearch";
import { Lock, PhoneCall, Video } from "lucide-react";
import { CallInviteListener } from "@/features/calls/CallInviteListener";
import { useEffect } from "react";

type Props = {
  children: ReactNode;
};

export function Shell({ children }: Props) {
  const { profile, signOut } = useSession();

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 p-4 md:p-8">
      <CallInviteListener />
      <aside className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Logged in</p>
            <p className="text-lg font-semibold">{profile?.full_name}</p>
            <p className="text-xs text-slate-400">@{profile?.username}</p>
          </div>
          <button onClick={signOut} className="text-sm text-cyan-300 hover:text-cyan-200">
            Sign out
          </button>
        </div>
        <div className="lock-badge">
          <Lock size={14} />
          End‑to‑End Encrypted*
        </div>
        <UserSearch />
        <SuggestedUsers />
        <div className="glass rounded-xl p-3 text-xs text-slate-400">
          <p className="font-semibold text-slate-200 mb-1 flex items-center gap-2">
            <Video size={14} /> <PhoneCall size={14} /> Calls
          </p>
          <p>Calls and voice notes use LiveKit. Keep the tab open for best reliability.</p>
        </div>
      </aside>
      <main className="card relative overflow-hidden min-h-[70vh]">{children}</main>
    </div>
  );
}
