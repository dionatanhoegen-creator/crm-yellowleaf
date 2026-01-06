"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { 
  Plus, Search, Calendar, User, Phone, DollarSign, 
  X, Briefcase, Tag, Beaker, MessageCircle, AlertCircle, Clock,
  CheckCircle2, Trash2, ShieldAlert, AlertTriangle, Loader2
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
}

// --- CONSTANTES ---
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
  const [formData, setFormData] = useState<Partial<Oportunidade>>({ estagio: 'prospeccao', dataEntrada: new Date().toISOString().split('T')[0], valor: 0, produto: '', aplicacao: '' });

  useEffect(() => {
    setMounted(true);
    carregarUsuario();
    carregarOportunidades();
    carregarBaseClientes();
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
        dataLembrete: item.data_lembrete, estagio: item.status as any, motivoPerda: item.motivo_perda, responsavel: usuarioLogadoNome
      })));
    }
    setLoading(false);
  };

  const carregarBaseClientes = async () => {
    try {
      const res = await fetch(`${API_URL}?path=clientes`);
      const json = await res.json();
      if (json.success) setBaseClientes(json.data);
    } catch (e) { console.error("Erro Google", e); }
  };

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const handleOpenModal = (op?: Oportunidade) => {
    setErroBloqueio(null);
    setConfirmDelete(false);
    if (op) { setEditingOp(op); setFormData(op); }
    else { setEditingOp(null); setFormData({ estagio: 'prospeccao', dataEntrada: new Date().toISOString().split('T')[0], responsavel: usuarioLogadoNome, valor: 0 }); }
    setModalOpen(true);
  };

  // BUSCA INTELIGENTE NA RECEITA FEDERAL (BrasilAPI)
  const buscarDadosCNPJ = async () => {
    const cnpjLimpo = formData.cnpj?.replace(/\D/g, '');
    if (!cnpjLimpo || cnpjLimpo.length !== 14) return;
    setLoadingCNPJ(true); setErroBloqueio(null);

    // 1. Verifica na base interna
    const clienteExistente = baseClientes.find(c => c.cnpj?.toString().replace(/\D/g, '') === cnpjLimpo);
    if (clienteExistente) {
      setFormData(prev => ({ ...prev, nomeCliente: clienteExistente.fantasia || clienteExistente.razao, telefone: clienteExistente.whatsapp || clienteExistente.telefone || '', contato: clienteExistente.comprador || '', clienteJaCadastrado: true }));
      showToast(`Cliente na base!`, 'success'); setLoadingCNPJ(false); return;
    }

    // 2. Busca BrasilAPI (Correção Undefined)
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      const telCorreto = data.ddd_telefone_1 && data.telefone1 ? `(${data.ddd_telefone_1}) ${data.telefone1}` : "";
      setFormData(prev => ({ ...prev, nomeCliente: data.nome_fantasia || data.razao_social, telefone: telCorreto, clienteJaCadastrado: false }));
    } catch (e) { showToast("CNPJ não encontrado.", 'error'); }
    setLoadingCNPJ(false);
  };

  const handleSave = async () => {
    if (!formData.nomeCliente || !formData.valor) return showToast("Nome e Valor são obrigatórios.", 'warning');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id, cnpj: formData.cnpj, nome_cliente: formData.nomeCliente, contato: formData.contato,
      telefone: formData.telefone, produto: formData.produto, aplicacao: formData.aplicacao,
      valor: Number(formData.valor) || 0, status: formData.estagio, data_entrada: formData.dataEntrada,
      data_lembrete: formData.dataLembrete, motivo_perda: formData.motivoPerda
    };

    try {
      const { error } = editingOp 
        ? await supabase.from('pipeline').update(payload).eq('id', editingOp.id)
        : await supabase.from('pipeline').insert(payload);
      if (error) throw error;
      showToast("Salvo com sucesso!", 'success'); carregarOportunidades(); setModalOpen(false);
    } catch (e) { showToast("Erro de conexão.", 'error'); }
  };

  const deleteOportunidade = async () => {
    if (!editingOp) return;
    const { error } = await supabase.from('pipeline').delete().eq('id', editingOp.id);
    if (!error) { showToast("Excluído!"); carregarOportunidades(); setModalOpen(false); }
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div className="w-full">
      {/* TOAST E HEADER */}
      {toast.show && mounted && createPortal(<div className={`fixed top-5 right-5 z-[100000] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}><CheckCircle2 size={24}/><div><p className="font-bold text-sm">{toast.msg}</p></div></div>, document.body)}
      <div className="flex justify-between gap-4 mb-6 pt-4"><h1 className="text-2xl font-black text-slate-800">Pipeline de Vendas</h1><button onClick={() => handleOpenModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">+ Nova Oportunidade</button></div>

      {loading ? <div className="text-center py-20 text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Carregando...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 h-[calc(100vh-160px)]">
          {ESTAGIOS.map(estagio => (
            <div key={estagio.id} className="flex flex-col bg-slate-100/50 rounded-xl border overflow-hidden min-w-[200px]">
              <div className={`p-2 border-b-2 ${estagio.color} bg-white`}><h3 className={`font-bold text-xs ${estagio.text}`}>{estagio.label}</h3><p className="text-[10px] text-slate-400 font-bold">{formatMoney(oportunidades.filter(o => o.estagio === estagio.id).reduce((a, b) => a + Number(b.valor), 0))}</p></div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {oportunidades.filter(o => o.estagio === estagio.id).map(item => (
                  <div key={item.id} onClick={() => handleOpenModal(item)} className="bg-white p-3 rounded-lg shadow-sm border hover:border-blue-400 cursor-pointer">
                    <h4 className="font-bold text-slate-700 text-sm truncate uppercase">{item.nomeCliente}</h4>
                    <p className="text-[10px] text-blue-600 font-bold mt-1">{item.produto || 'Geral'}</p>
                    <div className="mt-2 text-xs font-black text-slate-600">{formatMoney(item.valor)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL PRINCIPAL */}
      {modalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white shrink-0"><h2 className="text-lg font-bold">{editingOp ? '✏️ Editar' : '✨ Nova Oportunidade'}</h2><button onClick={() => setModalOpen(false)}><X/></button></div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">CNPJ (Busca Automática)</label>
                <div className="flex gap-2">
                  <input type="text" className="w-full bg-slate-50 border rounded-lg p-2 font-mono" value={formData.cnpj || ''} onChange={e => setFormData({...formData, cnpj: e.target.value})} onBlur={buscarDadosCNPJ}/>
                  <button onClick={buscarDadosCNPJ} className="bg-blue-100 p-2 rounded-lg">{loadingCNPJ ? <Loader2 className="animate-spin w-4 h-4"/> : <Search size={18}/>}</button>
                </div>
              </div>
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Nome do Cliente *</label>
              <input className="w-full bg-slate-50 border rounded-lg p-2 text-sm font-bold uppercase" value={formData.nomeCliente || ''} onChange={e => setFormData({...formData, nomeCliente: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Contato</label>
              <input className="w-full bg-slate-50 border rounded-lg p-2 text-sm" value={formData.contato || ''} onChange={e => setFormData({...formData, contato: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label>
              <input className="w-full bg-slate-50 border rounded-lg p-2 text-sm" value={formData.telefone || ''} onChange={e => setFormData({...formData, telefone: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Valor (R$)*</label>
              <input type="number" className="w-full bg-slate-50 border rounded-lg p-2 text-sm font-black text-green-700" value={formData.valor || ''} onChange={e => setFormData({...formData, valor: parseFloat(e.target.value)})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Data Entrada*</label>
              <input type="date" className="w-full bg-slate-50 border rounded-lg p-2 text-sm" value={formData.dataEntrada} onChange={e => setFormData({...formData, dataEntrada: e.target.value})}/></div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-between shrink-0">
              {editingOp ? <button onClick={() => setConfirmDelete(true)} className="text-red-600 font-bold text-sm flex items-center gap-2"><Trash2 size={16}/> Excluir</button> : <div/>}
              <div className="flex gap-2"><button onClick={() => setModalOpen(false)} className="text-slate-500 font-bold text-sm px-4">Cancelar</button><button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Salvar</button></div>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}