BEGIN;

-- CreateIndex
CREATE UNIQUE INDEX "invitations_user_id_address_id_key" ON "invitations"("user_id", "address_id");

-- DropIndex
DROP INDEX "invitations_user_id_key";

COMMIT;
