// src/pages/QrPage.js
import { QRCodeCanvas } from "qrcode.react";

export default function QrPage() {
  // change this base URL to match your real Vercel domain
  const baseUrl = "https://bunkersbell-qr.vercel.app/";

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Customer QR</h2>
      <QRCodeCanvas value={`${baseUrl}/menu`} size={200} />

      <h2 style={{ marginTop: "40px" }}>Cashier QR</h2>
      <QRCodeCanvas value={`${baseUrl}/cashier`} size={200} />
    </div>
  );
}
