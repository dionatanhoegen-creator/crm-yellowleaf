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

const ESTAGIOS = [
  { id: 'prospeccao', label: 'Prospecção', color: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  { id: 'qualificacao', label: 'Qualificação', color: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  { id: 'apresentacao', label: 'Apresentação', color: 'border-pink-500', bg: 'bg-pink-50', text: 'text-pink-700' },
  { id: 'negociacao', label: 'Negociação', color: 'border-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  { id: 'fechado', label: 'Fechado', color: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  { id: 'perdido', label: 'Perdido', color: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700' },
];

const PRODUTOS_SUGESTAO = ["Allisane®", "Anethin®", "Anidream®", "ArtemiFresh®", "BioCarum®", "Cardasense®", "CarySlim®", "FIThymus®", "GF Slim II®", "Glutaliz®", "GraperLIP®", "Junipure®", "LipoArtich II®", "NobiLIP®", "Noble Skin®", "Nutberry Slim®", "Nutmeg B12®", "OriganLIP®", "Pepper PRO®", "Powder Lymp II®", "Purin 7®", "R-GEN2®", "ReduCINN®", "Reichi UP II ®", "Sinensis Lean II ®", "Sineredux II ®", "SlimHaut®", "TarhunLIP®", "Taurymus®", "TBooster®", "VerumFEM®"];

export default function PipelinePage() {
  const supabase = createClientComponentClient();
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<any>(null);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const [formData, setFormData] = useState({
    cnpj: '', nomeCliente: '', contato: '', telefone: '', produto: '',
    aplicacao: '', valor: '', dataEntrada: new Date().toISOString().split('T')[0],
    estagio: 'prospeccao', dataLembrete: '', observacoes: ''
  });

  useEffect(() => { setMounted(true); carregarOportunidades(); }, []);

  const carregarOportunidades = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('pipeline').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setOportunidades(data || []);
    }
    setLoading(false);
  };

  const buscarDadosCNPJ = async () => {
    const cnpjLimpo = formData.cnpj?.replace(/\D/g, '');
    if (cnpjLimpo?.length !== 14) return;
    setLoadingCNPJ(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      const data = await res.json();
      if (data.nome_fantasia || data.razao_social) {
        const tel = data.ddd_telefone_1 && data.telefone1 ? `(${data.ddd_telefone_1}) ${data.telefone1}` : formData.telefone;
        setFormData(prev => ({ 
          ...prev, 
          nomeCliente: data.nome_fantasia || data.razao_social, 
          telefone: tel 
        }));
      }
    } catch (e) { console.error("Erro na busca do CNPJ"); }
    setLoadingCNPJ(false);
  };

  const handleSave = async () => {
    if (!formData.nomeCliente || !formData.valor) return alert("Por favor, preencha o Nome do Cliente e o Valor.");
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      user_id: user?.id,
      cnpj: formData.cnpj,
      nome_cliente: formData.nomeCliente,
      contato: formData.contato,
      telefone: formData.telefone,
      produto: formData.produto,
      aplicacao: formData.aplicacao,
      valor: parseFloat(String(formData.valor).replace(',', '.')),
      status: formData.estagio,
      data_entrada: formData.dataEntrada,
      data_lembrete: formData.dataLembrete || null,
      observacoes: formData.observacoes
    };

    const { error } = editingOp 
      ? await supabase.from('pipeline').update(payload).eq('id', editingOp.id)
      : await supabase.from('pipeline').insert(payload);

    if (!error) { setModalOpen(false); carregarOportunidades(); }
    else { alert("Erro ao salvar no banco. Verifique sua conexão."); }
  };

  const deleteOportunidade = async () => {
    if (editingOp) {
      await supabase.from('pipeline').delete().eq('id', editingOp.id);
      carregarOportunidades(); setModalOpen(false); setConfirmDelete(false);
    }
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const isAtrasado = (data?: string) => {
    if (!data) return false;
    return new Date(data) < new Date(new Date().setHours(0,0,0,0));
  };

  return (
    <div className="w-full p-4">
      {/* HEADER PRINCIPAL */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-[#1e293b] italic uppercase tracking-tighter">Pipeline YellowLeaf</h1>
        <button onClick={() => { 
          setEditingOp(null); 
          setFormData({ cnpj: '', nomeCliente: '', contato: '', telefone: '', produto: '', aplicacao: '', valor: '', dataEntrada: new Date().toISOString().split('T')[0], estagio: 'prospeccao', dataLembrete: '', observacoes: '' }); 
          setModalOpen(true); 
        }} className="bg-[#2563eb] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition active:scale-95">
          <Plus size={20}/> Nova Oportunidade
        </button>
      </div>

      {/* QUADRO DE COLUNAS */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 h-[calc(100vh-180px)] overflow-x-auto pb-4">
        {ESTAGIOS.map(est => {
          const itensStatus = oportunidades.filter(o => o.status === est.id);
          const totalValue = itensStatus.reduce((acc, curr) => acc + Number(curr.valor), 0);
          return (
            <div key={est.id} className="flex flex-col h-full bg-slate-100/50 rounded-2xl border border-slate-200 min-w-[250px] overflow-hidden">
              <div className={`p-4 border-b-2 ${est.color} bg-white flex justify-between items-center`}>
                <div><h3 className={`font-black text-xs uppercase ${est.text}`}>{est.label}</h3><p className="text-[10px] text-slate-400 font-bold">{formatMoney(totalValue)}</p></div>
                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{itensStatus.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {itensStatus.map(op => {
                  const atraso = isAtrasado(op.data_lembrete) && op.status !== 'fechado';
                  return (
                    <div key={op.id} onClick={() => { 
                      setEditingOp(op); 
                      // Mapeia corretamente os campos do banco para o formulário
                      setFormData({ 
                        cnpj: op.cnpj || '',
                        nomeCliente: op.nome_cliente || '',
                        contato: op.contato || '',
                        telefone: op.telefone || '',
                        produto: op.produto || '',
                        aplicacao: op.aplicacao || '',
                        valor: op.valor || '',
                        estagio: op.status, 
                        dataEntrada: op.data_entrada, 
                        dataLembrete: op.data_lembrete || '',
                        observacoes: op.observacoes || ''
                      }); 
                      setModalOpen(true); 
                    }} 
                      className={`bg-white p-4 rounded-xl shadow-sm border-2 transition-all cursor-pointer relative ${atraso ? 'border-red-500 animate-pulse shadow-red-50' : 'border-slate-50 hover:border-blue-400'}`}>
                      {atraso && <AlertCircle size={14} className="absolute top-2 right-2 text-red-500" />}
                      <p className="text-[8px] font-bold text-slate-300 uppercase mb-1">{op.cnpj || 'S/ CNPJ'}</p>
                      <h4 className="font-bold text-slate-700 text-sm leading-tight mb-2 uppercase truncate">{op.nome_cliente}</h4>
                      <div className="flex justify-between items-end"><span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-bold">{op.produto || 'Geral'}</span><span className="text-xs font-black text-slate-600">{formatMoney(op.valor)}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE EDIÇÃO E CRIAÇÃO */}
      {modalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95">
            <div className="bg-[#242f3e] p-6 flex justify-between items-center text-white shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">✨ {editingOp ? 'Editar Proposta' : 'Nova Oportunidade'}</h2>
              <div className="flex gap-2">
                <button className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-white/20 transition"><Calendar size={14}/> Agendar</button>
                <button onClick={() => setModalOpen(false)} className="hover:bg-white/10 p-1 rounded-full transition"><X/></button>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto bg-white flex-1">
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">CNPJ (Busca Automática)</label>
              <div className="flex gap-2"><input className="w-full bg-slate-50 border rounded-xl p-3 font-mono text-sm outline-none focus:border-blue-500" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} onBlur={buscarDadosCNPJ}/><button onClick={buscarDadosCNPJ} className="bg-blue-50 text-blue-600 p-3 rounded-xl border border-blue-100 hover:bg-blue-100 transition">{loadingCNPJ ? <Loader2 className="animate-spin w-5 h-5"/> : <Search size={20}/>}</button></div></div>

              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nome do Cliente</label><input className="w-full bg-slate-50 border rounded-xl p-3 font-bold uppercase outline-none focus:border-blue-500" value={formData.nomeCliente} onChange={e => setFormData({...formData, nomeCliente: e.target.value})}/></div>
              
              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Contato</label><input className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:border-blue-500" value={formData.contato} onChange={e => setFormData({...formData, contato: e.target.value})} placeholder="Ex: Dra. Ana"/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Telefone</label><input className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:border-blue-500" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} placeholder="(00) 00000-0000"/></div>
              
              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Produto / Ativo</label>
                <input list="prod-list-v3" className="w-full bg-slate-50 border rounded-xl p-3 font-bold outline-none focus:border-blue-500" value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})}/>
                <datalist id="prod-list-v3">{PRODUTOS_SUGESTAO.map(p => <option key={p} value={p}/>)}</datalist>
              </div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Aplicação</label><input className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:border-blue-500" value={formData.aplicacao} onChange={e => setFormData({...formData, aplicacao: e.target.value})} placeholder="Ex: Dermato..."/></div>

              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Valor (R$)</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3 font-black text-green-700 outline-none focus:border-green-500" value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Data Entrada</label><input type="date" className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:border-blue-500" value={formData.dataEntrada} onChange={e => setFormData({...formData, dataEntrada: e.target.value})}/></div>

              <div className="md:col-span-2 border-t pt-4 grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Fase Atual</label><select className="w-full bg-white border rounded-xl p-3 font-bold cursor-pointer" value={formData.estagio} onChange={e => setFormData({...formData, estagio: e.target.value as any})}>{ESTAGIOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</select></div>
                <div><label className="text-[10px] font-bold text-orange-500 uppercase mb-1 block">Lembrete</label><input type="date" className="w-full bg-orange-50 border-orange-200 border rounded-xl p-3 font-bold text-orange-800 outline-none" value={formData.dataLembrete} onChange={e => setFormData({...formData, dataLembrete: e.target.value})}/></div>
              </div>

              <div className="md:col-span-2 bg-blue-50/30 p-4 rounded-2xl border border-blue-100">
                  <label className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2 mb-2"><StickyNote size={14}/> Histórico Estratégico</label>
                  <textarea rows={3} className="w-full bg-white border border-blue-100 rounded-xl p-3 text-sm outline-none resize-none focus:ring-1 focus:ring-blue-400" placeholder="Anote aqui o que conversou com o cliente..." value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})}/>
              </div>
            </div>

            {/* BARRA DE BOTÕES */}
            <div className="p-6 bg-slate-50 border-t flex justify-between items-center shrink-0">
              {editingOp ? (
                <button onClick={() => setConfirmDelete(true)} className="text-red-500 font-bold text-xs hover:text-red-700 transition uppercase tracking-widest">Excluir</button>
              ) : <div/>}
              <div className="flex gap-2">
                <button onClick={() => setModalOpen(false)} className="px-6 font-bold text-slate-400 hover:text-slate-600 transition">Cancelar</button>
                <button onClick={handleSave} className="bg-[#2563eb] text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-blue-100 hover:scale-105 transition uppercase tracking-widest">Salvar</button>
              </div>
            </div>
          </div>
        </div>, document.body
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {confirmDelete && mounted && createPortal(<div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"><div className="bg-white w-full max-w-sm rounded-2xl p-8 text-center shadow-2xl"><AlertTriangle size={48} className="text-red-500 mx-auto mb-4"/><h3 className="text-lg font-bold text-slate-800">Deseja excluir permanentemente?</h3><div className="flex gap-3 mt-8"><button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 border rounded-xl font-bold text-slate-500 transition hover:bg-slate-50">Não</button><button onClick={deleteOportunidade} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold transition hover:bg-red-700">Sim, Excluir</button></div></div></div>, document.body)}
    </div>
  );
}