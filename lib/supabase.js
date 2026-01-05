// lib/supabase.js - ARQUIVO SIMPLES QUE FUNCIONA
import { createClient } from '@supabase/supabase-js';

// VALORES FICTÍCIOS durante o build - NUNCA quebra
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);