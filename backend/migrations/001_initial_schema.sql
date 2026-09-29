-- NWP-SETUP-005
-- Initial PostgreSQL database schema
--
-- Source of truth:
--   Project Data Dictionary
--
-- Excluded from this migration per current task scope:
--   network_plan
--   network_topology
--   bill_of_materials
--   bom_line_item
--   network_context
--   topology_job

BEGIN;

-- ============================================================
-- 1. VENDOR
-- ============================================================

CREATE TABLE IF NOT EXISTS vendor (
    vendor_id INT PRIMARY KEY,
    name TEXT NOT NULL,
    need_controller BOOLEAN NOT NULL
);

-- ============================================================
-- 2. DISTRIBUTOR
-- ============================================================

CREATE TABLE IF NOT EXISTS distributor (
    distributor_id INT PRIMARY KEY,
    name TEXT NOT NULL
);

-- ============================================================
-- 3. DEVICE
-- ============================================================

CREATE TABLE device (
    device_id INT PRIMARY KEY,
    vendor_id INT NOT NULL,
    sku TEXT NOT NULL,
    price DECIMAL NULL,
    price_updated_at TIMESTAMP NULL,
    name TEXT NOT NULL UNIQUE,
    description TEXT NULL,
    is_rack_mountable BOOLEAN NULL,
    u_height INT NULL,
    warranty_months INT NULL,
    lifecycle_status TEXT NULL,
    eos_date DATE NULL,
    eol_date DATE NULL,

    CONSTRAINT fk_device_vendor
        FOREIGN KEY (vendor_id)
        REFERENCES vendor(vendor_id)
);

-- ============================================================
-- 4. CAPABILITY
-- ============================================================

CREATE TABLE capability (
    capability_id INT PRIMARY KEY,
    capability_desc TEXT NOT NULL
);

-- ============================================================
-- 5. DEVICE CAPABILITY
-- ============================================================

CREATE TABLE device_capability (
    device_id INT NOT NULL,
    capability_id INT NOT NULL,

    PRIMARY KEY (device_id, capability_id),

    CONSTRAINT fk_device_capability_device
        FOREIGN KEY (device_id)
        REFERENCES device(device_id),

    CONSTRAINT fk_device_capability_capability
        FOREIGN KEY (capability_id)
        REFERENCES capability(capability_id)
);

-- ============================================================
-- 6. GATEWAY / ROUTER SPECIFICATIONS
-- ============================================================

CREATE TABLE gateway_router_specifications (
    device_id INT PRIMARY KEY,
    wan_ports INT NULL,
    lan_ports INT NULL,
    max_throughput_mbps INT NULL,
    max_power_draw_w INT NULL,
    vpn_supported BOOLEAN NULL,

    CONSTRAINT fk_gateway_router_device
        FOREIGN KEY (device_id)
        REFERENCES device(device_id)
);

-- ============================================================
-- 7. SWITCH SPECIFICATIONS
-- ============================================================

CREATE TABLE switch_specifications (
    device_id INT PRIMARY KEY,
    port_counts INT NULL,
    poe_ports INT NULL,
    poe_budget_w INT NULL,
    switching_capacity_gbps INT NULL,
    layer INT NULL,
    max_power_draw_w INT NULL,

    CONSTRAINT fk_switch_device
        FOREIGN KEY (device_id)
        REFERENCES device(device_id)
);

-- ============================================================
-- 8. ACCESS POINT SPECIFICATIONS
-- ============================================================

CREATE TABLE ap_specifications (
    device_id INT PRIMARY KEY,
    wifi_standard INT NULL,
    max_concurrent_clients INT NULL,
    max_data_rate_mbps INT NULL,
    supported_24ghz BOOLEAN NULL,
    supported_5ghz BOOLEAN NULL,
    supported_6ghz BOOLEAN NULL,
    max_power_draw_w INT NULL,
    power_method TEXT NULL,

    CONSTRAINT fk_ap_device
        FOREIGN KEY (device_id)
        REFERENCES device(device_id)
);

-- ============================================================
-- 9. FIREWALL SPECIFICATIONS
-- ============================================================

CREATE TABLE firewall_specifications (
    device_id INT PRIMARY KEY,
    firewall_throughputs_mbps INT NULL,
    vpn_throughput_mbps INT NULL,
    max_concurrent_sessions INT NULL,
    wan_ports INT NULL,
    lan_ports INT NULL,
    max_power_draw_w INT NULL,

    CONSTRAINT fk_firewall_device
        FOREIGN KEY (device_id)
        REFERENCES device(device_id)
);

-- ============================================================
-- 10. RACK / ENCLOSURE SPECIFICATIONS
-- ============================================================

CREATE TABLE rack_specifications (
    device_id INT PRIMARY KEY,
    form_factor TEXT NULL,
    u_capacity INT NULL,
    load_capacity_kg INT NULL,
    mount_type TEXT NULL,
    has_ventilation BOOLEAN NULL,

    CONSTRAINT fk_rack_device
        FOREIGN KEY (device_id)
        REFERENCES device(device_id)
);

-- ============================================================
-- 11. PRICING SOURCE
-- ============================================================

CREATE TABLE IF NOT EXISTS pricing_source (
    source_id INT PRIMARY KEY,
    vendor_id INT NOT NULL,
    distributor_id INT NOT NULL,
    source_url TEXT NULL,
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_pricing_source_vendor
        FOREIGN KEY (vendor_id)
        REFERENCES vendor(vendor_id),

    CONSTRAINT fk_pricing_source_distributor
        FOREIGN KEY (distributor_id)
        REFERENCES distributor(distributor_id)
);

-- ============================================================
-- 12. PRICING
-- ============================================================

CREATE TABLE pricing (
    pricing_id INT PRIMARY KEY,
    device_id INT NOT NULL,
    distributor_id INT NOT NULL,
    source_id INT NULL,
    price DECIMAL NOT NULL,
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Required by NWP-PRICE-005
    is_stale BOOLEAN NOT NULL DEFAULT FALSE,

    -- Required by NWP-PRICE-006
    consecutive_failure_count INT NOT NULL DEFAULT 0,
    needs_manual_review BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_pricing_device
        FOREIGN KEY (device_id)
        REFERENCES device(device_id),

    CONSTRAINT fk_pricing_distributor
        FOREIGN KEY (distributor_id)
        REFERENCES distributor(distributor_id),

    CONSTRAINT fk_pricing_source
        FOREIGN KEY (source_id)
        REFERENCES pricing_source(source_id)
);

-- ============================================================
-- 13. UPDATE LOG
-- ============================================================

CREATE TABLE update_log (
    upd_log_id INT PRIMARY KEY,
    distributor_id INT NOT NULL,
    device_id INT NOT NULL,
    status TEXT NOT NULL,
    error TEXT NULL,
    run_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_update_log_distributor
        FOREIGN KEY (distributor_id)
        REFERENCES distributor(distributor_id),

    CONSTRAINT fk_update_log_device
        FOREIGN KEY (device_id)
        REFERENCES device(device_id)
);

COMMIT;