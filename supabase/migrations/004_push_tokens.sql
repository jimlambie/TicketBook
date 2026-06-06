-- Add push_token column to users table for Expo push notifications
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token text;
