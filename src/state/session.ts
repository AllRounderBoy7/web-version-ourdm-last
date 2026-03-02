import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  followers_count?: number;
  following_count?: number;
};

type SessionState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  ready: boolean;
  setSession: (session: Session | null) => Promise<void>;
  loadProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useSession = create<SessionState>((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: false,
  ready: false,
  setSession: async (session) => {
    set({ session, user: session?.user ?? null, loading: true });
    if (session?.user) {
      await loadProfile(session.user.id, set);
    } else {
      set({ profile: null, loading: false, ready: true });
    }
  },
  loadProfile: async (userId: string) => {
    await loadProfile(userId, set);
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  }
}));

async function loadProfile(userId: string, set: (partial: Partial<SessionState>) => void) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) {
    console.error("profile load", error);
    set({ loading: false, ready: true });
    return;
  }
  set({ profile: data as Profile, loading: false, ready: true });
}

// boot session listener once
supabase.auth.getSession().then(({ data }) => {
  useSession.setState({
    session: data.session,
    user: data.session?.user ?? null
  });
  if (data.session?.user) {
    loadProfile(data.session.user.id, useSession.setState);
  } else {
    useSession.setState({ ready: true });
  }
});

supabase.auth.onAuthStateChange((_event, session) => {
  useSession.getState().setSession(session);
});
