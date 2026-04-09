-- Creating extensions (optional, for UUIDs if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with Device Binding & Fraud Tracking
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'DISTRIBUTOR', 'AGENT', 'INSPECTOR')),
    
    -- Security & Anti-Fraud
    device_fingerprint VARCHAR(255), -- Server-verified hash, not client raw ID
    device_approved_at TIMESTAMP,
    fraud_score INTEGER DEFAULT 0,   -- Aggregated score from failed events/anomalies
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for Device & Replay Protection
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_fingerprint VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Authentication tracking Table for Security Audits
CREATE TABLE auth_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id), 
    ip_address VARCHAR(50),
    device_fingerprint VARCHAR(255),
    event_type VARCHAR(50) NOT NULL, -- e.g. AUTH_FAILED, DEVICE_MISMATCH, SESSION_EXPIRED
    description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table (WHO specifically receives it)
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    location_lat DECIMAL(10, 8), -- Baseline coordinates for delivery match checks
    location_lng DECIMAL(11, 8),
    is_verified BOOLEAN DEFAULT FALSE, -- Must be true to receive deliveries
    verified_by INTEGER REFERENCES users(id), -- Inspector approval tracking
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cylinders table
CREATE TABLE cylinders (
    id VARCHAR(50) PRIMARY KEY, -- Making it VARCHAR for specific IDs like CYL-001
    type VARCHAR(50) NOT NULL CHECK (type IN ('DOMESTIC', 'COMMERCIAL')),
    status VARCHAR(50) DEFAULT 'IN_STOCK' -- IN_STOCK, ASSIGNED, IN_TRANSIT, DELIVERED
);

-- Assignments table
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    cylinder_id VARCHAR(50) NOT NULL REFERENCES cylinders(id),
    agent_id INTEGER NOT NULL REFERENCES users(id),
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    customer_id INTEGER NOT NULL REFERENCES customers(id), -- Entity destination tracking
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    otp_code VARCHAR(10), 
    otp_expires_at TIMESTAMP,
    otp_attempts INTEGER DEFAULT 0,
    needs_audit BOOLEAN DEFAULT FALSE, -- 5% random audit flag
    CONSTRAINT chk_agent CHECK (agent_id != assigned_by)
);

-- Events table (CRITICAL: Append-only with offline + device tracking)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cylinder_id VARCHAR(50) NOT NULL REFERENCES cylinders(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    
    -- Clean Taxonomy
    -- SUCCESS: 'ASSIGNED', 'SCANNED', 'DELIVERED', 'VERIFIED'
    -- FAILURE: 'FAILED_OTP', 'INVALID_SEQUENCE', 'UNAUTHORIZED_AGENT'
    -- FLAG:    'ANOMALY_FLAGGED', 'COMMERCIAL_MISUSE'
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'ASSIGNED', 'SCANNED', 'DELIVERED', 'VERIFIED',
        'FAILED_OTP', 'INVALID_SEQUENCE', 'UNAUTHORIZED_AGENT',
        'ANOMALY_FLAGGED', 'COMMERCIAL_MISUSE'
    )),
    
    -- Event Flags & Categorization
    severity VARCHAR(20) DEFAULT 'INFO' CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    otp_verified BOOLEAN DEFAULT FALSE,
    
    -- Offline Attack Surface Protections
    is_offline BOOLEAN DEFAULT FALSE,
    client_timestamp TIMESTAMP,
    sync_delay_ms INTEGER,
    
    -- Contextual Trust & Session Link
    device_fingerprint VARCHAR(255),
    session_id UUID REFERENCES sessions(id),
    
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Server core truth
);

-- Unique index to prevent Event Spam Attacks (No consecutive duplicates for same cylinder/action)
-- Example: 'SCANNED' -> 'SCANNED' spam is blocked by service constraints, and time-based DB rate limiting can be applied below.
CREATE UNIQUE INDEX idx_no_rapid_spam ON events (cylinder_id, action, date_trunc('minute', timestamp));

-- Indexes for querying history efficiently
CREATE INDEX idx_events_cylinder_id ON events(cylinder_id);
CREATE INDEX idx_events_timestamp ON events(timestamp);

CREATE OR REPLACE FUNCTION prevent_event_modification() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Events are immutable. Updates and Deletes are prohibited.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_update_events
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION prevent_event_modification();

CREATE TRIGGER no_delete_events
BEFORE DELETE ON events
FOR EACH ROW EXECUTE FUNCTION prevent_event_modification();
