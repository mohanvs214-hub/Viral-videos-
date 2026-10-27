const videos = require("../catalog.js");
module.exports = async (req, res) => {
  if (req.method === "GET") return res.json(videos.map(({ file, ...v }) => v));
  if (req.method !== "POST") return res.status(405).end();
  const v = videos.find(x => x.id === (req.body || {}).videoId);
  if (!v) return res.status(404).json({ error: "Video not found" });
  const auth = "Basic " + Buffer.from(process.env.RAZORPAY_KEY_ID + ":" + process.env.RAZORPAY_KEY_SECRET).toString("base64");
  const r = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: v.price * 100, currency: "INR", receipt: v.id + "_" + Date.now(), notes: { videoId: v.id } })
  });
  const o = await r.json();
  if (!r.ok) return res.status(500).json({ error: "Order failed" });
  res.json({ orderId: o.id, amount: o.amount, key: process.env.RAZORPAY_KEY_ID });
};
