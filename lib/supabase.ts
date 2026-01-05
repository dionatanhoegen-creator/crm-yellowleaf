import { createClient } from '@supabase/supabase-js';

// Versão corrigida - não quebra o build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cria o cliente, mesmo se as variáveis estiverem vazias
// Isso evita o erro "supposedly is required" durante o build
export const supabase = createClient(supabaseUrl, supabaseKey);