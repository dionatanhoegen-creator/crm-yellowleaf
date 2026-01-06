"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { 
  Plus, Search, Calendar, User, Phone, DollarSign, 
  X, Briefcase, Tag, Beaker, MessageCircle, AlertCircle, Clock,
  CheckCircle2, Trash2, ShieldAlert, AlertTriangle, Loader2, StickyNote
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const API_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

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
  observacoes?: string;
}

const DICAS_TECNICAS: Record<string, string> = {
  "SlimHaut®": "💡 Combo: Ofereça com GF Slim II®.",
  "Allisane®": "💡 Combo: Associe ao FIThymus®.",
  "VerumFEM®": "💡 Combo: Combine com Taurymus®."
};

const PRODUTOS_SUGESTAO = ["Allisane®", "Anethin®", "Anidream®", "ArtemiFresh®", "BioCarum®", "Cardasense®", "CarySlim®", "FIThymus®", "GF Slim II®", "Glutaliz®", "GraperLIP®", "Junipure®", "LipoArtich II®", "NobiLIP®", "Noble Skin®", "Nutberry Slim®", "Nutmeg B12®", "OriganLIP®", "Pepper PRO®", "Powder Lymp II®", "Purin 7®", "R-GEN2®", "ReduCINN®", "Reichi UP II ®", "Sinensis Lean II ®", "Sineredux II ®", "SlimHaut®", "TarhunLIP®", "Taurymus®", "TBooster®", "VerumFEM®"];
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
  const [formData, setFormData] = useState<Partial<Oportunidade>>({ estagio: 'prospeccao', dataEntrada: new Date().toISOString().split('T')[0], produto: '', aplicacao: '', observacoes: '' });

  useEffect(() => { setMounted(true); carregarUsuario(); carregarOportunidades(); carregarBaseClientes(); }, []);

  const carregarUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email) setUsuarioLogadoNome(user.email.split('@')[0]);
  };

  const carregarOportunidades = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('pipeline').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) {
      setOportunidades(data.map(item => ({
        id: item.id, cnpj: item.cnpj, nomeCliente: item.nome_cliente, contato: item.contato, telefone: item.telefone,
        produto: item.produto, aplicacao: item.aplicacao, valor: item.valor, dataEntrada: item.data_entrada,
        dataLembrete: item.data_lembrete, estagio: item.status as any, motivoPerda: item.motivo_perda,
        responsavel: usuarioLogadoNome, observacoes: item.observacoes
      })));
    }
    setLoading(false);
  };

  const carregarBaseClientes = async () => {
    try {
      const res = await fetch(`${API_URL}?path=clientes`);
      const json = await res.json();
      if (json.success) setBaseClientes(json.data);
    } catch (e) { console.error("Erro base", e); }
  };

  const handleOpenModal = (op?: Oportunidade) => {
    setErroBloqueio(null); setConfirmDelete(false);
    if (op) { setEditingOp(op); setFormData(op); }
    else { setEditingOp(null); setFormData({ estagio: 'prospeccao', dataEntrada: new Date().toISOString().split('T')[0], responsavel: usuarioLogadoNome, valor: 0, produto: '', aplicacao: '', observacoes: '' }); }
    setModalOpen(true);
  };

  const buscarDadosCNPJ = async () => {
    const cnpjLimpo = formData.cnpj?.replace(/\D/g, '');
    if (cnpjLimpo?.length !== 14) return;
    setLoadingCNPJ(true); setErroBloqueio(null);
    const clienteExistente = baseClientes.find(c => c.cnpj?.toString().replace(/\D/g, '') === cnpjLimpo);
    if (clienteExistente) {
        const dono = clienteExistente.vendedor || clienteExistente.representante || '';
        if (dono && !dono.toUpperCase().includes(usuarioLogadoNome.toUpperCase()) && usuarioLogadoNome !== 'Vendedor') {
            setErroBloqueio(`BLOQUEADO: Este cliente pertence a ${dono}.`);
            setFormData(prev => ({ ...prev, nomeCliente: clienteExistente.fantasia || clienteExistente.razao, clienteJaCadastrado: true }));
            setLoadingCNPJ(false); return;
        }
        setFormData(prev => ({ ...prev, nomeCliente: clienteExistente.fantasia || clienteExistente.razao, telefone: clienteExistente.whatsapp || clienteExistente.telefone || '', contato: clienteExistente.comprador || '', clienteJaCadastrado: true }));
        setLoadingCNPJ(false); return;
    }
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      const data = await response.json();
      setFormData(prev => ({ ...prev, nomeCliente: data.nome_fantasia || data.razao_social, telefone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1}) ${data.telefone1}` : '', clienteJaCadastrado: false }));
    } catch (error) { console.error("Erro CNPJ"); } finally { setLoadingCNPJ(false); }
  };

  const handleSave = async () => {
    if (erroBloqueio || !formData.nomeCliente) return;
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
        user_id: user?.id, cnpj: formData.cnpj, nome_cliente: formData.nomeCliente, contato: formData.contato,
        telefone: formData.telefone, produto: formData.produto, aplicacao: formData.aplicacao,
        valor: formData.valor || 0, status: formData.estagio, data_entrada: formData.dataEntrada,
        data_lembrete: formData.dataLembrete, motivo_perda: formData.motivoPerda, observacoes: formData.observacoes
    };
    if (editingOp) await supabase.from('pipeline').update(payload).eq('id', editingOp.id);
    else await supabase.from('pipeline').insert(payload);
    await carregarOportunidades(); setModalOpen(false);
  };

  const deleteOportunidade = async () => {
    if (editingOp) { await supabase.from('pipeline').delete().eq('id', editingOp.id); await carregarOportunidades(); setModalOpen(false); }
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const verificarAtraso = (data?: string) => {
    if (!data) return false;
    return new Date(data) < new Date(new Date().setHours(0,0,0,0));
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6 pt-4">
        <h1 className="text-2xl font-black text-[#1e293b] italic uppercase tracking-tighter">Pipeline YellowLeaf</h1>
        <button onClick={() => handleOpenModal()} className="bg-[#2563eb] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md">+ Nova Oportunidade</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 h-[calc(100vh-180px)] overflow-x-auto">
        {ESTAGIOS.map(estagio => {
          const itens = oportunidades.filter(o => o.estagio === estagio.id);
          return (
            <div key={estagio.id} className="flex flex-col h-full bg-slate-100/50 rounded-2xl border border-slate-200 min-w-[220px] overflow-hidden">
              <div className={`p-3 border-b-2 ${estagio.color} bg-white flex justify-between items-center`}>
                <div><h3 className={`font-black text-xs uppercase ${estagio.text}`}>{estagio.label}</h3><p className="text-[10px] text-slate-400 font-bold">{formatMoney(itens.reduce((a, b) => a + Number(b.valor), 0))}</p></div>
                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{itens.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {itens.map(item => {
                  const atrasado = verificarAtraso(item.dataLembrete) && item.estagio !== 'fechado';
                  return (
                    <div key={item.id} onClick={() => handleOpenModal(item)} className={`bg-white p-4 rounded-xl shadow-sm border-2 transition-all cursor-pointer relative ${atrasado ? 'border-red-500 animate-pulse shadow-red-50' : 'border-slate-50 hover:border-blue-400'}`}>
                      {atrasado && <AlertCircle size={14} className="absolute top-2 right-2 text-red-500" />}
                      <p className="text-[8px] font-bold text-slate-300 uppercase mb-1">{item.cnpj || 'S/ CNPJ'}</p>
                      <h4 className="font-bold text-slate-700 text-sm leading-tight mb-2 uppercase line-clamp-2">{item.nomeCliente}</h4>
                      <div className="flex justify-between items-end"><span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-bold truncate max-w-[100px]">{item.produto || 'Geral'}</span><span className="text-xs font-black text-slate-600">{formatMoney(item.valor)}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-[#242f3e] p-6 flex justify-between items-center text-white shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">✨ {editingOp ? 'Editar Detalhes' : 'Nova Oportunidade'}</h2>
              <div className="flex gap-2"><button className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2"><Calendar size={14}/> Agendar</button><button onClick={() => setModalOpen(false)}><X/></button></div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto custom-scrollbar flex-1 bg-white">
              {erroBloqueio && <div className="md:col-span-2 bg-red-50 border-l-4 border-red-500 p-4 rounded flex items-center gap-3 text-red-700 font-bold text-sm"><ShieldAlert/> {erroBloqueio}</div>}
              
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">CNPJ (Busca Automática)</label>
              <div className="flex gap-2"><input className="w-full bg-slate-50 border rounded-xl p-3 font-mono text-sm" value={formData.cnpj || ''} onChange={e => setFormData({...formData, cnpj: e.target.value})} onBlur={buscarDadosCNPJ}/><button onClick={buscarDadosCNPJ} className="bg-blue-50 text-blue-600 p-3 rounded-xl border border-blue-100">{loadingCNPJ ? <Loader2 className="animate-spin w-5 h-5"/> : <Search size={20}/>}</button></div></div>

              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nome do Cliente</label><input className="w-full bg-slate-50 border rounded-xl p-3 font-bold uppercase" value={formData.nomeCliente || ''} onChange={e => setFormData({...formData, nomeCliente: e.target.value})}/></div>
              
              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Contato</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.contato || ''} onChange={e => setFormData({...formData, contato: e.target.value})} placeholder="Ex: Dra. Ana"/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Telefone</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.telefone || ''} onChange={e => setFormData({...formData, telefone: e.target.value})} placeholder="(00) 00000-0000"/></div>
              
              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Produto / Ativo</label>
                <input list="prod-list" className="w-full bg-slate-50 border rounded-xl p-3 font-bold" value={formData.produto || ''} onChange={e => setFormData({...formData, produto: e.target.value})}/>
                <datalist id="prod-list">{PRODUTOS_SUGESTAO.map(p => <option key={p} value={p}/>)}</datalist>
                {formData.produto && DICAS_TECNICAS[formData.produto] && <p className="text-[9px] text-green-600 font-bold mt-1">{DICAS_TECNICAS[formData.produto]}</p>}
              </div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Aplicação</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.aplicacao || ''} onChange={e => setFormData({...formData, aplicacao: e.target.value})} placeholder="Ex: Dermato..."/></div>

              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Valor (R$)</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3 font-black text-green-700" value={formData.valor || ''} onChange={e => setFormData({...formData, valor: parseFloat(e.target.value)})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Data Entrada</label><input type="date" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.dataEntrada} onChange={e => setFormData({...formData, dataEntrada: e.target.value})}/></div>

              <div className="md:col-span-2 border-t pt-4 grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Fase Atual</label><select className="w-full bg-white border rounded-xl p-3 font-bold" value={formData.estagio} onChange={e => setFormData({...formData, estagio: e.target.value as any})}>{ESTAGIOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</select></div>
                <div><label className="text-[10px] font-bold text-orange-500 uppercase mb-1 block">Lembrete</label><input type="date" className="w-full bg-orange-50 border-orange-200 border rounded-xl p-3 font-bold text-orange-800" value={formData.dataLembrete || ''} onChange={e => setFormData({...formData, dataLembrete: e.target.value})}/></div>
              </div>

              <div className="md:col-span-2 bg-blue-50/30 p-4 rounded-2xl border border-blue-100">
                  <label className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2 mb-2"><StickyNote size={14}/> Histórico Estratégico</label>
                  <textarea rows={3} className="w-full bg-white border border-blue-100 rounded-xl p-3 text-sm outline-none" placeholder="O que foi conversado na visita?" value={formData.observacoes || ''} onChange={e => setFormData({...formData, observacoes: e.target.value})}/>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
              {editingOp ? <button onClick={() => setConfirmDelete(true)} className="text-red-500 font-bold text-xs">EXCLUIR</button> : <div/>}
              <div className="flex gap-2"><button onClick={() => setModalOpen(false)} className="px-6 font-bold text-slate-400">Cancelar</button><button onClick={handleSave} className="bg-[#2563eb] text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-blue-100">SALVAR</button></div>
            </div>
          </div>
        </div>, document.body
      )}

      {confirmDelete && mounted && createPortal(<div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"><div className="bg-white w-full max-w-sm rounded-2xl p-8 text-center"><AlertTriangle size={48} className="text-red-500 mx-auto mb-4"/><h3 className="text-lg font-bold text-slate-800">Deseja excluir?</h3><div className="flex gap-3 mt-8"><button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 border rounded-xl font-bold text-slate-500">Não</button><button onClick={deleteOportunidade} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Sim, Excluir</button></div></div></div>, document.body)}
    </div>
  );
}