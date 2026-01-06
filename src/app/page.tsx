"use client";

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Users, CheckCircle2, Circle, Plus, Trash2, Edit2, 
  Sun, MapPin, Calendar, TrendingUp, X, AlertTriangle, Search
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function Dashboard() {
  const supabase = createClientComponentClient();
  
  // --- ESTADOS GERAIS ---
  const [loading, setLoading] = useState(true);
  const [primeiroNome, setPrimeiroNome] = useState("Dionatan");
  const [saudacao, setSaudacao] = useState("Olá");
  const [clima, setClima] = useState({ temp: 28, cidade: 'Maringá', condicao: 'Carregando...' });
  const [detalhesClima, setDetalhesClima] = useState<any>(null);
  const [showClimaModal, setShowClimaModal] = useState(false);

  // --- ESTADOS KPIs ---
  const [metaAlvo, setMetaAlvo] = useState(150000);
  const [valorFechado, setValorFechado] = useState(0); 
  const [qtdOportunidades, setQtdOportunidades] = useState(0); 
  const [valorNegociacao, setValorNegociacao] = useState(0); 
  const [totalCarteira, setTotalCarteira] = useState(0);

  // --- ESTADOS TAREFAS E BUSCA ---
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [novaTarefaTexto, setNovaTarefaTexto] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clientesFiltrados, setClientesFiltrados] = useState<any[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [dataLembrete, setDataLembrete] = useState("");

  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [novaMetaValor, setNovaMetaValor] = useState("");

  useEffect(() => {
    carregarDados();
    definirSaudacao();
    buscarClimaReal();
    window.addEventListener('focus', carregarDados);
    
    // Verificador de Lembretes (roda a cada minuto)
    const timerLembrete = setInterval(checarLembretes, 60000);
    
    return () => {
      window.removeEventListener('focus', carregarDados);
      clearInterval(timerLembrete);
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
    } catch (e) { console.error("Erro clima", e); }
  };

  const checarLembretes = () => {
    const agoraStr = new Date().toISOString().slice(0, 16);
    tarefas.forEach(t => {
      if (t.data_lembrete && t.data_lembrete.slice(0, 16) === agoraStr && !t.concluido) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log("Erro som", e));
        alert(`🔔 TAREFA AGORA: ${t.titulo}`);
      }
    });
  };

  const carregarDados = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const emailBase = user.email?.split('@')[0] || "Dionatan";
      setPrimeiroNome(emailBase.toLowerCase().replace('hoegen', '').charAt(0).toUpperCase() + emailBase.toLowerCase().replace('hoegen', '').slice(1));

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

      const { data: t } = await supabase.from('tarefas').select('*, base_clientes(fantasia)').eq('user_id', user.id).order('created_at', { ascending: false });
      setTarefas(t || []);
    }
    setLoading(false);
  };

  const pesquisarCliente = async (termo: string) => {
    setBuscaCliente(termo);
    if (termo.length > 2) {
      const { data } = await supabase.from('base_clientes').select('id, fantasia').ilike('fantasia', `%${termo}%`).limit(5);
      setClientesFiltrados(data || []);
    } else setClientesFiltrados([]);
  };

  const adicionarTarefa = async () => {
    if (!novaTarefaTexto.trim() || !dataLembrete) {
        alert("Campos 'O que fazer' e 'Data/Hora' são obrigatórios!");
        return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from('tarefas').insert({
      user_id: user.id,
      titulo: novaTarefaTexto,
      cliente_id: clienteSelecionado?.id || null,
      data_lembrete: dataLembrete,
      concluido: false
    }).select().single();

    if (data) {
      setNovaTarefaTexto(""); setClienteSelecionado(null); setDataLembrete(""); setIsTaskModalOpen(false);
      carregarDados();
    }
  };

  const toggleTarefa = async (id: string, statusAtual: boolean) => {
    const novasTarefas = tarefas.map(t => t.id === id ? { ...t, concluido: !statusAtual } : t);
    setTarefas(novasTarefas);
    await supabase.from('tarefas').update({ concluido: !statusAtual }).eq('id', id);
  };

  const deletarTarefa = async (id: string) => {
    setTarefas(tarefas.filter(t => t.id !== id));
    await supabase.from('tarefas').delete().eq('id', id);
  };

  const atualizarMeta = async () => {
    const valorNumerico = parseFloat(novaMetaValor);
    if (isNaN(valorNumerico)) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('metas').upsert({ user_id: user.id, valor_meta: valorNumerico });
    setMetaAlvo(valorNumerico);
    setIsMetaModalOpen(false);
  };

  const porcentagemMeta = Math.min(Math.round((valorFechado / metaAlvo) * 100), 100);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8 pb-20 md:pb-4 font-sans">
      
      {/* 1. CABEÇALHO COM CLIMA DINÂMICO */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="text-center xl:text-left min-w-[200px]">
          <p className="text-slate-500 font-medium flex items-center justify-center xl:justify-start gap-2 mb-1 uppercase text-[10px] tracking-widest">
             <Calendar size={14} className="text-green-600"/> segunda-feira, 5 de janeiro
          </p>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            {saudacao}, <span className="text-green-700">{primeiroNome}!</span>
          </h1>
        </div>
        
        <div className="flex-1 w-full xl:w-auto bg-green-50 border border-green-100 p-4 rounded-2xl text-center">
          <p className="text-sm text-green-800 font-medium italic">"O prescritor não compra um ativo, ele compra a solução para a dor do paciente."</p>
          <span className="text-[10px] font-black text-green-700 uppercase mt-2 block tracking-widest">#FocoNoResultado</span>
        </div>

        <div 
          onClick={() => setShowClimaModal(true)}
          className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-4 min-w-[180px] cursor-pointer hover:bg-blue-100 transition shadow-sm group"
        >
           <div className="p-3 bg-white text-blue-500 rounded-full shadow-sm group-hover:scale-110 transition"><Sun size={24}/></div>
           <div>
             <p className="text-2xl font-black text-slate-800">{clima.temp}°C</p>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><MapPin size={10}/> {clima.cidade}</p>
           </div>
        </div>
      </div>

      {/* 2. CARDS PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] text-white p-6 rounded-3xl relative overflow-hidden shadow-lg border-2 border-green-600">
          <button onClick={() => setIsMetaModalOpen(true)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white z-10"><Edit2 size={16} /></button>
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
          <p className="text-sm text-blue-600 font-bold mt-4 bg-blue-50 inline-block px-3 py-1 rounded-lg self-start">R$ {valorNegociacao.toLocaleString('pt-BR')} <span className="text-blue-400 font-normal">em negociação</span></p>
        </div>

        <div className="bg-white p-6 rounded-3xl border-2 border-green-600 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carteira Ativa</p><h3 className="text-4xl font-black text-slate-800 mt-1">{totalCarteira}</h3></div>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center"><Users size={20} /></div>
          </div>
          <p className="text-sm text-purple-600 font-bold mt-4 bg-purple-50 inline-block px-3 py-1 rounded-lg self-start">Farmácias na base</p>
        </div>
      </div>

      {/* 3. TAREFAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-slate-700 flex items-center gap-2"><CheckCircle2 className="text-green-600" /> Agenda de Tarefas</h3>
            <button onClick={() => setIsTaskModalOpen(true)} className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-green-100">+ Nova Tarefa</button>
          </div>
          <div className="space-y-3">
            {tarefas.map((t) => (
              <div key={t.id} className="group flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-green-200 transition-all">
                <button onClick={() => toggleTarefa(t.id, t.concluido)} className={t.concluido ? 'text-green-500' : 'text-slate-300'}>{t.concluido ? <CheckCircle2 size={24} /> : <Circle size={24} />}</button>
                <div className="flex-1">
                    <p className={`text-sm font-bold ${t.concluido ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{t.titulo}</p>
                    {t.base_clientes && <p className="text-[10px] text-green-600 font-bold uppercase">{t.base_clientes.fantasia}</p>}
                </div>
                <div className="text-[10px] font-bold text-slate-400">{new Date(t.data_lembrete).toLocaleString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
                <button onClick={() => deletarTarefa(t.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-fit">
          <h3 className="font-bold text-lg text-slate-700 mb-6">Próximos Eventos</h3>
          <div className="space-y-6">
            <div className="flex gap-4"><div className="bg-slate-100 rounded-xl px-3 py-2 text-center min-w-[60px]"><p className="text-[10px] font-bold text-slate-400">JAN</p><p className="text-xl font-black text-slate-700">12</p></div><div><p className="font-bold text-slate-700 text-sm">Webinar SlimHaut®</p><p className="text-xs text-slate-400 mt-1">19:00 • Online</p></div></div>
          </div>
        </div>
      </div>

      {/* --- MODAIS --- */}

      {/* Modal Clima */}
      {showClimaModal && detalhesClima && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
            <button onClick={() => setShowClimaModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold text-slate-800">{clima.cidade}</h3>
              <div className="text-6xl font-black text-slate-800">{clima.temp}°C</div>
              <p className="text-slate-500 capitalize font-medium">{clima.condicao}</p>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-left"><p className="text-[10px] font-bold text-slate-400 uppercase">Umidade</p><p className="font-bold text-slate-700">{detalhesClima.main.humidity}%</p></div>
                <div className="text-left"><p className="text-[10px] font-bold text-slate-400 uppercase">Vento</p><p className="font-bold text-slate-700">{Math.round(detalhesClima.wind.speed * 3.6)} km/h</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tarefa Inteligente */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Plus className="text-green-600"/> Nova Tarefa</h3><button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400"><X/></button></div>
            <div className="space-y-5">
              <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-2">O que precisa ser feito? *</label>
              <input autoFocus type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-green-500 outline-none" value={novaTarefaTexto} onChange={(e) => setNovaTarefaTexto(e.target.value)} /></div>
              <div className="relative"><label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Vincular a um Cliente</label>
              <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl p-2"><Users size={20} className="text-slate-400 ml-2"/><input type="text" placeholder="Buscar..." className="flex-1 p-2 bg-transparent outline-none font-bold" value={clienteSelecionado ? clienteSelecionado.fantasia : buscaCliente} onChange={(e) => pesquisarCliente(e.target.value)} />{clienteSelecionado && <button onClick={() => setClienteSelecionado(null)}><X size={12}/></button>}</div>
              {clientesFiltrados.length > 0 && !clienteSelecionado && <div className="absolute z-10 w-full mt-2 bg-white border rounded-xl shadow-xl overflow-hidden">{clientesFiltrados.map(c => (<button key={c.id} onClick={() => { setClienteSelecionado(c); setClientesFiltrados([]); }} className="w-full p-3 text-left hover:bg-green-50 text-sm font-bold text-slate-700">{c.fantasia}</button>))}</div>}</div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Data e Hora do Lembrete *</label>
              <input type="datetime-local" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none" value={dataLembrete} onChange={(e) => setDataLembrete(e.target.value)} /></div>
              <div className="flex gap-3 pt-4"><button onClick={() => setIsTaskModalOpen(false)} className="flex-1 py-4 text-slate-500 font-bold">Cancelar</button><button onClick={adicionarTarefa} className="flex-1 py-4 bg-green-600 text-white font-black rounded-2xl shadow-lg shadow-green-100">Salvar Tarefa</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Meta */}
      {isMetaModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg mb-4">Alterar Meta</h3>
            <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 outline-none focus:border-green-500 font-bold text-lg" value={novaMetaValor} onChange={(e) => setNovaMetaValor(e.target.value)} />
            <div className="flex justify-end gap-2"><button onClick={() => setIsMetaModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button><button onClick={atualizarMeta} className="px-4 py-2 bg-[#1e293b] text-white rounded-lg font-bold">Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}