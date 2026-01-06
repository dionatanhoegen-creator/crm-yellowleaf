"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { 
  Plus, Search, Calendar, User, Phone, DollarSign, 
  X, Briefcase, Tag, Beaker, MessageCircle, AlertCircle, Clock,
  CheckCircle2, Trash2, ShieldAlert, AlertTriangle, Loader2, Mail, PlusCircle
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PipelinePage() {
  const supabase = createClientComponentClient();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<any>(null);
  
  // Múltiplos contatos com e-mail e função
  const [contatos, setContatos] = useState([{ nome: '', funcao: '', whatsapp: '', email: '' }]);

  const [formData, setFormData] = useState({
    cnpj: '', nomeCliente: '', valor: '', produto: '', aplicacao: '',
    dataEntrada: new Date().toISOString().split('T')[0], estagio: 'prospeccao'
  });

  useEffect(() => {
    setMounted(true);
    carregarOportunidades();
  }, []);

  const carregarOportunidades = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('pipeline').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setOportunidades(data || []);
    setLoading(false);
  };

  const buscarDadosCNPJ = async () => {
    const cnpjLimpo = formData.cnpj?.replace(/\D/g, '');
    if (!cnpjLimpo || cnpjLimpo.length !== 14) return;
    
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      const data = await res.json();
      
      // Bloqueio do erro Undefined
      const tel = data.ddd_telefone_1 && data.telefone1 ? `(${data.ddd_telefone_1}) ${data.telefone1}` : "";
      
      setFormData(prev => ({ ...prev, nomeCliente: data.nome_fantasia || data.razao_social || '' }));
      setContatos([{ nome: 'Principal', funcao: 'Geral', whatsapp: tel, email: data.email || '' }]);
    } catch (e) { console.error(e); }
  };

  const salvarProposta = async () => {
    if (!formData.nomeCliente || !formData.valor) return alert("Campos obrigatórios: Nome e Valor.");
    
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      user_id: user?.id,
      cnpj: formData.cnpj,
      nome_cliente: formData.nomeCliente,
      valor: parseFloat(String(formData.valor).replace(',', '.')),
      produto: formData.produto,
      aplicacao: formData.aplicacao,
      data_entrada: formData.dataEntrada,
      status: formData.estagio,
      contatos_json: contatos // Novo formato para múltiplos contatos
    };

    const { error } = editingOp 
      ? await supabase.from('pipeline').update(payload).eq('id', editingOp.id)
      : await supabase.from('pipeline').insert(payload);

    if (error) {
      console.error(error);
      alert("Erro ao salvar: Verifique se rodou o comando SQL no Supabase.");
    } else {
      setModalOpen(false);
      carregarOportunidades();
    }
  };

  return (
    <div className="w-full p-4">
      {/* HEADER DINÂMICO */}
      <div className="flex justify-between items-center mb-8 pt-4">
        <h1 className="text-2xl font-black text-slate-800 italic uppercase">Gestão de Propostas</h1>
        <button onClick={() => { 
          setEditingOp(null); 
          setFormData({ cnpj: '', nomeCliente: '', valor: '', produto: '', aplicacao: '', dataEntrada: new Date().toISOString().split('T')[0], estagio: 'prospeccao' });
          setContatos([{ nome: '', funcao: '', whatsapp: '', email: '' }]);
          setModalOpen(true); 
        }} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg flex items-center gap-2 transition active:scale-95">
          <Plus size={20}/> NOVA PROPOSTA
        </button>
      </div>

      {/* KANBAN */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 min-h-[600px]">
        {['prospeccao', 'qualificacao', 'apresentacao', 'negociacao', 'fechado', 'perdido'].map(status => (
          <div key={status} className="bg-slate-50/50 rounded-3xl border border-slate-200 p-2">
            <div className="p-3 bg-white rounded-2xl border-b-4 border-slate-300 mb-3 text-center">
              <h3 className="text-[10px] font-black uppercase text-slate-500">{status}</h3>
            </div>
            {oportunidades.filter(o => o.status === status).map(op => (
              <div key={op.id} onClick={() => {
                setEditingOp(op);
                setFormData({ cnpj: op.cnpj, nomeCliente: op.nome_cliente, valor: op.valor, produto: op.produto, aplicacao: op.aplicacao, dataEntrada: op.data_entrada, estagio: op.status });
                setContatos(op.contatos_json || []);
                setModalOpen(true);
              }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-3 cursor-pointer hover:border-blue-400">
                <h4 className="font-bold text-slate-700 text-sm truncate uppercase">{op.nome_cliente}</h4>
                <p className="text-green-600 font-black text-xs mt-1">R$ {Number(op.valor).toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* MODAL COM MÚLTIPLOS CONTATOS */}
      {modalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
              <h2 className="text-xl font-black italic uppercase">Gestão da Farmácia</h2>
              <button onClick={() => setModalOpen(false)}><X/></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">CNPJ</label>
                  <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} onBlur={buscarDadosCNPJ}/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nome da Farmácia *</label>
                  <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold uppercase" value={formData.nomeCliente} onChange={e => setFormData({...formData, nomeCliente: e.target.value})}/>
                </div>
              </div>

              {/* SEÇÃO CONTATOS + BOTÃO ADICIONAR */}
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-800 uppercase flex items-center gap-2"><Users size={16} className="text-green-600"/> Equipe e Contatos</h3>
                  <button onClick={() => setContatos([...contatos, { nome: '', funcao: '', whatsapp: '', email: '' }])} className="text-green-600 font-black text-[10px] flex items-center gap-1 hover:scale-110 transition">
                    <PlusCircle size={16}/> ADICIONAR
                  </button>
                </div>
                {contatos.map((c, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                    <input placeholder="Nome" className="p-2 border rounded-lg text-xs font-bold" value={c.nome} onChange={e => { const n = [...contatos]; n[i].nome = e.target.value; setContatos(n); }}/>
                    <input placeholder="Função" className="p-2 border rounded-lg text-xs" value={c.funcao} onChange={e => { const n = [...contatos]; n[i].funcao = e.target.value; setContatos(n); }}/>
                    <input placeholder="Whats" className="p-2 border rounded-lg text-xs font-mono" value={c.whatsapp} onChange={e => { const n = [...contatos]; n[i].whatsapp = e.target.value; setContatos(n); }}/>
                    <input placeholder="E-mail" className="p-2 border rounded-lg text-xs" value={c.email} onChange={e => { const n = [...contatos]; n[i].email = e.target.value; setContatos(n); }}/>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Valor da Proposta (R$) *</label>
                <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-green-700" value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})}/></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Data Entrada</label>
                <input type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.dataEntrada} onChange={e => setFormData({...formData, dataEntrada: e.target.value})}/></div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-6 py-4 font-black text-slate-400 uppercase text-xs">Cancelar</button>
              <button onClick={salvarProposta} className="bg-green-600 text-white px-12 py-4 rounded-[1.5rem] font-black shadow-xl shadow-green-100 hover:bg-green-700 transition-all">SALVAR AGORA</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}