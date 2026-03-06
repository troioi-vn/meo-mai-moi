--
-- PostgreSQL database dump
--

\restrict Zt2G5bJMhpMSV2gzILRegWznO2rWBtOEmcERLhSVTMCRPHjgXmmwfagrK6wiqEg

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

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
-- Name: api_request_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_request_logs (
    id bigint NOT NULL,
    user_id bigint,
    method character varying(10) NOT NULL,
    path character varying(255) NOT NULL,
    route_uri character varying(255),
    status_code smallint NOT NULL,
    auth_mode character varying(20) DEFAULT 'none'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: api_request_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_request_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_request_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_request_logs_id_seq OWNED BY public.api_request_logs.id;


--
-- Name: api_token_revocation_audits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_token_revocation_audits (
    id bigint NOT NULL,
    actor_user_id bigint,
    target_user_id bigint,
    token_id bigint,
    token_name character varying(255) NOT NULL,
    tokenable_type character varying(255),
    tokenable_id bigint,
    token_abilities json,
    token_last_used_at timestamp(0) with time zone,
    source character varying(50) DEFAULT 'admin_panel'::character varying NOT NULL,
    actor_name character varying(255),
    actor_email character varying(255),
    target_name character varying(255),
    target_email character varying(255),
    metadata json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: api_token_revocation_audits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_token_revocation_audits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_token_revocation_audits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_token_revocation_audits_id_seq OWNED BY public.api_token_revocation_audits.id;


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
    slug character varying(60) NOT NULL,
    pet_type_id bigint NOT NULL,
    description text,
    created_by bigint,
    approved_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    name jsonb
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
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id bigint NOT NULL,
    chat_id bigint NOT NULL,
    sender_id bigint NOT NULL,
    type character varying(255) DEFAULT 'text'::character varying NOT NULL,
    content text NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


--
-- Name: chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_messages_id_seq OWNED BY public.chat_messages.id;


--
-- Name: chat_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_users (
    id bigint NOT NULL,
    chat_id bigint NOT NULL,
    user_id bigint NOT NULL,
    role character varying(255) DEFAULT 'member'::character varying NOT NULL,
    joined_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    left_at timestamp(0) without time zone,
    last_read_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    last_email_digest_at timestamp(0) without time zone
);


--
-- Name: chat_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_users_id_seq OWNED BY public.chat_users.id;


--
-- Name: chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chats (
    id bigint NOT NULL,
    type character varying(255) DEFAULT 'direct'::character varying NOT NULL,
    contextable_type character varying(255),
    contextable_id bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


--
-- Name: chats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chats_id_seq OWNED BY public.chats.id;


--
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cities (
    id bigint NOT NULL,
    slug character varying(120) NOT NULL,
    country character varying(2) NOT NULL,
    description text,
    created_by bigint,
    approved_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    name jsonb
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
-- Name: countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.countries (
    id bigint NOT NULL,
    code character varying(2) NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    phone_prefix character varying(8)
);


--
-- Name: countries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.countries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: countries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.countries_id_seq OWNED BY public.countries.id;


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
-- Name: helper_profile_city; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.helper_profile_city (
    id bigint NOT NULL,
    helper_profile_id bigint NOT NULL,
    city_id bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: helper_profile_city_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.helper_profile_city_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: helper_profile_city_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.helper_profile_city_id_seq OWNED BY public.helper_profile_city.id;


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
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    archived_at timestamp(0) without time zone,
    restored_at timestamp(0) without time zone,
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
    updated_at timestamp(0) without time zone,
    email character varying(255)
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
-- Name: medical_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_records (
    id bigint NOT NULL,
    record_type character varying(255) NOT NULL,
    description text,
    record_date date NOT NULL,
    vet_name character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    pet_id bigint NOT NULL
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
-- Name: message_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_reads (
    message_id bigint NOT NULL,
    user_id bigint NOT NULL,
    read_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


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
    updated_at timestamp(0) without time zone,
    telegram_enabled boolean DEFAULT false NOT NULL
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
    CONSTRAINT notification_templates_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
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
    failure_reason text,
    is_read boolean DEFAULT false NOT NULL
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
-- Name: pet_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_relationships (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    pet_id bigint NOT NULL,
    relationship_type character varying(255) NOT NULL,
    start_at timestamp(0) with time zone NOT NULL,
    end_at timestamp(0) with time zone,
    created_by bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT pet_relationships_end_at_gte_start_at CHECK (((end_at IS NULL) OR (end_at >= start_at))),
    CONSTRAINT pet_relationships_relationship_type_check CHECK (((relationship_type)::text = ANY ((ARRAY['owner'::character varying, 'foster'::character varying, 'sitter'::character varying, 'editor'::character varying, 'viewer'::character varying])::text[])))
);


--
-- Name: pet_relationships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pet_relationships_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pet_relationships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pet_relationships_id_seq OWNED BY public.pet_relationships.id;


--
-- Name: pet_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_types (
    id bigint NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    is_system boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    placement_requests_allowed boolean DEFAULT false NOT NULL,
    weight_tracking_allowed boolean DEFAULT false NOT NULL,
    microchips_allowed boolean DEFAULT false NOT NULL,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    name jsonb
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
-- Name: pets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pets (
    id bigint NOT NULL,
    pet_type_id bigint NOT NULL,
    created_by bigint CONSTRAINT pets_user_id_not_null NOT NULL,
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
    CONSTRAINT pets_birthday_precision_check CHECK (((birthday_precision)::text = ANY (ARRAY[('day'::character varying)::text, ('month'::character varying)::text, ('year'::character varying)::text, ('unknown'::character varying)::text]))),
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
-- Name: placement_request_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.placement_request_responses (
    id bigint NOT NULL,
    placement_request_id bigint NOT NULL,
    helper_profile_id bigint NOT NULL,
    status character varying(255) DEFAULT 'responded'::character varying NOT NULL,
    responded_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    accepted_at timestamp(0) without time zone,
    rejected_at timestamp(0) without time zone,
    cancelled_at timestamp(0) without time zone,
    message text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


--
-- Name: placement_request_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.placement_request_responses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: placement_request_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.placement_request_responses_id_seq OWNED BY public.placement_request_responses.id;


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
-- Name: relationship_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relationship_invitations (
    id bigint NOT NULL,
    pet_id bigint NOT NULL,
    invited_by_user_id bigint NOT NULL,
    token character varying(64) NOT NULL,
    relationship_type character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    expires_at timestamp(0) with time zone NOT NULL,
    accepted_at timestamp(0) with time zone,
    declined_at timestamp(0) with time zone,
    revoked_at timestamp(0) with time zone,
    accepted_by_user_id bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT relationship_invitations_relationship_type_check CHECK (((relationship_type)::text = ANY ((ARRAY['owner'::character varying, 'editor'::character varying, 'viewer'::character varying])::text[]))),
    CONSTRAINT relationship_invitations_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying, 'revoked'::character varying, 'expired'::character varying])::text[])))
);


--
-- Name: relationship_invitations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.relationship_invitations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: relationship_invitations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.relationship_invitations_id_seq OWNED BY public.relationship_invitations.id;


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
-- Name: transfer_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transfer_requests (
    id bigint NOT NULL,
    from_user_id bigint CONSTRAINT transfer_requests_initiator_user_id_not_null NOT NULL,
    to_user_id bigint CONSTRAINT transfer_requests_recipient_user_id_not_null NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    placement_request_id bigint,
    confirmed_at timestamp(0) without time zone,
    rejected_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    placement_request_response_id bigint,
    CONSTRAINT transfer_requests_status_check CHECK (((status)::text = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text, 'expired'::text, 'canceled'::text])))
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
    google_refresh_token text,
    is_banned boolean DEFAULT false NOT NULL,
    banned_at timestamp(0) without time zone,
    ban_reason character varying(255),
    locale character varying(5) DEFAULT 'en'::character varying NOT NULL,
    telegram_chat_id character varying(255),
    telegram_link_token character varying(64),
    telegram_link_token_expires_at timestamp(0) without time zone,
    telegram_user_id bigint,
    telegram_username character varying(255),
    telegram_first_name character varying(255),
    telegram_last_name character varying(255),
    telegram_photo_url text,
    telegram_last_authenticated_at timestamp(0) without time zone,
    registered_via_gpt boolean DEFAULT false NOT NULL
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
    updated_at timestamp(0) without time zone,
    locale character varying(5)
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
-- Name: api_request_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_request_logs ALTER COLUMN id SET DEFAULT nextval('public.api_request_logs_id_seq'::regclass);


--
-- Name: api_token_revocation_audits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_token_revocation_audits ALTER COLUMN id SET DEFAULT nextval('public.api_token_revocation_audits_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: chat_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages ALTER COLUMN id SET DEFAULT nextval('public.chat_messages_id_seq'::regclass);


--
-- Name: chat_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_users ALTER COLUMN id SET DEFAULT nextval('public.chat_users_id_seq'::regclass);


--
-- Name: chats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats ALTER COLUMN id SET DEFAULT nextval('public.chats_id_seq'::regclass);


--
-- Name: cities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities ALTER COLUMN id SET DEFAULT nextval('public.cities_id_seq'::regclass);


--
-- Name: countries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries ALTER COLUMN id SET DEFAULT nextval('public.countries_id_seq'::regclass);


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
-- Name: helper_profile_city id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helper_profile_city ALTER COLUMN id SET DEFAULT nextval('public.helper_profile_city_id_seq'::regclass);


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
-- Name: pet_microchips id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_microchips ALTER COLUMN id SET DEFAULT nextval('public.pet_microchips_id_seq'::regclass);


--
-- Name: pet_relationships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_relationships ALTER COLUMN id SET DEFAULT nextval('public.pet_relationships_id_seq'::regclass);


--
-- Name: pet_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_types ALTER COLUMN id SET DEFAULT nextval('public.pet_types_id_seq'::regclass);


--
-- Name: pets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pets ALTER COLUMN id SET DEFAULT nextval('public.pets_id_seq'::regclass);


--
-- Name: placement_request_responses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_request_responses ALTER COLUMN id SET DEFAULT nextval('public.placement_request_responses_id_seq'::regclass);


--
-- Name: placement_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_requests ALTER COLUMN id SET DEFAULT nextval('public.placement_requests_id_seq'::regclass);


--
-- Name: push_subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.push_subscriptions_id_seq'::regclass);


--
-- Name: relationship_invitations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship_invitations ALTER COLUMN id SET DEFAULT nextval('public.relationship_invitations_id_seq'::regclass);


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
-- Name: api_request_logs api_request_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_request_logs
    ADD CONSTRAINT api_request_logs_pkey PRIMARY KEY (id);


--
-- Name: api_token_revocation_audits api_token_revocation_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_token_revocation_audits
    ADD CONSTRAINT api_token_revocation_audits_pkey PRIMARY KEY (id);


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
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_users chat_users_chat_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_users
    ADD CONSTRAINT chat_users_chat_id_user_id_unique UNIQUE (chat_id, user_id);


--
-- Name: chat_users chat_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_users
    ADD CONSTRAINT chat_users_pkey PRIMARY KEY (id);


--
-- Name: chats chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);


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
-- Name: countries countries_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_code_unique UNIQUE (code);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


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
-- Name: helper_profile_city helper_profile_city_helper_profile_id_city_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helper_profile_city
    ADD CONSTRAINT helper_profile_city_helper_profile_id_city_id_unique UNIQUE (helper_profile_id, city_id);


--
-- Name: helper_profile_city helper_profile_city_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helper_profile_city
    ADD CONSTRAINT helper_profile_city_pkey PRIMARY KEY (id);


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
-- Name: medical_records medical_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_pkey PRIMARY KEY (id);


--
-- Name: message_reads message_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT message_reads_pkey PRIMARY KEY (message_id, user_id);


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
-- Name: pet_relationships pet_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_relationships
    ADD CONSTRAINT pet_relationships_pkey PRIMARY KEY (id);


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
-- Name: pets pets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_pkey PRIMARY KEY (id);


--
-- Name: placement_request_responses placement_request_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_request_responses
    ADD CONSTRAINT placement_request_responses_pkey PRIMARY KEY (id);


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
-- Name: relationship_invitations relationship_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship_invitations
    ADD CONSTRAINT relationship_invitations_pkey PRIMARY KEY (id);


--
-- Name: relationship_invitations relationship_invitations_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship_invitations
    ADD CONSTRAINT relationship_invitations_token_unique UNIQUE (token);


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
-- Name: users users_telegram_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_telegram_user_id_unique UNIQUE (telegram_user_id);


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
-- Name: api_request_logs_auth_mode_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX api_request_logs_auth_mode_index ON public.api_request_logs USING btree (auth_mode);


--
-- Name: api_request_logs_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX api_request_logs_created_at_index ON public.api_request_logs USING btree (created_at);


--
-- Name: api_request_logs_route_uri_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX api_request_logs_route_uri_index ON public.api_request_logs USING btree (route_uri);


--
-- Name: api_request_logs_status_code_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX api_request_logs_status_code_index ON public.api_request_logs USING btree (status_code);


--
-- Name: api_token_revocation_audits_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX api_token_revocation_audits_created_at_index ON public.api_token_revocation_audits USING btree (created_at);


--
-- Name: api_token_revocation_audits_source_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX api_token_revocation_audits_source_index ON public.api_token_revocation_audits USING btree (source);


--
-- Name: api_token_revocation_audits_token_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX api_token_revocation_audits_token_id_index ON public.api_token_revocation_audits USING btree (token_id);


--
-- Name: chat_messages_chat_id_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_messages_chat_id_created_at_index ON public.chat_messages USING btree (chat_id, created_at);


--
-- Name: chat_messages_sender_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_messages_sender_id_index ON public.chat_messages USING btree (sender_id);


--
-- Name: chat_users_user_id_left_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_users_user_id_left_at_index ON public.chat_users USING btree (user_id, left_at);


--
-- Name: chats_contextable_type_contextable_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chats_contextable_type_contextable_id_index ON public.chats USING btree (contextable_type, contextable_id);


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
-- Name: message_reads_user_id_read_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_reads_user_id_read_at_index ON public.message_reads USING btree (user_id, read_at);


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
-- Name: pet_relationships_pet_id_relationship_type_end_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pet_relationships_pet_id_relationship_type_end_at_index ON public.pet_relationships USING btree (pet_id, relationship_type, end_at);


--
-- Name: pet_relationships_pet_id_user_id_relationship_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pet_relationships_pet_id_user_id_relationship_type_index ON public.pet_relationships USING btree (pet_id, user_id, relationship_type);


--
-- Name: pet_relationships_unique_active_pet_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pet_relationships_unique_active_pet_user_type ON public.pet_relationships USING btree (pet_id, user_id, relationship_type) WHERE (end_at IS NULL);


--
-- Name: pet_relationships_user_id_relationship_type_end_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pet_relationships_user_id_relationship_type_end_at_index ON public.pet_relationships USING btree (user_id, relationship_type, end_at);


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

CREATE INDEX pets_user_id_status_index ON public.pets USING btree (created_by, status);


--
-- Name: placement_request_responses_helper_profile_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX placement_request_responses_helper_profile_id_status_index ON public.placement_request_responses USING btree (helper_profile_id, status);


--
-- Name: placement_request_responses_placement_request_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX placement_request_responses_placement_request_id_status_index ON public.placement_request_responses USING btree (placement_request_id, status);


--
-- Name: push_subscriptions_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX push_subscriptions_user_id_index ON public.push_subscriptions USING btree (user_id);


--
-- Name: relationship_invitations_pet_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX relationship_invitations_pet_id_status_index ON public.relationship_invitations USING btree (pet_id, status);


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

CREATE UNIQUE INDEX uniq_pending_tr_on_user_and_placement ON public.transfer_requests USING btree (from_user_id, placement_request_id) WHERE ((status)::text = 'pending'::text);


--
-- Name: users_telegram_chat_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_telegram_chat_id_index ON public.users USING btree (telegram_chat_id);


--
-- Name: users_telegram_link_token_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_telegram_link_token_index ON public.users USING btree (telegram_link_token);


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
-- Name: api_request_logs api_request_logs_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_request_logs
    ADD CONSTRAINT api_request_logs_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: api_token_revocation_audits api_token_revocation_audits_actor_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_token_revocation_audits
    ADD CONSTRAINT api_token_revocation_audits_actor_user_id_foreign FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: api_token_revocation_audits api_token_revocation_audits_target_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_token_revocation_audits
    ADD CONSTRAINT api_token_revocation_audits_target_user_id_foreign FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


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
-- Name: chat_messages chat_messages_chat_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_chat_id_foreign FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_sender_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_foreign FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_users chat_users_chat_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_users
    ADD CONSTRAINT chat_users_chat_id_foreign FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: chat_users chat_users_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_users
    ADD CONSTRAINT chat_users_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


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
-- Name: helper_profile_city helper_profile_city_city_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helper_profile_city
    ADD CONSTRAINT helper_profile_city_city_id_foreign FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE CASCADE;


--
-- Name: helper_profile_city helper_profile_city_helper_profile_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helper_profile_city
    ADD CONSTRAINT helper_profile_city_helper_profile_id_foreign FOREIGN KEY (helper_profile_id) REFERENCES public.helper_profiles(id) ON DELETE CASCADE;


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
-- Name: medical_records medical_records_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: message_reads message_reads_message_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT message_reads_message_id_foreign FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- Name: message_reads message_reads_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT message_reads_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


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
-- Name: pet_microchips pet_microchips_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_microchips
    ADD CONSTRAINT pet_microchips_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_relationships pet_relationships_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_relationships
    ADD CONSTRAINT pet_relationships_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pet_relationships pet_relationships_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_relationships
    ADD CONSTRAINT pet_relationships_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_relationships pet_relationships_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_relationships
    ADD CONSTRAINT pet_relationships_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


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
    ADD CONSTRAINT pets_user_id_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: placement_request_responses placement_request_responses_helper_profile_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_request_responses
    ADD CONSTRAINT placement_request_responses_helper_profile_id_foreign FOREIGN KEY (helper_profile_id) REFERENCES public.helper_profiles(id) ON DELETE CASCADE;


--
-- Name: placement_request_responses placement_request_responses_placement_request_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_request_responses
    ADD CONSTRAINT placement_request_responses_placement_request_id_foreign FOREIGN KEY (placement_request_id) REFERENCES public.placement_requests(id) ON DELETE CASCADE;


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
-- Name: relationship_invitations relationship_invitations_accepted_by_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship_invitations
    ADD CONSTRAINT relationship_invitations_accepted_by_user_id_foreign FOREIGN KEY (accepted_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: relationship_invitations relationship_invitations_invited_by_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship_invitations
    ADD CONSTRAINT relationship_invitations_invited_by_user_id_foreign FOREIGN KEY (invited_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: relationship_invitations relationship_invitations_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship_invitations
    ADD CONSTRAINT relationship_invitations_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


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
-- Name: transfer_requests transfer_requests_initiator_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_initiator_user_id_foreign FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: transfer_requests transfer_requests_placement_request_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_placement_request_id_foreign FOREIGN KEY (placement_request_id) REFERENCES public.placement_requests(id) ON DELETE SET NULL;


--
-- Name: transfer_requests transfer_requests_placement_request_response_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_placement_request_response_id_foreign FOREIGN KEY (placement_request_response_id) REFERENCES public.placement_request_responses(id) ON DELETE SET NULL;


--
-- Name: transfer_requests transfer_requests_recipient_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_recipient_user_id_foreign FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: vaccination_records vaccination_records_pet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccination_records
    ADD CONSTRAINT vaccination_records_pet_id_foreign FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Zt2G5bJMhpMSV2gzILRegWznO2rWBtOEmcERLhSVTMCRPHjgXmmwfagrK6wiqEg

--
-- PostgreSQL database dump
--

\restrict 4RIje6SigR9CtM076q34bCXqWWLMHYbXl2eJgewYAiomcKoinm0AHRRYg5tBzsf

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

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
105	2025_12_25_173749_add_status_and_timestamps_to_helper_profiles_table	3
106	2025_12_27_000000_create_helper_profile_city_table	3
107	2025_12_30_180248_create_chats_table	3
108	2025_12_30_180254_create_chat_messages_table	3
109	2025_12_30_180254_create_chat_users_table	3
110	2025_12_30_180254_create_message_reads_table	3
111	2026_01_01_164037_create_pet_relationships_table	3
112	2026_01_01_164101_refactor_pets_table_ownership	3
113	2026_01_01_164131_migrate_existing_pet_ownership_data	3
114	2026_01_01_164351_drop_old_pet_pivot_tables	3
115	2026_01_01_173023_drop_ownership_history_table	3
116	2026_01_01_204744_fix_pet_relationships_columns_names	3
117	2026_01_03_090546_drop_rehoming_flow_tables	3
118	2026_01_03_095600_create_placement_request_responses_table	3
119	2026_01_03_095800_remove_obsolete_columns_from_transfer_requests	3
120	2026_01_03_120002_add_placement_request_response_id_to_transfer_requests_table	3
121	2026_01_03_150000_refactor_transfer_requests_for_placement_flow	3
122	2026_01_07_000000_create_sessions_table	3
123	2026_01_22_000000_add_is_read_to_notifications_table	3
124	2026_01_25_000000_add_ban_fields_to_users_table	3
125	2026_01_28_183635_drop_medical_notes_table	3
126	2026_01_30_014920_drop_attachment_url_from_medical_records	3
127	2026_01_30_182044_remove_record_type_check_constraint_from_medical_records	3
128	2026_01_30_194043_add_locale_to_users_table	3
129	2026_02_02_160533_make_name_translatable_on_pet_types_categories_cities	3
130	2026_02_06_183711_make_medical_records_description_nullable	3
131	2026_02_10_000000_add_email_to_invitations_table	3
132	2026_02_10_000001_add_locale_to_waitlist_entries_table	3
133	2026_02_10_184112_add_last_email_digest_at_to_chat_users_table	3
134	2026_02_13_000000_create_relationship_invitations_table	3
135	2026_02_16_000000_add_telegram_support	3
136	2026_02_16_010000_add_telegram_mini_app_identity_to_users_table	3
137	2026_02_18_000000_create_countries_table	3
138	2026_02_20_000000_add_phone_prefix_to_countries_table	3
139	2026_02_23_000000_add_registered_via_gpt_to_users_table	3
140	2026_03_06_040000_create_api_request_logs_table	4
141	2026_03_06_120000_create_api_token_revocation_audits_table	5
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 141, true);


--
-- PostgreSQL database dump complete
--

\unrestrict 4RIje6SigR9CtM076q34bCXqWWLMHYbXl2eJgewYAiomcKoinm0AHRRYg5tBzsf

