"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Search, Plus, MapPin, Phone, Star, Edit, X, Stethoscope, Save, Building2, 
  CalendarCheck, FileText, ChevronRight, User, AlignLeft, Activity, Trash2, 
  Clock, Beaker, Check, AlertCircle, ChevronDown, MessageCircle, Loader2,
  LayoutGrid, List, AlertTriangle
} from 'lucide-react';

const API_PRODUTOS_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";
const API_CLIENTES_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

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
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [modalAberto, setModalAberto] = useState(false);
  const [modalInteracoes, setModalInteracoes] = useState(false);
  const [modalConfirmarExclusao, setModalConfirmarExclusao] = useState(false); // NOVO: Modal de exclusão
  
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  
  const [prescritorAtivo, setPrescritorAtivo] = useState<any>(null);
  const [interacoes, setInteracoes] = useState<any[]>([]);
  
  const [produtosApi, setProdutosApi] = useState<string[]>([]);
  const [baseFarmaciasApi, setBaseFarmaciasApi] = useState<any[]>([]);

  const [termoProdutoDropdown, setTermoProdutoDropdown] = useState("");
  const [dropdownProdutosAberto, setDropdownProdutosAberto] = useState(false);
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
  
  const [form, setForm] = useState({
    id: '', nome: '', crm_crn: '', especialidade: '', telefone: '', clinica: '', 
    endereco: '', bairro: '', cidade: '', uf: '', 
    potencial: 'B', perfil_prescritor: 'Inovador', observacoes: '', proximo_contato: ''
  });

  useEffect(() => {
    setMounted(true);
    carregarPrescritores();
    carregarListaProdutos();
    carregarBaseFarmacias();
  }, []);

  const carregarListaProdutos = async () => {
    try {
        const res = await fetch(`${API_PRODUTOS_URL}?path=produtos`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            const listaNomes = json.data.map((p: any) => p.ativo?.trim()).filter(Boolean);
            setProdutosApi(Array.from(new Set(listaNomes)).sort() as string[]);
        }
    } catch (e) {}
  };

  const carregarBaseFarmacias = async () => {
    try {
        const res = await fetch(`${API_CLIENTES_URL}?path=clientes`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            setBaseFarmaciasApi(json.data);
        }
    } catch (e) {}
  };

  const carregarPrescritores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('prescritores').select('*').order('nome', { ascending: true });
      if (error) throw error;
      if (data) setPrescritores(data);
    } catch (error) {
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

  // Abre o modal de confirmação no lugar daquele alerta feio do navegador
  const abrirConfirmacaoExclusao = () => {
      setModalConfirmarExclusao(true);
  };

  // Função que realmente vai no banco e apaga tudo
  const confirmarExclusao = async () => {
      setExcluindo(true);
      try {
          // 1. Apaga primeiro as interações do diário de visitas para evitar erro de Foreign Key
          const { error: errInteracoes } = await supabase.from('interacoes').delete().eq('prescritor_id', form.id);
          if (errInteracoes) throw errInteracoes;
          
          // 2. Só depois apaga o prescritor
          const { error } = await supabase.from('prescritores').delete().eq('id', form.id);
          if (error) throw error; 

          setModalConfirmarExclusao(false);
          setModalAberto(false);
          carregarPrescritores();
      } catch (error: any) {
          alert(`Erro ao excluir no banco de dados: ${error.message}`);
      } finally { 
          setExcluindo(false); 
      }
  };

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

  const buscarFarmaciaInteligente = (termo: string) => {
      setNovaInteracao({...novaInteracao, farmacia_vinculada: termo});
      setDropdownFarmaciaAberto(true);
      
      if (termo.length > 2) {
          const termoLimpo = termo.toLowerCase().trim();
          const termoNum = termo.replace(/\D/g, '');

          const filtradas = baseFarmaciasApi.filter(f => {
              const fantasia = String(f.fantasia || f.nome_fantasia || '').toLowerCase();
              const razao = String(f.razao_social || f.cliente || '').toLowerCase();
              const cnpj = String(f.cnpj || f.documento || '').replace(/\D/g, '');

              return fantasia.includes(termoLimpo) || razao.includes(termoLimpo) || (termoNum && cnpj.includes(termoNum));
          }).slice(0, 10); 

          const formatadas = filtradas.map(f => ({
              nome: f.fantasia || f.nome_fantasia || f.razao_social || 'Desconhecida',
              documento: f.cnpj || f.documento || ''
          }));

          setFarmaciasBuscadas(formatadas);
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

          await supabase.from('interacoes').insert([{
              prescritor_id: prescritorAtivo.id,
              user_id: user.id,
              tipo: novaInteracao.tipo,
              resumo: novaInteracao.resumo,
              proximo_passo: novaInteracao.proximo_passo,
              farmacia_vinculada: novaInteracao.farmacia_vinculada,
              produtos_vinculados: novaInteracao.produtos_vinculados.join(';'),
              data_proximo_contato: novaInteracao.data_proximo_contato || null,
              status: 'realizado'
          }]);

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
    <div className="p-3 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4 md:pb-6">
           <div>
             <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
                <Stethoscope className="text-blue-600" /> Base de Prescritores
             </h1>
             <p className="text-xs md:text-sm text-slate-500 mt-1">Gestão médica e Diário de Visitas P&D.</p>
           </div>
           <button onClick={abrirNovo} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-3.5 md:py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition active:scale-95 flex justify-center items-center gap-2 text-sm md:text-base">
              <Plus size={18} /> Novo Prescritor
           </button>
        </div>

        {/* BARRA DE BUSCA, TOGGLE E KPI */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="relative flex-1">
              <input type="text" placeholder="Buscar por nome, CRM, clínica..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-12 pr-4 py-3.5 md:py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:border-blue-500 outline-none text-sm md:text-base font-medium transition" />
              <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            </div>

            <div className="flex bg-slate-200/70 p-1 rounded-xl shrink-0 self-center md:self-stretch">
                <button 
                  onClick={() => setViewMode('grid')} 
                  className={`p-2.5 rounded-lg transition flex items-center justify-center ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Visão em Grade"
                >
                  <LayoutGrid size={20}/>
                </button>
                <button 
                  onClick={() => setViewMode('list')} 
                  className={`p-2.5 rounded-lg transition flex items-center justify-center ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Visão em Lista"
                >
                  <List size={20}/>
                </button>
            </div>

            <div className="bg-white px-4 md:px-6 py-3.5 md:py-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between md:justify-center gap-4 shrink-0 md:min-w-[200px]">
                <div className="text-left md:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total na Base</p>
                    <p className="text-2xl md:text-3xl font-black text-slate-800">{prescritores.length}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Stethoscope size={20} className="md:w-6 md:h-6"/></div>
            </div>
        </div>

        {/* CONTEÚDO (GRADE OU LISTA) */}
        {loading && !modalInteracoes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 animate-pulse">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-slate-200 rounded-2xl"></div>)}
          </div>
        ) : (
          <>
            {filtrados.length === 0 && (
                <div className="col-span-full text-center p-8 md:p-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <Stethoscope size={40} className="mx-auto text-slate-300 mb-4"/>
                    <p className="text-slate-500 font-bold text-base md:text-lg">Nenhum prescritor encontrado.</p>
                </div>
            )}

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {filtrados.map((p) => {
                  const alertaAtraso = isAtrasado(p.proximo_contato);

                  return (
                  <div key={p.id} className={`bg-white rounded-2xl p-4 border shadow-sm transition group flex flex-col justify-between h-full relative ${alertaAtraso ? 'border-red-300 hover:shadow-red-100' : 'border-slate-100 hover:shadow-md hover:border-blue-200'}`}>
                     
                     {p.proximo_contato && (
                        <div className="absolute top-0 left-0 w-full flex justify-center -mt-2.5 z-10">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1 border ${alertaAtraso ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {alertaAtraso ? <AlertCircle size={10}/> : <Clock size={10}/>} 
                                Retorno: {new Date(p.proximo_contato).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                            </span>
                        </div>
                     )}

                     <div className="absolute top-3 right-3 z-10">
                         <span className={`px-1.5 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${p.potencial === 'A' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : p.potencial === 'B' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                             <Star size={8} className={`${p.potencial === 'A' ? 'fill-current' : ''}`}/> Curva {p.potencial}
                         </span>
                     </div>

                     <div className="flex gap-3 items-start mb-3 pr-16 mt-2">
                        <div className="w-12 h-12 bg-slate-800 text-white rounded-xl flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
                            {p.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-black text-base text-slate-800 leading-tight line-clamp-2" title={p.nome}>{p.nome}</h3>
                            <p className="text-xs font-bold text-blue-600 mt-0.5 truncate">{p.especialidade || 'Clínico Geral'}</p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">{p.crm_crn || 'CRM/CRN N/D'}</p>
                        </div>
                     </div>

                     <div className="space-y-1 mb-3 flex-1">
                        {p.clinica && (
                            <p className="text-[11px] text-slate-600 flex items-start gap-1.5">
                                <Building2 size={12} className="text-slate-400 shrink-0 mt-0.5"/> 
                                <span className="line-clamp-1" title={p.clinica}>{p.clinica}</span>
                            </p>
                        )}
                        {p.telefone && (
                            <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                                <Phone size={12} className="text-slate-400 shrink-0"/> 
                                <a href={`tel:${p.telefone}`} className="hover:text-blue-600 font-medium">{p.telefone}</a>
                            </p>
                        )}
                     </div>

                     <div className="border-t border-slate-100 pt-3 flex justify-between items-center mt-auto">
                         <button onClick={() => abrirInteracoes(p)} className={`text-[11px] font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${alertaAtraso ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white' : 'bg-green-50 text-green-700 border border-green-100 hover:bg-green-600 hover:text-white'}`}>
                             <CalendarCheck size={14}/> Diário
                         </button>
                         <div className="flex items-center gap-1.5">
                            {p.telefone && (
                                <a href={`https://wa.me/55${p.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-600 transition-colors p-1.5 bg-green-50 rounded-lg" title="Abrir WhatsApp">
                                    <MessageCircle size={14}/>
                                </a>
                            )}
                            <button onClick={() => abrirEdicao(p)} className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition flex items-center gap-1.5">
                                <Edit size={12}/> Editar
                            </button>
                         </div>
                     </div>
                  </div>
                )})}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filtrados.map((p) => {
                  const alertaAtraso = isAtrasado(p.proximo_contato);

                  return (
                  <div key={p.id} className={`bg-white rounded-xl p-3 md:p-4 border shadow-sm transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${alertaAtraso ? 'border-red-300' : 'border-slate-100 hover:border-blue-200'}`}>
                     
                     <div className="flex items-center gap-3 min-w-0 flex-1 w-full md:w-auto">
                        <div className="w-10 h-10 bg-slate-800 text-white rounded-lg flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                            {p.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                               <h3 className="font-black text-sm text-slate-800 truncate" title={p.nome}>{p.nome}</h3>
                               <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shrink-0 ${p.potencial === 'A' ? 'bg-yellow-100 text-yellow-700' : p.potencial === 'B' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                   C.{p.potencial}
                               </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 truncate">
                               <span className="font-bold text-blue-600 truncate max-w-[120px]">{p.especialidade || 'Clínico'}</span>
                               <span>•</span>
                               <span className="font-mono text-[10px]">{p.crm_crn || 'S/ CRM'}</span>
                            </div>
                        </div>
                     </div>

                     <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 justify-between md:justify-end border-t border-slate-100 md:border-none pt-2 md:pt-0">
                         {p.proximo_contato && (
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${alertaAtraso ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-50 text-slate-500'}`}>
                                <Clock size={12}/> {new Date(p.proximo_contato).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                            </span>
                         )}

                         <div className="flex items-center gap-1.5">
                            <button onClick={() => abrirInteracoes(p)} className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-100 hover:bg-green-600 hover:text-white transition flex items-center gap-1.5">
                                <CalendarCheck size={14}/> <span className="hidden sm:inline">Diário</span>
                            </button>
                            {p.telefone && (
                                <a href={`https://wa.me/55${p.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-600 transition-colors p-1.5 bg-green-50 rounded-lg">
                                    <MessageCircle size={14}/>
                                </a>
                            )}
                            <button onClick={() => abrirEdicao(p)} className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition flex items-center gap-1.5">
                                <Edit size={12}/> <span className="hidden sm:inline">Editar</span>
                            </button>
                         </div>
                     </div>
                  </div>
                )})}
              </div>
            )}
          </>
        )}

        {/* MODAL: DIÁRIO DE VISITAS */}
        {modalInteracoes && prescritorAtivo && mounted && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-end md:items-center justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200 md:p-4">
             <div className="bg-white w-full h-[95vh] md:h-auto md:max-h-[95vh] md:max-w-6xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200 flex flex-col">
                
                <div className="bg-[#1e293b] p-4 md:p-6 flex justify-between items-center text-white shrink-0 border-b-4 border-blue-500">
                   <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                       <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-lg flex items-center justify-center font-bold text-lg md:text-xl backdrop-blur-sm shrink-0">
                           {prescritorAtivo.nome.substring(0, 2).toUpperCase()}
                       </div>
                       <div className="min-w-0">
                           <h2 className="text-base md:text-xl font-black uppercase tracking-tight flex items-center gap-2 truncate"><CalendarCheck className="text-blue-400 shrink-0" size={18}/> Diário de Visitas</h2>
                           <p className="text-xs md:text-sm text-slate-300 font-medium mt-0.5 truncate">{prescritorAtivo.nome} ({prescritorAtivo.especialidade})</p>
                       </div>
                   </div>
                   <button onClick={() => setModalInteracoes(false)} className="hover:bg-white/20 p-2 rounded-full transition bg-white/10 text-white shrink-0 ml-2"><X size={20}/></button>
                </div>

                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                    <div className="lg:w-1/2 p-4 md:p-6 lg:p-8 bg-slate-50 overflow-y-auto custom-scrollbar border-b lg:border-b-0 lg:border-r border-slate-200 order-2 lg:order-1 flex-1">
                        <h3 className="text-base md:text-lg font-black text-slate-800 mb-4 md:mb-6 flex items-center gap-2 border-b border-slate-200 pb-3"><FileText className="text-blue-600" size={18}/> Histórico da Conta</h3>
                        
                        <div className="space-y-4 md:space-y-5">
                            {interacoes.length === 0 ? (
                                <div className="text-center p-6 md:p-8 bg-white rounded-2xl border border-slate-200 border-dashed">
                                    <FileText size={32} className="mx-auto text-slate-300 mb-2"/>
                                    <p className="text-xs md:text-sm text-slate-500 font-medium">Nenhuma visita registrada.</p>
                                </div>
                            ) : (
                                interacoes.map((int) => (
                                    <div key={int.id} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm relative group hover:border-blue-200 transition">
                                        <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                                            <span className="text-[10px] md:text-xs font-black text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md uppercase tracking-wider">{int.tipo}</span>
                                            <span className="text-[10px] md:text-xs font-bold text-slate-500 bg-slate-50 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md border border-slate-100">{new Date(int.created_at).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        
                                        {int.produtos_vinculados && (
                                            <div className="flex flex-wrap gap-1 md:gap-1.5 mb-3">
                                                {int.produtos_vinculados.split(';').filter(Boolean).map((prod: string, i: number) => (
                                                    <span key={i} className="text-[9px] md:text-[10px] font-bold bg-[#82D14D]/20 text-[#0f392b] px-1.5 py-0.5 rounded flex items-center gap-1 border border-[#82D14D]/30"><Beaker size={10}/> {prod}</span>
                                                ))}
                                            </div>
                                        )}

                                        {int.farmacia_vinculada && (
                                            <p className="text-[11px] md:text-xs text-slate-600 font-bold flex items-center gap-1 mb-3"><Building2 size={12} className="text-blue-500 shrink-0"/> Indicado para: <span className="text-blue-600 uppercase truncate">{int.farmacia_vinculada}</span></p>
                                        )}

                                        <p className="text-xs md:text-sm text-slate-800 font-medium mb-3 md:mb-4 whitespace-pre-wrap leading-relaxed">{int.resumo}</p>
                                        
                                        {int.proximo_passo && (
                                            <div className="bg-green-50/50 p-2.5 md:p-3 rounded-xl border border-green-200 flex items-start gap-2 mb-3">
                                                <ChevronRight size={14} className="text-green-600 mt-0.5 shrink-0"/>
                                                <div className="text-xs md:text-sm text-slate-700 font-medium">
                                                    <span className="text-green-800 font-bold uppercase text-[9px] md:text-[10px] tracking-wider block mb-0.5">Próximo Passo</span> 
                                                    {int.proximo_passo}
                                                    {int.data_proximo_contato && <span className="ml-1.5 md:ml-2 bg-white px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-black text-green-700 border border-green-100 mt-1 md:mt-0 inline-block">📅 {new Date(int.data_proximo_contato).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>}
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-[9px] md:text-[10px] text-slate-400 uppercase tracking-widest text-right mt-2 border-t border-slate-100 pt-2.5 md:pt-3">
                                            Visitado por: <strong className="text-slate-600">{int.perfis?.nome || 'Usuário'}</strong>
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="lg:w-1/2 p-4 md:p-6 lg:p-8 bg-white overflow-y-auto custom-scrollbar order-1 lg:order-2 shrink-0 lg:flex-1 border-b border-slate-200 lg:border-b-0 max-h-[60vh] lg:max-h-full">
                        <h3 className="text-base md:text-lg font-black text-slate-800 mb-4 md:mb-6 flex items-center gap-2 border-b border-slate-200 pb-3"><Plus className="text-green-600" size={18}/> Registrar Nova Visita</h3>
                        
                        <form onSubmit={salvarInteracao} className="space-y-4 md:space-y-5">
                            <div>
                                <label className="text-xs md:text-sm font-bold text-slate-700 mb-1.5 block">Tipo de Contato</label>
                                <select value={novaInteracao.tipo} onChange={e => setNovaInteracao({...novaInteracao, tipo: e.target.value})} className="w-full p-3 md:p-3.5 border border-slate-300 rounded-xl text-sm md:text-base font-medium text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm">
                                    <option value="Visita Presencial">Visita Presencial</option>
                                    <option value="Apresentação Online">Apresentação Online</option>
                                    <option value="Evento / Congresso">Evento / Congresso</option>
                                    <option value="WhatsApp/Telefone">WhatsApp / Telefone</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>

                            <div className="relative">
                                <label className="text-xs md:text-sm font-bold text-slate-700 mb-1.5 block">Ativos Apresentados (Selecione da lista)</label>
                                <div className="min-h-[48px] w-full bg-white border border-slate-300 hover:border-blue-400 focus-within:border-blue-500 rounded-xl p-1.5 md:p-2 flex flex-wrap gap-1.5 items-center cursor-text transition shadow-sm" onClick={() => setDropdownProdutosAberto(true)}>
                                    {novaInteracao.produtos_vinculados.length === 0 && !termoProdutoDropdown && (
                                        <span className="text-slate-400 text-xs font-medium px-2 absolute pointer-events-none">Ex: Lipoartich, Purim...</span>
                                    )}
                                    {novaInteracao.produtos_vinculados.map(ativo => (
                                        <span key={ativo} className="bg-[#82D14D]/20 text-[#0f392b] border border-[#82D14D]/50 px-2 py-1 rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-1 z-10">
                                            {ativo} <button type="button" onClick={(e) => { e.stopPropagation(); toggleAtivo(ativo); }} className="hover:bg-[#82D14D]/50 rounded-full p-0.5"><X size={10}/></button>
                                        </span>
                                    ))}
                                    <input type="text" className="flex-1 bg-transparent outline-none min-w-[80px] p-1 text-slate-800 font-medium text-xs md:text-sm" value={termoProdutoDropdown} onChange={(e) => {setTermoProdutoDropdown(e.target.value); setDropdownProdutosAberto(true);}} onFocus={() => setDropdownProdutosAberto(true)} />
                                    <ChevronDown size={16} className="text-slate-400 mr-2"/>
                                </div>
                                {dropdownProdutosAberto && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setDropdownProdutosAberto(false)}></div>
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-40 p-1 custom-scrollbar">
                                            {produtosApi.filter(p => p.toLowerCase().includes(termoProdutoDropdown.toLowerCase())).map(produto => (
                                                <button type="button" key={produto} onClick={() => toggleAtivo(produto)} className="w-full text-left px-3 md:px-4 py-2 md:py-2 rounded-lg hover:bg-slate-50 transition flex items-center justify-between text-xs md:text-sm font-bold text-slate-700 border-b border-slate-50 last:border-0">
                                                    {produto} {novaInteracao.produtos_vinculados.includes(produto) && <Check size={14} className="text-[#82D14D]"/>}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="relative">
                                <label className="text-xs md:text-sm font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                                    <span>Vincular Farmácia Parceira</span>
                                    <span className="text-[9px] md:text-[10px] text-slate-400 font-normal uppercase">Opcional</span>
                                </label>
                                <div className="flex items-center bg-white border border-slate-300 rounded-xl shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 transition px-2.5 md:px-3">
                                    <Building2 size={16} className="text-slate-400 shrink-0"/>
                                    <input type="text" value={novaInteracao.farmacia_vinculada} onChange={(e) => buscarFarmaciaInteligente(e.target.value)} onFocus={() => setDropdownFarmaciaAberto(true)} className="w-full p-3 md:p-3.5 bg-transparent outline-none text-sm md:text-base font-medium text-slate-900 placeholder-slate-400" placeholder="Digite nome ou CNPJ..."/>
                                    {novaInteracao.farmacia_vinculada && <button type="button" onClick={() => {setNovaInteracao({...novaInteracao, farmacia_vinculada: ''}); setFarmaciasBuscadas([])}} className="shrink-0"><X size={16} className="text-slate-400 hover:text-red-500"/></button>}
                                </div>
                                {dropdownFarmaciaAberto && farmaciasBuscadas.length > 0 && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setDropdownFarmaciaAberto(false)}></div>
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-40 max-h-48 overflow-y-auto">
                                            {farmaciasBuscadas.map((f, i) => (
                                                <button type="button" key={i} onClick={() => {setNovaInteracao({...novaInteracao, farmacia_vinculada: f.nome}); setDropdownFarmaciaAberto(false);}} className="w-full text-left px-3 md:px-4 py-2.5 md:py-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-0 flex flex-col">
                                                    <span className="text-xs md:text-sm font-bold text-slate-700 truncate w-full">{f.nome}</span>
                                                    {f.documento && <span className="text-[9px] md:text-[10px] text-slate-400 font-mono">{f.documento}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div>
                                <label className="text-xs md:text-sm font-bold text-slate-700 mb-1.5 block">Resumo da Conversa *</label>
                                <textarea required rows={3} value={novaInteracao.resumo} onChange={e => setNovaInteracao({...novaInteracao, resumo: e.target.value})} className="w-full p-3 md:p-4 border border-slate-300 rounded-xl text-sm md:text-base font-medium text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition shadow-sm" placeholder="Qual foi a aceitação? Focou em qual protocolo?"></textarea>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 bg-blue-50/50 p-3 md:p-4 rounded-xl border border-blue-100">
                                <div>
                                    <label className="text-[10px] md:text-xs font-black text-blue-800 uppercase tracking-widest mb-1.5 block">Próximo Passo</label>
                                    <input type="text" value={novaInteracao.proximo_passo} onChange={e => setNovaInteracao({...novaInteracao, proximo_passo: e.target.value})} className="w-full p-2.5 md:p-3 border border-blue-200 rounded-xl text-xs md:text-sm font-bold text-slate-900 bg-white placeholder-slate-400 focus:border-blue-500 outline-none transition shadow-sm" placeholder="Ex: Enviar literatura"/>
                                </div>
                                <div>
                                    <label className="text-[10px] md:text-xs font-black text-red-600 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Clock size={12}/> Data Limite (Alerta)</label>
                                    <input type="date" value={novaInteracao.data_proximo_contato} onChange={e => setNovaInteracao({...novaInteracao, data_proximo_contato: e.target.value})} className="w-full p-2.5 md:p-3 border border-red-200 rounded-xl text-xs md:text-sm font-bold text-red-900 bg-white focus:border-red-500 outline-none transition shadow-sm cursor-pointer"/>
                                </div>
                            </div>

                            <div className="pt-2 md:pt-4 border-t border-slate-100">
                                <button type="submit" disabled={salvando} className="w-full bg-blue-600 text-white h-12 md:h-14 rounded-xl font-black hover:bg-blue-700 flex justify-center items-center gap-2 shadow-lg shadow-blue-200 transition transform active:scale-95 disabled:opacity-50 text-sm md:text-base">
                                    {salvando ? <Activity className="animate-spin" size={18}/> : <Save size={18}/>} {salvando ? 'Salvando...' : 'Gravar Histórico'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
             </div>
          </div>, document.body
        )}

        {/* MODAL DE CADASTRO CORPORATIVO (COMPACTO COM OVERFLOW INTERNO) */}
        {modalAberto && mounted && !modalInteracoes && createPortal(
           <div className="fixed inset-0 z-[99999] flex items-end md:items-center justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200 md:p-4 overflow-hidden">
             {/* Note o max-h-[90vh] e overflow-hidden na div principal */}
             <div className="bg-white w-full h-[95vh] md:h-auto md:max-h-[90vh] md:max-w-4xl rounded-t-3xl md:rounded-[2rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200 overflow-hidden">
                
                {/* CABEÇALHO FIXO */}
                <div className="bg-[#1e293b] p-4 md:p-5 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
                   <div className="absolute -right-4 -top-4 text-white/5 transform rotate-12 pointer-events-none"><User size={100} className="md:w-[120px] md:h-[120px]"/></div>
                   <div className="relative z-10 min-w-0 pr-4">
                       <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mb-1.5 md:mb-2 inline-block shadow-sm">Gestão de Base</span>
                       <h2 className="text-lg md:text-xl font-black tracking-tight truncate">{form.id ? 'Editar Prescritor' : 'Cadastrar Prescritor'}</h2>
                   </div>
                   <button type="button" onClick={() => setModalAberto(false)} className="hover:bg-white/20 p-2 rounded-full transition bg-white/10 text-white relative z-10 shrink-0"><X size={20}/></button>
                </div>
                
                {/* MIOLO ROLÁVEL (FORMULÁRIO) */}
                <form onSubmit={handleSalvarPrescritor} className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-5 flex flex-col bg-slate-50">
                    <div className="flex-1">
                        <h3 className="text-sm md:text-base font-black text-slate-800 mb-3 md:mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                            <User className="text-blue-600" size={16}/> Informações Profissionais
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                            <div>
                                <label className="text-xs font-bold text-slate-700 mb-1 block">Nome Completo *</label>
                                <input required type="text" placeholder="Ex: Dr. Carlos Silva" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm md:text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-700 mb-1 block">CRM / CRN</label>
                                <input type="text" placeholder="Ex: CRM-SP 123456" value={form.crm_crn} onChange={e => setForm({...form, crm_crn: e.target.value})} className="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm md:text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                            </div>
                            
                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold text-slate-700 mb-1 block">Especialidade Principal</label>
                                <input list="lista-especialidades" type="text" placeholder="Selecione na lista ou digite..." value={form.especialidade} onChange={e => setForm({...form, especialidade: e.target.value})} className="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm md:text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                                <datalist id="lista-especialidades">
                                    {LISTA_ESPECIALIDADES.map(esp => <option key={esp} value={esp} />)}
                                </datalist>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 mb-1 block">Curva (Potencial)</label>
                                    <select value={form.potencial} onChange={e => setForm({...form, potencial: e.target.value})} className="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm md:text-base font-medium text-slate-900 cursor-pointer shadow-sm">
                                        <option value="A">Curva A (Alto)</option>
                                        <option value="B">Curva B (Médio)</option>
                                        <option value="C">Curva C (Baixo)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 mb-1 block">Perfil</label>
                                    <select value={form.perfil_prescritor} onChange={e => setForm({...form, perfil_prescritor: e.target.value})} className="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm md:text-base font-medium text-slate-900 cursor-pointer shadow-sm">
                                        <option value="Inovador">Inovador</option>
                                        <option value="Tradicional">Tradicional</option>
                                        <option value="Questionador">Questionador</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-sm md:text-base font-black text-slate-800 mb-3 md:mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                            <Building2 className="text-blue-600" size={16}/> Localização
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                            <div>
                                <label className="text-xs font-bold text-slate-700 mb-1 block">Clínica / Consultório</label>
                                <input type="text" placeholder="Ex: Clínica Saúde" value={form.clinica} onChange={e => setForm({...form, clinica: e.target.value})} className="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm md:text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-700 mb-1 block">WhatsApp / Secretária</label>
                                <input type="text" placeholder="(00) 00000-0000" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm md:text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold text-slate-700 mb-1 block">Endereço Completo</label>
                                <input type="text" placeholder="Rua, Número, Sala/Andar..." value={form.endereco} onChange={e => setForm({...form, endereco: e.target.value})} className="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm md:text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                            </div>
                            <div className="grid grid-cols-12 gap-3 sm:col-span-2">
                                <div className="col-span-12 sm:col-span-5">
                                    <label className="text-xs font-bold text-slate-700 mb-1 block">Bairro</label>
                                    <input type="text" placeholder="Bairro" value={form.bairro} onChange={e => setForm({...form, bairro: e.target.value})} className="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm md:text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                                </div>
                                <div className="col-span-8 sm:col-span-5">
                                    <label className="text-xs font-bold text-slate-700 mb-1 block">Cidade</label>
                                    <input type="text" placeholder="Cidade" value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} className="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm md:text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                                </div>
                                <div className="col-span-4 sm:col-span-2">
                                    <label className="text-xs font-bold text-slate-700 mb-1 block">UF</label>
                                    <input type="text" placeholder="UF" value={form.uf} onChange={e => setForm({...form, uf: e.target.value})} maxLength={2} className="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm md:text-base font-bold uppercase text-center text-slate-900 placeholder-slate-400 shadow-sm transition"/>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-sm md:text-base font-black text-slate-800 mb-3 md:mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                            <AlignLeft className="text-blue-600" size={16}/> Anotações
                        </h3>
                        <div className="mb-4">
                            <label className="text-xs font-bold text-slate-700 mb-1 block">Observações Gerais</label>
                            <textarea rows={2} value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} className="w-full p-2.5 md:p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm md:text-base font-medium text-slate-900 placeholder-slate-400 shadow-sm resize-none transition" placeholder="Perfil de prescrição, concorrentes, hobbies..."></textarea>
                        </div>
                    </div>

                    {/* RODAPÉ FIXO NA BASE DO MODAL */}
                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-slate-200 shrink-0 mt-auto pb-4 sm:pb-0 bg-slate-50">
                        {form.id && (
                            <button type="button" onClick={abrirConfirmacaoExclusao} disabled={excluindo} className="w-full sm:w-auto px-5 py-3 text-red-600 font-bold bg-white sm:bg-red-50 border border-red-200 sm:border-transparent hover:bg-red-100 rounded-xl transition text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                                {excluindo ? <Activity className="animate-spin" size={16}/> : <Trash2 size={16}/>} <span className="sm:hidden lg:inline">Excluir</span>
                            </button>
                        )}
                        <div className="flex-1 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                            <button type="button" onClick={() => setModalAberto(false)} className="w-full sm:w-auto px-6 py-3 text-slate-600 font-bold bg-white sm:bg-slate-100 border border-slate-200 sm:border-transparent hover:bg-slate-200 rounded-xl transition text-sm">Cancelar</button>
                            <button type="submit" disabled={salvando} className="w-full sm:w-auto px-8 bg-blue-600 text-white py-3 rounded-xl font-black hover:bg-blue-700 shadow-lg shadow-blue-200 transition transform active:scale-95 disabled:opacity-50 text-sm flex justify-center items-center gap-2">
                               {salvando ? <Activity className="animate-spin" size={18}/> : <Save size={18}/>} {salvando ? 'Salvando...' : 'Gravar Ficha'}
                            </button>
                        </div>
                    </div>
                </form>
             </div>
           </div>, document.body
        )}

        {/* --- NOVO MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (PERSONALIZADO) --- */}
        {modalConfirmarExclusao && mounted && createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-red-100">
                <div className="p-8 text-center">
                   <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
                      <AlertTriangle size={32} />
                   </div>
                   <h2 className="text-xl font-black text-slate-800 mb-3">AVISO IMPORTANTE</h2>
                   <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                      Tem certeza que deseja EXCLUIR o prescritor <strong className="text-slate-800">{form.nome}</strong>? Todo o histórico de visitas também será apagado permanentemente.
                   </p>
                </div>
                <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row gap-3">
                   <button onClick={() => setModalConfirmarExclusao(false)} disabled={excluindo} className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3.5 md:py-3 rounded-xl hover:bg-slate-100 transition disabled:opacity-50">
                       Cancelar
                   </button>
                   <button onClick={confirmarExclusao} disabled={excluindo} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 md:py-3 rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                      {excluindo ? <Activity className="animate-spin" size={18}/> : <Trash2 size={18}/>}
                      {excluindo ? 'Excluindo...' : 'Sim, Excluir'}
                   </button>
                </div>
             </div>
          </div>, document.body
        )}
      </div>
    </div>
  );
}