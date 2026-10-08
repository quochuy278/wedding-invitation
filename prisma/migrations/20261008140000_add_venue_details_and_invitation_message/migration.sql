-- Keep existing address_text and event_at unchanged; structured fields are populated on new venues.
ALTER TABLE "addresses"
ADD COLUMN "address_line_1" TEXT,
ADD COLUMN "address_line_2" TEXT,
ADD COLUMN "location_type" TEXT,
ADD COLUMN "postal_code" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "region" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "instructions" TEXT,
ADD COLUMN "floor" TEXT,
ADD COLUMN "entrance" TEXT,
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

ALTER TABLE "addresses" ADD CONSTRAINT "addresses_coordinates_check" CHECK (
  ("latitude" IS NULL AND "longitude" IS NULL) OR
  ("latitude" IS NOT NULL AND "longitude" IS NOT NULL AND
   "latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180)
);

ALTER TABLE "invitations" ADD COLUMN "personal_message" TEXT;
