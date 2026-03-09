"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Search, Plus, MapPin, Phone, Star, Edit, X, Stethoscope, Save, Building2, CalendarCheck, FileText, ChevronRight, User, Hash, AlignLeft, Activity
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
  
  // Formulário com os novos campos
  const [form, setForm] = useState({
    id: '', nome: '', crm_crn: '', especialidade: '', telefone: '', clinica: '', 
    endereco: '', bairro: '', cidade: '', uf: '', 
    potencial: 'B', perfil_prescritor: 'Inovador', observacoes: ''
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
    setForm({ 
      id: '', nome: '', crm_crn: '', especialidade: '', telefone: '', clinica: '', 
      endereco: '', bairro: '', cidade: '', uf: '', 
      potencial: 'B', perfil_prescritor: 'Inovador', observacoes: '' 
    });
    setModalAberto(true);
  };

  const abrirEdicao = (medico: any) => {
    setForm({ 
        ...medico,
        endereco: medico.endereco || '',
        bairro: medico.bairro || '',
        perfil_prescritor: medico.perfil_prescritor || 'Inovador'
    });
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
      (p.crm_crn && p.crm_crn.toLowerCase().includes(termo)) ||
      (p.clinica && p.clinica.toLowerCase().includes(termo))
    );
  });

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
           <div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Stethoscope className="text-blue-600" /> Base de Prescritores
             </h1>
             <p className="text-slate-500 mt-1">Gestão médica e Diário de Visitas P&D.</p>
           </div>
           <button onClick={abrirNovo} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition active:scale-95 flex items-center gap-2">
              <Plus size={18} /> Novo Prescritor
           </button>
        </div>

        {/* BARRA DE BUSCA E KPI */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <input type="text" placeholder="Buscar por nome, especialidade, CRM ou clínica..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:border-blue-500 outline-none text-lg font-medium transition" />
              <Search size={24} className="absolute left-4 top-4 text-slate-300" />
            </div>
            <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center gap-4 shrink-0 min-w-[200px]">
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total na Base</p>
                    <p className="text-3xl font-black text-slate-800">{prescritores.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Stethoscope size={24}/></div>
            </div>
        </div>

        {/* LISTA DE CARDS */}
        {loading && !modalInteracoes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-56 bg-slate-200 rounded-2xl"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtrados.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition group flex flex-col justify-between h-full relative">
                 <div className="absolute top-4 right-4">
                     <span className={`px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${p.potencial === 'A' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : p.potencial === 'B' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                         <Star size={10} className={p.potencial === 'A' ? 'fill-current' : ''}/> Curva {p.potencial}
                     </span>
                 </div>

                 <div className="flex gap-4 items-start mb-4 pr-20">
                    <div className="w-14 h-14 bg-slate-800 text-white rounded-xl flex items-center justify-center font-black text-xl shrink-0 shadow-sm">
                        {p.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-black text-lg text-slate-800 leading-tight line-clamp-2" title={p.nome}>{p.nome}</h3>
                        <p className="text-sm font-bold text-blue-600 mt-1">{p.especialidade || 'Clínico Geral'}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.crm_crn || 'CRM/CRN N/D'}</p>
                    </div>
                 </div>

                 <div className="space-y-2 mb-4 flex-1">
                    {p.clinica && (
                        <p className="text-xs text-slate-600 flex items-start gap-2">
                            <Building2 size={14} className="text-slate-400 shrink-0 mt-0.5"/> 
                            <span className="line-clamp-1" title={p.clinica}>{p.clinica}</span>
                        </p>
                    )}
                    {p.telefone && (
                        <p className="text-xs text-slate-600 flex items-center gap-2">
                            <Phone size={14} className="text-slate-400 shrink-0"/> 
                            <a href={`tel:${p.telefone}`} className="hover:text-blue-600 font-medium">{p.telefone}</a>
                        </p>
                    )}
                    <p className="text-xs text-slate-600 flex items-start gap-2">
                        <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5"/> 
                        <span className="line-clamp-2">{p.endereco ? `${p.endereco}${p.bairro ? `, ${p.bairro}` : ''} - ` : ''}{p.cidade}/{p.uf}</span>
                    </p>
                 </div>

                 <div className="border-t border-slate-100 pt-4 flex justify-between items-center mt-auto">
                     <button onClick={() => abrirInteracoes(p)} className="text-xs font-bold text-green-700 bg-green-50 border border-green-100 px-4 py-2 rounded-xl hover:bg-green-600 hover:text-white transition flex items-center gap-2">
                         <CalendarCheck size={14}/> Diário de Visitas
                     </button>
                     <button onClick={() => abrirEdicao(p)} className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition flex items-center gap-2">
                         <Edit size={14}/> Editar
                     </button>
                 </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL: DIÁRIO DE VISITAS */}
        {modalInteracoes && prescritorAtivo && mounted && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
                
                <div className="bg-[#1e293b] p-6 flex justify-between items-center text-white shrink-0">
                   <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center font-bold text-xl backdrop-blur-sm">
                           {prescritorAtivo.nome.substring(0, 2).toUpperCase()}
                       </div>
                       <div>
                           <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><CalendarCheck className="text-blue-400"/> Diário de P&D</h2>
                           <p className="text-sm text-slate-300 font-medium mt-0.5">{prescritorAtivo.nome} ({prescritorAtivo.especialidade})</p>
                       </div>
                   </div>
                   <button onClick={() => setModalInteracoes(false)} className="hover:bg-white/20 p-2 rounded-full transition bg-white/10 text-white"><X size={20}/></button>
                </div>

                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                    {/* ESQUERDA: LISTA DE HISTÓRICO */}
                    <div className="lg:w-1/2 p-6 lg:p-8 bg-slate-50 overflow-y-auto custom-scrollbar border-r border-slate-200">
                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200 pb-3"><FileText className="text-blue-600" size={20}/> Histórico de Interações</h3>
                        
                        <div className="space-y-4">
                            {interacoes.length === 0 ? (
                                <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 border-dashed">
                                    <FileText size={32} className="mx-auto text-slate-300 mb-2"/>
                                    <p className="text-sm text-slate-500 font-medium">Nenhuma visita registrada.</p>
                                </div>
                            ) : (
                                interacoes.map((int) => (
                                    <div key={int.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative group hover:border-blue-200 transition">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md uppercase tracking-wider">{int.tipo}</span>
                                            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">{new Date(int.created_at).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <p className="text-sm text-slate-800 font-medium mb-4 whitespace-pre-wrap leading-relaxed">{int.resumo}</p>
                                        
                                        {int.proximo_passo && (
                                            <div className="bg-green-50/50 p-3 rounded-xl border border-green-200 flex items-start gap-2 mb-3">
                                                <ChevronRight size={16} className="text-green-600 mt-0.5 shrink-0"/>
                                                <p className="text-sm text-slate-700 font-medium"><span className="text-green-800 font-bold uppercase text-[10px] tracking-wider block mb-0.5">Próximo Passo</span> {int.proximo_passo}</p>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest text-right mt-2 border-t border-slate-100 pt-3">
                                            Visitado por: <strong className="text-slate-600">{int.perfis?.nome || 'Usuário'}</strong>
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* DIREITA: NOVA INTERAÇÃO */}
                    <div className="lg:w-1/2 p-6 lg:p-8 bg-white overflow-y-auto custom-scrollbar">
                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200 pb-3"><Plus className="text-green-600" size={20}/> Registrar Nova Visita</h3>
                        
                        <form onSubmit={salvarInteracao} className="space-y-5">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 block">Tipo de Contato</label>
                                <select value={novaInteracao.tipo} onChange={e => setNovaInteracao({...novaInteracao, tipo: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-xl text-base font-medium text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm">
                                    <option value="Visita Presencial">Visita Presencial</option>
                                    <option value="Apresentação Online">Apresentação Online</option>
                                    <option value="Evento / Congresso">Evento / Congresso</option>
                                    <option value="WhatsApp/Telefone">WhatsApp / Telefone</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 block">Resumo e Ativos Apresentados *</label>
                                <textarea required rows={6} value={novaInteracao.resumo} onChange={e => setNovaInteracao({...novaInteracao, resumo: e.target.value})} className="w-full p-4 border border-slate-300 rounded-xl text-base font-medium text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition shadow-sm" placeholder="Descreva os protocolos discutidos, produtos apresentados, interesse do médico, objeções..."></textarea>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 block">Próximo Passo (Ação futura)</label>
                                <input type="text" value={novaInteracao.proximo_passo} onChange={e => setNovaInteracao({...novaInteracao, proximo_passo: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-xl text-base font-medium text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm" placeholder="Ex: Enviar literatura do Lipoartich na próxima terça..."/>
                            </div>
                            <div className="pt-6 mt-6">
                                <button type="submit" disabled={salvando} className="w-full bg-blue-600 text-white h-14 rounded-xl font-black hover:bg-blue-700 flex justify-center items-center gap-2 shadow-lg shadow-blue-200 transition transform active:scale-95 disabled:opacity-50 text-base">
                                    {salvando ? <Activity className="animate-spin" size={20}/> : <Save size={20}/>} {salvando ? 'Salvando...' : 'Gravar Histórico'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
             </div>
          </div>, document.body
        )}

        {/* MODAL DE CADASTRO CORPORATIVO (ALTO CONTRASTE) */}
        {modalAberto && mounted && !modalInteracoes && createPortal(
           <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
             <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col my-8">
                
                {/* Cabeçalho do Modal */}
                <div className="bg-[#1e293b] p-6 md:p-8 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
                   <div className="absolute -right-4 -top-4 text-white/5 transform rotate-12"><User size={150}/></div>
                   <div className="relative z-10">
                       <span className="bg-blue-500 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest mb-3 inline-block shadow-sm">Gestão de Base</span>
                       <h2 className="text-2xl font-black tracking-tight">{form.id ? 'Editar Prescritor' : 'Cadastrar Prescritor'}</h2>
                   </div>
                   <button type="button" onClick={() => setModalAberto(false)} className="hover:bg-white/20 p-2 rounded-full transition bg-white/10 text-white relative z-10"><X size={24}/></button>
                </div>
                
                <form onSubmit={handleSalvarPrescritor} className="p-6 md:p-8">
                    
                    {/* Seção 1 */}
                    <h3 className="text-lg font-black text-slate-800 mb-5 flex items-center gap-2 border-b border-slate-200 pb-3">
                        <User className="text-blue-600" size={20}/> Informações Profissionais
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                        <div>
                            <label className="text-sm font-bold text-slate-700 mb-1.5 block">Nome Completo *</label>
                            <input required type="text" placeholder="Ex: Dr. Carlos Silva" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700 mb-1.5 block">CRM / CRN</label>
                            <input type="text" placeholder="Ex: CRM-SP 123456" value={form.crm_crn} onChange={e => setForm({...form, crm_crn: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700 mb-1.5 block">Especialidade Principal</label>
                            <input type="text" placeholder="Ex: Dermatologia, Nutrologia..." value={form.especialidade} onChange={e => setForm({...form, especialidade: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1.5 block">Curva (Potencial)</label>
                                <select value={form.potencial} onChange={e => setForm({...form, potencial: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 cursor-pointer shadow-sm">
                                    <option value="A">Curva A (Alto)</option>
                                    <option value="B">Curva B (Médio)</option>
                                    <option value="C">Curva C (Baixo)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1.5 block">Perfil</label>
                                <select value={form.perfil_prescritor} onChange={e => setForm({...form, perfil_prescritor: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 cursor-pointer shadow-sm">
                                    <option value="Inovador">Inovador</option>
                                    <option value="Tradicional">Tradicional</option>
                                    <option value="Questionador">Questionador</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Seção 2 */}
                    <h3 className="text-lg font-black text-slate-800 mb-5 flex items-center gap-2 border-b border-slate-200 pb-3">
                        <Building2 className="text-blue-600" size={20}/> Dados de Contato e Localização
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                        <div>
                            <label className="text-sm font-bold text-slate-700 mb-1.5 block">Nome da Clínica / Consultório</label>
                            <input type="text" placeholder="Ex: Clínica Saúde Vita" value={form.clinica} onChange={e => setForm({...form, clinica: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700 mb-1.5 block">Telefone / WhatsApp da Secretária</label>
                            <input type="text" placeholder="(00) 00000-0000" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-bold text-slate-700 mb-1.5 block">Endereço Completo</label>
                            <input type="text" placeholder="Rua, Número, Sala/Andar..." value={form.endereco} onChange={e => setForm({...form, endereco: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                        </div>
                        <div className="grid grid-cols-12 gap-4 md:col-span-2">
                            <div className="col-span-12 md:col-span-5">
                                <label className="text-sm font-bold text-slate-700 mb-1.5 block">Bairro</label>
                                <input type="text" placeholder="Bairro" value={form.bairro} onChange={e => setForm({...form, bairro: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                            </div>
                            <div className="col-span-8 md:col-span-5">
                                <label className="text-sm font-bold text-slate-700 mb-1.5 block">Cidade</label>
                                <input type="text" placeholder="Cidade" value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                            </div>
                            <div className="col-span-4 md:col-span-2">
                                <label className="text-sm font-bold text-slate-700 mb-1.5 block">UF</label>
                                <input type="text" placeholder="UF" value={form.uf} onChange={e => setForm({...form, uf: e.target.value})} maxLength={2} className="w-full p-3.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-bold uppercase text-center text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                            </div>
                        </div>
                    </div>

                    {/* Seção 3 */}
                    <h3 className="text-lg font-black text-slate-800 mb-5 flex items-center gap-2 border-b border-slate-200 pb-3">
                        <AlignLeft className="text-blue-600" size={20}/> Anotações de P&D
                    </h3>
                    <div className="mb-10">
                        <label className="text-sm font-bold text-slate-700 mb-1.5 block">Observações Gerais</label>
                        <textarea rows={3} value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} className="w-full p-4 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm resize-none transition" placeholder="Perfil de prescrição, concorrentes que utiliza, hobbies para relacionamento..."></textarea>
                    </div>

                    <div className="flex flex-col-reverse md:flex-row gap-4 pt-6 border-t border-slate-200">
                        <button type="button" onClick={() => setModalAberto(false)} className="w-full md:w-auto px-8 py-4 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition text-base">Cancelar</button>
                        <button type="submit" disabled={salvando} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black hover:bg-blue-700 shadow-lg shadow-blue-200 transition transform active:scale-95 disabled:opacity-50 text-base flex justify-center items-center gap-2">
                           {salvando ? <Activity className="animate-spin" size={20}/> : <Save size={20}/>} {salvando ? 'Salvando...' : 'Gravar Ficha do Prescritor'}
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