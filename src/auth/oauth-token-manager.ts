import qs from 'qs';
import OAuthToken from './oauth-token';
import { TokenResponse } from './token-response';
import OAuthConfig from './oauth-config';
import BasicHttpClient from '../http-clients/basic-http-client';
import { isArrayNullOrEmpty } from '../common/utilities';
import HttpClientFactory from '../http-client-factory';
import { HttpConfiguration } from '..';

/** @internal */
export default class OAuthTokenManager {
  static tokenDictionary = new Map<string, OAuthToken>();

  public static async issueToken(
    authConfig: OAuthConfig,
  ): Promise<string | null> {
    let tokenItem: OAuthToken | undefined | null = null;
    const key = this.buildOAuthConfigKey(authConfig);
    if (this.tokenDictionary.has(key)) {
      tokenItem = this.tokenDictionary.get(key);
      if (tokenItem?.isValid()) {
        return tokenItem.token;
      }
    }
    return this.updateToken(authConfig);
  }

  private static buildOAuthConfigKey(authConfig: OAuthConfig): string {
    return `${authConfig.clientId}#${authConfig.audience}`;
  }

  private static async updateToken(
    authConfig: OAuthConfig,
  ): Promise<string | null> {
    const newToken = await this.requestNewOAuthToken(authConfig);
    if (newToken == null) {
      return null;
    }
    const key = this.buildOAuthConfigKey(authConfig);
    const tokenItem = new OAuthToken(
      newToken.access_token,
      newToken.expires_in,
    );
    this.tokenDictionary.set(key, tokenItem);
    return tokenItem.token;
  }

  private static async requestNewOAuthToken(
    authConfig: OAuthConfig,
  ): Promise<TokenResponse | null | undefined> {
    if (authConfig == null) {
      return null;
    }
    const data = {
      grant_type: 'client_credentials',
      client_id: authConfig.clientId,
      client_secret: authConfig.clientSecret,
      audience: authConfig.audience,
      scope: '',
    };
    if (!isArrayNullOrEmpty(authConfig.scope)) {
      let allScopes: string = '';
      authConfig.scope?.forEach((eachScope) => {
        allScopes = `${allScopes} ${eachScope}`;
      });
      data.scope = allScopes;
    }
    const urlEncodedDataString = qs.stringify(data);
    const headers = {
      'content-type': 'application/x-www-form-urlencoded',
    };
    const httpClient = new BasicHttpClient();
    const response = await httpClient?.post<TokenResponse>(
      authConfig.tokenUrl,
      urlEncodedDataString,
      headers,
    );
    return response?.data;
  }
}
