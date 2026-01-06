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
  
  // Estados para Gestão de Usuários
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para Importação de Planilhas
  const [loadingImport, setLoadingImport] = useState(false);
  const [status, setStatus] = useState<{msg: string, type: 'success' | 'error' | null}>({ msg: '', type: null });

  useEffect(() => {
    fetchUsuarios();
  }, []);

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

  // FUNÇÃO PARA LIMPAR TELEFONE (Evita erros de formato)
  const limparTelefone = (tel: any) => {
    if (!tel) return '';
    return String(tel).replace(/\D/g, ''); // Remove tudo que não é número
  };

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
        
        // 1. Limpa a base antiga para o seu usuário (sobrescreve o mês)
        await supabase.from(tabela).delete().eq('user_id', user.id);

        // 2. Mapeia os dados da planilha para os campos do banco
        const rows = data.map((row: any) => ({
          user_id: user.id,
          cnpj: String(row.CNPJ || row.cnpj || '').trim(),
          fantasia: String(row.Fantasia || row.fantasia || row.Nome || '').toUpperCase(),
          razao_social: String(row.Razao || row.razao_social || ''),
          vendedor: String(row.Vendedor || row.Representante || ''),
          cidade: String(row.Cidade || ''),
          // NOVOS CAMPOS QUE VOCÊ PEDIU
          celular: limparTelefone(row.Celular || row.WhatsApp || row.Telefone),
          email: String(row.Email || row.email || '').toLowerCase(),
          ultimo_faturamento: parseFloat(String(row.Faturamento || row.Valor || 0).replace(/[R$\s.]/g, '').replace(',', '.')) || 0,
          nome_produto: String(row.Produto || row.nome_produto || ''),
        }));

        // 3. Insere os novos dados
        const { error: insertError } = await supabase.from(tabela).insert(rows);
        if (insertError) throw insertError;

        setStatus({ msg: `${tipo.toUpperCase()} importados com sucesso!`, type: 'success' });
        
        // Dispara evento para o Dashboard atualizar os números sem F5
        window.dispatchEvent(new Event('focus'));

      } catch (err: any) {
        console.error(err);
        setStatus({ msg: "Erro na importação: verifique as colunas da planilha.", type: 'error' });
      } finally {
        setLoadingImport(false);
        if (e.target) e.target.value = ""; 
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-10">
      
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <ShieldCheck className="text-green-600" size={32}/> Painel Admin YellowLeaf
        </h1>
        <p className="text-slate-500 font-medium">Gestão de acessos e atualização da carteira mensal.</p>
      </div>

      {/* SEÇÃO DE IMPORTAÇÃO */}
      <section className="space-y-4">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Database size={16}/> Inteligência de Dados
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card Clientes */}
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm hover:border-green-600 transition group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-2xl"><Users size={24}/></div>
              <div>
                <h3 className="font-bold text-slate-800">Importar Carteira</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Base de Clientes</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Obrigatório colunas: <span className="font-mono text-green-600">CNPJ, Fantasia, Cidade, Celular, Email</span>.
            </p>
            <label className="block w-full py-3 bg-slate-800 hover:bg-black text-white text-center rounded-xl font-bold cursor-pointer transition text-sm">
              {loadingImport ? <Loader2 className="animate-spin mx-auto"/> : "Selecionar Planilha (.xlsx)"}
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => handleImport(e, 'clientes')} disabled={loadingImport} />
            </label>
          </div>

          {/* Card Produtos */}
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm hover:border-blue-600 transition group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><FileSpreadsheet size={24}/></div>
              <div>
                <h3 className="font-bold text-slate-800">Catálogo Mensal</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Lista de Ativos</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Atualize a lista de produtos disponíveis para as propostas no Pipeline.
            </p>
            <label className="block w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-center rounded-xl font-bold cursor-pointer transition text-sm">
              Importar Produtos (.xlsx)
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => handleImport(e, 'produtos')} disabled={loadingImport} />
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

      {/* GESTÃO DE USUÁRIOS */}
      <section className="space-y-4">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck size={16}/> Controle de Acessos
        </h2>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-sm">
          {loadingUsers ? (
            <div className="p-10 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2"/> Carregando usuários...</div>
          ) : error ? (
            <div className="p-10 text-center text-red-500">{error}</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="p-4">E-mail Cadastrado</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition font-medium">
                    <td className="p-4 text-slate-700">{u.email}</td>
                    <td className="p-4 text-center">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold">ATIVO</span>
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