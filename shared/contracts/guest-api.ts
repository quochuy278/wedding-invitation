// Temporary shared browser/API key. It is public in the client bundle, not a guest identity.
// Change it here and rebuild both client and server to rotate it.
export const guestApiKeyHeader = "X-Api-Key";
export const guestApiKey = "wedding-guest-v1-8904c19114da053d45a89813beb3c11bc07f1b381e4cd9b1";
export const guestApiHeaders = { [guestApiKeyHeader]: guestApiKey } as const;
