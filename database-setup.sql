-- Database setup for Root Fitness Coach
-- Run this in your Supabase SQL editor

-- Create profiles table (if not exists)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create plans table (if not exists)
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_data JSONB NOT NULL,
  feedback JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create nutrition_profiles table
CREATE TABLE IF NOT EXISTS nutrition_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  goal VARCHAR(50) NOT NULL,
  nutrition_data JSONB NOT NULL,
  plan_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_plans_profile_id ON plans(profile_id);
CREATE INDEX IF NOT EXISTS idx_plans_created_at ON plans(created_at);
CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_profile_id ON nutrition_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_goal ON nutrition_profiles(goal);
CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_created_at ON nutrition_profiles(created_at);

-- Enable Row Level Security (RLS) for better security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your security needs)
CREATE POLICY "Allow public access to profiles" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow public access to plans" ON plans FOR ALL USING (true);
CREATE POLICY "Allow public access to nutrition_profiles" ON nutrition_profiles FOR ALL USING (true);


