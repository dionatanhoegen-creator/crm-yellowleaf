const fetchUsuarios = async () => {
  // NUNCA executa durante o build/SSR
  if (typeof window === 'undefined') {
    console.log('Build time: ignorando fetchUsuarios');
    setLoading(false);
    return;
  }
  
  setLoading(true);
  setError(null);
  
  try {
    // Tenta usar o Supabase, mas se falhar, trata o erro
    const { data, error: supabaseError } = await supabase
      .from('usuarios')
      .select('*')
      .order('id');
    
    if (supabaseError) {
      console.error('Erro do Supabase:', supabaseError);
      throw new Error(`Falha na conexão: ${supabaseError.message}`);
    }
    
    if (data) {
      setUsuarios(data);
    } else {
      setUsuarios([]);
    }
  } catch (err: any) {
    console.error('Erro ao carregar usuários:', err);
    setError('Banco de dados temporariamente indisponível');
  } finally {
    setLoading(false);
  }
};