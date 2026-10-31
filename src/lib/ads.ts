export const ADSENSE_PUBLISHER_ID = 'pub-4495802176396975';
export const ADSENSE_CLIENT = `ca-${ADSENSE_PUBLISHER_ID}`;
export const ADS_TXT_LINE = 'google.com, pub-4495802176396975, DIRECT, f08c47fec0942fa0';

/**
 * Unified helper for optional manual AdSlot placements.
 * Canonical env var: NEXT_PUBLIC_ADS_ENABLED ("true" | "false").
 * Also accepts NEXT_PUBLIC_ENABLE_ADS as a legacy alias so either configuration works consistently.
 */
export function isAdsEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ADS_ENABLED === 'true' ||
    process.env.NEXT_PUBLIC_ENABLE_ADS === 'true'
  );
}
