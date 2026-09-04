"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ADS_READY_EVENT,
  isBuzzAdEligiblePath,
} from "@/components/AdSenseScriptLoader";
import { ADSENSE_CLIENT } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSlot({ slot = "home" }: { slot?: string }) {
  const pathname = usePathname();
  const ref = useRef<HTMLModElement | null>(null);
  const initialized = useRef(false);
  const [allowed, setAllowed] = useState(false);
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || ADSENSE_CLIENT;
  const slotId = slot.startsWith("tool-")
    ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOOL || ""
    : process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME || "";

  useEffect(() => {
    const sync = () => {
      const host = window.location.hostname.toLowerCase();
      const productionHost = host === "ajn.buzz" || host === "www.ajn.buzz";
      setAllowed(
        process.env.NODE_ENV === "production" &&
          process.env.NEXT_PUBLIC_ADS_ENABLED === "true" &&
          productionHost &&
          localStorage.getItem("ajn_buzz_cookie_consent") === "accepted" &&
          isBuzzAdEligiblePath(window.location.pathname),
      );
    };
    sync();
    window.addEventListener("ajn-buzz-cookie-consent-changed", sync);
    return () =>
      window.removeEventListener("ajn-buzz-cookie-consent-changed", sync);
  }, [pathname]);

  useEffect(() => {
    if (!allowed || !client || !slotId) return;
    const request = () => {
      if (initialized.current || !ref.current || !window.adsbygoogle) return;
      try {
        window.adsbygoogle.push({});
        initialized.current = true;
      } catch {
        initialized.current = false;
      }
    };
    request();
    window.addEventListener(ADS_READY_EVENT, request);
    return () => window.removeEventListener(ADS_READY_EVENT, request);
  }, [allowed, client, slotId]);

  if (!allowed || !client || !slotId) return null;
  return (
    <aside className="ad ajn-ad-zone" aria-label="Advertisement">
      <span>Advertisement</span>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block", width: "100%" }}
        data-ad-client={client}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
