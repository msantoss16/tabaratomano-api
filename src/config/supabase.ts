import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
}

// Ensure we have strings, createClient expects strings. 
// If missing, it will throw or fail, which is expected if config is bad.
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
