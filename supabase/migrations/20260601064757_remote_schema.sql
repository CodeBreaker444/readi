


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE OR REPLACE FUNCTION "public"."check_email_exists"("check_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE LOWER(email) = LOWER(check_email)
  );
END;
$$;


ALTER FUNCTION "public"."check_email_exists"("check_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_duplicates"("p_email" "text", "p_username" "text") RETURNS TABLE("email_exists" boolean, "username_exists" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."check_user_duplicates"("p_email" "text", "p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_atomic"("p_auth_user_id" "uuid", "p_username" character varying, "p_email" character varying, "p_password_hash" character varying, "p_first_name" character varying, "p_last_name" character varying, "p_phone" character varying, "p_fk_owner_id" integer, "p_fk_client_id" integer, "p_fk_territorial_unit" integer, "p_user_type" character varying, "p_user_role" character varying, "p_is_viewer" character, "p_is_manager" character, "p_user_timezone" character varying, "p_user_unique_code" character varying, "p_key" "text") RETURNS TABLE("success" boolean, "user_id" integer, "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."create_user_atomic"("p_auth_user_id" "uuid", "p_username" character varying, "p_email" character varying, "p_password_hash" character varying, "p_first_name" character varying, "p_last_name" character varying, "p_phone" character varying, "p_fk_owner_id" integer, "p_fk_client_id" integer, "p_fk_territorial_unit" integer, "p_user_type" character varying, "p_user_role" character varying, "p_is_viewer" character, "p_is_manager" character, "p_user_timezone" character varying, "p_user_unique_code" character varying, "p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_id"() RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT user_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_current_user_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_user_id"() IS 'Returns the current user ID from public.users table';



CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT user_role 
    FROM public.users 
    WHERE auth_user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_current_user_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_user_role"() IS 'Returns the current user role';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Automatically creates a user record in public.users when a user signs up via Supabase Auth';



CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."handle_user_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."handle_user_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_user_settings"("p_user_id" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."initialize_user_settings"("p_user_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT COALESCE(
        (SELECT user_role IN ('admin', 'super_admin')
         FROM public.users 
         WHERE auth_user_id = auth.uid()),
        false
    );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin"() IS 'Checks if current user is an admin';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_user_creation"() RETURNS TABLE("test_result" "text", "user_count" bigint, "profile_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'User and profile counts'::TEXT,
        (SELECT COUNT(*) FROM public.users),
        (SELECT COUNT(*) FROM public.users_profile);
END;
$$;


ALTER FUNCTION "public"."test_user_creation"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."test_user_creation"() IS 'Test function to check user and profile counts';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_token_usage" (
    "id" bigint NOT NULL,
    "user_id" integer NOT NULL,
    "owner_id" integer NOT NULL,
    "input_tokens" integer DEFAULT 0 NOT NULL,
    "output_tokens" integer DEFAULT 0 NOT NULL,
    "total_tokens" integer DEFAULT 0 NOT NULL,
    "model" "text" DEFAULT 'llama-3.3-70b-versatile'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_token_usage" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ai_token_usage_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ai_token_usage_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ai_token_usage_id_seq" OWNED BY "public"."ai_token_usage"."id";



CREATE TABLE IF NOT EXISTS "public"."alert_log" (
    "alert_id" integer NOT NULL,
    "alert_type" character varying(50) NOT NULL,
    "alert_severity" character varying(20),
    "alert_source" character varying(100),
    "alert_message" "text" NOT NULL,
    "alert_data" "jsonb",
    "related_entity_type" character varying(50),
    "related_entity_id" integer,
    "triggered_by_user_id" integer,
    "assigned_to_user_id" integer,
    "alert_status" character varying(50),
    "acknowledged_at" timestamp without time zone,
    "acknowledged_by_user_id" integer,
    "resolved_at" timestamp without time zone,
    "resolved_by_user_id" integer,
    "resolution_notes" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."alert_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."alert_log" IS 'System alerts and notifications log';



CREATE SEQUENCE IF NOT EXISTS "public"."alert_log_alert_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."alert_log_alert_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."alert_log_alert_id_seq" OWNED BY "public"."alert_log"."alert_id";



CREATE TABLE IF NOT EXISTS "public"."api_keys" (
    "api_key_id" integer NOT NULL,
    "fk_owner_id" integer NOT NULL,
    "key_name" character varying(100) NOT NULL,
    "key_value" character varying(100) NOT NULL,
    "key_scope" character varying(50) DEFAULT 'mission_request'::character varying NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by_user_id" integer,
    "last_used_at" timestamp without time zone,
    "expires_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "key_prefix" "text"
);


ALTER TABLE "public"."api_keys" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."api_keys_api_key_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."api_keys_api_key_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."api_keys_api_key_id_seq" OWNED BY "public"."api_keys"."api_key_id";



CREATE TABLE IF NOT EXISTS "public"."assignment" (
    "assignment_id" integer NOT NULL,
    "fk_user_id" integer NOT NULL,
    "fk_owner_id" integer NOT NULL,
    "assignment_code" character varying(50),
    "assignment_desc" "text",
    "assignment_json" "jsonb",
    "assignment_ver" numeric(5,2),
    "assignment_active" character(1) DEFAULT 'Y'::"bpchar",
    "due_date" "date",
    "completed_date" "date",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."assignment" OWNER TO "postgres";


COMMENT ON TABLE "public"."assignment" IS 'Work assignments to users';



CREATE SEQUENCE IF NOT EXISTS "public"."assignment_assignment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."assignment_assignment_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."assignment_assignment_id_seq" OWNED BY "public"."assignment"."assignment_id";



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" bigint NOT NULL,
    "event_type" character varying(50) NOT NULL,
    "entity_type" character varying(100) NOT NULL,
    "entity_id" character varying(255),
    "description" "text",
    "user_id" integer,
    "user_name" character varying(255),
    "user_email" character varying(255),
    "user_role" character varying(50),
    "owner_id" integer NOT NULL,
    "metadata" "jsonb",
    "ip_address" character varying(45),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."audit_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNED BY "public"."audit_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."backup_log" (
    "backup_id" integer NOT NULL,
    "backup_type" character varying(50),
    "backup_name" character varying(255),
    "backup_path" "text",
    "backup_size" bigint,
    "backup_status" character varying(50),
    "backup_start_time" timestamp without time zone,
    "backup_end_time" timestamp without time zone,
    "backup_duration" integer,
    "error_message" "text",
    "performed_by_user_id" integer,
    "backup_metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."backup_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."backup_log" IS 'Database and system backup logs';



CREATE SEQUENCE IF NOT EXISTS "public"."backup_log_backup_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."backup_log_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."backup_log_backup_id_seq" OWNED BY "public"."backup_log"."backup_id";



CREATE TABLE IF NOT EXISTS "public"."calendar_shift" (
    "shift_id" integer NOT NULL,
    "fk_owner_id" integer,
    "fk_client_id" integer,
    "fk_pic_id" integer,
    "shift_date_start" "date" NOT NULL,
    "shift_date_end" "date" NOT NULL,
    "shift_time_start" time without time zone NOT NULL,
    "shift_time_end" time without time zone NOT NULL,
    "shift_recurring" character varying(50),
    "shift_date_until" "date",
    "shift_desc" "text",
    "shift_group_label" character varying(100),
    "shift_category" character varying(50),
    "recurring_group_id" character varying(100),
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."calendar_shift" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_shift" IS 'Work shifts and scheduling';



CREATE SEQUENCE IF NOT EXISTS "public"."calendar_shift_shift_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."calendar_shift_shift_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."calendar_shift_shift_id_seq" OWNED BY "public"."calendar_shift"."shift_id";



CREATE TABLE IF NOT EXISTS "public"."checklist" (
    "checklist_id" integer NOT NULL,
    "fk_user_id" integer,
    "fk_owner_id" integer,
    "checklist_code" character varying(50),
    "checklist_desc" "text",
    "checklist_json" "jsonb",
    "checklist_ver" numeric(5,2),
    "checklist_active" character(1) DEFAULT 'Y'::"bpchar",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "fk_planning_id" integer
);


ALTER TABLE "public"."checklist" OWNER TO "postgres";


COMMENT ON TABLE "public"."checklist" IS 'Reusable checklists for various operations';



CREATE SEQUENCE IF NOT EXISTS "public"."checklist_checklist_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."checklist_checklist_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."checklist_checklist_id_seq" OWNED BY "public"."checklist"."checklist_id";



CREATE TABLE IF NOT EXISTS "public"."client" (
    "client_id" integer NOT NULL,
    "fk_owner_id" integer NOT NULL,
    "client_code" character varying(50),
    "client_name" character varying(255) NOT NULL,
    "client_legal_name" character varying(255),
    "client_address" "text",
    "client_city" character varying(100),
    "client_state" character varying(100),
    "client_postal_code" character varying(20),
    "fk_country_id" integer,
    "client_phone" character varying(50),
    "client_email" character varying(255),
    "client_website" character varying(255),
    "client_logo" "text",
    "client_active" character(1) DEFAULT 'Y'::"bpchar",
    "client_unique_code" "uuid" DEFAULT "extensions"."uuid_generate_v4"(),
    "contract_start_date" "date",
    "contract_end_date" "date",
    "payment_terms" character varying(100),
    "credit_limit" numeric(15,2),
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "username" character varying(100)
);


ALTER TABLE "public"."client" OWNER TO "postgres";


COMMENT ON TABLE "public"."client" IS 'Client companies that receive services';



CREATE SEQUENCE IF NOT EXISTS "public"."client_client_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."client_client_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."client_client_id_seq" OWNED BY "public"."client"."client_id";



CREATE TABLE IF NOT EXISTS "public"."code_index" (
    "id" integer NOT NULL,
    "owner_code_index" integer,
    "property_code_index" integer,
    "inspection_code_index" integer,
    "date_update" "date",
    "user_id" integer
);


ALTER TABLE "public"."code_index" OWNER TO "postgres";


COMMENT ON TABLE "public"."code_index" IS 'Legacy code index table (consider deprecating)';



CREATE SEQUENCE IF NOT EXISTS "public"."code_index_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."code_index_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."code_index_id_seq" OWNED BY "public"."code_index"."id";



CREATE TABLE IF NOT EXISTS "public"."communication" (
    "communication_id" integer NOT NULL,
    "fk_user_id" integer NOT NULL,
    "fk_owner_id" integer,
    "communication_code" character varying(50),
    "communication_desc" "text",
    "communication_json" "jsonb",
    "communication_ver" numeric(5,2),
    "communication_active" character(1) DEFAULT 'Y'::"bpchar",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."communication" OWNER TO "postgres";


COMMENT ON TABLE "public"."communication" IS 'User-specific communications';



CREATE SEQUENCE IF NOT EXISTS "public"."communication_communication_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."communication_communication_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."communication_communication_id_seq" OWNED BY "public"."communication"."communication_id";



CREATE TABLE IF NOT EXISTS "public"."communication_general" (
    "communication_id" integer NOT NULL,
    "fk_owner_id" integer,
    "subject" character varying(255),
    "message" "text",
    "communication_type" character varying(50),
    "priority" character varying(20),
    "status" character varying(50),
    "sent_by_user_id" integer,
    "recipients" "jsonb",
    "attachments" "jsonb",
    "sent_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "read_at" timestamp without time zone,
    "communication_level" character varying(20) DEFAULT 'info'::character varying,
    "fk_client_id" integer,
    "fk_planning_id" integer,
    "fk_evaluation_id" integer,
    "communication_to" "jsonb",
    "communication_file_name" character varying(255),
    "communication_file_key" character varying(500),
    "communication_file_url" "text"
);


ALTER TABLE "public"."communication_general" OWNER TO "postgres";


COMMENT ON TABLE "public"."communication_general" IS 'General communications and announcements';



CREATE SEQUENCE IF NOT EXISTS "public"."communication_general_communication_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."communication_general_communication_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."communication_general_communication_id_seq" OWNED BY "public"."communication_general"."communication_id";



CREATE TABLE IF NOT EXISTS "public"."compliance_evidence" (
    "evidence_id" integer NOT NULL,
    "fk_requirement_id" integer NOT NULL,
    "evidence_type" character varying(50),
    "evidence_description" "text",
    "file_path" "text",
    "submitted_by_user_id" integer,
    "submitted_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "verified_by_user_id" integer,
    "verified_at" timestamp without time zone,
    "verification_status" character varying(50),
    "notes" "text"
);


ALTER TABLE "public"."compliance_evidence" OWNER TO "postgres";


COMMENT ON TABLE "public"."compliance_evidence" IS 'Evidence documents for compliance requirements';



CREATE SEQUENCE IF NOT EXISTS "public"."compliance_evidence_evidence_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."compliance_evidence_evidence_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."compliance_evidence_evidence_id_seq" OWNED BY "public"."compliance_evidence"."evidence_id";



CREATE TABLE IF NOT EXISTS "public"."compliance_requirement" (
    "requirement_id" integer NOT NULL,
    "fk_owner_id" integer,
    "requirement_code" character varying(50),
    "requirement_title" character varying(255) NOT NULL,
    "requirement_description" "text",
    "requirement_type" character varying(50),
    "regulatory_body" character varying(255),
    "requirement_status" character varying(50),
    "effective_date" "date",
    "review_frequency" integer,
    "next_review_date" "date",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."compliance_requirement" OWNER TO "postgres";


COMMENT ON TABLE "public"."compliance_requirement" IS 'Regulatory compliance requirements';



CREATE SEQUENCE IF NOT EXISTS "public"."compliance_requirement_requirement_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."compliance_requirement_requirement_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."compliance_requirement_requirement_id_seq" OWNED BY "public"."compliance_requirement"."requirement_id";



CREATE TABLE IF NOT EXISTS "public"."compliance_status_log" (
    "log_id" integer NOT NULL,
    "fk_requirement_id" integer NOT NULL,
    "status_from" character varying(50),
    "status_to" character varying(50) NOT NULL,
    "changed_by_user_id" integer,
    "change_reason" "text",
    "changed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."compliance_status_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."compliance_status_log" IS 'Audit trail for compliance status changes';



CREATE SEQUENCE IF NOT EXISTS "public"."compliance_status_log_log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."compliance_status_log_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."compliance_status_log_log_id_seq" OWNED BY "public"."compliance_status_log"."log_id";



CREATE TABLE IF NOT EXISTS "public"."component_type_config" (
    "type_id" integer NOT NULL,
    "type_value" character varying(50) NOT NULL,
    "type_label" character varying(100) NOT NULL,
    "fk_owner_id" bigint NOT NULL
);


ALTER TABLE "public"."component_type_config" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."component_type_config_type_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."component_type_config_type_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."component_type_config_type_id_seq" OWNED BY "public"."component_type_config"."type_id";



CREATE TABLE IF NOT EXISTS "public"."controlroom_drone" (
    "controlroom_drone_id" integer NOT NULL,
    "fk_tool_id" integer NOT NULL,
    "fk_pilot_mission_id" integer,
    "current_status" character varying(50),
    "current_location" "point",
    "current_altitude" numeric(10,2),
    "current_speed" numeric(10,2),
    "battery_level" numeric(5,2),
    "signal_strength" numeric(5,2),
    "telemetry_data" "jsonb",
    "last_heartbeat" timestamp without time zone,
    "is_active" boolean DEFAULT true,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."controlroom_drone" OWNER TO "postgres";


COMMENT ON TABLE "public"."controlroom_drone" IS 'Real-time drone status for control room monitoring';



CREATE SEQUENCE IF NOT EXISTS "public"."controlroom_drone_controlroom_drone_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."controlroom_drone_controlroom_drone_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."controlroom_drone_controlroom_drone_id_seq" OWNED BY "public"."controlroom_drone"."controlroom_drone_id";



CREATE TABLE IF NOT EXISTS "public"."controlroom_meta" (
    "meta_id" integer NOT NULL,
    "fk_owner_id" integer,
    "meta_key" character varying(100) NOT NULL,
    "meta_value" "text",
    "meta_type" character varying(50),
    "meta_description" "text",
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."controlroom_meta" OWNER TO "postgres";


COMMENT ON TABLE "public"."controlroom_meta" IS 'Control room configuration and metadata';



CREATE SEQUENCE IF NOT EXISTS "public"."controlroom_meta_meta_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."controlroom_meta_meta_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."controlroom_meta_meta_id_seq" OWNED BY "public"."controlroom_meta"."meta_id";



CREATE TABLE IF NOT EXISTS "public"."countries" (
    "country_id" integer NOT NULL,
    "country_code" character varying(10),
    "country_name" character varying(255) NOT NULL,
    "country_region" character varying(100),
    "country_active" character(1) DEFAULT 'Y'::"bpchar",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."countries" OWNER TO "postgres";


COMMENT ON TABLE "public"."countries" IS 'Reference table for countries and regions';



CREATE SEQUENCE IF NOT EXISTS "public"."countries_country_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."countries_country_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."countries_country_id_seq" OWNED BY "public"."countries"."country_id";



CREATE TABLE IF NOT EXISTS "public"."dcc_integrations" (
    "id" integer NOT NULL,
    "fk_owner_id" integer NOT NULL,
    "display_name" "text" NOT NULL,
    "callback_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dcc_integrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."dcc_integrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."dcc_integrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."dcc_integrations_id_seq" OWNED BY "public"."dcc_integrations"."id";



CREATE TABLE IF NOT EXISTS "public"."deleted_owner" (
    "deleted_id" integer NOT NULL,
    "owner_id" integer NOT NULL,
    "owner_code" character varying(50),
    "owner_name" character varying(255),
    "owner_legal_name" character varying(255),
    "owner_type" character varying(50),
    "owner_address" "text",
    "owner_city" character varying(100),
    "owner_state" character varying(100),
    "owner_postal_code" character varying(20),
    "fk_country_id" integer,
    "owner_phone" character varying(50),
    "owner_email" character varying(255),
    "owner_website" character varying(255),
    "owner_logo" "text",
    "owner_active" character(1),
    "tax_id" character varying(50),
    "registration_number" character varying(100),
    "license_number" character varying(100),
    "license_expiry" "date",
    "original_created_at" timestamp without time zone,
    "deleted_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_by_user_id" integer,
    "deletion_reason" "text"
);


ALTER TABLE "public"."deleted_owner" OWNER TO "postgres";


COMMENT ON TABLE "public"."deleted_owner" IS 'Archive of soft-deleted organizations';



CREATE SEQUENCE IF NOT EXISTS "public"."deleted_owner_deleted_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."deleted_owner_deleted_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."deleted_owner_deleted_id_seq" OWNED BY "public"."deleted_owner"."deleted_id";



CREATE TABLE IF NOT EXISTS "public"."deleted_user" (
    "deleted_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "username" character varying(100),
    "email" character varying(255),
    "first_name" character varying(100),
    "last_name" character varying(100),
    "phone" character varying(50),
    "user_role" character varying(50),
    "user_type" character varying(50),
    "fk_owner_id" integer,
    "owner_code" character varying(50),
    "owner_name" character varying(255),
    "original_created_at" timestamp without time zone,
    "deleted_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_by_user_id" integer,
    "deletion_reason" "text"
);


ALTER TABLE "public"."deleted_user" OWNER TO "postgres";


COMMENT ON TABLE "public"."deleted_user" IS 'Archive of soft-deleted users when company is deleted';



CREATE SEQUENCE IF NOT EXISTS "public"."deleted_user_deleted_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."deleted_user_deleted_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."deleted_user_deleted_id_seq" OWNED BY "public"."deleted_user"."deleted_id";



CREATE TABLE IF NOT EXISTS "public"."drone_class_config" (
    "class_id" integer NOT NULL,
    "fk_owner_id" integer NOT NULL,
    "class_value" "text" NOT NULL,
    "class_label" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."drone_class_config" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."drone_class_config_class_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."drone_class_config_class_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."drone_class_config_class_id_seq" OWNED BY "public"."drone_class_config"."class_id";



CREATE TABLE IF NOT EXISTS "public"."emergency_response_plan" (
    "erp_id" bigint NOT NULL,
    "description" "text" NOT NULL,
    "contact" "text" NOT NULL,
    "erp_type" "text" DEFAULT 'GENERAL'::"text" NOT NULL,
    "fk_owner_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "emergency_response_plan_erp_type_check" CHECK (("erp_type" = ANY (ARRAY['GENERAL'::"text", 'MEDICAL'::"text", 'FIRE'::"text", 'SECURITY'::"text", 'ENVIRONMENTAL'::"text"])))
);


ALTER TABLE "public"."emergency_response_plan" OWNER TO "postgres";


ALTER TABLE "public"."emergency_response_plan" ALTER COLUMN "erp_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."emergency_response_plan_erp_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."erp_location_group" (
    "group_id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "fk_owner_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."erp_location_group" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."erp_location_group_contact" (
    "id" integer NOT NULL,
    "fk_group_id" integer NOT NULL,
    "fk_erp_id" integer NOT NULL
);


ALTER TABLE "public"."erp_location_group_contact" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."erp_location_group_contact_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."erp_location_group_contact_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."erp_location_group_contact_id_seq" OWNED BY "public"."erp_location_group_contact"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."erp_location_group_group_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."erp_location_group_group_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."erp_location_group_group_id_seq" OWNED BY "public"."erp_location_group"."group_id";



CREATE TABLE IF NOT EXISTS "public"."erp_location_group_location" (
    "location_id" integer NOT NULL,
    "fk_group_id" integer NOT NULL,
    "location_name" "text" NOT NULL,
    "lat" double precision,
    "lng" double precision,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."erp_location_group_location" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."erp_location_group_location_location_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."erp_location_group_location_location_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."erp_location_group_location_location_id_seq" OWNED BY "public"."erp_location_group_location"."location_id";



CREATE TABLE IF NOT EXISTS "public"."evaluation" (
    "evaluation_id" integer NOT NULL,
    "fk_owner_id" integer NOT NULL,
    "fk_client_id" integer,
    "evaluation_code" character varying(50),
    "evaluation_name" character varying(255) NOT NULL,
    "evaluation_description" "text",
    "evaluation_type" character varying(50),
    "evaluation_status" character varying(50),
    "scheduled_date" "date",
    "coordinates" "point",
    "created_by_user_id" integer,
    "evaluation_active" character(1) DEFAULT 'Y'::"bpchar",
    "evaluation_metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "fk_luc_procedure_id" integer,
    "evaluation_year" integer,
    "evaluation_result" "text"
);


ALTER TABLE "public"."evaluation" OWNER TO "postgres";


COMMENT ON TABLE "public"."evaluation" IS 'Evaluations, inspections, and survey projects';



CREATE TABLE IF NOT EXISTS "public"."evaluation_action" (
    "action_id" integer NOT NULL,
    "fk_evaluation_id" integer NOT NULL,
    "action_code" character varying(50),
    "action_title" character varying(255) NOT NULL,
    "action_description" "text",
    "action_type" character varying(50),
    "action_status" character varying(50),
    "action_priority" character varying(20),
    "assigned_to_user_id" integer,
    "due_date" "date",
    "completed_date" "date",
    "estimated_hours" numeric(8,2),
    "actual_hours" numeric(8,2),
    "action_order" integer,
    "dependencies" "jsonb",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."evaluation_action" OWNER TO "postgres";


COMMENT ON TABLE "public"."evaluation_action" IS 'Actions and tasks within evaluations';



CREATE SEQUENCE IF NOT EXISTS "public"."evaluation_action_action_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."evaluation_action_action_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."evaluation_action_action_id_seq" OWNED BY "public"."evaluation_action"."action_id";



CREATE SEQUENCE IF NOT EXISTS "public"."evaluation_evaluation_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."evaluation_evaluation_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."evaluation_evaluation_id_seq" OWNED BY "public"."evaluation"."evaluation_id";



CREATE TABLE IF NOT EXISTS "public"."evaluation_file" (
    "file_id" integer NOT NULL,
    "fk_evaluation_id" integer NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "file_path" "text",
    "file_type" character varying(100),
    "file_category" character varying(50),
    "file_size" bigint,
    "file_description" "text",
    "uploaded_by_user_id" integer,
    "uploaded_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "file_version" integer DEFAULT 1,
    "is_latest" boolean DEFAULT true,
    "file_url" "text"
);


ALTER TABLE "public"."evaluation_file" OWNER TO "postgres";


COMMENT ON TABLE "public"."evaluation_file" IS 'Files and deliverables associated with evaluations';



CREATE SEQUENCE IF NOT EXISTS "public"."evaluation_file_file_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."evaluation_file_file_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."evaluation_file_file_id_seq" OWNED BY "public"."evaluation_file"."file_id";



CREATE TABLE IF NOT EXISTS "public"."flight_requests" (
    "request_id" integer NOT NULL,
    "fk_owner_id" integer NOT NULL,
    "fk_api_key_id" integer,
    "external_mission_id" character varying(100) NOT NULL,
    "mission_type" character varying(50),
    "target" character varying(255),
    "localization" "jsonb",
    "waypoint" "jsonb",
    "start_datetime" timestamp without time zone,
    "priority" character varying(20),
    "notes" "text",
    "operator" character varying(100),
    "dcc_status" character varying(20) DEFAULT 'NEW'::character varying NOT NULL,
    "fk_planning_id" integer,
    "assigned_by_user_id" integer,
    "assigned_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."flight_requests" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."flight_requests_request_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."flight_requests_request_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."flight_requests_request_id_seq" OWNED BY "public"."flight_requests"."request_id";



CREATE TABLE IF NOT EXISTS "public"."flytbase_mission" (
    "flytbase_mission_id" integer NOT NULL,
    "fk_planning_id" integer,
    "flytbase_mission_code" character varying(100),
    "flytbase_mission_data" "jsonb",
    "sync_status" character varying(50),
    "last_sync_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."flytbase_mission" OWNER TO "postgres";


COMMENT ON TABLE "public"."flytbase_mission" IS 'Integration with FlytBase drone management system';



CREATE SEQUENCE IF NOT EXISTS "public"."flytbase_mission_flytbase_mission_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."flytbase_mission_flytbase_mission_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."flytbase_mission_flytbase_mission_id_seq" OWNED BY "public"."flytbase_mission"."flytbase_mission_id";



CREATE TABLE IF NOT EXISTS "public"."flytbase_mission_log" (
    "log_id" integer NOT NULL,
    "fk_flytbase_mission_id" integer,
    "log_type" character varying(50),
    "log_data" "jsonb",
    "log_timestamp" timestamp without time zone,
    "is_active" character(1) DEFAULT 'Y'::"bpchar",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."flytbase_mission_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."flytbase_mission_log" IS 'Detailed logs from FlytBase missions';



CREATE SEQUENCE IF NOT EXISTS "public"."flytbase_mission_log_log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."flytbase_mission_log_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."flytbase_mission_log_log_id_seq" OWNED BY "public"."flytbase_mission_log"."log_id";



CREATE TABLE IF NOT EXISTS "public"."flytbase_mission_status" (
    "status_id" integer NOT NULL,
    "fk_flytbase_mission_id" integer,
    "status_data" "jsonb",
    "status_timestamp" timestamp without time zone,
    "is_managed" character(1) DEFAULT 'N'::"bpchar",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."flytbase_mission_status" OWNER TO "postgres";


COMMENT ON TABLE "public"."flytbase_mission_status" IS 'Status updates from FlytBase system';



CREATE SEQUENCE IF NOT EXISTS "public"."flytbase_mission_status_status_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."flytbase_mission_status_status_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."flytbase_mission_status_status_id_seq" OWNED BY "public"."flytbase_mission_status"."status_id";



CREATE TABLE IF NOT EXISTS "public"."kanban" (
    "kanban_id" integer NOT NULL,
    "fk_owner_id" integer,
    "fk_user_id" integer,
    "fk_evaluation_id" integer,
    "board_name" character varying(255),
    "column_name" character varying(100),
    "card_title" character varying(255) NOT NULL,
    "card_description" "text",
    "card_order" integer,
    "card_priority" character varying(20),
    "card_labels" "jsonb",
    "assigned_users" "jsonb",
    "due_date" "date",
    "card_metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."kanban" OWNER TO "postgres";


COMMENT ON TABLE "public"."kanban" IS 'Kanban boards for project management';



CREATE SEQUENCE IF NOT EXISTS "public"."kanban_kanban_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."kanban_kanban_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."kanban_kanban_id_seq" OWNED BY "public"."kanban"."kanban_id";



CREATE TABLE IF NOT EXISTS "public"."luc_doc_type" (
    "doc_type_id" integer NOT NULL,
    "doc_type_code" character varying(50),
    "doc_type_name" character varying(255) NOT NULL,
    "doc_type_description" "text",
    "doc_type_category" character varying(100),
    "doc_type_active" character(1) DEFAULT 'Y'::"bpchar",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "fk_owner_id" integer
);


ALTER TABLE "public"."luc_doc_type" OWNER TO "postgres";


COMMENT ON TABLE "public"."luc_doc_type" IS 'Document type definitions (legal, compliance, etc.)';



CREATE SEQUENCE IF NOT EXISTS "public"."luc_doc_type_doc_type_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."luc_doc_type_doc_type_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."luc_doc_type_doc_type_id_seq" OWNED BY "public"."luc_doc_type"."doc_type_id";



CREATE TABLE IF NOT EXISTS "public"."luc_document" (
    "document_id" integer NOT NULL,
    "fk_owner_id" integer,
    "fk_doc_type_id" integer,
    "document_code" character varying(50),
    "document_title" character varying(255) NOT NULL,
    "document_description" "text",
    "document_status" character varying(50),
    "effective_date" "date",
    "expiry_date" "date",
    "version_number" character varying(20),
    "is_current_version" boolean DEFAULT true,
    "created_by_user_id" integer,
    "approved_by_user_id" integer,
    "approved_at" timestamp without time zone,
    "document_active" character(1) DEFAULT 'Y'::"bpchar",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "owner_role" character varying(150),
    "keywords" "text",
    "tags" "text",
    "fk_component_id" integer
);


ALTER TABLE "public"."luc_document" OWNER TO "postgres";


COMMENT ON TABLE "public"."luc_document" IS 'Legal, compliance, and official documents';



CREATE SEQUENCE IF NOT EXISTS "public"."luc_document_document_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."luc_document_document_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."luc_document_document_id_seq" OWNED BY "public"."luc_document"."document_id";



CREATE TABLE IF NOT EXISTS "public"."luc_document_rev" (
    "revision_id" integer NOT NULL,
    "fk_document_id" integer NOT NULL,
    "revision_number" character varying(20) NOT NULL,
    "revision_date" "date",
    "revision_description" "text",
    "file_path" "text",
    "file_size" bigint,
    "revised_by_user_id" integer,
    "changes_summary" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."luc_document_rev" OWNER TO "postgres";


COMMENT ON TABLE "public"."luc_document_rev" IS 'Document revision history';



CREATE SEQUENCE IF NOT EXISTS "public"."luc_document_rev_revision_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."luc_document_rev_revision_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."luc_document_rev_revision_id_seq" OWNED BY "public"."luc_document_rev"."revision_id";



CREATE TABLE IF NOT EXISTS "public"."luc_procedure" (
    "procedure_id" integer NOT NULL,
    "fk_owner_id" integer,
    "fk_document_id" integer,
    "procedure_code" character varying(50),
    "procedure_name" character varying(255) NOT NULL,
    "procedure_description" "text",
    "procedure_steps" "jsonb",
    "procedure_version" character varying(20),
    "procedure_status" character varying(50),
    "effective_date" "date",
    "review_date" "date",
    "created_by_user_id" integer,
    "approved_by_user_id" integer,
    "procedure_active" character(1) DEFAULT 'Y'::"bpchar",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "procedure_sector" character varying(50)
);


ALTER TABLE "public"."luc_procedure" OWNER TO "postgres";


COMMENT ON TABLE "public"."luc_procedure" IS 'Standard operating procedures';



CREATE SEQUENCE IF NOT EXISTS "public"."luc_procedure_procedure_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."luc_procedure_procedure_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."luc_procedure_procedure_id_seq" OWNED BY "public"."luc_procedure"."procedure_id";



CREATE TABLE IF NOT EXISTS "public"."maintenance_ticket" (
    "ticket_id" integer NOT NULL,
    "fk_owner_id" integer,
    "fk_tool_id" integer,
    "ticket_number" character varying(50),
    "ticket_title" character varying(255) NOT NULL,
    "ticket_type" character varying(50),
    "ticket_priority" character varying(20),
    "ticket_status" character varying(50),
    "reported_by_user_id" integer,
    "assigned_to_user_id" integer,
    "reported_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "closed_at" timestamp without time zone,
    "resolution_notes" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "fk_component_id" integer,
    "location_latitude" numeric(10,7),
    "location_longitude" numeric(10,7)
);


ALTER TABLE "public"."maintenance_ticket" OWNER TO "postgres";


COMMENT ON TABLE "public"."maintenance_ticket" IS 'Maintenance work orders and tickets';



CREATE TABLE IF NOT EXISTS "public"."maintenance_ticket_attachment" (
    "attachment_id" integer NOT NULL,
    "fk_ticket_id" integer NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "file_path" "text",
    "file_type" character varying(100),
    "file_size" bigint,
    "uploaded_by_user_id" integer,
    "uploaded_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."maintenance_ticket_attachment" OWNER TO "postgres";


COMMENT ON TABLE "public"."maintenance_ticket_attachment" IS 'Files attached to maintenance tickets';



CREATE SEQUENCE IF NOT EXISTS "public"."maintenance_ticket_attachment_attachment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."maintenance_ticket_attachment_attachment_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."maintenance_ticket_attachment_attachment_id_seq" OWNED BY "public"."maintenance_ticket_attachment"."attachment_id";



CREATE TABLE IF NOT EXISTS "public"."maintenance_ticket_event" (
    "event_id" integer NOT NULL,
    "fk_ticket_id" integer NOT NULL,
    "event_type" character varying(50) NOT NULL,
    "event_description" "text",
    "event_data" "jsonb",
    "created_by_user_id" integer,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."maintenance_ticket_event" OWNER TO "postgres";


COMMENT ON TABLE "public"."maintenance_ticket_event" IS 'Activity log for maintenance tickets';



CREATE SEQUENCE IF NOT EXISTS "public"."maintenance_ticket_event_event_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."maintenance_ticket_event_event_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."maintenance_ticket_event_event_id_seq" OWNED BY "public"."maintenance_ticket_event"."event_id";



CREATE TABLE IF NOT EXISTS "public"."maintenance_ticket_item" (
    "item_id" integer NOT NULL,
    "fk_ticket_id" integer NOT NULL,
    "fk_component_id" integer,
    "item_description" character varying(255) NOT NULL,
    "item_type" character varying(50),
    "quantity" integer,
    "unit_cost" numeric(15,2),
    "total_cost" numeric(15,2),
    "supplier" character varying(255),
    "part_number" character varying(100),
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."maintenance_ticket_item" OWNER TO "postgres";


COMMENT ON TABLE "public"."maintenance_ticket_item" IS 'Parts and materials used in maintenance';



CREATE SEQUENCE IF NOT EXISTS "public"."maintenance_ticket_item_item_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."maintenance_ticket_item_item_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."maintenance_ticket_item_item_id_seq" OWNED BY "public"."maintenance_ticket_item"."item_id";



CREATE TABLE IF NOT EXISTS "public"."maintenance_ticket_report" (
    "report_id" integer NOT NULL,
    "fk_ticket_id" integer NOT NULL,
    "report_title" character varying(255),
    "report_content" "text",
    "report_type" character varying(50),
    "findings" "text",
    "recommendations" "text",
    "generated_by_user_id" integer,
    "generated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."maintenance_ticket_report" OWNER TO "postgres";


COMMENT ON TABLE "public"."maintenance_ticket_report" IS 'Detailed reports for completed maintenance';



CREATE SEQUENCE IF NOT EXISTS "public"."maintenance_ticket_report_report_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."maintenance_ticket_report_report_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."maintenance_ticket_report_report_id_seq" OWNED BY "public"."maintenance_ticket_report"."report_id";



CREATE SEQUENCE IF NOT EXISTS "public"."maintenance_ticket_ticket_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."maintenance_ticket_ticket_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."maintenance_ticket_ticket_id_seq" OWNED BY "public"."maintenance_ticket"."ticket_id";



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "message_id" integer NOT NULL,
    "from_user_id" integer NOT NULL,
    "to_user_id" integer NOT NULL,
    "message_subject" character varying(255),
    "message_body" "text",
    "message_type" character varying(50),
    "is_read" boolean DEFAULT false,
    "read_at" timestamp without time zone,
    "parent_message_id" integer,
    "attachments" "jsonb",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_by_sender" boolean DEFAULT false,
    "deleted_by_recipient" boolean DEFAULT false
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."messages" IS 'Direct messaging between users';



CREATE SEQUENCE IF NOT EXISTS "public"."messages_message_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."messages_message_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."messages_message_id_seq" OWNED BY "public"."messages"."message_id";



CREATE TABLE IF NOT EXISTS "public"."mission_component" (
    "component_id" integer NOT NULL,
    "fk_planning_id" integer,
    "fk_tool_id" integer,
    "component_role" character varying(100),
    "component_config" "jsonb",
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."mission_component" OWNER TO "postgres";


COMMENT ON TABLE "public"."mission_component" IS 'Equipment assigned to specific missions';



CREATE SEQUENCE IF NOT EXISTS "public"."mission_component_component_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."mission_component_component_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."mission_component_component_id_seq" OWNED BY "public"."mission_component"."component_id";



CREATE TABLE IF NOT EXISTS "public"."mission_flight_logs" (
    "log_id" bigint NOT NULL,
    "fk_mission_id" bigint NOT NULL,
    "log_source" character varying(20) NOT NULL,
    "s3_key" "text" NOT NULL,
    "original_filename" "text",
    "flytbase_flight_id" "text",
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "uploaded_by" bigint,
    CONSTRAINT "mission_flight_logs_log_source_check" CHECK ((("log_source")::"text" = ANY ((ARRAY['manual'::character varying, 'flytbase'::character varying])::"text"[])))
);


ALTER TABLE "public"."mission_flight_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."mission_flight_logs_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."mission_flight_logs_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."mission_flight_logs_log_id_seq" OWNED BY "public"."mission_flight_logs"."log_id";



CREATE TABLE IF NOT EXISTS "public"."notification" (
    "notification_id" integer NOT NULL,
    "fk_user_id" integer NOT NULL,
    "notification_type" character varying(50),
    "notification_title" character varying(255),
    "notification_message" "text",
    "notification_data" "jsonb",
    "priority" character varying(20),
    "is_read" boolean DEFAULT false,
    "read_at" timestamp without time zone,
    "action_url" "text",
    "expires_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."notification" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification" IS 'System notifications for users';



CREATE SEQUENCE IF NOT EXISTS "public"."notification_notification_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."notification_notification_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."notification_notification_id_seq" OWNED BY "public"."notification"."notification_id";



CREATE TABLE IF NOT EXISTS "public"."operation_attachment" (
    "attachment_id" integer NOT NULL,
    "fk_operation_id" integer NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "file_key" "text" NOT NULL,
    "file_type" character varying(100),
    "file_size" bigint,
    "file_description" "text",
    "s3_region" character varying(100) NOT NULL,
    "s3_url" "text" NOT NULL,
    "uploaded_by" character varying(100),
    "uploaded_by_user_id" integer,
    "uploaded_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."operation_attachment" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."operation_attachment_attachment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."operation_attachment_attachment_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."operation_attachment_attachment_id_seq" OWNED BY "public"."operation_attachment"."attachment_id";



CREATE TABLE IF NOT EXISTS "public"."org_chart_overrides" (
    "id" integer NOT NULL,
    "owner_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "parent_user_id" integer,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."org_chart_overrides" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."org_chart_overrides_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."org_chart_overrides_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."org_chart_overrides_id_seq" OWNED BY "public"."org_chart_overrides"."id";



CREATE TABLE IF NOT EXISTS "public"."owner" (
    "owner_id" integer NOT NULL,
    "owner_code" character varying(50),
    "owner_name" character varying(255) NOT NULL,
    "owner_legal_name" character varying(255),
    "owner_type" character varying(50),
    "owner_address" "text",
    "owner_city" character varying(100),
    "owner_state" character varying(100),
    "owner_postal_code" character varying(20),
    "fk_country_id" integer,
    "owner_phone" character varying(50),
    "owner_email" character varying(255),
    "owner_website" character varying(255),
    "owner_logo" "text",
    "owner_active" character(1) DEFAULT 'Y'::"bpchar",
    "tax_id" character varying(50),
    "registration_number" character varying(100),
    "license_number" character varying(100),
    "license_expiry" "date",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "drone_atc_enabled" boolean DEFAULT false NOT NULL,
    "easa_operator_code" "text",
    "email_notifications_enabled" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."owner" OWNER TO "postgres";


COMMENT ON TABLE "public"."owner" IS 'Organizations/companies that own operations and assets';



CREATE SEQUENCE IF NOT EXISTS "public"."owner_owner_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."owner_owner_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."owner_owner_id_seq" OWNED BY "public"."owner"."owner_id";



CREATE TABLE IF NOT EXISTS "public"."owner_territorial_unit" (
    "unit_id" integer NOT NULL,
    "fk_owner_id" integer NOT NULL,
    "unit_code" character varying(50),
    "unit_name" character varying(255) NOT NULL,
    "unit_type" character varying(50),
    "unit_address" "text",
    "unit_city" character varying(100),
    "unit_state" character varying(100),
    "unit_postal_code" character varying(20),
    "fk_country_id" integer,
    "unit_phone" character varying(50),
    "unit_email" character varying(255),
    "unit_manager_id" integer,
    "unit_active" character(1) DEFAULT 'Y'::"bpchar",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."owner_territorial_unit" OWNER TO "postgres";


COMMENT ON TABLE "public"."owner_territorial_unit" IS 'Branches, offices, or territorial units within an organization';



CREATE SEQUENCE IF NOT EXISTS "public"."owner_territorial_unit_unit_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."owner_territorial_unit_unit_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."owner_territorial_unit_unit_id_seq" OWNED BY "public"."owner_territorial_unit"."unit_id";



CREATE TABLE IF NOT EXISTS "public"."payload" (
    "payload_id" integer NOT NULL,
    "fk_owner_id" integer,
    "fk_tool_id" integer,
    "payload_code" character varying(50),
    "payload_name" character varying(255) NOT NULL,
    "payload_type" character varying(100),
    "payload_description" "text",
    "manufacturer" character varying(255),
    "model" character varying(255),
    "specifications" "jsonb",
    "weight" numeric(10,3),
    "power_requirements" character varying(100),
    "compatibility" "jsonb",
    "payload_active" character(1) DEFAULT 'Y'::"bpchar",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."payload" OWNER TO "postgres";


COMMENT ON TABLE "public"."payload" IS 'Sensors, cameras, and payloads that can be attached to drones';



CREATE SEQUENCE IF NOT EXISTS "public"."payload_payload_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payload_payload_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payload_payload_id_seq" OWNED BY "public"."payload"."payload_id";



CREATE TABLE IF NOT EXISTS "public"."pilot_declaration" (
    "declaration_id" integer NOT NULL,
    "fk_user_id" integer NOT NULL,
    "fk_tool_id" integer,
    "declaration_type" character varying(50),
    "declaration_date" "date",
    "declaration_data" "jsonb",
    "checklist_completed" boolean DEFAULT false,
    "declared_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."pilot_declaration" OWNER TO "postgres";


COMMENT ON TABLE "public"."pilot_declaration" IS 'Pre-flight declarations and safety checks';



CREATE SEQUENCE IF NOT EXISTS "public"."pilot_declaration_declaration_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pilot_declaration_declaration_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pilot_declaration_declaration_id_seq" OWNED BY "public"."pilot_declaration"."declaration_id";



CREATE TABLE IF NOT EXISTS "public"."pilot_mission" (
    "pilot_mission_id" integer NOT NULL,
    "fk_planning_id" integer,
    "fk_pilot_user_id" integer NOT NULL,
    "fk_tool_id" integer,
    "fk_mission_type_id" integer,
    "fk_mission_category_id" integer,
    "fk_mission_status_id" integer,
    "mission_code" character varying(50),
    "mission_name" character varying(255),
    "mission_description" "text",
    "scheduled_start" timestamp without time zone,
    "actual_start" timestamp without time zone,
    "actual_end" timestamp without time zone,
    "flight_duration" integer,
    "location" "text",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "fk_owner_id" integer NOT NULL,
    "status_name" character varying(100),
    "distance_flown" numeric(10,2),
    "recurring_group_id" "text",
    "mission_date_until" "date",
    "mission_group_label" "text",
    "fk_luc_procedure_id" integer,
    "luc_procedure_progress" "jsonb",
    "luc_completed_at" timestamp without time zone,
    "fk_mission_result_type_id" integer,
    "battery_charge_start" numeric(5,2),
    "battery_charge_end" numeric(5,2),
    "incident_flag" boolean DEFAULT false,
    "rth_unplanned" boolean DEFAULT false,
    "link_loss" boolean DEFAULT false,
    "deviation_flag" boolean DEFAULT false,
    "weather_temperature" numeric(6,2),
    "fk_client_id" integer,
    "mission_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "fk_erp_group_id" integer
);


ALTER TABLE "public"."pilot_mission" OWNER TO "postgres";


COMMENT ON TABLE "public"."pilot_mission" IS 'Individual flight missions executed by pilots';



CREATE TABLE IF NOT EXISTS "public"."pilot_mission_category" (
    "category_id" integer NOT NULL,
    "category_code" character varying(50) NOT NULL,
    "category_name" character varying(100) NOT NULL,
    "category_description" "text",
    "is_active" boolean DEFAULT true,
    "fk_owner_id" integer NOT NULL
);


ALTER TABLE "public"."pilot_mission_category" OWNER TO "postgres";


COMMENT ON TABLE "public"."pilot_mission_category" IS 'Mission categories for organization';



CREATE SEQUENCE IF NOT EXISTS "public"."pilot_mission_category_category_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pilot_mission_category_category_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pilot_mission_category_category_id_seq" OWNED BY "public"."pilot_mission_category"."category_id";



CREATE SEQUENCE IF NOT EXISTS "public"."pilot_mission_pilot_mission_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pilot_mission_pilot_mission_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pilot_mission_pilot_mission_id_seq" OWNED BY "public"."pilot_mission"."pilot_mission_id";



CREATE TABLE IF NOT EXISTS "public"."pilot_mission_planned_template_logbook" (
    "template_id" integer NOT NULL,
    "template_code" character varying(50),
    "template_name" character varying(255) NOT NULL,
    "template_description" "text",
    "template_data" "jsonb",
    "created_by_user_id" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."pilot_mission_planned_template_logbook" OWNER TO "postgres";


COMMENT ON TABLE "public"."pilot_mission_planned_template_logbook" IS 'Reusable mission plan templates';



CREATE SEQUENCE IF NOT EXISTS "public"."pilot_mission_planned_template_logbook_template_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pilot_mission_planned_template_logbook_template_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pilot_mission_planned_template_logbook_template_id_seq" OWNED BY "public"."pilot_mission_planned_template_logbook"."template_id";



CREATE TABLE IF NOT EXISTS "public"."pilot_mission_result" (
    "result_id" integer NOT NULL,
    "fk_pilot_mission_id" integer NOT NULL,
    "result_type" character varying(50),
    "result_description" "text",
    "file_path" "text",
    "file_count" integer,
    "data_size" bigint,
    "quality_score" numeric(5,2),
    "processing_status" character varying(50),
    "result_metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."pilot_mission_result" OWNER TO "postgres";


COMMENT ON TABLE "public"."pilot_mission_result" IS 'Results and data collected from missions';



CREATE SEQUENCE IF NOT EXISTS "public"."pilot_mission_result_result_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pilot_mission_result_result_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pilot_mission_result_result_id_seq" OWNED BY "public"."pilot_mission_result"."result_id";



CREATE TABLE IF NOT EXISTS "public"."pilot_mission_result_type" (
    "result_type_id" integer NOT NULL,
    "fk_owner_id" integer,
    "result_type_code" character varying(50) NOT NULL,
    "result_type_desc" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."pilot_mission_result_type" OWNER TO "postgres";


COMMENT ON TABLE "public"."pilot_mission_result_type" IS 'Mission result type templates (success, failure, partial, etc.)';



CREATE SEQUENCE IF NOT EXISTS "public"."pilot_mission_result_type_result_type_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pilot_mission_result_type_result_type_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pilot_mission_result_type_result_type_id_seq" OWNED BY "public"."pilot_mission_result_type"."result_type_id";



CREATE TABLE IF NOT EXISTS "public"."pilot_mission_status" (
    "status_id" integer NOT NULL,
    "status_code" character varying(50) NOT NULL,
    "status_name" character varying(100) NOT NULL,
    "status_description" "text",
    "status_order" integer,
    "is_final_status" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "fk_owner_id" integer
);


ALTER TABLE "public"."pilot_mission_status" OWNER TO "postgres";


COMMENT ON TABLE "public"."pilot_mission_status" IS 'Status workflow for pilot missions';



CREATE SEQUENCE IF NOT EXISTS "public"."pilot_mission_status_status_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pilot_mission_status_status_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pilot_mission_status_status_id_seq" OWNED BY "public"."pilot_mission_status"."status_id";



CREATE TABLE IF NOT EXISTS "public"."pilot_mission_type" (
    "mission_type_id" integer NOT NULL,
    "type_code" character varying(50) NOT NULL,
    "type_name" character varying(100) NOT NULL,
    "type_description" "text",
    "required_certifications" "jsonb",
    "is_active" boolean DEFAULT true,
    "fk_owner_id" integer NOT NULL
);


ALTER TABLE "public"."pilot_mission_type" OWNER TO "postgres";


COMMENT ON TABLE "public"."pilot_mission_type" IS 'Types of flight missions';



CREATE SEQUENCE IF NOT EXISTS "public"."pilot_mission_type_mission_type_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pilot_mission_type_mission_type_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pilot_mission_type_mission_type_id_seq" OWNED BY "public"."pilot_mission_type"."mission_type_id";



CREATE TABLE IF NOT EXISTS "public"."pilot_status" (
    "status_id" integer NOT NULL,
    "status_code" character varying(50) NOT NULL,
    "status_name" character varying(100) NOT NULL,
    "status_description" "text",
    "status_color" character varying(20),
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."pilot_status" OWNER TO "postgres";


COMMENT ON TABLE "public"."pilot_status" IS 'Pilot certification and operational status';



CREATE SEQUENCE IF NOT EXISTS "public"."pilot_status_status_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pilot_status_status_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pilot_status_status_id_seq" OWNED BY "public"."pilot_status"."status_id";



CREATE TABLE IF NOT EXISTS "public"."pilot_vehicle_status" (
    "vehicle_status_id" integer NOT NULL,
    "status_code" character varying(50) NOT NULL,
    "status_name" character varying(100) NOT NULL,
    "status_description" "text",
    "is_operational" boolean DEFAULT true,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."pilot_vehicle_status" OWNER TO "postgres";


COMMENT ON TABLE "public"."pilot_vehicle_status" IS 'Drone/vehicle operational status';



CREATE SEQUENCE IF NOT EXISTS "public"."pilot_vehicle_status_vehicle_status_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pilot_vehicle_status_vehicle_status_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pilot_vehicle_status_vehicle_status_id_seq" OWNED BY "public"."pilot_vehicle_status"."vehicle_status_id";



CREATE TABLE IF NOT EXISTS "public"."planning" (
    "planning_id" integer NOT NULL,
    "fk_owner_id" integer NOT NULL,
    "fk_client_id" integer,
    "fk_evaluation_id" integer,
    "planning_code" character varying(50),
    "planning_name" character varying(255) NOT NULL,
    "planning_description" "text",
    "planning_type" character varying(50),
    "planning_status" character varying(50),
    "planned_date" "date",
    "created_by_user_id" integer,
    "planning_active" character(1) DEFAULT 'Y'::"bpchar",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "assigned_to_user_id" integer,
    "planning_json" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."planning" OWNER TO "postgres";


COMMENT ON TABLE "public"."planning" IS 'Flight plans and mission planning';



CREATE TABLE IF NOT EXISTS "public"."planning_logbook" (
    "mission_planning_id" integer NOT NULL,
    "fk_planning_id" integer NOT NULL,
    "fk_evaluation_id" integer,
    "fk_client_id" integer,
    "fk_owner_id" integer,
    "fk_user_id" integer,
    "fk_tool_id" integer,
    "mission_planning_code" character varying(50),
    "mission_planning_desc" "text",
    "mission_planning_active" character(1) DEFAULT 'Y'::"bpchar",
    "mission_planning_ver" integer DEFAULT 1,
    "mission_planning_folder" "text",
    "mission_planning_filename" character varying(255),
    "mission_planning_filesize" bigint,
    "mission_planning_limit_json" "jsonb",
    "waypoints" "jsonb",
    "flight_parameters" "jsonb",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "mission_planning_s3_key" "text",
    "mission_planning_s3_url" "text"
);


ALTER TABLE "public"."planning_logbook" OWNER TO "postgres";


COMMENT ON TABLE "public"."planning_logbook" IS 'Detailed mission plans with waypoints and parameters';



CREATE SEQUENCE IF NOT EXISTS "public"."planning_logbook_mission_planning_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."planning_logbook_mission_planning_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."planning_logbook_mission_planning_id_seq" OWNED BY "public"."planning_logbook"."mission_planning_id";



CREATE SEQUENCE IF NOT EXISTS "public"."planning_planning_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."planning_planning_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."planning_planning_id_seq" OWNED BY "public"."planning"."planning_id";



CREATE TABLE IF NOT EXISTS "public"."planning_test_logbook" (
    "test_id" integer NOT NULL,
    "fk_planning_id" integer NOT NULL,
    "test_code" character varying(50),
    "test_description" "text",
    "test_date" "date",
    "test_status" character varying(50),
    "test_results" "jsonb",
    "tested_by_user_id" integer,
    "test_notes" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "fk_owner_id" integer,
    "fk_mission_planning_id" integer,
    "fk_evaluation_id" integer,
    "fk_pic_id" integer,
    "fk_observer_id" integer,
    "fk_user_id" integer,
    "mission_test_date_start" "date",
    "mission_test_date_end" "date",
    "mission_test_result" character varying(50),
    "mission_test_folder" "text",
    "mission_test_filename" character varying(255),
    "mission_test_filesize" numeric(10,2),
    "mission_test_s3_key" "text",
    "mission_test_s3_url" "text"
);


ALTER TABLE "public"."planning_test_logbook" OWNER TO "postgres";


COMMENT ON TABLE "public"."planning_test_logbook" IS 'Test flights and mission validation records';



COMMENT ON COLUMN "public"."planning_test_logbook"."fk_owner_id" IS 'Owner org for filtering';



COMMENT ON COLUMN "public"."planning_test_logbook"."fk_mission_planning_id" IS 'Links to specific mission planning logbook entry';



COMMENT ON COLUMN "public"."planning_test_logbook"."fk_pic_id" IS 'Pilot in Command for this test';



COMMENT ON COLUMN "public"."planning_test_logbook"."fk_observer_id" IS 'Observer for this test';



COMMENT ON COLUMN "public"."planning_test_logbook"."mission_test_result" IS 'Test outcome: error (Negative) or success (Positive)';



COMMENT ON COLUMN "public"."planning_test_logbook"."mission_test_s3_key" IS 'S3 object key for generating presigned download URLs on demand';



COMMENT ON COLUMN "public"."planning_test_logbook"."mission_test_s3_url" IS 'Non-presigned S3 URL stored for reference only; use presigned URLs for actual access';



CREATE SEQUENCE IF NOT EXISTS "public"."planning_test_logbook_test_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."planning_test_logbook_test_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."planning_test_logbook_test_id_seq" OWNED BY "public"."planning_test_logbook"."test_id";



CREATE TABLE IF NOT EXISTS "public"."procedure_document" (
    "id" integer NOT NULL,
    "doc_key" "text" NOT NULL,
    "source_file" "text" NOT NULL,
    "section_title" "text" NOT NULL,
    "section_number" "text",
    "html_content" "text" NOT NULL,
    "plain_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."procedure_document" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."procedure_document_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."procedure_document_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."procedure_document_id_seq" OWNED BY "public"."procedure_document"."id";



CREATE TABLE IF NOT EXISTS "public"."repository_file" (
    "file_id" integer NOT NULL,
    "fk_owner_id" integer,
    "fk_file_type_id" integer,
    "file_name" character varying(255) NOT NULL,
    "file_path" "text" NOT NULL,
    "file_size" bigint,
    "file_hash" character varying(64),
    "mime_type" character varying(100),
    "file_description" "text",
    "file_category" character varying(100),
    "tags" "jsonb",
    "uploaded_by_user_id" integer,
    "is_public" boolean DEFAULT false,
    "download_count" integer DEFAULT 0,
    "file_metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."repository_file" OWNER TO "postgres";


COMMENT ON TABLE "public"."repository_file" IS 'Central file repository';



CREATE SEQUENCE IF NOT EXISTS "public"."repository_file_file_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."repository_file_file_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."repository_file_file_id_seq" OWNED BY "public"."repository_file"."file_id";



CREATE TABLE IF NOT EXISTS "public"."repository_file_type" (
    "file_type_id" integer NOT NULL,
    "file_type_code" character varying(50),
    "file_type_name" character varying(100) NOT NULL,
    "file_type_description" "text",
    "allowed_extensions" "jsonb",
    "max_file_size" bigint,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."repository_file_type" OWNER TO "postgres";


COMMENT ON TABLE "public"."repository_file_type" IS 'File type definitions for repository';



CREATE SEQUENCE IF NOT EXISTS "public"."repository_file_type_file_type_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."repository_file_type_file_type_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."repository_file_type_file_type_id_seq" OWNED BY "public"."repository_file_type"."file_type_id";



CREATE TABLE IF NOT EXISTS "public"."safety_action" (
    "action_id" integer NOT NULL,
    "fk_report_id" integer NOT NULL,
    "action_type" character varying(50),
    "action_description" "text",
    "action_priority" character varying(20),
    "action_status" character varying(50),
    "assigned_to_user_id" integer,
    "due_date" "date",
    "completed_date" "date",
    "completion_notes" "text",
    "verification_required" boolean DEFAULT false,
    "verified_by_user_id" integer,
    "verified_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."safety_action" OWNER TO "postgres";


COMMENT ON TABLE "public"."safety_action" IS 'Corrective and preventive actions from safety reports';



CREATE SEQUENCE IF NOT EXISTS "public"."safety_action_action_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."safety_action_action_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."safety_action_action_id_seq" OWNED BY "public"."safety_action"."action_id";



CREATE TABLE IF NOT EXISTS "public"."safety_report" (
    "report_id" integer NOT NULL,
    "fk_owner_id" integer,
    "fk_pilot_mission_id" integer,
    "report_code" character varying(50),
    "report_type" character varying(50),
    "incident_date" "date",
    "incident_time" time without time zone,
    "location" "text",
    "severity" character varying(20),
    "description" "text",
    "immediate_actions" "text",
    "reported_by_user_id" integer,
    "investigated_by_user_id" integer,
    "investigation_findings" "text",
    "root_cause" "text",
    "report_status" character varying(50),
    "attachments" "jsonb",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."safety_report" OWNER TO "postgres";


COMMENT ON TABLE "public"."safety_report" IS 'Safety incident and hazard reports';



CREATE SEQUENCE IF NOT EXISTS "public"."safety_report_report_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."safety_report_report_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."safety_report_report_id_seq" OWNED BY "public"."safety_report"."report_id";



CREATE TABLE IF NOT EXISTS "public"."schema_chunks" (
    "id" "text" NOT NULL,
    "content" "text" NOT NULL,
    "table_name" "text",
    "column_name" "text",
    "kind" "text",
    "embedding" "public"."vector"(768) NOT NULL
);


ALTER TABLE "public"."schema_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."spi_kpi" (
    "kpi_id" integer NOT NULL,
    "fk_definition_id" integer NOT NULL,
    "fk_owner_id" integer,
    "measurement_date" "date" NOT NULL,
    "actual_value" numeric(15,4),
    "target_value" numeric(15,4),
    "threshold_min" numeric(15,4),
    "threshold_max" numeric(15,4),
    "status" character varying(50),
    "variance" numeric(15,4),
    "trend" character varying(20),
    "notes" "text",
    "recorded_by_user_id" integer,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."spi_kpi" OWNER TO "postgres";


COMMENT ON TABLE "public"."spi_kpi" IS 'Actual KPI/SPI measurement values';



CREATE TABLE IF NOT EXISTS "public"."spi_kpi_definition" (
    "definition_id" integer NOT NULL,
    "fk_owner_id" integer,
    "kpi_code" character varying(50),
    "kpi_name" character varying(255) NOT NULL,
    "kpi_description" "text",
    "kpi_category" character varying(100),
    "kpi_type" character varying(50),
    "measurement_unit" character varying(50),
    "calculation_formula" "text",
    "data_source" character varying(255),
    "frequency" character varying(50),
    "target_direction" character varying(20),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "target_value" numeric(15,4) DEFAULT 0
);


ALTER TABLE "public"."spi_kpi_definition" OWNER TO "postgres";


COMMENT ON TABLE "public"."spi_kpi_definition" IS 'KPI and SPI metric definitions';



CREATE SEQUENCE IF NOT EXISTS "public"."spi_kpi_definition_definition_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."spi_kpi_definition_definition_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."spi_kpi_definition_definition_id_seq" OWNED BY "public"."spi_kpi_definition"."definition_id";



CREATE SEQUENCE IF NOT EXISTS "public"."spi_kpi_kpi_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."spi_kpi_kpi_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."spi_kpi_kpi_id_seq" OWNED BY "public"."spi_kpi"."kpi_id";



CREATE TABLE IF NOT EXISTS "public"."spi_kpi_log" (
    "log_id" integer NOT NULL,
    "fk_kpi_id" integer NOT NULL,
    "log_type" character varying(50),
    "log_description" "text",
    "previous_value" numeric(15,4),
    "new_value" numeric(15,4),
    "changed_by_user_id" integer,
    "changed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."spi_kpi_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."spi_kpi_log" IS 'Audit trail for KPI changes';



CREATE SEQUENCE IF NOT EXISTS "public"."spi_kpi_log_log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."spi_kpi_log_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."spi_kpi_log_log_id_seq" OWNED BY "public"."spi_kpi_log"."log_id";



CREATE TABLE IF NOT EXISTS "public"."spi_kpi_target_proposal" (
    "proposal_id" integer NOT NULL,
    "fk_definition_id" integer NOT NULL,
    "proposal_year" integer,
    "proposal_period" character varying(50),
    "proposed_target" numeric(15,4),
    "proposed_by_user_id" integer,
    "justification" "text",
    "proposal_status" character varying(50),
    "approved_by_user_id" integer,
    "approved_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."spi_kpi_target_proposal" OWNER TO "postgres";


COMMENT ON TABLE "public"."spi_kpi_target_proposal" IS 'Proposed KPI targets for approval';



CREATE SEQUENCE IF NOT EXISTS "public"."spi_kpi_target_proposal_proposal_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."spi_kpi_target_proposal_proposal_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."spi_kpi_target_proposal_proposal_id_seq" OWNED BY "public"."spi_kpi_target_proposal"."proposal_id";



CREATE TABLE IF NOT EXISTS "public"."team" (
    "team_id" integer NOT NULL,
    "fk_owner_id" integer NOT NULL,
    "team_code" character varying(50),
    "team_name" character varying(255) NOT NULL,
    "team_description" "text",
    "team_leader_id" integer,
    "team_type" character varying(50),
    "team_active" character(1) DEFAULT 'Y'::"bpchar",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."team" OWNER TO "postgres";


COMMENT ON TABLE "public"."team" IS 'Teams for organizing users into working groups';



CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "team_member_id" integer NOT NULL,
    "fk_team_id" integer NOT NULL,
    "fk_user_id" integer NOT NULL,
    "role_in_team" character varying(100),
    "joined_date" "date" DEFAULT CURRENT_DATE,
    "left_date" "date",
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_members" IS 'Team membership tracking';



CREATE SEQUENCE IF NOT EXISTS "public"."team_members_team_member_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."team_members_team_member_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."team_members_team_member_id_seq" OWNED BY "public"."team_members"."team_member_id";



CREATE SEQUENCE IF NOT EXISTS "public"."team_team_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."team_team_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."team_team_id_seq" OWNED BY "public"."team"."team_id";



CREATE TABLE IF NOT EXISTS "public"."ticket_attachment" (
    "attachment_id" integer NOT NULL,
    "fk_ticket_id" integer NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "file_key" "text" NOT NULL,
    "file_type" character varying(100),
    "file_size" bigint,
    "file_description" "text",
    "s3_region" character varying(100) NOT NULL,
    "s3_url" "text" NOT NULL,
    "uploaded_by" character varying(100),
    "uploaded_by_user_id" integer,
    "uploaded_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."ticket_attachment" OWNER TO "postgres";


COMMENT ON TABLE "public"."ticket_attachment" IS 'Files attached to maintenance tickets, stored in AWS S3 bucket readi-storage';



COMMENT ON COLUMN "public"."ticket_attachment"."file_key" IS 'S3 object key used to generate presigned download URLs on demand';



COMMENT ON COLUMN "public"."ticket_attachment"."s3_url" IS 'Non-presigned S3 URL stored for reference only; use presigned URLs for actual access';



CREATE SEQUENCE IF NOT EXISTS "public"."ticket_attachment_attachment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ticket_attachment_attachment_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ticket_attachment_attachment_id_seq" OWNED BY "public"."ticket_attachment"."attachment_id";



CREATE TABLE IF NOT EXISTS "public"."tool" (
    "tool_id" integer NOT NULL,
    "fk_owner_id" integer NOT NULL,
    "fk_model_id" integer,
    "fk_status_id" integer,
    "tool_code" character varying(50),
    "tool_name" character varying(255),
    "tool_description" "text",
    "location" character varying(255),
    "tool_active" character(1) DEFAULT 'Y'::"bpchar",
    "tool_metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "assigned_client_id" integer,
    "filekey" "text",
    "fileurl" "text"
);


ALTER TABLE "public"."tool" OWNER TO "postgres";


COMMENT ON TABLE "public"."tool" IS 'Individual equipment/tool instances';



COMMENT ON COLUMN "public"."tool"."assigned_client_id" IS 'Specific client assigned to this tool for operational use';



COMMENT ON COLUMN "public"."tool"."filekey" IS 'The storage key/path for the uploaded file';



COMMENT ON COLUMN "public"."tool"."fileurl" IS 'The public or signed URL for accessing the file';



CREATE TABLE IF NOT EXISTS "public"."tool_component" (
    "component_id" integer NOT NULL,
    "fk_tool_id" integer NOT NULL,
    "component_code" character varying(50),
    "component_name" character varying(255) NOT NULL,
    "component_type" character varying(100),
    "component_description" "text",
    "serial_number" character varying(100),
    "installation_date" "date",
    "component_active" character(1) DEFAULT 'Y'::"bpchar",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "component_metadata" "jsonb",
    "current_usage_hours" numeric,
    "expected_lifespan_hours" integer,
    "maintenance_cycle" character varying(20),
    "maintenance_cycle_hour" numeric,
    "maintenance_cycle_day" numeric,
    "maintenance_cycle_flight" numeric,
    "current_maintenance_hours" numeric DEFAULT 0,
    "current_maintenance_days" numeric DEFAULT 0,
    "current_maintenance_flights" numeric DEFAULT 0,
    "last_maintenance_date" timestamp without time zone,
    "dcc_drone_id" "uuid",
    "drone_registration_code" "text",
    "drc_synced_at" timestamp with time zone
);


ALTER TABLE "public"."tool_component" OWNER TO "postgres";


COMMENT ON TABLE "public"."tool_component" IS 'Components/parts that make up equipment';



COMMENT ON COLUMN "public"."tool_component"."maintenance_cycle" IS 'Maintenance cycle type: HOURS, DAYS, FLIGHTS, MIXED, NONE — inherited from model, editable per component';



COMMENT ON COLUMN "public"."tool_component"."maintenance_cycle_hour" IS 'Maintenance cycle hours threshold (0–24)';



COMMENT ON COLUMN "public"."tool_component"."maintenance_cycle_day" IS 'Maintenance cycle days threshold (0–30)';



COMMENT ON COLUMN "public"."tool_component"."maintenance_cycle_flight" IS 'Maintenance cycle flights threshold (0–10)';



COMMENT ON COLUMN "public"."tool_component"."current_maintenance_hours" IS 'Accumulated flight hours since last maintenance';



COMMENT ON COLUMN "public"."tool_component"."current_maintenance_days" IS 'Accumulated days since last maintenance';



COMMENT ON COLUMN "public"."tool_component"."current_maintenance_flights" IS 'Accumulated flights since last maintenance';



CREATE SEQUENCE IF NOT EXISTS "public"."tool_component_component_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tool_component_component_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tool_component_component_id_seq" OWNED BY "public"."tool_component"."component_id";



CREATE TABLE IF NOT EXISTS "public"."tool_erp" (
    "erp_id" integer NOT NULL,
    "fk_tool_id" integer NOT NULL,
    "erp_system" character varying(100),
    "erp_reference_id" character varying(100),
    "erp_data" "jsonb",
    "sync_status" character varying(50),
    "last_sync_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."tool_erp" OWNER TO "postgres";


COMMENT ON TABLE "public"."tool_erp" IS 'Integration data with external ERP systems';



CREATE SEQUENCE IF NOT EXISTS "public"."tool_erp_erp_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tool_erp_erp_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tool_erp_erp_id_seq" OWNED BY "public"."tool_erp"."erp_id";



CREATE TABLE IF NOT EXISTS "public"."tool_maintenance" (
    "maintenance_id" integer NOT NULL,
    "fk_tool_id" integer NOT NULL,
    "maintenance_type" character varying(100) NOT NULL,
    "maintenance_description" "text",
    "scheduled_date" "date",
    "completed_date" "date",
    "performed_by_user_id" integer,
    "maintenance_status" character varying(50),
    "maintenance_cost" numeric(15,2),
    "maintenance_notes" "text",
    "next_maintenance_date" "date",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."tool_maintenance" OWNER TO "postgres";


COMMENT ON TABLE "public"."tool_maintenance" IS 'Scheduled and completed maintenance for equipment';



CREATE SEQUENCE IF NOT EXISTS "public"."tool_maintenance_maintenance_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tool_maintenance_maintenance_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tool_maintenance_maintenance_id_seq" OWNED BY "public"."tool_maintenance"."maintenance_id";



CREATE TABLE IF NOT EXISTS "public"."tool_model" (
    "model_id" integer NOT NULL,
    "model_code" character varying(50),
    "model_name" character varying(255) NOT NULL,
    "manufacturer" character varying(255),
    "model_description" "text",
    "specifications" "jsonb",
    "model_active" character(1) DEFAULT 'Y'::"bpchar",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."tool_model" OWNER TO "postgres";


COMMENT ON TABLE "public"."tool_model" IS 'Specific models of equipment';



CREATE SEQUENCE IF NOT EXISTS "public"."tool_model_model_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tool_model_model_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tool_model_model_id_seq" OWNED BY "public"."tool_model"."model_id";



CREATE TABLE IF NOT EXISTS "public"."tool_status" (
    "status_id" integer NOT NULL,
    "status_code" character varying(50) NOT NULL,
    "status_name" character varying(100) NOT NULL,
    "status_description" "text",
    "status_color" character varying(20),
    "status_icon" character varying(50),
    "status_order" integer,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."tool_status" OWNER TO "postgres";


COMMENT ON TABLE "public"."tool_status" IS 'Status definitions for equipment (available, in-use, maintenance, etc.)';



CREATE SEQUENCE IF NOT EXISTS "public"."tool_status_status_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tool_status_status_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tool_status_status_id_seq" OWNED BY "public"."tool_status"."status_id";



CREATE SEQUENCE IF NOT EXISTS "public"."tool_tool_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tool_tool_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tool_tool_id_seq" OWNED BY "public"."tool"."tool_id";



CREATE TABLE IF NOT EXISTS "public"."training" (
    "training_id" integer NOT NULL,
    "fk_owner_id" integer,
    "training_code" character varying(50),
    "training_name" character varying(255) NOT NULL,
    "training_description" "text",
    "training_type" character varying(50),
    "training_duration" integer,
    "training_cost" numeric(15,2),
    "trainer_user_id" integer,
    "training_materials" "jsonb",
    "certifications_awarded" "jsonb",
    "training_active" character(1) DEFAULT 'Y'::"bpchar",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "certificate_type" character varying(50)
);


ALTER TABLE "public"."training" OWNER TO "postgres";


COMMENT ON TABLE "public"."training" IS 'Training programs and courses';



CREATE TABLE IF NOT EXISTS "public"."training_attendance" (
    "attendance_id" integer NOT NULL,
    "fk_training_id" integer NOT NULL,
    "fk_user_id" integer NOT NULL,
    "training_session_date" "date",
    "attendance_status" character varying(50),
    "completion_status" character varying(50),
    "score" numeric(5,2),
    "feedback" "text",
    "certification_issued" boolean DEFAULT false,
    "certification_number" character varying(100),
    "certification_date" "date",
    "certification_expiry" "date",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."training_attendance" OWNER TO "postgres";


COMMENT ON TABLE "public"."training_attendance" IS 'Training attendance and completion records';



CREATE SEQUENCE IF NOT EXISTS "public"."training_attendance_attendance_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."training_attendance_attendance_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."training_attendance_attendance_id_seq" OWNED BY "public"."training_attendance"."attendance_id";



CREATE SEQUENCE IF NOT EXISTS "public"."training_training_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."training_training_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."training_training_id_seq" OWNED BY "public"."training"."training_id";



CREATE TABLE IF NOT EXISTS "public"."transaction_signs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" integer NOT NULL,
    "owner_id" integer NOT NULL,
    "user_name" "text",
    "action_type" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text",
    "jwt_token" "text" NOT NULL,
    "payload_preview" "jsonb",
    "public_key_snapshot" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."transaction_signs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."turn_users" (
    "turn_user_id" integer NOT NULL,
    "fk_turn_id" integer NOT NULL,
    "fk_user_id" integer NOT NULL,
    "assignment_date" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."turn_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."turn_users" IS 'User assignments to turns/shifts';



CREATE SEQUENCE IF NOT EXISTS "public"."turn_users_turn_user_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."turn_users_turn_user_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."turn_users_turn_user_id_seq" OWNED BY "public"."turn_users"."turn_user_id";



CREATE TABLE IF NOT EXISTS "public"."turns" (
    "turn_id" integer NOT NULL,
    "fk_owner_id" integer,
    "turn_code" character varying(50),
    "turn_name" character varying(255) NOT NULL,
    "turn_description" "text",
    "turn_start_time" time without time zone,
    "turn_end_time" time without time zone,
    "turn_type" character varying(50),
    "turn_active" character(1) DEFAULT 'Y'::"bpchar",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."turns" OWNER TO "postgres";


COMMENT ON TABLE "public"."turns" IS 'Turn/shift definitions';



CREATE SEQUENCE IF NOT EXISTS "public"."turns_turn_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."turns_turn_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."turns_turn_id_seq" OWNED BY "public"."turns"."turn_id";



CREATE TABLE IF NOT EXISTS "public"."user_authorization_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" integer NOT NULL,
    "owner_id" integer NOT NULL,
    "encrypted_private_key" "text" NOT NULL,
    "public_key" "text" NOT NULL,
    "salt" "text" NOT NULL,
    "iv" "text" NOT NULL,
    "key_fingerprint" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_authorization_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_device" (
    "device_id" integer NOT NULL,
    "fk_user_id" integer NOT NULL,
    "device_name" character varying(255),
    "device_type" character varying(50),
    "device_token" "text",
    "device_os" character varying(50),
    "device_model" character varying(100),
    "last_active" timestamp without time zone,
    "registered_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."user_device" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_device" IS 'Registered devices for push notifications and tracking';



CREATE SEQUENCE IF NOT EXISTS "public"."user_device_device_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_device_device_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_device_device_id_seq" OWNED BY "public"."user_device"."device_id";



CREATE TABLE IF NOT EXISTS "public"."user_owner" (
    "user_owner_id" integer NOT NULL,
    "fk_user_id" integer NOT NULL,
    "fk_owner_id" integer NOT NULL,
    "relationship_type" character varying(50),
    "role_in_organization" character varying(100),
    "is_primary" boolean DEFAULT false,
    "start_date" "date",
    "end_date" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_owner" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_owner" IS 'Maps users to organizations with their roles';



CREATE SEQUENCE IF NOT EXISTS "public"."user_owner_user_owner_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_owner_user_owner_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_owner_user_owner_id_seq" OWNED BY "public"."user_owner"."user_owner_id";



CREATE TABLE IF NOT EXISTS "public"."user_permessi" (
    "permission_id" integer NOT NULL,
    "fk_user_id" integer NOT NULL,
    "permission_code" character varying(100) NOT NULL,
    "permission_desc" "text",
    "permission_active" character(1) DEFAULT 'Y'::"bpchar",
    "granted_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "granted_by" integer,
    "expires_at" timestamp without time zone
);


ALTER TABLE "public"."user_permessi" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_permessi" IS 'Granular user permissions for access control';



CREATE SEQUENCE IF NOT EXISTS "public"."user_permessi_permission_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_permessi_permission_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_permessi_permission_id_seq" OWNED BY "public"."user_permessi"."permission_id";



CREATE TABLE IF NOT EXISTS "public"."user_qualification" (
    "qualification_id" integer NOT NULL,
    "fk_user_id" integer NOT NULL,
    "fk_owner_id" integer NOT NULL,
    "qualification_name" character varying(255) NOT NULL,
    "qualification_type" character varying(50) NOT NULL,
    "description" "text",
    "start_date" "date",
    "expiry_date" "date",
    "status" character varying(20) DEFAULT 'Active'::character varying NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_qualification" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_qualification_qualification_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_qualification_qualification_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_qualification_qualification_id_seq" OWNED BY "public"."user_qualification"."qualification_id";



CREATE TABLE IF NOT EXISTS "public"."user_session" (
    "session_id" integer NOT NULL,
    "fk_user_id" integer NOT NULL,
    "session_token" character varying(255) NOT NULL,
    "device_info" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "login_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "logout_at" timestamp without time zone,
    "expires_at" timestamp without time zone NOT NULL,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."user_session" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_session" IS 'Active user sessions for authentication tracking';



CREATE SEQUENCE IF NOT EXISTS "public"."user_session_session_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_session_session_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_session_session_id_seq" OWNED BY "public"."user_session"."session_id";



CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "setting_id" integer NOT NULL,
    "fk_user_id" integer NOT NULL,
    "setting_key" character varying(100) NOT NULL,
    "setting_value" "text",
    "setting_type" character varying(50) DEFAULT 'string'::character varying,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_settings" IS 'User-specific settings and preferences';



CREATE SEQUENCE IF NOT EXISTS "public"."user_settings_setting_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_settings_setting_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_settings_setting_id_seq" OWNED BY "public"."user_settings"."setting_id";



CREATE TABLE IF NOT EXISTS "public"."users" (
    "user_id" integer NOT NULL,
    "username" character varying(100),
    "email" character varying(255),
    "password_hash" character varying(255),
    "first_name" character varying(100),
    "last_name" character varying(100),
    "phone" character varying(50),
    "user_active" character(1) DEFAULT 'Y'::"bpchar",
    "user_role" character varying(50),
    "last_login" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "auth_user_id" "uuid",
    "fk_owner_id" integer,
    "fk_client_id" integer,
    "fk_user_profile_id" integer,
    "user_type" character varying(100),
    "_key_" "text",
    "user_unique_code" character varying(255),
    "fk_territorial_unit" integer,
    "is_root" character(1) DEFAULT 'N'::"bpchar",
    "is_viewer" character(1) DEFAULT 'N'::"bpchar",
    "is_default_user" character(1) DEFAULT 'N'::"bpchar",
    "is_manager" character(1) DEFAULT 'N'::"bpchar",
    "user_timezone" character varying(64) DEFAULT 'IST'::character varying,
    "last_logout_at" timestamp with time zone,
    "flytbase_api_token" "text",
    "flytbase_org_id" "text",
    "flytbase_token_name" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'Core user accounts table with authentication details';



COMMENT ON COLUMN "public"."users"."flytbase_api_token" IS 'AES-256-GCM encrypted. Format: iv_hex:authTag_hex:ciphertext_hex';



COMMENT ON COLUMN "public"."users"."flytbase_org_id" IS 'FlytBase Organization ID (plain text, e.g. 684fbfd4c264f8f677beb444)';



CREATE TABLE IF NOT EXISTS "public"."users_profile" (
    "profile_id" integer NOT NULL,
    "fk_user_id" integer NOT NULL,
    "profile_picture" "text",
    "bio" "text",
    "address" "text",
    "city" character varying(100),
    "state" character varying(100),
    "postal_code" character varying(20),
    "fk_country_id" integer,
    "date_of_birth" "date",
    "emergency_contact" character varying(255),
    "emergency_phone" character varying(50),
    "certifications" "jsonb",
    "skills" "jsonb",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "user_signature" "text",
    "user_primary_certification" character varying(300)
);


ALTER TABLE "public"."users_profile" OWNER TO "postgres";


COMMENT ON TABLE "public"."users_profile" IS 'Extended user profile information including certifications and skills';



CREATE SEQUENCE IF NOT EXISTS "public"."users_profile_profile_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."users_profile_profile_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."users_profile_profile_id_seq" OWNED BY "public"."users_profile"."profile_id";



CREATE SEQUENCE IF NOT EXISTS "public"."users_user_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."users_user_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."users_user_id_seq" OWNED BY "public"."users"."user_id";



CREATE TABLE IF NOT EXISTS "public"."v_training_session_stats" (
    "stat_id" integer NOT NULL,
    "placeholder_column" character varying(1)
);


ALTER TABLE "public"."v_training_session_stats" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."v_training_session_stats_stat_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."v_training_session_stats_stat_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."v_training_session_stats_stat_id_seq" OWNED BY "public"."v_training_session_stats"."stat_id";



ALTER TABLE ONLY "public"."ai_token_usage" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ai_token_usage_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."alert_log" ALTER COLUMN "alert_id" SET DEFAULT "nextval"('"public"."alert_log_alert_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."api_keys" ALTER COLUMN "api_key_id" SET DEFAULT "nextval"('"public"."api_keys_api_key_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."assignment" ALTER COLUMN "assignment_id" SET DEFAULT "nextval"('"public"."assignment_assignment_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."backup_log" ALTER COLUMN "backup_id" SET DEFAULT "nextval"('"public"."backup_log_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."calendar_shift" ALTER COLUMN "shift_id" SET DEFAULT "nextval"('"public"."calendar_shift_shift_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."checklist" ALTER COLUMN "checklist_id" SET DEFAULT "nextval"('"public"."checklist_checklist_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."client" ALTER COLUMN "client_id" SET DEFAULT "nextval"('"public"."client_client_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."code_index" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."code_index_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."communication" ALTER COLUMN "communication_id" SET DEFAULT "nextval"('"public"."communication_communication_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."communication_general" ALTER COLUMN "communication_id" SET DEFAULT "nextval"('"public"."communication_general_communication_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."compliance_evidence" ALTER COLUMN "evidence_id" SET DEFAULT "nextval"('"public"."compliance_evidence_evidence_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."compliance_requirement" ALTER COLUMN "requirement_id" SET DEFAULT "nextval"('"public"."compliance_requirement_requirement_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."compliance_status_log" ALTER COLUMN "log_id" SET DEFAULT "nextval"('"public"."compliance_status_log_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."component_type_config" ALTER COLUMN "type_id" SET DEFAULT "nextval"('"public"."component_type_config_type_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."controlroom_drone" ALTER COLUMN "controlroom_drone_id" SET DEFAULT "nextval"('"public"."controlroom_drone_controlroom_drone_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."controlroom_meta" ALTER COLUMN "meta_id" SET DEFAULT "nextval"('"public"."controlroom_meta_meta_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."countries" ALTER COLUMN "country_id" SET DEFAULT "nextval"('"public"."countries_country_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."dcc_integrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."dcc_integrations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."deleted_owner" ALTER COLUMN "deleted_id" SET DEFAULT "nextval"('"public"."deleted_owner_deleted_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."deleted_user" ALTER COLUMN "deleted_id" SET DEFAULT "nextval"('"public"."deleted_user_deleted_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."drone_class_config" ALTER COLUMN "class_id" SET DEFAULT "nextval"('"public"."drone_class_config_class_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."erp_location_group" ALTER COLUMN "group_id" SET DEFAULT "nextval"('"public"."erp_location_group_group_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."erp_location_group_contact" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."erp_location_group_contact_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."erp_location_group_location" ALTER COLUMN "location_id" SET DEFAULT "nextval"('"public"."erp_location_group_location_location_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."evaluation" ALTER COLUMN "evaluation_id" SET DEFAULT "nextval"('"public"."evaluation_evaluation_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."evaluation_action" ALTER COLUMN "action_id" SET DEFAULT "nextval"('"public"."evaluation_action_action_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."evaluation_file" ALTER COLUMN "file_id" SET DEFAULT "nextval"('"public"."evaluation_file_file_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."flight_requests" ALTER COLUMN "request_id" SET DEFAULT "nextval"('"public"."flight_requests_request_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."flytbase_mission" ALTER COLUMN "flytbase_mission_id" SET DEFAULT "nextval"('"public"."flytbase_mission_flytbase_mission_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."flytbase_mission_log" ALTER COLUMN "log_id" SET DEFAULT "nextval"('"public"."flytbase_mission_log_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."flytbase_mission_status" ALTER COLUMN "status_id" SET DEFAULT "nextval"('"public"."flytbase_mission_status_status_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."kanban" ALTER COLUMN "kanban_id" SET DEFAULT "nextval"('"public"."kanban_kanban_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."luc_doc_type" ALTER COLUMN "doc_type_id" SET DEFAULT "nextval"('"public"."luc_doc_type_doc_type_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."luc_document" ALTER COLUMN "document_id" SET DEFAULT "nextval"('"public"."luc_document_document_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."luc_document_rev" ALTER COLUMN "revision_id" SET DEFAULT "nextval"('"public"."luc_document_rev_revision_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."luc_procedure" ALTER COLUMN "procedure_id" SET DEFAULT "nextval"('"public"."luc_procedure_procedure_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."maintenance_ticket" ALTER COLUMN "ticket_id" SET DEFAULT "nextval"('"public"."maintenance_ticket_ticket_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."maintenance_ticket_attachment" ALTER COLUMN "attachment_id" SET DEFAULT "nextval"('"public"."maintenance_ticket_attachment_attachment_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."maintenance_ticket_event" ALTER COLUMN "event_id" SET DEFAULT "nextval"('"public"."maintenance_ticket_event_event_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."maintenance_ticket_item" ALTER COLUMN "item_id" SET DEFAULT "nextval"('"public"."maintenance_ticket_item_item_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."maintenance_ticket_report" ALTER COLUMN "report_id" SET DEFAULT "nextval"('"public"."maintenance_ticket_report_report_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."messages" ALTER COLUMN "message_id" SET DEFAULT "nextval"('"public"."messages_message_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."mission_component" ALTER COLUMN "component_id" SET DEFAULT "nextval"('"public"."mission_component_component_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."mission_flight_logs" ALTER COLUMN "log_id" SET DEFAULT "nextval"('"public"."mission_flight_logs_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."notification" ALTER COLUMN "notification_id" SET DEFAULT "nextval"('"public"."notification_notification_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."operation_attachment" ALTER COLUMN "attachment_id" SET DEFAULT "nextval"('"public"."operation_attachment_attachment_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."org_chart_overrides" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."org_chart_overrides_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."owner" ALTER COLUMN "owner_id" SET DEFAULT "nextval"('"public"."owner_owner_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."owner_territorial_unit" ALTER COLUMN "unit_id" SET DEFAULT "nextval"('"public"."owner_territorial_unit_unit_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payload" ALTER COLUMN "payload_id" SET DEFAULT "nextval"('"public"."payload_payload_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pilot_declaration" ALTER COLUMN "declaration_id" SET DEFAULT "nextval"('"public"."pilot_declaration_declaration_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pilot_mission" ALTER COLUMN "pilot_mission_id" SET DEFAULT "nextval"('"public"."pilot_mission_pilot_mission_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pilot_mission_category" ALTER COLUMN "category_id" SET DEFAULT "nextval"('"public"."pilot_mission_category_category_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pilot_mission_planned_template_logbook" ALTER COLUMN "template_id" SET DEFAULT "nextval"('"public"."pilot_mission_planned_template_logbook_template_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pilot_mission_result" ALTER COLUMN "result_id" SET DEFAULT "nextval"('"public"."pilot_mission_result_result_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pilot_mission_result_type" ALTER COLUMN "result_type_id" SET DEFAULT "nextval"('"public"."pilot_mission_result_type_result_type_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pilot_mission_status" ALTER COLUMN "status_id" SET DEFAULT "nextval"('"public"."pilot_mission_status_status_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pilot_mission_type" ALTER COLUMN "mission_type_id" SET DEFAULT "nextval"('"public"."pilot_mission_type_mission_type_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pilot_status" ALTER COLUMN "status_id" SET DEFAULT "nextval"('"public"."pilot_status_status_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pilot_vehicle_status" ALTER COLUMN "vehicle_status_id" SET DEFAULT "nextval"('"public"."pilot_vehicle_status_vehicle_status_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."planning" ALTER COLUMN "planning_id" SET DEFAULT "nextval"('"public"."planning_planning_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."planning_logbook" ALTER COLUMN "mission_planning_id" SET DEFAULT "nextval"('"public"."planning_logbook_mission_planning_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."planning_test_logbook" ALTER COLUMN "test_id" SET DEFAULT "nextval"('"public"."planning_test_logbook_test_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."procedure_document" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."procedure_document_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."repository_file" ALTER COLUMN "file_id" SET DEFAULT "nextval"('"public"."repository_file_file_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."repository_file_type" ALTER COLUMN "file_type_id" SET DEFAULT "nextval"('"public"."repository_file_type_file_type_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."safety_action" ALTER COLUMN "action_id" SET DEFAULT "nextval"('"public"."safety_action_action_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."safety_report" ALTER COLUMN "report_id" SET DEFAULT "nextval"('"public"."safety_report_report_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."spi_kpi" ALTER COLUMN "kpi_id" SET DEFAULT "nextval"('"public"."spi_kpi_kpi_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."spi_kpi_definition" ALTER COLUMN "definition_id" SET DEFAULT "nextval"('"public"."spi_kpi_definition_definition_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."spi_kpi_log" ALTER COLUMN "log_id" SET DEFAULT "nextval"('"public"."spi_kpi_log_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."spi_kpi_target_proposal" ALTER COLUMN "proposal_id" SET DEFAULT "nextval"('"public"."spi_kpi_target_proposal_proposal_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."team" ALTER COLUMN "team_id" SET DEFAULT "nextval"('"public"."team_team_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."team_members" ALTER COLUMN "team_member_id" SET DEFAULT "nextval"('"public"."team_members_team_member_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ticket_attachment" ALTER COLUMN "attachment_id" SET DEFAULT "nextval"('"public"."ticket_attachment_attachment_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tool" ALTER COLUMN "tool_id" SET DEFAULT "nextval"('"public"."tool_tool_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tool_component" ALTER COLUMN "component_id" SET DEFAULT "nextval"('"public"."tool_component_component_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tool_erp" ALTER COLUMN "erp_id" SET DEFAULT "nextval"('"public"."tool_erp_erp_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tool_maintenance" ALTER COLUMN "maintenance_id" SET DEFAULT "nextval"('"public"."tool_maintenance_maintenance_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tool_model" ALTER COLUMN "model_id" SET DEFAULT "nextval"('"public"."tool_model_model_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tool_status" ALTER COLUMN "status_id" SET DEFAULT "nextval"('"public"."tool_status_status_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."training" ALTER COLUMN "training_id" SET DEFAULT "nextval"('"public"."training_training_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."training_attendance" ALTER COLUMN "attendance_id" SET DEFAULT "nextval"('"public"."training_attendance_attendance_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."turn_users" ALTER COLUMN "turn_user_id" SET DEFAULT "nextval"('"public"."turn_users_turn_user_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."turns" ALTER COLUMN "turn_id" SET DEFAULT "nextval"('"public"."turns_turn_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_device" ALTER COLUMN "device_id" SET DEFAULT "nextval"('"public"."user_device_device_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_owner" ALTER COLUMN "user_owner_id" SET DEFAULT "nextval"('"public"."user_owner_user_owner_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_permessi" ALTER COLUMN "permission_id" SET DEFAULT "nextval"('"public"."user_permessi_permission_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_qualification" ALTER COLUMN "qualification_id" SET DEFAULT "nextval"('"public"."user_qualification_qualification_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_session" ALTER COLUMN "session_id" SET DEFAULT "nextval"('"public"."user_session_session_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_settings" ALTER COLUMN "setting_id" SET DEFAULT "nextval"('"public"."user_settings_setting_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."users" ALTER COLUMN "user_id" SET DEFAULT "nextval"('"public"."users_user_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."users_profile" ALTER COLUMN "profile_id" SET DEFAULT "nextval"('"public"."users_profile_profile_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."v_training_session_stats" ALTER COLUMN "stat_id" SET DEFAULT "nextval"('"public"."v_training_session_stats_stat_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ai_token_usage"
    ADD CONSTRAINT "ai_token_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alert_log"
    ADD CONSTRAINT "alert_log_pkey" PRIMARY KEY ("alert_id");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_key_value_key" UNIQUE ("key_value");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("api_key_id");



ALTER TABLE ONLY "public"."assignment"
    ADD CONSTRAINT "assignment_pkey" PRIMARY KEY ("assignment_id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."backup_log"
    ADD CONSTRAINT "backup_log_pkey" PRIMARY KEY ("backup_id");



ALTER TABLE ONLY "public"."calendar_shift"
    ADD CONSTRAINT "calendar_shift_pkey" PRIMARY KEY ("shift_id");



ALTER TABLE ONLY "public"."checklist"
    ADD CONSTRAINT "checklist_pkey" PRIMARY KEY ("checklist_id");



ALTER TABLE ONLY "public"."client"
    ADD CONSTRAINT "client_fk_owner_id_client_code_key" UNIQUE ("fk_owner_id", "client_code");



ALTER TABLE ONLY "public"."client"
    ADD CONSTRAINT "client_pkey" PRIMARY KEY ("client_id");



ALTER TABLE ONLY "public"."code_index"
    ADD CONSTRAINT "code_index_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communication_general"
    ADD CONSTRAINT "communication_general_pkey" PRIMARY KEY ("communication_id");



ALTER TABLE ONLY "public"."communication"
    ADD CONSTRAINT "communication_pkey" PRIMARY KEY ("communication_id");



ALTER TABLE ONLY "public"."compliance_evidence"
    ADD CONSTRAINT "compliance_evidence_pkey" PRIMARY KEY ("evidence_id");



ALTER TABLE ONLY "public"."compliance_requirement"
    ADD CONSTRAINT "compliance_requirement_pkey" PRIMARY KEY ("requirement_id");



ALTER TABLE ONLY "public"."compliance_status_log"
    ADD CONSTRAINT "compliance_status_log_pkey" PRIMARY KEY ("log_id");



ALTER TABLE ONLY "public"."component_type_config"
    ADD CONSTRAINT "component_type_config_pkey" PRIMARY KEY ("type_id");



ALTER TABLE ONLY "public"."controlroom_drone"
    ADD CONSTRAINT "controlroom_drone_pkey" PRIMARY KEY ("controlroom_drone_id");



ALTER TABLE ONLY "public"."controlroom_meta"
    ADD CONSTRAINT "controlroom_meta_fk_owner_id_meta_key_key" UNIQUE ("fk_owner_id", "meta_key");



ALTER TABLE ONLY "public"."controlroom_meta"
    ADD CONSTRAINT "controlroom_meta_pkey" PRIMARY KEY ("meta_id");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_country_code_key" UNIQUE ("country_code");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_pkey" PRIMARY KEY ("country_id");



ALTER TABLE ONLY "public"."dcc_integrations"
    ADD CONSTRAINT "dcc_integrations_fk_owner_id_key" UNIQUE ("fk_owner_id");



ALTER TABLE ONLY "public"."dcc_integrations"
    ADD CONSTRAINT "dcc_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deleted_owner"
    ADD CONSTRAINT "deleted_owner_pkey" PRIMARY KEY ("deleted_id");



ALTER TABLE ONLY "public"."deleted_user"
    ADD CONSTRAINT "deleted_user_pkey" PRIMARY KEY ("deleted_id");



ALTER TABLE ONLY "public"."drone_class_config"
    ADD CONSTRAINT "drone_class_config_fk_owner_id_class_value_key" UNIQUE ("fk_owner_id", "class_value");



ALTER TABLE ONLY "public"."drone_class_config"
    ADD CONSTRAINT "drone_class_config_pkey" PRIMARY KEY ("class_id");



ALTER TABLE ONLY "public"."emergency_response_plan"
    ADD CONSTRAINT "emergency_response_plan_pkey" PRIMARY KEY ("erp_id");



ALTER TABLE ONLY "public"."erp_location_group_contact"
    ADD CONSTRAINT "erp_location_group_contact_fk_group_id_fk_erp_id_key" UNIQUE ("fk_group_id", "fk_erp_id");



ALTER TABLE ONLY "public"."erp_location_group_contact"
    ADD CONSTRAINT "erp_location_group_contact_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."erp_location_group_location"
    ADD CONSTRAINT "erp_location_group_location_pkey" PRIMARY KEY ("location_id");



ALTER TABLE ONLY "public"."erp_location_group"
    ADD CONSTRAINT "erp_location_group_pkey" PRIMARY KEY ("group_id");



ALTER TABLE ONLY "public"."evaluation_action"
    ADD CONSTRAINT "evaluation_action_pkey" PRIMARY KEY ("action_id");



ALTER TABLE ONLY "public"."evaluation_file"
    ADD CONSTRAINT "evaluation_file_pkey" PRIMARY KEY ("file_id");



ALTER TABLE ONLY "public"."evaluation"
    ADD CONSTRAINT "evaluation_fk_owner_id_evaluation_code_key" UNIQUE ("fk_owner_id", "evaluation_code");



ALTER TABLE ONLY "public"."evaluation"
    ADD CONSTRAINT "evaluation_pkey" PRIMARY KEY ("evaluation_id");



ALTER TABLE ONLY "public"."flight_requests"
    ADD CONSTRAINT "flight_requests_pkey" PRIMARY KEY ("request_id");



ALTER TABLE ONLY "public"."flytbase_mission_log"
    ADD CONSTRAINT "flytbase_mission_log_pkey" PRIMARY KEY ("log_id");



ALTER TABLE ONLY "public"."flytbase_mission"
    ADD CONSTRAINT "flytbase_mission_pkey" PRIMARY KEY ("flytbase_mission_id");



ALTER TABLE ONLY "public"."flytbase_mission_status"
    ADD CONSTRAINT "flytbase_mission_status_pkey" PRIMARY KEY ("status_id");



ALTER TABLE ONLY "public"."kanban"
    ADD CONSTRAINT "kanban_pkey" PRIMARY KEY ("kanban_id");



ALTER TABLE ONLY "public"."luc_doc_type"
    ADD CONSTRAINT "luc_doc_type_doc_type_code_key" UNIQUE ("doc_type_code");



ALTER TABLE ONLY "public"."luc_doc_type"
    ADD CONSTRAINT "luc_doc_type_pkey" PRIMARY KEY ("doc_type_id");



ALTER TABLE ONLY "public"."luc_document"
    ADD CONSTRAINT "luc_document_fk_owner_id_document_code_key" UNIQUE ("fk_owner_id", "document_code");



ALTER TABLE ONLY "public"."luc_document"
    ADD CONSTRAINT "luc_document_pkey" PRIMARY KEY ("document_id");



ALTER TABLE ONLY "public"."luc_document_rev"
    ADD CONSTRAINT "luc_document_rev_fk_document_id_revision_number_key" UNIQUE ("fk_document_id", "revision_number");



ALTER TABLE ONLY "public"."luc_document_rev"
    ADD CONSTRAINT "luc_document_rev_pkey" PRIMARY KEY ("revision_id");



ALTER TABLE ONLY "public"."luc_procedure"
    ADD CONSTRAINT "luc_procedure_pkey" PRIMARY KEY ("procedure_id");



ALTER TABLE ONLY "public"."maintenance_ticket_attachment"
    ADD CONSTRAINT "maintenance_ticket_attachment_pkey" PRIMARY KEY ("attachment_id");



ALTER TABLE ONLY "public"."maintenance_ticket_event"
    ADD CONSTRAINT "maintenance_ticket_event_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "public"."maintenance_ticket_item"
    ADD CONSTRAINT "maintenance_ticket_item_pkey" PRIMARY KEY ("item_id");



ALTER TABLE ONLY "public"."maintenance_ticket"
    ADD CONSTRAINT "maintenance_ticket_pkey" PRIMARY KEY ("ticket_id");



ALTER TABLE ONLY "public"."maintenance_ticket_report"
    ADD CONSTRAINT "maintenance_ticket_report_pkey" PRIMARY KEY ("report_id");



ALTER TABLE ONLY "public"."maintenance_ticket"
    ADD CONSTRAINT "maintenance_ticket_ticket_number_key" UNIQUE ("ticket_number");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("message_id");



ALTER TABLE ONLY "public"."mission_component"
    ADD CONSTRAINT "mission_component_pkey" PRIMARY KEY ("component_id");



ALTER TABLE ONLY "public"."mission_flight_logs"
    ADD CONSTRAINT "mission_flight_logs_pkey" PRIMARY KEY ("log_id");



ALTER TABLE ONLY "public"."notification"
    ADD CONSTRAINT "notification_pkey" PRIMARY KEY ("notification_id");



ALTER TABLE ONLY "public"."operation_attachment"
    ADD CONSTRAINT "operation_attachment_pkey" PRIMARY KEY ("attachment_id");



ALTER TABLE ONLY "public"."org_chart_overrides"
    ADD CONSTRAINT "org_chart_overrides_owner_id_user_id_key" UNIQUE ("owner_id", "user_id");



ALTER TABLE ONLY "public"."org_chart_overrides"
    ADD CONSTRAINT "org_chart_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."owner"
    ADD CONSTRAINT "owner_owner_code_key" UNIQUE ("owner_code");



ALTER TABLE ONLY "public"."owner"
    ADD CONSTRAINT "owner_pkey" PRIMARY KEY ("owner_id");



ALTER TABLE ONLY "public"."owner_territorial_unit"
    ADD CONSTRAINT "owner_territorial_unit_fk_owner_id_unit_code_key" UNIQUE ("fk_owner_id", "unit_code");



ALTER TABLE ONLY "public"."owner_territorial_unit"
    ADD CONSTRAINT "owner_territorial_unit_pkey" PRIMARY KEY ("unit_id");



ALTER TABLE ONLY "public"."payload"
    ADD CONSTRAINT "payload_fk_owner_id_payload_code_key" UNIQUE ("fk_owner_id", "payload_code");



ALTER TABLE ONLY "public"."payload"
    ADD CONSTRAINT "payload_pkey" PRIMARY KEY ("payload_id");



ALTER TABLE ONLY "public"."pilot_declaration"
    ADD CONSTRAINT "pilot_declaration_pkey" PRIMARY KEY ("declaration_id");



ALTER TABLE ONLY "public"."pilot_declaration"
    ADD CONSTRAINT "pilot_declaration_user_date_type_key" UNIQUE ("fk_user_id", "declaration_date", "declaration_type");



ALTER TABLE ONLY "public"."pilot_mission_category"
    ADD CONSTRAINT "pilot_mission_category_code_owner_key" UNIQUE ("category_code", "fk_owner_id");



ALTER TABLE ONLY "public"."pilot_mission_category"
    ADD CONSTRAINT "pilot_mission_category_pkey" PRIMARY KEY ("category_id");



ALTER TABLE ONLY "public"."pilot_mission"
    ADD CONSTRAINT "pilot_mission_mission_code_key" UNIQUE ("mission_code");



ALTER TABLE ONLY "public"."pilot_mission"
    ADD CONSTRAINT "pilot_mission_pkey" PRIMARY KEY ("pilot_mission_id");



ALTER TABLE ONLY "public"."pilot_mission_planned_template_logbook"
    ADD CONSTRAINT "pilot_mission_planned_template_logbook_pkey" PRIMARY KEY ("template_id");



ALTER TABLE ONLY "public"."pilot_mission_planned_template_logbook"
    ADD CONSTRAINT "pilot_mission_planned_template_logbook_template_code_key" UNIQUE ("template_code");



ALTER TABLE ONLY "public"."pilot_mission_result"
    ADD CONSTRAINT "pilot_mission_result_pkey" PRIMARY KEY ("result_id");



ALTER TABLE ONLY "public"."pilot_mission_result_type"
    ADD CONSTRAINT "pilot_mission_result_type_code_owner_key" UNIQUE ("result_type_code", "fk_owner_id");



ALTER TABLE ONLY "public"."pilot_mission_result_type"
    ADD CONSTRAINT "pilot_mission_result_type_fk_owner_id_result_type_code_key" UNIQUE ("fk_owner_id", "result_type_code");



ALTER TABLE ONLY "public"."pilot_mission_result_type"
    ADD CONSTRAINT "pilot_mission_result_type_pkey" PRIMARY KEY ("result_type_id");



ALTER TABLE ONLY "public"."pilot_mission_status"
    ADD CONSTRAINT "pilot_mission_status_pkey" PRIMARY KEY ("status_id");



ALTER TABLE ONLY "public"."pilot_mission_status"
    ADD CONSTRAINT "pilot_mission_status_status_code_owner_key" UNIQUE ("status_code", "fk_owner_id");



ALTER TABLE ONLY "public"."pilot_mission_type"
    ADD CONSTRAINT "pilot_mission_type_code_owner_key" UNIQUE ("type_code", "fk_owner_id");



ALTER TABLE ONLY "public"."pilot_mission_type"
    ADD CONSTRAINT "pilot_mission_type_pkey" PRIMARY KEY ("mission_type_id");



ALTER TABLE ONLY "public"."pilot_status"
    ADD CONSTRAINT "pilot_status_pkey" PRIMARY KEY ("status_id");



ALTER TABLE ONLY "public"."pilot_status"
    ADD CONSTRAINT "pilot_status_status_code_key" UNIQUE ("status_code");



ALTER TABLE ONLY "public"."pilot_vehicle_status"
    ADD CONSTRAINT "pilot_vehicle_status_pkey" PRIMARY KEY ("vehicle_status_id");



ALTER TABLE ONLY "public"."pilot_vehicle_status"
    ADD CONSTRAINT "pilot_vehicle_status_status_code_key" UNIQUE ("status_code");



ALTER TABLE ONLY "public"."planning_logbook"
    ADD CONSTRAINT "planning_logbook_pkey" PRIMARY KEY ("mission_planning_id");



ALTER TABLE ONLY "public"."planning"
    ADD CONSTRAINT "planning_pkey" PRIMARY KEY ("planning_id");



ALTER TABLE ONLY "public"."planning_test_logbook"
    ADD CONSTRAINT "planning_test_logbook_pkey" PRIMARY KEY ("test_id");



ALTER TABLE ONLY "public"."procedure_document"
    ADD CONSTRAINT "procedure_document_doc_key_key" UNIQUE ("doc_key");



ALTER TABLE ONLY "public"."procedure_document"
    ADD CONSTRAINT "procedure_document_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repository_file"
    ADD CONSTRAINT "repository_file_pkey" PRIMARY KEY ("file_id");



ALTER TABLE ONLY "public"."repository_file_type"
    ADD CONSTRAINT "repository_file_type_file_type_code_key" UNIQUE ("file_type_code");



ALTER TABLE ONLY "public"."repository_file_type"
    ADD CONSTRAINT "repository_file_type_pkey" PRIMARY KEY ("file_type_id");



ALTER TABLE ONLY "public"."safety_action"
    ADD CONSTRAINT "safety_action_pkey" PRIMARY KEY ("action_id");



ALTER TABLE ONLY "public"."safety_report"
    ADD CONSTRAINT "safety_report_pkey" PRIMARY KEY ("report_id");



ALTER TABLE ONLY "public"."schema_chunks"
    ADD CONSTRAINT "schema_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spi_kpi_definition"
    ADD CONSTRAINT "spi_kpi_definition_kpi_code_key" UNIQUE ("kpi_code");



ALTER TABLE ONLY "public"."spi_kpi_definition"
    ADD CONSTRAINT "spi_kpi_definition_pkey" PRIMARY KEY ("definition_id");



ALTER TABLE ONLY "public"."spi_kpi"
    ADD CONSTRAINT "spi_kpi_fk_definition_id_measurement_date_key" UNIQUE ("fk_definition_id", "measurement_date");



ALTER TABLE ONLY "public"."spi_kpi_log"
    ADD CONSTRAINT "spi_kpi_log_pkey" PRIMARY KEY ("log_id");



ALTER TABLE ONLY "public"."spi_kpi"
    ADD CONSTRAINT "spi_kpi_pkey" PRIMARY KEY ("kpi_id");



ALTER TABLE ONLY "public"."spi_kpi_target_proposal"
    ADD CONSTRAINT "spi_kpi_target_proposal_pkey" PRIMARY KEY ("proposal_id");



ALTER TABLE ONLY "public"."team"
    ADD CONSTRAINT "team_fk_owner_id_team_code_key" UNIQUE ("fk_owner_id", "team_code");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_fk_team_id_fk_user_id_key" UNIQUE ("fk_team_id", "fk_user_id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("team_member_id");



ALTER TABLE ONLY "public"."team"
    ADD CONSTRAINT "team_pkey" PRIMARY KEY ("team_id");



ALTER TABLE ONLY "public"."ticket_attachment"
    ADD CONSTRAINT "ticket_attachment_pkey" PRIMARY KEY ("attachment_id");



ALTER TABLE ONLY "public"."tool_component"
    ADD CONSTRAINT "tool_component_pkey" PRIMARY KEY ("component_id");



ALTER TABLE ONLY "public"."tool_erp"
    ADD CONSTRAINT "tool_erp_fk_tool_id_erp_system_key" UNIQUE ("fk_tool_id", "erp_system");



ALTER TABLE ONLY "public"."tool_erp"
    ADD CONSTRAINT "tool_erp_pkey" PRIMARY KEY ("erp_id");



ALTER TABLE ONLY "public"."tool"
    ADD CONSTRAINT "tool_fk_owner_id_tool_code_key" UNIQUE ("fk_owner_id", "tool_code");



ALTER TABLE ONLY "public"."tool_maintenance"
    ADD CONSTRAINT "tool_maintenance_pkey" PRIMARY KEY ("maintenance_id");



ALTER TABLE ONLY "public"."tool_model"
    ADD CONSTRAINT "tool_model_pkey" PRIMARY KEY ("model_id");



ALTER TABLE ONLY "public"."tool"
    ADD CONSTRAINT "tool_pkey" PRIMARY KEY ("tool_id");



ALTER TABLE ONLY "public"."tool_status"
    ADD CONSTRAINT "tool_status_pkey" PRIMARY KEY ("status_id");



ALTER TABLE ONLY "public"."tool_status"
    ADD CONSTRAINT "tool_status_status_code_key" UNIQUE ("status_code");



ALTER TABLE ONLY "public"."training_attendance"
    ADD CONSTRAINT "training_attendance_fk_training_id_fk_user_id_training_sess_key" UNIQUE ("fk_training_id", "fk_user_id", "training_session_date");



ALTER TABLE ONLY "public"."training_attendance"
    ADD CONSTRAINT "training_attendance_pkey" PRIMARY KEY ("attendance_id");



ALTER TABLE ONLY "public"."training"
    ADD CONSTRAINT "training_pkey" PRIMARY KEY ("training_id");



ALTER TABLE ONLY "public"."transaction_signs"
    ADD CONSTRAINT "transaction_signs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."turn_users"
    ADD CONSTRAINT "turn_users_fk_turn_id_fk_user_id_assignment_date_key" UNIQUE ("fk_turn_id", "fk_user_id", "assignment_date");



ALTER TABLE ONLY "public"."turn_users"
    ADD CONSTRAINT "turn_users_pkey" PRIMARY KEY ("turn_user_id");



ALTER TABLE ONLY "public"."turns"
    ADD CONSTRAINT "turns_pkey" PRIMARY KEY ("turn_id");



ALTER TABLE ONLY "public"."user_authorization_keys"
    ADD CONSTRAINT "user_authorization_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_authorization_keys"
    ADD CONSTRAINT "user_authorization_keys_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_device"
    ADD CONSTRAINT "user_device_pkey" PRIMARY KEY ("device_id");



ALTER TABLE ONLY "public"."user_owner"
    ADD CONSTRAINT "user_owner_fk_user_id_fk_owner_id_key" UNIQUE ("fk_user_id", "fk_owner_id");



ALTER TABLE ONLY "public"."user_owner"
    ADD CONSTRAINT "user_owner_pkey" PRIMARY KEY ("user_owner_id");



ALTER TABLE ONLY "public"."user_permessi"
    ADD CONSTRAINT "user_permessi_fk_user_id_permission_code_key" UNIQUE ("fk_user_id", "permission_code");



ALTER TABLE ONLY "public"."user_permessi"
    ADD CONSTRAINT "user_permessi_pkey" PRIMARY KEY ("permission_id");



ALTER TABLE ONLY "public"."user_qualification"
    ADD CONSTRAINT "user_qualification_pkey" PRIMARY KEY ("qualification_id");



ALTER TABLE ONLY "public"."user_session"
    ADD CONSTRAINT "user_session_pkey" PRIMARY KEY ("session_id");



ALTER TABLE ONLY "public"."user_session"
    ADD CONSTRAINT "user_session_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_fk_user_id_setting_key_key" UNIQUE ("fk_user_id", "setting_key");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("setting_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."users_profile"
    ADD CONSTRAINT "users_profile_fk_user_id_key" UNIQUE ("fk_user_id");



ALTER TABLE ONLY "public"."users_profile"
    ADD CONSTRAINT "users_profile_pkey" PRIMARY KEY ("profile_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."v_training_session_stats"
    ADD CONSTRAINT "v_training_session_stats_pkey" PRIMARY KEY ("stat_id");



CREATE INDEX "idx_api_keys_value" ON "public"."api_keys" USING "btree" ("key_value");



CREATE INDEX "idx_atu_created_at" ON "public"."ai_token_usage" USING "btree" ("created_at");



CREATE INDEX "idx_atu_owner_id" ON "public"."ai_token_usage" USING "btree" ("owner_id");



CREATE INDEX "idx_atu_user_id" ON "public"."ai_token_usage" USING "btree" ("user_id");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_entity_type" ON "public"."audit_logs" USING "btree" ("entity_type");



CREATE INDEX "idx_audit_logs_event_type" ON "public"."audit_logs" USING "btree" ("event_type");



CREATE INDEX "idx_audit_logs_owner_created" ON "public"."audit_logs" USING "btree" ("owner_id", "created_at" DESC);



CREATE INDEX "idx_audit_logs_owner_id" ON "public"."audit_logs" USING "btree" ("owner_id");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_checklist_fk_planning_id" ON "public"."checklist" USING "btree" ("fk_planning_id");



CREATE INDEX "idx_client_active" ON "public"."client" USING "btree" ("client_active");



CREATE INDEX "idx_client_owner" ON "public"."client" USING "btree" ("fk_owner_id");



CREATE INDEX "idx_document_owner" ON "public"."luc_document" USING "btree" ("fk_owner_id");



CREATE INDEX "idx_document_status" ON "public"."luc_document" USING "btree" ("document_status");



CREATE INDEX "idx_document_type" ON "public"."luc_document" USING "btree" ("fk_doc_type_id");



CREATE INDEX "idx_erp_owner" ON "public"."emergency_response_plan" USING "btree" ("fk_owner_id");



CREATE INDEX "idx_evaluation_client" ON "public"."evaluation" USING "btree" ("fk_client_id");



CREATE INDEX "idx_evaluation_date" ON "public"."evaluation" USING "btree" ("scheduled_date");



CREATE INDEX "idx_evaluation_metadata_gin" ON "public"."evaluation" USING "gin" ("evaluation_metadata");



CREATE INDEX "idx_evaluation_owner" ON "public"."evaluation" USING "btree" ("fk_owner_id");



CREATE INDEX "idx_evaluation_status" ON "public"."evaluation" USING "btree" ("evaluation_status");



CREATE INDEX "idx_flight_requests_owner" ON "public"."flight_requests" USING "btree" ("fk_owner_id");



CREATE INDEX "idx_flight_requests_status" ON "public"."flight_requests" USING "btree" ("dcc_status");



CREATE INDEX "idx_luc_document_fk_component_id" ON "public"."luc_document" USING "btree" ("fk_component_id");



CREATE INDEX "idx_maintenance_ticket_assigned" ON "public"."maintenance_ticket" USING "btree" ("assigned_to_user_id");



CREATE INDEX "idx_maintenance_ticket_component" ON "public"."maintenance_ticket" USING "btree" ("fk_component_id");



CREATE INDEX "idx_maintenance_ticket_owner" ON "public"."maintenance_ticket" USING "btree" ("fk_owner_id");



CREATE INDEX "idx_maintenance_ticket_status" ON "public"."maintenance_ticket" USING "btree" ("ticket_status");



CREATE INDEX "idx_maintenance_ticket_tool" ON "public"."maintenance_ticket" USING "btree" ("fk_tool_id");



CREATE INDEX "idx_messages_from" ON "public"."messages" USING "btree" ("from_user_id");



CREATE INDEX "idx_messages_read" ON "public"."messages" USING "btree" ("is_read");



CREATE INDEX "idx_messages_to" ON "public"."messages" USING "btree" ("to_user_id");



CREATE INDEX "idx_mission_planning_waypoints_gin" ON "public"."planning_logbook" USING "gin" ("waypoints");



CREATE INDEX "idx_mission_result_type_code" ON "public"."pilot_mission_result_type" USING "btree" ("result_type_code");



CREATE INDEX "idx_mission_result_type_owner" ON "public"."pilot_mission_result_type" USING "btree" ("fk_owner_id");



CREATE INDEX "idx_notification_read" ON "public"."notification" USING "btree" ("is_read");



CREATE INDEX "idx_notification_user" ON "public"."notification" USING "btree" ("fk_user_id");



CREATE INDEX "idx_operation_attachment_operation" ON "public"."operation_attachment" USING "btree" ("fk_operation_id");



CREATE INDEX "idx_owner_active" ON "public"."owner" USING "btree" ("owner_active");



CREATE INDEX "idx_owner_code" ON "public"."owner" USING "btree" ("owner_code");



CREATE INDEX "idx_pilot_mission_actual_start" ON "public"."pilot_mission" USING "btree" ("actual_start");



CREATE INDEX "idx_pilot_mission_date" ON "public"."pilot_mission" USING "btree" ("scheduled_start");



CREATE INDEX "idx_pilot_mission_fk_pilot_user_id" ON "public"."pilot_mission" USING "btree" ("fk_pilot_user_id");



CREATE INDEX "idx_pilot_mission_fk_planning_id" ON "public"."pilot_mission" USING "btree" ("fk_planning_id");



CREATE INDEX "idx_pilot_mission_fk_tool_id" ON "public"."pilot_mission" USING "btree" ("fk_tool_id");



CREATE INDEX "idx_pilot_mission_luc" ON "public"."pilot_mission" USING "btree" ("fk_luc_procedure_id") WHERE ("fk_luc_procedure_id" IS NOT NULL);



CREATE INDEX "idx_pilot_mission_owner" ON "public"."pilot_mission" USING "btree" ("fk_owner_id");



CREATE INDEX "idx_pilot_mission_pilot" ON "public"."pilot_mission" USING "btree" ("fk_pilot_user_id");



CREATE INDEX "idx_pilot_mission_planning" ON "public"."pilot_mission" USING "btree" ("fk_planning_id");



CREATE INDEX "idx_pilot_mission_recurring_group" ON "public"."pilot_mission" USING "btree" ("recurring_group_id") WHERE ("recurring_group_id" IS NOT NULL);



CREATE INDEX "idx_pilot_mission_status" ON "public"."pilot_mission" USING "btree" ("fk_mission_status_id");



CREATE INDEX "idx_pilot_mission_status_name" ON "public"."pilot_mission" USING "btree" ("status_name");



CREATE INDEX "idx_pilot_mission_tool" ON "public"."pilot_mission" USING "btree" ("fk_tool_id");



CREATE INDEX "idx_pilot_mission_year" ON "public"."pilot_mission" USING "btree" ("actual_start") WHERE ("actual_start" >= '2020-01-01 00:00:00'::timestamp without time zone);



CREATE INDEX "idx_planning_assigned_to" ON "public"."planning" USING "btree" ("assigned_to_user_id");



CREATE INDEX "idx_planning_date" ON "public"."planning" USING "btree" ("planned_date");



CREATE INDEX "idx_planning_evaluation" ON "public"."planning" USING "btree" ("fk_evaluation_id");



CREATE INDEX "idx_planning_fk_client_id" ON "public"."planning" USING "btree" ("fk_client_id");



CREATE INDEX "idx_planning_owner" ON "public"."planning" USING "btree" ("fk_owner_id");



CREATE INDEX "idx_planning_planning_id" ON "public"."planning" USING "btree" ("planning_id");



CREATE INDEX "idx_planning_test_logbook_mission_planning" ON "public"."planning_test_logbook" USING "btree" ("fk_mission_planning_id");



CREATE INDEX "idx_planning_test_logbook_owner" ON "public"."planning_test_logbook" USING "btree" ("fk_owner_id");



CREATE INDEX "idx_planning_test_logbook_planning" ON "public"."planning_test_logbook" USING "btree" ("fk_planning_id");



CREATE INDEX "idx_planning_test_logbook_s3_key" ON "public"."planning_test_logbook" USING "btree" ("mission_test_s3_key") WHERE ("mission_test_s3_key" IS NOT NULL);



CREATE INDEX "idx_procedure_doc_key" ON "public"."procedure_document" USING "btree" ("doc_key");



CREATE INDEX "idx_schema_chunks_embedding" ON "public"."schema_chunks" USING "hnsw" ("embedding" "public"."vector_cosine_ops");



CREATE INDEX "idx_session_active" ON "public"."user_session" USING "btree" ("is_active");



CREATE INDEX "idx_session_token" ON "public"."user_session" USING "btree" ("session_token");



CREATE INDEX "idx_session_user" ON "public"."user_session" USING "btree" ("fk_user_id");



CREATE INDEX "idx_spi_kpi_fk_definition_id" ON "public"."spi_kpi" USING "btree" ("fk_definition_id");



CREATE INDEX "idx_spi_kpi_fk_owner_id" ON "public"."spi_kpi" USING "btree" ("fk_owner_id");



CREATE INDEX "idx_spi_kpi_measurement_date" ON "public"."spi_kpi" USING "btree" ("measurement_date");



CREATE INDEX "idx_spi_kpi_owner_date" ON "public"."spi_kpi" USING "btree" ("fk_owner_id", "measurement_date");



CREATE INDEX "idx_ticket_attachment_ticket" ON "public"."ticket_attachment" USING "btree" ("fk_ticket_id");



CREATE INDEX "idx_tool_active" ON "public"."tool" USING "btree" ("tool_active");



CREATE INDEX "idx_tool_assigned_client" ON "public"."tool" USING "btree" ("assigned_client_id");



CREATE INDEX "idx_tool_metadata_gin" ON "public"."tool" USING "gin" ("tool_metadata");



CREATE INDEX "idx_tool_owner" ON "public"."tool" USING "btree" ("fk_owner_id");



CREATE INDEX "idx_tool_status" ON "public"."tool" USING "btree" ("fk_status_id");



CREATE INDEX "idx_transaction_signs_created" ON "public"."transaction_signs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_transaction_signs_entity" ON "public"."transaction_signs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_transaction_signs_owner" ON "public"."transaction_signs" USING "btree" ("owner_id");



CREATE INDEX "idx_transaction_signs_user" ON "public"."transaction_signs" USING "btree" ("user_id");



CREATE INDEX "idx_user_auth_keys_owner" ON "public"."user_authorization_keys" USING "btree" ("owner_id");



CREATE INDEX "idx_user_qualification_owner" ON "public"."user_qualification" USING "btree" ("fk_owner_id");



CREATE INDEX "idx_user_qualification_user" ON "public"."user_qualification" USING "btree" ("fk_user_id");



CREATE INDEX "idx_users_active" ON "public"."users" USING "btree" ("user_active");



CREATE INDEX "idx_users_auth_user_id" ON "public"."users" USING "btree" ("auth_user_id");



CREATE INDEX "idx_users_client" ON "public"."users" USING "btree" ("fk_client_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_owner" ON "public"."users" USING "btree" ("fk_owner_id");



CREATE INDEX "idx_users_profile_fk_user_id" ON "public"."users_profile" USING "btree" ("fk_user_id");



CREATE INDEX "idx_users_profile_id" ON "public"."users" USING "btree" ("fk_user_profile_id");



CREATE INDEX "idx_users_territorial_unit" ON "public"."users" USING "btree" ("fk_territorial_unit");



CREATE INDEX "idx_users_unique_code" ON "public"."users" USING "btree" ("user_unique_code");



CREATE INDEX "idx_users_user_active" ON "public"."users" USING "btree" ("user_active") WHERE ("user_active" = 'Y'::"bpchar");



CREATE INDEX "idx_users_user_id" ON "public"."users" USING "btree" ("user_id");



CREATE INDEX "idx_users_username" ON "public"."users" USING "btree" ("username");



CREATE UNIQUE INDEX "users_auth_user_id_key" ON "public"."users" USING "btree" ("auth_user_id");



CREATE OR REPLACE TRIGGER "trg_erp_updated_at" BEFORE UPDATE ON "public"."emergency_response_plan" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_assignment_updated_at" BEFORE UPDATE ON "public"."assignment" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_calendar_shift_updated_at" BEFORE UPDATE ON "public"."calendar_shift" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_checklist_updated_at" BEFORE UPDATE ON "public"."checklist" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_client_updated_at" BEFORE UPDATE ON "public"."client" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_communication_updated_at" BEFORE UPDATE ON "public"."communication" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_compliance_requirement_updated_at" BEFORE UPDATE ON "public"."compliance_requirement" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_controlroom_drone_updated_at" BEFORE UPDATE ON "public"."controlroom_drone" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_controlroom_meta_updated_at" BEFORE UPDATE ON "public"."controlroom_meta" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_countries_updated_at" BEFORE UPDATE ON "public"."countries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_evaluation_action_updated_at" BEFORE UPDATE ON "public"."evaluation_action" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_evaluation_updated_at" BEFORE UPDATE ON "public"."evaluation" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_flytbase_mission_updated_at" BEFORE UPDATE ON "public"."flytbase_mission" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_kanban_updated_at" BEFORE UPDATE ON "public"."kanban" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_luc_document_updated_at" BEFORE UPDATE ON "public"."luc_document" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_luc_procedure_updated_at" BEFORE UPDATE ON "public"."luc_procedure" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_maintenance_ticket_updated_at" BEFORE UPDATE ON "public"."maintenance_ticket" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_owner_territorial_unit_updated_at" BEFORE UPDATE ON "public"."owner_territorial_unit" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_owner_updated_at" BEFORE UPDATE ON "public"."owner" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payload_updated_at" BEFORE UPDATE ON "public"."payload" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pilot_mission_planned_template_logbook_updated_at" BEFORE UPDATE ON "public"."pilot_mission_planned_template_logbook" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pilot_mission_updated_at" BEFORE UPDATE ON "public"."pilot_mission" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_planning_logbook_updated_at" BEFORE UPDATE ON "public"."planning_logbook" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_planning_updated_at" BEFORE UPDATE ON "public"."planning" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_repository_file_updated_at" BEFORE UPDATE ON "public"."repository_file" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_safety_action_updated_at" BEFORE UPDATE ON "public"."safety_action" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_safety_report_updated_at" BEFORE UPDATE ON "public"."safety_report" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_spi_kpi_definition_updated_at" BEFORE UPDATE ON "public"."spi_kpi_definition" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_team_updated_at" BEFORE UPDATE ON "public"."team" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tool_component_updated_at" BEFORE UPDATE ON "public"."tool_component" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tool_erp_updated_at" BEFORE UPDATE ON "public"."tool_erp" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tool_maintenance_updated_at" BEFORE UPDATE ON "public"."tool_maintenance" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tool_updated_at" BEFORE UPDATE ON "public"."tool" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_training_updated_at" BEFORE UPDATE ON "public"."training" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_qualification_updated_at" BEFORE UPDATE ON "public"."user_qualification" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_profile_updated_at" BEFORE UPDATE ON "public"."users_profile" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."alert_log"
    ADD CONSTRAINT "alert_log_acknowledged_by_user_id_fkey" FOREIGN KEY ("acknowledged_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."alert_log"
    ADD CONSTRAINT "alert_log_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."alert_log"
    ADD CONSTRAINT "alert_log_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."alert_log"
    ADD CONSTRAINT "alert_log_triggered_by_user_id_fkey" FOREIGN KEY ("triggered_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."assignment"
    ADD CONSTRAINT "assignment_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."assignment"
    ADD CONSTRAINT "assignment_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."backup_log"
    ADD CONSTRAINT "backup_log_performed_by_user_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."calendar_shift"
    ADD CONSTRAINT "calendar_shift_fk_client_id_fkey" FOREIGN KEY ("fk_client_id") REFERENCES "public"."client"("client_id");



ALTER TABLE ONLY "public"."calendar_shift"
    ADD CONSTRAINT "calendar_shift_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."calendar_shift"
    ADD CONSTRAINT "calendar_shift_fk_pic_id_fkey" FOREIGN KEY ("fk_pic_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."checklist"
    ADD CONSTRAINT "checklist_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."checklist"
    ADD CONSTRAINT "checklist_fk_planning_id_fkey" FOREIGN KEY ("fk_planning_id") REFERENCES "public"."planning"("planning_id");



ALTER TABLE ONLY "public"."checklist"
    ADD CONSTRAINT "checklist_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."client"
    ADD CONSTRAINT "client_fk_country_id_fkey" FOREIGN KEY ("fk_country_id") REFERENCES "public"."countries"("country_id");



ALTER TABLE ONLY "public"."client"
    ADD CONSTRAINT "client_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."code_index"
    ADD CONSTRAINT "code_index_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."communication"
    ADD CONSTRAINT "communication_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."communication"
    ADD CONSTRAINT "communication_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."communication_general"
    ADD CONSTRAINT "communication_general_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."communication_general"
    ADD CONSTRAINT "communication_general_sent_by_user_id_fkey" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."compliance_evidence"
    ADD CONSTRAINT "compliance_evidence_fk_requirement_id_fkey" FOREIGN KEY ("fk_requirement_id") REFERENCES "public"."compliance_requirement"("requirement_id");



ALTER TABLE ONLY "public"."compliance_evidence"
    ADD CONSTRAINT "compliance_evidence_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."compliance_evidence"
    ADD CONSTRAINT "compliance_evidence_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."compliance_requirement"
    ADD CONSTRAINT "compliance_requirement_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."compliance_status_log"
    ADD CONSTRAINT "compliance_status_log_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."compliance_status_log"
    ADD CONSTRAINT "compliance_status_log_fk_requirement_id_fkey" FOREIGN KEY ("fk_requirement_id") REFERENCES "public"."compliance_requirement"("requirement_id");



ALTER TABLE ONLY "public"."controlroom_drone"
    ADD CONSTRAINT "controlroom_drone_fk_pilot_mission_id_fkey" FOREIGN KEY ("fk_pilot_mission_id") REFERENCES "public"."pilot_mission"("pilot_mission_id");



ALTER TABLE ONLY "public"."controlroom_drone"
    ADD CONSTRAINT "controlroom_drone_fk_tool_id_fkey" FOREIGN KEY ("fk_tool_id") REFERENCES "public"."tool"("tool_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."controlroom_meta"
    ADD CONSTRAINT "controlroom_meta_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."deleted_owner"
    ADD CONSTRAINT "deleted_owner_deleted_by_user_id_fkey" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."deleted_user"
    ADD CONSTRAINT "deleted_user_deleted_by_user_id_fkey" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."drone_class_config"
    ADD CONSTRAINT "drone_class_config_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."emergency_response_plan"
    ADD CONSTRAINT "emergency_response_plan_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."erp_location_group_contact"
    ADD CONSTRAINT "erp_location_group_contact_fk_erp_id_fkey" FOREIGN KEY ("fk_erp_id") REFERENCES "public"."emergency_response_plan"("erp_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."erp_location_group_contact"
    ADD CONSTRAINT "erp_location_group_contact_fk_group_id_fkey" FOREIGN KEY ("fk_group_id") REFERENCES "public"."erp_location_group"("group_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."erp_location_group_location"
    ADD CONSTRAINT "erp_location_group_location_fk_group_id_fkey" FOREIGN KEY ("fk_group_id") REFERENCES "public"."erp_location_group"("group_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluation_action"
    ADD CONSTRAINT "evaluation_action_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."evaluation_action"
    ADD CONSTRAINT "evaluation_action_fk_evaluation_id_fkey" FOREIGN KEY ("fk_evaluation_id") REFERENCES "public"."evaluation"("evaluation_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluation"
    ADD CONSTRAINT "evaluation_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."evaluation_file"
    ADD CONSTRAINT "evaluation_file_fk_evaluation_id_fkey" FOREIGN KEY ("fk_evaluation_id") REFERENCES "public"."evaluation"("evaluation_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluation_file"
    ADD CONSTRAINT "evaluation_file_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."evaluation"
    ADD CONSTRAINT "evaluation_fk_client_id_fkey" FOREIGN KEY ("fk_client_id") REFERENCES "public"."client"("client_id");



ALTER TABLE ONLY "public"."evaluation"
    ADD CONSTRAINT "evaluation_fk_luc_procedure_id_fkey" FOREIGN KEY ("fk_luc_procedure_id") REFERENCES "public"."luc_procedure"("procedure_id");



ALTER TABLE ONLY "public"."evaluation"
    ADD CONSTRAINT "evaluation_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."pilot_mission_status"
    ADD CONSTRAINT "fk_owner" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "fk_users_auth_user" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flight_requests"
    ADD CONSTRAINT "flight_requests_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."flight_requests"
    ADD CONSTRAINT "flight_requests_fk_api_key_id_fkey" FOREIGN KEY ("fk_api_key_id") REFERENCES "public"."api_keys"("api_key_id");



ALTER TABLE ONLY "public"."flight_requests"
    ADD CONSTRAINT "flight_requests_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."flytbase_mission"
    ADD CONSTRAINT "flytbase_mission_fk_planning_id_fkey" FOREIGN KEY ("fk_planning_id") REFERENCES "public"."planning"("planning_id");



ALTER TABLE ONLY "public"."flytbase_mission_log"
    ADD CONSTRAINT "flytbase_mission_log_fk_flytbase_mission_id_fkey" FOREIGN KEY ("fk_flytbase_mission_id") REFERENCES "public"."flytbase_mission"("flytbase_mission_id");



ALTER TABLE ONLY "public"."flytbase_mission_status"
    ADD CONSTRAINT "flytbase_mission_status_fk_flytbase_mission_id_fkey" FOREIGN KEY ("fk_flytbase_mission_id") REFERENCES "public"."flytbase_mission"("flytbase_mission_id");



ALTER TABLE ONLY "public"."kanban"
    ADD CONSTRAINT "kanban_fk_evaluation_id_fkey" FOREIGN KEY ("fk_evaluation_id") REFERENCES "public"."evaluation"("evaluation_id");



ALTER TABLE ONLY "public"."kanban"
    ADD CONSTRAINT "kanban_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."kanban"
    ADD CONSTRAINT "kanban_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."luc_document"
    ADD CONSTRAINT "luc_document_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."luc_document"
    ADD CONSTRAINT "luc_document_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."luc_document"
    ADD CONSTRAINT "luc_document_fk_component_id_fkey" FOREIGN KEY ("fk_component_id") REFERENCES "public"."tool_component"("component_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."luc_document"
    ADD CONSTRAINT "luc_document_fk_doc_type_id_fkey" FOREIGN KEY ("fk_doc_type_id") REFERENCES "public"."luc_doc_type"("doc_type_id");



ALTER TABLE ONLY "public"."luc_document"
    ADD CONSTRAINT "luc_document_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."luc_document_rev"
    ADD CONSTRAINT "luc_document_rev_fk_document_id_fkey" FOREIGN KEY ("fk_document_id") REFERENCES "public"."luc_document"("document_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."luc_document_rev"
    ADD CONSTRAINT "luc_document_rev_revised_by_user_id_fkey" FOREIGN KEY ("revised_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."luc_procedure"
    ADD CONSTRAINT "luc_procedure_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."luc_procedure"
    ADD CONSTRAINT "luc_procedure_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."luc_procedure"
    ADD CONSTRAINT "luc_procedure_fk_document_id_fkey" FOREIGN KEY ("fk_document_id") REFERENCES "public"."luc_document"("document_id");



ALTER TABLE ONLY "public"."luc_procedure"
    ADD CONSTRAINT "luc_procedure_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."maintenance_ticket"
    ADD CONSTRAINT "maintenance_ticket_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."maintenance_ticket_attachment"
    ADD CONSTRAINT "maintenance_ticket_attachment_fk_ticket_id_fkey" FOREIGN KEY ("fk_ticket_id") REFERENCES "public"."maintenance_ticket"("ticket_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_ticket_attachment"
    ADD CONSTRAINT "maintenance_ticket_attachment_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."maintenance_ticket_event"
    ADD CONSTRAINT "maintenance_ticket_event_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."maintenance_ticket_event"
    ADD CONSTRAINT "maintenance_ticket_event_fk_ticket_id_fkey" FOREIGN KEY ("fk_ticket_id") REFERENCES "public"."maintenance_ticket"("ticket_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_ticket"
    ADD CONSTRAINT "maintenance_ticket_fk_component_id_fkey" FOREIGN KEY ("fk_component_id") REFERENCES "public"."tool_component"("component_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."maintenance_ticket"
    ADD CONSTRAINT "maintenance_ticket_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."maintenance_ticket"
    ADD CONSTRAINT "maintenance_ticket_fk_tool_id_fkey" FOREIGN KEY ("fk_tool_id") REFERENCES "public"."tool"("tool_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."maintenance_ticket_item"
    ADD CONSTRAINT "maintenance_ticket_item_fk_component_id_fkey" FOREIGN KEY ("fk_component_id") REFERENCES "public"."tool_component"("component_id");



ALTER TABLE ONLY "public"."maintenance_ticket_item"
    ADD CONSTRAINT "maintenance_ticket_item_fk_ticket_id_fkey" FOREIGN KEY ("fk_ticket_id") REFERENCES "public"."maintenance_ticket"("ticket_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_ticket_report"
    ADD CONSTRAINT "maintenance_ticket_report_fk_ticket_id_fkey" FOREIGN KEY ("fk_ticket_id") REFERENCES "public"."maintenance_ticket"("ticket_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_ticket_report"
    ADD CONSTRAINT "maintenance_ticket_report_generated_by_user_id_fkey" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."maintenance_ticket"
    ADD CONSTRAINT "maintenance_ticket_reported_by_user_id_fkey" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "public"."messages"("message_id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."mission_component"
    ADD CONSTRAINT "mission_component_fk_planning_id_fkey" FOREIGN KEY ("fk_planning_id") REFERENCES "public"."planning"("planning_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mission_component"
    ADD CONSTRAINT "mission_component_fk_tool_id_fkey" FOREIGN KEY ("fk_tool_id") REFERENCES "public"."tool"("tool_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification"
    ADD CONSTRAINT "notification_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."operation_attachment"
    ADD CONSTRAINT "operation_attachment_fk_operation_id_fkey" FOREIGN KEY ("fk_operation_id") REFERENCES "public"."pilot_mission"("pilot_mission_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operation_attachment"
    ADD CONSTRAINT "operation_attachment_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."owner"
    ADD CONSTRAINT "owner_fk_country_id_fkey" FOREIGN KEY ("fk_country_id") REFERENCES "public"."countries"("country_id");



ALTER TABLE ONLY "public"."owner_territorial_unit"
    ADD CONSTRAINT "owner_territorial_unit_fk_country_id_fkey" FOREIGN KEY ("fk_country_id") REFERENCES "public"."countries"("country_id");



ALTER TABLE ONLY "public"."owner_territorial_unit"
    ADD CONSTRAINT "owner_territorial_unit_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."owner_territorial_unit"
    ADD CONSTRAINT "owner_territorial_unit_unit_manager_id_fkey" FOREIGN KEY ("unit_manager_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."payload"
    ADD CONSTRAINT "payload_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."payload"
    ADD CONSTRAINT "payload_fk_tool_id_fkey" FOREIGN KEY ("fk_tool_id") REFERENCES "public"."tool"("tool_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pilot_declaration"
    ADD CONSTRAINT "pilot_declaration_fk_tool_id_fkey" FOREIGN KEY ("fk_tool_id") REFERENCES "public"."tool"("tool_id");



ALTER TABLE ONLY "public"."pilot_declaration"
    ADD CONSTRAINT "pilot_declaration_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."pilot_mission"
    ADD CONSTRAINT "pilot_mission_fk_client_id_fkey" FOREIGN KEY ("fk_client_id") REFERENCES "public"."client"("client_id");



ALTER TABLE ONLY "public"."pilot_mission"
    ADD CONSTRAINT "pilot_mission_fk_erp_group_id_fkey" FOREIGN KEY ("fk_erp_group_id") REFERENCES "public"."erp_location_group"("group_id");



ALTER TABLE ONLY "public"."pilot_mission"
    ADD CONSTRAINT "pilot_mission_fk_luc_procedure_id_fkey" FOREIGN KEY ("fk_luc_procedure_id") REFERENCES "public"."luc_procedure"("procedure_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pilot_mission"
    ADD CONSTRAINT "pilot_mission_fk_mission_category_id_fkey" FOREIGN KEY ("fk_mission_category_id") REFERENCES "public"."pilot_mission_category"("category_id");



ALTER TABLE ONLY "public"."pilot_mission"
    ADD CONSTRAINT "pilot_mission_fk_mission_result_type_id_fkey" FOREIGN KEY ("fk_mission_result_type_id") REFERENCES "public"."pilot_mission_result_type"("result_type_id");



ALTER TABLE ONLY "public"."pilot_mission"
    ADD CONSTRAINT "pilot_mission_fk_mission_status_id_fkey" FOREIGN KEY ("fk_mission_status_id") REFERENCES "public"."pilot_mission_status"("status_id");



ALTER TABLE ONLY "public"."pilot_mission"
    ADD CONSTRAINT "pilot_mission_fk_mission_type_id_fkey" FOREIGN KEY ("fk_mission_type_id") REFERENCES "public"."pilot_mission_type"("mission_type_id");



ALTER TABLE ONLY "public"."pilot_mission"
    ADD CONSTRAINT "pilot_mission_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."pilot_mission"
    ADD CONSTRAINT "pilot_mission_fk_pilot_user_id_fkey" FOREIGN KEY ("fk_pilot_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."pilot_mission"
    ADD CONSTRAINT "pilot_mission_fk_planning_id_fkey" FOREIGN KEY ("fk_planning_id") REFERENCES "public"."planning"("planning_id");



ALTER TABLE ONLY "public"."pilot_mission"
    ADD CONSTRAINT "pilot_mission_fk_tool_id_fkey" FOREIGN KEY ("fk_tool_id") REFERENCES "public"."tool"("tool_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pilot_mission_planned_template_logbook"
    ADD CONSTRAINT "pilot_mission_planned_template_logbook_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."pilot_mission_result"
    ADD CONSTRAINT "pilot_mission_result_fk_pilot_mission_id_fkey" FOREIGN KEY ("fk_pilot_mission_id") REFERENCES "public"."pilot_mission"("pilot_mission_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pilot_mission_result_type"
    ADD CONSTRAINT "pilot_mission_result_type_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planning"
    ADD CONSTRAINT "planning_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."planning"
    ADD CONSTRAINT "planning_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."planning"
    ADD CONSTRAINT "planning_fk_client_id_fkey" FOREIGN KEY ("fk_client_id") REFERENCES "public"."client"("client_id");



ALTER TABLE ONLY "public"."planning"
    ADD CONSTRAINT "planning_fk_evaluation_id_fkey" FOREIGN KEY ("fk_evaluation_id") REFERENCES "public"."evaluation"("evaluation_id");



ALTER TABLE ONLY "public"."planning"
    ADD CONSTRAINT "planning_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."planning_logbook"
    ADD CONSTRAINT "planning_logbook_fk_client_id_fkey" FOREIGN KEY ("fk_client_id") REFERENCES "public"."client"("client_id");



ALTER TABLE ONLY "public"."planning_logbook"
    ADD CONSTRAINT "planning_logbook_fk_evaluation_id_fkey" FOREIGN KEY ("fk_evaluation_id") REFERENCES "public"."evaluation"("evaluation_id");



ALTER TABLE ONLY "public"."planning_logbook"
    ADD CONSTRAINT "planning_logbook_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."planning_logbook"
    ADD CONSTRAINT "planning_logbook_fk_planning_id_fkey" FOREIGN KEY ("fk_planning_id") REFERENCES "public"."planning"("planning_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planning_logbook"
    ADD CONSTRAINT "planning_logbook_fk_tool_id_fkey" FOREIGN KEY ("fk_tool_id") REFERENCES "public"."tool"("tool_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."planning_logbook"
    ADD CONSTRAINT "planning_logbook_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."planning_test_logbook"
    ADD CONSTRAINT "planning_test_logbook_fk_evaluation_id_fkey" FOREIGN KEY ("fk_evaluation_id") REFERENCES "public"."evaluation"("evaluation_id");



ALTER TABLE ONLY "public"."planning_test_logbook"
    ADD CONSTRAINT "planning_test_logbook_fk_mission_planning_id_fkey" FOREIGN KEY ("fk_mission_planning_id") REFERENCES "public"."planning_logbook"("mission_planning_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planning_test_logbook"
    ADD CONSTRAINT "planning_test_logbook_fk_observer_id_fkey" FOREIGN KEY ("fk_observer_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."planning_test_logbook"
    ADD CONSTRAINT "planning_test_logbook_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."planning_test_logbook"
    ADD CONSTRAINT "planning_test_logbook_fk_pic_id_fkey" FOREIGN KEY ("fk_pic_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."planning_test_logbook"
    ADD CONSTRAINT "planning_test_logbook_fk_planning_id_fkey" FOREIGN KEY ("fk_planning_id") REFERENCES "public"."planning"("planning_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planning_test_logbook"
    ADD CONSTRAINT "planning_test_logbook_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."planning_test_logbook"
    ADD CONSTRAINT "planning_test_logbook_tested_by_user_id_fkey" FOREIGN KEY ("tested_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."repository_file"
    ADD CONSTRAINT "repository_file_fk_file_type_id_fkey" FOREIGN KEY ("fk_file_type_id") REFERENCES "public"."repository_file_type"("file_type_id");



ALTER TABLE ONLY "public"."repository_file"
    ADD CONSTRAINT "repository_file_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."repository_file"
    ADD CONSTRAINT "repository_file_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."safety_action"
    ADD CONSTRAINT "safety_action_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."safety_action"
    ADD CONSTRAINT "safety_action_fk_report_id_fkey" FOREIGN KEY ("fk_report_id") REFERENCES "public"."safety_report"("report_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."safety_action"
    ADD CONSTRAINT "safety_action_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."safety_report"
    ADD CONSTRAINT "safety_report_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."safety_report"
    ADD CONSTRAINT "safety_report_fk_pilot_mission_id_fkey" FOREIGN KEY ("fk_pilot_mission_id") REFERENCES "public"."pilot_mission"("pilot_mission_id");



ALTER TABLE ONLY "public"."safety_report"
    ADD CONSTRAINT "safety_report_investigated_by_user_id_fkey" FOREIGN KEY ("investigated_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."safety_report"
    ADD CONSTRAINT "safety_report_reported_by_user_id_fkey" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."spi_kpi_definition"
    ADD CONSTRAINT "spi_kpi_definition_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."spi_kpi"
    ADD CONSTRAINT "spi_kpi_fk_definition_id_fkey" FOREIGN KEY ("fk_definition_id") REFERENCES "public"."spi_kpi_definition"("definition_id");



ALTER TABLE ONLY "public"."spi_kpi"
    ADD CONSTRAINT "spi_kpi_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."spi_kpi_log"
    ADD CONSTRAINT "spi_kpi_log_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."spi_kpi_log"
    ADD CONSTRAINT "spi_kpi_log_fk_kpi_id_fkey" FOREIGN KEY ("fk_kpi_id") REFERENCES "public"."spi_kpi"("kpi_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spi_kpi"
    ADD CONSTRAINT "spi_kpi_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."spi_kpi_target_proposal"
    ADD CONSTRAINT "spi_kpi_target_proposal_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."spi_kpi_target_proposal"
    ADD CONSTRAINT "spi_kpi_target_proposal_fk_definition_id_fkey" FOREIGN KEY ("fk_definition_id") REFERENCES "public"."spi_kpi_definition"("definition_id");



ALTER TABLE ONLY "public"."spi_kpi_target_proposal"
    ADD CONSTRAINT "spi_kpi_target_proposal_proposed_by_user_id_fkey" FOREIGN KEY ("proposed_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."team"
    ADD CONSTRAINT "team_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_fk_team_id_fkey" FOREIGN KEY ("fk_team_id") REFERENCES "public"."team"("team_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team"
    ADD CONSTRAINT "team_team_leader_id_fkey" FOREIGN KEY ("team_leader_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."ticket_attachment"
    ADD CONSTRAINT "ticket_attachment_fk_ticket_id_fkey" FOREIGN KEY ("fk_ticket_id") REFERENCES "public"."maintenance_ticket"("ticket_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_attachment"
    ADD CONSTRAINT "ticket_attachment_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tool"
    ADD CONSTRAINT "tool_assigned_client_id_fkey" FOREIGN KEY ("assigned_client_id") REFERENCES "public"."client"("client_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tool_component"
    ADD CONSTRAINT "tool_component_fk_tool_id_fkey" FOREIGN KEY ("fk_tool_id") REFERENCES "public"."tool"("tool_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_erp"
    ADD CONSTRAINT "tool_erp_fk_tool_id_fkey" FOREIGN KEY ("fk_tool_id") REFERENCES "public"."tool"("tool_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool"
    ADD CONSTRAINT "tool_fk_model_id_fkey" FOREIGN KEY ("fk_model_id") REFERENCES "public"."tool_model"("model_id");



ALTER TABLE ONLY "public"."tool"
    ADD CONSTRAINT "tool_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool"
    ADD CONSTRAINT "tool_fk_status_id_fkey" FOREIGN KEY ("fk_status_id") REFERENCES "public"."tool_status"("status_id");



ALTER TABLE ONLY "public"."tool_maintenance"
    ADD CONSTRAINT "tool_maintenance_fk_tool_id_fkey" FOREIGN KEY ("fk_tool_id") REFERENCES "public"."tool"("tool_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_maintenance"
    ADD CONSTRAINT "tool_maintenance_performed_by_user_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."training_attendance"
    ADD CONSTRAINT "training_attendance_fk_training_id_fkey" FOREIGN KEY ("fk_training_id") REFERENCES "public"."training"("training_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."training_attendance"
    ADD CONSTRAINT "training_attendance_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."training"
    ADD CONSTRAINT "training_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."training"
    ADD CONSTRAINT "training_trainer_user_id_fkey" FOREIGN KEY ("trainer_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."turn_users"
    ADD CONSTRAINT "turn_users_fk_turn_id_fkey" FOREIGN KEY ("fk_turn_id") REFERENCES "public"."turns"("turn_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."turn_users"
    ADD CONSTRAINT "turn_users_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."turns"
    ADD CONSTRAINT "turns_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."user_device"
    ADD CONSTRAINT "user_device_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_owner"
    ADD CONSTRAINT "user_owner_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_owner"
    ADD CONSTRAINT "user_owner_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permessi"
    ADD CONSTRAINT "user_permessi_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permessi"
    ADD CONSTRAINT "user_permessi_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."user_qualification"
    ADD CONSTRAINT "user_qualification_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."user_qualification"
    ADD CONSTRAINT "user_qualification_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_session"
    ADD CONSTRAINT "user_session_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_fk_client_id_fkey" FOREIGN KEY ("fk_client_id") REFERENCES "public"."client"("client_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_fk_owner_id_fkey" FOREIGN KEY ("fk_owner_id") REFERENCES "public"."owner"("owner_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_fk_territorial_unit_fkey" FOREIGN KEY ("fk_territorial_unit") REFERENCES "public"."owner_territorial_unit"("unit_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users_profile"
    ADD CONSTRAINT "users_profile_fk_country_id_fkey" FOREIGN KEY ("fk_country_id") REFERENCES "public"."countries"("country_id");



ALTER TABLE ONLY "public"."users_profile"
    ADD CONSTRAINT "users_profile_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



CREATE POLICY "Allow all for authenticated users" ON "public"."spi_kpi" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all for authenticated users" ON "public"."spi_kpi_definition" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow duplicate check on users" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Authenticated can create profiles" ON "public"."users_profile" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated can insert users" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Only admins can delete users" ON "public"."users" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Service role can create profiles" ON "public"."users_profile" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can insert users" ON "public"."users" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can manage settings" ON "public"."user_settings" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can insert own settings" ON "public"."user_settings" FOR INSERT TO "authenticated" WITH CHECK (("fk_user_id" = "public"."get_current_user_id"()));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth_user_id" = "auth"."uid"())) WITH CHECK (("auth_user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile details" ON "public"."users_profile" FOR UPDATE TO "authenticated" USING (("fk_user_id" = "public"."get_current_user_id"())) WITH CHECK (("fk_user_id" = "public"."get_current_user_id"()));



CREATE POLICY "Users can update own settings" ON "public"."user_settings" FOR UPDATE TO "authenticated" USING (("fk_user_id" = "public"."get_current_user_id"())) WITH CHECK (("fk_user_id" = "public"."get_current_user_id"()));



CREATE POLICY "Users can view own profile" ON "public"."users" FOR SELECT TO "authenticated" USING ((("auth_user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Users can view own profile details" ON "public"."users_profile" FOR SELECT TO "authenticated" USING ((("fk_user_id" = "public"."get_current_user_id"()) OR "public"."is_admin"()));



CREATE POLICY "Users can view own settings" ON "public"."user_settings" FOR SELECT TO "authenticated" USING ((("fk_user_id" = "public"."get_current_user_id"()) OR "public"."is_admin"()));



ALTER TABLE "public"."ai_token_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alert_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assignment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."backup_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_shift" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checklist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."code_index" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."communication" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."communication_general" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."compliance_evidence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."compliance_requirement" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."compliance_status_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."component_type_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."controlroom_drone" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."controlroom_meta" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."countries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dcc_integrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deleted_owner" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deleted_user" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drone_class_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."emergency_response_plan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."erp_location_group" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."erp_location_group_contact" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."erp_location_group_location" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluation_action" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluation_file" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flight_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flytbase_mission" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flytbase_mission_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flytbase_mission_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kanban" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."luc_doc_type" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."luc_document" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."luc_document_rev" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."luc_procedure" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_ticket" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_ticket_attachment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_ticket_event" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_ticket_item" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_ticket_report" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mission_component" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mission_flight_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."operation_attachment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_chart_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."owner" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."owner_territorial_unit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payload" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pilot_declaration" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pilot_mission" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pilot_mission_category" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pilot_mission_planned_template_logbook" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pilot_mission_result" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pilot_mission_result_type" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pilot_mission_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pilot_mission_type" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pilot_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pilot_vehicle_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."planning" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."planning_logbook" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."planning_test_logbook" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."procedure_document" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."repository_file" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."repository_file_type" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."safety_action" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."safety_report" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schema_chunks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spi_kpi" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spi_kpi_definition" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spi_kpi_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spi_kpi_target_proposal" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_attachment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_component" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_erp" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_maintenance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_model" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."training" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."training_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transaction_signs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."turn_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."turns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_authorization_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_device" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_owner" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_permessi" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_qualification" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_session" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users_profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."v_training_session_stats" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_email_exists"("check_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_email_exists"("check_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_email_exists"("check_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_duplicates"("p_email" "text", "p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_duplicates"("p_email" "text", "p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_duplicates"("p_email" "text", "p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_atomic"("p_auth_user_id" "uuid", "p_username" character varying, "p_email" character varying, "p_password_hash" character varying, "p_first_name" character varying, "p_last_name" character varying, "p_phone" character varying, "p_fk_owner_id" integer, "p_fk_client_id" integer, "p_fk_territorial_unit" integer, "p_user_type" character varying, "p_user_role" character varying, "p_is_viewer" character, "p_is_manager" character, "p_user_timezone" character varying, "p_user_unique_code" character varying, "p_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_atomic"("p_auth_user_id" "uuid", "p_username" character varying, "p_email" character varying, "p_password_hash" character varying, "p_first_name" character varying, "p_last_name" character varying, "p_phone" character varying, "p_fk_owner_id" integer, "p_fk_client_id" integer, "p_fk_territorial_unit" integer, "p_user_type" character varying, "p_user_role" character varying, "p_is_viewer" character, "p_is_manager" character, "p_user_timezone" character varying, "p_user_unique_code" character varying, "p_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_atomic"("p_auth_user_id" "uuid", "p_username" character varying, "p_email" character varying, "p_password_hash" character varying, "p_first_name" character varying, "p_last_name" character varying, "p_phone" character varying, "p_fk_owner_id" integer, "p_fk_client_id" integer, "p_fk_territorial_unit" integer, "p_user_type" character varying, "p_user_role" character varying, "p_is_viewer" character, "p_is_manager" character, "p_user_timezone" character varying, "p_user_unique_code" character varying, "p_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_user_settings"("p_user_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_user_settings"("p_user_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_user_settings"("p_user_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."test_user_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_user_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_user_creation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."ai_token_usage" TO "anon";
GRANT ALL ON TABLE "public"."ai_token_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_token_usage" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ai_token_usage_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ai_token_usage_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ai_token_usage_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."alert_log" TO "anon";
GRANT ALL ON TABLE "public"."alert_log" TO "authenticated";
GRANT ALL ON TABLE "public"."alert_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."alert_log_alert_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."alert_log_alert_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."alert_log_alert_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."api_keys" TO "anon";
GRANT ALL ON TABLE "public"."api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."api_keys" TO "service_role";



GRANT ALL ON SEQUENCE "public"."api_keys_api_key_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."api_keys_api_key_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."api_keys_api_key_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."assignment" TO "anon";
GRANT ALL ON TABLE "public"."assignment" TO "authenticated";
GRANT ALL ON TABLE "public"."assignment" TO "service_role";



GRANT ALL ON SEQUENCE "public"."assignment_assignment_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."assignment_assignment_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."assignment_assignment_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."backup_log" TO "anon";
GRANT ALL ON TABLE "public"."backup_log" TO "authenticated";
GRANT ALL ON TABLE "public"."backup_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."backup_log_backup_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."backup_log_backup_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."backup_log_backup_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_shift" TO "anon";
GRANT ALL ON TABLE "public"."calendar_shift" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_shift" TO "service_role";



GRANT ALL ON SEQUENCE "public"."calendar_shift_shift_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."calendar_shift_shift_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."calendar_shift_shift_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."checklist" TO "anon";
GRANT ALL ON TABLE "public"."checklist" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist" TO "service_role";



GRANT ALL ON SEQUENCE "public"."checklist_checklist_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."checklist_checklist_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."checklist_checklist_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."client" TO "anon";
GRANT ALL ON TABLE "public"."client" TO "authenticated";
GRANT ALL ON TABLE "public"."client" TO "service_role";



GRANT ALL ON SEQUENCE "public"."client_client_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."client_client_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."client_client_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."code_index" TO "anon";
GRANT ALL ON TABLE "public"."code_index" TO "authenticated";
GRANT ALL ON TABLE "public"."code_index" TO "service_role";



GRANT ALL ON SEQUENCE "public"."code_index_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."code_index_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."code_index_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."communication" TO "anon";
GRANT ALL ON TABLE "public"."communication" TO "authenticated";
GRANT ALL ON TABLE "public"."communication" TO "service_role";



GRANT ALL ON SEQUENCE "public"."communication_communication_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."communication_communication_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."communication_communication_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."communication_general" TO "anon";
GRANT ALL ON TABLE "public"."communication_general" TO "authenticated";
GRANT ALL ON TABLE "public"."communication_general" TO "service_role";



GRANT ALL ON SEQUENCE "public"."communication_general_communication_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."communication_general_communication_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."communication_general_communication_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."compliance_evidence" TO "anon";
GRANT ALL ON TABLE "public"."compliance_evidence" TO "authenticated";
GRANT ALL ON TABLE "public"."compliance_evidence" TO "service_role";



GRANT ALL ON SEQUENCE "public"."compliance_evidence_evidence_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."compliance_evidence_evidence_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."compliance_evidence_evidence_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."compliance_requirement" TO "anon";
GRANT ALL ON TABLE "public"."compliance_requirement" TO "authenticated";
GRANT ALL ON TABLE "public"."compliance_requirement" TO "service_role";



GRANT ALL ON SEQUENCE "public"."compliance_requirement_requirement_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."compliance_requirement_requirement_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."compliance_requirement_requirement_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."compliance_status_log" TO "anon";
GRANT ALL ON TABLE "public"."compliance_status_log" TO "authenticated";
GRANT ALL ON TABLE "public"."compliance_status_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."compliance_status_log_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."compliance_status_log_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."compliance_status_log_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."component_type_config" TO "anon";
GRANT ALL ON TABLE "public"."component_type_config" TO "authenticated";
GRANT ALL ON TABLE "public"."component_type_config" TO "service_role";



GRANT ALL ON SEQUENCE "public"."component_type_config_type_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."component_type_config_type_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."component_type_config_type_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."controlroom_drone" TO "anon";
GRANT ALL ON TABLE "public"."controlroom_drone" TO "authenticated";
GRANT ALL ON TABLE "public"."controlroom_drone" TO "service_role";



GRANT ALL ON SEQUENCE "public"."controlroom_drone_controlroom_drone_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."controlroom_drone_controlroom_drone_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."controlroom_drone_controlroom_drone_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."controlroom_meta" TO "anon";
GRANT ALL ON TABLE "public"."controlroom_meta" TO "authenticated";
GRANT ALL ON TABLE "public"."controlroom_meta" TO "service_role";



GRANT ALL ON SEQUENCE "public"."controlroom_meta_meta_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."controlroom_meta_meta_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."controlroom_meta_meta_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."countries" TO "anon";
GRANT ALL ON TABLE "public"."countries" TO "authenticated";
GRANT ALL ON TABLE "public"."countries" TO "service_role";



GRANT ALL ON SEQUENCE "public"."countries_country_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."countries_country_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."countries_country_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."dcc_integrations" TO "anon";
GRANT ALL ON TABLE "public"."dcc_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."dcc_integrations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dcc_integrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dcc_integrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dcc_integrations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."deleted_owner" TO "anon";
GRANT ALL ON TABLE "public"."deleted_owner" TO "authenticated";
GRANT ALL ON TABLE "public"."deleted_owner" TO "service_role";



GRANT ALL ON SEQUENCE "public"."deleted_owner_deleted_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."deleted_owner_deleted_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."deleted_owner_deleted_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."deleted_user" TO "anon";
GRANT ALL ON TABLE "public"."deleted_user" TO "authenticated";
GRANT ALL ON TABLE "public"."deleted_user" TO "service_role";



GRANT ALL ON SEQUENCE "public"."deleted_user_deleted_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."deleted_user_deleted_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."deleted_user_deleted_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."drone_class_config" TO "anon";
GRANT ALL ON TABLE "public"."drone_class_config" TO "authenticated";
GRANT ALL ON TABLE "public"."drone_class_config" TO "service_role";



GRANT ALL ON SEQUENCE "public"."drone_class_config_class_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."drone_class_config_class_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."drone_class_config_class_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."emergency_response_plan" TO "anon";
GRANT ALL ON TABLE "public"."emergency_response_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."emergency_response_plan" TO "service_role";



GRANT ALL ON SEQUENCE "public"."emergency_response_plan_erp_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."emergency_response_plan_erp_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."emergency_response_plan_erp_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."erp_location_group" TO "anon";
GRANT ALL ON TABLE "public"."erp_location_group" TO "authenticated";
GRANT ALL ON TABLE "public"."erp_location_group" TO "service_role";



GRANT ALL ON TABLE "public"."erp_location_group_contact" TO "anon";
GRANT ALL ON TABLE "public"."erp_location_group_contact" TO "authenticated";
GRANT ALL ON TABLE "public"."erp_location_group_contact" TO "service_role";



GRANT ALL ON SEQUENCE "public"."erp_location_group_contact_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."erp_location_group_contact_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."erp_location_group_contact_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."erp_location_group_group_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."erp_location_group_group_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."erp_location_group_group_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."erp_location_group_location" TO "anon";
GRANT ALL ON TABLE "public"."erp_location_group_location" TO "authenticated";
GRANT ALL ON TABLE "public"."erp_location_group_location" TO "service_role";



GRANT ALL ON SEQUENCE "public"."erp_location_group_location_location_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."erp_location_group_location_location_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."erp_location_group_location_location_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."evaluation" TO "anon";
GRANT ALL ON TABLE "public"."evaluation" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluation" TO "service_role";



GRANT ALL ON TABLE "public"."evaluation_action" TO "anon";
GRANT ALL ON TABLE "public"."evaluation_action" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluation_action" TO "service_role";



GRANT ALL ON SEQUENCE "public"."evaluation_action_action_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."evaluation_action_action_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."evaluation_action_action_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."evaluation_evaluation_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."evaluation_evaluation_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."evaluation_evaluation_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."evaluation_file" TO "anon";
GRANT ALL ON TABLE "public"."evaluation_file" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluation_file" TO "service_role";



GRANT ALL ON SEQUENCE "public"."evaluation_file_file_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."evaluation_file_file_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."evaluation_file_file_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."flight_requests" TO "anon";
GRANT ALL ON TABLE "public"."flight_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."flight_requests" TO "service_role";



GRANT ALL ON SEQUENCE "public"."flight_requests_request_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."flight_requests_request_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."flight_requests_request_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."flytbase_mission" TO "anon";
GRANT ALL ON TABLE "public"."flytbase_mission" TO "authenticated";
GRANT ALL ON TABLE "public"."flytbase_mission" TO "service_role";



GRANT ALL ON SEQUENCE "public"."flytbase_mission_flytbase_mission_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."flytbase_mission_flytbase_mission_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."flytbase_mission_flytbase_mission_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."flytbase_mission_log" TO "anon";
GRANT ALL ON TABLE "public"."flytbase_mission_log" TO "authenticated";
GRANT ALL ON TABLE "public"."flytbase_mission_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."flytbase_mission_log_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."flytbase_mission_log_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."flytbase_mission_log_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."flytbase_mission_status" TO "anon";
GRANT ALL ON TABLE "public"."flytbase_mission_status" TO "authenticated";
GRANT ALL ON TABLE "public"."flytbase_mission_status" TO "service_role";



GRANT ALL ON SEQUENCE "public"."flytbase_mission_status_status_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."flytbase_mission_status_status_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."flytbase_mission_status_status_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."kanban" TO "anon";
GRANT ALL ON TABLE "public"."kanban" TO "authenticated";
GRANT ALL ON TABLE "public"."kanban" TO "service_role";



GRANT ALL ON SEQUENCE "public"."kanban_kanban_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."kanban_kanban_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."kanban_kanban_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."luc_doc_type" TO "anon";
GRANT ALL ON TABLE "public"."luc_doc_type" TO "authenticated";
GRANT ALL ON TABLE "public"."luc_doc_type" TO "service_role";



GRANT ALL ON SEQUENCE "public"."luc_doc_type_doc_type_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."luc_doc_type_doc_type_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."luc_doc_type_doc_type_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."luc_document" TO "anon";
GRANT ALL ON TABLE "public"."luc_document" TO "authenticated";
GRANT ALL ON TABLE "public"."luc_document" TO "service_role";



GRANT ALL ON SEQUENCE "public"."luc_document_document_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."luc_document_document_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."luc_document_document_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."luc_document_rev" TO "anon";
GRANT ALL ON TABLE "public"."luc_document_rev" TO "authenticated";
GRANT ALL ON TABLE "public"."luc_document_rev" TO "service_role";



GRANT ALL ON SEQUENCE "public"."luc_document_rev_revision_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."luc_document_rev_revision_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."luc_document_rev_revision_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."luc_procedure" TO "anon";
GRANT ALL ON TABLE "public"."luc_procedure" TO "authenticated";
GRANT ALL ON TABLE "public"."luc_procedure" TO "service_role";



GRANT ALL ON SEQUENCE "public"."luc_procedure_procedure_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."luc_procedure_procedure_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."luc_procedure_procedure_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_ticket" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_ticket" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_ticket" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_ticket_attachment" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_ticket_attachment" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_ticket_attachment" TO "service_role";



GRANT ALL ON SEQUENCE "public"."maintenance_ticket_attachment_attachment_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."maintenance_ticket_attachment_attachment_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."maintenance_ticket_attachment_attachment_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_ticket_event" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_ticket_event" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_ticket_event" TO "service_role";



GRANT ALL ON SEQUENCE "public"."maintenance_ticket_event_event_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."maintenance_ticket_event_event_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."maintenance_ticket_event_event_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_ticket_item" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_ticket_item" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_ticket_item" TO "service_role";



GRANT ALL ON SEQUENCE "public"."maintenance_ticket_item_item_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."maintenance_ticket_item_item_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."maintenance_ticket_item_item_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_ticket_report" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_ticket_report" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_ticket_report" TO "service_role";



GRANT ALL ON SEQUENCE "public"."maintenance_ticket_report_report_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."maintenance_ticket_report_report_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."maintenance_ticket_report_report_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."maintenance_ticket_ticket_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."maintenance_ticket_ticket_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."maintenance_ticket_ticket_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."messages_message_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."messages_message_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."messages_message_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mission_component" TO "anon";
GRANT ALL ON TABLE "public"."mission_component" TO "authenticated";
GRANT ALL ON TABLE "public"."mission_component" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mission_component_component_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mission_component_component_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mission_component_component_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mission_flight_logs" TO "anon";
GRANT ALL ON TABLE "public"."mission_flight_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."mission_flight_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mission_flight_logs_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mission_flight_logs_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mission_flight_logs_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notification" TO "anon";
GRANT ALL ON TABLE "public"."notification" TO "authenticated";
GRANT ALL ON TABLE "public"."notification" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notification_notification_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notification_notification_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notification_notification_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."operation_attachment" TO "anon";
GRANT ALL ON TABLE "public"."operation_attachment" TO "authenticated";
GRANT ALL ON TABLE "public"."operation_attachment" TO "service_role";



GRANT ALL ON SEQUENCE "public"."operation_attachment_attachment_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."operation_attachment_attachment_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."operation_attachment_attachment_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."org_chart_overrides" TO "anon";
GRANT ALL ON TABLE "public"."org_chart_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."org_chart_overrides" TO "service_role";



GRANT ALL ON SEQUENCE "public"."org_chart_overrides_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."org_chart_overrides_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."org_chart_overrides_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."owner" TO "anon";
GRANT ALL ON TABLE "public"."owner" TO "authenticated";
GRANT ALL ON TABLE "public"."owner" TO "service_role";



GRANT ALL ON SEQUENCE "public"."owner_owner_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."owner_owner_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."owner_owner_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."owner_territorial_unit" TO "anon";
GRANT ALL ON TABLE "public"."owner_territorial_unit" TO "authenticated";
GRANT ALL ON TABLE "public"."owner_territorial_unit" TO "service_role";



GRANT ALL ON SEQUENCE "public"."owner_territorial_unit_unit_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."owner_territorial_unit_unit_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."owner_territorial_unit_unit_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payload" TO "anon";
GRANT ALL ON TABLE "public"."payload" TO "authenticated";
GRANT ALL ON TABLE "public"."payload" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payload_payload_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payload_payload_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payload_payload_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pilot_declaration" TO "anon";
GRANT ALL ON TABLE "public"."pilot_declaration" TO "authenticated";
GRANT ALL ON TABLE "public"."pilot_declaration" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pilot_declaration_declaration_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pilot_declaration_declaration_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pilot_declaration_declaration_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pilot_mission" TO "anon";
GRANT ALL ON TABLE "public"."pilot_mission" TO "authenticated";
GRANT ALL ON TABLE "public"."pilot_mission" TO "service_role";



GRANT ALL ON TABLE "public"."pilot_mission_category" TO "anon";
GRANT ALL ON TABLE "public"."pilot_mission_category" TO "authenticated";
GRANT ALL ON TABLE "public"."pilot_mission_category" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pilot_mission_category_category_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pilot_mission_category_category_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pilot_mission_category_category_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pilot_mission_pilot_mission_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pilot_mission_pilot_mission_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pilot_mission_pilot_mission_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pilot_mission_planned_template_logbook" TO "anon";
GRANT ALL ON TABLE "public"."pilot_mission_planned_template_logbook" TO "authenticated";
GRANT ALL ON TABLE "public"."pilot_mission_planned_template_logbook" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pilot_mission_planned_template_logbook_template_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pilot_mission_planned_template_logbook_template_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pilot_mission_planned_template_logbook_template_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pilot_mission_result" TO "anon";
GRANT ALL ON TABLE "public"."pilot_mission_result" TO "authenticated";
GRANT ALL ON TABLE "public"."pilot_mission_result" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pilot_mission_result_result_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pilot_mission_result_result_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pilot_mission_result_result_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pilot_mission_result_type" TO "anon";
GRANT ALL ON TABLE "public"."pilot_mission_result_type" TO "authenticated";
GRANT ALL ON TABLE "public"."pilot_mission_result_type" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pilot_mission_result_type_result_type_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pilot_mission_result_type_result_type_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pilot_mission_result_type_result_type_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pilot_mission_status" TO "anon";
GRANT ALL ON TABLE "public"."pilot_mission_status" TO "authenticated";
GRANT ALL ON TABLE "public"."pilot_mission_status" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pilot_mission_status_status_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pilot_mission_status_status_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pilot_mission_status_status_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pilot_mission_type" TO "anon";
GRANT ALL ON TABLE "public"."pilot_mission_type" TO "authenticated";
GRANT ALL ON TABLE "public"."pilot_mission_type" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pilot_mission_type_mission_type_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pilot_mission_type_mission_type_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pilot_mission_type_mission_type_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pilot_status" TO "anon";
GRANT ALL ON TABLE "public"."pilot_status" TO "authenticated";
GRANT ALL ON TABLE "public"."pilot_status" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pilot_status_status_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pilot_status_status_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pilot_status_status_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pilot_vehicle_status" TO "anon";
GRANT ALL ON TABLE "public"."pilot_vehicle_status" TO "authenticated";
GRANT ALL ON TABLE "public"."pilot_vehicle_status" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pilot_vehicle_status_vehicle_status_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pilot_vehicle_status_vehicle_status_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pilot_vehicle_status_vehicle_status_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."planning" TO "anon";
GRANT ALL ON TABLE "public"."planning" TO "authenticated";
GRANT ALL ON TABLE "public"."planning" TO "service_role";



GRANT ALL ON TABLE "public"."planning_logbook" TO "anon";
GRANT ALL ON TABLE "public"."planning_logbook" TO "authenticated";
GRANT ALL ON TABLE "public"."planning_logbook" TO "service_role";



GRANT ALL ON SEQUENCE "public"."planning_logbook_mission_planning_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."planning_logbook_mission_planning_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."planning_logbook_mission_planning_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."planning_planning_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."planning_planning_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."planning_planning_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."planning_test_logbook" TO "anon";
GRANT ALL ON TABLE "public"."planning_test_logbook" TO "authenticated";
GRANT ALL ON TABLE "public"."planning_test_logbook" TO "service_role";



GRANT ALL ON SEQUENCE "public"."planning_test_logbook_test_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."planning_test_logbook_test_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."planning_test_logbook_test_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."procedure_document" TO "anon";
GRANT ALL ON TABLE "public"."procedure_document" TO "authenticated";
GRANT ALL ON TABLE "public"."procedure_document" TO "service_role";



GRANT ALL ON SEQUENCE "public"."procedure_document_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."procedure_document_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."procedure_document_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."repository_file" TO "anon";
GRANT ALL ON TABLE "public"."repository_file" TO "authenticated";
GRANT ALL ON TABLE "public"."repository_file" TO "service_role";



GRANT ALL ON SEQUENCE "public"."repository_file_file_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."repository_file_file_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."repository_file_file_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."repository_file_type" TO "anon";
GRANT ALL ON TABLE "public"."repository_file_type" TO "authenticated";
GRANT ALL ON TABLE "public"."repository_file_type" TO "service_role";



GRANT ALL ON SEQUENCE "public"."repository_file_type_file_type_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."repository_file_type_file_type_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."repository_file_type_file_type_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."safety_action" TO "anon";
GRANT ALL ON TABLE "public"."safety_action" TO "authenticated";
GRANT ALL ON TABLE "public"."safety_action" TO "service_role";



GRANT ALL ON SEQUENCE "public"."safety_action_action_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."safety_action_action_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."safety_action_action_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."safety_report" TO "anon";
GRANT ALL ON TABLE "public"."safety_report" TO "authenticated";
GRANT ALL ON TABLE "public"."safety_report" TO "service_role";



GRANT ALL ON SEQUENCE "public"."safety_report_report_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."safety_report_report_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."safety_report_report_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."schema_chunks" TO "anon";
GRANT ALL ON TABLE "public"."schema_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."schema_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."spi_kpi" TO "anon";
GRANT ALL ON TABLE "public"."spi_kpi" TO "authenticated";
GRANT ALL ON TABLE "public"."spi_kpi" TO "service_role";



GRANT ALL ON TABLE "public"."spi_kpi_definition" TO "anon";
GRANT ALL ON TABLE "public"."spi_kpi_definition" TO "authenticated";
GRANT ALL ON TABLE "public"."spi_kpi_definition" TO "service_role";



GRANT ALL ON SEQUENCE "public"."spi_kpi_definition_definition_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."spi_kpi_definition_definition_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."spi_kpi_definition_definition_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."spi_kpi_kpi_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."spi_kpi_kpi_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."spi_kpi_kpi_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."spi_kpi_log" TO "anon";
GRANT ALL ON TABLE "public"."spi_kpi_log" TO "authenticated";
GRANT ALL ON TABLE "public"."spi_kpi_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."spi_kpi_log_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."spi_kpi_log_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."spi_kpi_log_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."spi_kpi_target_proposal" TO "anon";
GRANT ALL ON TABLE "public"."spi_kpi_target_proposal" TO "authenticated";
GRANT ALL ON TABLE "public"."spi_kpi_target_proposal" TO "service_role";



GRANT ALL ON SEQUENCE "public"."spi_kpi_target_proposal_proposal_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."spi_kpi_target_proposal_proposal_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."spi_kpi_target_proposal_proposal_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."team" TO "anon";
GRANT ALL ON TABLE "public"."team" TO "authenticated";
GRANT ALL ON TABLE "public"."team" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON SEQUENCE "public"."team_members_team_member_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."team_members_team_member_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."team_members_team_member_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."team_team_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."team_team_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."team_team_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_attachment" TO "anon";
GRANT ALL ON TABLE "public"."ticket_attachment" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_attachment" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ticket_attachment_attachment_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ticket_attachment_attachment_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ticket_attachment_attachment_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tool" TO "anon";
GRANT ALL ON TABLE "public"."tool" TO "authenticated";
GRANT ALL ON TABLE "public"."tool" TO "service_role";



GRANT ALL ON TABLE "public"."tool_component" TO "anon";
GRANT ALL ON TABLE "public"."tool_component" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_component" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tool_component_component_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tool_component_component_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tool_component_component_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tool_erp" TO "anon";
GRANT ALL ON TABLE "public"."tool_erp" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_erp" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tool_erp_erp_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tool_erp_erp_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tool_erp_erp_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tool_maintenance" TO "anon";
GRANT ALL ON TABLE "public"."tool_maintenance" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_maintenance" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tool_maintenance_maintenance_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tool_maintenance_maintenance_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tool_maintenance_maintenance_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tool_model" TO "anon";
GRANT ALL ON TABLE "public"."tool_model" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_model" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tool_model_model_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tool_model_model_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tool_model_model_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tool_status" TO "anon";
GRANT ALL ON TABLE "public"."tool_status" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_status" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tool_status_status_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tool_status_status_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tool_status_status_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tool_tool_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tool_tool_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tool_tool_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."training" TO "anon";
GRANT ALL ON TABLE "public"."training" TO "authenticated";
GRANT ALL ON TABLE "public"."training" TO "service_role";



GRANT ALL ON TABLE "public"."training_attendance" TO "anon";
GRANT ALL ON TABLE "public"."training_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."training_attendance" TO "service_role";



GRANT ALL ON SEQUENCE "public"."training_attendance_attendance_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."training_attendance_attendance_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."training_attendance_attendance_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."training_training_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."training_training_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."training_training_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_signs" TO "anon";
GRANT ALL ON TABLE "public"."transaction_signs" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_signs" TO "service_role";



GRANT ALL ON TABLE "public"."turn_users" TO "anon";
GRANT ALL ON TABLE "public"."turn_users" TO "authenticated";
GRANT ALL ON TABLE "public"."turn_users" TO "service_role";



GRANT ALL ON SEQUENCE "public"."turn_users_turn_user_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."turn_users_turn_user_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."turn_users_turn_user_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."turns" TO "anon";
GRANT ALL ON TABLE "public"."turns" TO "authenticated";
GRANT ALL ON TABLE "public"."turns" TO "service_role";



GRANT ALL ON SEQUENCE "public"."turns_turn_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."turns_turn_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."turns_turn_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_authorization_keys" TO "anon";
GRANT ALL ON TABLE "public"."user_authorization_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."user_authorization_keys" TO "service_role";



GRANT ALL ON TABLE "public"."user_device" TO "anon";
GRANT ALL ON TABLE "public"."user_device" TO "authenticated";
GRANT ALL ON TABLE "public"."user_device" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_device_device_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_device_device_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_device_device_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_owner" TO "anon";
GRANT ALL ON TABLE "public"."user_owner" TO "authenticated";
GRANT ALL ON TABLE "public"."user_owner" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_owner_user_owner_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_owner_user_owner_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_owner_user_owner_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_permessi" TO "anon";
GRANT ALL ON TABLE "public"."user_permessi" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permessi" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_permessi_permission_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_permessi_permission_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_permessi_permission_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_qualification" TO "anon";
GRANT ALL ON TABLE "public"."user_qualification" TO "authenticated";
GRANT ALL ON TABLE "public"."user_qualification" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_qualification_qualification_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_qualification_qualification_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_qualification_qualification_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_session" TO "anon";
GRANT ALL ON TABLE "public"."user_session" TO "authenticated";
GRANT ALL ON TABLE "public"."user_session" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_session_session_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_session_session_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_session_session_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_settings_setting_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_settings_setting_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_settings_setting_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."users_profile" TO "anon";
GRANT ALL ON TABLE "public"."users_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."users_profile" TO "service_role";



GRANT ALL ON SEQUENCE "public"."users_profile_profile_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."users_profile_profile_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."users_profile_profile_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."users_user_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."users_user_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."users_user_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."v_training_session_stats" TO "anon";
GRANT ALL ON TABLE "public"."v_training_session_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."v_training_session_stats" TO "service_role";



GRANT ALL ON SEQUENCE "public"."v_training_session_stats_stat_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."v_training_session_stats_stat_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."v_training_session_stats_stat_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

drop trigger if exists "update_assignment_updated_at" on "public"."assignment";

drop trigger if exists "update_calendar_shift_updated_at" on "public"."calendar_shift";

drop trigger if exists "update_checklist_updated_at" on "public"."checklist";

drop trigger if exists "update_client_updated_at" on "public"."client";

drop trigger if exists "update_communication_updated_at" on "public"."communication";

drop trigger if exists "update_compliance_requirement_updated_at" on "public"."compliance_requirement";

drop trigger if exists "update_controlroom_drone_updated_at" on "public"."controlroom_drone";

drop trigger if exists "update_controlroom_meta_updated_at" on "public"."controlroom_meta";

drop trigger if exists "update_countries_updated_at" on "public"."countries";

drop trigger if exists "trg_erp_updated_at" on "public"."emergency_response_plan";

drop trigger if exists "update_evaluation_updated_at" on "public"."evaluation";

drop trigger if exists "update_evaluation_action_updated_at" on "public"."evaluation_action";

drop trigger if exists "update_flytbase_mission_updated_at" on "public"."flytbase_mission";

drop trigger if exists "update_kanban_updated_at" on "public"."kanban";

drop trigger if exists "update_luc_document_updated_at" on "public"."luc_document";

drop trigger if exists "update_luc_procedure_updated_at" on "public"."luc_procedure";

drop trigger if exists "update_maintenance_ticket_updated_at" on "public"."maintenance_ticket";

drop trigger if exists "update_owner_updated_at" on "public"."owner";

drop trigger if exists "update_owner_territorial_unit_updated_at" on "public"."owner_territorial_unit";

drop trigger if exists "update_payload_updated_at" on "public"."payload";

drop trigger if exists "update_pilot_mission_updated_at" on "public"."pilot_mission";

drop trigger if exists "update_pilot_mission_planned_template_logbook_updated_at" on "public"."pilot_mission_planned_template_logbook";

drop trigger if exists "update_planning_updated_at" on "public"."planning";

drop trigger if exists "update_planning_logbook_updated_at" on "public"."planning_logbook";

drop trigger if exists "update_repository_file_updated_at" on "public"."repository_file";

drop trigger if exists "update_safety_action_updated_at" on "public"."safety_action";

drop trigger if exists "update_safety_report_updated_at" on "public"."safety_report";

drop trigger if exists "update_spi_kpi_definition_updated_at" on "public"."spi_kpi_definition";

drop trigger if exists "update_team_updated_at" on "public"."team";

drop trigger if exists "update_tool_updated_at" on "public"."tool";

drop trigger if exists "update_tool_component_updated_at" on "public"."tool_component";

drop trigger if exists "update_tool_erp_updated_at" on "public"."tool_erp";

drop trigger if exists "update_tool_maintenance_updated_at" on "public"."tool_maintenance";

drop trigger if exists "update_training_updated_at" on "public"."training";

drop trigger if exists "update_user_qualification_updated_at" on "public"."user_qualification";

drop trigger if exists "update_user_settings_updated_at" on "public"."user_settings";

drop trigger if exists "update_users_updated_at" on "public"."users";

drop trigger if exists "update_users_profile_updated_at" on "public"."users_profile";

drop policy "Users can insert own settings" on "public"."user_settings";

drop policy "Users can update own settings" on "public"."user_settings";

drop policy "Users can view own settings" on "public"."user_settings";

drop policy "Only admins can delete users" on "public"."users";

drop policy "Users can view own profile" on "public"."users";

drop policy "Users can update own profile details" on "public"."users_profile";

drop policy "Users can view own profile details" on "public"."users_profile";

alter table "public"."alert_log" drop constraint "alert_log_acknowledged_by_user_id_fkey";

alter table "public"."alert_log" drop constraint "alert_log_assigned_to_user_id_fkey";

alter table "public"."alert_log" drop constraint "alert_log_resolved_by_user_id_fkey";

alter table "public"."alert_log" drop constraint "alert_log_triggered_by_user_id_fkey";

alter table "public"."api_keys" drop constraint "api_keys_created_by_user_id_fkey";

alter table "public"."api_keys" drop constraint "api_keys_fk_owner_id_fkey";

alter table "public"."assignment" drop constraint "assignment_fk_owner_id_fkey";

alter table "public"."assignment" drop constraint "assignment_fk_user_id_fkey";

alter table "public"."backup_log" drop constraint "backup_log_performed_by_user_id_fkey";

alter table "public"."calendar_shift" drop constraint "calendar_shift_fk_client_id_fkey";

alter table "public"."calendar_shift" drop constraint "calendar_shift_fk_owner_id_fkey";

alter table "public"."calendar_shift" drop constraint "calendar_shift_fk_pic_id_fkey";

alter table "public"."checklist" drop constraint "checklist_fk_owner_id_fkey";

alter table "public"."checklist" drop constraint "checklist_fk_planning_id_fkey";

alter table "public"."checklist" drop constraint "checklist_fk_user_id_fkey";

alter table "public"."client" drop constraint "client_fk_country_id_fkey";

alter table "public"."client" drop constraint "client_fk_owner_id_fkey";

alter table "public"."code_index" drop constraint "code_index_user_id_fkey";

alter table "public"."communication" drop constraint "communication_fk_owner_id_fkey";

alter table "public"."communication" drop constraint "communication_fk_user_id_fkey";

alter table "public"."communication_general" drop constraint "communication_general_fk_owner_id_fkey";

alter table "public"."communication_general" drop constraint "communication_general_sent_by_user_id_fkey";

alter table "public"."compliance_evidence" drop constraint "compliance_evidence_fk_requirement_id_fkey";

alter table "public"."compliance_evidence" drop constraint "compliance_evidence_submitted_by_user_id_fkey";

alter table "public"."compliance_evidence" drop constraint "compliance_evidence_verified_by_user_id_fkey";

alter table "public"."compliance_requirement" drop constraint "compliance_requirement_fk_owner_id_fkey";

alter table "public"."compliance_status_log" drop constraint "compliance_status_log_changed_by_user_id_fkey";

alter table "public"."compliance_status_log" drop constraint "compliance_status_log_fk_requirement_id_fkey";

alter table "public"."controlroom_drone" drop constraint "controlroom_drone_fk_pilot_mission_id_fkey";

alter table "public"."controlroom_drone" drop constraint "controlroom_drone_fk_tool_id_fkey";

alter table "public"."controlroom_meta" drop constraint "controlroom_meta_fk_owner_id_fkey";

alter table "public"."deleted_owner" drop constraint "deleted_owner_deleted_by_user_id_fkey";

alter table "public"."deleted_user" drop constraint "deleted_user_deleted_by_user_id_fkey";

alter table "public"."drone_class_config" drop constraint "drone_class_config_fk_owner_id_fkey";

alter table "public"."emergency_response_plan" drop constraint "emergency_response_plan_fk_owner_id_fkey";

alter table "public"."erp_location_group_contact" drop constraint "erp_location_group_contact_fk_erp_id_fkey";

alter table "public"."erp_location_group_contact" drop constraint "erp_location_group_contact_fk_group_id_fkey";

alter table "public"."erp_location_group_location" drop constraint "erp_location_group_location_fk_group_id_fkey";

alter table "public"."evaluation" drop constraint "evaluation_created_by_user_id_fkey";

alter table "public"."evaluation" drop constraint "evaluation_fk_client_id_fkey";

alter table "public"."evaluation" drop constraint "evaluation_fk_luc_procedure_id_fkey";

alter table "public"."evaluation" drop constraint "evaluation_fk_owner_id_fkey";

alter table "public"."evaluation_action" drop constraint "evaluation_action_assigned_to_user_id_fkey";

alter table "public"."evaluation_action" drop constraint "evaluation_action_fk_evaluation_id_fkey";

alter table "public"."evaluation_file" drop constraint "evaluation_file_fk_evaluation_id_fkey";

alter table "public"."evaluation_file" drop constraint "evaluation_file_uploaded_by_user_id_fkey";

alter table "public"."flight_requests" drop constraint "flight_requests_assigned_by_user_id_fkey";

alter table "public"."flight_requests" drop constraint "flight_requests_fk_api_key_id_fkey";

alter table "public"."flight_requests" drop constraint "flight_requests_fk_owner_id_fkey";

alter table "public"."flytbase_mission" drop constraint "flytbase_mission_fk_planning_id_fkey";

alter table "public"."flytbase_mission_log" drop constraint "flytbase_mission_log_fk_flytbase_mission_id_fkey";

alter table "public"."flytbase_mission_status" drop constraint "flytbase_mission_status_fk_flytbase_mission_id_fkey";

alter table "public"."kanban" drop constraint "kanban_fk_evaluation_id_fkey";

alter table "public"."kanban" drop constraint "kanban_fk_owner_id_fkey";

alter table "public"."kanban" drop constraint "kanban_fk_user_id_fkey";

alter table "public"."luc_document" drop constraint "luc_document_approved_by_user_id_fkey";

alter table "public"."luc_document" drop constraint "luc_document_created_by_user_id_fkey";

alter table "public"."luc_document" drop constraint "luc_document_fk_component_id_fkey";

alter table "public"."luc_document" drop constraint "luc_document_fk_doc_type_id_fkey";

alter table "public"."luc_document" drop constraint "luc_document_fk_owner_id_fkey";

alter table "public"."luc_document_rev" drop constraint "luc_document_rev_fk_document_id_fkey";

alter table "public"."luc_document_rev" drop constraint "luc_document_rev_revised_by_user_id_fkey";

alter table "public"."luc_procedure" drop constraint "luc_procedure_approved_by_user_id_fkey";

alter table "public"."luc_procedure" drop constraint "luc_procedure_created_by_user_id_fkey";

alter table "public"."luc_procedure" drop constraint "luc_procedure_fk_document_id_fkey";

alter table "public"."luc_procedure" drop constraint "luc_procedure_fk_owner_id_fkey";

alter table "public"."maintenance_ticket" drop constraint "maintenance_ticket_assigned_to_user_id_fkey";

alter table "public"."maintenance_ticket" drop constraint "maintenance_ticket_fk_component_id_fkey";

alter table "public"."maintenance_ticket" drop constraint "maintenance_ticket_fk_owner_id_fkey";

alter table "public"."maintenance_ticket" drop constraint "maintenance_ticket_fk_tool_id_fkey";

alter table "public"."maintenance_ticket" drop constraint "maintenance_ticket_reported_by_user_id_fkey";

alter table "public"."maintenance_ticket_attachment" drop constraint "maintenance_ticket_attachment_fk_ticket_id_fkey";

alter table "public"."maintenance_ticket_attachment" drop constraint "maintenance_ticket_attachment_uploaded_by_user_id_fkey";

alter table "public"."maintenance_ticket_event" drop constraint "maintenance_ticket_event_created_by_user_id_fkey";

alter table "public"."maintenance_ticket_event" drop constraint "maintenance_ticket_event_fk_ticket_id_fkey";

alter table "public"."maintenance_ticket_item" drop constraint "maintenance_ticket_item_fk_component_id_fkey";

alter table "public"."maintenance_ticket_item" drop constraint "maintenance_ticket_item_fk_ticket_id_fkey";

alter table "public"."maintenance_ticket_report" drop constraint "maintenance_ticket_report_fk_ticket_id_fkey";

alter table "public"."maintenance_ticket_report" drop constraint "maintenance_ticket_report_generated_by_user_id_fkey";

alter table "public"."messages" drop constraint "messages_from_user_id_fkey";

alter table "public"."messages" drop constraint "messages_parent_message_id_fkey";

alter table "public"."messages" drop constraint "messages_to_user_id_fkey";

alter table "public"."mission_component" drop constraint "mission_component_fk_planning_id_fkey";

alter table "public"."mission_component" drop constraint "mission_component_fk_tool_id_fkey";

alter table "public"."mission_flight_logs" drop constraint "mission_flight_logs_log_source_check";

alter table "public"."notification" drop constraint "notification_fk_user_id_fkey";

alter table "public"."operation_attachment" drop constraint "operation_attachment_fk_operation_id_fkey";

alter table "public"."operation_attachment" drop constraint "operation_attachment_uploaded_by_user_id_fkey";

alter table "public"."owner" drop constraint "owner_fk_country_id_fkey";

alter table "public"."owner_territorial_unit" drop constraint "owner_territorial_unit_fk_country_id_fkey";

alter table "public"."owner_territorial_unit" drop constraint "owner_territorial_unit_fk_owner_id_fkey";

alter table "public"."owner_territorial_unit" drop constraint "owner_territorial_unit_unit_manager_id_fkey";

alter table "public"."payload" drop constraint "payload_fk_owner_id_fkey";

alter table "public"."payload" drop constraint "payload_fk_tool_id_fkey";

alter table "public"."pilot_declaration" drop constraint "pilot_declaration_fk_tool_id_fkey";

alter table "public"."pilot_declaration" drop constraint "pilot_declaration_fk_user_id_fkey";

alter table "public"."pilot_mission" drop constraint "pilot_mission_fk_client_id_fkey";

alter table "public"."pilot_mission" drop constraint "pilot_mission_fk_erp_group_id_fkey";

alter table "public"."pilot_mission" drop constraint "pilot_mission_fk_luc_procedure_id_fkey";

alter table "public"."pilot_mission" drop constraint "pilot_mission_fk_mission_category_id_fkey";

alter table "public"."pilot_mission" drop constraint "pilot_mission_fk_mission_result_type_id_fkey";

alter table "public"."pilot_mission" drop constraint "pilot_mission_fk_mission_status_id_fkey";

alter table "public"."pilot_mission" drop constraint "pilot_mission_fk_mission_type_id_fkey";

alter table "public"."pilot_mission" drop constraint "pilot_mission_fk_owner_id_fkey";

alter table "public"."pilot_mission" drop constraint "pilot_mission_fk_pilot_user_id_fkey";

alter table "public"."pilot_mission" drop constraint "pilot_mission_fk_planning_id_fkey";

alter table "public"."pilot_mission" drop constraint "pilot_mission_fk_tool_id_fkey";

alter table "public"."pilot_mission_planned_template_logbook" drop constraint "pilot_mission_planned_template_logbook_created_by_user_id_fkey";

alter table "public"."pilot_mission_result" drop constraint "pilot_mission_result_fk_pilot_mission_id_fkey";

alter table "public"."pilot_mission_result_type" drop constraint "pilot_mission_result_type_fk_owner_id_fkey";

alter table "public"."pilot_mission_status" drop constraint "fk_owner";

alter table "public"."planning" drop constraint "planning_assigned_to_user_id_fkey";

alter table "public"."planning" drop constraint "planning_created_by_user_id_fkey";

alter table "public"."planning" drop constraint "planning_fk_client_id_fkey";

alter table "public"."planning" drop constraint "planning_fk_evaluation_id_fkey";

alter table "public"."planning" drop constraint "planning_fk_owner_id_fkey";

alter table "public"."planning_logbook" drop constraint "planning_logbook_fk_client_id_fkey";

alter table "public"."planning_logbook" drop constraint "planning_logbook_fk_evaluation_id_fkey";

alter table "public"."planning_logbook" drop constraint "planning_logbook_fk_owner_id_fkey";

alter table "public"."planning_logbook" drop constraint "planning_logbook_fk_planning_id_fkey";

alter table "public"."planning_logbook" drop constraint "planning_logbook_fk_tool_id_fkey";

alter table "public"."planning_logbook" drop constraint "planning_logbook_fk_user_id_fkey";

alter table "public"."planning_test_logbook" drop constraint "planning_test_logbook_fk_evaluation_id_fkey";

alter table "public"."planning_test_logbook" drop constraint "planning_test_logbook_fk_mission_planning_id_fkey";

alter table "public"."planning_test_logbook" drop constraint "planning_test_logbook_fk_observer_id_fkey";

alter table "public"."planning_test_logbook" drop constraint "planning_test_logbook_fk_owner_id_fkey";

alter table "public"."planning_test_logbook" drop constraint "planning_test_logbook_fk_pic_id_fkey";

alter table "public"."planning_test_logbook" drop constraint "planning_test_logbook_fk_planning_id_fkey";

alter table "public"."planning_test_logbook" drop constraint "planning_test_logbook_fk_user_id_fkey";

alter table "public"."planning_test_logbook" drop constraint "planning_test_logbook_tested_by_user_id_fkey";

alter table "public"."repository_file" drop constraint "repository_file_fk_file_type_id_fkey";

alter table "public"."repository_file" drop constraint "repository_file_fk_owner_id_fkey";

alter table "public"."repository_file" drop constraint "repository_file_uploaded_by_user_id_fkey";

alter table "public"."safety_action" drop constraint "safety_action_assigned_to_user_id_fkey";

alter table "public"."safety_action" drop constraint "safety_action_fk_report_id_fkey";

alter table "public"."safety_action" drop constraint "safety_action_verified_by_user_id_fkey";

alter table "public"."safety_report" drop constraint "safety_report_fk_owner_id_fkey";

alter table "public"."safety_report" drop constraint "safety_report_fk_pilot_mission_id_fkey";

alter table "public"."safety_report" drop constraint "safety_report_investigated_by_user_id_fkey";

alter table "public"."safety_report" drop constraint "safety_report_reported_by_user_id_fkey";

alter table "public"."spi_kpi" drop constraint "spi_kpi_fk_definition_id_fkey";

alter table "public"."spi_kpi" drop constraint "spi_kpi_fk_owner_id_fkey";

alter table "public"."spi_kpi" drop constraint "spi_kpi_recorded_by_user_id_fkey";

alter table "public"."spi_kpi_definition" drop constraint "spi_kpi_definition_fk_owner_id_fkey";

alter table "public"."spi_kpi_log" drop constraint "spi_kpi_log_changed_by_user_id_fkey";

alter table "public"."spi_kpi_log" drop constraint "spi_kpi_log_fk_kpi_id_fkey";

alter table "public"."spi_kpi_target_proposal" drop constraint "spi_kpi_target_proposal_approved_by_user_id_fkey";

alter table "public"."spi_kpi_target_proposal" drop constraint "spi_kpi_target_proposal_fk_definition_id_fkey";

alter table "public"."spi_kpi_target_proposal" drop constraint "spi_kpi_target_proposal_proposed_by_user_id_fkey";

alter table "public"."team" drop constraint "team_fk_owner_id_fkey";

alter table "public"."team" drop constraint "team_team_leader_id_fkey";

alter table "public"."team_members" drop constraint "team_members_fk_team_id_fkey";

alter table "public"."team_members" drop constraint "team_members_fk_user_id_fkey";

alter table "public"."ticket_attachment" drop constraint "ticket_attachment_fk_ticket_id_fkey";

alter table "public"."ticket_attachment" drop constraint "ticket_attachment_uploaded_by_user_id_fkey";

alter table "public"."tool" drop constraint "tool_assigned_client_id_fkey";

alter table "public"."tool" drop constraint "tool_fk_model_id_fkey";

alter table "public"."tool" drop constraint "tool_fk_owner_id_fkey";

alter table "public"."tool" drop constraint "tool_fk_status_id_fkey";

alter table "public"."tool_component" drop constraint "tool_component_fk_tool_id_fkey";

alter table "public"."tool_erp" drop constraint "tool_erp_fk_tool_id_fkey";

alter table "public"."tool_maintenance" drop constraint "tool_maintenance_fk_tool_id_fkey";

alter table "public"."tool_maintenance" drop constraint "tool_maintenance_performed_by_user_id_fkey";

alter table "public"."training" drop constraint "training_fk_owner_id_fkey";

alter table "public"."training" drop constraint "training_trainer_user_id_fkey";

alter table "public"."training_attendance" drop constraint "training_attendance_fk_training_id_fkey";

alter table "public"."training_attendance" drop constraint "training_attendance_fk_user_id_fkey";

alter table "public"."turn_users" drop constraint "turn_users_fk_turn_id_fkey";

alter table "public"."turn_users" drop constraint "turn_users_fk_user_id_fkey";

alter table "public"."turns" drop constraint "turns_fk_owner_id_fkey";

alter table "public"."user_device" drop constraint "user_device_fk_user_id_fkey";

alter table "public"."user_owner" drop constraint "user_owner_fk_owner_id_fkey";

alter table "public"."user_owner" drop constraint "user_owner_fk_user_id_fkey";

alter table "public"."user_permessi" drop constraint "user_permessi_fk_user_id_fkey";

alter table "public"."user_permessi" drop constraint "user_permessi_granted_by_fkey";

alter table "public"."user_qualification" drop constraint "user_qualification_fk_owner_id_fkey";

alter table "public"."user_qualification" drop constraint "user_qualification_fk_user_id_fkey";

alter table "public"."user_session" drop constraint "user_session_fk_user_id_fkey";

alter table "public"."user_settings" drop constraint "user_settings_fk_user_id_fkey";

alter table "public"."users" drop constraint "users_fk_client_id_fkey";

alter table "public"."users" drop constraint "users_fk_owner_id_fkey";

alter table "public"."users" drop constraint "users_fk_territorial_unit_fkey";

alter table "public"."users_profile" drop constraint "users_profile_fk_country_id_fkey";

alter table "public"."users_profile" drop constraint "users_profile_fk_user_id_fkey";

drop index if exists "public"."idx_schema_chunks_embedding";

alter table "public"."ai_token_usage" alter column "id" set default nextval('public.ai_token_usage_id_seq'::regclass);

alter table "public"."alert_log" alter column "alert_id" set default nextval('public.alert_log_alert_id_seq'::regclass);

alter table "public"."api_keys" alter column "api_key_id" set default nextval('public.api_keys_api_key_id_seq'::regclass);

alter table "public"."assignment" alter column "assignment_id" set default nextval('public.assignment_assignment_id_seq'::regclass);

alter table "public"."audit_logs" alter column "id" set default nextval('public.audit_logs_id_seq'::regclass);

alter table "public"."backup_log" alter column "backup_id" set default nextval('public.backup_log_backup_id_seq'::regclass);

alter table "public"."calendar_shift" alter column "shift_id" set default nextval('public.calendar_shift_shift_id_seq'::regclass);

alter table "public"."checklist" alter column "checklist_id" set default nextval('public.checklist_checklist_id_seq'::regclass);

alter table "public"."client" alter column "client_id" set default nextval('public.client_client_id_seq'::regclass);

alter table "public"."client" alter column "client_unique_code" set default extensions.uuid_generate_v4();

alter table "public"."code_index" alter column "id" set default nextval('public.code_index_id_seq'::regclass);

alter table "public"."communication" alter column "communication_id" set default nextval('public.communication_communication_id_seq'::regclass);

alter table "public"."communication_general" alter column "communication_id" set default nextval('public.communication_general_communication_id_seq'::regclass);

alter table "public"."compliance_evidence" alter column "evidence_id" set default nextval('public.compliance_evidence_evidence_id_seq'::regclass);

alter table "public"."compliance_requirement" alter column "requirement_id" set default nextval('public.compliance_requirement_requirement_id_seq'::regclass);

alter table "public"."compliance_status_log" alter column "log_id" set default nextval('public.compliance_status_log_log_id_seq'::regclass);

alter table "public"."component_type_config" alter column "type_id" set default nextval('public.component_type_config_type_id_seq'::regclass);

alter table "public"."controlroom_drone" alter column "controlroom_drone_id" set default nextval('public.controlroom_drone_controlroom_drone_id_seq'::regclass);

alter table "public"."controlroom_meta" alter column "meta_id" set default nextval('public.controlroom_meta_meta_id_seq'::regclass);

alter table "public"."countries" alter column "country_id" set default nextval('public.countries_country_id_seq'::regclass);

alter table "public"."dcc_integrations" alter column "id" set default nextval('public.dcc_integrations_id_seq'::regclass);

alter table "public"."deleted_owner" alter column "deleted_id" set default nextval('public.deleted_owner_deleted_id_seq'::regclass);

alter table "public"."deleted_user" alter column "deleted_id" set default nextval('public.deleted_user_deleted_id_seq'::regclass);

alter table "public"."drone_class_config" alter column "class_id" set default nextval('public.drone_class_config_class_id_seq'::regclass);

alter table "public"."erp_location_group" alter column "group_id" set default nextval('public.erp_location_group_group_id_seq'::regclass);

alter table "public"."erp_location_group_contact" alter column "id" set default nextval('public.erp_location_group_contact_id_seq'::regclass);

alter table "public"."erp_location_group_location" alter column "location_id" set default nextval('public.erp_location_group_location_location_id_seq'::regclass);

alter table "public"."evaluation" alter column "evaluation_id" set default nextval('public.evaluation_evaluation_id_seq'::regclass);

alter table "public"."evaluation_action" alter column "action_id" set default nextval('public.evaluation_action_action_id_seq'::regclass);

alter table "public"."evaluation_file" alter column "file_id" set default nextval('public.evaluation_file_file_id_seq'::regclass);

alter table "public"."flight_requests" alter column "request_id" set default nextval('public.flight_requests_request_id_seq'::regclass);

alter table "public"."flytbase_mission" alter column "flytbase_mission_id" set default nextval('public.flytbase_mission_flytbase_mission_id_seq'::regclass);

alter table "public"."flytbase_mission_log" alter column "log_id" set default nextval('public.flytbase_mission_log_log_id_seq'::regclass);

alter table "public"."flytbase_mission_status" alter column "status_id" set default nextval('public.flytbase_mission_status_status_id_seq'::regclass);

alter table "public"."kanban" alter column "kanban_id" set default nextval('public.kanban_kanban_id_seq'::regclass);

alter table "public"."luc_doc_type" alter column "doc_type_id" set default nextval('public.luc_doc_type_doc_type_id_seq'::regclass);

alter table "public"."luc_document" alter column "document_id" set default nextval('public.luc_document_document_id_seq'::regclass);

alter table "public"."luc_document_rev" alter column "revision_id" set default nextval('public.luc_document_rev_revision_id_seq'::regclass);

alter table "public"."luc_procedure" alter column "procedure_id" set default nextval('public.luc_procedure_procedure_id_seq'::regclass);

alter table "public"."maintenance_ticket" alter column "ticket_id" set default nextval('public.maintenance_ticket_ticket_id_seq'::regclass);

alter table "public"."maintenance_ticket_attachment" alter column "attachment_id" set default nextval('public.maintenance_ticket_attachment_attachment_id_seq'::regclass);

alter table "public"."maintenance_ticket_event" alter column "event_id" set default nextval('public.maintenance_ticket_event_event_id_seq'::regclass);

alter table "public"."maintenance_ticket_item" alter column "item_id" set default nextval('public.maintenance_ticket_item_item_id_seq'::regclass);

alter table "public"."maintenance_ticket_report" alter column "report_id" set default nextval('public.maintenance_ticket_report_report_id_seq'::regclass);

alter table "public"."messages" alter column "message_id" set default nextval('public.messages_message_id_seq'::regclass);

alter table "public"."mission_component" alter column "component_id" set default nextval('public.mission_component_component_id_seq'::regclass);

alter table "public"."mission_flight_logs" alter column "log_id" set default nextval('public.mission_flight_logs_log_id_seq'::regclass);

alter table "public"."notification" alter column "notification_id" set default nextval('public.notification_notification_id_seq'::regclass);

alter table "public"."operation_attachment" alter column "attachment_id" set default nextval('public.operation_attachment_attachment_id_seq'::regclass);

alter table "public"."org_chart_overrides" alter column "id" set default nextval('public.org_chart_overrides_id_seq'::regclass);

alter table "public"."owner" alter column "owner_id" set default nextval('public.owner_owner_id_seq'::regclass);

alter table "public"."owner_territorial_unit" alter column "unit_id" set default nextval('public.owner_territorial_unit_unit_id_seq'::regclass);

alter table "public"."payload" alter column "payload_id" set default nextval('public.payload_payload_id_seq'::regclass);

alter table "public"."pilot_declaration" alter column "declaration_id" set default nextval('public.pilot_declaration_declaration_id_seq'::regclass);

alter table "public"."pilot_mission" alter column "pilot_mission_id" set default nextval('public.pilot_mission_pilot_mission_id_seq'::regclass);

alter table "public"."pilot_mission_category" alter column "category_id" set default nextval('public.pilot_mission_category_category_id_seq'::regclass);

alter table "public"."pilot_mission_planned_template_logbook" alter column "template_id" set default nextval('public.pilot_mission_planned_template_logbook_template_id_seq'::regclass);

alter table "public"."pilot_mission_result" alter column "result_id" set default nextval('public.pilot_mission_result_result_id_seq'::regclass);

alter table "public"."pilot_mission_result_type" alter column "result_type_id" set default nextval('public.pilot_mission_result_type_result_type_id_seq'::regclass);

alter table "public"."pilot_mission_status" alter column "status_id" set default nextval('public.pilot_mission_status_status_id_seq'::regclass);

alter table "public"."pilot_mission_type" alter column "mission_type_id" set default nextval('public.pilot_mission_type_mission_type_id_seq'::regclass);

alter table "public"."pilot_status" alter column "status_id" set default nextval('public.pilot_status_status_id_seq'::regclass);

alter table "public"."pilot_vehicle_status" alter column "vehicle_status_id" set default nextval('public.pilot_vehicle_status_vehicle_status_id_seq'::regclass);

alter table "public"."planning" alter column "planning_id" set default nextval('public.planning_planning_id_seq'::regclass);

alter table "public"."planning_logbook" alter column "mission_planning_id" set default nextval('public.planning_logbook_mission_planning_id_seq'::regclass);

alter table "public"."planning_test_logbook" alter column "test_id" set default nextval('public.planning_test_logbook_test_id_seq'::regclass);

alter table "public"."procedure_document" alter column "id" set default nextval('public.procedure_document_id_seq'::regclass);

alter table "public"."repository_file" alter column "file_id" set default nextval('public.repository_file_file_id_seq'::regclass);

alter table "public"."repository_file_type" alter column "file_type_id" set default nextval('public.repository_file_type_file_type_id_seq'::regclass);

alter table "public"."safety_action" alter column "action_id" set default nextval('public.safety_action_action_id_seq'::regclass);

alter table "public"."safety_report" alter column "report_id" set default nextval('public.safety_report_report_id_seq'::regclass);

alter table "public"."schema_chunks" alter column "embedding" set data type public.vector(768) using "embedding"::public.vector(768);

alter table "public"."spi_kpi" alter column "kpi_id" set default nextval('public.spi_kpi_kpi_id_seq'::regclass);

alter table "public"."spi_kpi_definition" alter column "definition_id" set default nextval('public.spi_kpi_definition_definition_id_seq'::regclass);

alter table "public"."spi_kpi_log" alter column "log_id" set default nextval('public.spi_kpi_log_log_id_seq'::regclass);

alter table "public"."spi_kpi_target_proposal" alter column "proposal_id" set default nextval('public.spi_kpi_target_proposal_proposal_id_seq'::regclass);

alter table "public"."team" alter column "team_id" set default nextval('public.team_team_id_seq'::regclass);

alter table "public"."team_members" alter column "team_member_id" set default nextval('public.team_members_team_member_id_seq'::regclass);

alter table "public"."ticket_attachment" alter column "attachment_id" set default nextval('public.ticket_attachment_attachment_id_seq'::regclass);

alter table "public"."tool" alter column "tool_id" set default nextval('public.tool_tool_id_seq'::regclass);

alter table "public"."tool_component" alter column "component_id" set default nextval('public.tool_component_component_id_seq'::regclass);

alter table "public"."tool_erp" alter column "erp_id" set default nextval('public.tool_erp_erp_id_seq'::regclass);

alter table "public"."tool_maintenance" alter column "maintenance_id" set default nextval('public.tool_maintenance_maintenance_id_seq'::regclass);

alter table "public"."tool_model" alter column "model_id" set default nextval('public.tool_model_model_id_seq'::regclass);

alter table "public"."tool_status" alter column "status_id" set default nextval('public.tool_status_status_id_seq'::regclass);

alter table "public"."training" alter column "training_id" set default nextval('public.training_training_id_seq'::regclass);

alter table "public"."training_attendance" alter column "attendance_id" set default nextval('public.training_attendance_attendance_id_seq'::regclass);

alter table "public"."turn_users" alter column "turn_user_id" set default nextval('public.turn_users_turn_user_id_seq'::regclass);

alter table "public"."turns" alter column "turn_id" set default nextval('public.turns_turn_id_seq'::regclass);

alter table "public"."user_device" alter column "device_id" set default nextval('public.user_device_device_id_seq'::regclass);

alter table "public"."user_owner" alter column "user_owner_id" set default nextval('public.user_owner_user_owner_id_seq'::regclass);

alter table "public"."user_permessi" alter column "permission_id" set default nextval('public.user_permessi_permission_id_seq'::regclass);

alter table "public"."user_qualification" alter column "qualification_id" set default nextval('public.user_qualification_qualification_id_seq'::regclass);

alter table "public"."user_session" alter column "session_id" set default nextval('public.user_session_session_id_seq'::regclass);

alter table "public"."user_settings" alter column "setting_id" set default nextval('public.user_settings_setting_id_seq'::regclass);

alter table "public"."users" alter column "user_id" set default nextval('public.users_user_id_seq'::regclass);

alter table "public"."users_profile" alter column "profile_id" set default nextval('public.users_profile_profile_id_seq'::regclass);

alter table "public"."v_training_session_stats" alter column "stat_id" set default nextval('public.v_training_session_stats_stat_id_seq'::regclass);

CREATE INDEX idx_schema_chunks_embedding ON public.schema_chunks USING hnsw (embedding public.vector_cosine_ops);

alter table "public"."alert_log" add constraint "alert_log_acknowledged_by_user_id_fkey" FOREIGN KEY (acknowledged_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."alert_log" validate constraint "alert_log_acknowledged_by_user_id_fkey";

alter table "public"."alert_log" add constraint "alert_log_assigned_to_user_id_fkey" FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."alert_log" validate constraint "alert_log_assigned_to_user_id_fkey";

alter table "public"."alert_log" add constraint "alert_log_resolved_by_user_id_fkey" FOREIGN KEY (resolved_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."alert_log" validate constraint "alert_log_resolved_by_user_id_fkey";

alter table "public"."alert_log" add constraint "alert_log_triggered_by_user_id_fkey" FOREIGN KEY (triggered_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."alert_log" validate constraint "alert_log_triggered_by_user_id_fkey";

alter table "public"."api_keys" add constraint "api_keys_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."api_keys" validate constraint "api_keys_created_by_user_id_fkey";

alter table "public"."api_keys" add constraint "api_keys_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."api_keys" validate constraint "api_keys_fk_owner_id_fkey";

alter table "public"."assignment" add constraint "assignment_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."assignment" validate constraint "assignment_fk_owner_id_fkey";

alter table "public"."assignment" add constraint "assignment_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."assignment" validate constraint "assignment_fk_user_id_fkey";

alter table "public"."backup_log" add constraint "backup_log_performed_by_user_id_fkey" FOREIGN KEY (performed_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."backup_log" validate constraint "backup_log_performed_by_user_id_fkey";

alter table "public"."calendar_shift" add constraint "calendar_shift_fk_client_id_fkey" FOREIGN KEY (fk_client_id) REFERENCES public.client(client_id) not valid;

alter table "public"."calendar_shift" validate constraint "calendar_shift_fk_client_id_fkey";

alter table "public"."calendar_shift" add constraint "calendar_shift_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."calendar_shift" validate constraint "calendar_shift_fk_owner_id_fkey";

alter table "public"."calendar_shift" add constraint "calendar_shift_fk_pic_id_fkey" FOREIGN KEY (fk_pic_id) REFERENCES public.users(user_id) not valid;

alter table "public"."calendar_shift" validate constraint "calendar_shift_fk_pic_id_fkey";

alter table "public"."checklist" add constraint "checklist_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."checklist" validate constraint "checklist_fk_owner_id_fkey";

alter table "public"."checklist" add constraint "checklist_fk_planning_id_fkey" FOREIGN KEY (fk_planning_id) REFERENCES public.planning(planning_id) not valid;

alter table "public"."checklist" validate constraint "checklist_fk_planning_id_fkey";

alter table "public"."checklist" add constraint "checklist_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."checklist" validate constraint "checklist_fk_user_id_fkey";

alter table "public"."client" add constraint "client_fk_country_id_fkey" FOREIGN KEY (fk_country_id) REFERENCES public.countries(country_id) not valid;

alter table "public"."client" validate constraint "client_fk_country_id_fkey";

alter table "public"."client" add constraint "client_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) ON DELETE CASCADE not valid;

alter table "public"."client" validate constraint "client_fk_owner_id_fkey";

alter table "public"."code_index" add constraint "code_index_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."code_index" validate constraint "code_index_user_id_fkey";

alter table "public"."communication" add constraint "communication_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."communication" validate constraint "communication_fk_owner_id_fkey";

alter table "public"."communication" add constraint "communication_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."communication" validate constraint "communication_fk_user_id_fkey";

alter table "public"."communication_general" add constraint "communication_general_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."communication_general" validate constraint "communication_general_fk_owner_id_fkey";

alter table "public"."communication_general" add constraint "communication_general_sent_by_user_id_fkey" FOREIGN KEY (sent_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."communication_general" validate constraint "communication_general_sent_by_user_id_fkey";

alter table "public"."compliance_evidence" add constraint "compliance_evidence_fk_requirement_id_fkey" FOREIGN KEY (fk_requirement_id) REFERENCES public.compliance_requirement(requirement_id) not valid;

alter table "public"."compliance_evidence" validate constraint "compliance_evidence_fk_requirement_id_fkey";

alter table "public"."compliance_evidence" add constraint "compliance_evidence_submitted_by_user_id_fkey" FOREIGN KEY (submitted_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."compliance_evidence" validate constraint "compliance_evidence_submitted_by_user_id_fkey";

alter table "public"."compliance_evidence" add constraint "compliance_evidence_verified_by_user_id_fkey" FOREIGN KEY (verified_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."compliance_evidence" validate constraint "compliance_evidence_verified_by_user_id_fkey";

alter table "public"."compliance_requirement" add constraint "compliance_requirement_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."compliance_requirement" validate constraint "compliance_requirement_fk_owner_id_fkey";

alter table "public"."compliance_status_log" add constraint "compliance_status_log_changed_by_user_id_fkey" FOREIGN KEY (changed_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."compliance_status_log" validate constraint "compliance_status_log_changed_by_user_id_fkey";

alter table "public"."compliance_status_log" add constraint "compliance_status_log_fk_requirement_id_fkey" FOREIGN KEY (fk_requirement_id) REFERENCES public.compliance_requirement(requirement_id) not valid;

alter table "public"."compliance_status_log" validate constraint "compliance_status_log_fk_requirement_id_fkey";

alter table "public"."controlroom_drone" add constraint "controlroom_drone_fk_pilot_mission_id_fkey" FOREIGN KEY (fk_pilot_mission_id) REFERENCES public.pilot_mission(pilot_mission_id) not valid;

alter table "public"."controlroom_drone" validate constraint "controlroom_drone_fk_pilot_mission_id_fkey";

alter table "public"."controlroom_drone" add constraint "controlroom_drone_fk_tool_id_fkey" FOREIGN KEY (fk_tool_id) REFERENCES public.tool(tool_id) ON DELETE SET NULL not valid;

alter table "public"."controlroom_drone" validate constraint "controlroom_drone_fk_tool_id_fkey";

alter table "public"."controlroom_meta" add constraint "controlroom_meta_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."controlroom_meta" validate constraint "controlroom_meta_fk_owner_id_fkey";

alter table "public"."deleted_owner" add constraint "deleted_owner_deleted_by_user_id_fkey" FOREIGN KEY (deleted_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."deleted_owner" validate constraint "deleted_owner_deleted_by_user_id_fkey";

alter table "public"."deleted_user" add constraint "deleted_user_deleted_by_user_id_fkey" FOREIGN KEY (deleted_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."deleted_user" validate constraint "deleted_user_deleted_by_user_id_fkey";

alter table "public"."drone_class_config" add constraint "drone_class_config_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) ON DELETE CASCADE not valid;

alter table "public"."drone_class_config" validate constraint "drone_class_config_fk_owner_id_fkey";

alter table "public"."emergency_response_plan" add constraint "emergency_response_plan_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) ON DELETE CASCADE not valid;

alter table "public"."emergency_response_plan" validate constraint "emergency_response_plan_fk_owner_id_fkey";

alter table "public"."erp_location_group_contact" add constraint "erp_location_group_contact_fk_erp_id_fkey" FOREIGN KEY (fk_erp_id) REFERENCES public.emergency_response_plan(erp_id) ON DELETE CASCADE not valid;

alter table "public"."erp_location_group_contact" validate constraint "erp_location_group_contact_fk_erp_id_fkey";

alter table "public"."erp_location_group_contact" add constraint "erp_location_group_contact_fk_group_id_fkey" FOREIGN KEY (fk_group_id) REFERENCES public.erp_location_group(group_id) ON DELETE CASCADE not valid;

alter table "public"."erp_location_group_contact" validate constraint "erp_location_group_contact_fk_group_id_fkey";

alter table "public"."erp_location_group_location" add constraint "erp_location_group_location_fk_group_id_fkey" FOREIGN KEY (fk_group_id) REFERENCES public.erp_location_group(group_id) ON DELETE CASCADE not valid;

alter table "public"."erp_location_group_location" validate constraint "erp_location_group_location_fk_group_id_fkey";

alter table "public"."evaluation" add constraint "evaluation_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."evaluation" validate constraint "evaluation_created_by_user_id_fkey";

alter table "public"."evaluation" add constraint "evaluation_fk_client_id_fkey" FOREIGN KEY (fk_client_id) REFERENCES public.client(client_id) not valid;

alter table "public"."evaluation" validate constraint "evaluation_fk_client_id_fkey";

alter table "public"."evaluation" add constraint "evaluation_fk_luc_procedure_id_fkey" FOREIGN KEY (fk_luc_procedure_id) REFERENCES public.luc_procedure(procedure_id) not valid;

alter table "public"."evaluation" validate constraint "evaluation_fk_luc_procedure_id_fkey";

alter table "public"."evaluation" add constraint "evaluation_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."evaluation" validate constraint "evaluation_fk_owner_id_fkey";

alter table "public"."evaluation_action" add constraint "evaluation_action_assigned_to_user_id_fkey" FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."evaluation_action" validate constraint "evaluation_action_assigned_to_user_id_fkey";

alter table "public"."evaluation_action" add constraint "evaluation_action_fk_evaluation_id_fkey" FOREIGN KEY (fk_evaluation_id) REFERENCES public.evaluation(evaluation_id) ON DELETE CASCADE not valid;

alter table "public"."evaluation_action" validate constraint "evaluation_action_fk_evaluation_id_fkey";

alter table "public"."evaluation_file" add constraint "evaluation_file_fk_evaluation_id_fkey" FOREIGN KEY (fk_evaluation_id) REFERENCES public.evaluation(evaluation_id) ON DELETE CASCADE not valid;

alter table "public"."evaluation_file" validate constraint "evaluation_file_fk_evaluation_id_fkey";

alter table "public"."evaluation_file" add constraint "evaluation_file_uploaded_by_user_id_fkey" FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."evaluation_file" validate constraint "evaluation_file_uploaded_by_user_id_fkey";

alter table "public"."flight_requests" add constraint "flight_requests_assigned_by_user_id_fkey" FOREIGN KEY (assigned_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."flight_requests" validate constraint "flight_requests_assigned_by_user_id_fkey";

alter table "public"."flight_requests" add constraint "flight_requests_fk_api_key_id_fkey" FOREIGN KEY (fk_api_key_id) REFERENCES public.api_keys(api_key_id) not valid;

alter table "public"."flight_requests" validate constraint "flight_requests_fk_api_key_id_fkey";

alter table "public"."flight_requests" add constraint "flight_requests_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."flight_requests" validate constraint "flight_requests_fk_owner_id_fkey";

alter table "public"."flytbase_mission" add constraint "flytbase_mission_fk_planning_id_fkey" FOREIGN KEY (fk_planning_id) REFERENCES public.planning(planning_id) not valid;

alter table "public"."flytbase_mission" validate constraint "flytbase_mission_fk_planning_id_fkey";

alter table "public"."flytbase_mission_log" add constraint "flytbase_mission_log_fk_flytbase_mission_id_fkey" FOREIGN KEY (fk_flytbase_mission_id) REFERENCES public.flytbase_mission(flytbase_mission_id) not valid;

alter table "public"."flytbase_mission_log" validate constraint "flytbase_mission_log_fk_flytbase_mission_id_fkey";

alter table "public"."flytbase_mission_status" add constraint "flytbase_mission_status_fk_flytbase_mission_id_fkey" FOREIGN KEY (fk_flytbase_mission_id) REFERENCES public.flytbase_mission(flytbase_mission_id) not valid;

alter table "public"."flytbase_mission_status" validate constraint "flytbase_mission_status_fk_flytbase_mission_id_fkey";

alter table "public"."kanban" add constraint "kanban_fk_evaluation_id_fkey" FOREIGN KEY (fk_evaluation_id) REFERENCES public.evaluation(evaluation_id) not valid;

alter table "public"."kanban" validate constraint "kanban_fk_evaluation_id_fkey";

alter table "public"."kanban" add constraint "kanban_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."kanban" validate constraint "kanban_fk_owner_id_fkey";

alter table "public"."kanban" add constraint "kanban_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."kanban" validate constraint "kanban_fk_user_id_fkey";

alter table "public"."luc_document" add constraint "luc_document_approved_by_user_id_fkey" FOREIGN KEY (approved_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."luc_document" validate constraint "luc_document_approved_by_user_id_fkey";

alter table "public"."luc_document" add constraint "luc_document_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."luc_document" validate constraint "luc_document_created_by_user_id_fkey";

alter table "public"."luc_document" add constraint "luc_document_fk_component_id_fkey" FOREIGN KEY (fk_component_id) REFERENCES public.tool_component(component_id) ON DELETE SET NULL not valid;

alter table "public"."luc_document" validate constraint "luc_document_fk_component_id_fkey";

alter table "public"."luc_document" add constraint "luc_document_fk_doc_type_id_fkey" FOREIGN KEY (fk_doc_type_id) REFERENCES public.luc_doc_type(doc_type_id) not valid;

alter table "public"."luc_document" validate constraint "luc_document_fk_doc_type_id_fkey";

alter table "public"."luc_document" add constraint "luc_document_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."luc_document" validate constraint "luc_document_fk_owner_id_fkey";

alter table "public"."luc_document_rev" add constraint "luc_document_rev_fk_document_id_fkey" FOREIGN KEY (fk_document_id) REFERENCES public.luc_document(document_id) ON DELETE CASCADE not valid;

alter table "public"."luc_document_rev" validate constraint "luc_document_rev_fk_document_id_fkey";

alter table "public"."luc_document_rev" add constraint "luc_document_rev_revised_by_user_id_fkey" FOREIGN KEY (revised_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."luc_document_rev" validate constraint "luc_document_rev_revised_by_user_id_fkey";

alter table "public"."luc_procedure" add constraint "luc_procedure_approved_by_user_id_fkey" FOREIGN KEY (approved_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."luc_procedure" validate constraint "luc_procedure_approved_by_user_id_fkey";

alter table "public"."luc_procedure" add constraint "luc_procedure_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."luc_procedure" validate constraint "luc_procedure_created_by_user_id_fkey";

alter table "public"."luc_procedure" add constraint "luc_procedure_fk_document_id_fkey" FOREIGN KEY (fk_document_id) REFERENCES public.luc_document(document_id) not valid;

alter table "public"."luc_procedure" validate constraint "luc_procedure_fk_document_id_fkey";

alter table "public"."luc_procedure" add constraint "luc_procedure_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."luc_procedure" validate constraint "luc_procedure_fk_owner_id_fkey";

alter table "public"."maintenance_ticket" add constraint "maintenance_ticket_assigned_to_user_id_fkey" FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."maintenance_ticket" validate constraint "maintenance_ticket_assigned_to_user_id_fkey";

alter table "public"."maintenance_ticket" add constraint "maintenance_ticket_fk_component_id_fkey" FOREIGN KEY (fk_component_id) REFERENCES public.tool_component(component_id) ON DELETE SET NULL not valid;

alter table "public"."maintenance_ticket" validate constraint "maintenance_ticket_fk_component_id_fkey";

alter table "public"."maintenance_ticket" add constraint "maintenance_ticket_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."maintenance_ticket" validate constraint "maintenance_ticket_fk_owner_id_fkey";

alter table "public"."maintenance_ticket" add constraint "maintenance_ticket_fk_tool_id_fkey" FOREIGN KEY (fk_tool_id) REFERENCES public.tool(tool_id) ON DELETE SET NULL not valid;

alter table "public"."maintenance_ticket" validate constraint "maintenance_ticket_fk_tool_id_fkey";

alter table "public"."maintenance_ticket" add constraint "maintenance_ticket_reported_by_user_id_fkey" FOREIGN KEY (reported_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."maintenance_ticket" validate constraint "maintenance_ticket_reported_by_user_id_fkey";

alter table "public"."maintenance_ticket_attachment" add constraint "maintenance_ticket_attachment_fk_ticket_id_fkey" FOREIGN KEY (fk_ticket_id) REFERENCES public.maintenance_ticket(ticket_id) ON DELETE CASCADE not valid;

alter table "public"."maintenance_ticket_attachment" validate constraint "maintenance_ticket_attachment_fk_ticket_id_fkey";

alter table "public"."maintenance_ticket_attachment" add constraint "maintenance_ticket_attachment_uploaded_by_user_id_fkey" FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."maintenance_ticket_attachment" validate constraint "maintenance_ticket_attachment_uploaded_by_user_id_fkey";

alter table "public"."maintenance_ticket_event" add constraint "maintenance_ticket_event_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."maintenance_ticket_event" validate constraint "maintenance_ticket_event_created_by_user_id_fkey";

alter table "public"."maintenance_ticket_event" add constraint "maintenance_ticket_event_fk_ticket_id_fkey" FOREIGN KEY (fk_ticket_id) REFERENCES public.maintenance_ticket(ticket_id) ON DELETE CASCADE not valid;

alter table "public"."maintenance_ticket_event" validate constraint "maintenance_ticket_event_fk_ticket_id_fkey";

alter table "public"."maintenance_ticket_item" add constraint "maintenance_ticket_item_fk_component_id_fkey" FOREIGN KEY (fk_component_id) REFERENCES public.tool_component(component_id) not valid;

alter table "public"."maintenance_ticket_item" validate constraint "maintenance_ticket_item_fk_component_id_fkey";

alter table "public"."maintenance_ticket_item" add constraint "maintenance_ticket_item_fk_ticket_id_fkey" FOREIGN KEY (fk_ticket_id) REFERENCES public.maintenance_ticket(ticket_id) ON DELETE CASCADE not valid;

alter table "public"."maintenance_ticket_item" validate constraint "maintenance_ticket_item_fk_ticket_id_fkey";

alter table "public"."maintenance_ticket_report" add constraint "maintenance_ticket_report_fk_ticket_id_fkey" FOREIGN KEY (fk_ticket_id) REFERENCES public.maintenance_ticket(ticket_id) ON DELETE CASCADE not valid;

alter table "public"."maintenance_ticket_report" validate constraint "maintenance_ticket_report_fk_ticket_id_fkey";

alter table "public"."maintenance_ticket_report" add constraint "maintenance_ticket_report_generated_by_user_id_fkey" FOREIGN KEY (generated_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."maintenance_ticket_report" validate constraint "maintenance_ticket_report_generated_by_user_id_fkey";

alter table "public"."messages" add constraint "messages_from_user_id_fkey" FOREIGN KEY (from_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."messages" validate constraint "messages_from_user_id_fkey";

alter table "public"."messages" add constraint "messages_parent_message_id_fkey" FOREIGN KEY (parent_message_id) REFERENCES public.messages(message_id) not valid;

alter table "public"."messages" validate constraint "messages_parent_message_id_fkey";

alter table "public"."messages" add constraint "messages_to_user_id_fkey" FOREIGN KEY (to_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."messages" validate constraint "messages_to_user_id_fkey";

alter table "public"."mission_component" add constraint "mission_component_fk_planning_id_fkey" FOREIGN KEY (fk_planning_id) REFERENCES public.planning(planning_id) ON DELETE CASCADE not valid;

alter table "public"."mission_component" validate constraint "mission_component_fk_planning_id_fkey";

alter table "public"."mission_component" add constraint "mission_component_fk_tool_id_fkey" FOREIGN KEY (fk_tool_id) REFERENCES public.tool(tool_id) ON DELETE SET NULL not valid;

alter table "public"."mission_component" validate constraint "mission_component_fk_tool_id_fkey";

alter table "public"."mission_flight_logs" add constraint "mission_flight_logs_log_source_check" CHECK (((log_source)::text = ANY ((ARRAY['manual'::character varying, 'flytbase'::character varying])::text[]))) not valid;

alter table "public"."mission_flight_logs" validate constraint "mission_flight_logs_log_source_check";

alter table "public"."notification" add constraint "notification_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."notification" validate constraint "notification_fk_user_id_fkey";

alter table "public"."operation_attachment" add constraint "operation_attachment_fk_operation_id_fkey" FOREIGN KEY (fk_operation_id) REFERENCES public.pilot_mission(pilot_mission_id) ON DELETE CASCADE not valid;

alter table "public"."operation_attachment" validate constraint "operation_attachment_fk_operation_id_fkey";

alter table "public"."operation_attachment" add constraint "operation_attachment_uploaded_by_user_id_fkey" FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL not valid;

alter table "public"."operation_attachment" validate constraint "operation_attachment_uploaded_by_user_id_fkey";

alter table "public"."owner" add constraint "owner_fk_country_id_fkey" FOREIGN KEY (fk_country_id) REFERENCES public.countries(country_id) not valid;

alter table "public"."owner" validate constraint "owner_fk_country_id_fkey";

alter table "public"."owner_territorial_unit" add constraint "owner_territorial_unit_fk_country_id_fkey" FOREIGN KEY (fk_country_id) REFERENCES public.countries(country_id) not valid;

alter table "public"."owner_territorial_unit" validate constraint "owner_territorial_unit_fk_country_id_fkey";

alter table "public"."owner_territorial_unit" add constraint "owner_territorial_unit_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) ON DELETE CASCADE not valid;

alter table "public"."owner_territorial_unit" validate constraint "owner_territorial_unit_fk_owner_id_fkey";

alter table "public"."owner_territorial_unit" add constraint "owner_territorial_unit_unit_manager_id_fkey" FOREIGN KEY (unit_manager_id) REFERENCES public.users(user_id) not valid;

alter table "public"."owner_territorial_unit" validate constraint "owner_territorial_unit_unit_manager_id_fkey";

alter table "public"."payload" add constraint "payload_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."payload" validate constraint "payload_fk_owner_id_fkey";

alter table "public"."payload" add constraint "payload_fk_tool_id_fkey" FOREIGN KEY (fk_tool_id) REFERENCES public.tool(tool_id) ON DELETE SET NULL not valid;

alter table "public"."payload" validate constraint "payload_fk_tool_id_fkey";

alter table "public"."pilot_declaration" add constraint "pilot_declaration_fk_tool_id_fkey" FOREIGN KEY (fk_tool_id) REFERENCES public.tool(tool_id) not valid;

alter table "public"."pilot_declaration" validate constraint "pilot_declaration_fk_tool_id_fkey";

alter table "public"."pilot_declaration" add constraint "pilot_declaration_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."pilot_declaration" validate constraint "pilot_declaration_fk_user_id_fkey";

alter table "public"."pilot_mission" add constraint "pilot_mission_fk_client_id_fkey" FOREIGN KEY (fk_client_id) REFERENCES public.client(client_id) not valid;

alter table "public"."pilot_mission" validate constraint "pilot_mission_fk_client_id_fkey";

alter table "public"."pilot_mission" add constraint "pilot_mission_fk_erp_group_id_fkey" FOREIGN KEY (fk_erp_group_id) REFERENCES public.erp_location_group(group_id) not valid;

alter table "public"."pilot_mission" validate constraint "pilot_mission_fk_erp_group_id_fkey";

alter table "public"."pilot_mission" add constraint "pilot_mission_fk_luc_procedure_id_fkey" FOREIGN KEY (fk_luc_procedure_id) REFERENCES public.luc_procedure(procedure_id) ON DELETE SET NULL not valid;

alter table "public"."pilot_mission" validate constraint "pilot_mission_fk_luc_procedure_id_fkey";

alter table "public"."pilot_mission" add constraint "pilot_mission_fk_mission_category_id_fkey" FOREIGN KEY (fk_mission_category_id) REFERENCES public.pilot_mission_category(category_id) not valid;

alter table "public"."pilot_mission" validate constraint "pilot_mission_fk_mission_category_id_fkey";

alter table "public"."pilot_mission" add constraint "pilot_mission_fk_mission_result_type_id_fkey" FOREIGN KEY (fk_mission_result_type_id) REFERENCES public.pilot_mission_result_type(result_type_id) not valid;

alter table "public"."pilot_mission" validate constraint "pilot_mission_fk_mission_result_type_id_fkey";

alter table "public"."pilot_mission" add constraint "pilot_mission_fk_mission_status_id_fkey" FOREIGN KEY (fk_mission_status_id) REFERENCES public.pilot_mission_status(status_id) not valid;

alter table "public"."pilot_mission" validate constraint "pilot_mission_fk_mission_status_id_fkey";

alter table "public"."pilot_mission" add constraint "pilot_mission_fk_mission_type_id_fkey" FOREIGN KEY (fk_mission_type_id) REFERENCES public.pilot_mission_type(mission_type_id) not valid;

alter table "public"."pilot_mission" validate constraint "pilot_mission_fk_mission_type_id_fkey";

alter table "public"."pilot_mission" add constraint "pilot_mission_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."pilot_mission" validate constraint "pilot_mission_fk_owner_id_fkey";

alter table "public"."pilot_mission" add constraint "pilot_mission_fk_pilot_user_id_fkey" FOREIGN KEY (fk_pilot_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."pilot_mission" validate constraint "pilot_mission_fk_pilot_user_id_fkey";

alter table "public"."pilot_mission" add constraint "pilot_mission_fk_planning_id_fkey" FOREIGN KEY (fk_planning_id) REFERENCES public.planning(planning_id) not valid;

alter table "public"."pilot_mission" validate constraint "pilot_mission_fk_planning_id_fkey";

alter table "public"."pilot_mission" add constraint "pilot_mission_fk_tool_id_fkey" FOREIGN KEY (fk_tool_id) REFERENCES public.tool(tool_id) ON DELETE SET NULL not valid;

alter table "public"."pilot_mission" validate constraint "pilot_mission_fk_tool_id_fkey";

alter table "public"."pilot_mission_planned_template_logbook" add constraint "pilot_mission_planned_template_logbook_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."pilot_mission_planned_template_logbook" validate constraint "pilot_mission_planned_template_logbook_created_by_user_id_fkey";

alter table "public"."pilot_mission_result" add constraint "pilot_mission_result_fk_pilot_mission_id_fkey" FOREIGN KEY (fk_pilot_mission_id) REFERENCES public.pilot_mission(pilot_mission_id) ON DELETE CASCADE not valid;

alter table "public"."pilot_mission_result" validate constraint "pilot_mission_result_fk_pilot_mission_id_fkey";

alter table "public"."pilot_mission_result_type" add constraint "pilot_mission_result_type_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) ON DELETE CASCADE not valid;

alter table "public"."pilot_mission_result_type" validate constraint "pilot_mission_result_type_fk_owner_id_fkey";

alter table "public"."pilot_mission_status" add constraint "fk_owner" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) ON DELETE CASCADE not valid;

alter table "public"."pilot_mission_status" validate constraint "fk_owner";

alter table "public"."planning" add constraint "planning_assigned_to_user_id_fkey" FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL not valid;

alter table "public"."planning" validate constraint "planning_assigned_to_user_id_fkey";

alter table "public"."planning" add constraint "planning_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."planning" validate constraint "planning_created_by_user_id_fkey";

alter table "public"."planning" add constraint "planning_fk_client_id_fkey" FOREIGN KEY (fk_client_id) REFERENCES public.client(client_id) not valid;

alter table "public"."planning" validate constraint "planning_fk_client_id_fkey";

alter table "public"."planning" add constraint "planning_fk_evaluation_id_fkey" FOREIGN KEY (fk_evaluation_id) REFERENCES public.evaluation(evaluation_id) not valid;

alter table "public"."planning" validate constraint "planning_fk_evaluation_id_fkey";

alter table "public"."planning" add constraint "planning_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."planning" validate constraint "planning_fk_owner_id_fkey";

alter table "public"."planning_logbook" add constraint "planning_logbook_fk_client_id_fkey" FOREIGN KEY (fk_client_id) REFERENCES public.client(client_id) not valid;

alter table "public"."planning_logbook" validate constraint "planning_logbook_fk_client_id_fkey";

alter table "public"."planning_logbook" add constraint "planning_logbook_fk_evaluation_id_fkey" FOREIGN KEY (fk_evaluation_id) REFERENCES public.evaluation(evaluation_id) not valid;

alter table "public"."planning_logbook" validate constraint "planning_logbook_fk_evaluation_id_fkey";

alter table "public"."planning_logbook" add constraint "planning_logbook_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."planning_logbook" validate constraint "planning_logbook_fk_owner_id_fkey";

alter table "public"."planning_logbook" add constraint "planning_logbook_fk_planning_id_fkey" FOREIGN KEY (fk_planning_id) REFERENCES public.planning(planning_id) ON DELETE CASCADE not valid;

alter table "public"."planning_logbook" validate constraint "planning_logbook_fk_planning_id_fkey";

alter table "public"."planning_logbook" add constraint "planning_logbook_fk_tool_id_fkey" FOREIGN KEY (fk_tool_id) REFERENCES public.tool(tool_id) ON DELETE SET NULL not valid;

alter table "public"."planning_logbook" validate constraint "planning_logbook_fk_tool_id_fkey";

alter table "public"."planning_logbook" add constraint "planning_logbook_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."planning_logbook" validate constraint "planning_logbook_fk_user_id_fkey";

alter table "public"."planning_test_logbook" add constraint "planning_test_logbook_fk_evaluation_id_fkey" FOREIGN KEY (fk_evaluation_id) REFERENCES public.evaluation(evaluation_id) not valid;

alter table "public"."planning_test_logbook" validate constraint "planning_test_logbook_fk_evaluation_id_fkey";

alter table "public"."planning_test_logbook" add constraint "planning_test_logbook_fk_mission_planning_id_fkey" FOREIGN KEY (fk_mission_planning_id) REFERENCES public.planning_logbook(mission_planning_id) ON DELETE CASCADE not valid;

alter table "public"."planning_test_logbook" validate constraint "planning_test_logbook_fk_mission_planning_id_fkey";

alter table "public"."planning_test_logbook" add constraint "planning_test_logbook_fk_observer_id_fkey" FOREIGN KEY (fk_observer_id) REFERENCES public.users(user_id) not valid;

alter table "public"."planning_test_logbook" validate constraint "planning_test_logbook_fk_observer_id_fkey";

alter table "public"."planning_test_logbook" add constraint "planning_test_logbook_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."planning_test_logbook" validate constraint "planning_test_logbook_fk_owner_id_fkey";

alter table "public"."planning_test_logbook" add constraint "planning_test_logbook_fk_pic_id_fkey" FOREIGN KEY (fk_pic_id) REFERENCES public.users(user_id) not valid;

alter table "public"."planning_test_logbook" validate constraint "planning_test_logbook_fk_pic_id_fkey";

alter table "public"."planning_test_logbook" add constraint "planning_test_logbook_fk_planning_id_fkey" FOREIGN KEY (fk_planning_id) REFERENCES public.planning(planning_id) ON DELETE CASCADE not valid;

alter table "public"."planning_test_logbook" validate constraint "planning_test_logbook_fk_planning_id_fkey";

alter table "public"."planning_test_logbook" add constraint "planning_test_logbook_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."planning_test_logbook" validate constraint "planning_test_logbook_fk_user_id_fkey";

alter table "public"."planning_test_logbook" add constraint "planning_test_logbook_tested_by_user_id_fkey" FOREIGN KEY (tested_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."planning_test_logbook" validate constraint "planning_test_logbook_tested_by_user_id_fkey";

alter table "public"."repository_file" add constraint "repository_file_fk_file_type_id_fkey" FOREIGN KEY (fk_file_type_id) REFERENCES public.repository_file_type(file_type_id) not valid;

alter table "public"."repository_file" validate constraint "repository_file_fk_file_type_id_fkey";

alter table "public"."repository_file" add constraint "repository_file_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."repository_file" validate constraint "repository_file_fk_owner_id_fkey";

alter table "public"."repository_file" add constraint "repository_file_uploaded_by_user_id_fkey" FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."repository_file" validate constraint "repository_file_uploaded_by_user_id_fkey";

alter table "public"."safety_action" add constraint "safety_action_assigned_to_user_id_fkey" FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."safety_action" validate constraint "safety_action_assigned_to_user_id_fkey";

alter table "public"."safety_action" add constraint "safety_action_fk_report_id_fkey" FOREIGN KEY (fk_report_id) REFERENCES public.safety_report(report_id) ON DELETE CASCADE not valid;

alter table "public"."safety_action" validate constraint "safety_action_fk_report_id_fkey";

alter table "public"."safety_action" add constraint "safety_action_verified_by_user_id_fkey" FOREIGN KEY (verified_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."safety_action" validate constraint "safety_action_verified_by_user_id_fkey";

alter table "public"."safety_report" add constraint "safety_report_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."safety_report" validate constraint "safety_report_fk_owner_id_fkey";

alter table "public"."safety_report" add constraint "safety_report_fk_pilot_mission_id_fkey" FOREIGN KEY (fk_pilot_mission_id) REFERENCES public.pilot_mission(pilot_mission_id) not valid;

alter table "public"."safety_report" validate constraint "safety_report_fk_pilot_mission_id_fkey";

alter table "public"."safety_report" add constraint "safety_report_investigated_by_user_id_fkey" FOREIGN KEY (investigated_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."safety_report" validate constraint "safety_report_investigated_by_user_id_fkey";

alter table "public"."safety_report" add constraint "safety_report_reported_by_user_id_fkey" FOREIGN KEY (reported_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."safety_report" validate constraint "safety_report_reported_by_user_id_fkey";

alter table "public"."spi_kpi" add constraint "spi_kpi_fk_definition_id_fkey" FOREIGN KEY (fk_definition_id) REFERENCES public.spi_kpi_definition(definition_id) not valid;

alter table "public"."spi_kpi" validate constraint "spi_kpi_fk_definition_id_fkey";

alter table "public"."spi_kpi" add constraint "spi_kpi_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."spi_kpi" validate constraint "spi_kpi_fk_owner_id_fkey";

alter table "public"."spi_kpi" add constraint "spi_kpi_recorded_by_user_id_fkey" FOREIGN KEY (recorded_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."spi_kpi" validate constraint "spi_kpi_recorded_by_user_id_fkey";

alter table "public"."spi_kpi_definition" add constraint "spi_kpi_definition_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."spi_kpi_definition" validate constraint "spi_kpi_definition_fk_owner_id_fkey";

alter table "public"."spi_kpi_log" add constraint "spi_kpi_log_changed_by_user_id_fkey" FOREIGN KEY (changed_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."spi_kpi_log" validate constraint "spi_kpi_log_changed_by_user_id_fkey";

alter table "public"."spi_kpi_log" add constraint "spi_kpi_log_fk_kpi_id_fkey" FOREIGN KEY (fk_kpi_id) REFERENCES public.spi_kpi(kpi_id) ON DELETE CASCADE not valid;

alter table "public"."spi_kpi_log" validate constraint "spi_kpi_log_fk_kpi_id_fkey";

alter table "public"."spi_kpi_target_proposal" add constraint "spi_kpi_target_proposal_approved_by_user_id_fkey" FOREIGN KEY (approved_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."spi_kpi_target_proposal" validate constraint "spi_kpi_target_proposal_approved_by_user_id_fkey";

alter table "public"."spi_kpi_target_proposal" add constraint "spi_kpi_target_proposal_fk_definition_id_fkey" FOREIGN KEY (fk_definition_id) REFERENCES public.spi_kpi_definition(definition_id) not valid;

alter table "public"."spi_kpi_target_proposal" validate constraint "spi_kpi_target_proposal_fk_definition_id_fkey";

alter table "public"."spi_kpi_target_proposal" add constraint "spi_kpi_target_proposal_proposed_by_user_id_fkey" FOREIGN KEY (proposed_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."spi_kpi_target_proposal" validate constraint "spi_kpi_target_proposal_proposed_by_user_id_fkey";

alter table "public"."team" add constraint "team_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) ON DELETE CASCADE not valid;

alter table "public"."team" validate constraint "team_fk_owner_id_fkey";

alter table "public"."team" add constraint "team_team_leader_id_fkey" FOREIGN KEY (team_leader_id) REFERENCES public.users(user_id) not valid;

alter table "public"."team" validate constraint "team_team_leader_id_fkey";

alter table "public"."team_members" add constraint "team_members_fk_team_id_fkey" FOREIGN KEY (fk_team_id) REFERENCES public.team(team_id) ON DELETE CASCADE not valid;

alter table "public"."team_members" validate constraint "team_members_fk_team_id_fkey";

alter table "public"."team_members" add constraint "team_members_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE not valid;

alter table "public"."team_members" validate constraint "team_members_fk_user_id_fkey";

alter table "public"."ticket_attachment" add constraint "ticket_attachment_fk_ticket_id_fkey" FOREIGN KEY (fk_ticket_id) REFERENCES public.maintenance_ticket(ticket_id) ON DELETE CASCADE not valid;

alter table "public"."ticket_attachment" validate constraint "ticket_attachment_fk_ticket_id_fkey";

alter table "public"."ticket_attachment" add constraint "ticket_attachment_uploaded_by_user_id_fkey" FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL not valid;

alter table "public"."ticket_attachment" validate constraint "ticket_attachment_uploaded_by_user_id_fkey";

alter table "public"."tool" add constraint "tool_assigned_client_id_fkey" FOREIGN KEY (assigned_client_id) REFERENCES public.client(client_id) ON DELETE SET NULL not valid;

alter table "public"."tool" validate constraint "tool_assigned_client_id_fkey";

alter table "public"."tool" add constraint "tool_fk_model_id_fkey" FOREIGN KEY (fk_model_id) REFERENCES public.tool_model(model_id) not valid;

alter table "public"."tool" validate constraint "tool_fk_model_id_fkey";

alter table "public"."tool" add constraint "tool_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) ON DELETE CASCADE not valid;

alter table "public"."tool" validate constraint "tool_fk_owner_id_fkey";

alter table "public"."tool" add constraint "tool_fk_status_id_fkey" FOREIGN KEY (fk_status_id) REFERENCES public.tool_status(status_id) not valid;

alter table "public"."tool" validate constraint "tool_fk_status_id_fkey";

alter table "public"."tool_component" add constraint "tool_component_fk_tool_id_fkey" FOREIGN KEY (fk_tool_id) REFERENCES public.tool(tool_id) ON DELETE CASCADE not valid;

alter table "public"."tool_component" validate constraint "tool_component_fk_tool_id_fkey";

alter table "public"."tool_erp" add constraint "tool_erp_fk_tool_id_fkey" FOREIGN KEY (fk_tool_id) REFERENCES public.tool(tool_id) ON DELETE CASCADE not valid;

alter table "public"."tool_erp" validate constraint "tool_erp_fk_tool_id_fkey";

alter table "public"."tool_maintenance" add constraint "tool_maintenance_fk_tool_id_fkey" FOREIGN KEY (fk_tool_id) REFERENCES public.tool(tool_id) ON DELETE CASCADE not valid;

alter table "public"."tool_maintenance" validate constraint "tool_maintenance_fk_tool_id_fkey";

alter table "public"."tool_maintenance" add constraint "tool_maintenance_performed_by_user_id_fkey" FOREIGN KEY (performed_by_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."tool_maintenance" validate constraint "tool_maintenance_performed_by_user_id_fkey";

alter table "public"."training" add constraint "training_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."training" validate constraint "training_fk_owner_id_fkey";

alter table "public"."training" add constraint "training_trainer_user_id_fkey" FOREIGN KEY (trainer_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."training" validate constraint "training_trainer_user_id_fkey";

alter table "public"."training_attendance" add constraint "training_attendance_fk_training_id_fkey" FOREIGN KEY (fk_training_id) REFERENCES public.training(training_id) ON DELETE CASCADE not valid;

alter table "public"."training_attendance" validate constraint "training_attendance_fk_training_id_fkey";

alter table "public"."training_attendance" add constraint "training_attendance_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) not valid;

alter table "public"."training_attendance" validate constraint "training_attendance_fk_user_id_fkey";

alter table "public"."turn_users" add constraint "turn_users_fk_turn_id_fkey" FOREIGN KEY (fk_turn_id) REFERENCES public.turns(turn_id) ON DELETE CASCADE not valid;

alter table "public"."turn_users" validate constraint "turn_users_fk_turn_id_fkey";

alter table "public"."turn_users" add constraint "turn_users_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE not valid;

alter table "public"."turn_users" validate constraint "turn_users_fk_user_id_fkey";

alter table "public"."turns" add constraint "turns_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."turns" validate constraint "turns_fk_owner_id_fkey";

alter table "public"."user_device" add constraint "user_device_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE not valid;

alter table "public"."user_device" validate constraint "user_device_fk_user_id_fkey";

alter table "public"."user_owner" add constraint "user_owner_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) ON DELETE CASCADE not valid;

alter table "public"."user_owner" validate constraint "user_owner_fk_owner_id_fkey";

alter table "public"."user_owner" add constraint "user_owner_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE not valid;

alter table "public"."user_owner" validate constraint "user_owner_fk_user_id_fkey";

alter table "public"."user_permessi" add constraint "user_permessi_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE not valid;

alter table "public"."user_permessi" validate constraint "user_permessi_fk_user_id_fkey";

alter table "public"."user_permessi" add constraint "user_permessi_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES public.users(user_id) not valid;

alter table "public"."user_permessi" validate constraint "user_permessi_granted_by_fkey";

alter table "public"."user_qualification" add constraint "user_qualification_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."user_qualification" validate constraint "user_qualification_fk_owner_id_fkey";

alter table "public"."user_qualification" add constraint "user_qualification_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE not valid;

alter table "public"."user_qualification" validate constraint "user_qualification_fk_user_id_fkey";

alter table "public"."user_session" add constraint "user_session_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE not valid;

alter table "public"."user_session" validate constraint "user_session_fk_user_id_fkey";

alter table "public"."user_settings" add constraint "user_settings_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE not valid;

alter table "public"."user_settings" validate constraint "user_settings_fk_user_id_fkey";

alter table "public"."users" add constraint "users_fk_client_id_fkey" FOREIGN KEY (fk_client_id) REFERENCES public.client(client_id) ON DELETE SET NULL not valid;

alter table "public"."users" validate constraint "users_fk_client_id_fkey";

alter table "public"."users" add constraint "users_fk_owner_id_fkey" FOREIGN KEY (fk_owner_id) REFERENCES public.owner(owner_id) not valid;

alter table "public"."users" validate constraint "users_fk_owner_id_fkey";

alter table "public"."users" add constraint "users_fk_territorial_unit_fkey" FOREIGN KEY (fk_territorial_unit) REFERENCES public.owner_territorial_unit(unit_id) ON DELETE SET NULL not valid;

alter table "public"."users" validate constraint "users_fk_territorial_unit_fkey";

alter table "public"."users_profile" add constraint "users_profile_fk_country_id_fkey" FOREIGN KEY (fk_country_id) REFERENCES public.countries(country_id) not valid;

alter table "public"."users_profile" validate constraint "users_profile_fk_country_id_fkey";

alter table "public"."users_profile" add constraint "users_profile_fk_user_id_fkey" FOREIGN KEY (fk_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE not valid;

alter table "public"."users_profile" validate constraint "users_profile_fk_user_id_fkey";


  create policy "Users can insert own settings"
  on "public"."user_settings"
  as permissive
  for insert
  to authenticated
with check ((fk_user_id = public.get_current_user_id()));



  create policy "Users can update own settings"
  on "public"."user_settings"
  as permissive
  for update
  to authenticated
using ((fk_user_id = public.get_current_user_id()))
with check ((fk_user_id = public.get_current_user_id()));



  create policy "Users can view own settings"
  on "public"."user_settings"
  as permissive
  for select
  to authenticated
using (((fk_user_id = public.get_current_user_id()) OR public.is_admin()));



  create policy "Only admins can delete users"
  on "public"."users"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "Users can view own profile"
  on "public"."users"
  as permissive
  for select
  to authenticated
using (((auth_user_id = auth.uid()) OR public.is_admin()));



  create policy "Users can update own profile details"
  on "public"."users_profile"
  as permissive
  for update
  to authenticated
using ((fk_user_id = public.get_current_user_id()))
with check ((fk_user_id = public.get_current_user_id()));



  create policy "Users can view own profile details"
  on "public"."users_profile"
  as permissive
  for select
  to authenticated
using (((fk_user_id = public.get_current_user_id()) OR public.is_admin()));


CREATE TRIGGER update_assignment_updated_at BEFORE UPDATE ON public.assignment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_shift_updated_at BEFORE UPDATE ON public.calendar_shift FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_updated_at BEFORE UPDATE ON public.checklist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_updated_at BEFORE UPDATE ON public.client FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_communication_updated_at BEFORE UPDATE ON public.communication FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_requirement_updated_at BEFORE UPDATE ON public.compliance_requirement FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_controlroom_drone_updated_at BEFORE UPDATE ON public.controlroom_drone FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_controlroom_meta_updated_at BEFORE UPDATE ON public.controlroom_meta FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_erp_updated_at BEFORE UPDATE ON public.emergency_response_plan FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_evaluation_updated_at BEFORE UPDATE ON public.evaluation FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluation_action_updated_at BEFORE UPDATE ON public.evaluation_action FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flytbase_mission_updated_at BEFORE UPDATE ON public.flytbase_mission FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kanban_updated_at BEFORE UPDATE ON public.kanban FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_luc_document_updated_at BEFORE UPDATE ON public.luc_document FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_luc_procedure_updated_at BEFORE UPDATE ON public.luc_procedure FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_ticket_updated_at BEFORE UPDATE ON public.maintenance_ticket FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_owner_updated_at BEFORE UPDATE ON public.owner FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_owner_territorial_unit_updated_at BEFORE UPDATE ON public.owner_territorial_unit FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payload_updated_at BEFORE UPDATE ON public.payload FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pilot_mission_updated_at BEFORE UPDATE ON public.pilot_mission FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pilot_mission_planned_template_logbook_updated_at BEFORE UPDATE ON public.pilot_mission_planned_template_logbook FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planning_updated_at BEFORE UPDATE ON public.planning FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planning_logbook_updated_at BEFORE UPDATE ON public.planning_logbook FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_repository_file_updated_at BEFORE UPDATE ON public.repository_file FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_safety_action_updated_at BEFORE UPDATE ON public.safety_action FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_safety_report_updated_at BEFORE UPDATE ON public.safety_report FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_spi_kpi_definition_updated_at BEFORE UPDATE ON public.spi_kpi_definition FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_updated_at BEFORE UPDATE ON public.team FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tool_updated_at BEFORE UPDATE ON public.tool FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tool_component_updated_at BEFORE UPDATE ON public.tool_component FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tool_erp_updated_at BEFORE UPDATE ON public.tool_erp FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tool_maintenance_updated_at BEFORE UPDATE ON public.tool_maintenance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_updated_at BEFORE UPDATE ON public.training FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_qualification_updated_at BEFORE UPDATE ON public.user_qualification FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_profile_updated_at BEFORE UPDATE ON public.users_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_deleted BEFORE DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

CREATE TRIGGER on_auth_user_updated AFTER UPDATE OF email ON auth.users FOR EACH ROW WHEN (((old.email)::text IS DISTINCT FROM (new.email)::text)) EXECUTE FUNCTION public.handle_user_update();


