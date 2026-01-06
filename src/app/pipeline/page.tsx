"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { 
  Plus, Search, Calendar, User, Phone, DollarSign, 
  X, Briefcase, Tag, Beaker, MessageCircle, AlertCircle, Clock,
  CheckCircle2, Trash2, ShieldAlert, AlertTriangle, Loader2, ListTodo
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const API_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

// --- TIPOS ---
interface Oportunidade {
  id: string;
  cnpj: string;
  nomeCliente: string; 
  contato: string;      
  telefone: string;
  produto: string;
  aplicacao: string;
  valor: number;
  dataEntrada: string;
  dataLembrete?: string;
  estagio: 'prospeccao' | 'qualificacao' | 'apresentacao' | 'negociacao' | 'fechado' | 'perdido';
  motivoPerda?: string;
  responsavel: string;
  clienteJaCadastrado?: boolean;
  observacoes?: string; // Melhoria 1: Histórico
}

// --- CONSTANTES ---
const PRODUTOS_SUGESTAO = ["Allisane®", "Anethin®", "Anidream®", "ArtemiFresh®", "BioCarum®", "Cardasense®", "CarySlim®", "FIThymus®", "GF Slim II®", "Glutaliz®", "GraperLIP®", "Junipure®", "LipoArtich II®", "NobiLIP®", "Noble Skin®", "Nutberry Slim®", "Nutmeg B12®", "OriganLIP®", "Pepper PRO®", "Powder Lymp II®", "Purin 7®", "R-GEN2®", "ReduCINN®", "Reichi UP II ®", "Sinensis Lean II ®", "Sineredux II ®", "SlimHaut®", "TarhunLIP®", "Taurymus®", "TBooster®", "VerumFEM®"];

// Melhoria 3: Lógica de Cross-Sell
const PROTOCOLOS: Record<string, string> = {
  "SlimHaut®": "Dica: Combine com GF Slim II® para potencializar a queima calórica.",
  "Allisane®": "Dica: Sugira FIThymus® para um protocolo completo de imunidade.",
  "VerumFEM®": "Dica: Cardasense® auxilia no suporte hormonal feminino."
};

const MOTIVOS_PERDA = ["Preço alto", "Fechou com concorrente", "Sem estoque", "Projeto cancelado", "Cliente parou de responder", "Outros"];

const ESTAGIOS = [
  { id: 'prospeccao', label: 'Prospecção', color: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  { id: 'qualificacao', label: 'Qualificação', color: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  { id: 'apresentacao', label: 'Apresentação', color: 'border-pink-500', bg: 'bg-pink-50', text: 'text-pink-700' },
  { id: 'negociacao', label: 'Negociação', color: 'border-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  { id: 'fechado', label: 'Fechado', color: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  { id: 'perdido', label: 'Perdido', color: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700' },
];

export default function PipelinePage() {
  const supabase = createClientComponentClient();
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<Oportunidade | null>(null);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [baseClientes, setBaseClientes] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [usuarioLogadoNome, setUsuarioLogadoNome] = useState("Vendedor");
  const [erroBloqueio, setErroBloqueio] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<{show: boolean, msg: string, type: 'success' | 'error' | 'warning'}>({ show: false, msg: '', type: 'success' });
  const [formData, setFormData] = useState<Partial<Oportunidade>>({ estagio: 'prospeccao', dataEntrada: new Date().toISOString().split('T')[0], produto: '', aplicacao: '' });

  useEffect(() => {
    setMounted(true); carregarUsuario(); carregarOportunidades(); carregarBaseClientes();
  }, []);

  const carregarUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email) setUsuarioLogadoNome(user.email.split('@')[0]);
  };

  const carregarOportunidades = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('pipeline').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (!error && data) {
      setOportunidades(data.map(item => ({
        id: item.id, cnpj: item.cnpj, nomeCliente: item.nome_cliente, contato: item.contato, telefone: item.telefone,
        produto: item.produto, aplicacao: item.aplicacao, valor: item.valor, dataEntrada: item.data_entrada,
        dataLembrete: item.data_lembrete, estagio: item.status as any, motivoPerda: item.motivo_perda,
        responsavel: usuarioLogadoNome, observacoes: item.observacoes // Mapeamento da melhoria
      })));
    }
    setLoading(false);
  };

  const carregarBaseClientes = async () => {
    try {
      const res = await fetch(`${API_URL}?path=clientes`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setBaseClientes(json.data);
    } catch (e) { console.error("Erro Google", e); }
  };

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const handleOpenModal = (op?: Oportunidade) => {
    setErroBloqueio(null); setConfirmDelete(false);
    if (op) { setEditingOp(op); setFormData(op); }
    else { setEditingOp(null); setFormData({ estagio: 'prospeccao', dataEntrada: new Date().toISOString().split('T')[0], responsavel: usuarioLogadoNome, valor: 0, produto: '', aplicacao: '' }); }
    setModalOpen(true);
  };

  const buscarDadosCNPJ = async () => {
    const cnpjLimpo = formData.cnpj?.replace(/\D/g, '');
    if (!cnpjLimpo || cnpjLimpo.length !== 14) return;
    setLoadingCNPJ(true); setErroBloqueio(null);
    const clienteExistente = baseClientes.find(c => c.cnpj?.toString().replace(/\D/g, '') === cnpjLimpo);
    if (clienteExistente) {
        const donoCarteira = clienteExistente.vendedor || clienteExistente.representante || '';
        if (donoCarteira && !donoCarteira.toUpperCase().includes(usuarioLogadoNome.toUpperCase()) && usuarioLogadoNome !== 'Vendedor') {
            setErroBloqueio(`AÇÃO BLOQUEADA: Este cliente pertence à carteira de ${donoCarteira}.`);
            setFormData(prev => ({ ...prev, nomeCliente: clienteExistente.fantasia || clienteExistente.razao, clienteJaCadastrado: true }));
            setLoadingCNPJ(false); return;
        }
        setFormData(prev => ({ ...prev, nomeCliente: clienteExistente.fantasia || clienteExistente.razao, telefone: clienteExistente.whatsapp || clienteExistente.telefone || prev.telefone, contato: clienteExistente.comprador || prev.contato, clienteJaCadastrado: true }));
        showToast(`Cliente encontrado na base!`); setLoadingCNPJ(false); return;
    }
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      const data = await response.json();
      setFormData(prev => ({ ...prev, nomeCliente: data.nome_fantasia || data.razao_social, telefone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1}) ${data.telefone1}` : prev.telefone, clienteJaCadastrado: false }));
    } catch (error) { showToast("CNPJ não encontrado.", 'error'); } finally { setLoadingCNPJ(false); }
  };

  const handleSave = async () => {
    if (erroBloqueio) return showToast("Ação bloqueada.", 'error');
    if (!formData.nomeCliente) return showToast("Nome é obrigatório.", 'warning');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
        user_id: user.id, cnpj: formData.cnpj, nome_cliente: formData.nomeCliente, contato: formData.contato,
        telefone: formData.telefone, produto: formData.produto, aplicacao: formData.aplicacao,
        valor: formData.valor || 0, status: formData.estagio, data_entrada: formData.dataEntrada,
        data_lembrete: formData.dataLembrete, motivo_perda: formData.motivoPerda,
        observacoes: formData.observacoes // Melhoria 1 salva
    };

    try {
        if (editingOp) await supabase.from('pipeline').update(payload).eq('id', editingOp.id);
        else await supabase.from('pipeline').insert(payload);
        showToast("Oportunidade salva!", 'success'); await carregarOportunidades(); setModalOpen(false);
    } catch (error) { showToast("Erro ao salvar.", 'error'); }
  };

  const deleteOportunidade = async () => {
    if (!editingOp) return;
    try {
        await supabase.from('pipeline').delete().eq('id', editingOp.id);
        await carregarOportunidades(); setConfirmDelete(false); setModalOpen(false); showToast("Excluída.");
    } catch (error) { showToast("Erro ao excluir.", 'error'); }
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const handleWhatsappClick = (e: React.MouseEvent, telefone: string) => {
    e.stopPropagation(); const numeroLimpo = telefone.replace(/\D/g, '');
    const numeroFinal = numeroLimpo.length <= 11 ? `55${numeroLimpo}` : numeroLimpo;
    if (numeroFinal) window.open(`https://wa.me/${numeroFinal}`, '_blank');
  };

  const agendarGoogleAgenda = () => {
    if (!formData.nomeCliente) return;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Reunião: ${formData.nomeCliente}`)}&details=${encodeURIComponent(`Tratar: ${formData.produto}\nObs: ${formData.observacoes || ''}`)}`;
    window.open(url, '_blank');
  };

  // Melhoria 2: Verificador de Lembrete Atrasado
  const isAtrasado = (data?: string) => {
    if (!data) return false;
    return new Date(data) < new Date(new Date().setHours(0,0,0,0));
  };

  return (
    <div className="w-full">
      {/* TOAST E HEADER - IGUAIS AO ORIGINAL */}
      {toast.show && mounted && createPortal(<div className={`fixed top-5 right-5 z-[100000] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${toast.type === 'success' ? 'bg-green-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white'}`}><CheckCircle2 size={24}/><div><p className="font-bold text-sm">{toast.msg}</p></div></div>, document.body)}
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pt-4">
        <h1 className="text-2xl font-black text-slate-800 tracking-tighter italic uppercase">Pipeline YellowLeaf</h1>
        <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md text-sm whitespace-nowrap"><Plus size={18}/> Nova Oportunidade</button>
      </div>

      {loading ? <div className="flex items-center justify-center h-64 text-slate-400"><Loader2 className="animate-spin mr-2"/> Carregando pipeline...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 h-[calc(100vh-160px)]">
          {ESTAGIOS.map(estagio => {
            const itens = oportunidades.filter(o => o.estagio === estagio.id);
            const totalColuna = itens.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
            return (
              <div key={estagio.id} className="flex flex-col h-full bg-slate-100/50 rounded-xl border border-slate-200 overflow-hidden min-w-[200px]">
                <div className={`p-2 border-b-2 ${estagio.color} bg-white`}><div className="flex justify-between items-center mb-1"><h3 className={`font-bold text-xs truncate ${estagio.text}`}>{estagio.label}</h3><span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{itens.length}</span></div><p className="text-[10px] text-slate-400 font-bold">{formatMoney(totalColuna)}</p></div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                  {itens.map(item => (
                    // Melhoria 2: Borda de Alerta Pulsante
                    <div key={item.id} onClick={() => handleOpenModal(item)} className={`bg-white p-3 rounded-lg shadow-sm border transition-all cursor-pointer group relative ${isAtrasado(item.dataLembrete) && item.estagio !== 'fechado' ? 'border-red-500 border-2 animate-pulse shadow-red-100' : 'border-slate-100 hover:border-blue-400'}`}>
                      <div className="flex justify-between items-start mb-1">
                          <div className="bg-slate-50 text-slate-400 text-[9px] px-1.5 py-0.5 rounded font-mono truncate max-w-[80px]">{item.cnpj || 'S/ CNPJ'}</div>
                          {isAtrasado(item.dataLembrete) && item.estagio !== 'fechado' && <AlertCircle size={12} className="text-red-500" />}
                      </div>
                      <h4 className="font-bold text-slate-700 text-sm leading-tight mb-1 line-clamp-2 uppercase">{item.nomeCliente}</h4>
                      <div className="mb-2">{item.produto ? <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1 truncate"><Beaker size={10}/> {item.produto}</p> : <p className="text-[10px] text-purple-500 font-bold flex items-center gap-1 truncate"><Tag size={10}/> Geral</p>}</div>
                      <div className="mt-2 flex justify-between items-center"><span className="text-xs font-black text-slate-600">{formatMoney(item.valor)}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PRINCIPAL - MANTIDO E MELHORADO */}
      {modalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="bg-slate-800 p-6 flex justify-between items-center text-white">
              <h2 className="text-lg font-black italic uppercase">{editingOp ? 'Editar Proposta' : 'Nova Oportunidade'}</h2>
              <div className="flex gap-2"><button onClick={agendarGoogleAgenda} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition"><Calendar size={14}/> Agendar</button><button onClick={() => setModalOpen(false)}><X/></button></div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar flex-1">
              {erroBloqueio && <div className="md:col-span-2 bg-red-50 border-l-4 border-red-500 p-4 rounded flex items-start gap-3"><ShieldAlert className="text-red-600" size={24} /><div><h3 className="text-red-700 font-bold text-sm">Ação Bloqueada</h3><p className="text-red-600 text-xs">{erroBloqueio}</p></div></div>}
              
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">CNPJ</label>
              <div className="flex gap-2"><input type="text" className="w-full bg-slate-50 border rounded-xl p-3 font-mono" value={formData.cnpj || ''} onChange={e => setFormData({...formData, cnpj: e.target.value})} onBlur={buscarDadosCNPJ}/><button onClick={buscarDadosCNPJ} className="bg-blue-100 text-blue-600 p-3 rounded-xl">{loadingCNPJ ? <Loader2 className="animate-spin w-4 h-4"/> : <Search size={20}/>}</button></div></div>

              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Cliente</label><input type="text" className="w-full bg-slate-50 border rounded-xl p-3 font-bold uppercase" value={formData.nomeCliente || ''} onChange={e => setFormData({...formData, nomeCliente: e.target.value})}/></div>
              
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label><input type="text" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.telefone || ''} onChange={e => setFormData({...formData, telefone: e.target.value})}/></div>
              
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Produto / Ativo</label>
                <input list="prods" className="w-full bg-slate-50 border rounded-xl p-3 font-bold" value={formData.produto || ''} onChange={e => setFormData({...formData, produto: e.target.value})}/>
                <datalist id="prods">{PRODUTOS_SUGESTAO.map(p => <option key={p} value={p}/>)}</datalist>
                {/* Melhoria 3: Cross-Sell Insight */}
                {formData.produto && PROTOCOLOS[formData.produto] && <p className="text-[9px] text-green-600 font-black mt-1 animate-bounce">{PROTOCOLOS[formData.produto]}</p>}
              </div>

              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Valor (R$)</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3 font-black text-green-700" value={formData.valor || ''} onChange={e => setFormData({...formData, valor: parseFloat(e.target.value)})}/></div>
              
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Lembrete de Retorno</label><input type="date" className="w-full bg-yellow-50 border-yellow-200 border rounded-xl p-3" value={formData.dataLembrete || ''} onChange={e => setFormData({...formData, dataLembrete: e.target.value})}/></div>

              {/* Melhoria 1: Histórico de Contato */}
              <div className="md:col-span-2 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <label className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2 mb-2"><ListTodo size={14}/> Histórico e Observações Estratégicas</label>
                  <textarea rows={3} className="w-full bg-white border-blue-100 border rounded-xl p-3 text-sm outline-none focus:border-blue-400" placeholder="O que o farmacêutico disse? Qual a dor dele? Anote aqui..." value={formData.observacoes || ''} onChange={e => setFormData({...formData, observacoes: e.target.value})}/>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-3">
                <select className="w-full bg-white border rounded-xl p-3 text-sm font-bold" value={formData.estagio} onChange={e => setFormData({...formData, estagio: e.target.value as any})}>{ESTAGIOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</select>
                {formData.estagio === 'perdido' && <select className="w-full bg-red-50 border-red-200 text-red-700 rounded-xl p-3 text-sm" value={formData.motivoPerda || ''} onChange={e => setFormData({...formData, motivoPerda: e.target.value})}><option value="">Motivo da Perda...</option>{MOTIVOS_PERDA.map(m => <option key={m} value={m}>{m}</option>)}</select>}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-between">
              {editingOp ? <button onClick={() => setConfirmDelete(true)} className="bg-red-100 text-red-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2"><Trash2 size={16}/> Excluir</button> : <div/>}
              <div className="flex gap-2"><button onClick={() => setModalOpen(false)} className="px-6 py-2 font-bold text-slate-400">Cancelar</button><button onClick={handleSave} className="bg-green-600 text-white px-10 py-3 rounded-2xl font-black shadow-lg shadow-green-100 hover:scale-105 transition">SALVAR PROPOSTA</button></div>
            </div>
          </div>
        </div>, document.body
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO MANTIDA */}
      {confirmDelete && mounted && createPortal(<div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"><div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl"><AlertTriangle size={48} className="text-red-500 mx-auto mb-4"/><h3 className="text-lg font-bold">Excluir permanentemente?</h3><div className="flex gap-3 mt-6"><button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 border rounded-xl font-bold">Não</button><button onClick={deleteOportunidade} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Sim, Excluir</button></div></div></div>, document.body)}
    </div>
  );
}