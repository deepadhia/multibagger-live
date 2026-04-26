-- Table for tracking system-wide settings and state (e.g. heartbeat tracking)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Initialize last_heartbeat_at
INSERT INTO public.system_settings (key, value) 
VALUES ('last_heartbeat_at', '"2000-01-01"') 
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);
