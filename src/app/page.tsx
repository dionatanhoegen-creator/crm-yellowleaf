"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { Plus, Search, X, Loader2, MessageCircle } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PipelinePage() {
  const supabase = createClientComponentClient();
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    cnpj: '', nomeCliente: '', valor: '', status: 'prospeccao', telefone: ''
  });

  useEffect(() => { carregarOportunidades(); }, []);

  const carregarOportunidades = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('pipeline').select('*').eq('user_id', user.id);
      setOportunidades(data || []);
    }
    setLoading(false);
  };

  const buscarDadosCNPJ = async () => {
    const cnpjLimpo = formData.cnpj?.replace(/\D/g, '');
    if (cnpjLimpo?.length !== 14) return;
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      const data = await res.json();
      // Correção definitiva do Undefined
      const tel = data.ddd_telefone_1 && data.telefone1 ? `(${data.ddd_telefone_1}) ${data.telefone1}` : "";
      setFormData(prev => ({ ...prev, nomeCliente: data.nome_fantasia || data.razao_social, telefone: tel }));
    } catch (e) { console.error(e); }
  };

  const salvar = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { 
        user_id: user?.id, 
        nome_cliente: formData.nomeCliente, 
        valor: parseFloat(String(formData.valor)),
        status: formData.status,
        cnpj: formData.cnpj,
        telefone: formData.telefone
    };
    const { error } = await supabase.from('pipeline').insert(payload);
    if (!error) { setModalOpen(false); carregarOportunidades(); }
    else { alert("Erro ao salvar. Verifique a conexão."); }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-slate-800">GESTÃO DE PROPOSTAS</h1>
        <button onClick={() => setModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-100 flex items-center gap-2">
          <Plus size={20}/> NOVA PROPOSTA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        {['prospeccao', 'qualificacao', 'apresentacao', 'negociacao', 'fechado', 'perdido'].map(col => (
          <div key={col} className="bg-slate-50 rounded-3xl p-2 min-h-[400px] border border-slate-200">
            <h3 className="text-[10px] font-black uppercase p-3 text-center text-slate-400">{col}</h3>
            {oportunidades.filter(o => o.status === col).map(op => (
              <div key={op.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-2">
                <p className="font-bold text-sm text-slate-700 uppercase truncate">{op.nome_cliente}</p>
                <p className="text-green-600 font-black text-xs">R$ {Number(op.valor).toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {modalOpen && createPortal(
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black italic uppercase text-slate-800">Nova Proposta</h2>
              <button onClick={() => setModalOpen(false)}><X/></button>
            </div>
            <div className="space-y-4">
              <input placeholder="CNPJ" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} onBlur={buscarDadosCNPJ}/>
              <input placeholder="Nome da Farmácia" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.nomeCliente} onChange={e => setFormData({...formData, nomeCliente: e.target.value})}/>
              <input placeholder="Telefone" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})}/>
              <input placeholder="Valor (R$)" type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-green-700" value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})}/>
              <button onClick={salvar} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-xl shadow-green-100">SALVAR AGORA</button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}