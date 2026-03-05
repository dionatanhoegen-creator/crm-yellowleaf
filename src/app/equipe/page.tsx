"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Users, ShieldCheck, Edit, Save, X, Lock, ToggleLeft, ToggleRight, AlertTriangle, ShieldAlert
} from 'lucide-react';

export default function GestaoEquipePage() {
  const supabase = createClientComponentClient();
  const [equipe, setEquipe] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acessoNegado, setAcessoNegado] = useState(false);
  
  // Controle do Modal de Edição
  const [usuarioEditando, setUsuarioEditando] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    verificarAcessoECarregar();
  }, []);

  const verificarAcessoECarregar = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAcessoNegado(true);
        return;
      }

      // Verifica se quem está acessando é ADMIN na tabela de perfis
      const { data: meuPerfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      
      if (!meuPerfil || meuPerfil.cargo !== 'admin') {
        setAcessoNegado(true);
        setLoading(false);
        return;
      }

      // Se for Admin, carrega a equipe toda
      const { data: perfis } = await supabase.from('perfis').select('*').order('nome');
      if (perfis) setEquipe(perfis);

    } catch (error) {
      console.error("Erro ao carregar equipe:", error);
    } finally {
      setLoading(false);
    }
  };

  const abrirEdicao = (membro: any) => {
    // Garante que o JSON de acessos existe para não dar erro na tela
    const acessosPadrao = { pipeline: false, clientes: false, faturamento: false, exclusividades: false, produtos: false, relatorios: false, admin: false };
    setUsuarioEditando({
      ...membro,
      acessos: typeof membro.acessos === 'object' && membro.acessos !== null ? { ...acessosPadrao, ...membro.acessos } : acessosPadrao
    });
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const { error } = await supabase
        .from('perfis')
        .update({
          nome: usuarioEditando.nome,
          cargo: usuarioEditando.cargo,
          telefone: usuarioEditando.telefone,
          acessos: usuarioEditando.acessos
        })
        .eq('id', usuarioEditando.id);

      if (error) throw error;

      setUsuarioEditando(null);
      verificarAcessoECarregar(); // Recarrega a lista atualizada
    } catch (error) {
      alert("Erro ao salvar as permissões.");
      console.error(error);
    } finally {
      setSalvando(false);
    }
  };

  const toggleAcesso = (chave: string) => {
    setUsuarioEditando((prev: any) => ({
      ...prev,
      acessos: {
        ...prev.acessos,
        [chave]: !prev.acessos[chave]
      }
    }));
  };

  if (acessoNegado) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert size={40} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 mb-2">Acesso Restrito</h1>
            <p className="text-slate-500 mb-8">Apenas administradores podem gerenciar as permissões da equipe.</p>
        </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-6xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Users className="text-blue-600" /> Gestão de Equipe
             </h1>
             <p className="text-slate-500 mt-1">Controle de acessos, cargos e permissões do sistema.</p>
           </div>
        </div>

        {/* LISTA DE EQUIPE */}
        {loading ? (
          <div className="p-8 text-center text-slate-400 font-bold animate-pulse">Carregando usuários...</div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-100">
                  <tr>
                    <th className="p-5">Colaborador</th>
                    <th className="p-5">E-mail</th>
                    <th className="p-5">Cargo (Visão de Dados)</th>
                    <th className="p-5 text-center">Telas Liberadas</th>
                    <th className="p-5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {equipe.map((membro) => {
                    // Conta quantas chavinhas estão ativas
                    const telasAtivas = membro.acessos ? Object.values(membro.acessos).filter(Boolean).length : 0;
                    
                    return (
                      <tr key={membro.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-5 font-bold text-slate-800 flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs">
                             {membro.nome ? membro.nome.substring(0, 2).toUpperCase() : 'US'}
                           </div>
                           {membro.nome || 'Usuário Novo'}
                        </td>
                        <td className="p-5 text-slate-500 font-mono text-xs">{membro.email}</td>
                        <td className="p-5">
                           <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                             membro.cargo === 'admin' ? 'bg-purple-100 text-purple-700' :
                             membro.cargo === 'farmaceutico' ? 'bg-emerald-100 text-emerald-700' :
                             'bg-blue-100 text-blue-700'
                           }`}>
                             {membro.cargo}
                           </span>
                        </td>
                        <td className="p-5 text-center font-bold text-slate-400">
                           {telasAtivas} <span className="text-xs font-normal">telas</span>
                        </td>
                        <td className="p-5 text-right">
                           <button 
                             onClick={() => abrirEdicao(membro)}
                             className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition font-bold text-xs flex items-center gap-2 ml-auto"
                           >
                             <Edit size={16}/> Configurar
                           </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL DE EDIÇÃO DE ACESSOS */}
        {usuarioEditando && mounted && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
                
                <div className="bg-slate-800 p-6 flex justify-between items-center text-white shrink-0">
                   <div>
                     <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck size={24}/> Configurar Permissões</h2>
                     <p className="text-slate-400 text-xs mt-1 font-mono">{usuarioEditando.email}</p>
                   </div>
                   <button onClick={() => setUsuarioEditando(null)} className="hover:bg-white/10 p-2 rounded-full transition"><X size={20}/></button>
                </div>
                
                <div className="p-8 overflow-y-auto flex-1">
                   {/* DADOS CADASTRAIS */}
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">1. Dados e Cargo</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">Nome de Exibição (Sai no PDF)</label>
                          <input 
                              type="text" value={usuarioEditando.nome} 
                              onChange={(e) => setUsuarioEditando({...usuarioEditando, nome: e.target.value})}
                              className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 outline-none focus:border-blue-500"
                          />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">Telefone (Sai no PDF)</label>
                          <input 
                              type="text" value={usuarioEditando.telefone || ''} placeholder="(00) 00000-0000"
                              onChange={(e) => setUsuarioEditando({...usuarioEditando, telefone: e.target.value})}
                              className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 outline-none focus:border-blue-500"
                          />
                      </div>
                      <div className="md:col-span-2">
                          <label className="text-xs font-bold text-slate-500 mb-1 block">Cargo (Define o que a pessoa vê lá dentro)</label>
                          <select 
                              value={usuarioEditando.cargo} 
                              onChange={(e) => setUsuarioEditando({...usuarioEditando, cargo: e.target.value})}
                              className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold text-blue-700 bg-blue-50 outline-none focus:border-blue-500 cursor-pointer"
                          >
                              <option value="vendedor">Vendedor (Vê apenas os próprios clientes e pipeline)</option>
                              <option value="farmaceutico">Farmacêutico P&D (Vê toda a base de prescritores e clientes)</option>
                              <option value="admin">Administrador (Acesso irrestrito a todos os dados)</option>
                          </select>
                      </div>
                   </div>

                   {/* CONTROLE DE TELAS (CHAVINHAS) */}
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">2. Liberação de Telas (Menu)</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      
                      {/* MAPEANDO AS TELAS */}
                      {[
                        { key: 'pipeline', label: 'CRM / Pipeline', desc: 'Aba de negociações' },
                        { key: 'faturamento', label: 'Faturamento', desc: 'Dashboard de vendas' },
                        { key: 'clientes', label: 'Carteira de Clientes', desc: 'Base de farmácias' },
                        { key: 'exclusividades', label: 'Exclusividades', desc: 'Bloqueio de praça' },
                        { key: 'produtos', label: 'Tabela de Preços', desc: 'Insumos e ativos' },
                        { key: 'relatorios', label: 'Relatórios Internos', desc: 'Métricas de fechamento' },
                        { key: 'admin', label: 'Gestão de Equipe', desc: 'Pode editar permissões', danger: true },
                      ].map((tela) => {
                        const isAtivo = usuarioEditando.acessos[tela.key];
                        return (
                          <div 
                            key={tela.key} 
                            onClick={() => toggleAcesso(tela.key)}
                            className={`p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition ${
                               isAtivo 
                                ? (tela.danger ? 'border-red-400 bg-red-50' : 'border-green-400 bg-green-50') 
                                : 'border-slate-100 bg-white hover:border-slate-300'
                            }`}
                          >
                             <div>
                               <p className={`text-sm font-bold ${isAtivo ? (tela.danger ? 'text-red-700' : 'text-green-700') : 'text-slate-600'}`}>
                                 {tela.label}
                               </p>
                               <p className="text-[10px] text-slate-400 mt-0.5">{tela.desc}</p>
                             </div>
                             <div>
                               {isAtivo ? <ToggleRight size={28} className={tela.danger ? "text-red-500" : "text-green-500"} /> : <ToggleLeft size={28} className="text-slate-300" />}
                             </div>
                          </div>
                        )
                      })}
                      
                   </div>
                </div>

                <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
                   <button onClick={() => setUsuarioEditando(null)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition">Cancelar</button>
                   <button 
                      onClick={handleSalvar} 
                      disabled={salvando}
                      className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black hover:bg-blue-700 flex items-center gap-2 shadow-lg hover:shadow-blue-200 transition transform active:scale-95 disabled:opacity-50"
                   >
                      <Save size={20}/> {salvando ? 'Salvando...' : 'Salvar Acessos'}
                   </button>
                </div>
             </div>
          </div>, document.body
        )}

      </div>
    </div>
  );
}