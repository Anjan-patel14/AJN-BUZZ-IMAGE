"use client";
import { useEffect, useState } from "react";

const KEY = "ajn_buzz_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [hasChoice, setHasChoice] = useState(false);

  useEffect(() => {
    const choice = localStorage.getItem(KEY);
    setHasChoice(Boolean(choice));
    setVisible(!choice);
  }, []);

  const choose = (value: "accepted" | "essential") => {
    localStorage.setItem(KEY, value);
    window.dispatchEvent(new Event("ajn-buzz-cookie-consent-changed"));
    setHasChoice(true);
    setVisible(false);
  };

  if (!visible) {
    return hasChoice ? (
      <button
        className="privacy-choice-button"
        type="button"
        onClick={() => setVisible(true)}
      >
        Privacy choices
      </button>
    ) : null;
  }

  return (
    <div
      className="cookie-consent"
      role="dialog"
      aria-modal="false"
      aria-label="Cookie preferences"
    >
      <div>
        <b>Privacy choices</b>
        <p>
          AJN Buzz uses essential browser storage for product settings. Optional
          advertising loads only after your choice when ads are enabled.
          Region-specific Google consent messages may also apply where required.{" "}
          <a href="/privacy">Privacy Policy</a>
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
