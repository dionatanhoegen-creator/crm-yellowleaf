"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Shield, User, Search, Activity, Save, X, Lock, CheckCircle2, LayoutDashboard, Trello, Stethoscope, Users, Lightbulb, Package, FileText
} from 'lucide-react';

// Lista de todos os módulos que existem no sistema (baseado no seu layout.tsx)
const MODULOS_SISTEMA = [
  { key: 'pipeline', label: 'Pipeline Comercial', icon: Trello, desc: 'Gestão de funil de propostas e CRM Comercial.' },
  { key: 'prescritores', label: 'Prescritores & Visitas P&D', icon: Stethoscope, desc: 'Gestão de médicos, diário de visitas e Kanban de P&D.' },
  { key: 'inteligencia', label: 'Inteligência de Mercado', icon: Lightbulb, desc: 'Deep Search e histórico de compras de farmácias.' },
  { key: 'clientes', label: 'Base de Clientes', icon: Users, desc: 'Visualização da carteira e ERP.' },
  { key: 'produtos', label: 'Produtos e Preços', icon: Package, desc: 'Tabela completa de ativos.' },
  { key: 'exclusividades', label: 'Gestão de Exclusividades', icon: Lock, desc: 'Bloqueios e regras regionais.' },
  { key: 'faturamento', label: 'Dashboard & Faturamento', icon: LayoutDashboard, desc: 'Métricas financeiras e painel inicial.' },
  { key: 'relatorios', label: 'Relatórios Gerais', icon: FileText, desc: 'Extração de dados gerenciais.' },
  { key: 'admin', label: 'Acesso Administrador', icon: Shield, desc: 'Controle total de acessos e configurações do sistema.' }
];

export default function EquipePage() {
  const supabase = createClientComponentClient();
  
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [mounted, setMounted] = useState(false);

  // Modal de Acessos
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<any>(null);
  const [acessosForm, setAcessosForm] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setMounted(true);
    carregarEquipe();
  }, []);

  const carregarEquipe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('perfis').select('*').order('nome');
      if (error) throw error;
      setUsuarios(data || []);
    } catch (e) {
      console.error("Erro ao carregar usuários:", e);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalAcessos = (user: any) => {
      setUsuarioEditando(user);
      // Puxa os acessos atuais do usuário ou cria um objeto vazio se ele for novo
      setAcessosForm(user.acessos || {});
      setModalAberto(true);
  };

  const toggleAcesso = (key: string) => {
      setAcessosForm(prev => ({
          ...prev,
          [key]: !prev[key]
      }));
  };

  const salvarAcessos = async (e: React.FormEvent) => {
      e.preventDefault();
      setSalvando(true);
      try {
          const { error } = await supabase
              .from('perfis')
              .update({ acessos: acessosForm })
              .eq('id', usuarioEditando.id);

          if (error) throw error;
          
          setModalAberto(false);
          carregarEquipe();
      } catch (err: any) {
          alert(`Erro ao salvar permissões: ${err.message}`);
      } finally {
          setSalvando(false);
      }
  };

  const filtrados = usuarios.filter(u => 
      (u.nome && u.nome.toLowerCase().includes(busca.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-6xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
           <div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Shield className="text-blue-600" size={32} /> Gestão de Equipe e Acessos
             </h1>
             <p className="text-slate-500 mt-1 font-medium">Controle os módulos que cada membro da YellowLeaf pode visualizar.</p>
           </div>
        </div>

        {/* BARRA DE BUSCA */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <input 
                  type="text" 
                  placeholder="Buscar por nome ou e-mail..." 
                  value={busca} 
                  onChange={(e) => setBusca(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:border-blue-500 outline-none text-lg font-medium transition" 
              />
              <Search size={24} className="absolute left-4 top-4 text-slate-300" />
            </div>
            <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center gap-4 shrink-0">
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Usuários Ativos</p>
                    <p className="text-3xl font-black text-slate-800">{usuarios.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Users size={24}/></div>
            </div>
        </div>

        {/* LISTA DE USUÁRIOS */}
        {loading ? (
            <div className="flex justify-center items-center py-20">
                <Activity className="animate-spin text-blue-500" size={40} />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filtrados.map(u => (
                    <div key={u.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-800 text-white rounded-full flex items-center justify-center font-black text-xl shrink-0">
                                {(u.nome || u.email || 'U').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-black text-lg text-slate-800 leading-tight">{u.nome || 'Usuário Sem Nome'}</h3>
                                <p className="text-sm font-medium text-slate-500 mb-1">{u.email}</p>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${u.cargo === 'admin' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                    {u.cargo === 'admin' ? 'Administrador' : 'Consultor'}
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={() => abrirModalAcessos(u)} 
                            className="w-full md:w-auto text-xs font-bold text-slate-700 bg-slate-100 px-5 py-3 rounded-xl hover:bg-blue-600 hover:text-white transition flex items-center justify-center gap-2"
                        >
                            <Lock size={14}/> Permissões
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* MODAL DE PERMISSÕES */}
        {modalAberto && usuarioEditando && mounted && createPortal(
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    
                    <div className="bg-[#1e293b] p-6 md:p-8 flex justify-between items-center text-white shrink-0">
                        <div>
                            <span className="bg-blue-500 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest mb-2 inline-block">Central de Segurança</span>
                            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">Acessos: {usuarioEditando.nome}</h2>
                        </div>
                        <button onClick={() => setModalAberto(false)} className="hover:bg-white/20 p-2 rounded-full transition bg-white/10"><X size={20}/></button>
                    </div>

                    <form onSubmit={salvarAcessos} className="flex flex-col flex-1 overflow-hidden">
                        <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar bg-slate-50 space-y-3">
                            <p className="text-sm font-medium text-slate-500 mb-4">Ative os interruptores abaixo para liberar os módulos na barra superior e lateral deste usuário.</p>
                            
                            <div className="grid grid-cols-1 gap-3">
                                {MODULOS_SISTEMA.map(mod => {
                                    const temAcesso = acessosForm[mod.key] === true;
                                    
                                    return (
                                        <div 
                                            key={mod.key} 
                                            onClick={() => toggleAcesso(mod.key)}
                                            className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${temAcesso ? 'bg-blue-50/50 border-blue-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${temAcesso ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                    <mod.icon size={24} />
                                                </div>
                                                <div>
                                                    <h4 className={`font-black text-base leading-tight ${temAcesso ? 'text-blue-900' : 'text-slate-700'}`}>{mod.label}</h4>
                                                    <p className={`text-xs font-medium ${temAcesso ? 'text-blue-700' : 'text-slate-500'}`}>{mod.desc}</p>
                                                </div>
                                            </div>
                                            
                                            {/* Custom Toggle Switch */}
                                            <div className={`w-14 h-8 rounded-full flex items-center p-1 transition-colors duration-300 ${temAcesso ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${temAcesso ? 'translate-x-6' : 'translate-x-0'}`}>
                                                    {temAcesso && <CheckCircle2 size={14} className="text-blue-600"/>}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="p-6 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setModalAberto(false)} className="px-6 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition text-sm">Cancelar</button>
                            <button type="submit" disabled={salvando} className="bg-[#0f392b] text-white px-8 py-3 rounded-xl font-black hover:bg-[#16503c] flex items-center gap-2 shadow-lg disabled:opacity-50 text-sm transition transform active:scale-95 uppercase tracking-wide">
                                {salvando ? <Activity className="animate-spin" size={16}/> : <Save size={16}/>} {salvando ? 'Salvando...' : 'Salvar Permissões'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>, document.body
        )}
      </div>
    </div>
  );
}