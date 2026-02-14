import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bydedlfccgywqshzllmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZGVkbGZjY2d5d3FzaHpsbG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NjE5MTUsImV4cCI6MjA4NjQzNzkxNX0.wa_gQajiyvhO0-cjyBPrBST74Y9JIEW64vniU8i_EVw';

export const supabase = createClient(supabaseUrl, supabaseKey);
