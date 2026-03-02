import { AccessToken } from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const lkUrl = process.env.VITE_LK_URL || process.env.LK_URL;

// Simple Vercel-style handler; adapt to your host as needed
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).send("Method not allowed");
  if (!apiKey || !apiSecret) return res.status(500).json({ error: "LiveKit secrets missing" });
  const room = (req.query.room as string) || "ourdm";
  const identity = (req.query.identity as string) || "guest";
  try {
    const at = new AccessToken(apiKey, apiSecret, { identity, ttl: "10m" });
    at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });
    const token = await at.toJwt();
    res.status(200).json({ token, url: lkUrl });
  } catch (err) {
    res.status(500).json({ error: "token generation failed" });
  }
}
