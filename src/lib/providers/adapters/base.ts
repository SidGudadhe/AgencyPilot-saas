import {
  ProviderKey,
  DiscoveredAdAccount,
  ConnectionValidationResult,
} from "../types";

export class ProviderApiError extends Error {
  public provider: ProviderKey;
  public statusCode?: number;
  public errorCategory: string;
  public guidance: string;

  constructor(
    message: string,
    provider: ProviderKey,
    errorCategory: string,
    guidance: string,
    statusCode?: number
  ) {
    super(message);
    this.name = "ProviderApiError";
    this.provider = provider;
    this.errorCategory = errorCategory;
    this.guidance = guidance;
    this.statusCode = statusCode;
  }
}

export interface IProviderOAuthAdapter {
  provider: ProviderKey;

  /**
   * Generates official provider OAuth 2.0 authorization URL.
   */
  getAuthorizationUrl(
    state: string,
    redirectUri: string,
    options?: { permissions?: string[] }
  ): { url: string; codeVerifier?: string };

  /**
   * Exchanges authorization code for access and refresh tokens.
   */
  exchangeAuthorizationCode(
    code: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    grantedScopes: string[];
  }>;

  /**
   * Refreshes an expired access token using refresh token.
   */
  refreshCredentials?(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
  }>;

  /**
   * Discovers accessible ad accounts via the provider's official account discovery endpoint.
   */
  discoverAccounts(
    accessToken: string,
    options?: { developerToken?: string }
  ): Promise<DiscoveredAdAccount[]>;

  /**
   * Performs real server-side validation against provider reporting API.
   */
  validateConnection(
    accessToken: string,
    accountId: string,
    options?: { developerToken?: string }
  ): Promise<ConnectionValidationResult>;

  /**
   * Revokes authorization on provider's official revocation endpoint.
   */
  revokeAuthorization(accessToken: string): Promise<boolean>;
}
