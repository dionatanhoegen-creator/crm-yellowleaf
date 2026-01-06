"use client";

import React, { useState, useEffect } from 'react';
import { 
  Upload, Database, CheckCircle, AlertTriangle, 
  Loader2, FileSpreadsheet, Users, ShieldCheck, X 
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const supabase = createClientComponentClient();
  
  // Estados para Gestão de Usuários (O que você já tinha)
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para Importação de Planilhas (O novo)
  const [loadingImport, setLoadingImport] = useState(false);
  const [status, setStatus] = useState<{msg: string, type: 'success' | 'error' | null}>({ msg: '', type: null });

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // --- SUA FUNÇÃO ORIGINAL (Mantida e Melhorada) ---
  const fetchUsuarios = async () => {
    if (typeof window === 'undefined') return;
    setLoadingUsers(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('usuarios')
        .select('*')
        .order('id');
      
      if (supabaseError) throw new Error(supabaseError.message);
      setUsuarios(data || []);
    } catch (err: any) {
      setError('Banco de dados de usuários indisponível');
    } finally {
      setLoadingUsers(false);
    }
  };

  // --- NOVA FUNÇÃO DE IMPORTAÇÃO DE EXCEL ---
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'clientes' | 'produtos') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingImport(true);
    setStatus({ msg: `Processando ${tipo}...`, type: null });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sessão expirada. Logue novamente.");

        const tabela = tipo === 'clientes' ? 'base_clientes' : 'base_produtos';
        
        // 1. Limpa a base antiga do seu usuário
        await supabase.from(tabela).delete().eq('user_id', user.id);

        // 2. Mapeia os dados da sua planilha
        const rows = data.map((row: any) => ({
          user_id: user.id,
          cnpj: row.CNPJ || row.cnpj || '',
          fantasia: row.Fantasia || row.fantasia || row.Nome || '',
          razao_social: row.Razao || row.razao_social || '',
          vendedor: row.Vendedor || row.Representante || '',
          cidade: row.Cidade || '',
          ultimo_faturamento: row.Faturamento || 0,
          nome_produto: row.Produto || row.nome_produto || '',
        }));

        // 3. Insere no Supabase
        const { error: insertError } = await supabase.from(tabela).insert(rows);
        if (insertError) throw insertError;

        setStatus({ msg: `${tipo.toUpperCase()} atualizados com sucesso!`, type: 'success' });
      } catch (err: any) {
        setStatus({ msg: "Erro: " + err.message, type: 'error' });
      } finally {
        setLoadingImport(false);
        e.target.value = ""; // Limpa o campo de arquivo
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-10">
      
      {/* TÍTULO */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <ShieldCheck className="text-green-600" size={32}/> Painel Admin YellowLeaf
        </h1>
        <p className="text-slate-500 font-medium">Gestão de acessos e inteligência de dados.</p>
      </div>

      {/* SEÇÃO 1: IMPORTAÇÃO DE DADOS (NOVO) */}
      <section className="space-y-4">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Database size={16}/> Atualização Mensal da Base
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm hover:border-green-600 transition group relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-2xl"><Users size={24}/></div>
              <h3 className="font-bold text-slate-800">Carteira de Clientes</h3>
            </div>
            <p className="text-xs text-slate-500 mb-6">Suba o Excel mensal para atualizar a carteira ativa no dashboard.</p>
            <label className="block w-full py-3 bg-slate-800 hover:bg-black text-white text-center rounded-xl font-bold cursor-pointer transition text-sm">
              {loadingImport ? <Loader2 className="animate-spin mx-auto"/> : "Importar Clientes (.xlsx)"}
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => handleImport(e, 'clientes')} />
            </label>
          </div>

          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm hover:border-blue-600 transition group relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><FileSpreadsheet size={24}/></div>
              <h3 className="font-bold text-slate-800">Catálogo de Produtos</h3>
            </div>
            <p className="text-xs text-slate-500 mb-6">Atualize os produtos ativos para o Pipeline.</p>
            <label className="block w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-center rounded-xl font-bold cursor-pointer transition text-sm">
              Importar Produtos (.xlsx)
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => handleImport(e, 'produtos')} />
            </label>
          </div>
        </div>

        {status.type && (
          <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {status.type === 'success' ? <CheckCircle size={18}/> : <AlertTriangle size={18}/>}
            <span className="font-bold text-xs">{status.msg}</span>
          </div>
        )}
      </section>

      {/* SEÇÃO 2: GESTÃO DE USUÁRIOS (O QUE VOCÊ JÁ TINHA) */}
      <section className="space-y-4">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck size={16}/> Controle de Acessos
        </h2>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {loadingUsers ? (
            <div className="p-10 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2"/> Carregando usuários...</div>
          ) : error ? (
            <div className="p-10 text-center text-red-500">{error}</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="p-4">ID</th>
                  <th className="p-4">E-mail</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 text-xs font-mono text-slate-400">{u.id}</td>
                    <td className="p-4 text-sm font-bold text-slate-700">{u.email}</td>
                    <td className="p-4 text-center">
                      <button className="text-[10px] font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full hover:bg-red-50 hover:text-red-600 transition">Bloquear</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}