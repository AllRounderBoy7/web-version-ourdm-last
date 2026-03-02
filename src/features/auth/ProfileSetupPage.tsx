import { supabase } from "@/lib/supabase";
import { useSession } from "@/state/session";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function ProfileSetupPage() {
  const { user, profile, loadProfile } = useSession();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    await supabase.from("profiles").upsert({
      id: user.id,
      username,
      full_name: fullName,
      bio
    });
    await loadProfile(user.id);
    setLoading(false);
    navigate("/app");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSave} className="card w-full max-w-lg space-y-4">
        <h1 className="text-xl font-semibold">Complete profile</h1>
        <label className="space-y-2 text-sm">
          <span>Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            pattern="^[a-zA-Z0-9_\\.]{3,20}$"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Full name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            rows={3}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-3 text-center font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save & continue"}
        </button>
      </form>
    </div>
  );
}
