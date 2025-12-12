--
-- PostgreSQL database dump
--

\restrict udDNm9EOTo84bYUMtp2FeembWo9iDbYaTgGz9Pmr1LuzQuccnbazhhQr0JY0kwy

-- Dumped from database version 14.19
-- Dumped by pg_dump version 17.6 (Debian 17.6-0+deb13u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: pet_birthday_precision; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pet_birthday_precision AS ENUM (
    'day',
    'month',
    'year',
    'unknown'
);


--
-- Name: email_configurations_set_is_active_from_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.email_configurations_set_is_active_from_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.is_active := (NEW.status = 'active');
    RETURN NEW;
END;
$$;


--
-- Name: email_configurations_set_status_from_is_active(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.email_configurations_set_status_from_is_active() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        NEW.status := CASE WHEN NEW.is_active THEN 'active' ELSE 'inactive' END;
    END IF;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration integer NOT NULL
);


--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration integer NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id bigint NOT NULL,
    name character varying(50) NOT NULL,
    slug character varying(60) NOT NULL,
    pet_type_id bigint NOT NULL,
    description text,
    created_by bigint,
    approved_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cities (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(120) NOT NULL,
    country character varying(2) NOT NULL,
    description text,
    created_by bigint,
    approved_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: cities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cities_id_seq OWNED BY public.cities.id;


--
-- Name: email_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_configurations (
    id bigint NOT NULL,
    provider character varying(50) NOT NULL,
    config json NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    name character varying(255),
    description text,
    status character varying(255) DEFAULT 'inactive'::character varying NOT NULL,
    is_active boolean DEFAULT false NOT NULL
);


--
-- Name: email_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_configurations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_configurations_id_seq OWNED BY public.email_configurations.id;


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_logs (
    id bigint NOT NULL,
    user_id bigint,
    notification_id bigint,
    email_configuration_id bigint,
    recipient_email character varying(255) NOT NULL,
    subject character varying(255) NOT NULL,
    body text NOT NULL,
    headers json,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    smtp_response text,
    error_message text,
    sent_at timestamp(0) without time zone,
    delivered_at timestamp(0) without time zone,
    failed_at timestamp(0) without time zone,
    retry_count integer DEFAULT 0 NOT NULL,
    next_retry_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    opened_at timestamp(0) without time zone,
    clicked_at timestamp(0) without time zone,
    unsubscribed_at timestamp(0) without time zone,
    complained_at timestamp(0) without time zone,
    permanent_fail_at timestamp(0) without time zone
);


--
-- Name: email_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_logs_id_seq OWNED BY public.email_logs.id;


--
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection text NOT NULL,
    queue text NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- Name: foster_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.foster_assignments (
    id bigint NOT NULL,
    owner_user_id bigint NOT NULL,
    foster_user_id bigint NOT NULL,
    transfer_request_id bigint,
    start_date date,
    expected_end_date date,
    completed_at timestamp(0) without time zone,
    canceled_at timestamp(0) without time zone,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    pet_id bigint,
    deleted_at timestamp(0) without time zone,
    CONSTRAINT foster_assignments_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('completed'::character varying)::text, ('canceled'::character varying)::text])))
);


--
-- Name: foster_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.foster_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: foster_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.foster_assignments_id_seq OWNED BY public.foster_assignments.id;


--
-- Name: foster_return_handovers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.foster_return_handovers (
    id bigint NOT NULL,
    foster_assignment_id bigint NOT NULL,
    owner_user_id bigint NOT NULL,
    foster_user_id bigint NOT NULL,
    scheduled_at timestamp(0) without time zone,
    location character varying(255),
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    foster_initiated_at timestamp(0) without time zone,
    owner_confirmed_at timestamp(0) without time zone,
    condition_confirmed boolean DEFAULT false NOT NULL,
    condition_notes text,
    completed_at timestamp(0) without time zone,
    canceled_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: foster_return_handovers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.foster_return_handovers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: foster_return_handovers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.foster_return_handovers_id_seq OWNED BY public.foster_return_handovers.id;


--
-- Name: helper_profile_pet_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.helper_profile_pet_type (
    helper_profile_id bigint NOT NULL,
    pet_type_id bigint NOT NULL
);


--
-- Name: helper_profile_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.helper_profile_photos (
    id bigint NOT NULL,
    helper_profile_id bigint NOT NULL,
    path character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: helper_profile_photos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.helper_profile_photos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: helper_profile_photos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.helper_profile_photos_id_seq OWNED BY public.helper_profile_photos.id;


--
-- Name: helper_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.helper_profiles (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    approval_status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    address character varying(255),
    city character varying(255),
    state character varying(255),
    zip_code character varying(255),
    phone_number character varying(255) NOT NULL,
    experience text NOT NULL,
    has_pets boolean NOT NULL,
    has_children boolean NOT NULL,
    country character varying(2) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    contact_info text,
    request_types json NOT NULL,
    city_id bigint,
    CONSTRAINT helper_profiles_approval_status_check CHECK (((approval_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text, ('suspended'::character varying)::text])))
);


--
-- Name: helper_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.helper_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: helper_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.helper_profiles_id_seq OWNED BY public.helper_profiles.id;


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitations (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    inviter_user_id bigint NOT NULL,
    recipient_user_id bigint,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: invitations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invitations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invitations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invitations_id_seq OWNED BY public.invitations.id;


--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media (
    id bigint NOT NULL,
    model_type character varying(255) NOT NULL,
    model_id bigint NOT NULL,
    uuid uuid,
    collection_name character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    file_name character varying(255) NOT NULL,
    mime_type character varying(255),
    disk character varying(255) NOT NULL,
    conversions_disk character varying(255),
    size bigint NOT NULL,
    manipulations json NOT NULL,
    custom_properties json NOT NULL,
    generated_conversions json NOT NULL,
    responsive_images json NOT NULL,
    order_column integer,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: media_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.media_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.media_id_seq OWNED BY public.media.id;


--
-- Name: medical_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_notes (
    id bigint NOT NULL,
    pet_id bigint NOT NULL,
    record_date date NOT NULL,
    note text NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: medical_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medical_notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medical_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medical_notes_id_seq OWNED BY public.medical_notes.id;


--
-- Name: medical_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_records (
    id bigint NOT NULL,
    record_type character varying(255) NOT NULL,
    description text NOT NULL,
    record_date date NOT NULL,
    vet_name character varying(255),
    attachment_url character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    pet_id bigint NOT NULL,
    CONSTRAINT medical_records_record_type_check CHECK (((record_type)::text = ANY (ARRAY[('vaccination'::character varying)::text, ('vet_visit'::character varying)::text, ('medication'::character varying)::text, ('treatment'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: medical_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medical_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medical_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medical_records_id_seq OWNED BY public.medical_records.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id bigint NOT NULL,
    sender_id bigint NOT NULL,
    recipient_id bigint NOT NULL,
    content text NOT NULL,
    read_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: model_has_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_has_permissions (
    permission_id bigint NOT NULL,
    model_type character varying(255) NOT NULL,
    model_id bigint NOT NULL
);


--
-- Name: model_has_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_has_roles (
    role_id bigint NOT NULL,
    model_type character varying(255) NOT NULL,
    model_id bigint NOT NULL
);


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    notification_type character varying(255) NOT NULL,
    email_enabled boolean DEFAULT true NOT NULL,
    in_app_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: notification_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_preferences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_preferences_id_seq OWNED BY public.notification_preferences.id;


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_templates (
    id bigint NOT NULL,
    type character varying(255) NOT NULL,
    channel character varying(255) NOT NULL,
    locale character varying(10) DEFAULT 'en'::character varying NOT NULL,
    subject_template text,
    body_template text NOT NULL,
    engine character varying(16) DEFAULT 'blade'::character varying NOT NULL,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    updated_by_user_id bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT notification_templates_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


--
-- Name: notification_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_templates_id_seq OWNED BY public.notification_templates.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    message character varying(255) NOT NULL,
    link character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    type character varying(255),
    data json,
    read_at timestamp(0) without time zone,
    delivered_at timestamp(0) without time zone,
    failed_at timestamp(0) without time zone,
    failure_reason text
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: ownership_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ownership_history (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    from_ts timestamp(0) without time zone NOT NULL,
    to_ts timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    pet_id bigint
);


--
-- Name: ownership_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ownership_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ownership_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ownership_history_id_seq OWNED BY public.ownership_history.id;


--
-- Name: ownership_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ownership_transfers (
    id bigint NOT NULL,
    from_user_id bigint NOT NULL,
    to_user_id bigint NOT NULL,
    transfer_request_id bigint,
    occurred_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: ownership_transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ownership_transfers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ownership_transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ownership_transfers_id_seq OWNED BY public.ownership_transfers.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    guard_name character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: personal_access_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_access_tokens (
    id bigint NOT NULL,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id bigint NOT NULL,
    name text NOT NULL,
    token character varying(64) NOT NULL,
    abilities text,
    last_used_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personal_access_tokens_id_seq OWNED BY public.personal_access_tokens.id;


--
-- Name: pet_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_categories (
    id bigint NOT NULL,
    pet_id bigint NOT NULL,
    category_id bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: pet_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_categories_id_seq OWNED BY public.pet_categories.id;


--
-- Name: pet_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_comments (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    pet_id bigint NOT NULL,
    comment text NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: pet_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_comments_id_seq OWNED BY public.pet_comments.id;


--
-- Name: pet_editors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_editors (
    id bigint NOT NULL,
    pet_id bigint NOT NULL,
    user_id bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: pet_editors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_editors_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_editors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_editors_id_seq OWNED BY public.pet_editors.id;


--
-- Name: pet_microchips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_microchips (
    id bigint NOT NULL,
    pet_id bigint NOT NULL,
    chip_number character varying(255) NOT NULL,
    issuer character varying(255),
    implanted_at date,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: pet_microchips_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_microchips_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_microchips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_microchips_id_seq OWNED BY public.pet_microchips.id;


--
-- Name: pet_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_types (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    is_system boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    placement_requests_allowed boolean DEFAULT false NOT NULL,
    weight_tracking_allowed boolean DEFAULT false NOT NULL,
    microchips_allowed boolean DEFAULT false NOT NULL,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL
);


--
-- Name: pet_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_types_id_seq OWNED BY public.pet_types.id;


--
-- Name: pet_viewers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_viewers (
    id bigint NOT NULL,
    pet_id bigint NOT NULL,
    user_id bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: pet_viewers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_viewers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_viewers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_viewers_id_seq OWNED BY public.pet_viewers.id;


--
-- Name: pets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pets (
    id bigint NOT NULL,
    pet_type_id bigint NOT NULL,
    user_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    birthday date,
    description text,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    birthday_year smallint,
    birthday_month smallint,
    birthday_day smallint,
    birthday_precision character varying(255) DEFAULT 'unknown'::character varying NOT NULL,
    deleted_at timestamp(0) without time zone,
    country character varying(2) NOT NULL,
    state character varying(255),
    city character varying(255),
    address character varying(255),
    sex character varying(255) DEFAULT 'not_specified'::character varying NOT NULL,
    city_id bigint,
    CONSTRAINT pets_birthday_precision_check CHECK (((birthday_precision)::text = ANY ((ARRAY['day'::character varying, 'month'::character varying, 'year'::character varying, 'unknown'::character varying])::text[]))),
    CONSTRAINT pets_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('lost'::character varying)::text, ('deceased'::character varying)::text, ('deleted'::character varying)::text])))
);


--
-- Name: pets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pets_id_seq OWNED BY public.pets.id;


--
-- Name: placement_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.placement_requests (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    request_type character varying(255) DEFAULT 'permanent'::character varying NOT NULL,
    status character varying(255) DEFAULT 'open'::character varying NOT NULL,
    notes text,
    start_date timestamp(0) without time zone,
    end_date timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    fulfilled_at timestamp(0) without time zone,
    fulfilled_by_transfer_request_id bigint,
    pet_id bigint,
    deleted_at timestamp(0) without time zone
);


--
-- Name: placement_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.placement_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: placement_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.placement_requests_id_seq OWNED BY public.placement_requests.id;


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    endpoint_hash character varying(64) NOT NULL,
    endpoint text NOT NULL,
    p256dh character varying(255) NOT NULL,
    auth character varying(255) NOT NULL,
    content_encoding character varying(32) DEFAULT 'aes128gcm'::character varying NOT NULL,
    expires_at timestamp(0) without time zone,
    last_seen_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.push_subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.push_subscriptions_id_seq OWNED BY public.push_subscriptions.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id bigint NOT NULL,
    reviewer_user_id bigint NOT NULL,
    reviewed_user_id bigint NOT NULL,
    transfer_id bigint,
    rating integer NOT NULL,
    comment text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    moderation_notes text,
    is_flagged boolean DEFAULT false NOT NULL,
    flagged_at timestamp(0) without time zone,
    moderated_by bigint,
    moderated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    CONSTRAINT reviews_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('hidden'::character varying)::text, ('flagged'::character varying)::text, ('deleted'::character varying)::text])))
);


--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: role_has_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_has_permissions (
    permission_id bigint NOT NULL,
    role_id bigint NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    guard_name character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id bigint NOT NULL,
    key character varying(255) NOT NULL,
    value text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: transfer_handovers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transfer_handovers (
    id bigint NOT NULL,
    transfer_request_id bigint NOT NULL,
    owner_user_id bigint NOT NULL,
    helper_user_id bigint NOT NULL,
    scheduled_at timestamp(0) without time zone,
    location character varying(255),
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    owner_initiated_at timestamp(0) without time zone,
    helper_confirmed_at timestamp(0) without time zone,
    condition_confirmed boolean DEFAULT false NOT NULL,
    condition_notes text,
    completed_at timestamp(0) without time zone,
    canceled_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: transfer_handovers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transfer_handovers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transfer_handovers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transfer_handovers_id_seq OWNED BY public.transfer_handovers.id;


--
-- Name: transfer_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transfer_requests (
    id bigint NOT NULL,
    initiator_user_id bigint NOT NULL,
    recipient_user_id bigint NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    requested_relationship_type character varying(255) NOT NULL,
    placement_request_id bigint,
    accepted_at timestamp(0) without time zone,
    rejected_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    fostering_type character varying(255),
    price numeric(8,2),
    helper_profile_id bigint NOT NULL,
    requester_id bigint NOT NULL,
    pet_id bigint,
    deleted_at timestamp(0) without time zone,
    CONSTRAINT transfer_requests_fostering_type_check CHECK (((fostering_type)::text = ANY (ARRAY[('free'::character varying)::text, ('paid'::character varying)::text]))),
    CONSTRAINT transfer_requests_requested_relationship_type_check CHECK (((requested_relationship_type)::text = ANY (ARRAY[('fostering'::character varying)::text, ('permanent_foster'::character varying)::text]))),
    CONSTRAINT transfer_requests_status_check CHECK (((status)::text = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'expired'::text, 'canceled'::text])))
);


--
-- Name: transfer_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transfer_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transfer_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transfer_requests_id_seq OWNED BY public.transfer_requests.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    password character varying(255),
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    two_factor_secret text,
    two_factor_recovery_codes text,
    two_factor_confirmed_at timestamp(0) without time zone,
    google_id character varying(255),
    google_token text,
    google_refresh_token text
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vaccination_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vaccination_records (
    id bigint NOT NULL,
    pet_id bigint NOT NULL,
    vaccine_name character varying(255) NOT NULL,
    administered_at date NOT NULL,
    due_at date,
    notes text,
    reminder_sent_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    completed_at timestamp(0) without time zone
);


--
-- Name: vaccination_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vaccination_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vaccination_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vaccination_records_id_seq OWNED BY public.vaccination_records.id;


--
-- Name: waitlist_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waitlist_entries (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    invited_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: waitlist_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.waitlist_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: waitlist_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.waitlist_entries_id_seq OWNED BY public.waitlist_entries.id;


--
-- Name: weight_histories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weight_histories (
    id bigint NOT NULL,
    weight_kg numeric(8,2) NOT NULL,
    record_date date NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    pet_id bigint
);


--
-- Name: weight_histories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.weight_histories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: weight_histories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.weight_histories_id_seq OWNED BY public.weight_histories.id;


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: cities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities ALTER COLUMN id SET DEFAULT nextval('public.cities_id_seq'::regclass);


--
-- Name: email_configurations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_configurations ALTER COLUMN id SET DEFAULT nextval('public.email_configurations_id_seq'::regclass);


--
-- Name: email_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs ALTER COLUMN id SET DEFAULT nextval('public.email_logs_id_seq'::regclass);


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- Name: foster_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foster_assignments ALTER COLUMN id SET DEFAULT nextval('public.foster_assignments_id_seq'::regclass);


--
-- Name: foster_return_handovers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foster_return_handovers ALTER COLUMN id SET DEFAULT nextval('public.foster_return_handovers_id_seq'::regclass);


--
-- Name: helper_profile_photos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helper_profile_photos ALTER COLUMN id SET DEFAULT nextval('public.helper_profile_photos_id_seq'::regclass);


--
-- Name: helper_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helper_profiles ALTER COLUMN id SET DEFAULT nextval('public.helper_profiles_id_seq'::regclass);


--
-- Name: invitations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations ALTER COLUMN id SET DEFAULT nextval('public.invitations_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: media id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media ALTER COLUMN id SET DEFAULT nextval('public.media_id_seq'::regclass);


--
-- Name: medical_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_notes ALTER COLUMN id SET DEFAULT nextval('public.medical_notes_id_seq'::regclass);


--
-- Name: medical_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records ALTER COLUMN id SET DEFAULT nextval('public.medical_records_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: notification_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences ALTER COLUMN id SET DEFAULT nextval('public.notification_preferences_id_seq'::regclass);


--
-- Name: notification_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates ALTER COLUMN id SET DEFAULT nextval('public.notification_templates_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: ownership_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ownership_history ALTER COLUMN id SET DEFAULT nextval('public.ownership_history_id_seq'::regclass);


--
-- Name: ownership_transfers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ownership_transfers ALTER COLUMN id SET DEFAULT nextval('public.ownership_transfers_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);


--
-- Name: pet_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_categories ALTER COLUMN id SET DEFAULT nextval('public.pet_categories_id_seq'::regclass);


--
-- Name: pet_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_comments ALTER COLUMN id SET DEFAULT nextval('public.pet_comments_id_seq'::regclass);


--
-- Name: pet_editors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_editors ALTER COLUMN id SET DEFAULT nextval('public.pet_editors_id_seq'::regclass);


--
-- Name: pet_microchips id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_microchips ALTER COLUMN id SET DEFAULT nextval('public.pet_microchips_id_seq'::regclass);


--
-- Name: pet_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_types ALTER COLUMN id SET DEFAULT nextval('public.pet_types_id_seq'::regclass);


--
-- Name: pet_viewers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_viewers ALTER COLUMN id SET DEFAULT nextval('public.pet_viewers_id_seq'::regclass);


--
-- Name: pets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pets ALTER COLUMN id SET DEFAULT nextval('public.pets_id_seq'::regclass);


--
-- Name: placement_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_requests ALTER COLUMN id SET DEFAULT nextval('public.placement_requests_id_seq'::regclass);


--
-- Name: push_subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.push_subscriptions_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: transfer_handovers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_handovers ALTER COLUMN id SET DEFAULT nextval('public.transfer_handovers_id_seq'::regclass);


--
-- Name: transfer_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_requests ALTER COLUMN id SET DEFAULT nextval('public.transfer_requests_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vaccination_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccination_records ALTER COLUMN id SET DEFAULT nextval('public.vaccination_records_id_seq'::regclass);


--
-- Name: waitlist_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist_entries ALTER COLUMN id SET DEFAULT nextval('public.waitlist_entries_id_seq'::regclass);


--
-- Name: weight_histories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_histories ALTER COLUMN id SET DEFAULT nextval('public.weight_histories_id_seq'::regclass);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: categories categories_name_pet_type_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_pet_type_id_unique UNIQUE (name, pet_type_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_pet_type_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_pet_type_id_unique UNIQUE (slug, pet_type_id);


--
-- Name: cities cities_name_country_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_name_country_unique UNIQUE (name, country);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: cities cities_slug_country_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_slug_country_unique UNIQUE (slug, country);


--
-- Name: email_configurations email_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_configurations
    ADD CONSTRAINT email_configurations_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: foster_assignments foster_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foster_assignments
    ADD CONSTRAINT foster_assignments_pkey PRIMARY KEY (id);


--
-- Name: foster_return_handovers foster_return_handovers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foster_return_handovers
    ADD CONSTRAINT foster_return_handovers_pkey PRIMARY KEY (id);


--
-- Name: helper_profile_pet_type helper_profile_pet_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helper_profile_pet_type
    ADD CONSTRAINT helper_profile_pet_type_pkey PRIMARY KEY (helper_profile_id, pet_type_id);


--
-- Name: helper_profile_photos helper_profile_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helper_profile_photos
    ADD CONSTRAINT helper_profile_photos_pkey PRIMARY KEY (id);


--
-- Name: helper_profiles helper_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helper_profiles
    ADD CONSTRAINT helper_profiles_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_code_unique UNIQUE (code);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: media media_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_uuid_unique UNIQUE (uuid);


--
-- Name: medical_notes medical_notes_pet_id_record_date_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_notes
    ADD CONSTRAINT medical_notes_pet_id_record_date_unique UNIQUE (pet_id, record_date);


--
-- Name: medical_notes medical_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_notes
    ADD CONSTRAINT medical_notes_pkey PRIMARY KEY (id);


--
-- Name: medical_records medical_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: model_has_permissions model_has_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_permissions
    ADD CONSTRAINT model_has_permissions_pkey PRIMARY KEY (permission_id, model_id, model_type);


--
-- Name: model_has_roles model_has_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_roles
    ADD CONSTRAINT model_has_roles_pkey PRIMARY KEY (role_id, model_id, model_type);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: notification_templates notification_templates_type_channel_locale_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_type_channel_locale_unique UNIQUE (type, channel, locale);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: ownership_history ownership_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ownership_history
    ADD CONSTRAINT ownership_history_pkey PRIMARY KEY (id);


--
-- Name: ownership_transfers ownership_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ownership_transfers
    ADD CONSTRAINT ownership_transfers_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: permissions permissions_name_guard_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_guard_name_unique UNIQUE (name, guard_name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_token_unique UNIQUE (token);


--
-- Name: pet_categories pet_categories_pet_id_category_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_categories
    ADD CONSTRAINT pet_categories_pet_id_category_id_unique UNIQUE (pet_id, category_id);


--
-- Name: pet_categories pet_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_categories
    ADD CONSTRAINT pet_categories_pkey PRIMARY KEY (id);


--
-- Name: pet_comments pet_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_comments
    ADD CONSTRAINT pet_comments_pkey PRIMARY KEY (id);


--
-- Name: pet_editors pet_editors_pet_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_editors
    ADD CONSTRAINT pet_editors_pet_id_user_id_unique UNIQUE (pet_id, user_id);


--
-- Name: pet_editors pet_editors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_editors
    ADD CONSTRAINT pet_editors_pkey PRIMARY KEY (id);


--
-- Name: pet_microchips pet_microchips_chip_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_microchips
    ADD CONSTRAINT pet_microchips_chip_number_unique UNIQUE (chip_number);


--
-- Name: pet_microchips pet_microchips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_microchips
    ADD CONSTRAINT pet_microchips_pkey PRIMARY KEY (id);


--
-- Name: pet_types pet_types_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_types
    ADD CONSTRAINT pet_types_name_unique UNIQUE (name);


--
-- Name: pet_types pet_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_types
    ADD CONSTRAINT pet_types_pkey PRIMARY KEY (id);


--
-- Name: pet_types pet_types_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_types
    ADD CONSTRAINT pet_types_slug_unique UNIQUE (slug);


--
-- Name: pet_viewers pet_viewers_pet_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_viewers
    ADD CONSTRAINT pet_viewers_pet_id_user_id_unique UNIQUE (pet_id, user_id);


--
-- Name: pet_viewers pet_viewers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_viewers
    ADD CONSTRAINT pet_viewers_pkey PRIMARY KEY (id);


--
-- Name: pets pets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_pkey PRIMARY KEY (id);


--
-- Name: placement_requests placement_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_requests
    ADD CONSTRAINT placement_requests_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_endpoint_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_hash_unique UNIQUE (endpoint_hash);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: role_has_permissions role_has_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_has_permissions
    ADD CONSTRAINT role_has_permissions_pkey PRIMARY KEY (permission_id, role_id);


--
-- Name: roles roles_name_guard_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_guard_name_unique UNIQUE (name, guard_name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_unique UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: transfer_handovers transfer_handovers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_handovers
    ADD CONSTRAINT transfer_handovers_pkey PRIMARY KEY (id);


--
-- Name: transfer_requests transfer_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences unique_user_notification_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT unique_user_notification_type UNIQUE (user_id, notification_type);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_google_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_unique UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vaccination_records vaccination_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccination_records
    ADD CONSTRAINT vaccination_records_pkey PRIMARY KEY (id);


--
-- Name: vaccination_records vaccination_unique_per_pet_date; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccination_records
    ADD CONSTRAINT vaccination_unique_per_pet_date UNIQUE (pet_id, vaccine_name, administered_at);


--
-- Name: waitlist_entries waitlist_entries_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_email_unique UNIQUE (email);


--
-- Name: waitlist_entries waitlist_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_pkey PRIMARY KEY (id);


--
-- Name: weight_histories weight_histories_pet_id_record_date_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_histories
    ADD CONSTRAINT weight_histories_pet_id_record_date_unique UNIQUE (pet_id, record_date);


--
-- Name: weight_histories weight_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_histories
    ADD CONSTRAINT weight_histories_pkey PRIMARY KEY (id);


--
-- Name: categories_pet_type_id_name_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX categories_pet_type_id_name_index ON public.categories USING btree (pet_type_id, name);


--
-- Name: cities_country_name_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cities_country_name_index ON public.cities USING btree (country, name);


--
-- Name: email_logs_recipient_email_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_logs_recipient_email_created_at_index ON public.email_logs USING btree (recipient_email, created_at);


--
-- Name: email_logs_status_clicked_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_logs_status_clicked_at_index ON public.email_logs USING btree (status, clicked_at);


--
-- Name: email_logs_status_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_logs_status_created_at_index ON public.email_logs USING btree (status, created_at);


--
-- Name: email_logs_status_opened_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_logs_status_opened_at_index ON public.email_logs USING btree (status, opened_at);


--
-- Name: email_logs_user_id_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_logs_user_id_created_at_index ON public.email_logs USING btree (user_id, created_at);


--
-- Name: foster_assignments_foster_user_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX foster_assignments_foster_user_id_status_index ON public.foster_assignments USING btree (foster_user_id, status);


--
-- Name: foster_return_handovers_foster_assignment_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX foster_return_handovers_foster_assignment_id_status_index ON public.foster_return_handovers USING btree (foster_assignment_id, status);


--
-- Name: helper_profiles_city_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX helper_profiles_city_id_index ON public.helper_profiles USING btree (city_id);


--
-- Name: invitations_code_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invitations_code_status_index ON public.invitations USING btree (code, status);


--
-- Name: invitations_inviter_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invitations_inviter_user_id_index ON public.invitations USING btree (inviter_user_id);


--
-- Name: invitations_recipient_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invitations_recipient_user_id_index ON public.invitations USING btree (recipient_user_id);


--
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- Name: media_model_type_model_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_model_type_model_id_index ON public.media USING btree (model_type, model_id);


--
-- Name: media_order_column_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_order_column_index ON public.media USING btree (order_column);


--
-- Name: model_has_permissions_model_id_model_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_has_permissions_model_id_model_type_index ON public.model_has_permissions USING btree (model_id, model_type);


--
-- Name: model_has_roles_model_id_model_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_has_roles_model_id_model_type_index ON public.model_has_roles USING btree (model_id, model_type);


--
-- Name: notification_templates_type_channel_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_templates_type_channel_index ON public.notification_templates USING btree (type, channel);


--
-- Name: personal_access_tokens_tokenable_type_tokenable_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);


--
-- Name: pet_microchips_pet_id_implanted_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pet_microchips_pet_id_implanted_at_index ON public.pet_microchips USING btree (pet_id, implanted_at);


--
-- Name: pets_city_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pets_city_id_index ON public.pets USING btree (city_id);


--
-- Name: pets_pet_type_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pets_pet_type_id_status_index ON public.pets USING btree (pet_type_id, status);


--
-- Name: pets_user_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pets_user_id_status_index ON public.pets USING btree (user_id, status);


--
-- Name: push_subscriptions_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX push_subscriptions_user_id_index ON public.push_subscriptions USING btree (user_id);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: settings_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX settings_key_index ON public.settings USING btree (key);


--
-- Name: transfer_requests_placement_request_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transfer_requests_placement_request_id_index ON public.transfer_requests USING btree (placement_request_id);


--
-- Name: uniq_pending_tr_on_user_and_placement; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_pending_tr_on_user_and_placement ON public.transfer_requests USING btree (initiator_user_id, placement_request_id) WHERE ((status)::text = 'pending'::text);


--
-- Name: waitlist_entries_email_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX waitlist_entries_email_status_index ON public.waitlist_entries USING btree (email, status);


--
-- Name: email_configurations trg_email_configurations_set_is_active; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_email_configurations_set_is_active BEFORE INSERT OR UPDATE OF status ON public.email_configurations FOR EACH ROW EXECUTE FUNCTION public.email_configurations_set_is_active_from_status();


--
-- Name: email_configurations trg_email_configurations_set_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_email_configurations_set_status BEFORE UPDATE OF is_active ON public.email_configurations FOR EACH ROW EXECUTE FUNCTION public.email_configurations_set_status_from_is_active();


--
-- Name: categories categories_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: categories categories_pet_type_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pet_type_id_foreign FOREIGN KEY (pet_type_id) REFERENCES public.pet_types(id) ON DELETE CASCADE;


--
-- Name: cities cities_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: email_logs email_logs_email_configuration_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_email_configuration_id_foreign FOREIGN KEY (email_configuration_id) REFERENCES public.email_configurations(id) ON DELETE SET NULL;


--
-- Name: email_logs email_logs_notification_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_notification_id_foreign FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE SET NULL;


--
-- Name: email_logs email_logs_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: foster_assignments foster_assignments_foster_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foster_assignments
    ADD CONSTRAINT foster_assignments_foster_user_id_foreign FOREIGN KEY (foster_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: foster_assignments foster_assignments_owner_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foster_assignments
    ADD CONSTRAINT foster_assignments_owner_user_id_foreign FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: foster_assignments foster_assignments_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foster_assignments
    ADD CONSTRAINT foster_assignments_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: foster_assignments foster_assignments_transfer_request_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foster_assignments
    ADD CONSTRAINT foster_assignments_transfer_request_id_foreign FOREIGN KEY (transfer_request_id) REFERENCES public.transfer_requests(id) ON DELETE SET NULL;


--
-- Name: foster_return_handovers foster_return_handovers_foster_assignment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foster_return_handovers
    ADD CONSTRAINT foster_return_handovers_foster_assignment_id_foreign FOREIGN KEY (foster_assignment_id) REFERENCES public.foster_assignments(id) ON DELETE CASCADE;


--
-- Name: foster_return_handovers foster_return_handovers_foster_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foster_return_handovers
    ADD CONSTRAINT foster_return_handovers_foster_user_id_foreign FOREIGN KEY (foster_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: foster_return_handovers foster_return_handovers_owner_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foster_return_handovers
    ADD CONSTRAINT foster_return_handovers_owner_user_id_foreign FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: helper_profile_pet_type helper_profile_pet_type_helper_profile_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helper_profile_pet_type
    ADD CONSTRAINT helper_profile_pet_type_helper_profile_id_foreign FOREIGN KEY (helper_profile_id) REFERENCES public.helper_profiles(id) ON DELETE CASCADE;


--
-- Name: helper_profile_pet_type helper_profile_pet_type_pet_type_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helper_profile_pet_type
    ADD CONSTRAINT helper_profile_pet_type_pet_type_id_foreign FOREIGN KEY (pet_type_id) REFERENCES public.pet_types(id) ON DELETE CASCADE;


--
-- Name: helper_profile_photos helper_profile_photos_helper_profile_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helper_profile_photos
    ADD CONSTRAINT helper_profile_photos_helper_profile_id_foreign FOREIGN KEY (helper_profile_id) REFERENCES public.helper_profiles(id) ON DELETE CASCADE;


--
-- Name: helper_profiles helper_profiles_city_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helper_profiles
    ADD CONSTRAINT helper_profiles_city_id_foreign FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE RESTRICT;


--
-- Name: helper_profiles helper_profiles_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helper_profiles
    ADD CONSTRAINT helper_profiles_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_inviter_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_inviter_user_id_foreign FOREIGN KEY (inviter_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_recipient_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_recipient_user_id_foreign FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: medical_notes medical_notes_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_notes
    ADD CONSTRAINT medical_notes_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: medical_records medical_records_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: messages messages_recipient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_recipient_id_foreign FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_foreign FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: model_has_permissions model_has_permissions_permission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_permissions
    ADD CONSTRAINT model_has_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: model_has_roles model_has_roles_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_roles
    ADD CONSTRAINT model_has_roles_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notification_templates notification_templates_updated_by_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_updated_by_user_id_foreign FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ownership_history ownership_history_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ownership_history
    ADD CONSTRAINT ownership_history_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: ownership_history ownership_history_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ownership_history
    ADD CONSTRAINT ownership_history_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ownership_transfers ownership_transfers_from_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ownership_transfers
    ADD CONSTRAINT ownership_transfers_from_user_id_foreign FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ownership_transfers ownership_transfers_to_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ownership_transfers
    ADD CONSTRAINT ownership_transfers_to_user_id_foreign FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ownership_transfers ownership_transfers_transfer_request_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ownership_transfers
    ADD CONSTRAINT ownership_transfers_transfer_request_id_foreign FOREIGN KEY (transfer_request_id) REFERENCES public.transfer_requests(id) ON DELETE SET NULL;


--
-- Name: pet_categories pet_categories_category_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_categories
    ADD CONSTRAINT pet_categories_category_id_foreign FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: pet_categories pet_categories_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_categories
    ADD CONSTRAINT pet_categories_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_comments pet_comments_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_comments
    ADD CONSTRAINT pet_comments_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_comments pet_comments_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_comments
    ADD CONSTRAINT pet_comments_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pet_editors pet_editors_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_editors
    ADD CONSTRAINT pet_editors_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_editors pet_editors_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_editors
    ADD CONSTRAINT pet_editors_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pet_microchips pet_microchips_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_microchips
    ADD CONSTRAINT pet_microchips_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_viewers pet_viewers_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_viewers
    ADD CONSTRAINT pet_viewers_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_viewers pet_viewers_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_viewers
    ADD CONSTRAINT pet_viewers_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pets pets_city_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_city_id_foreign FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE RESTRICT;


--
-- Name: pets pets_pet_type_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_pet_type_id_foreign FOREIGN KEY (pet_type_id) REFERENCES public.pet_types(id) ON DELETE RESTRICT;


--
-- Name: pets pets_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: placement_requests placement_requests_fulfilled_by_transfer_request_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_requests
    ADD CONSTRAINT placement_requests_fulfilled_by_transfer_request_id_foreign FOREIGN KEY (fulfilled_by_transfer_request_id) REFERENCES public.transfer_requests(id) ON DELETE SET NULL;


--
-- Name: placement_requests placement_requests_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_requests
    ADD CONSTRAINT placement_requests_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: placement_requests placement_requests_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_requests
    ADD CONSTRAINT placement_requests_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_moderated_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_moderated_by_foreign FOREIGN KEY (moderated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_reviewed_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewed_user_id_foreign FOREIGN KEY (reviewed_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_reviewer_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_user_id_foreign FOREIGN KEY (reviewer_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_transfer_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_transfer_id_foreign FOREIGN KEY (transfer_id) REFERENCES public.transfer_requests(id) ON DELETE SET NULL;


--
-- Name: role_has_permissions role_has_permissions_permission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_has_permissions
    ADD CONSTRAINT role_has_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_has_permissions role_has_permissions_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_has_permissions
    ADD CONSTRAINT role_has_permissions_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: transfer_handovers transfer_handovers_helper_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_handovers
    ADD CONSTRAINT transfer_handovers_helper_user_id_foreign FOREIGN KEY (helper_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: transfer_handovers transfer_handovers_owner_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_handovers
    ADD CONSTRAINT transfer_handovers_owner_user_id_foreign FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: transfer_handovers transfer_handovers_transfer_request_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_handovers
    ADD CONSTRAINT transfer_handovers_transfer_request_id_foreign FOREIGN KEY (transfer_request_id) REFERENCES public.transfer_requests(id) ON DELETE CASCADE;


--
-- Name: transfer_requests transfer_requests_helper_profile_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_helper_profile_id_foreign FOREIGN KEY (helper_profile_id) REFERENCES public.helper_profiles(id) ON DELETE CASCADE;


--
-- Name: transfer_requests transfer_requests_initiator_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_initiator_user_id_foreign FOREIGN KEY (initiator_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: transfer_requests transfer_requests_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: transfer_requests transfer_requests_placement_request_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_placement_request_id_foreign FOREIGN KEY (placement_request_id) REFERENCES public.placement_requests(id) ON DELETE SET NULL;


--
-- Name: transfer_requests transfer_requests_recipient_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_recipient_user_id_foreign FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: transfer_requests transfer_requests_requester_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_requester_id_foreign FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: vaccination_records vaccination_records_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccination_records
    ADD CONSTRAINT vaccination_records_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict udDNm9EOTo84bYUMtp2FeembWo9iDbYaTgGz9Pmr1LuzQuccnbazhhQr0JY0kwy

--
-- PostgreSQL database dump
--

\restrict dV4oP2EK3WIbGUiLijfXYoNhcpYwtQBDYfTXQfls2rrA08bHfUMBPDsBo59zLxY

-- Dumped from database version 14.19
-- Dumped by pg_dump version 17.6 (Debian 17.6-0+deb13u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.migrations (id, migration, batch) FROM stdin;
1	0001_01_01_000000_create_users_table	1
2	0001_01_01_000001_create_cache_table	1
3	0001_01_01_000002_create_jobs_table	1
4	2025_07_09_180107_create_cats_table	1
5	2025_07_09_184459_add_role_to_users_table	1
6	2025_07_09_185144_create_helper_profiles_table	1
7	2025_07_09_185633_create_transfer_requests_table	1
8	2025_07_09_185928_create_medical_records_table	1
9	2025_07_09_190100_create_weight_histories_table	1
10	2025_07_09_190330_create_reviews_table	1
11	2025_07_10_093557_create_cat_comments_table	1
12	2025_07_10_162215_create_personal_access_tokens_table	1
13	2025_07_13_145900_create_notifications_table	1
14	2025_07_15_182619_add_avatar_url_to_users_table	1
15	2025_07_15_184406_create_cat_photos_table	1
16	2025_07_15_185953_update_cats_table_add_status_and_birthday	1
17	2025_07_15_190904_add_fostering_details_to_transfer_requests_table	1
18	2025_07_15_193043_create_messages_table	1
19	2025_07_16_180121_create_permission_tables	1
20	2025_07_18_155743_update_cats_status_default	1
21	2025_07_18_161717_update_existing_cat_statuses	1
22	2025_07_24_164530_create_placement_requests_table	1
23	2025_07_24_170000_add_fk_to_transfer_requests_table	1
24	2025_08_04_190450_create_helper_profile_photos_table	1
25	2025_08_07_182035_add_placement_request_id_to_transfer_requests_table	1
26	2025_08_07_183139_add_helper_profile_id_to_transfer_requests_table	1
27	2025_08_07_183338_add_requester_id_to_transfer_requests_table	1
28	2025_08_09_000001_add_fulfillment_fields_to_placement_requests_table	1
29	2025_08_09_000002_create_foster_assignments_table	1
30	2025_08_09_000003_add_unique_pending_transfer_requests_index	1
31	2025_08_11_000000_create_ownership_history_table	1
32	2025_08_11_120000_create_transfer_handovers_table	1
33	2025_08_12_000003_create_foster_return_handovers_table	1
34	2025_08_16_102043_add_suspended_status_to_helper_profiles_approval_status	1
35	2025_08_16_121616_add_moderation_fields_to_reviews_table	1
36	2025_08_16_141254_remove_zip_code_from_helper_profiles_table	1
37	2025_08_16_150500_add_is_public_to_helper_profiles_table	1
38	2025_08_16_180528_add_delivery_tracking_to_notifications_table	1
39	2025_08_18_120000_remove_role_column_from_users_table	1
40	2025_08_18_153543_create_notification_preferences_table	1
41	2025_08_18_153605_create_email_configurations_table	1
42	2025_08_18_202019_set_default_notification_preferences_for_existing_users	1
43	2025_08_26_182813_create_ownership_transfers_table	1
44	2025_09_23_174226_add_name_description_to_email_configurations_table	1
45	2025_09_23_174449_create_email_logs_table	1
46	2025_09_24_163813_create_pet_types_table	1
47	2025_09_24_163923_create_pets_table	1
48	2025_09_24_164027_create_pet_photos_table	1
49	2025_09_24_164102_create_pet_comments_table	1
50	2025_09_24_171107_update_foster_assignments_table_for_pets	1
51	2025_09_24_171113_update_transfer_requests_table_for_pets	1
52	2025_09_24_171120_update_placement_requests_table_for_pets	1
53	2025_09_24_171126_update_ownership_history_table_for_pets	1
54	2025_09_25_120000_drop_legacy_cat_schema	1
55	2025_09_25_145233_add_placement_requests_allowed_to_pet_types_table	1
56	2025_09_25_145616_create_helper_profile_pet_type_table	1
57	2025_09_26_120000_create_weight_histories_table_for_pets	1
58	2025_09_27_120000_add_weight_tracking_allowed_to_pet_types	1
59	2025_09_27_140000_create_medical_notes_table	1
60	2025_09_27_170000_create_vaccination_records_table	1
61	2025_09_27_200000_create_pet_microchips_table	1
62	2025_09_27_210000_add_microchips_allowed_to_pet_types	1
63	2025_10_04_000001_add_birthday_precision_columns_to_pets_table	2
64	2025_10_04_182732_create_settings_table	2
65	2025_10_04_182739_create_invitations_table	2
66	2025_10_04_182746_create_waitlist_entries_table	2
67	2025_10_11_175433_add_soft_deletes_to_models	2
68	2025_10_11_175755_add_soft_deletes_to_models	2
69	2025_10_12_000000_create_notification_templates_table	2
70	2025_10_16_172921_remove_is_read_from_notifications_table	2
71	2025_10_16_173902_remove_is_active_from_placement_requests_table	2
72	2025_10_16_174521_add_status_to_pet_types_table	2
73	2025_10_16_174953_remove_is_active_from_pet_types_table	2
74	2025_10_16_175505_add_status_to_email_configurations_table	2
75	2025_10_16_180118_remove_is_active_from_email_configurations_table	2
76	2025_10_17_000001_add_is_active_bridge_to_email_configurations	2
77	2025_10_17_000002_add_is_active_bridge_to_placement_requests	2
78	2025_10_17_000003_make_is_active_writable_and_triggers	2
79	2025_10_18_154014_create_media_table	2
80	2025_10_18_160804_drop_avatar_url_from_users_table	2
81	2025_10_18_160838_drop_pet_photos_table	2
82	2025_10_19_182602_add_two_factor_columns_to_users_table	2
83	2025_11_07_000000_add_email_event_tracking_to_email_logs_table	2
84	2025_11_12_183435_create_push_subscriptions_table	2
85	2025_11_29_180139_add_completed_at_to_vaccination_records_table	2
86	2025_12_01_120656_add_pet_id_to_medical_records_table	2
87	2025_12_02_162604_replace_location_with_structured_fields_in_pets_table	2
88	2025_12_02_162910_update_helper_profiles_location_fields_optional	2
89	2025_12_04_000001_create_categories_table	2
90	2025_12_04_000002_create_pet_categories_table	2
91	2025_12_04_144904_add_gender_to_pets_table	2
92	2025_12_04_200000_remove_breed_from_pets_table	2
93	2025_12_07_190129_add_contact_info_to_helper_profiles_table	2
94	2025_12_07_192557_drop_is_active_from_placement_requests	2
95	2025_12_08_161631_update_helper_profiles_remove_is_public_add_request_types	2
96	2025_12_09_000001_add_canceled_expired_to_transfer_requests_status	2
97	2025_12_09_000001_create_pet_viewers_table	2
98	2025_12_09_000002_create_pet_editors_table	2
99	2025_12_10_000001_create_cities_table	2
100	2025_12_10_000002_backfill_cities_and_assign_ids	2
101	2025_12_11_000003_add_google_oauth_to_users_table	2
102	2025_12_11_205026_change_google_avatar_to_text	2
103	2025_12_11_205030_change_google_avatar_to_text	2
104	2025_12_12_000001_drop_google_avatar_from_users_table	2
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 104, true);


--
-- PostgreSQL database dump complete
--

\unrestrict dV4oP2EK3WIbGUiLijfXYoNhcpYwtQBDYfTXQfls2rrA08bHfUMBPDsBo59zLxY

