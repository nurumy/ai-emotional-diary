import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // 서버측 라이브러리이므로 SERVICE_ROLE_KEY 사용 권장 (또는 ANON_KEY)

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables are missing');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
