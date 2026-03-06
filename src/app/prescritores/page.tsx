"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Search, Plus, MapPin, Phone, Star, Edit, X, Stethoscope, Save, Building2
} from 'lucide-react';

export default function PrescritoresPage() {
  const supabase = createClientComponentClient();
  const [prescritores, setPrescritores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  
  // Modal de Cadastro/Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    id: '', nome: '', crm_crn: '', especialidade: '', telefone: '', clinica: '', cidade: '', uf: '', potencial: 'B', observacoes: ''
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    carregarPrescritores();
  }, []);

  const carregarPrescritores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prescritores')
        .select('*')
        .order('nome', { ascending: true });
        
      if (error) throw error;
      if (data) setPrescritores(data);
    } catch (error) {
      console.error("Erro ao carregar prescritores:", error);
    } finally {
      setLoading(false);
    }
  };

  const abrirNovo = () => {
    setForm({ id: '', nome: '', crm_crn: '', especialidade: '', telefone: '', clinica: '', cidade: '', uf: '', potencial: 'B', observacoes: '' });
    setModalAberto(true);
  };

  const abrirEdicao = (medico: any) => {
    setForm({ ...medico });
    setModalAberto(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

      const payload = {
        nome: form.nome,
        crm_crn: form.crm_crn,
        especialidade: form.especialidade,
        telefone: form.telefone,
        clinica: form.clinica,
        cidade: form.cidade,
        uf: form.uf,
        potencial: form.potencial,
        observacoes: form.observacoes,
        user_id: user.id
      };

      if (form.id) {
        // Atualiza existente
        await supabase.from('prescritores').update(payload).eq('id', form.id);
      } else {
        // Cria novo
        await supabase.from('prescritores').insert([payload]);
      }

      setModalAberto(false);
      carregarPrescritores(); // Recarrega a lista
    } catch (error) {
      alert("Erro ao salvar prescritor.");
      console.error(error);
    } finally {
      setSalvando(false);
    }
  };

  // Filtro de busca
  const filtrados = prescritores.filter(p => {
    const termo = busca.toLowerCase();
    return (
      (p.nome && p.nome.toLowerCase().includes(termo)) ||
      (p.especialidade && p.especialidade.toLowerCase().includes(termo)) ||
      (p.crm_crn && p.crm_crn.toLowerCase().includes(termo))
    );
  });

  const getCorPotencial = (potencial: string) => {
      if (potencial === 'A') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      if (potencial === 'B') return 'bg-blue-100 text-blue-700 border-blue-200';
      return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Stethoscope className="text-blue-600" /> Base de Prescritores
             </h1>
             <p className="text-slate-500 mt-1">Gestão de médicos, nutricionistas e profissionais de saúde.</p>
           </div>
           <button 
              onClick={abrirNovo}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition active:scale-95 flex items-center gap-2"
           >
              <Plus size={18} /> Novo Prescritor
           </button>
        </div>

        {/* BARRA DE BUSCA E KPI */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Buscar por nome, especialidade ou CRM..." 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:border-blue-500 outline-none text-lg font-medium transition"
              />
              <Search size={24} className="absolute left-4 top-4 text-slate-300" />
            </div>
            
            <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center gap-4 shrink-0 min-w-[200px]">
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total na Base</p>
                    <p className="text-2xl font-black text-slate-800">{prescritores.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                    <Stethoscope size={24}/>
                </div>
            </div>
        </div>

        {/* LISTA DE CARDS */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-slate-200 rounded-2xl"></div>)}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-3xl border border-slate-100">
              <Stethoscope size={48} className="mx-auto text-slate-300 mb-4"/>
              <h3 className="text-xl font-bold text-slate-700">Nenhum prescritor encontrado</h3>
              <p className="text-slate-500 mt-2">Cadastre o seu primeiro médico para iniciar a gestão.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtrados.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition group flex flex-col justify-between h-full relative">
                 
                 <div className="absolute top-4 right-4">
                     <span className={`px-2 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${getCorPotencial(p.potencial)}`}>
                         <Star size={10} className={p.potencial === 'A' ? 'fill-current' : ''}/> 
                         Curva {p.potencial}
                     </span>
                 </div>

                 <div className="flex gap-4 items-start mb-4 pr-20">
                    <div className="w-12 h-12 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                        {p.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-black text-lg text-slate-800 leading-tight">{p.nome}</h3>
                        <p className="text-sm font-bold text-blue-600">{p.especialidade || 'Clínico Geral'}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.crm_crn || 'CRM/CRN N/D'}</p>
                    </div>
                 </div>

                 <div className="space-y-2 mb-6">
                    {p.clinica && (
                        <p className="text-xs text-slate-600 flex items-center gap-2">
                            <Building2 size={14} className="text-slate-400"/> <span className="truncate">{p.clinica}</span>
                        </p>
                    )}
                    <p className="text-xs text-slate-600 flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400"/> <span className="truncate">{p.cidade} - {p.uf}</span>
                    </p>
                    {p.telefone && (
                        <p className="text-xs text-slate-600 flex items-center gap-2">
                            <Phone size={14} className="text-slate-400"/> {p.telefone}
                        </p>
                    )}
                 </div>

                 <div className="border-t border-slate-50 pt-4 flex justify-between items-center mt-auto">
                     <button className="text-xs font-bold text-slate-400 hover:text-blue-600 transition">Ver Interações</button>
                     <button onClick={() => abrirEdicao(p)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                         <Edit size={16}/>
                     </button>
                 </div>
              </div>
            ))}
          </div>
        )}

        {/* --- MODAL DE CADASTRO/EDIÇÃO --- */}
        {modalAberto && mounted && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
                
                <div className="bg-slate-800 p-6 flex justify-between items-center text-white shrink-0">
                   <h2 className="text-xl font-bold flex items-center gap-2">
                       <Stethoscope size={24}/> {form.id ? 'Editar Prescritor' : 'Novo Prescritor'}
                   </h2>
                   <button onClick={() => setModalAberto(false)} className="hover:bg-white/10 p-2 rounded-full transition"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSalvar} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                        
                        {/* BLOCO 1: DADOS PRINCIPAIS */}
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">1. Dados do Profissional</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Nome Completo (com Dr./Dra. se desejar)</label>
                                    <input required type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 focus:border-blue-500 outline-none"/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Especialidade (Ex: Dermatologista)</label>
                                    <input type="text" value={form.especialidade} onChange={e => setForm({...form, especialidade: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 focus:border-blue-500 outline-none"/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">CRM ou CRN</label>
                                    <input type="text" value={form.crm_crn} onChange={e => setForm({...form, crm_crn: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 focus:border-blue-500 outline-none"/>
                                </div>
                            </div>
                        </div>

                        {/* BLOCO 2: LOCALIZAÇÃO E CONTATO */}
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">2. Local de Atendimento</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-3">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Nome da Clínica / Consultório</label>
                                    <input type="text" value={form.clinica} onChange={e => setForm({...form, clinica: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 focus:border-blue-500 outline-none"/>
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Telefone / WhatsApp</label>
                                    <input type="text" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 focus:border-blue-500 outline-none"/>
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Cidade</label>
                                    <input type="text" value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 focus:border-blue-500 outline-none"/>
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Estado (UF)</label>
                                    <input type="text" value={form.uf} maxLength={2} placeholder="SP" onChange={e => setForm({...form, uf: e.target.value.toUpperCase()})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 focus:border-blue-500 outline-none uppercase"/>
                                </div>
                            </div>
                        </div>

                        {/* BLOCO 3: POTENCIAL */}
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">3. Classificação e Notas</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Potencial de Prescrição</label>
                                    <select value={form.potencial} onChange={e => setForm({...form, potencial: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 outline-none cursor-pointer focus:border-blue-500">
                                        <option value="A">Curva A (Alto Potencial)</option>
                                        <option value="B">Curva B (Médio Potencial)</option>
                                        <option value="C">Curva C (Baixo Potencial)</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Observações Gerais</label>
                                    <textarea rows={2} value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 focus:border-blue-500 outline-none resize-none placeholder-slate-300" placeholder="Ex: Gosta muito de prescrever ativos naturais..."></textarea>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
                        <button type="button" onClick={() => setModalAberto(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition">Cancelar</button>
                        <button type="submit" disabled={salvando} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black hover:bg-blue-700 flex items-center gap-2 shadow-lg hover:shadow-blue-200 transition transform active:scale-95 disabled:opacity-50">
                            <Save size={20}/> {salvando ? 'Salvando...' : 'Salvar Prescritor'}
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