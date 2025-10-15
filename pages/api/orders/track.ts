// pages/api/orders/track.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const q = req.query || {};

    const orderId =
      typeof q.orderId === "string" ? q.orderId : undefined;

    // accept both session_id and sessionId
    const sessionId =
      typeof q.session_id === "string"
        ? q.session_id
        : typeof q.sessionId === "string"
        ? q.sessionId
        : undefined;

    if (!orderId && !sessionId) {
      return res.status(400).json({ error: "Provide orderId or session_id." });
    }

    // Call your existing confirm endpoint to get normalized order
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || `http://${req.headers.host}`;
    const qs = orderId
      ? `orderId=${encodeURIComponent(orderId)}`
      : `session_id=${encodeURIComponent(sessionId!)}`;

    const r = await fetch(`${baseUrl}/api/orders/confirm?${qs}`);
    const data = await r.json();

    return res.status(r.status).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Track handler failed." });
  }
}
