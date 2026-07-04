-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN     "recurrence_rule" JSONB;

-- CreateTable
CREATE TABLE "calendar_event_exceptions" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "exception_date" DATE NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "override_event_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_event_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_exceptions_event_id_exception_date_key" ON "calendar_event_exceptions"("event_id", "exception_date");

-- AddForeignKey
ALTER TABLE "calendar_event_exceptions" ADD CONSTRAINT "calendar_event_exceptions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
