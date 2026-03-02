import express from "express";
import cors from "cors";
import "dotenv/config";
import { AccessToken } from "livekit-server-sdk";

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const lkUrl = process.env.VITE_LK_URL || process.env.LK_URL;

if (!apiKey || !apiSecret) {
  console.warn("LIVEKIT_API_KEY/SECRET missing. Set them in environment for production server.");
}

app.get("/api/livekit-token", async (req, res) => {
  if (!apiKey || !apiSecret) return res.status(500).json({ error: "LiveKit secrets missing" });
  const room = (req.query.room as string) || "ourdm";
  const identity = (req.query.identity as string) || "guest";
  try {
    const at = new AccessToken(apiKey, apiSecret, { identity, ttl: "15m" });
    at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });
    const token = await at.toJwt();
    res.json({ token, url: lkUrl });
  } catch (err) {
    res.status(500).json({ error: "token generation failed" });
  }
});

const port = Number(process.env.PORT || 8788);
app.listen(port, () => {
  console.log(`OurDM token server listening on :${port}`);
});
