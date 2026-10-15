# Trendify Studio M-Pesa backend (Sandbox)

This is a sandbox/testing backend, not a live payment system.

## Deploy
Create a separate GitHub repository, e.g. `trendify-mpesa-backend`, and upload these files. Do not replace the existing `Trendify-Studio` website repository.

On Render create a new Web Service:
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`

Set these Environment Variables in Render (never commit secrets to GitHub):
- `DARAJA_CONSUMER_KEY` = your Daraja sandbox Consumer Key
- `DARAJA_CONSUMER_SECRET` = your Daraja sandbox Consumer Secret
- `DARAJA_SHORTCODE` = Daraja sandbox test shortcode
- `DARAJA_PASSKEY` = sandbox Lipa Na M-Pesa Online passkey
- `DARAJA_CALLBACK_URL` = `https://YOUR-RENDER-SERVICE.onrender.com/api/callback`
- `ALLOWED_ORIGIN` = `https://bk0964257-ctrl.github.io`

After Render gives you the service URL, set the callback URL to that URL plus `/api/callback`.

## Test endpoint
POST `https://YOUR-RENDER-SERVICE.onrender.com/api/pay` with JSON:
{
  "serviceId": "poster",
  "phone": "0712345678",
  "orderDescription": "Poster Design"
}

Fixed sandbox service amounts:
- `poster`: KSh 100
- `social_graphic`: KSh 150
- `youtube_thumbnail`: KSh 150
- `short_video`: KSh 300
- `business_advert`: KSh 250

## Important
- Sandbox is simulated and cannot collect real customer payments.
- Standard live STK Push generally requires an approved Paybill/Till shortcode and passkey; a personal phone number alone is not a shortcode. Confirm your merchant setup with Safaricom before going live.
- Callback currently logs results only; it does not save orders or reconcile payment status in a database.
- Before production use, add durable order storage, callback reconciliation, abuse protection, and Safaricom production approval.
- Never ask customers for their M-Pesa PIN or OTP.
