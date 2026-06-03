-- 1. PRIMARY PROJECT META & SIDEBAR SUMMARIES
CREATE TABLE projects (
    id VARCHAR(50) PRIMARY KEY, -- URL Slug (e.g., 'sports-complex-conyers')
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255) NOT NULL,
    type_label VARCHAR(100) NOT NULL, -- 'Case Study' or 'Engagement Summary'
    duration VARCHAR(100) NOT NULL,
    kpi_summary_budget TEXT NOT NULL,
    kpi_summary_rates TEXT NOT NULL,
    kpi_summary_outcomes TEXT NOT NULL,
    has_sandbox BOOLEAN DEFAULT FALSE,
    sandbox_title VARCHAR(255),
    sandbox_explanation TEXT,
    sandbox_formula_id VARCHAR(50), -- CRITICAL: Maps frontend to its formula handler
    blueprint_title VARCHAR(255) NOT NULL,
    dna_map_title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. SIDEBAR KPI COUNTER BOXES (Many-to-One)
CREATE TABLE project_kpis (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    value VARCHAR(100) NOT NULL,
    subtext VARCHAR(255),
    sort_order INT NOT NULL
);

-- 3. SIDEBAR UNIQUE HURDLES / CHALLENGES LIST (Many-to-One)
CREATE TABLE project_challenges (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
    challenge_text TEXT NOT NULL,
    sort_order INT NOT NULL
);

-- 4. THE 7-CARD CAROUSEL SECTIONS (Many-to-One)
CREATE TABLE project_carousel_cards (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
    card_index INT NOT NULL, -- Enforces ordering 0 through 6
    card_title VARCHAR(100) NOT NULL, -- e.g., '1. Overview'
    heading VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    CONSTRAINT unique_project_card_index UNIQUE (project_id, card_index)
);

-- 5. CONDITIONAL SANDBOX SLIDER METADATA (Many-to-One)
CREATE TABLE project_sandbox_sliders (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
    slider_key VARCHAR(50) NOT NULL, -- 'slider1', 'slider2', or 'slider3'
    label VARCHAR(255) NOT NULL,
    min_value NUMERIC NOT NULL,
    max_value NUMERIC NOT NULL,
    step_value NUMERIC NOT NULL,
    default_value NUMERIC NOT NULL
);

-- 6. MASTER BLUEPRINT TIME WORKFLOW PHASES (Many-to-One)
CREATE TABLE project_blueprint_phases (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
    phase_label VARCHAR(100) NOT NULL, -- e.g., 'Phase 1: Discovery'
    description TEXT NOT NULL,
    sort_order INT NOT NULL
);

-- 7. MASTER BLUEPRINT PARTIES & ENTITIES FLOW (Many-to-One)
CREATE TABLE project_blueprint_entities (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
    from_entity VARCHAR(100) NOT NULL,
    connection_type VARCHAR(255) NOT NULL, -- e.g., '$352,205 Fixed SOW'
    to_entity VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL
);

-- 8. PROJECT DNA MIND-MAP INTERACTIVE NODES (Many-to-One)
CREATE TABLE project_dna_nodes (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
    node_key VARCHAR(100) NOT NULL, -- e.g., 'revenue-streams'
    label VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- e.g., 'Finance', 'EPM'
    detail TEXT NOT NULL
);

-- 9. TECHNICAL SCHEMATICS IMAGE GALLERY (Many-to-One)
CREATE TABLE project_gallery (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(512), -- Path to physical file inside your storage/repo
    sort_order INT NOT NULL
);