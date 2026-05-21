-- Initialize PostgreSQL for local development
-- This script runs automatically when the container starts

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE cash TO cash;

-- Log successful initialization
DO $$
BEGIN
  RAISE NOTICE 'PostgreSQL initialized successfully for Ping platform';
END
$$;
