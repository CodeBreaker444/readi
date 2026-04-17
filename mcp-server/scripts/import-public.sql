CREATE SEQUENCE public.alert_log_alert_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alert_log_alert_id_seq OWNER TO postgres;

CREATE SEQUENCE public.api_keys_api_key_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.api_keys_api_key_id_seq OWNER TO postgres;

CREATE SEQUENCE public.assignment_assignment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assignment_assignment_id_seq OWNER TO postgres;

CREATE SEQUENCE public.audit_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_audit_id_seq OWNER TO postgres;

CREATE SEQUENCE public.audit_finding_finding_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_finding_finding_id_seq OWNER TO postgres;

CREATE SEQUENCE public.backup_log_backup_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.backup_log_backup_id_seq OWNER TO postgres;

CREATE SEQUENCE public.calendar_shift_shift_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.calendar_shift_shift_id_seq OWNER TO postgres;

CREATE SEQUENCE public.checklist_checklist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.checklist_checklist_id_seq OWNER TO postgres;

CREATE SEQUENCE public.client_client_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_client_id_seq OWNER TO postgres;

CREATE SEQUENCE public.code_index_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.code_index_id_seq OWNER TO postgres;

CREATE SEQUENCE public.communication_communication_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.communication_communication_id_seq OWNER TO postgres;

CREATE SEQUENCE public.communication_general_communication_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.communication_general_communication_id_seq OWNER TO postgres;

CREATE SEQUENCE public.compliance_evidence_evidence_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.compliance_evidence_evidence_id_seq OWNER TO postgres;

CREATE SEQUENCE public.compliance_requirement_requirement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.compliance_requirement_requirement_id_seq OWNER TO postgres;

CREATE SEQUENCE public.compliance_status_log_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.compliance_status_log_log_id_seq OWNER TO postgres;

CREATE SEQUENCE public.controlroom_drone_controlroom_drone_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.controlroom_drone_controlroom_drone_id_seq OWNER TO postgres;

CREATE SEQUENCE public.controlroom_meta_meta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.controlroom_meta_meta_id_seq OWNER TO postgres;

CREATE SEQUENCE public.countries_country_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.countries_country_id_seq OWNER TO postgres;

CREATE SEQUENCE public.deleted_owner_deleted_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deleted_owner_deleted_id_seq OWNER TO postgres;

CREATE SEQUENCE public.deleted_user_deleted_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deleted_user_deleted_id_seq OWNER TO postgres;

CREATE SEQUENCE public.evaluation_action_action_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_action_action_id_seq OWNER TO postgres;

CREATE SEQUENCE public.evaluation_evaluation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_evaluation_id_seq OWNER TO postgres;

CREATE SEQUENCE public.evaluation_file_file_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluation_file_file_id_seq OWNER TO postgres;

CREATE SEQUENCE public.flytbase_mission_flytbase_mission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.flytbase_mission_flytbase_mission_id_seq OWNER TO postgres;

CREATE SEQUENCE public.flytbase_mission_log_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.flytbase_mission_log_log_id_seq OWNER TO postgres;

CREATE SEQUENCE public.flytbase_mission_status_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.flytbase_mission_status_status_id_seq OWNER TO postgres;

CREATE SEQUENCE public.kanban_kanban_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kanban_kanban_id_seq OWNER TO postgres;

CREATE SEQUENCE public.luc_doc_type_doc_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.luc_doc_type_doc_type_id_seq OWNER TO postgres;

CREATE SEQUENCE public.luc_document_document_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.luc_document_document_id_seq OWNER TO postgres;

CREATE SEQUENCE public.luc_document_rev_revision_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.luc_document_rev_revision_id_seq OWNER TO postgres;

CREATE SEQUENCE public.luc_procedure_procedure_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.luc_procedure_procedure_id_seq OWNER TO postgres;

CREATE SEQUENCE public.maintenance_ticket_attachment_attachment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenance_ticket_attachment_attachment_id_seq OWNER TO postgres;

CREATE SEQUENCE public.maintenance_ticket_event_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenance_ticket_event_event_id_seq OWNER TO postgres;

CREATE SEQUENCE public.maintenance_ticket_item_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenance_ticket_item_item_id_seq OWNER TO postgres;

CREATE SEQUENCE public.maintenance_ticket_report_report_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenance_ticket_report_report_id_seq OWNER TO postgres;

CREATE SEQUENCE public.maintenance_ticket_ticket_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenance_ticket_ticket_id_seq OWNER TO postgres;

CREATE SEQUENCE public.messages_message_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_message_id_seq OWNER TO postgres;

CREATE SEQUENCE public.mission_component_component_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mission_component_component_id_seq OWNER TO postgres;

CREATE SEQUENCE public.notification_notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_notification_id_seq OWNER TO postgres;

CREATE SEQUENCE public.owner_owner_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.owner_owner_id_seq OWNER TO postgres;

CREATE SEQUENCE public.owner_territorial_unit_unit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.owner_territorial_unit_unit_id_seq OWNER TO postgres;

CREATE SEQUENCE public.payload_payload_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payload_payload_id_seq OWNER TO postgres;

CREATE SEQUENCE public.pilot_declaration_declaration_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pilot_declaration_declaration_id_seq OWNER TO postgres;

CREATE SEQUENCE public.pilot_mission_category_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pilot_mission_category_category_id_seq OWNER TO postgres;

CREATE SEQUENCE public.pilot_mission_pilot_mission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pilot_mission_pilot_mission_id_seq OWNER TO postgres;

CREATE SEQUENCE public.pilot_mission_planned_template_logbook_template_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pilot_mission_planned_template_logbook_template_id_seq OWNER TO postgres;

CREATE SEQUENCE public.pilot_mission_result_result_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pilot_mission_result_result_id_seq OWNER TO postgres;

CREATE SEQUENCE public.pilot_mission_result_type_result_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pilot_mission_result_type_result_type_id_seq OWNER TO postgres;

CREATE SEQUENCE public.pilot_mission_status_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pilot_mission_status_status_id_seq OWNER TO postgres;

CREATE SEQUENCE public.pilot_mission_type_mission_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pilot_mission_type_mission_type_id_seq OWNER TO postgres;

CREATE SEQUENCE public.pilot_status_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pilot_status_status_id_seq OWNER TO postgres;

CREATE SEQUENCE public.pilot_vehicle_status_vehicle_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pilot_vehicle_status_vehicle_status_id_seq OWNER TO postgres;

CREATE SEQUENCE public.planning_logbook_mission_planning_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.planning_logbook_mission_planning_id_seq OWNER TO postgres;

CREATE SEQUENCE public.planning_planning_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.planning_planning_id_seq OWNER TO postgres;

CREATE SEQUENCE public.planning_test_logbook_test_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.planning_test_logbook_test_id_seq OWNER TO postgres;

CREATE SEQUENCE public.repository_file_file_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.repository_file_file_id_seq OWNER TO postgres;

CREATE SEQUENCE public.repository_file_type_file_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.repository_file_type_file_type_id_seq OWNER TO postgres;

CREATE SEQUENCE public.safety_action_action_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.safety_action_action_id_seq OWNER TO postgres;

CREATE SEQUENCE public.safety_report_report_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.safety_report_report_id_seq OWNER TO postgres;

CREATE SEQUENCE public.spi_kpi_definition_definition_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.spi_kpi_definition_definition_id_seq OWNER TO postgres;

CREATE SEQUENCE public.spi_kpi_kpi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.spi_kpi_kpi_id_seq OWNER TO postgres;

CREATE SEQUENCE public.spi_kpi_log_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.spi_kpi_log_log_id_seq OWNER TO postgres;

CREATE SEQUENCE public.spi_kpi_target_proposal_proposal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.spi_kpi_target_proposal_proposal_id_seq OWNER TO postgres;

CREATE SEQUENCE public.team_members_team_member_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.team_members_team_member_id_seq OWNER TO postgres;

CREATE SEQUENCE public.team_team_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.team_team_id_seq OWNER TO postgres;

CREATE SEQUENCE public.ticket_attachment_attachment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ticket_attachment_attachment_id_seq OWNER TO postgres;

CREATE SEQUENCE public.tool_component_component_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tool_component_component_id_seq OWNER TO postgres;

CREATE SEQUENCE public.tool_erp_erp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tool_erp_erp_id_seq OWNER TO postgres;

CREATE SEQUENCE public.tool_maintenance_maintenance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tool_maintenance_maintenance_id_seq OWNER TO postgres;

CREATE SEQUENCE public.tool_model_model_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tool_model_model_id_seq OWNER TO postgres;

CREATE SEQUENCE public.tool_status_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tool_status_status_id_seq OWNER TO postgres;

CREATE SEQUENCE public.tool_tool_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tool_tool_id_seq OWNER TO postgres;

CREATE SEQUENCE public.tool_type_tool_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tool_type_tool_type_id_seq OWNER TO postgres;

CREATE SEQUENCE public.training_attendance_attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.training_attendance_attendance_id_seq OWNER TO postgres;

CREATE SEQUENCE public.training_training_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.training_training_id_seq OWNER TO postgres;

CREATE SEQUENCE public.turn_users_turn_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.turn_users_turn_user_id_seq OWNER TO postgres;

CREATE SEQUENCE public.turns_turn_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.turns_turn_id_seq OWNER TO postgres;

CREATE SEQUENCE public.user_device_device_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_device_device_id_seq OWNER TO postgres;

CREATE SEQUENCE public.user_owner_user_owner_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_owner_user_owner_id_seq OWNER TO postgres;

CREATE SEQUENCE public.user_permessi_permission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_permessi_permission_id_seq OWNER TO postgres;

CREATE SEQUENCE public.user_session_session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_session_session_id_seq OWNER TO postgres;

CREATE SEQUENCE public.user_settings_setting_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_settings_setting_id_seq OWNER TO postgres;

CREATE SEQUENCE public.users_profile_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_profile_profile_id_seq OWNER TO postgres;

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_user_id_seq OWNER TO postgres;

CREATE SEQUENCE public.v_training_session_stats_stat_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.v_training_session_stats_stat_id_seq OWNER TO postgres;

-- Table: alert_log
DROP TABLE IF EXISTS public.alert_log CASCADE;
CREATE TABLE public.alert_log (
    alert_id integer NOT NULL,
    alert_type character varying(50) NOT NULL,
    alert_severity character varying(20),
    alert_source character varying(100),
    alert_message text NOT NULL,
    alert_data jsonb,
    related_entity_type character varying(50),
    related_entity_id integer,
    triggered_by_user_id integer,
    assigned_to_user_id integer,
    alert_status character varying(50),
    acknowledged_at timestamp without time zone,
    acknowledged_by_user_id integer,
    resolved_at timestamp without time zone,
    resolved_by_user_id integer,
    resolution_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: api_keys
DROP TABLE IF EXISTS public.api_keys CASCADE;
CREATE TABLE public.api_keys (
    api_key_id integer NOT NULL,
    fk_owner_id integer,
    fk_client_id integer,
    api_key character varying(255) NOT NULL,
    api_key_name character varying(100),
    api_key_description text,
    permissions jsonb,
    rate_limit integer,
    is_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_used_at timestamp without time zone,
    expires_at timestamp without time zone,
    created_by integer
);

-- Table: assignment
DROP TABLE IF EXISTS public.assignment CASCADE;
CREATE TABLE public.assignment (
    assignment_id integer NOT NULL,
    fk_user_id integer NOT NULL,
    fk_owner_id integer NOT NULL,
    assignment_code character varying(50),
    assignment_desc text,
    assignment_json jsonb,
    assignment_ver numeric(5,2),
    assignment_active character(1) DEFAULT 'Y'::bpchar,
    due_date date,
    completed_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: audit
DROP TABLE IF EXISTS public.audit CASCADE;
CREATE TABLE public.audit (
    audit_id integer NOT NULL,
    fk_owner_id integer,
    fk_client_id integer,
    audit_code character varying(50),
    audit_name character varying(255) NOT NULL,
    audit_type character varying(50),
    audit_description text,
    audit_status character varying(50),
    scheduled_date date,
    start_date date,
    end_date date,
    auditor_user_id integer,
    audit_scope text,
    audit_criteria jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: audit_finding
DROP TABLE IF EXISTS public.audit_finding CASCADE;
CREATE TABLE public.audit_finding (
    finding_id integer NOT NULL,
    fk_audit_id integer NOT NULL,
    finding_code character varying(50),
    finding_title character varying(255) NOT NULL,
    finding_description text,
    finding_severity character varying(20),
    finding_category character varying(100),
    affected_area text,
    root_cause text,
    recommendation text,
    corrective_action text,
    responsible_user_id integer,
    due_date date,
    resolved_date date,
    resolution_notes text,
    finding_status character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: backup_log
DROP TABLE IF EXISTS public.backup_log CASCADE;
CREATE TABLE public.backup_log (
    backup_id integer NOT NULL,
    backup_type character varying(50),
    backup_name character varying(255),
    backup_path text,
    backup_size bigint,
    backup_status character varying(50),
    backup_start_time timestamp without time zone,
    backup_end_time timestamp without time zone,
    backup_duration integer,
    error_message text,
    performed_by_user_id integer,
    backup_metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: calendar_shift
DROP TABLE IF EXISTS public.calendar_shift CASCADE;
CREATE TABLE public.calendar_shift (
    shift_id integer NOT NULL,
    fk_owner_id integer,
    fk_client_id integer,
    fk_pic_id integer,
    shift_date_start date NOT NULL,
    shift_date_end date NOT NULL,
    shift_time_start time without time zone NOT NULL,
    shift_time_end time without time zone NOT NULL,
    shift_recurring character varying(50),
    shift_date_until date,
    shift_desc text,
    shift_group_label character varying(100),
    shift_category character varying(50),
    recurring_group_id character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: checklist
DROP TABLE IF EXISTS public.checklist CASCADE;
CREATE TABLE public.checklist (
    checklist_id integer NOT NULL,
    fk_user_id integer,
    fk_owner_id integer,
    checklist_code character varying(50),
    checklist_desc text,
    checklist_json jsonb,
    checklist_ver numeric(5,2),
    checklist_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fk_planning_id integer
);

-- Table: client
DROP TABLE IF EXISTS public.client CASCADE;
CREATE TABLE public.client (
    client_id integer NOT NULL,
    fk_owner_id integer NOT NULL,
    client_code character varying(50),
    client_name character varying(255) NOT NULL,
    client_legal_name character varying(255),
    client_address text,
    client_city character varying(100),
    client_state character varying(100),
    client_postal_code character varying(20),
    fk_country_id integer,
    client_phone character varying(50),
    client_email character varying(255),
    client_website character varying(255),
    client_logo text,
    client_active character(1) DEFAULT 'Y'::bpchar,
    client_unique_code uuid DEFAULT extensions.uuid_generate_v4(),
    client_code_id character varying(100),
    client_home_dir character varying(255),
    contract_start_date date,
    contract_end_date date,
    payment_terms character varying(100),
    credit_limit numeric(15,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: code_index
DROP TABLE IF EXISTS public.code_index CASCADE;
CREATE TABLE public.code_index (
    id integer NOT NULL,
    owner_code_index integer,
    property_code_index integer,
    inspection_code_index integer,
    date_update date,
    user_id integer
);

-- Table: communication
DROP TABLE IF EXISTS public.communication CASCADE;
CREATE TABLE public.communication (
    communication_id integer NOT NULL,
    fk_user_id integer NOT NULL,
    fk_owner_id integer,
    communication_code character varying(50),
    communication_desc text,
    communication_json jsonb,
    communication_ver numeric(5,2),
    communication_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: communication_general
DROP TABLE IF EXISTS public.communication_general CASCADE;
CREATE TABLE public.communication_general (
    communication_id integer NOT NULL,
    fk_owner_id integer,
    subject character varying(255),
    message text,
    communication_type character varying(50),
    priority character varying(20),
    status character varying(50),
    sent_by_user_id integer,
    recipients jsonb,
    attachments jsonb,
    sent_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    read_at timestamp without time zone,
    communication_level character varying(20) DEFAULT 'info'::character varying,
    fk_client_id integer,
    fk_planning_id integer,
    fk_evaluation_id integer,
    communication_to jsonb,
    communication_file_name character varying(255),
    communication_file_key character varying(500),
    communication_file_url text
);

-- Table: compliance_evidence
DROP TABLE IF EXISTS public.compliance_evidence CASCADE;
CREATE TABLE public.compliance_evidence (
    evidence_id integer NOT NULL,
    fk_requirement_id integer NOT NULL,
    evidence_type character varying(50),
    evidence_description text,
    file_path text,
    submitted_by_user_id integer,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    verified_by_user_id integer,
    verified_at timestamp without time zone,
    verification_status character varying(50),
    notes text
);

-- Table: compliance_requirement
DROP TABLE IF EXISTS public.compliance_requirement CASCADE;
CREATE TABLE public.compliance_requirement (
    requirement_id integer NOT NULL,
    fk_owner_id integer,
    requirement_code character varying(50),
    requirement_title character varying(255) NOT NULL,
    requirement_description text,
    requirement_type character varying(50),
    regulatory_body character varying(255),
    requirement_status character varying(50),
    effective_date date,
    review_frequency integer,
    next_review_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: compliance_status_log
DROP TABLE IF EXISTS public.compliance_status_log CASCADE;
CREATE TABLE public.compliance_status_log (
    log_id integer NOT NULL,
    fk_requirement_id integer NOT NULL,
    status_from character varying(50),
    status_to character varying(50) NOT NULL,
    changed_by_user_id integer,
    change_reason text,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: controlroom_drone
DROP TABLE IF EXISTS public.controlroom_drone CASCADE;
CREATE TABLE public.controlroom_drone (
    controlroom_drone_id integer NOT NULL,
    fk_tool_id integer NOT NULL,
    fk_pilot_mission_id integer,
    current_status character varying(50),
    current_location point,
    current_altitude numeric(10,2),
    current_speed numeric(10,2),
    battery_level numeric(5,2),
    signal_strength numeric(5,2),
    telemetry_data jsonb,
    last_heartbeat timestamp without time zone,
    is_active boolean DEFAULT true,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: controlroom_meta
DROP TABLE IF EXISTS public.controlroom_meta CASCADE;
CREATE TABLE public.controlroom_meta (
    meta_id integer NOT NULL,
    fk_owner_id integer,
    meta_key character varying(100) NOT NULL,
    meta_value text,
    meta_type character varying(50),
    meta_description text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: countries
DROP TABLE IF EXISTS public.countries CASCADE;
CREATE TABLE public.countries (
    country_id integer NOT NULL,
    country_code character varying(10),
    country_name character varying(255) NOT NULL,
    country_region character varying(100),
    country_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: deleted_owner
DROP TABLE IF EXISTS public.deleted_owner CASCADE;
CREATE TABLE public.deleted_owner (
    deleted_id integer NOT NULL,
    owner_id integer NOT NULL,
    owner_code character varying(50),
    owner_name character varying(255),
    owner_legal_name character varying(255),
    owner_type character varying(50),
    owner_address text,
    owner_city character varying(100),
    owner_state character varying(100),
    owner_postal_code character varying(20),
    fk_country_id integer,
    owner_phone character varying(50),
    owner_email character varying(255),
    owner_website character varying(255),
    owner_logo text,
    owner_active character(1),
    tax_id character varying(50),
    registration_number character varying(100),
    license_number character varying(100),
    license_expiry date,
    original_created_at timestamp without time zone,
    deleted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_by_user_id integer,
    deletion_reason text
);

-- Table: deleted_user
DROP TABLE IF EXISTS public.deleted_user CASCADE;
CREATE TABLE public.deleted_user (
    deleted_id integer NOT NULL,
    user_id integer NOT NULL,
    username character varying(100),
    email character varying(255),
    first_name character varying(100),
    last_name character varying(100),
    phone character varying(50),
    user_role character varying(50),
    user_type character varying(50),
    fk_owner_id integer,
    owner_code character varying(50),
    owner_name character varying(255),
    original_created_at timestamp without time zone,
    deleted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_by_user_id integer,
    deletion_reason text
);

-- Table: evaluation
DROP TABLE IF EXISTS public.evaluation CASCADE;
CREATE TABLE public.evaluation (
    evaluation_id integer NOT NULL,
    fk_owner_id integer NOT NULL,
    fk_client_id integer,
    evaluation_code character varying(50),
    evaluation_name character varying(255) NOT NULL,
    evaluation_description text,
    evaluation_type character varying(50),
    evaluation_status character varying(50),
    scheduled_date date,
    start_date date,
    end_date date,
    location text,
    coordinates point,
    assigned_to_user_id integer,
    created_by_user_id integer,
    evaluation_priority character varying(20),
    evaluation_active character(1) DEFAULT 'Y'::bpchar,
    evaluation_metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fk_user_id integer,
    fk_luc_procedure_id integer,
    fk_evaluation_code integer,
    evaluation_request_date date,
    evaluation_year integer,
    evaluation_desc character varying(500) DEFAULT ''::character varying,
    evaluation_offer character varying(100) DEFAULT ''::character varying,
    evaluation_sale_manager character varying(100) DEFAULT ''::character varying,
    evaluation_folder character varying(255) DEFAULT ''::character varying,
    evaluation_result character varying(100) DEFAULT 'PROCESSING'::character varying,
    evaluation_polygon text,
    evaluation_json jsonb DEFAULT '{}'::jsonb,
    evaluation_kmz bytea,
    date_create date,
    last_update date
);

-- Table: evaluation_action
DROP TABLE IF EXISTS public.evaluation_action CASCADE;
CREATE TABLE public.evaluation_action (
    action_id integer NOT NULL,
    fk_evaluation_id integer NOT NULL,
    action_code character varying(50),
    action_title character varying(255) NOT NULL,
    action_description text,
    action_type character varying(50),
    action_status character varying(50),
    action_priority character varying(20),
    assigned_to_user_id integer,
    due_date date,
    completed_date date,
    estimated_hours numeric(8,2),
    actual_hours numeric(8,2),
    action_order integer,
    dependencies jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: evaluation_file
DROP TABLE IF EXISTS public.evaluation_file CASCADE;
CREATE TABLE public.evaluation_file (
    file_id integer NOT NULL,
    fk_evaluation_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path text,
    file_type character varying(100),
    file_category character varying(50),
    file_size bigint,
    file_description text,
    uploaded_by_user_id integer,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    file_version integer DEFAULT 1,
    is_latest boolean DEFAULT true
);

-- Table: flytbase_mission
DROP TABLE IF EXISTS public.flytbase_mission CASCADE;
CREATE TABLE public.flytbase_mission (
    flytbase_mission_id integer NOT NULL,
    fk_planning_id integer,
    flytbase_mission_code character varying(100),
    flytbase_mission_data jsonb,
    sync_status character varying(50),
    last_sync_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: flytbase_mission_log
DROP TABLE IF EXISTS public.flytbase_mission_log CASCADE;
CREATE TABLE public.flytbase_mission_log (
    log_id integer NOT NULL,
    fk_flytbase_mission_id integer,
    log_type character varying(50),
    log_data jsonb,
    log_timestamp timestamp without time zone,
    is_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: flytbase_mission_status
DROP TABLE IF EXISTS public.flytbase_mission_status CASCADE;
CREATE TABLE public.flytbase_mission_status (
    status_id integer NOT NULL,
    fk_flytbase_mission_id integer,
    status_data jsonb,
    status_timestamp timestamp without time zone,
    is_managed character(1) DEFAULT 'N'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: kanban
DROP TABLE IF EXISTS public.kanban CASCADE;
CREATE TABLE public.kanban (
    kanban_id integer NOT NULL,
    fk_owner_id integer,
    fk_user_id integer,
    fk_evaluation_id integer,
    board_name character varying(255),
    column_name character varying(100),
    card_title character varying(255) NOT NULL,
    card_description text,
    card_order integer,
    card_priority character varying(20),
    card_labels jsonb,
    assigned_users jsonb,
    due_date date,
    card_metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: luc_doc_type
DROP TABLE IF EXISTS public.luc_doc_type CASCADE;
CREATE TABLE public.luc_doc_type (
    doc_type_id integer NOT NULL,
    doc_type_code character varying(50),
    doc_type_name character varying(255) NOT NULL,
    doc_type_description text,
    doc_type_category character varying(100),
    doc_type_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: luc_document
DROP TABLE IF EXISTS public.luc_document CASCADE;
CREATE TABLE public.luc_document (
    document_id integer NOT NULL,
    fk_owner_id integer,
    fk_doc_type_id integer,
    document_code character varying(50),
    document_title character varying(255) NOT NULL,
    document_description text,
    document_status character varying(50),
    effective_date date,
    expiry_date date,
    version_number character varying(20),
    is_current_version boolean DEFAULT true,
    created_by_user_id integer,
    approved_by_user_id integer,
    approved_at timestamp without time zone,
    document_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: luc_document_rev
DROP TABLE IF EXISTS public.luc_document_rev CASCADE;
CREATE TABLE public.luc_document_rev (
    revision_id integer NOT NULL,
    fk_document_id integer NOT NULL,
    revision_number character varying(20) NOT NULL,
    revision_date date,
    revision_description text,
    file_path text,
    file_size bigint,
    revised_by_user_id integer,
    changes_summary text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: luc_procedure
DROP TABLE IF EXISTS public.luc_procedure CASCADE;
CREATE TABLE public.luc_procedure (
    procedure_id integer NOT NULL,
    fk_owner_id integer,
    fk_document_id integer,
    procedure_code character varying(50),
    procedure_name character varying(255) NOT NULL,
    procedure_description text,
    procedure_steps jsonb,
    procedure_version character varying(20),
    procedure_status character varying(50),
    effective_date date,
    review_date date,
    created_by_user_id integer,
    approved_by_user_id integer,
    procedure_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    procedure_sector character varying(50)
);

-- Table: maintenance_ticket
DROP TABLE IF EXISTS public.maintenance_ticket CASCADE;
CREATE TABLE public.maintenance_ticket (
    ticket_id integer NOT NULL,
    fk_owner_id integer,
    fk_tool_id integer,
    ticket_number character varying(50),
    ticket_title character varying(255) NOT NULL,
    ticket_description text,
    ticket_type character varying(50),
    ticket_priority character varying(20),
    ticket_status character varying(50),
    reported_by_user_id integer,
    assigned_to_user_id integer,
    reported_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at timestamp without time zone,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    closed_at timestamp without time zone,
    estimated_hours numeric(8,2),
    actual_hours numeric(8,2),
    estimated_cost numeric(15,2),
    actual_cost numeric(15,2),
    resolution_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: maintenance_ticket_attachment
DROP TABLE IF EXISTS public.maintenance_ticket_attachment CASCADE;
CREATE TABLE public.maintenance_ticket_attachment (
    attachment_id integer NOT NULL,
    fk_ticket_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path text,
    file_type character varying(100),
    file_size bigint,
    uploaded_by_user_id integer,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: maintenance_ticket_event
DROP TABLE IF EXISTS public.maintenance_ticket_event CASCADE;
CREATE TABLE public.maintenance_ticket_event (
    event_id integer NOT NULL,
    fk_ticket_id integer NOT NULL,
    event_type character varying(50) NOT NULL,
    event_description text,
    event_data jsonb,
    created_by_user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: maintenance_ticket_item
DROP TABLE IF EXISTS public.maintenance_ticket_item CASCADE;
CREATE TABLE public.maintenance_ticket_item (
    item_id integer NOT NULL,
    fk_ticket_id integer NOT NULL,
    fk_component_id integer,
    item_description character varying(255) NOT NULL,
    item_type character varying(50),
    quantity integer,
    unit_cost numeric(15,2),
    total_cost numeric(15,2),
    supplier character varying(255),
    part_number character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: maintenance_ticket_report
DROP TABLE IF EXISTS public.maintenance_ticket_report CASCADE;
CREATE TABLE public.maintenance_ticket_report (
    report_id integer NOT NULL,
    fk_ticket_id integer NOT NULL,
    report_title character varying(255),
    report_content text,
    report_type character varying(50),
    findings text,
    recommendations text,
    generated_by_user_id integer,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: messages
DROP TABLE IF EXISTS public.messages CASCADE;
CREATE TABLE public.messages (
    message_id integer NOT NULL,
    from_user_id integer NOT NULL,
    to_user_id integer NOT NULL,
    message_subject character varying(255),
    message_body text,
    message_type character varying(50),
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    parent_message_id integer,
    attachments jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_by_sender boolean DEFAULT false,
    deleted_by_recipient boolean DEFAULT false
);

-- Table: mission_component
DROP TABLE IF EXISTS public.mission_component CASCADE;
CREATE TABLE public.mission_component (
    component_id integer NOT NULL,
    fk_planning_id integer,
    fk_tool_id integer,
    component_role character varying(100),
    component_config jsonb,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: notification
DROP TABLE IF EXISTS public.notification CASCADE;
CREATE TABLE public.notification (
    notification_id integer NOT NULL,
    fk_user_id integer NOT NULL,
    notification_type character varying(50),
    notification_title character varying(255),
    notification_message text,
    notification_data jsonb,
    priority character varying(20),
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    action_url text,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: owner
DROP TABLE IF EXISTS public.owner CASCADE;
CREATE TABLE public.owner (
    owner_id integer NOT NULL,
    owner_code character varying(50),
    owner_name character varying(255) NOT NULL,
    owner_legal_name character varying(255),
    owner_type character varying(50),
    owner_address text,
    owner_city character varying(100),
    owner_state character varying(100),
    owner_postal_code character varying(20),
    fk_country_id integer,
    owner_phone character varying(50),
    owner_email character varying(255),
    owner_website character varying(255),
    owner_logo text,
    owner_active character(1) DEFAULT 'Y'::bpchar,
    tax_id character varying(50),
    registration_number character varying(100),
    license_number character varying(100),
    license_expiry date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: owner_territorial_unit
DROP TABLE IF EXISTS public.owner_territorial_unit CASCADE;
CREATE TABLE public.owner_territorial_unit (
    unit_id integer NOT NULL,
    fk_owner_id integer NOT NULL,
    unit_code character varying(50),
    unit_name character varying(255) NOT NULL,
    unit_type character varying(50),
    unit_address text,
    unit_city character varying(100),
    unit_state character varying(100),
    unit_postal_code character varying(20),
    fk_country_id integer,
    unit_phone character varying(50),
    unit_email character varying(255),
    unit_manager_id integer,
    unit_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: payload
DROP TABLE IF EXISTS public.payload CASCADE;
CREATE TABLE public.payload (
    payload_id integer NOT NULL,
    fk_owner_id integer,
    fk_tool_id integer,
    payload_code character varying(50),
    payload_name character varying(255) NOT NULL,
    payload_type character varying(100),
    payload_description text,
    manufacturer character varying(255),
    model character varying(255),
    specifications jsonb,
    weight numeric(10,3),
    power_requirements character varying(100),
    compatibility jsonb,
    payload_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: pilot_declaration
DROP TABLE IF EXISTS public.pilot_declaration CASCADE;
CREATE TABLE public.pilot_declaration (
    declaration_id integer NOT NULL,
    fk_user_id integer NOT NULL,
    fk_tool_id integer,
    declaration_type character varying(50),
    declaration_date date,
    declaration_data jsonb,
    checklist_completed boolean DEFAULT false,
    declared_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: pilot_mission
DROP TABLE IF EXISTS public.pilot_mission CASCADE;
CREATE TABLE public.pilot_mission (
    pilot_mission_id integer NOT NULL,
    fk_planning_id integer,
    fk_pilot_user_id integer NOT NULL,
    fk_tool_id integer,
    fk_mission_type_id integer,
    fk_mission_category_id integer,
    fk_mission_status_id integer,
    mission_code character varying(50),
    mission_name character varying(255),
    mission_description text,
    scheduled_start timestamp without time zone,
    actual_start timestamp without time zone,
    actual_end timestamp without time zone,
    flight_duration integer,
    location text,
    coordinates point,
    weather_conditions jsonb,
    pre_flight_check_ok boolean,
    post_flight_check_ok boolean,
    fuel_used numeric(10,2),
    distance_flown numeric(10,2),
    max_altitude numeric(10,2),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fk_owner_id integer NOT NULL,
    status_name character varying(100)
);

-- Table: pilot_mission_category
DROP TABLE IF EXISTS public.pilot_mission_category CASCADE;
CREATE TABLE public.pilot_mission_category (
    category_id integer NOT NULL,
    category_code character varying(50) NOT NULL,
    category_name character varying(100) NOT NULL,
    category_description text,
    is_active boolean DEFAULT true,
    fk_owner_id integer NOT NULL
);

-- Table: pilot_mission_planned_template_logbook
DROP TABLE IF EXISTS public.pilot_mission_planned_template_logbook CASCADE;
CREATE TABLE public.pilot_mission_planned_template_logbook (
    template_id integer NOT NULL,
    template_code character varying(50),
    template_name character varying(255) NOT NULL,
    template_description text,
    template_data jsonb,
    created_by_user_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: pilot_mission_result
DROP TABLE IF EXISTS public.pilot_mission_result CASCADE;
CREATE TABLE public.pilot_mission_result (
    result_id integer NOT NULL,
    fk_pilot_mission_id integer NOT NULL,
    result_type character varying(50),
    result_description text,
    file_path text,
    file_count integer,
    data_size bigint,
    quality_score numeric(5,2),
    processing_status character varying(50),
    result_metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: pilot_mission_result_type
DROP TABLE IF EXISTS public.pilot_mission_result_type CASCADE;
CREATE TABLE public.pilot_mission_result_type (
    result_type_id integer NOT NULL,
    fk_owner_id integer,
    result_type_code character varying(50) NOT NULL,
    result_type_desc text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: pilot_mission_status
DROP TABLE IF EXISTS public.pilot_mission_status CASCADE;
CREATE TABLE public.pilot_mission_status (
    status_id integer NOT NULL,
    status_code character varying(50) NOT NULL,
    status_name character varying(100) NOT NULL,
    status_description text,
    status_order integer,
    is_final_status boolean DEFAULT false,
    is_active boolean DEFAULT true,
    fk_owner_id integer
);

-- Table: pilot_mission_type
DROP TABLE IF EXISTS public.pilot_mission_type CASCADE;
CREATE TABLE public.pilot_mission_type (
    mission_type_id integer NOT NULL,
    type_code character varying(50) NOT NULL,
    type_name character varying(100) NOT NULL,
    type_description text,
    required_certifications jsonb,
    is_active boolean DEFAULT true,
    fk_owner_id integer NOT NULL
);

-- Table: pilot_status
DROP TABLE IF EXISTS public.pilot_status CASCADE;
CREATE TABLE public.pilot_status (
    status_id integer NOT NULL,
    status_code character varying(50) NOT NULL,
    status_name character varying(100) NOT NULL,
    status_description text,
    status_color character varying(20),
    is_active boolean DEFAULT true
);

-- Table: pilot_vehicle_status
DROP TABLE IF EXISTS public.pilot_vehicle_status CASCADE;
CREATE TABLE public.pilot_vehicle_status (
    vehicle_status_id integer NOT NULL,
    status_code character varying(50) NOT NULL,
    status_name character varying(100) NOT NULL,
    status_description text,
    is_operational boolean DEFAULT true,
    is_active boolean DEFAULT true
);

-- Table: planning
DROP TABLE IF EXISTS public.planning CASCADE;
CREATE TABLE public.planning (
    planning_id integer NOT NULL,
    fk_owner_id integer NOT NULL,
    fk_client_id integer,
    fk_evaluation_id integer,
    planning_code character varying(50),
    planning_name character varying(255) NOT NULL,
    planning_description text,
    planning_type character varying(50),
    planning_status character varying(50),
    planned_date date,
    created_by_user_id integer,
    planning_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: planning_logbook
DROP TABLE IF EXISTS public.planning_logbook CASCADE;
CREATE TABLE public.planning_logbook (
    mission_planning_id integer NOT NULL,
    fk_planning_id integer NOT NULL,
    fk_evaluation_id integer,
    fk_client_id integer,
    fk_owner_id integer,
    fk_user_id integer,
    fk_tool_id integer,
    mission_planning_code character varying(50),
    mission_planning_desc text,
    mission_planning_active character(1) DEFAULT 'Y'::bpchar,
    mission_planning_ver integer DEFAULT 1,
    mission_planning_folder text,
    mission_planning_filename character varying(255),
    mission_planning_filesize bigint,
    mission_planning_limit_json jsonb,
    waypoints jsonb,
    flight_parameters jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    mission_planning_s3_key text,
    mission_planning_s3_url text
);

-- Table: planning_test_logbook
DROP TABLE IF EXISTS public.planning_test_logbook CASCADE;
CREATE TABLE public.planning_test_logbook (
    test_id integer NOT NULL,
    fk_planning_id integer NOT NULL,
    test_code character varying(50),
    test_description text,
    test_date date,
    test_status character varying(50),
    test_results jsonb,
    tested_by_user_id integer,
    test_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fk_owner_id integer,
    fk_mission_planning_id integer,
    fk_evaluation_id integer,
    fk_pic_id integer,
    fk_observer_id integer,
    fk_user_id integer,
    mission_test_date_start date,
    mission_test_date_end date,
    mission_test_result character varying(50),
    mission_test_folder text,
    mission_test_filename character varying(255),
    mission_test_filesize numeric(10,2),
    mission_test_s3_key text,
    mission_test_s3_url text
);

-- Table: repository_file
DROP TABLE IF EXISTS public.repository_file CASCADE;
CREATE TABLE public.repository_file (
    file_id integer NOT NULL,
    fk_owner_id integer,
    fk_file_type_id integer,
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    file_hash character varying(64),
    mime_type character varying(100),
    file_description text,
    file_category character varying(100),
    tags jsonb,
    uploaded_by_user_id integer,
    is_public boolean DEFAULT false,
    download_count integer DEFAULT 0,
    file_metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: repository_file_type
DROP TABLE IF EXISTS public.repository_file_type CASCADE;
CREATE TABLE public.repository_file_type (
    file_type_id integer NOT NULL,
    file_type_code character varying(50),
    file_type_name character varying(100) NOT NULL,
    file_type_description text,
    allowed_extensions jsonb,
    max_file_size bigint,
    is_active boolean DEFAULT true
);

-- Table: safety_action
DROP TABLE IF EXISTS public.safety_action CASCADE;
CREATE TABLE public.safety_action (
    action_id integer NOT NULL,
    fk_report_id integer NOT NULL,
    action_type character varying(50),
    action_description text,
    action_priority character varying(20),
    action_status character varying(50),
    assigned_to_user_id integer,
    due_date date,
    completed_date date,
    completion_notes text,
    verification_required boolean DEFAULT false,
    verified_by_user_id integer,
    verified_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: safety_report
DROP TABLE IF EXISTS public.safety_report CASCADE;
CREATE TABLE public.safety_report (
    report_id integer NOT NULL,
    fk_owner_id integer,
    fk_pilot_mission_id integer,
    report_code character varying(50),
    report_type character varying(50),
    incident_date date,
    incident_time time without time zone,
    location text,
    severity character varying(20),
    description text,
    immediate_actions text,
    reported_by_user_id integer,
    investigated_by_user_id integer,
    investigation_findings text,
    root_cause text,
    report_status character varying(50),
    attachments jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: spi_kpi
DROP TABLE IF EXISTS public.spi_kpi CASCADE;
CREATE TABLE public.spi_kpi (
    kpi_id integer NOT NULL,
    fk_definition_id integer NOT NULL,
    fk_owner_id integer,
    measurement_date date NOT NULL,
    actual_value numeric(15,4),
    target_value numeric(15,4),
    threshold_min numeric(15,4),
    threshold_max numeric(15,4),
    status character varying(50),
    variance numeric(15,4),
    trend character varying(20),
    notes text,
    recorded_by_user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: spi_kpi_definition
DROP TABLE IF EXISTS public.spi_kpi_definition CASCADE;
CREATE TABLE public.spi_kpi_definition (
    definition_id integer NOT NULL,
    fk_owner_id integer,
    kpi_code character varying(50),
    kpi_name character varying(255) NOT NULL,
    kpi_description text,
    kpi_category character varying(100),
    kpi_type character varying(50),
    measurement_unit character varying(50),
    calculation_formula text,
    data_source character varying(255),
    frequency character varying(50),
    target_direction character varying(20),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    target_value numeric(15,4) DEFAULT 0
);

-- Table: spi_kpi_log
DROP TABLE IF EXISTS public.spi_kpi_log CASCADE;
CREATE TABLE public.spi_kpi_log (
    log_id integer NOT NULL,
    fk_kpi_id integer NOT NULL,
    log_type character varying(50),
    log_description text,
    previous_value numeric(15,4),
    new_value numeric(15,4),
    changed_by_user_id integer,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: spi_kpi_target_proposal
DROP TABLE IF EXISTS public.spi_kpi_target_proposal CASCADE;
CREATE TABLE public.spi_kpi_target_proposal (
    proposal_id integer NOT NULL,
    fk_definition_id integer NOT NULL,
    proposal_year integer,
    proposal_period character varying(50),
    proposed_target numeric(15,4),
    proposed_by_user_id integer,
    justification text,
    proposal_status character varying(50),
    approved_by_user_id integer,
    approved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: team
DROP TABLE IF EXISTS public.team CASCADE;
CREATE TABLE public.team (
    team_id integer NOT NULL,
    fk_owner_id integer NOT NULL,
    team_code character varying(50),
    team_name character varying(255) NOT NULL,
    team_description text,
    team_leader_id integer,
    team_type character varying(50),
    team_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: team_members
DROP TABLE IF EXISTS public.team_members CASCADE;
CREATE TABLE public.team_members (
    team_member_id integer NOT NULL,
    fk_team_id integer NOT NULL,
    fk_user_id integer NOT NULL,
    role_in_team character varying(100),
    joined_date date DEFAULT CURRENT_DATE,
    left_date date,
    is_active boolean DEFAULT true
);

-- Table: ticket_attachment
DROP TABLE IF EXISTS public.ticket_attachment CASCADE;
CREATE TABLE public.ticket_attachment (
    attachment_id integer NOT NULL,
    fk_ticket_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_key text NOT NULL,
    file_type character varying(100),
    file_size bigint,
    file_description text,
    s3_region character varying(100) NOT NULL,
    s3_url text NOT NULL,
    uploaded_by character varying(100),
    uploaded_by_user_id integer,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: tool
DROP TABLE IF EXISTS public.tool CASCADE;
CREATE TABLE public.tool (
    tool_id integer NOT NULL,
    fk_owner_id integer NOT NULL,
    fk_tool_type_id integer NOT NULL,
    fk_model_id integer,
    fk_status_id integer,
    tool_code character varying(50),
    tool_serial_number character varying(100),
    tool_name character varying(255),
    tool_description text,
    purchase_date date,
    purchase_price numeric(15,2),
    warranty_expiry date,
    last_calibration_date date,
    next_calibration_date date,
    location character varying(255),
    fk_client_id integer,
    tool_active character(1) DEFAULT 'Y'::bpchar,
    tool_metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_client_id integer
);

-- Table: tool_component
DROP TABLE IF EXISTS public.tool_component CASCADE;
CREATE TABLE public.tool_component (
    component_id integer NOT NULL,
    fk_tool_id integer NOT NULL,
    component_code character varying(50),
    component_name character varying(255) NOT NULL,
    component_type character varying(100),
    component_description text,
    serial_number character varying(100),
    installation_date date,
    expected_lifespan_hours integer,
    current_usage_hours integer,
    last_replacement_date date,
    next_replacement_date date,
    component_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    component_metadata jsonb
);

-- Table: tool_erp
DROP TABLE IF EXISTS public.tool_erp CASCADE;
CREATE TABLE public.tool_erp (
    erp_id integer NOT NULL,
    fk_tool_id integer NOT NULL,
    erp_system character varying(100),
    erp_reference_id character varying(100),
    erp_data jsonb,
    sync_status character varying(50),
    last_sync_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: tool_maintenance
DROP TABLE IF EXISTS public.tool_maintenance CASCADE;
CREATE TABLE public.tool_maintenance (
    maintenance_id integer NOT NULL,
    fk_tool_id integer NOT NULL,
    maintenance_type character varying(100) NOT NULL,
    maintenance_description text,
    scheduled_date date,
    completed_date date,
    performed_by_user_id integer,
    maintenance_status character varying(50),
    maintenance_cost numeric(15,2),
    maintenance_notes text,
    next_maintenance_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: tool_model
DROP TABLE IF EXISTS public.tool_model CASCADE;
CREATE TABLE public.tool_model (
    model_id integer NOT NULL,
    fk_tool_type_id integer NOT NULL,
    model_code character varying(50),
    model_name character varying(255) NOT NULL,
    manufacturer character varying(255),
    model_description text,
    specifications jsonb,
    model_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: tool_status
DROP TABLE IF EXISTS public.tool_status CASCADE;
CREATE TABLE public.tool_status (
    status_id integer NOT NULL,
    status_code character varying(50) NOT NULL,
    status_name character varying(100) NOT NULL,
    status_description text,
    status_color character varying(20),
    status_icon character varying(50),
    status_order integer,
    is_active boolean DEFAULT true
);

-- Table: tool_type
DROP TABLE IF EXISTS public.tool_type CASCADE;
CREATE TABLE public.tool_type (
    tool_type_id integer NOT NULL,
    tool_type_code character varying(50),
    tool_type_name character varying(255) NOT NULL,
    tool_type_description text,
    tool_type_category character varying(100),
    tool_type_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: training
DROP TABLE IF EXISTS public.training CASCADE;
CREATE TABLE public.training (
    training_id integer NOT NULL,
    fk_owner_id integer,
    training_code character varying(50),
    training_name character varying(255) NOT NULL,
    training_description text,
    training_type character varying(50),
    certificate_type character varying(50),
    training_duration integer,
    training_cost numeric(15,2),
    trainer_user_id integer,
    training_materials jsonb,
    certifications_awarded jsonb,
    training_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: training_attendance
DROP TABLE IF EXISTS public.training_attendance CASCADE;
CREATE TABLE public.training_attendance (
    attendance_id integer NOT NULL,
    fk_training_id integer NOT NULL,
    fk_user_id integer NOT NULL,
    training_session_date date,
    attendance_status character varying(50),
    completion_status character varying(50),
    score numeric(5,2),
    feedback text,
    certification_issued boolean DEFAULT false,
    certification_number character varying(100),
    certification_date date,
    certification_expiry date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: turn_users
DROP TABLE IF EXISTS public.turn_users CASCADE;
CREATE TABLE public.turn_users (
    turn_user_id integer NOT NULL,
    fk_turn_id integer NOT NULL,
    fk_user_id integer NOT NULL,
    assignment_date date,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: turns
DROP TABLE IF EXISTS public.turns CASCADE;
CREATE TABLE public.turns (
    turn_id integer NOT NULL,
    fk_owner_id integer,
    turn_code character varying(50),
    turn_name character varying(255) NOT NULL,
    turn_description text,
    turn_start_time time without time zone,
    turn_end_time time without time zone,
    turn_type character varying(50),
    turn_active character(1) DEFAULT 'Y'::bpchar,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_device
DROP TABLE IF EXISTS public.user_device CASCADE;
CREATE TABLE public.user_device (
    device_id integer NOT NULL,
    fk_user_id integer NOT NULL,
    device_name character varying(255),
    device_type character varying(50),
    device_token text,
    device_os character varying(50),
    device_model character varying(100),
    last_active timestamp without time zone,
    registered_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);

-- Table: user_owner
DROP TABLE IF EXISTS public.user_owner CASCADE;
CREATE TABLE public.user_owner (
    user_owner_id integer NOT NULL,
    fk_user_id integer NOT NULL,
    fk_owner_id integer NOT NULL,
    relationship_type character varying(50),
    role_in_organization character varying(100),
    is_primary boolean DEFAULT false,
    start_date date,
    end_date date,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_permessi
DROP TABLE IF EXISTS public.user_permessi CASCADE;
CREATE TABLE public.user_permessi (
    permission_id integer NOT NULL,
    fk_user_id integer NOT NULL,
    permission_code character varying(100) NOT NULL,
    permission_desc text,
    permission_active character(1) DEFAULT 'Y'::bpchar,
    granted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    granted_by integer,
    expires_at timestamp without time zone
);

-- Table: user_session
DROP TABLE IF EXISTS public.user_session CASCADE;
CREATE TABLE public.user_session (
    session_id integer NOT NULL,
    fk_user_id integer NOT NULL,
    session_token character varying(255) NOT NULL,
    device_info jsonb,
    ip_address inet,
    user_agent text,
    login_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    logout_at timestamp without time zone,
    expires_at timestamp without time zone NOT NULL,
    is_active boolean DEFAULT true
);

-- Table: user_settings
DROP TABLE IF EXISTS public.user_settings CASCADE;
CREATE TABLE public.user_settings (
    setting_id integer NOT NULL,
    fk_user_id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    setting_type character varying(50) DEFAULT 'string'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: users
DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE public.users (
    user_id integer NOT NULL,
    username character varying(100),
    email character varying(255),
    password_hash character varying(255),
    first_name character varying(100),
    last_name character varying(100),
    phone character varying(50),
    user_active character(1) DEFAULT 'Y'::bpchar,
    user_role character varying(50),
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    auth_user_id uuid,
    fk_owner_id integer,
    notes text,
    fk_client_id integer,
    fk_user_profile_id integer,
    user_type character varying(100),
    _key_ text,
    user_unique_code character varying(255),
    fk_territorial_unit integer,
    is_root character(1) DEFAULT 'N'::bpchar,
    is_viewer character(1) DEFAULT 'N'::bpchar,
    is_default_user character(1) DEFAULT 'N'::bpchar,
    is_manager character(1) DEFAULT 'N'::bpchar,
    user_timezone character varying(64) DEFAULT 'IST'::character varying
);

-- Table: users_profile
DROP TABLE IF EXISTS public.users_profile CASCADE;
CREATE TABLE public.users_profile (
    profile_id integer NOT NULL,
    fk_user_id integer NOT NULL,
    profile_picture text,
    bio text,
    address text,
    city character varying(100),
    state character varying(100),
    postal_code character varying(20),
    fk_country_id integer,
    date_of_birth date,
    emergency_contact character varying(255),
    emergency_phone character varying(50),
    certifications jsonb,
    skills jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_signature text,
    user_primary_certification character varying(300)
);

-- Table: v_training_session_stats
DROP TABLE IF EXISTS public.v_training_session_stats CASCADE;
CREATE TABLE public.v_training_session_stats (
    stat_id integer NOT NULL,
    placeholder_column character varying(1)
);

ALTER TABLE ONLY public.alert_log ALTER COLUMN alert_id SET DEFAULT nextval('public.alert_log_alert_id_seq'::regclass);
ALTER TABLE ONLY public.api_keys ALTER COLUMN api_key_id SET DEFAULT nextval('public.api_keys_api_key_id_seq'::regclass);
ALTER TABLE ONLY public.assignment ALTER COLUMN assignment_id SET DEFAULT nextval('public.assignment_assignment_id_seq'::regclass);
ALTER TABLE ONLY public.audit ALTER COLUMN audit_id SET DEFAULT nextval('public.audit_audit_id_seq'::regclass);
ALTER TABLE ONLY public.audit_finding ALTER COLUMN finding_id SET DEFAULT nextval('public.audit_finding_finding_id_seq'::regclass);
ALTER TABLE ONLY public.backup_log ALTER COLUMN backup_id SET DEFAULT nextval('public.backup_log_backup_id_seq'::regclass);
ALTER TABLE ONLY public.calendar_shift ALTER COLUMN shift_id SET DEFAULT nextval('public.calendar_shift_shift_id_seq'::regclass);
ALTER TABLE ONLY public.checklist ALTER COLUMN checklist_id SET DEFAULT nextval('public.checklist_checklist_id_seq'::regclass);
ALTER TABLE ONLY public.client ALTER COLUMN client_id SET DEFAULT nextval('public.client_client_id_seq'::regclass);
ALTER TABLE ONLY public.code_index ALTER COLUMN id SET DEFAULT nextval('public.code_index_id_seq'::regclass);
ALTER TABLE ONLY public.communication ALTER COLUMN communication_id SET DEFAULT nextval('public.communication_communication_id_seq'::regclass);
ALTER TABLE ONLY public.communication_general ALTER COLUMN communication_id SET DEFAULT nextval('public.communication_general_communication_id_seq'::regclass);
ALTER TABLE ONLY public.compliance_evidence ALTER COLUMN evidence_id SET DEFAULT nextval('public.compliance_evidence_evidence_id_seq'::regclass);
ALTER TABLE ONLY public.compliance_requirement ALTER COLUMN requirement_id SET DEFAULT nextval('public.compliance_requirement_requirement_id_seq'::regclass);
ALTER TABLE ONLY public.compliance_status_log ALTER COLUMN log_id SET DEFAULT nextval('public.compliance_status_log_log_id_seq'::regclass);
ALTER TABLE ONLY public.controlroom_drone ALTER COLUMN controlroom_drone_id SET DEFAULT nextval('public.controlroom_drone_controlroom_drone_id_seq'::regclass);
ALTER TABLE ONLY public.controlroom_meta ALTER COLUMN meta_id SET DEFAULT nextval('public.controlroom_meta_meta_id_seq'::regclass);
ALTER TABLE ONLY public.countries ALTER COLUMN country_id SET DEFAULT nextval('public.countries_country_id_seq'::regclass);
ALTER TABLE ONLY public.deleted_owner ALTER COLUMN deleted_id SET DEFAULT nextval('public.deleted_owner_deleted_id_seq'::regclass);
ALTER TABLE ONLY public.deleted_user ALTER COLUMN deleted_id SET DEFAULT nextval('public.deleted_user_deleted_id_seq'::regclass);
ALTER TABLE ONLY public.evaluation ALTER COLUMN evaluation_id SET DEFAULT nextval('public.evaluation_evaluation_id_seq'::regclass);
ALTER TABLE ONLY public.evaluation_action ALTER COLUMN action_id SET DEFAULT nextval('public.evaluation_action_action_id_seq'::regclass);
ALTER TABLE ONLY public.evaluation_file ALTER COLUMN file_id SET DEFAULT nextval('public.evaluation_file_file_id_seq'::regclass);
ALTER TABLE ONLY public.flytbase_mission ALTER COLUMN flytbase_mission_id SET DEFAULT nextval('public.flytbase_mission_flytbase_mission_id_seq'::regclass);
ALTER TABLE ONLY public.flytbase_mission_log ALTER COLUMN log_id SET DEFAULT nextval('public.flytbase_mission_log_log_id_seq'::regclass);
ALTER TABLE ONLY public.flytbase_mission_status ALTER COLUMN status_id SET DEFAULT nextval('public.flytbase_mission_status_status_id_seq'::regclass);
ALTER TABLE ONLY public.kanban ALTER COLUMN kanban_id SET DEFAULT nextval('public.kanban_kanban_id_seq'::regclass);
ALTER TABLE ONLY public.luc_doc_type ALTER COLUMN doc_type_id SET DEFAULT nextval('public.luc_doc_type_doc_type_id_seq'::regclass);
ALTER TABLE ONLY public.luc_document ALTER COLUMN document_id SET DEFAULT nextval('public.luc_document_document_id_seq'::regclass);
ALTER TABLE ONLY public.luc_document_rev ALTER COLUMN revision_id SET DEFAULT nextval('public.luc_document_rev_revision_id_seq'::regclass);
ALTER TABLE ONLY public.luc_procedure ALTER COLUMN procedure_id SET DEFAULT nextval('public.luc_procedure_procedure_id_seq'::regclass);
ALTER TABLE ONLY public.maintenance_ticket ALTER COLUMN ticket_id SET DEFAULT nextval('public.maintenance_ticket_ticket_id_seq'::regclass);
ALTER TABLE ONLY public.maintenance_ticket_attachment ALTER COLUMN attachment_id SET DEFAULT nextval('public.maintenance_ticket_attachment_attachment_id_seq'::regclass);
ALTER TABLE ONLY public.maintenance_ticket_event ALTER COLUMN event_id SET DEFAULT nextval('public.maintenance_ticket_event_event_id_seq'::regclass);
ALTER TABLE ONLY public.maintenance_ticket_item ALTER COLUMN item_id SET DEFAULT nextval('public.maintenance_ticket_item_item_id_seq'::regclass);
ALTER TABLE ONLY public.maintenance_ticket_report ALTER COLUMN report_id SET DEFAULT nextval('public.maintenance_ticket_report_report_id_seq'::regclass);
ALTER TABLE ONLY public.messages ALTER COLUMN message_id SET DEFAULT nextval('public.messages_message_id_seq'::regclass);
ALTER TABLE ONLY public.mission_component ALTER COLUMN component_id SET DEFAULT nextval('public.mission_component_component_id_seq'::regclass);
ALTER TABLE ONLY public.notification ALTER COLUMN notification_id SET DEFAULT nextval('public.notification_notification_id_seq'::regclass);
ALTER TABLE ONLY public.owner ALTER COLUMN owner_id SET DEFAULT nextval('public.owner_owner_id_seq'::regclass);
ALTER TABLE ONLY public.owner_territorial_unit ALTER COLUMN unit_id SET DEFAULT nextval('public.owner_territorial_unit_unit_id_seq'::regclass);
ALTER TABLE ONLY public.payload ALTER COLUMN payload_id SET DEFAULT nextval('public.payload_payload_id_seq'::regclass);
ALTER TABLE ONLY public.pilot_declaration ALTER COLUMN declaration_id SET DEFAULT nextval('public.pilot_declaration_declaration_id_seq'::regclass);
ALTER TABLE ONLY public.pilot_mission ALTER COLUMN pilot_mission_id SET DEFAULT nextval('public.pilot_mission_pilot_mission_id_seq'::regclass);
ALTER TABLE ONLY public.pilot_mission_category ALTER COLUMN category_id SET DEFAULT nextval('public.pilot_mission_category_category_id_seq'::regclass);
ALTER TABLE ONLY public.pilot_mission_planned_template_logbook ALTER COLUMN template_id SET DEFAULT nextval('public.pilot_mission_planned_template_logbook_template_id_seq'::regclass);
ALTER TABLE ONLY public.pilot_mission_result ALTER COLUMN result_id SET DEFAULT nextval('public.pilot_mission_result_result_id_seq'::regclass);
ALTER TABLE ONLY public.pilot_mission_result_type ALTER COLUMN result_type_id SET DEFAULT nextval('public.pilot_mission_result_type_result_type_id_seq'::regclass);
ALTER TABLE ONLY public.pilot_mission_status ALTER COLUMN status_id SET DEFAULT nextval('public.pilot_mission_status_status_id_seq'::regclass);
ALTER TABLE ONLY public.pilot_mission_type ALTER COLUMN mission_type_id SET DEFAULT nextval('public.pilot_mission_type_mission_type_id_seq'::regclass);
ALTER TABLE ONLY public.pilot_status ALTER COLUMN status_id SET DEFAULT nextval('public.pilot_status_status_id_seq'::regclass);
ALTER TABLE ONLY public.pilot_vehicle_status ALTER COLUMN vehicle_status_id SET DEFAULT nextval('public.pilot_vehicle_status_vehicle_status_id_seq'::regclass);
ALTER TABLE ONLY public.planning ALTER COLUMN planning_id SET DEFAULT nextval('public.planning_planning_id_seq'::regclass);
ALTER TABLE ONLY public.planning_logbook ALTER COLUMN mission_planning_id SET DEFAULT nextval('public.planning_logbook_mission_planning_id_seq'::regclass);
ALTER TABLE ONLY public.planning_test_logbook ALTER COLUMN test_id SET DEFAULT nextval('public.planning_test_logbook_test_id_seq'::regclass);
ALTER TABLE ONLY public.repository_file ALTER COLUMN file_id SET DEFAULT nextval('public.repository_file_file_id_seq'::regclass);
ALTER TABLE ONLY public.repository_file_type ALTER COLUMN file_type_id SET DEFAULT nextval('public.repository_file_type_file_type_id_seq'::regclass);
ALTER TABLE ONLY public.safety_action ALTER COLUMN action_id SET DEFAULT nextval('public.safety_action_action_id_seq'::regclass);
ALTER TABLE ONLY public.safety_report ALTER COLUMN report_id SET DEFAULT nextval('public.safety_report_report_id_seq'::regclass);
ALTER TABLE ONLY public.spi_kpi ALTER COLUMN kpi_id SET DEFAULT nextval('public.spi_kpi_kpi_id_seq'::regclass);
ALTER TABLE ONLY public.spi_kpi_definition ALTER COLUMN definition_id SET DEFAULT nextval('public.spi_kpi_definition_definition_id_seq'::regclass);
ALTER TABLE ONLY public.spi_kpi_log ALTER COLUMN log_id SET DEFAULT nextval('public.spi_kpi_log_log_id_seq'::regclass);
ALTER TABLE ONLY public.spi_kpi_target_proposal ALTER COLUMN proposal_id SET DEFAULT nextval('public.spi_kpi_target_proposal_proposal_id_seq'::regclass);
ALTER TABLE ONLY public.team ALTER COLUMN team_id SET DEFAULT nextval('public.team_team_id_seq'::regclass);
ALTER TABLE ONLY public.team_members ALTER COLUMN team_member_id SET DEFAULT nextval('public.team_members_team_member_id_seq'::regclass);
ALTER TABLE ONLY public.ticket_attachment ALTER COLUMN attachment_id SET DEFAULT nextval('public.ticket_attachment_attachment_id_seq'::regclass);
ALTER TABLE ONLY public.tool ALTER COLUMN tool_id SET DEFAULT nextval('public.tool_tool_id_seq'::regclass);
ALTER TABLE ONLY public.tool_component ALTER COLUMN component_id SET DEFAULT nextval('public.tool_component_component_id_seq'::regclass);
ALTER TABLE ONLY public.tool_erp ALTER COLUMN erp_id SET DEFAULT nextval('public.tool_erp_erp_id_seq'::regclass);
ALTER TABLE ONLY public.tool_maintenance ALTER COLUMN maintenance_id SET DEFAULT nextval('public.tool_maintenance_maintenance_id_seq'::regclass);
ALTER TABLE ONLY public.tool_model ALTER COLUMN model_id SET DEFAULT nextval('public.tool_model_model_id_seq'::regclass);
ALTER TABLE ONLY public.tool_status ALTER COLUMN status_id SET DEFAULT nextval('public.tool_status_status_id_seq'::regclass);
ALTER TABLE ONLY public.tool_type ALTER COLUMN tool_type_id SET DEFAULT nextval('public.tool_type_tool_type_id_seq'::regclass);
ALTER TABLE ONLY public.training ALTER COLUMN training_id SET DEFAULT nextval('public.training_training_id_seq'::regclass);
ALTER TABLE ONLY public.training_attendance ALTER COLUMN attendance_id SET DEFAULT nextval('public.training_attendance_attendance_id_seq'::regclass);
ALTER TABLE ONLY public.turn_users ALTER COLUMN turn_user_id SET DEFAULT nextval('public.turn_users_turn_user_id_seq'::regclass);
ALTER TABLE ONLY public.turns ALTER COLUMN turn_id SET DEFAULT nextval('public.turns_turn_id_seq'::regclass);
ALTER TABLE ONLY public.user_device ALTER COLUMN device_id SET DEFAULT nextval('public.user_device_device_id_seq'::regclass);
ALTER TABLE ONLY public.user_owner ALTER COLUMN user_owner_id SET DEFAULT nextval('public.user_owner_user_owner_id_seq'::regclass);
ALTER TABLE ONLY public.user_permessi ALTER COLUMN permission_id SET DEFAULT nextval('public.user_permessi_permission_id_seq'::regclass);
ALTER TABLE ONLY public.user_session ALTER COLUMN session_id SET DEFAULT nextval('public.user_session_session_id_seq'::regclass);
ALTER TABLE ONLY public.user_settings ALTER COLUMN setting_id SET DEFAULT nextval('public.user_settings_setting_id_seq'::regclass);
ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);
ALTER TABLE ONLY public.users_profile ALTER COLUMN profile_id SET DEFAULT nextval('public.users_profile_profile_id_seq'::regclass);
ALTER TABLE ONLY public.v_training_session_stats ALTER COLUMN stat_id SET DEFAULT nextval('public.v_training_session_stats_stat_id_seq'::regclass);

ALTER TABLE ONLY public.alert_log
    ADD CONSTRAINT alert_log_pkey PRIMARY KEY (alert_id);
ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (api_key_id);
ALTER TABLE ONLY public.assignment
    ADD CONSTRAINT assignment_pkey PRIMARY KEY (assignment_id);
ALTER TABLE ONLY public.audit_finding
    ADD CONSTRAINT audit_finding_pkey PRIMARY KEY (finding_id);
ALTER TABLE ONLY public.audit
    ADD CONSTRAINT audit_pkey PRIMARY KEY (audit_id);
ALTER TABLE ONLY public.backup_log
    ADD CONSTRAINT backup_log_pkey PRIMARY KEY (backup_id);
ALTER TABLE ONLY public.calendar_shift
    ADD CONSTRAINT calendar_shift_pkey PRIMARY KEY (shift_id);
ALTER TABLE ONLY public.checklist
    ADD CONSTRAINT checklist_pkey PRIMARY KEY (checklist_id);
ALTER TABLE ONLY public.client
    ADD CONSTRAINT client_pkey PRIMARY KEY (client_id);
ALTER TABLE ONLY public.code_index
    ADD CONSTRAINT code_index_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.communication_general
    ADD CONSTRAINT communication_general_pkey PRIMARY KEY (communication_id);
ALTER TABLE ONLY public.communication
    ADD CONSTRAINT communication_pkey PRIMARY KEY (communication_id);
ALTER TABLE ONLY public.compliance_evidence
    ADD CONSTRAINT compliance_evidence_pkey PRIMARY KEY (evidence_id);
ALTER TABLE ONLY public.compliance_requirement
    ADD CONSTRAINT compliance_requirement_pkey PRIMARY KEY (requirement_id);
ALTER TABLE ONLY public.compliance_status_log
    ADD CONSTRAINT compliance_status_log_pkey PRIMARY KEY (log_id);
ALTER TABLE ONLY public.controlroom_drone
    ADD CONSTRAINT controlroom_drone_pkey PRIMARY KEY (controlroom_drone_id);
ALTER TABLE ONLY public.controlroom_meta
    ADD CONSTRAINT controlroom_meta_pkey PRIMARY KEY (meta_id);
ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (country_id);
ALTER TABLE ONLY public.deleted_owner
    ADD CONSTRAINT deleted_owner_pkey PRIMARY KEY (deleted_id);
ALTER TABLE ONLY public.deleted_user
    ADD CONSTRAINT deleted_user_pkey PRIMARY KEY (deleted_id);
ALTER TABLE ONLY public.evaluation_action
    ADD CONSTRAINT evaluation_action_pkey PRIMARY KEY (action_id);
ALTER TABLE ONLY public.evaluation_file
    ADD CONSTRAINT evaluation_file_pkey PRIMARY KEY (file_id);
ALTER TABLE ONLY public.evaluation
    ADD CONSTRAINT evaluation_pkey PRIMARY KEY (evaluation_id);
ALTER TABLE ONLY public.flytbase_mission_log
    ADD CONSTRAINT flytbase_mission_log_pkey PRIMARY KEY (log_id);
ALTER TABLE ONLY public.flytbase_mission
    ADD CONSTRAINT flytbase_mission_pkey PRIMARY KEY (flytbase_mission_id);
ALTER TABLE ONLY public.flytbase_mission_status
    ADD CONSTRAINT flytbase_mission_status_pkey PRIMARY KEY (status_id);
ALTER TABLE ONLY public.kanban
    ADD CONSTRAINT kanban_pkey PRIMARY KEY (kanban_id);
ALTER TABLE ONLY public.luc_doc_type
    ADD CONSTRAINT luc_doc_type_pkey PRIMARY KEY (doc_type_id);
ALTER TABLE ONLY public.luc_document
    ADD CONSTRAINT luc_document_pkey PRIMARY KEY (document_id);
ALTER TABLE ONLY public.luc_document_rev
    ADD CONSTRAINT luc_document_rev_pkey PRIMARY KEY (revision_id);
ALTER TABLE ONLY public.luc_procedure
    ADD CONSTRAINT luc_procedure_pkey PRIMARY KEY (procedure_id);
ALTER TABLE ONLY public.maintenance_ticket_attachment
    ADD CONSTRAINT maintenance_ticket_attachment_pkey PRIMARY KEY (attachment_id);
ALTER TABLE ONLY public.maintenance_ticket_event
    ADD CONSTRAINT maintenance_ticket_event_pkey PRIMARY KEY (event_id);
ALTER TABLE ONLY public.maintenance_ticket_item
    ADD CONSTRAINT maintenance_ticket_item_pkey PRIMARY KEY (item_id);
ALTER TABLE ONLY public.maintenance_ticket
    ADD CONSTRAINT maintenance_ticket_pkey PRIMARY KEY (ticket_id);
ALTER TABLE ONLY public.maintenance_ticket_report
    ADD CONSTRAINT maintenance_ticket_report_pkey PRIMARY KEY (report_id);
ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (message_id);
ALTER TABLE ONLY public.mission_component
    ADD CONSTRAINT mission_component_pkey PRIMARY KEY (component_id);
ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (notification_id);
ALTER TABLE ONLY public.owner
    ADD CONSTRAINT owner_pkey PRIMARY KEY (owner_id);
ALTER TABLE ONLY public.owner_territorial_unit
    ADD CONSTRAINT owner_territorial_unit_pkey PRIMARY KEY (unit_id);
ALTER TABLE ONLY public.payload
    ADD CONSTRAINT payload_pkey PRIMARY KEY (payload_id);
ALTER TABLE ONLY public.pilot_declaration
    ADD CONSTRAINT pilot_declaration_pkey PRIMARY KEY (declaration_id);
ALTER TABLE ONLY public.pilot_mission_category
    ADD CONSTRAINT pilot_mission_category_pkey PRIMARY KEY (category_id);
ALTER TABLE ONLY public.pilot_mission
    ADD CONSTRAINT pilot_mission_pkey PRIMARY KEY (pilot_mission_id);
ALTER TABLE ONLY public.pilot_mission_planned_template_logbook
    ADD CONSTRAINT pilot_mission_planned_template_logbook_pkey PRIMARY KEY (template_id);
ALTER TABLE ONLY public.pilot_mission_result
    ADD CONSTRAINT pilot_mission_result_pkey PRIMARY KEY (result_id);
ALTER TABLE ONLY public.pilot_mission_result_type
    ADD CONSTRAINT pilot_mission_result_type_pkey PRIMARY KEY (result_type_id);
ALTER TABLE ONLY public.pilot_mission_status
    ADD CONSTRAINT pilot_mission_status_pkey PRIMARY KEY (status_id);
ALTER TABLE ONLY public.pilot_mission_type
    ADD CONSTRAINT pilot_mission_type_pkey PRIMARY KEY (mission_type_id);
ALTER TABLE ONLY public.pilot_status
    ADD CONSTRAINT pilot_status_pkey PRIMARY KEY (status_id);
ALTER TABLE ONLY public.pilot_vehicle_status
    ADD CONSTRAINT pilot_vehicle_status_pkey PRIMARY KEY (vehicle_status_id);
ALTER TABLE ONLY public.planning_logbook
    ADD CONSTRAINT planning_logbook_pkey PRIMARY KEY (mission_planning_id);
ALTER TABLE ONLY public.planning
    ADD CONSTRAINT planning_pkey PRIMARY KEY (planning_id);
ALTER TABLE ONLY public.planning_test_logbook
    ADD CONSTRAINT planning_test_logbook_pkey PRIMARY KEY (test_id);
ALTER TABLE ONLY public.repository_file
    ADD CONSTRAINT repository_file_pkey PRIMARY KEY (file_id);
ALTER TABLE ONLY public.repository_file_type
    ADD CONSTRAINT repository_file_type_pkey PRIMARY KEY (file_type_id);
ALTER TABLE ONLY public.safety_action
    ADD CONSTRAINT safety_action_pkey PRIMARY KEY (action_id);
ALTER TABLE ONLY public.safety_report
    ADD CONSTRAINT safety_report_pkey PRIMARY KEY (report_id);
ALTER TABLE ONLY public.spi_kpi_definition
    ADD CONSTRAINT spi_kpi_definition_pkey PRIMARY KEY (definition_id);
ALTER TABLE ONLY public.spi_kpi_log
    ADD CONSTRAINT spi_kpi_log_pkey PRIMARY KEY (log_id);
ALTER TABLE ONLY public.spi_kpi
    ADD CONSTRAINT spi_kpi_pkey PRIMARY KEY (kpi_id);
ALTER TABLE ONLY public.spi_kpi_target_proposal
    ADD CONSTRAINT spi_kpi_target_proposal_pkey PRIMARY KEY (proposal_id);
ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (team_member_id);
ALTER TABLE ONLY public.team
    ADD CONSTRAINT team_pkey PRIMARY KEY (team_id);
ALTER TABLE ONLY public.ticket_attachment
    ADD CONSTRAINT ticket_attachment_pkey PRIMARY KEY (attachment_id);
ALTER TABLE ONLY public.tool_component
    ADD CONSTRAINT tool_component_pkey PRIMARY KEY (component_id);
ALTER TABLE ONLY public.tool_erp
    ADD CONSTRAINT tool_erp_pkey PRIMARY KEY (erp_id);
ALTER TABLE ONLY public.tool_maintenance
    ADD CONSTRAINT tool_maintenance_pkey PRIMARY KEY (maintenance_id);
ALTER TABLE ONLY public.tool_model
    ADD CONSTRAINT tool_model_pkey PRIMARY KEY (model_id);
ALTER TABLE ONLY public.tool
    ADD CONSTRAINT tool_pkey PRIMARY KEY (tool_id);
ALTER TABLE ONLY public.tool_status
    ADD CONSTRAINT tool_status_pkey PRIMARY KEY (status_id);
ALTER TABLE ONLY public.tool_type
    ADD CONSTRAINT tool_type_pkey PRIMARY KEY (tool_type_id);
ALTER TABLE ONLY public.training_attendance
    ADD CONSTRAINT training_attendance_pkey PRIMARY KEY (attendance_id);
ALTER TABLE ONLY public.training
    ADD CONSTRAINT training_pkey PRIMARY KEY (training_id);
ALTER TABLE ONLY public.turn_users
    ADD CONSTRAINT turn_users_pkey PRIMARY KEY (turn_user_id);
ALTER TABLE ONLY public.turns
    ADD CONSTRAINT turns_pkey PRIMARY KEY (turn_id);
ALTER TABLE ONLY public.user_device
    ADD CONSTRAINT user_device_pkey PRIMARY KEY (device_id);
ALTER TABLE ONLY public.user_owner
    ADD CONSTRAINT user_owner_pkey PRIMARY KEY (user_owner_id);
ALTER TABLE ONLY public.user_permessi
    ADD CONSTRAINT user_permessi_pkey PRIMARY KEY (permission_id);
ALTER TABLE ONLY public.user_session
    ADD CONSTRAINT user_session_pkey PRIMARY KEY (session_id);
ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (setting_id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);
ALTER TABLE ONLY public.users_profile
    ADD CONSTRAINT users_profile_pkey PRIMARY KEY (profile_id);
ALTER TABLE ONLY public.v_training_session_stats
    ADD CONSTRAINT v_training_session_stats_pkey PRIMARY KEY (stat_id);

ALTER SEQUENCE public.alert_log_alert_id_seq OWNED BY public.alert_log.alert_id;
ALTER SEQUENCE public.api_keys_api_key_id_seq OWNED BY public.api_keys.api_key_id;
ALTER SEQUENCE public.assignment_assignment_id_seq OWNED BY public.assignment.assignment_id;
ALTER SEQUENCE public.audit_audit_id_seq OWNED BY public.audit.audit_id;
ALTER SEQUENCE public.audit_finding_finding_id_seq OWNED BY public.audit_finding.finding_id;
ALTER SEQUENCE public.backup_log_backup_id_seq OWNED BY public.backup_log.backup_id;
ALTER SEQUENCE public.calendar_shift_shift_id_seq OWNED BY public.calendar_shift.shift_id;
ALTER SEQUENCE public.checklist_checklist_id_seq OWNED BY public.checklist.checklist_id;
ALTER SEQUENCE public.client_client_id_seq OWNED BY public.client.client_id;
ALTER SEQUENCE public.code_index_id_seq OWNED BY public.code_index.id;
ALTER SEQUENCE public.communication_communication_id_seq OWNED BY public.communication.communication_id;
ALTER SEQUENCE public.communication_general_communication_id_seq OWNED BY public.communication_general.communication_id;
ALTER SEQUENCE public.compliance_evidence_evidence_id_seq OWNED BY public.compliance_evidence.evidence_id;
ALTER SEQUENCE public.compliance_requirement_requirement_id_seq OWNED BY public.compliance_requirement.requirement_id;
ALTER SEQUENCE public.compliance_status_log_log_id_seq OWNED BY public.compliance_status_log.log_id;
ALTER SEQUENCE public.controlroom_drone_controlroom_drone_id_seq OWNED BY public.controlroom_drone.controlroom_drone_id;
ALTER SEQUENCE public.controlroom_meta_meta_id_seq OWNED BY public.controlroom_meta.meta_id;
ALTER SEQUENCE public.countries_country_id_seq OWNED BY public.countries.country_id;
ALTER SEQUENCE public.deleted_owner_deleted_id_seq OWNED BY public.deleted_owner.deleted_id;
ALTER SEQUENCE public.deleted_user_deleted_id_seq OWNED BY public.deleted_user.deleted_id;
ALTER SEQUENCE public.evaluation_action_action_id_seq OWNED BY public.evaluation_action.action_id;
ALTER SEQUENCE public.evaluation_evaluation_id_seq OWNED BY public.evaluation.evaluation_id;
ALTER SEQUENCE public.evaluation_file_file_id_seq OWNED BY public.evaluation_file.file_id;
ALTER SEQUENCE public.flytbase_mission_flytbase_mission_id_seq OWNED BY public.flytbase_mission.flytbase_mission_id;
ALTER SEQUENCE public.flytbase_mission_log_log_id_seq OWNED BY public.flytbase_mission_log.log_id;
ALTER SEQUENCE public.flytbase_mission_status_status_id_seq OWNED BY public.flytbase_mission_status.status_id;
ALTER SEQUENCE public.kanban_kanban_id_seq OWNED BY public.kanban.kanban_id;
ALTER SEQUENCE public.luc_doc_type_doc_type_id_seq OWNED BY public.luc_doc_type.doc_type_id;
ALTER SEQUENCE public.luc_document_document_id_seq OWNED BY public.luc_document.document_id;
ALTER SEQUENCE public.luc_document_rev_revision_id_seq OWNED BY public.luc_document_rev.revision_id;
ALTER SEQUENCE public.luc_procedure_procedure_id_seq OWNED BY public.luc_procedure.procedure_id;
ALTER SEQUENCE public.maintenance_ticket_attachment_attachment_id_seq OWNED BY public.maintenance_ticket_attachment.attachment_id;
ALTER SEQUENCE public.maintenance_ticket_event_event_id_seq OWNED BY public.maintenance_ticket_event.event_id;
ALTER SEQUENCE public.maintenance_ticket_item_item_id_seq OWNED BY public.maintenance_ticket_item.item_id;
ALTER SEQUENCE public.maintenance_ticket_report_report_id_seq OWNED BY public.maintenance_ticket_report.report_id;
ALTER SEQUENCE public.maintenance_ticket_ticket_id_seq OWNED BY public.maintenance_ticket.ticket_id;
ALTER SEQUENCE public.messages_message_id_seq OWNED BY public.messages.message_id;
ALTER SEQUENCE public.mission_component_component_id_seq OWNED BY public.mission_component.component_id;
ALTER SEQUENCE public.notification_notification_id_seq OWNED BY public.notification.notification_id;
ALTER SEQUENCE public.owner_owner_id_seq OWNED BY public.owner.owner_id;
ALTER SEQUENCE public.owner_territorial_unit_unit_id_seq OWNED BY public.owner_territorial_unit.unit_id;
ALTER SEQUENCE public.payload_payload_id_seq OWNED BY public.payload.payload_id;
ALTER SEQUENCE public.pilot_declaration_declaration_id_seq OWNED BY public.pilot_declaration.declaration_id;
ALTER SEQUENCE public.pilot_mission_category_category_id_seq OWNED BY public.pilot_mission_category.category_id;
ALTER SEQUENCE public.pilot_mission_pilot_mission_id_seq OWNED BY public.pilot_mission.pilot_mission_id;
ALTER SEQUENCE public.pilot_mission_planned_template_logbook_template_id_seq OWNED BY public.pilot_mission_planned_template_logbook.template_id;
ALTER SEQUENCE public.pilot_mission_result_result_id_seq OWNED BY public.pilot_mission_result.result_id;
ALTER SEQUENCE public.pilot_mission_result_type_result_type_id_seq OWNED BY public.pilot_mission_result_type.result_type_id;
ALTER SEQUENCE public.pilot_mission_status_status_id_seq OWNED BY public.pilot_mission_status.status_id;
ALTER SEQUENCE public.pilot_mission_type_mission_type_id_seq OWNED BY public.pilot_mission_type.mission_type_id;
ALTER SEQUENCE public.pilot_status_status_id_seq OWNED BY public.pilot_status.status_id;
ALTER SEQUENCE public.pilot_vehicle_status_vehicle_status_id_seq OWNED BY public.pilot_vehicle_status.vehicle_status_id;
ALTER SEQUENCE public.planning_logbook_mission_planning_id_seq OWNED BY public.planning_logbook.mission_planning_id;
ALTER SEQUENCE public.planning_planning_id_seq OWNED BY public.planning.planning_id;
ALTER SEQUENCE public.planning_test_logbook_test_id_seq OWNED BY public.planning_test_logbook.test_id;
ALTER SEQUENCE public.repository_file_file_id_seq OWNED BY public.repository_file.file_id;
ALTER SEQUENCE public.repository_file_type_file_type_id_seq OWNED BY public.repository_file_type.file_type_id;
ALTER SEQUENCE public.safety_action_action_id_seq OWNED BY public.safety_action.action_id;
ALTER SEQUENCE public.safety_report_report_id_seq OWNED BY public.safety_report.report_id;
ALTER SEQUENCE public.spi_kpi_definition_definition_id_seq OWNED BY public.spi_kpi_definition.definition_id;
ALTER SEQUENCE public.spi_kpi_kpi_id_seq OWNED BY public.spi_kpi.kpi_id;
ALTER SEQUENCE public.spi_kpi_log_log_id_seq OWNED BY public.spi_kpi_log.log_id;
ALTER SEQUENCE public.spi_kpi_target_proposal_proposal_id_seq OWNED BY public.spi_kpi_target_proposal.proposal_id;
ALTER SEQUENCE public.team_members_team_member_id_seq OWNED BY public.team_members.team_member_id;
ALTER SEQUENCE public.team_team_id_seq OWNED BY public.team.team_id;
ALTER SEQUENCE public.ticket_attachment_attachment_id_seq OWNED BY public.ticket_attachment.attachment_id;
ALTER SEQUENCE public.tool_component_component_id_seq OWNED BY public.tool_component.component_id;
ALTER SEQUENCE public.tool_erp_erp_id_seq OWNED BY public.tool_erp.erp_id;
ALTER SEQUENCE public.tool_maintenance_maintenance_id_seq OWNED BY public.tool_maintenance.maintenance_id;
ALTER SEQUENCE public.tool_model_model_id_seq OWNED BY public.tool_model.model_id;
ALTER SEQUENCE public.tool_status_status_id_seq OWNED BY public.tool_status.status_id;
ALTER SEQUENCE public.tool_tool_id_seq OWNED BY public.tool.tool_id;
ALTER SEQUENCE public.tool_type_tool_type_id_seq OWNED BY public.tool_type.tool_type_id;
ALTER SEQUENCE public.training_attendance_attendance_id_seq OWNED BY public.training_attendance.attendance_id;
ALTER SEQUENCE public.training_training_id_seq OWNED BY public.training.training_id;
ALTER SEQUENCE public.turn_users_turn_user_id_seq OWNED BY public.turn_users.turn_user_id;
ALTER SEQUENCE public.turns_turn_id_seq OWNED BY public.turns.turn_id;
ALTER SEQUENCE public.user_device_device_id_seq OWNED BY public.user_device.device_id;
ALTER SEQUENCE public.user_owner_user_owner_id_seq OWNED BY public.user_owner.user_owner_id;
ALTER SEQUENCE public.user_permessi_permission_id_seq OWNED BY public.user_permessi.permission_id;
ALTER SEQUENCE public.user_session_session_id_seq OWNED BY public.user_session.session_id;
ALTER SEQUENCE public.user_settings_setting_id_seq OWNED BY public.user_settings.setting_id;
ALTER SEQUENCE public.users_profile_profile_id_seq OWNED BY public.users_profile.profile_id;
ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;
ALTER SEQUENCE public.v_training_session_stats_stat_id_seq OWNED BY public.v_training_session_stats.stat_id;

SELECT pg_catalog.setval('public.alert_log_alert_id_seq', 5, true);
SELECT pg_catalog.setval('public.api_keys_api_key_id_seq', 30, true);
SELECT pg_catalog.setval('public.assignment_assignment_id_seq', 11, true);
SELECT pg_catalog.setval('public.audit_audit_id_seq', 5, true);
SELECT pg_catalog.setval('public.audit_finding_finding_id_seq', 5, true);
SELECT pg_catalog.setval('public.backup_log_backup_id_seq', 1, false);
SELECT pg_catalog.setval('public.calendar_shift_shift_id_seq', 16, true);
SELECT pg_catalog.setval('public.checklist_checklist_id_seq', 9, true);
SELECT pg_catalog.setval('public.client_client_id_seq', 6, true);
SELECT pg_catalog.setval('public.code_index_id_seq', 5, true);
SELECT pg_catalog.setval('public.communication_communication_id_seq', 11, true);
SELECT pg_catalog.setval('public.communication_general_communication_id_seq', 9, true);
SELECT pg_catalog.setval('public.compliance_evidence_evidence_id_seq', 5, true);
SELECT pg_catalog.setval('public.compliance_requirement_requirement_id_seq', 5, true);
SELECT pg_catalog.setval('public.compliance_status_log_log_id_seq', 5, true);
SELECT pg_catalog.setval('public.controlroom_drone_controlroom_drone_id_seq', 5, true);
SELECT pg_catalog.setval('public.controlroom_meta_meta_id_seq', 5, true);
SELECT pg_catalog.setval('public.countries_country_id_seq', 41, true);
SELECT pg_catalog.setval('public.deleted_owner_deleted_id_seq', 1, true);
SELECT pg_catalog.setval('public.deleted_user_deleted_id_seq', 2, true);
SELECT pg_catalog.setval('public.evaluation_action_action_id_seq', 30, true);
SELECT pg_catalog.setval('public.evaluation_evaluation_id_seq', 34, true);
SELECT pg_catalog.setval('public.evaluation_file_file_id_seq', 34, true);
SELECT pg_catalog.setval('public.flytbase_mission_flytbase_mission_id_seq', 5, true);
SELECT pg_catalog.setval('public.flytbase_mission_log_log_id_seq', 5, true);
SELECT pg_catalog.setval('public.flytbase_mission_status_status_id_seq', 5, true);
SELECT pg_catalog.setval('public.kanban_kanban_id_seq', 9, true);
SELECT pg_catalog.setval('public.luc_doc_type_doc_type_id_seq', 10, true);
SELECT pg_catalog.setval('public.luc_document_document_id_seq', 12, true);
SELECT pg_catalog.setval('public.luc_document_rev_revision_id_seq', 7, true);
SELECT pg_catalog.setval('public.luc_procedure_procedure_id_seq', 20, true);
SELECT pg_catalog.setval('public.maintenance_ticket_attachment_attachment_id_seq', 1, false);
SELECT pg_catalog.setval('public.maintenance_ticket_event_event_id_seq', 39, true);
SELECT pg_catalog.setval('public.maintenance_ticket_item_item_id_seq', 25, true);
SELECT pg_catalog.setval('public.maintenance_ticket_report_report_id_seq', 26, true);
SELECT pg_catalog.setval('public.maintenance_ticket_ticket_id_seq', 36, true);
SELECT pg_catalog.setval('public.messages_message_id_seq', 5, true);
SELECT pg_catalog.setval('public.mission_component_component_id_seq', 20, true);
SELECT pg_catalog.setval('public.notification_notification_id_seq', 12, true);
SELECT pg_catalog.setval('public.owner_owner_id_seq', 5, true);
SELECT pg_catalog.setval('public.owner_territorial_unit_unit_id_seq', 33, true);
SELECT pg_catalog.setval('public.payload_payload_id_seq', 5, true);
SELECT pg_catalog.setval('public.pilot_declaration_declaration_id_seq', 10, true);
SELECT pg_catalog.setval('public.pilot_mission_category_category_id_seq', 15, true);
SELECT pg_catalog.setval('public.pilot_mission_pilot_mission_id_seq', 42, true);
SELECT pg_catalog.setval('public.pilot_mission_planned_template_logbook_template_id_seq', 5, true);
SELECT pg_catalog.setval('public.pilot_mission_result_result_id_seq', 11, true);
SELECT pg_catalog.setval('public.pilot_mission_result_type_result_type_id_seq', 6, true);
SELECT pg_catalog.setval('public.pilot_mission_status_status_id_seq', 19, true);
SELECT pg_catalog.setval('public.pilot_mission_type_mission_type_id_seq', 20, true);
SELECT pg_catalog.setval('public.pilot_status_status_id_seq', 24, true);
SELECT pg_catalog.setval('public.pilot_vehicle_status_vehicle_status_id_seq', 20, true);
SELECT pg_catalog.setval('public.planning_logbook_mission_planning_id_seq', 26, true);
SELECT pg_catalog.setval('public.planning_planning_id_seq', 29, true);
SELECT pg_catalog.setval('public.planning_test_logbook_test_id_seq', 23, true);
SELECT pg_catalog.setval('public.repository_file_file_id_seq', 5, true);
SELECT pg_catalog.setval('public.repository_file_type_file_type_id_seq', 5, true);
SELECT pg_catalog.setval('public.safety_action_action_id_seq', 5, true);
SELECT pg_catalog.setval('public.safety_report_report_id_seq', 6, true);
SELECT pg_catalog.setval('public.spi_kpi_definition_definition_id_seq', 10, true);
SELECT pg_catalog.setval('public.spi_kpi_kpi_id_seq', 11, true);
SELECT pg_catalog.setval('public.spi_kpi_log_log_id_seq', 5, true);
SELECT pg_catalog.setval('public.spi_kpi_target_proposal_proposal_id_seq', 5, true);
SELECT pg_catalog.setval('public.team_members_team_member_id_seq', 33, true);
SELECT pg_catalog.setval('public.team_team_id_seq', 33, true);
SELECT pg_catalog.setval('public.ticket_attachment_attachment_id_seq', 4, true);
SELECT pg_catalog.setval('public.tool_component_component_id_seq', 38, true);
SELECT pg_catalog.setval('public.tool_erp_erp_id_seq', 25, true);
SELECT pg_catalog.setval('public.tool_maintenance_maintenance_id_seq', 31, true);
SELECT pg_catalog.setval('public.tool_model_model_id_seq', 37, true);
SELECT pg_catalog.setval('public.tool_status_status_id_seq', 30, true);
SELECT pg_catalog.setval('public.tool_tool_id_seq', 41, true);
SELECT pg_catalog.setval('public.tool_type_tool_type_id_seq', 30, true);
SELECT pg_catalog.setval('public.training_attendance_attendance_id_seq', 5, true);
SELECT pg_catalog.setval('public.training_training_id_seq', 7, true);
SELECT pg_catalog.setval('public.turn_users_turn_user_id_seq', 5, true);
SELECT pg_catalog.setval('public.turns_turn_id_seq', 5, true);
SELECT pg_catalog.setval('public.user_device_device_id_seq', 30, true);
SELECT pg_catalog.setval('public.user_owner_user_owner_id_seq', 69, true);
SELECT pg_catalog.setval('public.user_permessi_permission_id_seq', 30, true);
SELECT pg_catalog.setval('public.user_session_session_id_seq', 30, true);
SELECT pg_catalog.setval('public.user_settings_setting_id_seq', 438, true);
SELECT pg_catalog.setval('public.users_profile_profile_id_seq', 101, true);
SELECT pg_catalog.setval('public.users_user_id_seq', 112, true);
SELECT pg_catalog.setval('public.v_training_session_stats_stat_id_seq', 1, false);

CREATE FUNCTION public.check_email_exists(check_email text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE LOWER(email) = LOWER(check_email)
  );
END;
$$;

CREATE FUNCTION public.check_user_duplicates(p_email text, p_username text) RETURNS TABLE(email_exists boolean, username_exists boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_email_exists BOOLEAN;
  v_username_exists BOOLEAN;
BEGIN
  -- Explicitly check without RLS
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE LOWER(email) = LOWER(p_email)
  ) INTO v_email_exists;
  
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE username = p_username
  ) INTO v_username_exists;
  
  RETURN QUERY SELECT v_email_exists, v_username_exists;
END;
$$;

CREATE FUNCTION public.create_user_atomic(p_auth_user_id uuid, p_username character varying, p_email character varying, p_password_hash character varying, p_first_name character varying, p_last_name character varying, p_phone character varying, p_fk_owner_id integer, p_fk_client_id integer, p_fk_territorial_unit integer, p_user_type character varying, p_user_role character varying, p_is_viewer character, p_is_manager character, p_user_timezone character varying, p_user_unique_code character varying, p_key text) RETURNS TABLE(success boolean, user_id integer, error_message text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user_id INTEGER;
  v_email_exists BOOLEAN;
  v_username_exists BOOLEAN;
BEGIN
  -- Check for duplicates
  SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = LOWER(p_email)) INTO v_email_exists;
  SELECT EXISTS(SELECT 1 FROM users WHERE username = p_username) INTO v_username_exists;
  
  IF v_email_exists THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Email already exists'::TEXT;
    RETURN;
  END IF;
  
  IF v_username_exists THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Username already exists'::TEXT;
    RETURN;
  END IF;
  
  -- Insert the user
  INSERT INTO users (
    auth_user_id, username, email, password_hash, first_name, last_name,
    phone, fk_owner_id, fk_client_id, fk_territorial_unit, user_type,
    user_active, user_role, is_viewer, is_manager, user_timezone,
    user_unique_code, _key_, notes, created_at, updated_at
  ) VALUES (
    p_auth_user_id, p_username, LOWER(p_email), p_password_hash, p_first_name, p_last_name,
    p_phone, p_fk_owner_id, p_fk_client_id, p_fk_territorial_unit, p_user_type,
    'N', p_user_role, p_is_viewer, p_is_manager, p_user_timezone,
    p_user_unique_code, p_key, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
  RETURNING users.user_id INTO v_user_id;
  
  RETURN QUERY SELECT TRUE, v_user_id, NULL::TEXT;
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Duplicate key violation'::TEXT;
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, SQLERRM::TEXT;
END;
$$;

CREATE FUNCTION public.get_current_user_id() RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT user_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid();
$$;

CREATE FUNCTION public.get_current_user_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT user_role 
    FROM public.users 
    WHERE auth_user_id = auth.uid();
$$;

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_username TEXT;
    v_user_id INTEGER;
BEGIN
    -- Extract username from email (before @)
    v_username := split_part(NEW.email, '@', 1);
    
    -- Create user in public.users table
    INSERT INTO public.users (
        auth_user_id,
        username,
        email,
        first_name,
        last_name,
        user_active,
        user_role,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        v_username,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        'Y',
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        NOW(),
        NOW()
    )
    RETURNING user_id INTO v_user_id;
    
    -- Create user profile
    INSERT INTO public.users_profile (
        fk_user_id,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        NOW(),
        NOW()
    );
    
    -- Initialize user settings
    PERFORM public.initialize_user_settings(v_user_id);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth signup
        RAISE WARNING 'Error creating user profile: %', SQLERRM;
        RETURN NEW;
END;
$$;

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.handle_user_delete() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Soft delete: mark user as inactive
    UPDATE public.users
    SET 
        user_active = 'N',
        updated_at = NOW()
    WHERE auth_user_id = OLD.id;
    
    RETURN OLD;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error deleting user: %', SQLERRM;
        RETURN OLD;
END;
$$;

CREATE FUNCTION public.handle_user_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Update public.users when auth.users email is updated
    UPDATE public.users
    SET 
        email = NEW.email,
        updated_at = NOW()
    WHERE auth_user_id = NEW.id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating user: %', SQLERRM;
        RETURN NEW;
END;
$$;

CREATE FUNCTION public.initialize_user_settings(p_user_id integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Insert default settings for new user
    INSERT INTO public.user_settings (fk_user_id, setting_key, setting_value, setting_type)
    VALUES 
        (p_user_id, 'password_changed', 'false', 'boolean'),
        (p_user_id, 'mfa_required', 'false', 'boolean'),
        (p_user_id, 'mfa_enabled', 'false', 'boolean'),
        (p_user_id, 'mfa_setup_shown', 'false', 'boolean'),  -- NEW: Track if user has seen MFA setup
        (p_user_id, 'theme', 'light', 'string'),
        (p_user_id, 'language', 'en', 'string'),
        (p_user_id, 'notifications_enabled', 'true', 'boolean')
    ON CONFLICT (fk_user_id, setting_key) DO NOTHING;
END;
$$;

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT COALESCE(
        (SELECT user_role IN ('admin', 'super_admin')
         FROM public.users 
         WHERE auth_user_id = auth.uid()),
        false
    );
$$;

CREATE FUNCTION public.test_user_creation() RETURNS TABLE(test_result text, user_count bigint, profile_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'User and profile counts'::TEXT,
        (SELECT COUNT(*) FROM public.users),
        (SELECT COUNT(*) FROM public.users_profile);
END;
$$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;
