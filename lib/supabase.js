import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️  SUPABASE_URL et SUPABASE_ANON_KEY doivent être définis dans le fichier .env');
    process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
