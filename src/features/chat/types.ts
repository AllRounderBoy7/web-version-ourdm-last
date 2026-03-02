export type Message = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string | null;
  media_url: string | null;
  kind: "text" | "image" | "voice";
  created_at: string;
};
