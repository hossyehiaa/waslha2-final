CREATE INDEX IF NOT EXISTS "AuditLog_ipAddress_action_createdAt_idx"
  ON "AuditLog"("ipAddress", "action", "createdAt");
