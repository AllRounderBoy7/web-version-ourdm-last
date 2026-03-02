import { supabase } from "@/lib/supabase";
import { useSession } from "@/state/session";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signError } = await supabase.auth.signInWithPassword({ email, password });
      if (signError) throw signError;
      await setSession(data.session);
      const dest = (location.state as any)?.from || "/app";
      navigate(dest, { replace: true });
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="card w-full max-w-md space-y-4"
      >
        <div>
          <p className="text-sm text-cyan-300">OurDM</p>
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-slate-400">Secure email login. No phone numbers.</p>
        </div>
        <label className="space-y-2 text-sm">
          <span>Email</span>
          <input
            required
            type="email"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Password</span>
          <input
            required
            type="password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-3 text-center font-semibold text-white shadow-lg shadow-cyan-500/30 disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
        <p className="text-sm text-slate-400">
          Need an account?{" "}
          <Link className="text-cyan-300 hover:text-cyan-200" to="/auth/signup">
            Sign up
          </Link>
        </p>
      </motion.form>
    </div>
  );
}
