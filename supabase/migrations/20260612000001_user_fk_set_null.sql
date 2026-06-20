-- Prevent user deletion from being blocked by FK constraints.
 
ALTER TABLE "public"."assignment"
  DROP CONSTRAINT IF EXISTS "assignment_fk_user_id_fkey",
  ALTER COLUMN "fk_user_id" DROP NOT NULL,
  ADD CONSTRAINT "assignment_fk_user_id_fkey"
    FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."communication"
  DROP CONSTRAINT IF EXISTS "communication_fk_user_id_fkey",
  ALTER COLUMN "fk_user_id" DROP NOT NULL,
  ADD CONSTRAINT "communication_fk_user_id_fkey"
    FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."pilot_declaration"
  DROP CONSTRAINT IF EXISTS "pilot_declaration_fk_user_id_fkey",
  ALTER COLUMN "fk_user_id" DROP NOT NULL,
  ADD CONSTRAINT "pilot_declaration_fk_user_id_fkey"
    FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."messages"
  DROP CONSTRAINT IF EXISTS "messages_from_user_id_fkey",
  DROP CONSTRAINT IF EXISTS "messages_to_user_id_fkey",
  ALTER COLUMN "from_user_id" DROP NOT NULL,
  ALTER COLUMN "to_user_id" DROP NOT NULL,
  ADD CONSTRAINT "messages_from_user_id_fkey"
    FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
  ADD CONSTRAINT "messages_to_user_id_fkey"
    FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."pilot_mission"
  DROP CONSTRAINT IF EXISTS "pilot_mission_fk_pilot_user_id_fkey",
  ALTER COLUMN "fk_pilot_user_id" DROP NOT NULL,
  ADD CONSTRAINT "pilot_mission_fk_pilot_user_id_fkey"
    FOREIGN KEY ("fk_pilot_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

-- ── Already-nullable columns (change FK only) ───────────────────────────────

ALTER TABLE "public"."alert_log"
  DROP CONSTRAINT IF EXISTS "alert_log_acknowledged_by_user_id_fkey",
  DROP CONSTRAINT IF EXISTS "alert_log_assigned_to_user_id_fkey",
  DROP CONSTRAINT IF EXISTS "alert_log_resolved_by_user_id_fkey",
  DROP CONSTRAINT IF EXISTS "alert_log_triggered_by_user_id_fkey",
  ADD CONSTRAINT "alert_log_acknowledged_by_user_id_fkey"
    FOREIGN KEY ("acknowledged_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
  ADD CONSTRAINT "alert_log_assigned_to_user_id_fkey"
    FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
  ADD CONSTRAINT "alert_log_resolved_by_user_id_fkey"
    FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
  ADD CONSTRAINT "alert_log_triggered_by_user_id_fkey"
    FOREIGN KEY ("triggered_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."api_keys"
  DROP CONSTRAINT IF EXISTS "api_keys_created_by_user_id_fkey",
  ADD CONSTRAINT "api_keys_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."backup_log"
  DROP CONSTRAINT IF EXISTS "backup_log_performed_by_user_id_fkey",
  ADD CONSTRAINT "backup_log_performed_by_user_id_fkey"
    FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."calendar_shift"
  DROP CONSTRAINT IF EXISTS "calendar_shift_fk_pic_id_fkey",
  ADD CONSTRAINT "calendar_shift_fk_pic_id_fkey"
    FOREIGN KEY ("fk_pic_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."code_index"
  DROP CONSTRAINT IF EXISTS "code_index_user_id_fkey",
  ADD CONSTRAINT "code_index_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."communication_general"
  DROP CONSTRAINT IF EXISTS "communication_general_sent_by_user_id_fkey",
  ADD CONSTRAINT "communication_general_sent_by_user_id_fkey"
    FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."compliance_evidence"
  DROP CONSTRAINT IF EXISTS "compliance_evidence_submitted_by_user_id_fkey",
  DROP CONSTRAINT IF EXISTS "compliance_evidence_verified_by_user_id_fkey",
  ADD CONSTRAINT "compliance_evidence_submitted_by_user_id_fkey"
    FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
  ADD CONSTRAINT "compliance_evidence_verified_by_user_id_fkey"
    FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."compliance_status_log"
  DROP CONSTRAINT IF EXISTS "compliance_status_log_changed_by_user_id_fkey",
  ADD CONSTRAINT "compliance_status_log_changed_by_user_id_fkey"
    FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."deleted_owner"
  DROP CONSTRAINT IF EXISTS "deleted_owner_deleted_by_user_id_fkey",
  ADD CONSTRAINT "deleted_owner_deleted_by_user_id_fkey"
    FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."deleted_user"
  DROP CONSTRAINT IF EXISTS "deleted_user_deleted_by_user_id_fkey",
  ADD CONSTRAINT "deleted_user_deleted_by_user_id_fkey"
    FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."evaluation"
  DROP CONSTRAINT IF EXISTS "evaluation_created_by_user_id_fkey",
  ADD CONSTRAINT "evaluation_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."evaluation_action"
  DROP CONSTRAINT IF EXISTS "evaluation_action_assigned_to_user_id_fkey",
  ADD CONSTRAINT "evaluation_action_assigned_to_user_id_fkey"
    FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."evaluation_file"
  DROP CONSTRAINT IF EXISTS "evaluation_file_uploaded_by_user_id_fkey",
  ADD CONSTRAINT "evaluation_file_uploaded_by_user_id_fkey"
    FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."flight_requests"
  DROP CONSTRAINT IF EXISTS "flight_requests_assigned_by_user_id_fkey",
  ADD CONSTRAINT "flight_requests_assigned_by_user_id_fkey"
    FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."luc_document"
  DROP CONSTRAINT IF EXISTS "luc_document_approved_by_user_id_fkey",
  DROP CONSTRAINT IF EXISTS "luc_document_created_by_user_id_fkey",
  ADD CONSTRAINT "luc_document_approved_by_user_id_fkey"
    FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
  ADD CONSTRAINT "luc_document_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."luc_document_rev"
  DROP CONSTRAINT IF EXISTS "luc_document_rev_revised_by_user_id_fkey",
  ADD CONSTRAINT "luc_document_rev_revised_by_user_id_fkey"
    FOREIGN KEY ("revised_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."luc_procedure"
  DROP CONSTRAINT IF EXISTS "luc_procedure_approved_by_user_id_fkey",
  DROP CONSTRAINT IF EXISTS "luc_procedure_created_by_user_id_fkey",
  ADD CONSTRAINT "luc_procedure_approved_by_user_id_fkey"
    FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
  ADD CONSTRAINT "luc_procedure_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."maintenance_ticket"
  DROP CONSTRAINT IF EXISTS "maintenance_ticket_assigned_to_user_id_fkey",
  DROP CONSTRAINT IF EXISTS "maintenance_ticket_reported_by_user_id_fkey",
  ADD CONSTRAINT "maintenance_ticket_assigned_to_user_id_fkey"
    FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
  ADD CONSTRAINT "maintenance_ticket_reported_by_user_id_fkey"
    FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."maintenance_ticket_attachment"
  DROP CONSTRAINT IF EXISTS "maintenance_ticket_attachment_uploaded_by_user_id_fkey",
  ADD CONSTRAINT "maintenance_ticket_attachment_uploaded_by_user_id_fkey"
    FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."maintenance_ticket_event"
  DROP CONSTRAINT IF EXISTS "maintenance_ticket_event_created_by_user_id_fkey",
  ADD CONSTRAINT "maintenance_ticket_event_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."maintenance_ticket_report"
  DROP CONSTRAINT IF EXISTS "maintenance_ticket_report_generated_by_user_id_fkey",
  ADD CONSTRAINT "maintenance_ticket_report_generated_by_user_id_fkey"
    FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."owner_territorial_unit"
  DROP CONSTRAINT IF EXISTS "owner_territorial_unit_unit_manager_id_fkey",
  ADD CONSTRAINT "owner_territorial_unit_unit_manager_id_fkey"
    FOREIGN KEY ("unit_manager_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."pilot_mission_planned_template_logbook"
  DROP CONSTRAINT IF EXISTS "pilot_mission_planned_template_logbook_created_by_user_id_fkey",
  ADD CONSTRAINT "pilot_mission_planned_template_logbook_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."planning"
  DROP CONSTRAINT IF EXISTS "planning_created_by_user_id_fkey",
  ADD CONSTRAINT "planning_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."planning_test_logbook"
  DROP CONSTRAINT IF EXISTS "planning_test_logbook_fk_observer_id_fkey",
  DROP CONSTRAINT IF EXISTS "planning_test_logbook_fk_pic_id_fkey",
  DROP CONSTRAINT IF EXISTS "planning_test_logbook_fk_user_id_fkey",
  DROP CONSTRAINT IF EXISTS "planning_test_logbook_tested_by_user_id_fkey",
  ADD CONSTRAINT "planning_test_logbook_fk_observer_id_fkey"
    FOREIGN KEY ("fk_observer_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
  ADD CONSTRAINT "planning_test_logbook_fk_pic_id_fkey"
    FOREIGN KEY ("fk_pic_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
  ADD CONSTRAINT "planning_test_logbook_fk_user_id_fkey"
    FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
  ADD CONSTRAINT "planning_test_logbook_tested_by_user_id_fkey"
    FOREIGN KEY ("tested_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."repository_file"
  DROP CONSTRAINT IF EXISTS "repository_file_uploaded_by_user_id_fkey",
  ADD CONSTRAINT "repository_file_uploaded_by_user_id_fkey"
    FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."safety_action"
  DROP CONSTRAINT IF EXISTS "safety_action_assigned_to_user_id_fkey",
  DROP CONSTRAINT IF EXISTS "safety_action_verified_by_user_id_fkey",
  ADD CONSTRAINT "safety_action_assigned_to_user_id_fkey"
    FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
  ADD CONSTRAINT "safety_action_verified_by_user_id_fkey"
    FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."safety_report"
  DROP CONSTRAINT IF EXISTS "safety_report_investigated_by_user_id_fkey",
  DROP CONSTRAINT IF EXISTS "safety_report_reported_by_user_id_fkey",
  ADD CONSTRAINT "safety_report_investigated_by_user_id_fkey"
    FOREIGN KEY ("investigated_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
  ADD CONSTRAINT "safety_report_reported_by_user_id_fkey"
    FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."spi_kpi"
  DROP CONSTRAINT IF EXISTS "spi_kpi_recorded_by_user_id_fkey",
  ADD CONSTRAINT "spi_kpi_recorded_by_user_id_fkey"
    FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."spi_kpi_log"
  DROP CONSTRAINT IF EXISTS "spi_kpi_log_changed_by_user_id_fkey",
  ADD CONSTRAINT "spi_kpi_log_changed_by_user_id_fkey"
    FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."spi_kpi_target_proposal"
  DROP CONSTRAINT IF EXISTS "spi_kpi_target_proposal_approved_by_user_id_fkey",
  DROP CONSTRAINT IF EXISTS "spi_kpi_target_proposal_proposed_by_user_id_fkey",
  ADD CONSTRAINT "spi_kpi_target_proposal_approved_by_user_id_fkey"
    FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL,
  ADD CONSTRAINT "spi_kpi_target_proposal_proposed_by_user_id_fkey"
    FOREIGN KEY ("proposed_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."team"
  DROP CONSTRAINT IF EXISTS "team_team_leader_id_fkey",
  ADD CONSTRAINT "team_team_leader_id_fkey"
    FOREIGN KEY ("team_leader_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;

ALTER TABLE "public"."tool_maintenance"
  DROP CONSTRAINT IF EXISTS "tool_maintenance_performed_by_user_id_fkey",
  ADD CONSTRAINT "tool_maintenance_performed_by_user_id_fkey"
    FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;
