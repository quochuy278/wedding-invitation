-- CreateEnum
CREATE TYPE "InvitationEmailStatus" AS ENUM ('pending', 'accepted', 'failed', 'unconfirmed', 'delivered', 'bounced');

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "email_attempt_id" UUID,
ADD COLUMN     "email_attempted_at" TIMESTAMPTZ(3),
ADD COLUMN     "email_error" TEXT,
ADD COLUMN     "email_message_id" TEXT,
ADD COLUMN     "email_status" "InvitationEmailStatus";

-- CreateIndex
CREATE UNIQUE INDEX "invitations_email_attempt_id_key" ON "invitations"("email_attempt_id");
