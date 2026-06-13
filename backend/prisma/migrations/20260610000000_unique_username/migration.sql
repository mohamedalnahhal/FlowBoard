-- Deduplicate existing usernames before adding the unique constraint:
-- keep the oldest row as-is, rename later duplicates with a numeric suffix.
WITH dupes AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at, id) AS rn
  FROM "users"
)
UPDATE "users" u
SET username = u.username || '_' || d.rn
FROM dupes d
WHERE u.id = d.id AND d.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
