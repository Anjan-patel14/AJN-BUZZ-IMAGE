"use client";
import { useEffect, useState } from "react";

const KEY = "ajn_buzz_cookie_consent";
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(!localStorage.getItem(KEY));
  }, []);
  if (!visible) return null;
  const choose = (value: "accepted" | "essential") => {
    localStorage.setItem(KEY, value);
    window.dispatchEvent(new Event("ajn-buzz-cookie-consent-changed"));
    setVisible(false);
  };
  return (
    <div
      className="cookie-consent"
      role="dialog"
      aria-label="Cookie preferences"
    >
      <div>
        <b>Cookie preferences</b>
        <p>
          AJN Buzz uses essential storage for product settings. Optional
          advertising loads only after consent when ads are enabled.
        </p>
      </div>
      <div className="cookie-actions">
        <button className="btn compact" onClick={() => choose("essential")}>
          Essential only
        </button>
        <button
          className="btn primary compact"
          onClick={() => choose("accepted")}
        >
          Accept optional
        </button>
      </div>
    </div>
  );
}
