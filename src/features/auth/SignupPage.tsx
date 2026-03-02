import { supabase } from "@/lib/supabase";
import { useSession } from "@/state/session";
import { motion } from "framer-motion";
import { ChangeEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type FormState = {
  email: string;
  password: string;
  fullName: string;
  username: string;
  avatarFile?: File | null;
};

const initial: FormState = {
  email: "",
  password: "",
  fullName: "",
  username: "",
  avatarFile: null
};

export function SignupPage() {
  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setSession } = useSession();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    if (name === "avatar" && files) {
      setForm((f) => ({ ...f, avatarFile: files[0] }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password
      });
      if (signError || !data.user) throw signError;

      let avatar_url: string | null = null;
      if (form.avatarFile) {
        const path = `avatars/${data.user.id}-${Date.now()}-${form.avatarFile.name}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, form.avatarFile, {
          cacheControl: "3600",
          upsert: true
        });
        if (upErr) throw upErr;
        const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
        avatar_url = publicUrl.publicUrl;
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: form.fullName,
        username: form.username,
        avatar_url
      });
      if (profileError) throw profileError;

      // refresh session store
      await setSession(data.session);
      navigate("/app");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card w-full max-w-xl space-y-4"
        onSubmit={handleSubmit}
      >
        <div>
          <p className="text-sm text-cyan-300">OurDM</p>
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="text-sm text-slate-400">Email + password only. Add your handle and avatar.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-2 text-sm">
            <span>Email</span>
            <input
              required
              type="email"
              name="email"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              value={form.email}
              onChange={handleChange}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Password</span>
            <input
              required
              minLength={8}
              type="password"
              name="password"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              value={form.password}
              onChange={handleChange}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Full name</span>
            <input
              required
              name="fullName"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              value={form.fullName}
              onChange={handleChange}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Username</span>
            <input
              required
              name="username"
              pattern="^[a-zA-Z0-9_\\.]{3,20}$"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              value={form.username}
              onChange={handleChange}
            />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span>Profile picture</span>
            <input
              type="file"
              name="avatar"
              accept="image/*"
              onChange={handleChange}
              className="w-full rounded-xl border border-dashed border-white/20 bg-white/5 px-3 py-2"
            />
          </label>
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-3 text-center font-semibold text-white shadow-lg shadow-cyan-500/30 disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create account"}
        </button>
        <p className="text-sm text-slate-400">
          Already have an account?{" "}
          <Link className="text-cyan-300 hover:text-cyan-200" to="/auth/login">
            Log in
          </Link>
        </p>
      </motion.form>
    </div>
  );
}
