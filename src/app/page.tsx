"use client";

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Users, CheckCircle2, Circle, Plus, Trash2, Edit2, 
  Sun, MapPin, Calendar, TrendingUp, X, Clock, Search, Bell
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function Dashboard() {
  const supabase = createClientComponentClient();
  
  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);
  const [primeiroNome, setPrimeiroNome] = useState("Dionatan");
  const [saudacao, setSaudacao] = useState("OLÁ");
  const [clima, setClima] = useState({ temp: 28, cidade: 'Maringá', condicao: '' });
  const [detalhesClima, setDetalhesClima] = useState<any>(null);
  const [showClimaModal, setShowClimaModal] = useState(false);

  const [metaAlvo, setMetaAlvo] = useState(150000);
  const [valorFechado, setValorFechado] = useState(0); 
  const [qtdOportunidades, setQtdOportunidades] = useState(0); 
  const [valorNegociacao, setValorNegociacao] = useState(0); 
  const [totalCarteira, setTotalCarteira] = useState(0);

  const [tarefas, setTarefas] = useState<any[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<any>(null);
  const [formTarefa, setFormTarefa] = useState({ titulo: '', cliente_id: '', nomeCliente: '', data: '', hora: '', observacoes: '' });
  const [busca, setBusca] = useState("");
  const [sugestoes, setSugestoes] = useState<any[]>([]);

  useEffect(() => {
    carregarDados();
    definirSaudacao();
    buscarClimaReal();
    window.addEventListener('focus', carregarDados);
    const interval = setInterval(checarLembretes, 60000);
    return () => {
      window.removeEventListener('focus', carregarDados);
      clearInterval(interval);
    };
  }, []);

  const definirSaudacao = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) setSaudacao("Bom dia");
    else if (hora >= 12 && hora < 18) setSaudacao("Boa tarde");
    else setSaudacao("Boa noite");
  };

  const buscarClimaReal = async () => {
    try {
      const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Maringa,br&units=metric&lang=pt_br&appid=${API_KEY}`);
      const data = await res.json();
      if (data.main) {
        setClima({ temp: Math.round(data.main.temp), cidade: data.name, condicao: data.weather[0].description });
        setDetalhesClima(data);
      }
    } catch (e) { console.error(e); }
  };

  const carregarDados = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const emailBase = user.email?.split('@')[0] || "Dionatan";
      setPrimeiroNome(emailBase.replace('hoegen', '').charAt(0).toUpperCase() + emailBase.replace('hoegen', '').slice(1).toLowerCase());

      const { data: dMeta } = await supabase.from('metas').select('valor_meta').eq('user_id', user.id).single();
      if (dMeta) setMetaAlvo(dMeta.valor_meta);

      const { data: pipe } = await supabase.from('pipeline').select('valor, status').eq('user_id', user.id);
      if (pipe) {
        setValorFechado(pipe.filter(i => i.status?.toLowerCase() === 'fechado').reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0));
        setQtdOportunidades(pipe.filter(i => ['prospeccao', 'qualificacao', 'apresentacao'].includes(i.status?.toLowerCase())).length);
        setValorNegociacao(pipe.filter(i => i.status?.toLowerCase() === 'negociacao').reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0));
      }

      const { count } = await supabase.from('base_clientes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      setTotalCarteira(count || 0);

      const { data: t } = await supabase.from('tarefas').select('*, base_clientes(fantasia)').eq('user_id', user.id).order('data_lembrete', { ascending: true });
      setTarefas(t || []);
    }
    setLoading(false);
  };

  const buscarClientesHibrido = async (val: string) => {
    setBusca(val);
    if (val.length < 2) { setSugestoes([]); return; }
    const { data: base } = await supabase.from('base_clientes').select('id, fantasia').ilike('fantasia', `%${val}%`).limit(3);
    const { data: pipe } = await supabase.from('pipeline').select('id, nome_cliente').ilike('nome_cliente', `%${val}%`).limit(3);
    const unificados = [
      ...(base?.map(b => ({ id: b.id, nome: b.fantasia, origem: 'BASE' })) || []),
      ...(pipe?.map(p => ({ id: p.id, nome: p.nome_cliente, origem: 'PIPELINE' })) || [])
    ];
    setSugestoes(unificados);
  };

  const salvarTarefa = async () => {
    if (!formTarefa.titulo || !formTarefa.data || !formTarefa.hora) return alert("Preencha os campos obrigatórios.");
    const { data: { user } } = await supabase.auth.getUser();
    const dataHoraISO = `${formTarefa.data}T${formTarefa.hora}:00`;
    const payload = { user_id: user?.id, titulo: formTarefa.titulo, cliente_id: formTarefa.cliente_id || null, data_lembrete: dataHoraISO, observacoes: formTarefa.observacoes, concluido: false };
    
    if (editingTarefa) await supabase.from('tarefas').update(payload).eq('id', editingTarefa.id);
    else await supabase.from('tarefas').insert(payload);
    
    setIsTaskModalOpen(false); setEditingTarefa(null); carregarDados();
  };

  const checarLembretes = () => {
    const agora = new Date().toISOString().slice(0, 16);
    tarefas.forEach(t => {
      if (t.data_lembrete?.slice(0, 16) === agora && !t.concluido) {
        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
        alert(`🔔 TAREFA: ${t.titulo}`);
      }
    });
  };

  const porcentagemMeta = Math.min(Math.round((valorFechado / metaAlvo) * 100), 100);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* 1. CABEÇALHO COMPLETO RESTAURADO */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="text-center xl:text-left min-w-[200px]">
          <p className="text-slate-500 font-medium flex items-center justify-center xl:justify-start gap-2 mb-1 uppercase text-[10px] tracking-widest">
             <Calendar size={14} className="text-green-600"/> {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            {saudacao}, <span className="text-green-700">{primeiroNome}!</span>
          </h1>
        </div>
        <div className="flex-1 w-full xl:w-auto bg-green-50 border border-green-100 p-4 rounded-2xl text-center">
          <p className="text-sm text-green-800 font-medium italic">"O prescritor não compra um ativo, ele compra a solução para a dor do paciente."</p>
          <span className="text-[10px] font-black text-green-700 uppercase mt-2 block tracking-widest">#FocoNoResultado</span>
        </div>
        <div onClick={() => setShowClimaModal(true)} className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-4 min-w-[180px] cursor-pointer hover:bg-blue-100 transition shadow-sm group">
           <div className="p-3 bg-white text-blue-500 rounded-full shadow-sm group-hover:scale-110 transition"><Sun size={24}/></div>
           <div><p className="text-2xl font-black text-slate-800">{clima.temp}°C</p><p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><MapPin size={10}/> {clima.cidade}</p></div>
        </div>
      </div>

      {/* 2. CARDS DE KPI RESTAURADOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] text-white p-6 rounded-3xl relative overflow-hidden shadow-lg border-2 border-green-600">
          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Meta Mensal</p>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-3xl font-bold">R$ {valorFechado.toLocaleString('pt-BR')}</span>
            <span className="text-sm text-slate-500 mb-1">/ {metaAlvo.toLocaleString('pt-BR')}</span>
          </div>
          <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${porcentagemMeta}%` }}></div></div>
          <p className="text-xs font-bold text-green-400 mt-2 text-right">{porcentagemMeta}% Concluído 🚀</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border-2 border-green-600 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div><p className="text-xs font-bold text-slate-400 uppercase">Oportunidades</p><h3 className="text-4xl font-black text-slate-800 mt-1">{qtdOportunidades}</h3></div>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><DollarSign size={20} /></div>
          </div>
          <p className="text-sm text-blue-600 font-bold mt-4 bg-blue-50 inline-block px-3 py-1 rounded-lg self-start">R$ {valorNegociacao.toLocaleString('pt-BR')} em negociação</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border-2 border-green-600 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carteira Ativa</p><h3 className="text-4xl font-black text-slate-800 mt-1">{totalCarteira}</h3></div>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center"><Users size={20} /></div>
          </div>
          <p className="text-sm text-purple-600 font-bold mt-4 bg-purple-50 inline-block px-3 py-1 rounded-lg self-start">Total de Clientes na Base</p>
        </div>
      </div>

      {/* 3. AGENDA E FLUXO DE TRABALHO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Bell className="text-green-600" size={24} /> Fluxo de Trabalho</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Lembretes e Compromissos</p>
            </div>
            <button onClick={() => { setEditingTarefa(null); setFormTarefa({ titulo: '', cliente_id: '', nomeCliente: '', data: '', hora: '', observacoes: '' }); setIsTaskModalOpen(true); }} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-green-100 flex items-center gap-2">+ NOVA TAREFA</button>
          </div>
          <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
            {tarefas.length === 0 ? <p className="text-center py-10 text-slate-400 text-sm">Nenhuma tarefa para hoje. ☀️</p> : tarefas.map(t => (
              <div key={t.id} className="group bg-slate-50 hover:bg-white hover:shadow-md border border-transparent hover:border-green-100 p-5 rounded-[2rem] transition-all flex items-center gap-6">
                <button onClick={() => {/* toggle */}} className="shrink-0">{t.concluido ? <CheckCircle2 className="text-green-500" size={28}/> : <Circle className="text-slate-200" size={28}/>}</button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase">{new Date(t.data_lembrete).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                    {t.base_clientes && <span className="text-[10px] font-black text-green-600">| {t.base_clientes.fantasia}</span>}
                  </div>
                  <h4 className="font-bold text-slate-700">{t.titulo}</h4>
                  {t.observacoes && <p className="text-xs text-slate-400 mt-1 italic">"{t.observacoes}"</p>}
                </div>
                <button onClick={() => { setEditingTarefa(t); setFormTarefa({ titulo: t.titulo, cliente_id: t.cliente_id, nomeCliente: t.base_clientes?.fantasia || '', data: t.data_lembrete.split('T')[0], hora: t.data_lembrete.split('T')[1].slice(0,5), observacoes: t.observacoes }); setIsTaskModalOpen(true); }} className="p-3 bg-white text-slate-400 hover:text-blue-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition"><Edit2 size={18}/></button>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm h-fit">
          <h3 className="font-black text-lg text-slate-800 mb-6 uppercase tracking-tighter">Eventos do Mês</h3>
          <div className="space-y-6">
            <div className="flex gap-4"><div className="bg-slate-100 rounded-2xl px-3 py-2 text-center min-w-[60px]"><p className="text-[10px] font-black text-slate-400 uppercase">JAN</p><p className="text-xl font-black text-slate-700">12</p></div><div><p className="font-bold text-slate-700 text-sm">Webinar SlimHaut®</p><p className="text-xs text-slate-400 mt-1">19:00 • Online</p></div></div>
          </div>
        </div>
      </div>

      {/* MODAL DE TAREFA */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 bg-slate-800 text-white flex justify-between items-center">
              <div><h2 className="text-2xl font-black italic tracking-tighter">{editingTarefa ? 'EDITAR' : 'NOVA TAREFA'}</h2><p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">YellowLeaf CRM System</p></div>
              <button onClick={() => setIsTaskModalOpen(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition"><X size={24}/></button>
            </div>
            <div className="p-10 space-y-8 overflow-y-auto">
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">O que precisa ser feito? *</label><input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-bold outline-none focus:border-green-500 transition" value={formTarefa.titulo} onChange={e => setFormTarefa({...formTarefa, titulo: e.target.value})} /></div>
              <div className="relative space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Vincular Cliente</label>
                <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-3xl p-2 pr-6"><div className="p-3 bg-white rounded-2xl text-slate-400 mr-2"><Search size={20}/></div><input type="text" className="flex-1 bg-transparent font-bold outline-none" placeholder="Busque por nome..." value={formTarefa.nomeCliente || busca} onChange={e => buscarClientesHibrido(e.target.value)} />{formTarefa.cliente_id && <CheckCircle2 className="text-green-500" size={20}/>}</div>
                {sugestoes.length > 0 && <div className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-[2rem] shadow-2xl overflow-hidden">{sugestoes.map(s => (<button key={s.id} onClick={() => { setFormTarefa({...formTarefa, cliente_id: s.id, nomeCliente: s.nome}); setSugestoes([]); }} className="w-full p-4 text-left hover:bg-green-50 flex justify-between items-center transition"><span className="font-bold text-slate-700 text-sm">{s.nome}</span><span className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded-full text-slate-400">{s.origem}</span></button>))}</div>}
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Data *</label><input type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-bold outline-none" value={formTarefa.data} onChange={e => setFormTarefa({...formTarefa, data: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Hora *</label><input type="time" className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-bold outline-none" value={formTarefa.hora} onChange={e => setFormTarefa({...formTarefa, hora: e.target.value})} /></div>
              </div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Observações</label><textarea rows={3} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-5 font-medium outline-none resize-none" value={formTarefa.observacoes} onChange={e => setFormTarefa({...formTarefa, observacoes: e.target.value})} /></div>
            </div>
            <div className="p-8 bg-slate-50 border-t flex gap-4"><button onClick={() => setIsTaskModalOpen(false)} className="flex-1 py-5 rounded-[2rem] font-black text-slate-400">DESCARTAR</button><button onClick={salvarTarefa} className="flex-[2] py-5 bg-green-600 hover:bg-green-700 text-white rounded-[2rem] font-black shadow-xl shadow-green-100 transition active:scale-95">CONFIRMAR</button></div>
          </div>
        </div>
      )}
    </div>
  );
}