# Google Maps links for named venues

Research checked: 2026-10-14. This note proposes options; it does not change application behavior.

## Documented URL behavior

Google's own coordinate-only example displays a pin without additional place information. Adding `query_place_id` identifies the Google Maps listing. `query` remains required and is used when Google cannot find that ID. Google recommends `PLACE_NAME,ADDRESS` or a place name plus Place ID for place details. [Maps URLs: Search](https://developers.google.com/maps/documentation/urls/get-started#search)

These are templates: replace placeholders from fetched venue data and URL-encode values.

```text
# Supported: Google listing identity, with readable search fallback
https://www.google.com/maps/search/?api=1&query={ENCODED_NAME_AND_FULL_ADDRESS}&query_place_id={ENCODED_GOOGLE_PLACE_ID}

# Recommended here: Google listing identity, with precise coordinate fallback
https://www.google.com/maps/search/?api=1&query={LATITUDE}%2C{LONGITUDE}&query_place_id={ENCODED_GOOGLE_PLACE_ID}

# Without a Google Place ID: recommended textual search, potentially ambiguous
https://www.google.com/maps/search/?api=1&query={ENCODED_NAME_AND_FULL_ADDRESS}

# Directions to an identified establishment
https://www.google.com/maps/dir/?api=1&destination={ENCODED_NAME_AND_FULL_ADDRESS}&destination_place_id={ENCODED_GOOGLE_PLACE_ID}
```

`destination_place_id` requires `destination`. Omit `origin` to let Maps use the device location when available. `dir_action=navigate` is optional and may produce route preview instead. Links need `api=1`, proper encoding, and no API key. There is no documented Search `label` parameter to turn coordinates into a business listing. [Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)

## Obtaining a Google Place ID

For a few venues, use Google's [Place ID finder](https://developers.google.com/maps/documentation/places/web-service/place-id#find-id), inspect the correct listing, and store its ID as venue data. Place IDs may be stored and reused; Google recommends refreshing IDs older than 12 months. [Place ID storage](https://developers.google.com/maps/documentation/places/web-service/place-id#save-id)

For automated enrichment, Places API (New) requires a Google Cloud project with billing, the API enabled, and authenticated requests using an API key or OAuth. [API setup](https://developers.google.com/maps/documentation/places/web-service/get-api-key)

```http
POST https://places.googleapis.com/v1/places:searchText
Content-Type: application/json
X-Goog-Api-Key: {SERVER_API_KEY}
X-Goog-FieldMask: places.id

{"textQuery":"{venue name}, {full street address, city, country}"}
```

`textQuery` and a response field mask are required. `places.id` returns candidates' Google IDs and selects the Essentials ID Only SKU; `places.name` is a resource name, not a display name. Requesting `places.displayName`, `places.formattedAddress`, or `places.location` selects Text Search Pro instead. [Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search)

Google currently lists Text Search Essentials IDs Only with unlimited free usage. [Pricing](https://developers.google.com/maps/billing-and-pricing/pricing#places-pricing)

For partial queries, existing coordinates can supply `locationBias.circle.center` plus a radius in meters. Bias can return results outside the circle and can be overridden by an explicit location in `textQuery`. Do not blindly accept the first candidate: ID-only responses cannot establish name/address/coordinate agreement; inspect the linked listing or request those extra fields. [Text Search location bias and fields](https://developers.google.com/maps/documentation/places/web-service/text-search)

## Recommendation for this repository

Geoapify documents its own `place_id`, including OpenStreetMap-sourced results. It does not document that field as a Google Place ID. Treat the providers' identifiers separately rather than passing a Geoapify ID to `query_place_id`. [Geoapify response](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/), [Google ID definition](https://developers.google.com/maps/documentation/places/web-service/place-id)

Proposed flow: resolve and verify a Google ID once when venue data is selected or updated; persist it per venue alongside the existing name, address, and coordinates; reuse it on the authorized guest's invitation. No restaurant hardcoding and no lookup per guest click. If no verified Google ID exists, name plus full address improves business discovery but does not guarantee identity; coordinate-only fallback guarantees only the point represented by those stored coordinates. A stale or incorrect Place ID also needs correction. These are implementation recommendations inferred from the documented behavior above.
