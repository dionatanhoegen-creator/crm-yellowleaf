"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { 
  Plus, Search, X, User, Phone, Mail, PlusCircle, Trash2, CheckCircle2, Loader2 
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PipelinePage() {
  const supabase = createClientComponentClient();
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);

  // Múltiplos contatos: Nome, Função, WhatsApp e E-mail
  const [contatos, setContatos] = useState([{ nome: '', funcao: '', whatsapp: '', email: '' }]);

  const [formData, setFormData] = useState({
    cnpj: '', nomeCliente: '', valor: '', status: 'prospeccao', dataEntrada: new Date().toISOString().split('T')[0]
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

  // BUSCA NA RECEITA FEDERAL (BrasilAPI)
  const buscarDadosReceita = async () => {
    const cnpjLimpo = formData.cnpj?.replace(/\D/g, '');
    if (cnpjLimpo?.length !== 14) return;
    
    setLoadingCNPJ(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      const data = await res.json();
      
      // Correção do erro Undefined
      const telCorreto = data.ddd_telefone_1 && data.telefone1 ? `(${data.ddd_telefone_1}) ${data.telefone1}` : "";
      
      setFormData(prev => ({ ...prev, nomeCliente: data.nome_fantasia || data.razao_social || '' }));
      
      // Preenche automaticamente o primeiro contato com os dados da Receita
      setContatos([{ nome: 'Principal', funcao: 'Geral', whatsapp: telCorreto, email: data.email || '' }]);
    } catch (e) { console.error("Erro ao buscar CNPJ"); }
    setLoadingCNPJ(false);
  };

  const salvarProposta = async () => {
    if (!formData.nomeCliente || !formData.valor) return alert("Preencha Nome e Valor.");
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      user_id: user?.id,
      cnpj: formData.cnpj,
      nome_cliente: formData.nomeCliente,
      valor: parseFloat(String(formData.valor)),
      status: formData.status,
      data_entrada: formData.dataEntrada,
      contatos_json: contatos // Salva a lista de contatos (Necessário ter a coluna no Supabase)
    };

    const { error } = await supabase.from('pipeline').insert(payload);
    if (!error) { setModalOpen(false); carregarOportunidades(); }
    else { alert("Erro de conexão. Verifique se a coluna contatos_json existe no banco."); }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-slate-800 italic uppercase">Gestão de Propostas</h1>
        <button onClick={() => setModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg flex items-center gap-2 transition active:scale-95">
          <Plus size={20}/> NOVA PROPOSTA
        </button>
      </div>

      {/* QUADRO KANBAN */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        {['prospeccao', 'qualificacao', 'apresentacao', 'negociacao', 'fechado', 'perdido'].map(status => (
          <div key={status} className="bg-slate-50/50 rounded-3xl border border-slate-200 p-2 min-h-[500px]">
            <h3 className="text-[10px] font-black uppercase p-3 text-center text-slate-400">{status}</h3>
            {oportunidades.filter(o => o.status === status).map(op => (
              <div key={op.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-2">
                <p className="font-bold text-sm text-slate-700 uppercase truncate">{op.nome_cliente}</p>
                <p className="text-green-600 font-black text-xs">R$ {Number(op.valor).toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* MODAL DE ELITE COM MÚLTIPLOS CONTATOS */}
      {modalOpen && createPortal(
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
              <h2 className="text-xl font-black italic uppercase">Nova Oportunidade</h2>
              <button onClick={() => setModalOpen(false)}><X/></button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">CNPJ (Busca Automática)</label>
                  <div className="flex gap-2">
                    <input className="flex-1 p-3 bg-slate-50 border rounded-xl font-bold" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} onBlur={buscarDadosReceita}/>
                    <button onClick={buscarDadosReceita} className="bg-slate-100 p-3 rounded-xl">{loadingCNPJ ? <Loader2 className="animate-spin"/> : <Search size={20}/>}</button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nome da Farmácia *</label>
                  <input className="w-full p-3 bg-slate-50 border rounded-xl font-bold uppercase" value={formData.nomeCliente} onChange={e => setFormData({...formData, nomeCliente: e.target.value})}/>
                </div>
              </div>

              {/* CONTATOS DINÂMICOS COM BOTÃO + */}
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-800 uppercase flex items-center gap-2"><User size={16} className="text-green-600"/> Equipe e Contatos</h3>
                  <button onClick={() => setContatos([...contatos, { nome: '', funcao: '', whatsapp: '', email: '' }])} className="text-green-600 font-black text-[10px] flex items-center gap-1 hover:scale-105 transition">
                    <PlusCircle size={16}/> ADICIONAR
                  </button>
                </div>
                {contatos.map((c, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-white p-3 rounded-xl shadow-sm border border-slate-100 relative group">
                    <input placeholder="Nome" className="p-2 border rounded-lg text-xs font-bold" value={c.nome} onChange={e => { const n = [...contatos]; n[i].nome = e.target.value; setContatos(n); }}/>
                    <input placeholder="Função" className="p-2 border rounded-lg text-xs" value={c.funcao} onChange={e => { const n = [...contatos]; n[i].funcao = e.target.value; setContatos(n); }}/>
                    <input placeholder="WhatsApp" className="p-2 border rounded-lg text-xs font-mono" value={c.whatsapp} onChange={e => { const n = [...contatos]; n[i].whatsapp = e.target.value; setContatos(n); }}/>
                    <div className="flex gap-2">
                      <input placeholder="E-mail" className="flex-1 p-2 border rounded-lg text-xs" value={c.email} onChange={e => { const n = [...contatos]; n[i].email = e.target.value; setContatos(n); }}/>
                      {i > 0 && <button onClick={() => setContatos(contatos.filter((_, idx) => idx !== i))} className="text-red-400"><Trash2 size={16}/></button>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Valor da Proposta *</label>
                  <input type="number" className="w-full p-3 bg-slate-50 border rounded-xl font-black text-green-700" value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})}/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Data Entrada</label>
                  <input type="date" className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={formData.dataEntrada} onChange={e => setFormData({...formData, dataEntrada: e.target.value})}/>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-6 py-4 font-black text-slate-400 uppercase text-xs">Cancelar</button>
              <button onClick={salvarProposta} className="bg-green-600 text-white px-12 py-4 rounded-[1.5rem] font-black shadow-xl shadow-green-100 hover:bg-green-700 transition-all">SALVAR PROPOSTA</button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}