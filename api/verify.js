const crypto = require("crypto");
const videos = require("../catalog.js");
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const { videoId, orderId, paymentId, signature } = req.body || {};
  const v = videos.find(x => x.id === videoId);
  if (!v || !orderId || !paymentId || !signature) return res.status(400).json({ error: "Bad request" });

  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(orderId + "|" + paymentId).digest("hex");
  if (expected !== signature) return res.status(403).json({ error: "Invalid payment" });

  const auth = "Basic " + Buffer.from(process.env.RAZORPAY_KEY_ID + ":" + process.env.RAZORPAY_KEY_SECRET).toString("base64");
  const or = await fetch("https://api.razorpay.com/v1/orders/" + orderId, { headers: { Authorization: auth } });
  const o = await or.json();
  if (!or.ok || !o.notes || o.notes.videoId !== v.id || o.amount !== v.price * 100 || o.status !== "paid")
    return res.status(403).json({ error: "Payment not valid for this video" });

  const key = process.env.SUPABASE_SECRET_KEY;
  const h = { "Content-Type": "application/json", apikey: key };
  if (!key.startsWith("sb_")) h.Authorization = "Bearer " + key;
  const s = await fetch(process.env.SUPABASE_URL + "/storage/v1/object/sign/videos/" + encodeURIComponent(v.file), {
    method: "POST", headers: h, body: JSON.stringify({ expiresIn: 86400 })
  });
  const d = await s.json();
  if (!s.ok) return res.status(500).json({ error: "Video link failed" });
  res.json({ url: process.env.SUPABASE_URL + "/storage/v1" + d.signedURL, expiresIn: 86400 });
};
