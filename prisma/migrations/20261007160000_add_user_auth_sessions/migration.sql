-- Existing users remain guests; passwords are optional.
ALTER TABLE "users"
  ALTER COLUMN "phone_number" DROP NOT NULL,
  ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "password_hash" TEXT;

CREATE TABLE "sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "refresh_token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "revoked_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
