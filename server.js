const express = require("express");
const cors = require("cors");
const app = express();
app.use(express.json({ limit: "20kb" }));

const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://bk0964257-ctrl.github.io";
app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === allowedOrigin) return callback(null, true);
    return callback(new Error("Origin not allowed"));
  }
}));

const PORT = process.env.PORT || 3000;
const SERVICES = {
  poster: { name: "Poster Design", amount: 100 },
  social_graphic: { name: "Social Media Graphic", amount: 150 },
  youtube_thumbnail: { name: "YouTube Thumbnail", amount: 150 },
  short_video: { name: "Short Video Editing", amount: 300 },
  business_advert: { name: "Business Advert", amount: 250 }
};

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function toKenyanPhone(input) {
  let phone = String(input || "").replace(/[\s()+-]/g, "");
  if (phone.startsWith("0")) phone = "254" + phone.slice(1);
  if (phone.startsWith("7") || phone.startsWith("1")) phone = "254" + phone;
  return /^254[17]\d{8}$/.test(phone) ? phone : null;
}

async function getAccessToken() {
  const auth = Buffer.from(
    `${requiredEnv("DARAJA_CONSUMER_KEY")}:${requiredEnv("DARAJA_CONSUMER_SECRET")}`
  ).toString("base64");
  const response = await fetch(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    { headers: { Authorization: `Basic ${auth}` } }
  );
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("Could not obtain sandbox access token");
  return data.access_token;
}

app.get("/", (_req, res) => res.json({
  service: "Trendify Studio M-Pesa backend", mode: "sandbox", status: "running"
}));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/pay", async (req, res) => {
  try {
    const { serviceId, phone, orderDescription } = req.body || {};
    const service = SERVICES[serviceId];
    const normalizedPhone = toKenyanPhone(phone);
    if (!service) return res.status(400).json({ error: "Choose a valid service." });
    if (!normalizedPhone) return res.status(400).json({ error: "Enter a valid Kenyan phone number, e.g. 0712345678." });

    const token = await getAccessToken();
    const shortcode = requiredEnv("DARAJA_SHORTCODE");
    const passkey = requiredEnv("DARAJA_PASSKEY");
    const callbackUrl = requiredEnv("DARAJA_CALLBACK_URL");

    const timestamp = new Date().toLocaleString("sv-SE", { timeZone: "Africa/Nairobi" })
      .replace(/[-: ]/g, "").slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
    const description = String(orderDescription || service.name)
      .replace(/[^a-zA-Z0-9 ._-]/g, "").slice(0, 40) || service.name;

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: service.amount,
      PartyA: normalizedPhone,
      PartyB: shortcode,
      PhoneNumber: normalizedPhone,
      CallBackURL: callbackUrl,
      AccountReference: "Trendify",
      TransactionDesc: description
    };

    const response = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || data.ResponseCode !== "0") {
      return res.status(502).json({
        error: data.errorMessage || data.ResponseDescription || "Daraja did not accept the test request.",
        details: data
      });
    }
    return res.json({
      ok: true,
      message: "Sandbox test request accepted. No real money will be transferred.",
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
      customerMessage: data.CustomerMessage || "Test request submitted."
    });
  } catch (error) {
    console.error("Payment request failed:", error.message);
    return res.status(500).json({ error: "Payment request failed. Check the Render environment variables and sandbox settings." });
  }
});

app.post("/api/callback", (req, res) => {
  const result = req.body?.Body?.stkCallback;
  if (result) {
    console.log("Daraja callback", JSON.stringify({
      MerchantRequestID: result.MerchantRequestID,
      CheckoutRequestID: result.CheckoutRequestID,
      ResultCode: result.ResultCode,
      ResultDesc: result.ResultDesc
    }));
  }
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.use((err, _req, res, _next) => {
  if (err.message === "Origin not allowed") return res.status(403).json({ error: "Origin not allowed." });
  console.error(err);
  res.status(500).json({ error: "Server error." });
});
app.listen(PORT, () => console.log(`Trendify backend listening on ${PORT}`));
