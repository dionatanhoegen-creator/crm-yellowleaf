"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { 
  Plus, Search, Calendar, User, Phone, DollarSign, 
  X, Briefcase, Tag, Beaker, MessageCircle, AlertCircle, Clock,
  CheckCircle2, Trash2, ShieldAlert, AlertTriangle, Loader2, Mail, PlusCircle
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const API_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

interface Contato {
  nome: string;
  funcao: string;
  whatsapp: string;
  email: string;
}

interface Oportunidade {
  id: string;
  cnpj: string;
  nomeCliente: string;
  produto: string;
  aplicacao: string;
  valor: number;
  dataEntrada: string;
  dataLembrete?: string;
  estagio: 'prospeccao' | 'qualificacao' | 'apresentacao' | 'negociacao' | 'fechado' | 'perdido';
  motivoPerda?: string;
  contatos_json?: Contato[];
  clienteJaCadastrado?: boolean;
}

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
  const [contatos, setContatos] = useState<Contato[]>([{ nome: '', funcao: '', whatsapp: '', email: '' }]);
  const [formData, setFormData] = useState<Partial<Oportunidade>>({ estagio: 'prospeccao', dataEntrada: new Date().toISOString().split('T')[0], valor: 0 });

  useEffect(() => {
    setMounted(true);
    carregarOportunidades();
    carregarBaseClientes();
  }, []);

  const carregarOportunidades = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('pipeline').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) {
      setOportunidades(data.map(item => ({
        ...item,
        id: item.id,
        nomeCliente: item.nome_cliente,
        estagio: item.status,
        dataEntrada: item.data_entrada,
        contatos_json: item.contatos_json || []
      })));
    }
    setLoading(false);
  };

  const carregarBaseClientes = async () => {
    try {
      const res = await fetch(`${API_URL}?path=clientes`);
      const json = await res.json();
      if (json.success) setBaseClientes(json.data);
    } catch (e) { console.error(e); }
  };

  const adicionarContato = () => setContatos([...contatos, { nome: '', funcao: '', whatsapp: '', email: '' }]);
  const removerContato = (index: number) => setContatos(contatos.filter((_, i) => i !== index));

  const buscarDadosCNPJ = async () => {
    const cnpjLimpo = formData.cnpj?.replace(/\D/g, '');
    if (!cnpjLimpo || cnpjLimpo.length !== 14) return;
    setLoadingCNPJ(true);

    // 1. Verifica na base interna
    const clienteExistente = baseClientes.find(c => c.cnpj?.toString().replace(/\D/g, '') === cnpjLimpo);
    if (clienteExistente) {
      setFormData(prev => ({ ...prev, nomeCliente: clienteExistente.fantasia || clienteExistente.razao, clienteJaCadastrado: true }));
      setContatos([{ 
        nome: clienteExistente.comprador || 'Principal', 
        funcao: 'Comprador', 
        whatsapp: clienteExistente.whatsapp || clienteExistente.telefone || '', 
        email: clienteExistente.email || '' 
      }]);
      setLoadingCNPJ(false);
      return;
    }

    // 2. BrasilAPI (Correção Undefined)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      const data = await res.json();
      const tel = data.ddd_telefone_1 && data.telefone1 ? `(${data.ddd_telefone_1}) ${data.telefone1}` : "";
      
      setFormData(prev => ({ ...prev, nomeCliente: data.nome_fantasia || data.razao_social, clienteJaCadastrado: false }));
      setContatos([{ nome: '', funcao: '', whatsapp: tel, email: data.email || '' }]);
    } catch (e) { console.error(e); }
    setLoadingCNPJ(false);
  };

  const handleSave = async () => {
    if (!formData.nomeCliente || !formData.valor) return alert("Preencha o nome e o valor.");
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      user_id: user?.id,
      cnpj: formData.cnpj,
      nome_cliente: formData.nomeCliente,
      produto: formData.produto,
      aplicacao: formData.aplicacao,
      valor: formData.valor,
      status: formData.estagio,
      data_entrada: formData.dataEntrada,
      contatos_json: contatos // Salva a lista de contatos
    };

    if (editingOp) await supabase.from('pipeline').update(payload).eq('id', editingOp.id);
    else await supabase.from('pipeline').insert(payload);

    setModalOpen(false);
    carregarOportunidades();
  };

  const handleOpenModal = (op?: Oportunidade) => {
    if (op) {
      setEditingOp(op);
      setFormData(op);
      setContatos(op.contatos_json?.length ? op.contatos_json : [{ nome: '', funcao: '', whatsapp: '', email: '' }]);
    } else {
      setEditingOp(null);
      setFormData({ estagio: 'prospeccao', dataEntrada: new Date().toISOString().split('T')[0], valor: 0 });
      setContatos([{ nome: '', funcao: '', whatsapp: '', email: '' }]);
    }
    setModalOpen(true);
  };

  return (
    <div className="w-full p-4">
      <div className="flex justify-between items-center mb-8 pt-4">
        <h1 className="text-2xl font-black text-slate-800 italic uppercase tracking-tighter">Pipeline YellowLeaf</h1>
        <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg transition-transform active:scale-95">
          <Plus size={20}/> NOVA OPORTUNIDADE
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 h-[calc(100vh-180px)] overflow-x-auto pb-4">
        {ESTAGIOS.map(est => (
          <div key={est.id} className="bg-slate-50/50 rounded-[2rem] border border-slate-200 flex flex-col min-w-[250px] overflow-hidden">
            <div className={`p-4 border-b-4 ${est.color} bg-white`}>
              <h3 className={`font-black text-xs uppercase tracking-widest ${est.text}`}>{est.label}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1">{oportunidades.filter(o => o.estagio === est.id).length} cards</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {oportunidades.filter(o => o.estagio === est.id).map(op => (
                <div key={op.id} onClick={() => handleOpenModal(op)} className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100 cursor-pointer hover:border-blue-400 transition-all">
                  <p className="text-[9px] font-black text-slate-300 uppercase mb-1">{op.cnpj || 'S/ CNPJ'}</p>
                  <h4 className="font-bold text-slate-700 text-sm leading-tight line-clamp-2 mb-2 uppercase">{op.nomeCliente}</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter truncate">{op.produto || 'Geral'}</span>
                    <span className="text-slate-800 text-xs font-black ml-auto">R$ {Number(op.valor).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
            <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
              <h2 className="text-xl font-black italic tracking-tighter uppercase">{editingOp ? 'Editar Proposta' : 'Nova Proposta'}</h2>
              <button onClick={() => setModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full"><X/></button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">CNPJ</label>
                  <div className="flex gap-2">
                    <input className="flex-1 p-3 bg-slate-50 border rounded-2xl font-bold" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} onBlur={buscarDadosCNPJ}/>
                    <button onClick={buscarDadosCNPJ} className="bg-slate-100 p-3 rounded-2xl"><Search size={20}/></button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Cliente *</label>
                  <input className="w-full p-3 bg-slate-50 border rounded-2xl font-bold uppercase" value={formData.nomeCliente} onChange={e => setFormData({...formData, nomeCliente: e.target.value})}/>
                </div>
              </div>

              {/* CONTATOS DINÂMICOS */}
              <div className="space-y-4 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><User size={16} className="text-green-600"/> Equipe de Contato</h3>
                  <button onClick={adicionarContato} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 hover:scale-105 transition">
                    <Plus size={14}/> ADICIONAR
                  </button>
                </div>
                {contatos.map((contato, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-white p-4 rounded-[1.5rem] shadow-sm relative group border border-slate-100">
                    <input placeholder="Nome" className="p-2 border rounded-xl text-xs font-bold" value={contato.nome} onChange={e => {
                      const newC = [...contatos]; newC[idx].nome = e.target.value; setContatos(newC);
                    }}/>
                    <input placeholder="Função" className="p-2 border rounded-xl text-xs" value={contato.funcao} onChange={e => {
                      const newC = [...contatos]; newC[idx].funcao = e.target.value; setContatos(newC);
                    }}/>
                    <input placeholder="WhatsApp" className="p-2 border rounded-xl text-xs font-mono" value={contato.whatsapp} onChange={e => {
                      const newC = [...contatos]; newC[idx].whatsapp = e.target.value; setContatos(newC);
                    }}/>
                    <div className="flex gap-2">
                      <input placeholder="E-mail" className="flex-1 p-2 border rounded-xl text-xs" value={contato.email} onChange={e => {
                        const newC = [...contatos]; newC[idx].email = e.target.value; setContatos(newC);
                      }}/>
                      {idx > 0 && <button onClick={() => removerContato(idx)} className="text-red-400"><Trash2 size={16}/></button>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Valor *</label>
                  <input type="number" className="w-full p-3 bg-slate-50 border rounded-2xl font-black text-green-700" value={formData.valor} onChange={e => setFormData({...formData, valor: parseFloat(e.target.value)})}/>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Produto</label>
                  <input list="prod-list" className="w-full p-3 bg-slate-50 border rounded-2xl font-bold" value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})}/>
                  <datalist id="prod-list">{PRODUTOS_SUGESTAO.map(p => <option key={p} value={p}/>)}</datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Fase</label>
                  <select className="w-full p-3 bg-slate-50 border rounded-2xl font-bold" value={formData.estagio} onChange={e => setFormData({...formData, estagio: e.target.value as any})}>
                    {ESTAGIOS.map(est => <option key={est.id} value={est.id}>{est.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Data Entrada</label>
                  <input type="date" className="w-full p-3 bg-slate-50 border rounded-2xl font-bold" value={formData.dataEntrada} onChange={e => setFormData({...formData, dataEntrada: e.target.value})}/>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t flex justify-end gap-4">
              <button onClick={() => setModalOpen(false)} className="px-6 py-4 font-black text-slate-400 uppercase text-xs">Descartar</button>
              <button onClick={handleSave} className="bg-green-600 text-white px-12 py-4 rounded-[1.5rem] font-black shadow-xl shadow-green-100 hover:bg-green-700 transition-all">SALVAR NA CARTEIRA</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}