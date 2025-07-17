--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

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
-- Name: update_instructor_pay_rates_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_instructor_pay_rates_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_instructor_pay_rates_updated_at() OWNER TO postgres;

--
-- Name: update_organization_pricing_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_organization_pricing_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_organization_pricing_updated_at() OWNER TO postgres;

--
-- Name: update_payment_requests_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_payment_requests_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_payment_requests_updated_at() OWNER TO postgres;

--
-- Name: update_payroll_payments_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_payroll_payments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_payroll_payments_updated_at() OWNER TO postgres;

--
-- Name: update_timesheets_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_timesheets_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_timesheets_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(255) NOT NULL,
    details text,
    ip_address character varying(45),
    user_agent character varying(500),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(255) NOT NULL,
    old_values text,
    new_values text,
    table_name character varying(255),
    record_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: certifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    course_id integer NOT NULL,
    course_name character varying(255) NOT NULL,
    issue_date date NOT NULL,
    expiration_date date NOT NULL,
    certification_number character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    instructor_name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.certifications OWNER TO postgres;

--
-- Name: certifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.certifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.certifications_id_seq OWNER TO postgres;

--
-- Name: certifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.certifications_id_seq OWNED BY public.certifications.id;


--
-- Name: class_students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class_students (
    id integer NOT NULL,
    class_id integer,
    student_id integer,
    attendance character varying(50) DEFAULT 'registered'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.class_students OWNER TO postgres;

--
-- Name: class_students_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.class_students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.class_students_id_seq OWNER TO postgres;

--
-- Name: class_students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.class_students_id_seq OWNED BY public.class_students.id;


--
-- Name: class_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class_types (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    duration_minutes integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.class_types OWNER TO postgres;

--
-- Name: class_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.class_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.class_types_id_seq OWNER TO postgres;

--
-- Name: class_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.class_types_id_seq OWNED BY public.class_types.id;


--
-- Name: classes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classes (
    id integer NOT NULL,
    class_type_id integer,
    instructor_id integer,
    organization_id integer,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    status character varying(50) DEFAULT 'scheduled'::character varying NOT NULL,
    location text,
    max_students integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.classes OWNER TO postgres;

--
-- Name: classes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.classes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.classes_id_seq OWNER TO postgres;

--
-- Name: classes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.classes_id_seq OWNED BY public.classes.id;


--
-- Name: course_pricing; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_pricing (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    course_type_id integer NOT NULL,
    price_per_student numeric(10,2) NOT NULL,
    effective_date date NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.course_pricing OWNER TO postgres;

--
-- Name: course_pricing_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.course_pricing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.course_pricing_id_seq OWNER TO postgres;

--
-- Name: course_pricing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.course_pricing_id_seq OWNED BY public.course_pricing.id;


--
-- Name: course_request_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_request_details (
    id integer NOT NULL,
    course_request_id integer,
    details text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    organization_id integer
);


ALTER TABLE public.course_request_details OWNER TO postgres;

--
-- Name: course_request_details_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.course_request_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.course_request_details_id_seq OWNER TO postgres;

--
-- Name: course_request_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.course_request_details_id_seq OWNED BY public.course_request_details.id;


--
-- Name: course_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_requests (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    course_type_id integer NOT NULL,
    date_requested date NOT NULL,
    scheduled_date date,
    location character varying(255) NOT NULL,
    registered_students integer DEFAULT 0 NOT NULL,
    notes text,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    instructor_id integer,
    confirmed_date date,
    confirmed_start_time time without time zone,
    confirmed_end_time time without time zone,
    completed_at timestamp with time zone,
    ready_for_billing boolean DEFAULT false,
    ready_for_billing_at timestamp with time zone,
    invoiced boolean DEFAULT false,
    invoiced_at timestamp with time zone,
    last_reminder_at timestamp with time zone,
    is_cancelled boolean DEFAULT false,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    instructor_comments text,
    archived boolean DEFAULT false,
    archived_at timestamp with time zone,
    archived_by integer
);


ALTER TABLE public.course_requests OWNER TO postgres;

--
-- Name: course_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.course_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.course_requests_id_seq OWNER TO postgres;

--
-- Name: course_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.course_requests_id_seq OWNED BY public.course_requests.id;


--
-- Name: course_students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_students (
    id integer NOT NULL,
    course_request_id integer,
    student_id integer,
    status character varying(50) DEFAULT 'enrolled'::character varying,
    enrolled_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    first_name character varying(255),
    last_name character varying(255),
    email character varying(255),
    attendance_marked boolean DEFAULT false,
    attended boolean DEFAULT false
);


ALTER TABLE public.course_students OWNER TO postgres;

--
-- Name: course_students_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.course_students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.course_students_id_seq OWNER TO postgres;

--
-- Name: course_students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.course_students_id_seq OWNED BY public.course_students.id;


--
-- Name: course_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_types (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    duration integer NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.course_types OWNER TO postgres;

--
-- Name: course_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.course_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.course_types_id_seq OWNER TO postgres;

--
-- Name: course_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.course_types_id_seq OWNED BY public.course_types.id;


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_templates (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    key character varying(50) NOT NULL,
    category character varying(50) NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    is_active boolean DEFAULT true,
    is_system boolean DEFAULT false,
    created_by integer,
    last_modified_by integer,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sub_category character varying(100) DEFAULT 'general'::character varying
);


ALTER TABLE public.email_templates OWNER TO postgres;

--
-- Name: email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_templates_id_seq OWNER TO postgres;

--
-- Name: email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_templates_id_seq OWNED BY public.email_templates.id;


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.enrollments (
    id integer NOT NULL,
    student_id integer,
    class_id integer,
    status character varying(50) DEFAULT 'enrolled'::character varying,
    enrolled_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.enrollments OWNER TO postgres;

--
-- Name: enrollments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.enrollments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.enrollments_id_seq OWNER TO postgres;

--
-- Name: enrollments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.enrollments_id_seq OWNED BY public.enrollments.id;


--
-- Name: instructor_availability; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.instructor_availability (
    id integer NOT NULL,
    instructor_id integer NOT NULL,
    date date NOT NULL,
    status character varying(50) DEFAULT 'available'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.instructor_availability OWNER TO postgres;

--
-- Name: instructor_availability_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.instructor_availability_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.instructor_availability_id_seq OWNER TO postgres;

--
-- Name: instructor_availability_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.instructor_availability_id_seq OWNED BY public.instructor_availability.id;


--
-- Name: instructor_pay_rates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.instructor_pay_rates (
    id integer NOT NULL,
    instructor_id integer NOT NULL,
    tier_id integer,
    hourly_rate numeric(8,2) NOT NULL,
    course_bonus numeric(8,2) DEFAULT 50.00,
    effective_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date,
    notes text,
    created_by integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT instructor_pay_rates_course_bonus_check CHECK ((course_bonus >= (0)::numeric)),
    CONSTRAINT instructor_pay_rates_hourly_rate_check CHECK ((hourly_rate >= (0)::numeric))
);


ALTER TABLE public.instructor_pay_rates OWNER TO postgres;

--
-- Name: instructor_pay_rates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.instructor_pay_rates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.instructor_pay_rates_id_seq OWNER TO postgres;

--
-- Name: instructor_pay_rates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.instructor_pay_rates_id_seq OWNED BY public.instructor_pay_rates.id;


--
-- Name: instructors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.instructors (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(50),
    address text,
    city character varying(100),
    province character varying(50),
    postal_code character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.instructors OWNER TO postgres;

--
-- Name: instructors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.instructors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.instructors_id_seq OWNER TO postgres;

--
-- Name: instructors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.instructors_id_seq OWNED BY public.instructors.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    course_request_id integer,
    organization_id integer NOT NULL,
    invoice_date date DEFAULT CURRENT_TIMESTAMP NOT NULL,
    due_date date NOT NULL,
    amount numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    course_type_name character varying(255),
    location character varying(255),
    date_completed date,
    students_billed integer,
    rate_per_student numeric(10,2),
    notes text,
    email_sent_at timestamp with time zone,
    posted_to_org boolean DEFAULT false,
    posted_to_org_at timestamp with time zone,
    paid_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: invoice_with_breakdown; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.invoice_with_breakdown AS
 SELECT id,
    invoice_number,
    course_request_id,
    organization_id,
    invoice_date,
    due_date,
    amount,
    status,
    course_type_name,
    location,
    date_completed,
    students_billed,
    rate_per_student,
    notes,
    email_sent_at,
    posted_to_org,
    posted_to_org_at,
    paid_date,
    created_at,
    updated_at,
    amount AS base_cost,
    (amount * 0.13) AS tax_amount
   FROM public.invoices i;


ALTER VIEW public.invoice_with_breakdown OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


ALTER TABLE public.knex_migrations OWNER TO postgres;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knex_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knex_migrations_id_seq OWNER TO postgres;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knex_migrations_id_seq OWNED BY public.knex_migrations.id;


--
-- Name: knex_migrations_lock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knex_migrations_lock (
    index integer NOT NULL,
    is_locked integer
);


ALTER TABLE public.knex_migrations_lock OWNER TO postgres;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knex_migrations_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNER TO postgres;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNED BY public.knex_migrations_lock.index;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    recipient_id integer NOT NULL,
    sender_id integer,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    data jsonb,
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: organization_pricing; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organization_pricing (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    class_type_id integer NOT NULL,
    price_per_student numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    last_modified_by integer,
    deleted_at timestamp without time zone,
    CONSTRAINT organization_pricing_price_per_student_check CHECK ((price_per_student >= (0)::numeric))
);


ALTER TABLE public.organization_pricing OWNER TO postgres;

--
-- Name: organization_pricing_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.organization_pricing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organization_pricing_id_seq OWNER TO postgres;

--
-- Name: organization_pricing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.organization_pricing_id_seq OWNED BY public.organization_pricing.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    contact_email character varying(255),
    contact_phone character varying(20),
    address text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organizations_id_seq OWNER TO postgres;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: pay_rate_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pay_rate_history (
    id integer NOT NULL,
    instructor_id integer NOT NULL,
    old_hourly_rate numeric(8,2),
    new_hourly_rate numeric(8,2) NOT NULL,
    old_course_bonus numeric(8,2),
    new_course_bonus numeric(8,2),
    old_tier_id integer,
    new_tier_id integer,
    change_reason text,
    changed_by integer,
    effective_date date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pay_rate_history OWNER TO postgres;

--
-- Name: pay_rate_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pay_rate_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pay_rate_history_id_seq OWNER TO postgres;

--
-- Name: pay_rate_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pay_rate_history_id_seq OWNED BY public.pay_rate_history.id;


--
-- Name: pay_rate_tiers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pay_rate_tiers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    base_hourly_rate numeric(8,2) NOT NULL,
    course_bonus numeric(8,2) DEFAULT 50.00,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pay_rate_tiers_base_hourly_rate_check CHECK ((base_hourly_rate >= (0)::numeric)),
    CONSTRAINT pay_rate_tiers_course_bonus_check CHECK ((course_bonus >= (0)::numeric))
);


ALTER TABLE public.pay_rate_tiers OWNER TO postgres;

--
-- Name: pay_rate_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pay_rate_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pay_rate_tiers_id_seq OWNER TO postgres;

--
-- Name: pay_rate_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pay_rate_tiers_id_seq OWNED BY public.pay_rate_tiers.id;


--
-- Name: payment_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_requests (
    id integer NOT NULL,
    instructor_id integer NOT NULL,
    timesheet_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_date date NOT NULL,
    payment_method character varying(50) DEFAULT 'direct_deposit'::character varying,
    notes text,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payment_requests_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT payment_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'completed'::character varying, 'returned_to_hr'::character varying])::text[])))
);


ALTER TABLE public.payment_requests OWNER TO postgres;

--
-- Name: payment_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_requests_id_seq OWNER TO postgres;

--
-- Name: payment_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_requests_id_seq OWNED BY public.payment_requests.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_date date NOT NULL,
    payment_method character varying(50),
    reference_number character varying(100),
    notes text,
    status character varying(50) DEFAULT 'verified'::character varying,
    submitted_by_org_at timestamp with time zone,
    verified_by_accounting_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reversed_at timestamp without time zone,
    reversed_by integer
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: payroll_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payroll_payments (
    id integer NOT NULL,
    instructor_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_date date NOT NULL,
    payment_method character varying(50) DEFAULT 'direct_deposit'::character varying,
    notes text,
    status character varying(20) DEFAULT 'pending'::character varying,
    transaction_id character varying(100),
    hr_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payroll_payments_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT payroll_payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.payroll_payments OWNER TO postgres;

--
-- Name: payroll_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payroll_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payroll_payments_id_seq OWNER TO postgres;

--
-- Name: payroll_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payroll_payments_id_seq OWNED BY public.payroll_payments.id;


--
-- Name: profile_changes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profile_changes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    change_type character varying(50) NOT NULL,
    field_name character varying(100) NOT NULL,
    old_value text,
    new_value text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    hr_comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT profile_changes_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.profile_changes OWNER TO postgres;

--
-- Name: profile_changes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.profile_changes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profile_changes_id_seq OWNER TO postgres;

--
-- Name: profile_changes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.profile_changes_id_seq OWNED BY public.profile_changes.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    sid character varying(255) NOT NULL,
    sess json NOT NULL,
    expire timestamp with time zone NOT NULL,
    instructor_id integer,
    course_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: system_configurations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_configurations (
    id integer NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value text NOT NULL,
    description text,
    category character varying(50) DEFAULT 'general'::character varying NOT NULL,
    updated_by integer,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_configurations OWNER TO postgres;

--
-- Name: system_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_configurations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_configurations_id_seq OWNER TO postgres;

--
-- Name: system_configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_configurations_id_seq OWNED BY public.system_configurations.id;


--
-- Name: timesheets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timesheets (
    id integer NOT NULL,
    instructor_id integer NOT NULL,
    week_start_date date NOT NULL,
    total_hours numeric(5,2) NOT NULL,
    courses_taught integer DEFAULT 0,
    notes text,
    status character varying(20) DEFAULT 'pending'::character varying,
    hr_comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT timesheets_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT timesheets_total_hours_check CHECK ((total_hours >= (0)::numeric))
);


ALTER TABLE public.timesheets OWNER TO postgres;

--
-- Name: timesheets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.timesheets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timesheets_id_seq OWNER TO postgres;

--
-- Name: timesheets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.timesheets_id_seq OWNED BY public.timesheets.id;


--
-- Name: token_blacklist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.token_blacklist (
    id integer NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.token_blacklist OWNER TO postgres;

--
-- Name: token_blacklist_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.token_blacklist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.token_blacklist_id_seq OWNER TO postgres;

--
-- Name: token_blacklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.token_blacklist_id_seq OWNED BY public.token_blacklist.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'student'::character varying NOT NULL,
    organization_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    phone character varying(20),
    reset_token text,
    reset_token_expires timestamp without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vendor_invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendor_invoices (
    id integer NOT NULL,
    vendor_id integer NOT NULL,
    invoice_number character varying(255) NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text,
    invoice_date date NOT NULL,
    due_date date,
    manual_type character varying(100),
    quantity integer,
    pdf_filename character varying(255),
    status character varying(50) DEFAULT 'submitted'::character varying,
    notes text,
    payment_date date,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.vendor_invoices OWNER TO postgres;

--
-- Name: vendor_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vendor_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vendor_invoices_id_seq OWNER TO postgres;

--
-- Name: vendor_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vendor_invoices_id_seq OWNED BY public.vendor_invoices.id;


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendors (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    contact_email character varying(255),
    contact_phone character varying(20),
    address text,
    vendor_type character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.vendors OWNER TO postgres;

--
-- Name: vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vendors_id_seq OWNER TO postgres;

--
-- Name: vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vendors_id_seq OWNED BY public.vendors.id;


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: certifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certifications ALTER COLUMN id SET DEFAULT nextval('public.certifications_id_seq'::regclass);


--
-- Name: class_students id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_students ALTER COLUMN id SET DEFAULT nextval('public.class_students_id_seq'::regclass);


--
-- Name: class_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_types ALTER COLUMN id SET DEFAULT nextval('public.class_types_id_seq'::regclass);


--
-- Name: classes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes ALTER COLUMN id SET DEFAULT nextval('public.classes_id_seq'::regclass);


--
-- Name: course_pricing id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_pricing ALTER COLUMN id SET DEFAULT nextval('public.course_pricing_id_seq'::regclass);


--
-- Name: course_request_details id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_request_details ALTER COLUMN id SET DEFAULT nextval('public.course_request_details_id_seq'::regclass);


--
-- Name: course_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_requests ALTER COLUMN id SET DEFAULT nextval('public.course_requests_id_seq'::regclass);


--
-- Name: course_students id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_students ALTER COLUMN id SET DEFAULT nextval('public.course_students_id_seq'::regclass);


--
-- Name: course_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_types ALTER COLUMN id SET DEFAULT nextval('public.course_types_id_seq'::regclass);


--
-- Name: email_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates ALTER COLUMN id SET DEFAULT nextval('public.email_templates_id_seq'::regclass);


--
-- Name: enrollments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments ALTER COLUMN id SET DEFAULT nextval('public.enrollments_id_seq'::regclass);


--
-- Name: instructor_availability id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructor_availability ALTER COLUMN id SET DEFAULT nextval('public.instructor_availability_id_seq'::regclass);


--
-- Name: instructor_pay_rates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructor_pay_rates ALTER COLUMN id SET DEFAULT nextval('public.instructor_pay_rates_id_seq'::regclass);


--
-- Name: instructors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructors ALTER COLUMN id SET DEFAULT nextval('public.instructors_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.knex_migrations_id_seq'::regclass);


--
-- Name: knex_migrations_lock index; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.knex_migrations_lock_index_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: organization_pricing id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_pricing ALTER COLUMN id SET DEFAULT nextval('public.organization_pricing_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: pay_rate_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pay_rate_history ALTER COLUMN id SET DEFAULT nextval('public.pay_rate_history_id_seq'::regclass);


--
-- Name: pay_rate_tiers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pay_rate_tiers ALTER COLUMN id SET DEFAULT nextval('public.pay_rate_tiers_id_seq'::regclass);


--
-- Name: payment_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_requests ALTER COLUMN id SET DEFAULT nextval('public.payment_requests_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: payroll_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_payments ALTER COLUMN id SET DEFAULT nextval('public.payroll_payments_id_seq'::regclass);


--
-- Name: profile_changes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_changes ALTER COLUMN id SET DEFAULT nextval('public.profile_changes_id_seq'::regclass);


--
-- Name: system_configurations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_configurations ALTER COLUMN id SET DEFAULT nextval('public.system_configurations_id_seq'::regclass);


--
-- Name: timesheets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timesheets ALTER COLUMN id SET DEFAULT nextval('public.timesheets_id_seq'::regclass);


--
-- Name: token_blacklist id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_blacklist ALTER COLUMN id SET DEFAULT nextval('public.token_blacklist_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vendor_invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_invoices ALTER COLUMN id SET DEFAULT nextval('public.vendor_invoices_id_seq'::regclass);


--
-- Name: vendors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors ALTER COLUMN id SET DEFAULT nextval('public.vendors_id_seq'::regclass);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_logs (id, user_id, action, details, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, old_values, new_values, table_name, record_id, created_at) FROM stdin;
\.


--
-- Data for Name: certifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.certifications (id, user_id, course_id, course_name, issue_date, expiration_date, certification_number, status, instructor_name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: class_students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.class_students (id, class_id, student_id, attendance, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: class_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.class_types (id, name, description, duration_minutes, created_at, updated_at) FROM stdin;
1	CPR Basic	Basic CPR certification course	180	2025-06-21 23:12:05.333873-04	2025-06-21 23:12:05.333873-04
2	CPR Advanced	Advanced CPR certification course	240	2025-06-21 23:12:05.333873-04	2025-06-21 23:12:05.333873-04
3	First Aid	First Aid certification course	120	2025-06-21 23:12:05.333873-04	2025-06-21 23:12:05.333873-04
\.


--
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classes (id, class_type_id, instructor_id, organization_id, start_time, end_time, status, location, max_students, created_at, updated_at) FROM stdin;
12	2	32	2	2025-07-10 05:00:00-04	2025-07-10 08:00:00-04	completed	Markham	4	2025-07-10 15:23:51.085979-04	2025-07-10 17:29:21.369813-04
13	2	32	2	2025-07-11 09:00:00-04	2025-07-11 12:00:00-04	completed	Markham	4	2025-07-11 23:25:49.152972-04	2025-07-11 23:48:38.973869-04
14	2	32	2	2025-07-12 09:00:00-04	2025-07-12 12:00:00-04	completed	markham	1	2025-07-12 14:08:10.857696-04	2025-07-12 14:57:56.549738-04
\.


--
-- Data for Name: course_pricing; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_pricing (id, organization_id, course_type_id, price_per_student, effective_date, is_active, created_at, updated_at) FROM stdin;
5	3	2	9.00	2025-07-11	t	2025-07-11 17:25:16.776068-04	2025-07-11 17:25:16.776068-04
4	2	2	9.00	2025-07-11	t	2025-07-11 16:45:12.983707-04	2025-07-11 16:45:12.983707-04
\.


--
-- Data for Name: course_request_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_request_details (id, course_request_id, details, created_at, updated_at, organization_id) FROM stdin;
\.


--
-- Data for Name: course_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_requests (id, organization_id, course_type_id, date_requested, scheduled_date, location, registered_students, notes, status, instructor_id, confirmed_date, confirmed_start_time, confirmed_end_time, completed_at, ready_for_billing, ready_for_billing_at, invoiced, invoiced_at, last_reminder_at, is_cancelled, cancelled_at, cancellation_reason, created_at, updated_at, instructor_comments, archived, archived_at, archived_by) FROM stdin;
24	2	2	2025-07-10	2025-07-10	Markham	4		completed	32	2025-07-10	09:00:00	12:00:00	2025-07-10 17:41:30.126121-04	t	2025-07-10 17:37:17.61488-04	t	2025-07-10 17:38:22.868832-04	\N	f	\N	\N	2025-07-10 14:46:44.392709-04	2025-07-10 19:22:49.163521-04		t	2025-07-10 19:22:49.163521-04	\N
26	2	2	2025-07-12	2025-07-12	markham	1		completed	32	2025-07-12	09:00:00	12:00:00	2025-07-12 14:57:56.54761-04	f	\N	f	\N	\N	f	\N	\N	2025-07-12 14:02:27.782116-04	2025-07-12 14:57:56.54761-04		f	\N	\N
25	2	2	2025-07-11	2025-07-11	Markham	4		completed	32	2025-07-11	09:00:00	12:00:00	2025-07-11 23:48:38.957632-04	t	2025-07-12 15:09:41.252346-04	t	2025-07-12 15:12:26.247985-04	\N	f	\N	\N	2025-07-11 11:09:19.817873-04	2025-07-12 15:33:36.207925-04		t	2025-07-12 15:33:36.207925-04	4
\.


--
-- Data for Name: course_students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_students (id, course_request_id, student_id, status, enrolled_at, completed_at, created_at, updated_at, first_name, last_name, email, attendance_marked, attended) FROM stdin;
38	24	\N	enrolled	2025-07-10 14:46:53.36244-04	\N	2025-07-10 14:46:53.36244-04	2025-07-10 17:04:28.537421-04	Ray	Smith	mike_todo@yahoo.com	t	t
37	24	\N	enrolled	2025-07-10 14:46:53.36244-04	\N	2025-07-10 14:46:53.36244-04	2025-07-10 17:04:30.024998-04	Mary	Jones	kpbc@gmail.com	t	t
36	24	\N	enrolled	2025-07-10 14:46:53.36244-04	\N	2025-07-10 14:46:53.36244-04	2025-07-10 17:11:35.642404-04	Michael	Annamunthodo	mike_todo@yahoo.com	t	f
39	24	\N	enrolled	2025-07-10 14:46:53.36244-04	\N	2025-07-10 14:46:53.36244-04	2025-07-10 17:14:06.658322-04	James	Dallas	kpbc@gmail.com	t	f
40	24	\N	enrolled	2025-07-10 17:16:17.1075-04	\N	2025-07-10 17:16:17.1075-04	2025-07-10 17:17:17.737537-04	George michael	Annamunthodo	mike_todo@yahoo.ca	t	f
44	25	\N	enrolled	2025-07-11 11:10:47.385741-04	\N	2025-07-11 11:10:47.385741-04	2025-07-11 23:47:59.911142-04	James	Dallas	kpbc@gmail.com	t	t
42	25	\N	enrolled	2025-07-11 11:10:47.385741-04	\N	2025-07-11 11:10:47.385741-04	2025-07-11 23:48:01.981907-04	Mary	Jones	kpbc@gmail.com	t	f
41	25	\N	enrolled	2025-07-11 11:10:47.385741-04	\N	2025-07-11 11:10:47.385741-04	2025-07-11 23:48:03.279903-04	Michael	Annamunthodo	mike_todo@yahoo.com	t	f
43	25	\N	enrolled	2025-07-11 11:10:47.385741-04	\N	2025-07-11 11:10:47.385741-04	2025-07-11 23:48:04.195205-04	Ray	Smith	mike_todo@yahoo.com	t	f
45	25	\N	enrolled	2025-07-11 23:48:17.651463-04	\N	2025-07-11 23:48:17.651463-04	2025-07-11 23:48:33.88914-04	jj	jj	\N	t	t
46	26	\N	enrolled	2025-07-12 14:49:41.924009-04	\N	2025-07-12 14:49:41.924009-04	2025-07-12 14:50:01.249957-04	Amir	Annamunthodo	\N	t	t
47	26	\N	enrolled	2025-07-12 14:49:57.36185-04	\N	2025-07-12 14:49:57.36185-04	2025-07-12 14:50:02.380329-04	Saraha	Vanier	\N	t	t
\.


--
-- Data for Name: course_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_types (id, name, description, duration, price, created_at, updated_at) FROM stdin;
1	CPR Level A	Basic CPR for adults	4	50.00	2025-07-10 18:23:45.860445-04	2025-07-10 18:23:45.860445-04
2	CPR Level C	Comprehensive CPR including infant and child	6	75.00	2025-07-10 18:23:45.860445-04	2025-07-10 18:23:45.860445-04
3	First Aid	Standard first aid training	8	100.00	2025-07-10 18:23:45.860445-04	2025-07-10 18:23:45.860445-04
4	BLS Provider	Basic Life Support for healthcare providers	4	80.00	2025-07-10 18:23:45.860445-04	2025-07-10 18:23:45.860445-04
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_templates (id, name, key, category, subject, body, is_active, is_system, created_by, last_modified_by, deleted_at, created_at, updated_at, sub_category) FROM stdin;
19	course_confirmation	course_confirmation	system	Course Confirmation - {courseName}	Dear {studentName},\n\nYour course "{courseName}" has been confirmed for {courseDate} at {location}.\n\nInstructor: {instructorName}\n\nPlease arrive 15 minutes early.\n\nBest regards,\nCPR Training Team	t	f	\N	\N	\N	2025-07-10 14:02:31.929311-04	2025-07-10 14:02:31.929311-04	general
20	course_cancellation	course_cancellation	system	Course Cancellation - {courseName}	Dear {studentName},\n\nUnfortunately, your course "{courseName}" scheduled for {courseDate} has been cancelled.\n\nWe will contact you to reschedule.\n\nBest regards,\nCPR Training Team	t	f	\N	\N	\N	2025-07-10 14:02:31.942641-04	2025-07-10 14:02:31.942641-04	general
21	course_reminder	course_reminder	system	Course Reminder - {courseName}	Dear {studentName},\n\nThis is a reminder for your course "{courseName}" tomorrow at {courseTime}.\n\nLocation: {location}\nInstructor: {instructorName}\n\nPlease bring your ID.\n\nBest regards,\nCPR Training Team	t	f	\N	\N	\N	2025-07-10 14:02:31.944516-04	2025-07-10 14:02:31.944516-04	general
22	password_reset	password_reset	system	Password Reset Request	Dear {userName},\n\nYou requested a password reset. Click the link below to reset your password:\n\n{resetLink}\n\nThis link expires in 1 hour.\n\nBest regards,\nCPR Training Team	t	f	\N	\N	\N	2025-07-10 14:02:31.946792-04	2025-07-10 14:02:31.946792-04	general
23	welcome_instructor	welcome_instructor	system	Welcome to CPR Training System	Dear {instructorName},\n\nWelcome to the CPR Training System!\n\nYour account has been created successfully.\n\nUsername: {username}\n\nPlease log in and update your availability.\n\nBest regards,\nCPR Training Team	t	f	\N	\N	\N	2025-07-10 14:02:31.949092-04	2025-07-10 14:02:31.949092-04	general
\.


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.enrollments (id, student_id, class_id, status, enrolled_at, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: instructor_availability; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.instructor_availability (id, instructor_id, date, status, created_at, updated_at) FROM stdin;
59	2	2025-07-11	available	2025-07-11 15:41:04.949479-04	2025-07-11 15:41:04.949479-04
61	32	2025-07-13	available	2025-07-11 23:06:32.619308-04	2025-07-11 23:06:32.619308-04
62	32	2025-07-14	available	2025-07-11 23:06:32.65197-04	2025-07-11 23:06:32.65197-04
63	32	2025-07-15	available	2025-07-11 23:06:32.661779-04	2025-07-11 23:06:32.661779-04
64	32	2025-07-16	available	2025-07-11 23:06:32.669283-04	2025-07-11 23:06:32.669283-04
65	32	2025-07-17	available	2025-07-11 23:06:32.683466-04	2025-07-11 23:06:32.683466-04
66	32	2025-07-18	available	2025-07-11 23:06:32.691907-04	2025-07-11 23:06:32.691907-04
67	32	2025-07-19	available	2025-07-11 23:06:32.698973-04	2025-07-11 23:06:32.698973-04
\.


--
-- Data for Name: instructor_pay_rates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.instructor_pay_rates (id, instructor_id, tier_id, hourly_rate, course_bonus, effective_date, end_date, notes, created_by, is_active, created_at, updated_at) FROM stdin;
1	6	\N	30.00	60.00	2025-07-15	\N	Test rate setup	66	t	2025-07-14 22:19:15.159215	2025-07-14 22:19:15.159215
2	2	4	25.00	50.00	2025-07-15	\N		61	t	2025-07-14 22:45:32.042334	2025-07-14 22:45:32.042334
3	32	3	25.00	50.00	2025-07-15	\N		61	t	2025-07-14 22:45:40.514038	2025-07-14 22:45:40.514038
\.


--
-- Data for Name: instructors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.instructors (id, user_id, name, phone, address, city, province, postal_code, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, invoice_number, course_request_id, organization_id, invoice_date, due_date, amount, status, course_type_name, location, date_completed, students_billed, rate_per_student, notes, email_sent_at, posted_to_org, posted_to_org_at, paid_date, created_at, updated_at) FROM stdin;
5	INV-2025-546256	25	2	2025-07-12	2025-08-11	18.00	pending	\N	\N	\N	2	\N	\N	2025-07-12 15:33:47.757843-04	t	2025-07-12 15:33:36.207925-04	\N	2025-07-12 15:12:26.247985-04	2025-07-12 15:33:36.207925-04
4	INV-2025-502884	24	2	2025-07-10	2025-08-09	100.00	paid	\N	\N	\N	2	\N	\N	2025-07-10 19:22:49.163521-04	t	2025-07-10 19:22:49.163521-04	2025-07-13	2025-07-10 17:38:22.868832-04	2025-07-13 23:16:36.565772-04
\.


--
-- Data for Name: knex_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knex_migrations (id, name, batch, migration_time) FROM stdin;
1	20250619203051_001_initial_schema.cjs	1	2025-06-21 23:11:53.623-04
2	20250619204614_002_additional_tables.cjs	1	2025-06-21 23:11:53.702-04
3	20250623_add_instructor_comments.cjs	2	2025-06-23 20:57:36.798-04
4	20250626_add_course_archive.cjs	3	2025-06-25 23:57:37.831-04
\.


--
-- Data for Name: knex_migrations_lock; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knex_migrations_lock (index, is_locked) FROM stdin;
1	0
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, recipient_id, sender_id, type, title, message, data, is_read, read_at, created_at) FROM stdin;
1	1	\N	test_notification	Test Notification	This is a test notification for Phase 3	\N	f	\N	2025-07-14 14:17:49.119413
2	1	61	bulk_test	Bulk Test Notification	This is a bulk test notification	\N	f	\N	2025-07-14 14:17:49.166362
3	2	61	bulk_test	Bulk Test Notification	This is a bulk test notification	\N	f	\N	2025-07-14 14:17:49.166362
4	1	\N	test_notification	Test Notification	This is a test notification for Phase 3	\N	f	\N	2025-07-14 14:21:44.766482
5	1	61	bulk_test	Bulk Test Notification	This is a bulk test notification	\N	f	\N	2025-07-14 14:21:44.81009
6	2	61	bulk_test	Bulk Test Notification	This is a bulk test notification	\N	f	\N	2025-07-14 14:21:44.81009
7	1	\N	test_notification	Test Notification	This is a test notification for Phase 3	\N	f	\N	2025-07-14 14:28:27.751878
8	1	61	bulk_test	Bulk Test Notification	This is a bulk test notification	\N	f	\N	2025-07-14 14:28:27.79088
9	2	61	bulk_test	Bulk Test Notification	This is a bulk test notification	\N	f	\N	2025-07-14 14:28:27.79088
10	1	\N	test_notification	Test Notification	This is a test notification for Phase 3	\N	f	\N	2025-07-14 14:28:51.374198
11	1	61	bulk_test	Bulk Test Notification	This is a bulk test notification	\N	f	\N	2025-07-14 14:28:51.411131
12	2	61	bulk_test	Bulk Test Notification	This is a bulk test notification	\N	f	\N	2025-07-14 14:28:51.411131
13	1	\N	test_notification	Test Notification	This is a test notification for Phase 3	\N	f	\N	2025-07-14 14:36:52.162177
14	1	61	bulk_test	Bulk Test Notification	This is a bulk test notification	\N	f	\N	2025-07-14 14:36:52.225238
15	2	61	bulk_test	Bulk Test Notification	This is a bulk test notification	\N	f	\N	2025-07-14 14:36:52.225238
\.


--
-- Data for Name: organization_pricing; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organization_pricing (id, organization_id, class_type_id, price_per_student, is_active, created_at, updated_at, created_by, last_modified_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organizations (id, name, contact_email, contact_phone, address, created_at, updated_at) FROM stdin;
2	Iffat College	iffataz@gmail.com	4164382995	456 Business Ave	2025-06-21 23:12:02.870513-04	2025-06-21 23:12:02.870513-04
3	CDI	Mike_todo@yahoo.com			2025-07-01 13:30:46.585419-04	2025-07-01 13:30:46.585419-04
4	GTACPR 	lorraine_anna@yahoo.ca			2025-07-01 14:17:37.51133-04	2025-07-01 14:17:37.51133-04
\.


--
-- Data for Name: pay_rate_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pay_rate_history (id, instructor_id, old_hourly_rate, new_hourly_rate, old_course_bonus, new_course_bonus, old_tier_id, new_tier_id, change_reason, changed_by, effective_date, created_at) FROM stdin;
1	6	\N	30.00	\N	60.00	\N	\N	Initial rate setup	66	2025-07-15	2025-07-14 22:19:15.159215
2	2	\N	25.00	\N	50.00	\N	4		61	2025-07-15	2025-07-14 22:45:32.042334
3	32	\N	25.00	\N	50.00	\N	3		61	2025-07-15	2025-07-14 22:45:40.514038
\.


--
-- Data for Name: pay_rate_tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pay_rate_tiers (id, name, description, base_hourly_rate, course_bonus, is_active, created_at, updated_at) FROM stdin;
1	Standard	Standard instructor rate	25.00	50.00	t	2025-07-14 21:51:31.718705	2025-07-14 21:51:31.718705
2	Senior	Senior instructor with additional experience	30.00	60.00	t	2025-07-14 21:51:31.718705	2025-07-14 21:51:31.718705
3	Specialist	Specialist instructor for advanced courses	35.00	75.00	t	2025-07-14 21:51:31.718705	2025-07-14 21:51:31.718705
4	Lead	Lead instructor with management responsibilities	40.00	100.00	t	2025-07-14 21:51:31.718705	2025-07-14 21:51:31.718705
\.


--
-- Data for Name: payment_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_requests (id, instructor_id, timesheet_id, amount, payment_date, payment_method, notes, status, created_at, updated_at) FROM stdin;
1	32	5	0.00	2025-07-15	direct_deposit	Payment for timesheet week starting Tue Jan 07 2025 00:00:00 GMT-0500 (Eastern Standard Time). Hours: 0.00, Courses: 0	pending	2025-07-15 08:35:08.371991	2025-07-15 08:35:08.371991
2	32	6	0.00	2025-07-15	direct_deposit	Payment for timesheet week starting Tue Jul 15 2025 00:00:00 GMT-0400 (Eastern Daylight Saving Time). Hours: 0.00, Courses: 0	pending	2025-07-15 12:11:40.365246	2025-07-15 12:11:40.365246
3	32	7	1012.50	2025-07-15	direct_deposit	Payment for timesheet week starting Mon Jul 14 2025 00:00:00 GMT-0400 (Eastern Daylight Saving Time). Hours: 40.50, Courses: 0	pending	2025-07-15 12:11:40.379634	2025-07-15 12:11:40.379634
4	32	8	975.00	2025-07-15	direct_deposit	Payment for timesheet week starting Mon Jul 21 2025 00:00:00 GMT-0400 (Eastern Daylight Saving Time). Hours: 35.00, Courses: 2	pending	2025-07-15 12:11:40.384034	2025-07-15 12:11:40.384034
8	2	1	1162.50	2025-07-15	bank_transfer	Approved with bank transfer method - Phase 2 test	approved	2025-07-15 12:11:40.400056	2025-07-15 14:43:29.137156
7	2	2	1162.50	2025-07-15	bank_transfer	Approved with bank transfer method - Phase 2 test	approved	2025-07-15 12:11:40.394412	2025-07-15 14:50:39.484176
6	2	3	1087.50	2025-07-15	direct_deposit	HR Decision (Override): HR override: Documentation issue resolved, approving payment - Complete workflow test	approved	2025-07-15 12:11:40.391779	2025-07-15 15:36:04.138682
5	32	4	1000.00	2025-07-15	direct_deposit	Returning to HR for review - missing documentation and verification needed	returned_to_hr	2025-07-15 12:11:40.387939	2025-07-15 17:56:15.151012
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, invoice_id, amount, payment_date, payment_method, reference_number, notes, status, submitted_by_org_at, verified_by_accounting_at, created_at, updated_at, reversed_at, reversed_by) FROM stdin;
1	4	10.00	2025-07-13	cash		Verified by accountant: Payment approved	verified	2025-07-13 08:32:13.618306-04	2025-07-13 08:44:48.912935-04	2025-07-13 08:32:13.618306-04	2025-07-13 08:32:13.618306-04	\N	\N
2	4	5.00	2025-07-13	Credit Card		They did not record this payment on their portal.	verified	\N	\N	2025-07-13 10:48:06.288955-04	2025-07-13 10:48:06.288955-04	\N	\N
3	4	85.00	2025-07-13	check		Verified by accountant: Payment approved	verified	2025-07-13 11:18:16.073892-04	2025-07-13 11:43:00.182772-04	2025-07-13 11:18:16.073892-04	2025-07-13 11:18:16.073892-04	\N	\N
4	4	13.00	2025-07-14	cash		Verified by accountant: Payment approved	verified	2025-07-13 21:08:16.595271-04	2025-07-13 22:22:21.532397-04	2025-07-13 21:08:16.595271-04	2025-07-13 21:08:16.595271-04	\N	\N
5	4	13.00	2025-07-14	cash		Verified by accountant: Payment approved\n\nReversed by accountant: Mistake	reversed	2025-07-13 21:09:52.0075-04	2025-07-13 22:23:38.443435-04	2025-07-13 21:09:52.0075-04	2025-07-13 21:09:52.0075-04	2025-07-13 23:16:36.565772	4
\.


--
-- Data for Name: payroll_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payroll_payments (id, instructor_id, amount, payment_date, payment_method, notes, status, transaction_id, hr_notes, created_at, updated_at) FROM stdin;
1	2	1250.00	2025-01-15	direct_deposit	Test payment creation	completed	TXN123456	Payment processed successfully	2025-07-14 14:17:48.87992	2025-07-14 14:17:48.931884
2	2	1250.00	2025-01-15	direct_deposit	Test payment creation	completed	TXN123456	Payment processed successfully	2025-07-14 14:21:44.593448	2025-07-14 14:21:44.631907
3	2	1250.00	2025-01-15	direct_deposit	Test payment creation	completed	TXN123456	Payment processed successfully	2025-07-14 14:28:27.467605	2025-07-14 14:28:27.541885
4	2	1250.00	2025-01-15	direct_deposit	Test payment creation	completed	TXN123456	Payment processed successfully	2025-07-14 14:28:51.219109	2025-07-14 14:28:51.258148
5	2	1250.00	2025-01-15	direct_deposit	Test payment creation	completed	TXN123456	Payment processed successfully	2025-07-14 14:36:51.962462	2025-07-14 14:36:52.009303
\.


--
-- Data for Name: profile_changes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profile_changes (id, user_id, change_type, field_name, old_value, new_value, status, hr_comment, created_at, updated_at) FROM stdin;
2	1	instructor	email	\N	test@example.com	approved	Test approval from Phase 2 testing	2025-07-14 10:27:50.040945	2025-07-14 12:27:22.651438
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (sid, sess, expire, instructor_id, course_id, created_at) FROM stdin;
\.


--
-- Data for Name: system_configurations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_configurations (id, config_key, config_value, description, category, updated_by, updated_at, created_at) FROM stdin;
1	invoice_due_days	30	Default number of days until invoice is due	invoice	\N	2025-07-12 16:46:33.90685	2025-07-12 16:46:33.90685
2	invoice_late_fee_percent	1.5	Monthly late fee percentage for overdue invoices	invoice	\N	2025-07-12 16:46:33.90685	2025-07-12 16:46:33.90685
3	invoice_payment_terms	Net 30	Default payment terms for invoices	invoice	\N	2025-07-12 16:46:33.90685	2025-07-12 16:46:33.90685
4	email_smtp_host	smtp.gmail.com	SMTP server host for sending emails	email	\N	2025-07-12 16:46:33.90685	2025-07-12 16:46:33.90685
5	email_smtp_port	587	SMTP server port	email	\N	2025-07-12 16:46:33.90685	2025-07-12 16:46:33.90685
6	email_smtp_secure	false	Use secure connection for SMTP	email	\N	2025-07-12 16:46:33.90685	2025-07-12 16:46:33.90685
7	email_smtp_user	kpbcma@gmail.com	SMTP username	email	\N	2025-07-12 16:46:33.90685	2025-07-12 16:46:33.90685
8	email_smtp_pass	xnvn dywh kcbo irow	SMTP password/app password	email	\N	2025-07-12 16:46:33.90685	2025-07-12 16:46:33.90685
9	email_smtp_from	kpbcma@gmail.com	Default sender email address	email	\N	2025-07-12 16:46:33.90685	2025-07-12 16:46:33.90685
10	course_default_price	50.00	Default price per student for courses	course	\N	2025-07-12 16:46:33.90685	2025-07-12 16:46:33.90685
11	course_max_students	20	Default maximum students per course	course	\N	2025-07-12 16:46:33.90685	2025-07-12 16:46:33.90685
12	course_cancellation_notice_hours	24	Minimum notice required for course cancellation	course	\N	2025-07-12 16:46:33.90685	2025-07-12 16:46:33.90685
13	system_session_timeout_minutes	15	Session timeout in minutes	system	\N	2025-07-12 16:46:33.90685	2025-07-12 16:46:33.90685
14	system_max_file_size_mb	10	Maximum file upload size in MB	system	\N	2025-07-12 16:46:33.90685	2025-07-12 16:46:33.90685
15	system_support_email	support@cpr-training.com	Default support email address	system	\N	2025-07-12 16:46:33.90685	2025-07-12 16:46:33.90685
\.


--
-- Data for Name: timesheets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.timesheets (id, instructor_id, week_start_date, total_hours, courses_taught, notes, status, hr_comment, created_at, updated_at) FROM stdin;
1	2	2025-01-13	40.50	3	Test timesheet submission	approved	Approved by HR	2025-07-14 14:21:44.361992	2025-07-14 14:21:44.401878
2	2	2025-02-03	40.50	3	Test timesheet submission	approved	Approved by HR	2025-07-14 14:28:50.99818	2025-07-14 14:28:51.04933
3	2	2025-03-03	35.50	4	Test timesheet from simple test	approved		2025-07-14 14:37:49.347446	2025-07-15 00:21:46.630953
4	32	2025-01-14	40.00	0	Test timesheet with non-Monday date	approved		2025-07-14 19:18:55.41617	2025-07-15 07:19:33.719066
8	32	2025-07-21	35.00	2	Test timesheet for different week	approved	Test approval - should trigger payment request creation	2025-07-14 20:45:41.062705	2025-07-15 07:24:25.518922
5	32	2025-01-07	0.00	0	Test timesheet without total hours	approved		2025-07-14 19:52:15.402338	2025-07-15 08:29:32.463831
7	32	2025-07-14	40.50	0	Test timesheet with auto-calculated Monday	approved		2025-07-14 20:35:27.160556	2025-07-15 09:20:58.384413
6	32	2025-07-15	0.00	0		approved		2025-07-14 19:58:58.692071	2025-07-15 12:08:46.802391
\.


--
-- Data for Name: token_blacklist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.token_blacklist (id, token_hash, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password_hash, role, organization_id, created_at, updated_at, phone, reset_token, reset_token_expires) FROM stdin;
61	hr	hr@cpr-training.com	$2a$12$KjAAPPOZWV5RCAA3LLmyN.NPC2VQMf0xEecGghIY7ftrtmGmLlhNq	hr	\N	2025-07-14 00:38:54.340523-04	2025-07-14 00:38:54.340523-04	\N	\N	\N
1	admin	test@example.com	$2a$12$6i1mVn59hhAzyAZt6XockuhWqjo18Cy9ot57cVCVkadJXtuW5svF.	admin	4	2025-06-21 23:12:05.323336-04	2025-07-14 12:27:22.651438-04	\N	\N	\N
66	hr_user	hr@cpr.com	$2a$10$zcMfH0CLX3GRYICe7tXa9eetqStH330JsQvDo3vdnzI25na6aQehG	hr	\N	2025-07-14 21:55:07.042824-04	2025-07-14 21:55:07.042824-04	\N	\N	\N
71	vendor	vendor@example.com	$2b$10$ixEF/ytQe09vvGfk7VdbjeH9E6RL.zbMyYEhTV4niq7SD2zW4m5LG	vendor	\N	2025-07-15 20:21:10.022976-04	2025-07-15 20:21:10.022976-04	\N	\N	\N
6	coujoe	admin@gtacpr.com	$2a$10$KyaFGbwP7Zxji0fEgXrmZu045OqAI95VPUkc89I5R1R5DSfzDMkxq	instructor	4	2025-07-01 14:54:35.970943-04	2025-07-01 14:54:35.970943-04	\N	\N	\N
32	mike	mike_todo@yahoo.com	$2a$10$Z4endT3KBxzpnOGSfPXg.eUqwC42pvij6ZM7MAdmrMoP1QuxpW/Ze	instructor	4	2025-07-10 14:23:52.92086-04	2025-07-10 14:23:52.92086-04	\N	\N	\N
3	orguser	kpbcma@gmail.com	$2a$12$6bxFlA7B5cjxWvtbl8C4m.PS8XKyJMLA/2jofs5qWSPTc74iEbXtC	organization	2	2025-06-21 23:12:05.323336-04	2025-06-21 23:12:05.323336-04	\N	\N	\N
2	instructor	michaela@kpbc.ca	$2b$12$x4xu4C8GeL/KimQaCcApfO9142ZGFJSZW2zpUCrryBeKGUnaxbmfO	instructor	4	2025-06-21 23:12:05.323336-04	2025-07-04 22:28:23.431431-04	123-456-7890	\N	\N
5	sysadmin	sysadmin@cpr.com	$2a$10$NGjoaxnOo1pBrw9p0Xluk.q2xfUZBnkZrQ5.bWn899TLJw5yjizsG	sysadmin	4	2025-06-26 23:00:04.49329-04	2025-07-01 11:47:59.809777-04	\N	\N	\N
4	accountant	accountant@cpr.com	$2a$12$icSw0bHhDMoZLrMZhXIcgeEsFFBBXllElEj83r5HlORaSc1CKV9em	accountant	4	2025-06-21 23:12:05.323336-04	2025-06-21 23:12:05.323336-04	\N	\N	\N
7	iffat	iffataz@gmail.com	$2a$10$LqrKTxMhTcF/c8CB0sB5/OmtGqiNoXmRBLcd6dFpbuznkcUNQVAVC	organization	2	2025-07-01 17:08:52.106231-04	2025-07-01 17:08:52.106231-04	\N	\N	\N
\.


--
-- Data for Name: vendor_invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vendor_invoices (id, vendor_id, invoice_number, amount, description, invoice_date, due_date, manual_type, quantity, pdf_filename, status, notes, payment_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vendors (id, name, contact_email, contact_phone, address, vendor_type, is_active, created_at, updated_at) FROM stdin;
1	Test Vendor Company	vendor@example.com	555-1234	123 Vendor St, Vendor City, ON, A1B 2C3	supplier	t	2025-07-15 20:22:38.687923-04	2025-07-15 20:22:38.687923-04
\.


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: certifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.certifications_id_seq', 1, false);


--
-- Name: class_students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.class_students_id_seq', 1, false);


--
-- Name: class_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.class_types_id_seq', 3, true);


--
-- Name: classes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.classes_id_seq', 14, true);


--
-- Name: course_pricing_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.course_pricing_id_seq', 5, true);


--
-- Name: course_request_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.course_request_details_id_seq', 1, false);


--
-- Name: course_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.course_requests_id_seq', 26, true);


--
-- Name: course_students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.course_students_id_seq', 47, true);


--
-- Name: course_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.course_types_id_seq', 873, true);


--
-- Name: email_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_templates_id_seq', 23, true);


--
-- Name: enrollments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.enrollments_id_seq', 1, false);


--
-- Name: instructor_availability_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.instructor_availability_id_seq', 68, true);


--
-- Name: instructor_pay_rates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.instructor_pay_rates_id_seq', 3, true);


--
-- Name: instructors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.instructors_id_seq', 1, false);


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoices_id_seq', 5, true);


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knex_migrations_id_seq', 4, true);


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knex_migrations_lock_index_seq', 1, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 15, true);


--
-- Name: organization_pricing_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.organization_pricing_id_seq', 4, true);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.organizations_id_seq', 4, true);


--
-- Name: pay_rate_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pay_rate_history_id_seq', 3, true);


--
-- Name: pay_rate_tiers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pay_rate_tiers_id_seq', 4, true);


--
-- Name: payment_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_requests_id_seq', 8, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 5, true);


--
-- Name: payroll_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payroll_payments_id_seq', 5, true);


--
-- Name: profile_changes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.profile_changes_id_seq', 2, true);


--
-- Name: system_configurations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_configurations_id_seq', 15, true);


--
-- Name: timesheets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.timesheets_id_seq', 8, true);


--
-- Name: token_blacklist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.token_blacklist_id_seq', 170, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 72, true);


--
-- Name: vendor_invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vendor_invoices_id_seq', 1, false);


--
-- Name: vendors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vendors_id_seq', 1, true);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: certifications certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_pkey PRIMARY KEY (id);


--
-- Name: class_students class_students_class_id_student_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_students
    ADD CONSTRAINT class_students_class_id_student_id_unique UNIQUE (class_id, student_id);


--
-- Name: class_students class_students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_students
    ADD CONSTRAINT class_students_pkey PRIMARY KEY (id);


--
-- Name: class_types class_types_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_types
    ADD CONSTRAINT class_types_name_unique UNIQUE (name);


--
-- Name: class_types class_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_types
    ADD CONSTRAINT class_types_pkey PRIMARY KEY (id);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: course_pricing course_pricing_organization_id_course_type_id_is_active_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_pricing
    ADD CONSTRAINT course_pricing_organization_id_course_type_id_is_active_unique UNIQUE (organization_id, course_type_id, is_active);


--
-- Name: course_pricing course_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_pricing
    ADD CONSTRAINT course_pricing_pkey PRIMARY KEY (id);


--
-- Name: course_request_details course_request_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_request_details
    ADD CONSTRAINT course_request_details_pkey PRIMARY KEY (id);


--
-- Name: course_requests course_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_requests
    ADD CONSTRAINT course_requests_pkey PRIMARY KEY (id);


--
-- Name: course_students course_students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_students
    ADD CONSTRAINT course_students_pkey PRIMARY KEY (id);


--
-- Name: course_types course_types_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_types
    ADD CONSTRAINT course_types_name_unique UNIQUE (name);


--
-- Name: course_types course_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_types
    ADD CONSTRAINT course_types_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_key_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_key_unique UNIQUE (key);


--
-- Name: email_templates email_templates_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_name_unique UNIQUE (name);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: instructor_availability instructor_availability_instructor_date_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructor_availability
    ADD CONSTRAINT instructor_availability_instructor_date_unique UNIQUE (instructor_id, date);


--
-- Name: instructor_availability instructor_availability_instructor_id_date_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructor_availability
    ADD CONSTRAINT instructor_availability_instructor_id_date_unique UNIQUE (instructor_id, date);


--
-- Name: instructor_availability instructor_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructor_availability
    ADD CONSTRAINT instructor_availability_pkey PRIMARY KEY (id);


--
-- Name: instructor_pay_rates instructor_pay_rates_instructor_id_effective_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructor_pay_rates
    ADD CONSTRAINT instructor_pay_rates_instructor_id_effective_date_key UNIQUE (instructor_id, effective_date);


--
-- Name: instructor_pay_rates instructor_pay_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructor_pay_rates
    ADD CONSTRAINT instructor_pay_rates_pkey PRIMARY KEY (id);


--
-- Name: instructors instructors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructors
    ADD CONSTRAINT instructors_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: knex_migrations_lock knex_migrations_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations_lock
    ADD CONSTRAINT knex_migrations_lock_pkey PRIMARY KEY (index);


--
-- Name: knex_migrations knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organization_pricing organization_pricing_organization_id_class_type_id_deleted__key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_pricing
    ADD CONSTRAINT organization_pricing_organization_id_class_type_id_deleted__key UNIQUE (organization_id, class_type_id, deleted_at);


--
-- Name: organization_pricing organization_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_pricing
    ADD CONSTRAINT organization_pricing_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_name_unique UNIQUE (name);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: pay_rate_history pay_rate_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pay_rate_history
    ADD CONSTRAINT pay_rate_history_pkey PRIMARY KEY (id);


--
-- Name: pay_rate_tiers pay_rate_tiers_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pay_rate_tiers
    ADD CONSTRAINT pay_rate_tiers_name_key UNIQUE (name);


--
-- Name: pay_rate_tiers pay_rate_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pay_rate_tiers
    ADD CONSTRAINT pay_rate_tiers_pkey PRIMARY KEY (id);


--
-- Name: payment_requests payment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_pkey PRIMARY KEY (id);


--
-- Name: payment_requests payment_requests_timesheet_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_timesheet_id_key UNIQUE (timesheet_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payroll_payments payroll_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_payments
    ADD CONSTRAINT payroll_payments_pkey PRIMARY KEY (id);


--
-- Name: profile_changes profile_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_changes
    ADD CONSTRAINT profile_changes_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: system_configurations system_configurations_config_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_configurations
    ADD CONSTRAINT system_configurations_config_key_key UNIQUE (config_key);


--
-- Name: system_configurations system_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_configurations
    ADD CONSTRAINT system_configurations_pkey PRIMARY KEY (id);


--
-- Name: timesheets timesheets_instructor_id_week_start_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timesheets
    ADD CONSTRAINT timesheets_instructor_id_week_start_date_key UNIQUE (instructor_id, week_start_date);


--
-- Name: timesheets timesheets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timesheets
    ADD CONSTRAINT timesheets_pkey PRIMARY KEY (id);


--
-- Name: token_blacklist token_blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT token_blacklist_pkey PRIMARY KEY (id);


--
-- Name: token_blacklist token_blacklist_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT token_blacklist_token_hash_key UNIQUE (token_hash);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: vendor_invoices vendor_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT vendor_invoices_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: idx_instructor_pay_rates_effective_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_instructor_pay_rates_effective_date ON public.instructor_pay_rates USING btree (effective_date);


--
-- Name: idx_instructor_pay_rates_instructor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_instructor_pay_rates_instructor_id ON public.instructor_pay_rates USING btree (instructor_id);


--
-- Name: idx_instructor_pay_rates_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_instructor_pay_rates_is_active ON public.instructor_pay_rates USING btree (is_active);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_recipient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_recipient_id ON public.notifications USING btree (recipient_id);


--
-- Name: idx_notifications_sender_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_sender_id ON public.notifications USING btree (sender_id);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_organization_pricing_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_organization_pricing_active ON public.organization_pricing USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_organization_pricing_class_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_organization_pricing_class_type_id ON public.organization_pricing USING btree (class_type_id);


--
-- Name: idx_organization_pricing_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_organization_pricing_composite ON public.organization_pricing USING btree (organization_id, class_type_id, is_active) WHERE (is_active = true);


--
-- Name: idx_organization_pricing_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_organization_pricing_org_id ON public.organization_pricing USING btree (organization_id);


--
-- Name: idx_pay_rate_history_effective_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pay_rate_history_effective_date ON public.pay_rate_history USING btree (effective_date);


--
-- Name: idx_pay_rate_history_instructor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pay_rate_history_instructor_id ON public.pay_rate_history USING btree (instructor_id);


--
-- Name: idx_payment_requests_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_requests_created_at ON public.payment_requests USING btree (created_at);


--
-- Name: idx_payment_requests_instructor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_requests_instructor_id ON public.payment_requests USING btree (instructor_id);


--
-- Name: idx_payment_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_requests_status ON public.payment_requests USING btree (status);


--
-- Name: idx_payment_requests_timesheet_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_requests_timesheet_id ON public.payment_requests USING btree (timesheet_id);


--
-- Name: idx_payments_reversed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_reversed_at ON public.payments USING btree (reversed_at) WHERE (reversed_at IS NOT NULL);


--
-- Name: idx_payments_status_reversed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_status_reversed ON public.payments USING btree (status) WHERE ((status)::text = 'reversed'::text);


--
-- Name: idx_payments_verified_by_accounting_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_verified_by_accounting_at ON public.payments USING btree (verified_by_accounting_at) WHERE (verified_by_accounting_at IS NOT NULL);


--
-- Name: idx_payroll_payments_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payroll_payments_created_at ON public.payroll_payments USING btree (created_at);


--
-- Name: idx_payroll_payments_instructor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payroll_payments_instructor_id ON public.payroll_payments USING btree (instructor_id);


--
-- Name: idx_payroll_payments_payment_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payroll_payments_payment_date ON public.payroll_payments USING btree (payment_date);


--
-- Name: idx_payroll_payments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payroll_payments_status ON public.payroll_payments USING btree (status);


--
-- Name: idx_profile_changes_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profile_changes_status ON public.profile_changes USING btree (status);


--
-- Name: idx_profile_changes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profile_changes_user_id ON public.profile_changes USING btree (user_id);


--
-- Name: idx_system_config_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_config_category ON public.system_configurations USING btree (category);


--
-- Name: idx_system_config_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_config_key ON public.system_configurations USING btree (config_key);


--
-- Name: idx_timesheets_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_timesheets_created_at ON public.timesheets USING btree (created_at);


--
-- Name: idx_timesheets_instructor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_timesheets_instructor_id ON public.timesheets USING btree (instructor_id);


--
-- Name: idx_timesheets_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_timesheets_status ON public.timesheets USING btree (status);


--
-- Name: idx_timesheets_week_start_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_timesheets_week_start_date ON public.timesheets USING btree (week_start_date);


--
-- Name: idx_token_blacklist_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_token_blacklist_expires ON public.token_blacklist USING btree (expires_at);


--
-- Name: idx_token_blacklist_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_token_blacklist_hash ON public.token_blacklist USING btree (token_hash);


--
-- Name: idx_users_reset_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_reset_token ON public.users USING btree (reset_token);


--
-- Name: idx_users_reset_token_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_reset_token_expires ON public.users USING btree (reset_token_expires);


--
-- Name: idx_vendor_invoices_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_invoices_created_at ON public.vendor_invoices USING btree (created_at);


--
-- Name: idx_vendor_invoices_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_invoices_status ON public.vendor_invoices USING btree (status);


--
-- Name: idx_vendor_invoices_vendor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_invoices_vendor_id ON public.vendor_invoices USING btree (vendor_id);


--
-- Name: organization_pricing trigger_organization_pricing_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_organization_pricing_updated_at BEFORE UPDATE ON public.organization_pricing FOR EACH ROW EXECUTE FUNCTION public.update_organization_pricing_updated_at();


--
-- Name: payroll_payments trigger_payroll_payments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_payroll_payments_updated_at BEFORE UPDATE ON public.payroll_payments FOR EACH ROW EXECUTE FUNCTION public.update_payroll_payments_updated_at();


--
-- Name: timesheets trigger_timesheets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_timesheets_updated_at BEFORE UPDATE ON public.timesheets FOR EACH ROW EXECUTE FUNCTION public.update_timesheets_updated_at();


--
-- Name: instructor_pay_rates trigger_update_instructor_pay_rates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_instructor_pay_rates_updated_at BEFORE UPDATE ON public.instructor_pay_rates FOR EACH ROW EXECUTE FUNCTION public.update_instructor_pay_rates_updated_at();


--
-- Name: payment_requests trigger_update_payment_requests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_payment_requests_updated_at BEFORE UPDATE ON public.payment_requests FOR EACH ROW EXECUTE FUNCTION public.update_payment_requests_updated_at();


--
-- Name: activity_logs activity_logs_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: audit_logs audit_logs_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: class_students class_students_class_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_students
    ADD CONSTRAINT class_students_class_id_foreign FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: class_students class_students_student_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_students
    ADD CONSTRAINT class_students_student_id_foreign FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: classes classes_class_type_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_class_type_id_foreign FOREIGN KEY (class_type_id) REFERENCES public.class_types(id);


--
-- Name: classes classes_instructor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_instructor_id_foreign FOREIGN KEY (instructor_id) REFERENCES public.users(id);


--
-- Name: classes classes_organization_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_organization_id_foreign FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: course_pricing course_pricing_course_type_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_pricing
    ADD CONSTRAINT course_pricing_course_type_id_foreign FOREIGN KEY (course_type_id) REFERENCES public.class_types(id);


--
-- Name: course_pricing course_pricing_organization_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_pricing
    ADD CONSTRAINT course_pricing_organization_id_foreign FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: course_requests course_requests_archived_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_requests
    ADD CONSTRAINT course_requests_archived_by_foreign FOREIGN KEY (archived_by) REFERENCES public.users(id);


--
-- Name: course_requests course_requests_course_type_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_requests
    ADD CONSTRAINT course_requests_course_type_id_foreign FOREIGN KEY (course_type_id) REFERENCES public.class_types(id);


--
-- Name: course_requests course_requests_instructor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_requests
    ADD CONSTRAINT course_requests_instructor_id_foreign FOREIGN KEY (instructor_id) REFERENCES public.users(id);


--
-- Name: course_requests course_requests_organization_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_requests
    ADD CONSTRAINT course_requests_organization_id_foreign FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: course_students course_students_course_request_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_students
    ADD CONSTRAINT course_students_course_request_id_foreign FOREIGN KEY (course_request_id) REFERENCES public.course_requests(id);


--
-- Name: course_students course_students_student_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_students
    ADD CONSTRAINT course_students_student_id_foreign FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: email_templates email_templates_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: email_templates email_templates_last_modified_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_last_modified_by_foreign FOREIGN KEY (last_modified_by) REFERENCES public.users(id);


--
-- Name: enrollments enrollments_class_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_class_id_foreign FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: enrollments enrollments_student_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_student_id_foreign FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: instructor_availability instructor_availability_instructor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructor_availability
    ADD CONSTRAINT instructor_availability_instructor_id_foreign FOREIGN KEY (instructor_id) REFERENCES public.users(id);


--
-- Name: instructor_pay_rates instructor_pay_rates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructor_pay_rates
    ADD CONSTRAINT instructor_pay_rates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: instructor_pay_rates instructor_pay_rates_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructor_pay_rates
    ADD CONSTRAINT instructor_pay_rates_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: instructor_pay_rates instructor_pay_rates_tier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructor_pay_rates
    ADD CONSTRAINT instructor_pay_rates_tier_id_fkey FOREIGN KEY (tier_id) REFERENCES public.pay_rate_tiers(id) ON DELETE SET NULL;


--
-- Name: instructors instructors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructors
    ADD CONSTRAINT instructors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_course_request_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_course_request_id_foreign FOREIGN KEY (course_request_id) REFERENCES public.course_requests(id);


--
-- Name: invoices invoices_organization_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_organization_id_foreign FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: organization_pricing organization_pricing_class_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_pricing
    ADD CONSTRAINT organization_pricing_class_type_id_fkey FOREIGN KEY (class_type_id) REFERENCES public.class_types(id) ON DELETE CASCADE;


--
-- Name: organization_pricing organization_pricing_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_pricing
    ADD CONSTRAINT organization_pricing_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: organization_pricing organization_pricing_last_modified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_pricing
    ADD CONSTRAINT organization_pricing_last_modified_by_fkey FOREIGN KEY (last_modified_by) REFERENCES public.users(id);


--
-- Name: organization_pricing organization_pricing_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_pricing
    ADD CONSTRAINT organization_pricing_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: pay_rate_history pay_rate_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pay_rate_history
    ADD CONSTRAINT pay_rate_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: pay_rate_history pay_rate_history_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pay_rate_history
    ADD CONSTRAINT pay_rate_history_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pay_rate_history pay_rate_history_new_tier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pay_rate_history
    ADD CONSTRAINT pay_rate_history_new_tier_id_fkey FOREIGN KEY (new_tier_id) REFERENCES public.pay_rate_tiers(id);


--
-- Name: pay_rate_history pay_rate_history_old_tier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pay_rate_history
    ADD CONSTRAINT pay_rate_history_old_tier_id_fkey FOREIGN KEY (old_tier_id) REFERENCES public.pay_rate_tiers(id);


--
-- Name: payment_requests payment_requests_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payment_requests payment_requests_timesheet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_timesheet_id_fkey FOREIGN KEY (timesheet_id) REFERENCES public.timesheets(id) ON DELETE CASCADE;


--
-- Name: payments payments_invoice_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_foreign FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: payments payments_reversed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES public.users(id);


--
-- Name: payroll_payments payroll_payments_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_payments
    ADD CONSTRAINT payroll_payments_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: profile_changes profile_changes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_changes
    ADD CONSTRAINT profile_changes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_instructor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_instructor_id_foreign FOREIGN KEY (instructor_id) REFERENCES public.users(id);


--
-- Name: system_configurations system_configurations_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_configurations
    ADD CONSTRAINT system_configurations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: timesheets timesheets_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timesheets
    ADD CONSTRAINT timesheets_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_organization_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_foreign FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: vendor_invoices vendor_invoices_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT vendor_invoices_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- PostgreSQL database dump complete
--

