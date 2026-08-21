# Shopify OAuth implementation notes

Shopify's current standalone/API-only app flow uses the OAuth authorization-code grant. The app redirects the merchant to Shopify, supplies `client_id`, requested scopes, an exact configured `redirect_uri`, and a random `state`; the callback must validate state, HMAC, and the strict `*.myshopify.com` domain before exchanging the code for an offline token.[1] [2]

New public apps should request expiring offline tokens by including `expiring=1`. The token exchange returns an access token, refresh token, expiration metadata, and granted scopes. The backend must verify that the granted scope list contains the required scopes, encrypt both token values, refresh before expiry, and clear/re-authorize after an invalid refresh token.[1] [2]

Shop-specific webhook subscriptions can be created through the Admin GraphQL API after authorization. Shopify's documentation recommends app-specific subscriptions for uniform app configuration, but shop-specific subscriptions are appropriate when each merchant's delivery registration and tenant state are managed individually. The current Wslahali architecture already uses the GraphQL `webhookSubscriptionCreate` mutation and will keep that behavior after OAuth.[3]

## References

1. [Authenticate a standalone or API-only app](https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps)
2. [Authorization code grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant)
3. [Subscribe to webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe)
