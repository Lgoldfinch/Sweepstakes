import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function ShareBox({ url }: { url: string }) {
  const [qr, setQr] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 160, margin: 1, color: { dark: "#0b1020", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  return (
    <div className="share-box">
      {qr && <img src={qr} alt="QR code for this sweepstake" className="share-qr" width={120} height={120} />}
      <div className="share-body">
        <label className="muted small">Share link</label>
        <div className="share-row">
          <input readOnly value={url} onFocus={(e) => e.target.select()} />
          <button type="button" className="btn btn-ghost" onClick={copy}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
