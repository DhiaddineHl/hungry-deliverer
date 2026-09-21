const KEYCLOAK_URL = process.env.EXPO_PUBLIC_KEYCLOAK_URL ?? 'http://172.29.80.1:8081';
const REALM = process.env.EXPO_PUBLIC_KEYCLOAK_REALM ?? 'hungry';
const CLIENT_ID = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID ?? 'hungry-deliverer-app';

const realmUrl = `${KEYCLOAK_URL}/realms/${REALM}`;

export const keycloakConfig = {
  url: KEYCLOAK_URL,
  realm: REALM,
  clientId: CLIENT_ID,
  realmUrl,
  authorizationEndpoint: `${realmUrl}/protocol/openid-connect/auth`,
  tokenEndpoint: `${realmUrl}/protocol/openid-connect/token`,
  endSessionEndpoint: `${realmUrl}/protocol/openid-connect/logout`,
  userInfoEndpoint: `${realmUrl}/protocol/openid-connect/userinfo`,
  // No Admin REST endpoints here on purpose: account creation and profile
  // updates go through the backend (POST/PUT /drivers), which holds the
  // service-account credentials. Every EXPO_PUBLIC_* value ships in the
  // bundle in plaintext, so a secret here would be a public secret.
};
