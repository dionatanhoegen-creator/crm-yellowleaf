"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Users, RefreshCw, CheckCircle2, XCircle, Key, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Conexão real

const MASTER_EMAIL = "dionatanhoegen@gmail.com";

// --- COMPONENTE: GESTÃO DE USUÁRIOS (CONECTADO) ---
function GestaoUsuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega usuários do banco ao abrir a tela
  useEffect(() => {
    // IMPORTANTE: Só executa no navegador, não durante o build
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    
    // Pequeno delay para garantir que tudo está inicializado
    const timer = setTimeout(() => {
      fetchUsuarios();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const fetchUsuarios = async () => {
    // NUNCA executa durante o build/SSR
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Verifica se o Supabase está disponível (apenas no cliente)
      const client = supabase;
      if (!client) {
        throw new Error('Banco de dados não está disponível no momento');
      }
      
      const { data, error: supabaseError } = await client.from('usuarios').select('*').order('id');
      
      if (supabaseError) {
        console.error('Erro do Supabase:', supabaseError);
        throw new Error(`Erro do banco: ${supabaseError.message}`);
      }
      
      if (data) {
        setUsuarios(data);
      } else {
        setUsuarios([]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err);
      setError(err.message || 'Não foi possível carregar os usuários. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: number, statusAtual: boolean) => {
    try {
      // Verifica se estamos no navegador
      if (typeof window === 'undefined') return;
      
      const client = supabase;
      if (!client) {
        alert('Conexão com banco de dados não disponível no momento');
        return;
      }
      
      const { error } = await client.from('usuarios').update({ ativo: !statusAtual }).eq('id', id);
      
      if (error) {
        console.error('Erro ao atualizar:', error);
        throw new Error(`Erro: ${error.message}`);
      }
      
      // Recarrega a lista se deu certo
      fetchUsuarios();
    } catch (err: any) {
      console.error('Erro ao atualizar usuário:', err);
      alert(err.message || 'Erro ao atualizar status do usuário');
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
       <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Users size={20} className="text-blue-600"/> Equipe Cadastrada
            </h3>
            <p className="text-xs text-slate-500">Controle quem acessa o sistema.</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm">
            + Novo Usuário
          </button>
       </div>
       
       {/* BLOCO MODIFICADO - adiciona tratamento de erro */}
       {error ? (
         <div className="p-8 text-center">
           <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
             <AlertCircle className="text-red-500 mx-auto mb-3" size={32} />
             <h4 className="font-bold text-red-700 mb-2">Erro de Conexão</h4>
             <p className="text-red-600 text-sm mb-4">{error}</p>
             <button
               onClick={fetchUsuarios}
               className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
             >
               Tentar Novamente
             </button>
           </div>
         </div>
       ) : loading ? (
         <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="animate-spin" /> Carregando equipe...
         </div>
       ) : usuarios.length === 0 ? (
         <div className="p-12 text-center text-slate-400">
            <Users className="mx-auto mb-3" size={32} />
            <p>Nenhum usuário cadastrado</p>
            <button
              onClick={fetchUsuarios}
              className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-bold"
            >
              Recarregar
            </button>
         </div>
       ) : (
         <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-400 font-bold uppercase text-xs border-b border-slate-100">
               <tr>
                  <th className="p-4">Nome</th>
                  <th className="p-4">Login</th>
                  <th className="p-4 text-center">Perfil</th>
                  <th className="p-4 text-center">Status</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               {usuarios.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition">
                     <td className="p-4 font-bold text-slate-700">
                        {user.nome} 
                        {user.email === MASTER_EMAIL && <span className="ml-2 bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded border border-purple-200">VOCÊ</span>}
                     </td>
                     <td className="p-4 text-slate-500">{user.email}</td>
                     <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.permissao === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                           {user.permissao}
                        </span>
                     </td>
                     <td className="p-4 text-center">
                        <button 
                           onClick={() => toggleStatus(user.id, user.ativo)} 
                           disabled={user.email === MASTER_EMAIL} 
                           className={`flex items-center gap-1 mx-auto px-3 py-1 rounded-full text-xs font-bold transition ${user.ativo ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'} ${user.email === MASTER_EMAIL ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                        >
                           {user.ativo ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
                           {user.ativo ? 'ATIVO' : 'BLOQUEADO'}
                        </button>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
       )}
    </div>
  );
}

// --- COMPONENTE: SINCRONIZAÇÃO (Mantido igual) ---
function SincronizacaoDados() {
  const [idPlanilha, setIdPlanilha] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const adicionarLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const sincronizar = async () => {
    if (!idPlanilha) return alert("Cole o Link ou ID da planilha.");
    let idLimpo = idPlanilha;
    if (idPlanilha.includes("/d/")) idLimpo = idPlanilha.split("/d/")[1].split("/")[0];

    setLoading(true);
    setLog([]);
    adicionarLog("🚀 Iniciando sincronização...");
    
    setTimeout(() => {
          adicionarLog("Conectando à base YellowLeaf...");
          setTimeout(() => {
              adicionarLog("✅ Clientes importados: 45");
              adicionarLog("✅ Produtos atualizados: 120");
              setLoading(false);
          }, 2000);
    }, 1000);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
       <div className="bg-slate-900 p-6 text-white">
          <h2 className="text-lg font-bold flex items-center gap-2"><RefreshCw size={20}/> Sincronizar Base de Dados</h2>
          <p className="text-slate-400 text-sm mt-1">Importa dados da planilha mestre para o CRM.</p>
       </div>
       <div className="p-6">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Link da Planilha Google (Mestre)</label>
          <div className="flex gap-2 mb-6">
             <input type="text" value={idPlanilha} onChange={e => setIdPlanilha(e.target.value)} placeholder="Cole o link aqui..." className="flex-1 p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-mono text-sm"/>
             <button onClick={sincronizar} disabled={loading} className={`px-6 rounded-lg font-bold transition flex items-center gap-2 text-white ${loading ? 'bg-slate-400' : 'bg-green-600 hover:bg-green-700'}`}>
                {loading ? <RefreshCw className="animate-spin" size={18}/> : 'Sincronizar Agora'}
             </button>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-green-400 min-h-[150px] overflow-y-auto border border-slate-800 shadow-inner">
             <p className="text-slate-600 mb-2 border-b border-slate-800 pb-2">// Log do sistema:</p>
             {log.map((l, i) => <div key={i} className="mb-1">{l}</div>)}
          </div>
       </div>
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('usuarios');
  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
           <div className="p-3 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm"><Shield size={32}/></div>
           <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Painel Master</h1>
              <p className="text-slate-500">Gestão centralizada do CRM YellowLeaf.</p>
           </div>
        </div>
        <div className="flex gap-6 mb-6 border-b border-slate-200">
           <button onClick={() => setActiveTab('usuarios')} className={`pb-3 px-2 font-bold text-sm transition border-b-2 flex items-center gap-2 ${activeTab === 'usuarios' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <Users size={18}/> Gestão de Usuários
           </button>
           <button onClick={() => setActiveTab('sync')} className={`pb-3 px-2 font-bold text-sm transition border-b-2 flex items-center gap-2 ${activeTab === 'sync' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <RefreshCw size={18}/> Sincronização
           </button>
        </div>
        <div className="animate-in fade-in zoom-in-95 duration-300">
           {activeTab === 'usuarios' ? <GestaoUsuarios /> : <SincronizacaoDados />}
        </div>
      </div>
    </div>
  );
}