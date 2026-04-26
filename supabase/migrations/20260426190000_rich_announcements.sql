-- Migration: Add institution-grade fields to corporate_announcements
ALTER TABLE corporate_announcements 
ADD COLUMN IF NOT EXISTS key_data TEXT,
ADD COLUMN IF NOT EXISTS deep_dive_indicator TEXT,
ADD COLUMN IF NOT EXISTS result_date DATE;
