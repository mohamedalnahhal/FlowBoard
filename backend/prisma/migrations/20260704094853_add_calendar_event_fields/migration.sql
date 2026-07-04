-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN     "all_day" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "created_by" UUID,
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '';

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
