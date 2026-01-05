import { createClient, SupabaseClient } from '@supabase/supabase-js';

// SOLUÇÃO: Cria um cliente "mock" durante o build, real durante runtime
let supabaseInstance: SupabaseClient | null = null;

const createSupabaseClient = (): SupabaseClient | null => {
  // Se já criou, retorna
  if (supabaseInstance) return supabaseInstance;
  
  // No servidor (build time), retorna null
  if (typeof window === 'undefined') {
    console.log('⚠️  Build time: retornando null para Supabase');
    return null;
  }
  
  // No cliente (runtime), cria o cliente real
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis do Supabase não configuradas');
    console.log('URL:', supabaseUrl ? 'Presente' : 'Faltando');
    console.log('KEY:', supabaseKey ? 'Presente' : 'Faltando');
    return null;
  }
  
  console.log('✅ Criando cliente Supabase para runtime');
  supabaseInstance = createClient(supabaseUrl, supabaseKey);
  return supabaseInstance;
};

// Exporta a instância
export const supabase = createSupabaseClient();