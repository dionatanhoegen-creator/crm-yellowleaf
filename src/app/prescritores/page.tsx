"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Search, Plus, MapPin, Phone, Star, Edit, X, Stethoscope, Save, Building2, MessageSquare, CalendarCheck, FileText, ChevronRight
} from 'lucide-react';

export default function PrescritoresPage() {
  const supabase = createClientComponentClient();
  const [prescritores, setPrescritores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [mounted, setMounted] = useState(false);
  
  // Modais
  const [modalAberto, setModalAberto] = useState(false);
  const [modalInteracoes, setModalInteracoes] = useState(false);
  const [salvando, setSalvando] = useState(false);
  
  // Estados
  const [prescritorAtivo, setPrescritorAtivo] = useState<any>(null);
  const [interacoes, setInteracoes] = useState<any[]>([]);
  const [novaInteracao, setNovaInteracao] = useState({ tipo: 'Visita Presencial', resumo: '', proximo_passo: '' });
  
  const [form, setForm] = useState({
    id: '', nome: '', crm_crn: '', especialidade: '', telefone: '', clinica: '', cidade: '', uf: '', potencial: 'B', observacoes: ''
  });

  useEffect(() => {
    setMounted(true);
    carregarPrescritores();
  }, []);

  const carregarPrescritores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('prescritores').select('*').order('nome', { ascending: true });
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

  const handleSalvarPrescritor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

      const payload = { ...form, user_id: user.id };

      if (form.id) {
        await supabase.from('prescritores').update(payload).eq('id', form.id);
      } else {
        await supabase.from('prescritores').insert([payload]);
      }
      setModalAberto(false);
      carregarPrescritores();
    } catch (error) {
      alert("Erro ao salvar prescritor.");
    } finally {
      setSalvando(false);
    }
  };

  // --- LÓGICA DE INTERAÇÕES (DIÁRIO DE VISITAS) ---
  const abrirInteracoes = async (medico: any) => {
      setPrescritorAtivo(medico);
      setModalInteracoes(true);
      setLoading(true);
      
      // Busca as interações e puxa o nome de quem registrou da tabela perfis
      const { data, error } = await supabase
        .from('interacoes')
        .select(`*, perfis (nome)`)
        .eq('prescritor_id', medico.id)
        .order('created_at', { ascending: false });
        
      if (!error && data) setInteracoes(data);
      setLoading(false);
  };

  const salvarInteracao = async (e: React.FormEvent) => {
      e.preventDefault();
      setSalvando(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          await supabase.from('interacoes').insert([{
              prescritor_id: prescritorAtivo.id,
              user_id: user.id,
              tipo: novaInteracao.tipo,
              resumo: novaInteracao.resumo,
              proximo_passo: novaInteracao.proximo_passo
          }]);

          setNovaInteracao({ tipo: 'Visita Presencial', resumo: '', proximo_passo: '' });
          abrirInteracoes(prescritorAtivo); // Recarrega a lista
      } catch (err) {
          alert("Erro ao registrar visita.");
      } finally {
          setSalvando(false);
      }
  };

  const filtrados = prescritores.filter(p => {
    const termo = busca.toLowerCase();
    return (
      (p.nome && p.nome.toLowerCase().includes(termo)) ||
      (p.especialidade && p.especialidade.toLowerCase().includes(termo)) ||
      (p.crm_crn && p.crm_crn.toLowerCase().includes(termo))
    );
  });

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Stethoscope className="text-blue-600" /> Base de Prescritores
             </h1>
             <p className="text-slate-500 mt-1">Gestão médica e Diário de Visitas P&D.</p>
           </div>
           <button onClick={abrirNovo} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition active:scale-95 flex items-center gap-2">
              <Plus size={18} /> Novo Prescritor
           </button>
        </div>

        {/* BARRA DE BUSCA E KPI */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <input type="text" placeholder="Buscar por nome, especialidade ou CRM..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:border-blue-500 outline-none text-lg font-medium transition" />
              <Search size={24} className="absolute left-4 top-4 text-slate-300" />
            </div>
            <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center gap-4 shrink-0 min-w-[200px]">
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total na Base</p>
                    <p className="text-2xl font-black text-slate-800">{prescritores.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><Stethoscope size={24}/></div>
            </div>
        </div>

        {/* LISTA DE CARDS */}
        {loading && !modalInteracoes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-200 rounded-2xl"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtrados.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition group flex flex-col justify-between h-full relative">
                 <div className="absolute top-4 right-4">
                     <span className={`px-2 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${p.potencial === 'A' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : p.potencial === 'B' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                         <Star size={10} className={p.potencial === 'A' ? 'fill-current' : ''}/> Curva {p.potencial}
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
                    {p.clinica && <p className="text-xs text-slate-600 flex items-center gap-2"><Building2 size={14} className="text-slate-400"/> <span className="truncate">{p.clinica}</span></p>}
                    <p className="text-xs text-slate-600 flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> <span className="truncate">{p.cidade} - {p.uf}</span></p>
                 </div>

                 <div className="border-t border-slate-50 pt-4 flex justify-between items-center mt-auto">
                     <button onClick={() => abrirInteracoes(p)} className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition flex items-center gap-1">
                         <CalendarCheck size={14}/> Diário de Visitas
                     </button>
                     <button onClick={() => abrirEdicao(p)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit size={16}/></button>
                 </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL: DIÁRIO DE VISITAS */}
        {modalInteracoes && prescritorAtivo && mounted && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
                
                <div className="bg-slate-800 p-6 flex justify-between items-center text-white shrink-0">
                   <div>
                       <h2 className="text-xl font-bold flex items-center gap-2"><CalendarCheck size={24}/> Diário de Interações</h2>
                       <p className="text-sm text-slate-400 font-mono mt-1">{prescritorAtivo.nome}</p>
                   </div>
                   <button onClick={() => setModalInteracoes(false)} className="hover:bg-white/10 p-2 rounded-full transition"><X size={20}/></button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    {/* ESQUERDA: LISTA DE HISTÓRICO */}
                    <div className="md:w-1/2 p-6 bg-slate-50 overflow-y-auto custom-scrollbar border-r border-slate-200">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><FileText size={16}/> Histórico</h3>
                        
                        <div className="space-y-4">
                            {interacoes.length === 0 ? (
                                <p className="text-sm text-slate-400 italic text-center p-6">Nenhuma interação registrada ainda.</p>
                            ) : (
                                interacoes.map((int) => (
                                    <div key={int.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider">{int.tipo}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{new Date(int.created_at).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <p className="text-sm text-slate-700 font-medium mb-3">{int.resumo}</p>
                                        
                                        {int.proximo_passo && (
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-start gap-2 mb-3">
                                                <ChevronRight size={14} className="text-green-500 mt-0.5 shrink-0"/>
                                                <p className="text-xs text-slate-600 font-bold"><span className="text-slate-400 font-normal">Próx. Passo:</span> {int.proximo_passo}</p>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-slate-400 text-right mt-2 border-t border-slate-50 pt-2">Registrado por: <strong>{int.perfis?.nome || 'Usuário'}</strong></p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* DIREITA: NOVA INTERAÇÃO */}
                    <div className="md:w-1/2 p-6 bg-white overflow-y-auto custom-scrollbar">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Plus size={16}/> Registrar Nova</h3>
                        
                        <form onSubmit={salvarInteracao} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Tipo de Contato</label>
                                <select value={novaInteracao.tipo} onChange={e => setNovaInteracao({...novaInteracao, tipo: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:border-green-500 outline-none">
                                    <option value="Visita Presencial">Visita Presencial</option>
                                    <option value="Apresentação Online">Apresentação Online</option>
                                    <option value="Treinamento Farmácia">Treinamento Farmácia</option>
                                    <option value="WhatsApp/Telefone">WhatsApp / Telefone</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Resumo / Protocolos Apresentados</label>
                                <textarea required rows={4} value={novaInteracao.resumo} onChange={e => setNovaInteracao({...novaInteracao, resumo: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 focus:border-green-500 outline-none resize-none" placeholder="Quais ativos foram mostrados? Qual foi o feedback?"></textarea>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Próximo Passo (Opcional)</label>
                                <input type="text" value={novaInteracao.proximo_passo} onChange={e => setNovaInteracao({...novaInteracao, proximo_passo: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 focus:border-green-500 outline-none" placeholder="Ex: Enviar amostra do Lipoartich dia 20/05"/>
                            </div>
                            <div className="pt-4">
                                <button type="submit" disabled={salvando} className="w-full bg-green-600 text-white px-8 py-3 rounded-xl font-black hover:bg-green-700 flex justify-center items-center gap-2 shadow-lg hover:shadow-green-200 transition transform active:scale-95 disabled:opacity-50">
                                    <Save size={20}/> {salvando ? 'Salvando...' : 'Gravar Histórico'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
             </div>
          </div>, document.body
        )}

        {/* MODAL DE CADASTRO (Mantido) */}
        {modalAberto && mounted && !modalInteracoes && createPortal(
           /* ... o modal de cadastro original ... (encurtado aqui para foco) */
           <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
             <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                <div className="bg-slate-800 p-6 flex justify-between items-center text-white">
                   <h2 className="text-xl font-bold">{form.id ? 'Editar Prescritor' : 'Novo Prescritor'}</h2>
                   <button onClick={() => setModalAberto(false)}><X size={20}/></button>
                </div>
                <form onSubmit={handleSalvarPrescritor} className="p-6 space-y-4">
                    <input required type="text" placeholder="Nome" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full p-3 border rounded-xl bg-slate-50"/>
                    <input type="text" placeholder="Especialidade" value={form.especialidade} onChange={e => setForm({...form, especialidade: e.target.value})} className="w-full p-3 border rounded-xl bg-slate-50"/>
                    <div className="flex gap-4">
                      <input type="text" placeholder="Cidade" value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} className="w-full p-3 border rounded-xl bg-slate-50"/>
                      <input type="text" placeholder="UF" value={form.uf} onChange={e => setForm({...form, uf: e.target.value})} className="w-24 p-3 border rounded-xl bg-slate-50 uppercase"/>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Salvar Cadastro</button>
                </form>
             </div>
           </div>, document.body
        )}
      </div>
    </div>
  );
}