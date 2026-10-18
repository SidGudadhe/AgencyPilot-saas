import { ProviderKey } from "./types";
import { IProviderOAuthAdapter, ProviderApiError } from "./adapters/base";
import { MetaAdsAdapter } from "./adapters/meta";
import { GoogleAdsAdapter } from "./adapters/google-ads";

const metaAdapterInstance = new MetaAdsAdapter();
const googleAdsAdapterInstance = new GoogleAdsAdapter();

/**
 * Returns the OAuth adapter for a given provider key.
 * Throws a ProviderApiError if the provider does not support self-serve OAuth or is not yet implemented.
 */
export function getProviderAdapter(key: ProviderKey): IProviderOAuthAdapter {
  switch (key) {
    case "META":
      return metaAdapterInstance;
    case "GOOGLE_ADS":
      return googleAdsAdapterInstance;
    case "FLIPKART_ADS":
    case "JIOADS":
    case "SHARECHAT":
    case "INMOBI":
      throw new ProviderApiError(
        `${key} does not support public self-serve OAuth. Dedicated enterprise partner onboarding is required.`,
        key,
        "PARTNER_ACCESS_REQUIRED",
        "Please contact support to link your direct enterprise contract for this network."
      );
    default:
      throw new ProviderApiError(
        `OAuth integration adapter for ${key} is currently under development or awaiting provider app review.`,
        key,
        "COMING_SOON",
        "This provider integration will become available once app approval is finalized."
      );
  }
}
