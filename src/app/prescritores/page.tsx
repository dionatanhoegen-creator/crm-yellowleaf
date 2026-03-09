"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Search, Plus, MapPin, Phone, Star, Edit, X, Stethoscope, Save, Building2, CalendarCheck, FileText, ChevronRight, User, AlignLeft, Activity, Trash2, Clock, Beaker, Check, AlertCircle, ChevronDown, MessageCircle
} from 'lucide-react';

const API_PRODUTOS_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

const LISTA_ESPECIALIDADES = [
  "Cardiologia", "Clínico Geral", "Dermatologia", "Endocrinologia", 
  "Estética", "Gastroenterologia", "Geriatria", "Ginecologia", 
  "Medicina Esportiva", "Neurologia", "Nutrição", "Nutrição Esportiva", 
  "Nutrologia", "Odontologia", "Ortopedia", "Pediatria", 
  "Psiquiatria", "Reumatologia", "Urologia"
];

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
  const [excluindo, setExcluindo] = useState(false);
  
  // Estados para a inteligência de interações (Diário)
  const [prescritorAtivo, setPrescritorAtivo] = useState<any>(null);
  const [interacoes, setInteracoes] = useState<any[]>([]);
  
  // Combobox Produtos
  const [produtosApi, setProdutosApi] = useState<string[]>([]);
  const [termoProdutoDropdown, setTermoProdutoDropdown] = useState("");
  const [dropdownProdutosAberto, setDropdownProdutosAberto] = useState(false);
  
  // Combobox Farmácias
  const [farmaciasBuscadas, setFarmaciasBuscadas] = useState<any[]>([]);
  const [dropdownFarmaciaAberto, setDropdownFarmaciaAberto] = useState(false);

  const [novaInteracao, setNovaInteracao] = useState({ 
      tipo: 'Visita Presencial', 
      resumo: '', 
      proximo_passo: '',
      farmacia_vinculada: '',
      produtos_vinculados: [] as string[],
      data_proximo_contato: ''
  });
  
  // Formulário de Cadastro
  const [form, setForm] = useState({
    id: '', nome: '', crm_crn: '', especialidade: '', telefone: '', clinica: '', 
    endereco: '', bairro: '', cidade: '', uf: '', 
    potencial: 'B', perfil_prescritor: 'Inovador', observacoes: '', proximo_contato: ''
  });

  useEffect(() => {
    setMounted(true);
    carregarPrescritores();
    carregarListaProdutos();
  }, []);

  const carregarListaProdutos = async () => {
    try {
        const res = await fetch(`${API_PRODUTOS_URL}?path=produtos`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            const listaNomes = json.data.map((p: any) => p.ativo?.trim()).filter(Boolean);
            setProdutosApi(Array.from(new Set(listaNomes)).sort() as string[]);
        }
    } catch (e) { console.error("Erro API Produtos:", e); }
  };

  const carregarPrescritores = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase.from('perfis').select('cargo, nome').eq('id', user.id).single();

      let query = supabase.from('prescritores').select('*').order('nome', { ascending: true });
      if (perfil && perfil.cargo !== 'admin') {
          query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
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
      potencial: 'B', perfil_prescritor: 'Inovador', observacoes: '', proximo_contato: ''
    });
    setModalAberto(true);
  };

  const abrirEdicao = (medico: any) => {
    setForm({ 
        ...medico,
        endereco: medico.endereco || '',
        bairro: medico.bairro || '',
        perfil_prescritor: medico.perfil_prescritor || 'Inovador',
        proximo_contato: medico.proximo_contato || ''
    });
    setModalAberto(true);
  };

  const handleSalvarPrescritor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      const payload = { 
          nome: form.nome, crm_crn: form.crm_crn, especialidade: form.especialidade, 
          telefone: form.telefone, clinica: form.clinica, endereco: form.endereco, 
          bairro: form.bairro, cidade: form.cidade, uf: form.uf, 
          potencial: form.potencial, perfil_prescritor: form.perfil_prescritor, 
          observacoes: form.observacoes, proximo_contato: form.proximo_contato || null,
          user_id: user.id 
      };

      if (form.id) {
        await supabase.from('prescritores').update(payload).eq('id', form.id);
      } else {
        await supabase.from('prescritores').insert([payload]);
      }
      setModalAberto(false);
      carregarPrescritores();
    } catch (error: any) {
      alert(`Falha ao salvar: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirPrescritor = async () => {
      if (!confirm(`Tem certeza que deseja EXCLUIR o prescritor ${form.nome}? Todo o histórico será perdido.`)) return;
      setExcluindo(true);
      try {
          await supabase.from('prescritores').delete().eq('id', form.id);
          setModalAberto(false);
          carregarPrescritores();
      } catch (error: any) { alert(`Erro ao excluir: ${error.message}`); } 
      finally { setExcluindo(false); }
  };

  // --- FUNÇÕES DO DIÁRIO / PIPELINE DE P&D ---
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

  const buscarFarmaciaDB = async (termo: string) => {
      setNovaInteracao({...novaInteracao, farmacia_vinculada: termo});
      setDropdownFarmaciaAberto(true);
      
      if (termo.length > 2) {
          const { data } = await supabase.from('base_clientes').select('fantasia').ilike('fantasia', `%${termo}%`).limit(5);
          setFarmaciasBuscadas(data || []);
      } else {
          setFarmaciasBuscadas([]);
      }
  };

  const toggleAtivo = (ativo: string) => {
      const atual = novaInteracao.produtos_vinculados;
      if (atual.includes(ativo)) {
          setNovaInteracao({...novaInteracao, produtos_vinculados: atual.filter(a => a !== ativo)});
      } else {
          setNovaInteracao({...novaInteracao, produtos_vinculados: [...atual, ativo]});
      }
      setTermoProdutoDropdown("");
  };

  const salvarInteracao = async (e: React.FormEvent) => {
      e.preventDefault();
      setSalvando(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // 1. Grava a interação com os novos campos e joga direto para 'realizado' no Kanban
          await supabase.from('interacoes').insert([{
              prescritor_id: prescritorAtivo.id,
              user_id: user.id,
              tipo: novaInteracao.tipo,
              resumo: novaInteracao.resumo,
              proximo_passo: novaInteracao.proximo_passo,
              farmacia_vinculada: novaInteracao.farmacia_vinculada,
              produtos_vinculados: novaInteracao.produtos_vinculados.join(';'),
              data_proximo_contato: novaInteracao.data_proximo_contato || null,
              status: 'realizado' // Entra como realizado por padrão
          }]);

          // 2. Atualiza a data de follow-up no card principal do médico
          if (novaInteracao.data_proximo_contato) {
              await supabase.from('prescritores').update({ proximo_contato: novaInteracao.data_proximo_contato }).eq('id', prescritorAtivo.id);
          }

          setNovaInteracao({ tipo: 'Visita Presencial', resumo: '', proximo_passo: '', farmacia_vinculada: '', produtos_vinculados: [], data_proximo_contato: '' });
          abrirInteracoes(prescritorAtivo); 
          carregarPrescritores(); 
      } catch (err: any) {
          alert(`Erro ao registrar visita: ${err.message}`);
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

  const isAtrasado = (dataISO: string) => {
      if (!dataISO) return false;
      const hoje = new Date().toISOString().split('T')[0];
      return dataISO < hoje;
  };

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
            {filtrados.length === 0 && (
                <div className="col-span-full text-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <Stethoscope size={48} className="mx-auto text-slate-300 mb-4"/>
                    <p className="text-slate-500 font-bold text-lg">Nenhum prescritor encontrado.</p>
                </div>
            )}
            {filtrados.map((p) => {
              const alertaAtraso = isAtrasado(p.proximo_contato);

              return (
              <div key={p.id} className={`bg-white rounded-2xl p-5 border shadow-sm transition group flex flex-col justify-between h-full relative ${alertaAtraso ? 'border-red-300 hover:shadow-red-100' : 'border-slate-100 hover:shadow-md hover:border-blue-200'}`}>
                 
                 {p.proximo_contato && (
                    <div className="absolute top-0 left-0 w-full flex justify-center -mt-3">
                        <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5 border ${alertaAtraso ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {alertaAtraso ? <AlertCircle size={12}/> : <Clock size={12}/>} 
                            Retorno: {new Date(p.proximo_contato).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                        </span>
                    </div>
                 )}

                 <div className="absolute top-4 right-4">
                     <span className={`px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${p.potencial === 'A' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : p.potencial === 'B' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                         <Star size={10} className={p.potencial === 'A' ? 'fill-current' : ''}/> Curva {p.potencial}
                     </span>
                 </div>

                 <div className="flex gap-4 items-start mb-4 pr-20 mt-2">
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
                 </div>

                 <div className="border-t border-slate-100 pt-4 flex justify-between items-center mt-auto">
                     <button onClick={() => abrirInteracoes(p)} className={`text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-2 ${alertaAtraso ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white' : 'bg-green-50 text-green-700 border border-green-100 hover:bg-green-600 hover:text-white'}`}>
                         <CalendarCheck size={14}/> Diário de Visitas
                     </button>
                     <div className="flex items-center gap-2">
                        {p.telefone && (
                            <a href={`https://wa.me/55${p.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-600 transition-colors p-2 bg-green-50 rounded-lg" title="Abrir WhatsApp">
                                <MessageCircle size={16} />
                            </a>
                        )}
                        <button onClick={() => abrirEdicao(p)} className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition flex items-center gap-2">
                            <Edit size={14}/> Editar
                        </button>
                     </div>
                 </div>
              </div>
            )})}
          </div>
        )}

        {/* MODAL: DIÁRIO DE VISITAS */}
        {modalInteracoes && prescritorAtivo && mounted && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
                
                <div className="bg-[#1e293b] p-6 flex justify-between items-center text-white shrink-0 border-b-4 border-blue-500">
                   <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center font-bold text-xl backdrop-blur-sm">
                           {prescritorAtivo.nome.substring(0, 2).toUpperCase()}
                       </div>
                       <div>
                           <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><CalendarCheck className="text-blue-400"/> Diário de Visitas</h2>
                           <p className="text-sm text-slate-300 font-medium mt-0.5">{prescritorAtivo.nome} ({prescritorAtivo.especialidade})</p>
                       </div>
                   </div>
                   <button onClick={() => setModalInteracoes(false)} className="hover:bg-white/20 p-2 rounded-full transition bg-white/10 text-white"><X size={20}/></button>
                </div>

                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                    
                    {/* ESQUERDA: LISTA DE HISTÓRICO */}
                    <div className="lg:w-1/2 p-6 lg:p-8 bg-slate-50 overflow-y-auto custom-scrollbar border-r border-slate-200">
                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200 pb-3"><FileText className="text-blue-600" size={20}/> Histórico da Conta</h3>
                        
                        <div className="space-y-5">
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
                                        
                                        {int.produtos_vinculados && (
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {int.produtos_vinculados.split(';').filter(Boolean).map((prod: string, i: number) => (
                                                    <span key={i} className="text-[10px] font-bold bg-[#82D14D]/20 text-[#0f392b] px-2 py-0.5 rounded flex items-center gap-1 border border-[#82D14D]/30"><Beaker size={10}/> {prod}</span>
                                                ))}
                                            </div>
                                        )}

                                        {int.farmacia_vinculada && (
                                            <p className="text-xs text-slate-600 font-bold flex items-center gap-1 mb-3"><Building2 size={12} className="text-blue-500"/> Indicado para: <span className="text-blue-600 uppercase">{int.farmacia_vinculada}</span></p>
                                        )}

                                        <p className="text-sm text-slate-800 font-medium mb-4 whitespace-pre-wrap leading-relaxed">{int.resumo}</p>
                                        
                                        {int.proximo_passo && (
                                            <div className="bg-green-50/50 p-3 rounded-xl border border-green-200 flex items-start gap-2 mb-3">
                                                <ChevronRight size={16} className="text-green-600 mt-0.5 shrink-0"/>
                                                <div className="text-sm text-slate-700 font-medium">
                                                    <span className="text-green-800 font-bold uppercase text-[10px] tracking-wider block mb-0.5">Próximo Passo</span> 
                                                    {int.proximo_passo}
                                                    {int.data_proximo_contato && <span className="ml-2 bg-white px-2 py-0.5 rounded text-[10px] font-black text-green-700 border border-green-100">📅 {new Date(int.data_proximo_contato).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>}
                                                </div>
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

                            {/* VINCULAR PRODUTOS (CHIPS) */}
                            <div className="relative">
                                <label className="text-sm font-bold text-slate-700 mb-2 block">Ativos Apresentados (Selecione da lista)</label>
                                <div className="min-h-[52px] w-full bg-white border border-slate-300 hover:border-blue-400 focus-within:border-blue-500 rounded-xl p-2 flex flex-wrap gap-2 items-center cursor-text transition shadow-sm" onClick={() => setDropdownProdutosAberto(true)}>
                                    {novaInteracao.produtos_vinculados.length === 0 && !termoProdutoDropdown && (
                                        <span className="text-slate-400 font-medium px-2 absolute pointer-events-none">Ex: Lipoartich, Purim...</span>
                                    )}
                                    {novaInteracao.produtos_vinculados.map(ativo => (
                                        <span key={ativo} className="bg-[#82D14D]/20 text-[#0f392b] border border-[#82D14D]/50 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 z-10">
                                            {ativo} <button type="button" onClick={(e) => { e.stopPropagation(); toggleAtivo(ativo); }} className="hover:bg-[#82D14D]/50 rounded-full p-0.5"><X size={12}/></button>
                                        </span>
                                    ))}
                                    <input type="text" className="flex-1 bg-transparent outline-none min-w-[100px] p-1 text-slate-800 font-medium text-sm" value={termoProdutoDropdown} onChange={(e) => {setTermoProdutoDropdown(e.target.value); setDropdownProdutosAberto(true);}} onFocus={() => setDropdownProdutosAberto(true)} />
                                    <ChevronDown size={18} className="text-slate-400 mr-2"/>
                                </div>
                                {dropdownProdutosAberto && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setDropdownProdutosAberto(false)}></div>
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-40 p-1 custom-scrollbar">
                                            {produtosApi.filter(p => p.toLowerCase().includes(termoProdutoDropdown.toLowerCase())).map(produto => (
                                                <button type="button" key={produto} onClick={() => toggleAtivo(produto)} className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-50 transition flex items-center justify-between text-sm font-bold text-slate-700">
                                                    {produto} {novaInteracao.produtos_vinculados.includes(produto) && <Check size={14} className="text-[#82D14D]"/>}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* VINCULAR FARMÁCIA (AUTOCOMPLETE) */}
                            <div className="relative">
                                <label className="text-sm font-bold text-slate-700 mb-2 flex items-center justify-between">
                                    <span>Vincular Farmácia Parceira</span>
                                    <span className="text-[10px] text-slate-400 font-normal uppercase">Opcional</span>
                                </label>
                                <div className="flex items-center bg-white border border-slate-300 rounded-xl shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 transition px-3">
                                    <Building2 size={18} className="text-slate-400"/>
                                    <input type="text" value={novaInteracao.farmacia_vinculada} onChange={(e) => buscarFarmaciaDB(e.target.value)} onFocus={() => setDropdownFarmaciaAberto(true)} className="w-full p-3.5 bg-transparent outline-none text-base font-medium text-slate-900 placeholder-slate-400" placeholder="Digite para buscar na base..."/>
                                    {novaInteracao.farmacia_vinculada && <button type="button" onClick={() => {setNovaInteracao({...novaInteracao, farmacia_vinculada: ''}); setFarmaciasBuscadas([])}}><X size={16} className="text-slate-400 hover:text-red-500"/></button>}
                                </div>
                                {dropdownFarmaciaAberto && farmaciasBuscadas.length > 0 && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setDropdownFarmaciaAberto(false)}></div>
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-40">
                                            {farmaciasBuscadas.map((f, i) => (
                                                <button type="button" key={i} onClick={() => {setNovaInteracao({...novaInteracao, farmacia_vinculada: f.fantasia}); setDropdownFarmaciaAberto(false);}} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition text-sm font-bold text-slate-700 border-b border-slate-50 last:border-0">
                                                    {f.fantasia}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 block">Resumo da Conversa *</label>
                                <textarea required rows={4} value={novaInteracao.resumo} onChange={e => setNovaInteracao({...novaInteracao, resumo: e.target.value})} className="w-full p-4 border border-slate-300 rounded-xl text-base font-medium text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition shadow-sm" placeholder="Qual foi a aceitação? Focou em qual protocolo?"></textarea>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                <div>
                                    <label className="text-xs font-black text-blue-800 uppercase tracking-widest mb-2 block">Próximo Passo</label>
                                    <input type="text" value={novaInteracao.proximo_passo} onChange={e => setNovaInteracao({...novaInteracao, proximo_passo: e.target.value})} className="w-full p-3 border border-blue-200 rounded-xl text-sm font-bold text-slate-900 bg-white placeholder-slate-400 focus:border-blue-500 outline-none transition shadow-sm" placeholder="Ex: Enviar literatura"/>
                                </div>
                                <div>
                                    <label className="text-xs font-black text-red-600 uppercase tracking-widest mb-2 flex items-center gap-1"><Clock size={12}/> Data Limite (Alerta)</label>
                                    <input type="date" value={novaInteracao.data_proximo_contato} onChange={e => setNovaInteracao({...novaInteracao, data_proximo_contato: e.target.value})} className="w-full p-3 border border-red-200 rounded-xl text-sm font-bold text-red-900 bg-white focus:border-red-500 outline-none transition shadow-sm cursor-pointer"/>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <button type="submit" disabled={salvando} className="w-full bg-blue-600 text-white h-14 rounded-xl font-black hover:bg-blue-700 flex justify-center items-center gap-2 shadow-lg shadow-blue-200 transition transform active:scale-95 disabled:opacity-50 text-base">
                                    {salvando ? <Activity className="animate-spin" size={20}/> : <Save size={20}/>} {salvando ? 'Salvando...' : 'Gravar Histórico e Atualizar Pipeline'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
             </div>
          </div>, document.body
        )}

        {/* MODAL DE CADASTRO CORPORATIVO */}
        {modalAberto && mounted && !modalInteracoes && createPortal(
           <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
             <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col my-8">
                
                <div className="bg-[#1e293b] p-6 md:p-8 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
                   <div className="absolute -right-4 -top-4 text-white/5 transform rotate-12"><User size={150}/></div>
                   <div className="relative z-10">
                       <span className="bg-blue-500 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest mb-3 inline-block shadow-sm">Gestão de Base</span>
                       <h2 className="text-2xl font-black tracking-tight">{form.id ? 'Editar Prescritor' : 'Cadastrar Prescritor'}</h2>
                   </div>
                   <button type="button" onClick={() => setModalAberto(false)} className="hover:bg-white/20 p-2 rounded-full transition bg-white/10 text-white relative z-10"><X size={24}/></button>
                </div>
                
                <form onSubmit={handleSalvarPrescritor} className="p-6 md:p-8">
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
                            <input list="lista-especialidades" type="text" placeholder="Selecione na lista ou digite..." value={form.especialidade} onChange={e => setForm({...form, especialidade: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                            <datalist id="lista-especialidades">
                                {LISTA_ESPECIALIDADES.map(esp => <option key={esp} value={esp} />)}
                            </datalist>
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

                    <h3 className="text-lg font-black text-slate-800 mb-5 flex items-center gap-2 border-b border-slate-200 pb-3">
                        <AlignLeft className="text-blue-600" size={20}/> Anotações de P&D
                    </h3>
                    <div className="mb-10">
                        <label className="text-sm font-bold text-slate-700 mb-1.5 block">Observações Gerais</label>
                        <textarea rows={3} value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} className="w-full p-4 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm resize-none transition" placeholder="Perfil de prescrição, concorrentes que utiliza, hobbies para relacionamento..."></textarea>
                    </div>

                    <div className="flex flex-col-reverse md:flex-row gap-4 pt-6 border-t border-slate-200">
                        {form.id && (
                            <button type="button" onClick={handleExcluirPrescritor} disabled={excluindo} className="w-full md:w-auto px-6 py-4 text-red-600 font-bold bg-red-50 hover:bg-red-100 rounded-xl transition text-base flex items-center justify-center gap-2 disabled:opacity-50">
                                {excluindo ? <Activity className="animate-spin" size={18}/> : <Trash2 size={18}/>} Excluir
                            </button>
                        )}
                        <div className="flex-1 flex flex-col-reverse md:flex-row gap-4 justify-end">
                            <button type="button" onClick={() => setModalAberto(false)} className="w-full md:w-auto px-8 py-4 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition text-base">Cancelar</button>
                            <button type="submit" disabled={salvando} className="w-full md:w-auto px-10 bg-blue-600 text-white py-4 rounded-xl font-black hover:bg-blue-700 shadow-lg shadow-blue-200 transition transform active:scale-95 disabled:opacity-50 text-base flex justify-center items-center gap-2">
                               {salvando ? <Activity className="animate-spin" size={20}/> : <Save size={20}/>} {salvando ? 'Salvando...' : 'Gravar Ficha'}
                            </button>
                        </div>
                    </div>
                </form>
             </div>
           </div>, document.body
        )}
      </div>
    </div>
  );
}