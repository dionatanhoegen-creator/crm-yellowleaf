"use client";

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Users, CheckCircle2, Circle, Plus, Trash2, Edit2, 
  Sun, MapPin, Calendar, TrendingUp 
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function Dashboard() {
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [primeiroNome, setPrimeiroNome] = useState("Dionatan");
  const [saudacao, setSaudacao] = useState("Olá");
  const [clima, setClima] = useState({ temp: 28, cidade: 'Sua Região' });

  // KPIs Dinâmicos
  const [metaAlvo, setMetaAlvo] = useState(150000);
  const [valorFechado, setValorFechado] = useState(0); 
  const [qtdOportunidades, setQtdOportunidades] = useState(0); 
  const [valorNegociacao, setValorNegociacao] = useState(0); 
  const [totalCarteira, setTotalCarteira] = useState(0);

  const [tarefas, setTarefas] = useState<any[]>([]);
  const [novaTarefaTexto, setNovaTarefaTexto] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [novaMetaValor, setNovaMetaValor] = useState("");

  useEffect(() => {
    carregarDados();
    definirSaudacao();
    window.addEventListener('focus', carregarDados);
    return () => window.removeEventListener('focus', carregarDados);
  }, []);

  const definirSaudacao = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) setSaudacao("Bom dia");
    else if (hora >= 12 && hora < 18) setSaudacao("Boa tarde");
    else setSaudacao("Boa noite");
  };

  const carregarDados = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // 1. Nome do Usuário Limpo
      const emailBase = user.email?.split('@')[0] || "Dionatan";
      const nomeFinal = emailBase.toLowerCase().replace('hoegen', '');
      setPrimeiroNome(nomeFinal.charAt(0).toUpperCase() + nomeFinal.slice(1));

      // 2. Meta Alvo
      const { data: dMeta } = await supabase.from('metas').select('valor_meta').eq('user_id', user.id).single();
      if (dMeta) setMetaAlvo(dMeta.valor_meta);

      // 3. Soma do Pipeline (Status do Banco)
      const { data: pipe } = await supabase.from('pipeline').select('valor, status').eq('user_id', user.id);
      if (pipe) {
        const somaFechado = pipe
          .filter(i => i.status?.toLowerCase() === 'fechado')
          .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
        setValorFechado(somaFechado);

        const qtdOp = pipe.filter(i => 
          ['prospeccao', 'qualificacao', 'apresentacao'].includes(i.status?.toLowerCase())
        ).length;
        setQtdOportunidades(qtdOp);

        const somaNegoc = pipe
          .filter(i => i.status?.toLowerCase() === 'negociacao')
          .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
        setValorNegociacao(somaNegoc);
      }

      // 4. Carteira Ativa
      const { count } = await supabase.from('base_clientes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      setTotalCarteira(count || 0);

      // 5. Tarefas
      const { data: t } = await supabase.from('tarefas').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setTarefas(t || []);
    }
    setLoading(false);
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

  const toggleTarefa = async (id: string, statusAtual: boolean) => {
    const novasTarefas = tarefas.map(t => t.id === id ? { ...t, concluido: !statusAtual } : t);
    setTarefas(novasTarefas);
    await supabase.from('tarefas').update({ concluido: !statusAtual }).eq('id', id);
  };

  const adicionarTarefa = async () => {
    if (!novaTarefaTexto.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('tarefas').insert({ user_id: user.id, titulo: novaTarefaTexto, concluido: false }).select().single();
    if (data) { setTarefas([data, ...tarefas]); setNovaTarefaTexto(""); setIsTaskModalOpen(false); }
  };

  const deletarTarefa = async (id: string) => {
    setTarefas(tarefas.filter(t => t.id !== id));
    await supabase.from('tarefas').delete().eq('id', id);
  };

  const porcentagemMeta = Math.min(Math.round((valorFechado / metaAlvo) * 100), 100);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8 pb-20 md:pb-4">
      
      {/* 1. CABEÇALHO COMPLETO */}
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

        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-4 min-w-[180px]">
           <div className="p-3 bg-white text-blue-500 rounded-full shadow-sm"><Sun size={24}/></div>
           <div><p className="text-2xl font-black text-slate-800">{clima.temp}°C</p><p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><MapPin size={10}/> {clima.cidade}</p></div>
        </div>
      </div>

      {/* 2. DASHBOARD CARDS COM BORDAS VERDES */}
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
          <p className="text-sm text-purple-600 font-bold mt-4 bg-purple-50 inline-block px-3 py-1 rounded-lg self-start">+0 novos este mês</p>
        </div>
      </div>

      {/* 3. TAREFAS E EVENTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-slate-700 flex items-center gap-2"><CheckCircle2 className="text-green-600" /> Agenda de Tarefas</h3>
            <button onClick={() => setIsTaskModalOpen(true)} className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-green-100">+ Nova Tarefa</button>
          </div>
          <div className="space-y-3">
            {tarefas.length === 0 ? <p className="text-center py-10 text-slate-400 text-sm">Nenhuma tarefa pendente. ☀️</p> : tarefas.map((t) => (
              <div key={t.id} className="group flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-green-200 transition-all">
                <button onClick={() => toggleTarefa(t.id, t.concluido)} className={t.concluido ? 'text-green-500' : 'text-slate-300'}>{t.concluido ? <CheckCircle2 size={24} /> : <Circle size={24} />}</button>
                <span className={`flex-1 text-sm ${t.concluido ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{t.titulo}</span>
                <button onClick={() => deletarTarefa(t.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-fit">
          <h3 className="font-bold text-lg text-slate-700 mb-6">Próximos Eventos</h3>
          <div className="space-y-6">
            <div className="flex gap-4"><div className="bg-slate-100 rounded-xl px-3 py-2 text-center min-w-[60px]"><p className="text-[10px] font-bold text-slate-400">JAN</p><p className="text-xl font-black text-slate-700">12</p></div><div><p className="font-bold text-slate-700 text-sm">Webinar SlimHaut®</p><p className="text-xs text-slate-400 mt-1">19:00 • Online</p></div></div>
            <div className="flex gap-4"><div className="bg-slate-100 rounded-xl px-3 py-2 text-center min-w-[60px]"><p className="text-[10px] font-bold text-slate-400">JAN</p><p className="text-xl font-black text-slate-700">15</p></div><div><p className="font-bold text-slate-700 text-sm">Visita Fábrica</p><p className="text-xs text-slate-400 mt-1">08:30 • São Paulo</p></div></div>
            <button className="w-full py-3 border border-slate-200 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-50 transition">Ver Calendário Completo</button>
          </div>
        </div>
      </div>

      {/* MODAIS */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-lg mb-4">Nova Tarefa</h3>
            <input autoFocus type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4" value={novaTarefaTexto} onChange={(e) => setNovaTarefaTexto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionarTarefa()} />
            <div className="flex justify-end gap-2"><button onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-slate-500">Cancelar</button><button onClick={adicionarTarefa} className="px-4 py-2 bg-green-600 text-white rounded-lg">Adicionar</button></div>
          </div>
        </div>
      )}

      {isMetaModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg mb-4">Alterar Meta</h3>
            <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4" value={novaMetaValor} onChange={(e) => setNovaMetaValor(e.target.value)} />
            <div className="flex justify-end gap-2"><button onClick={() => setIsMetaModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button><button onClick={atualizarMeta} className="px-4 py-2 bg-[#1e293b] text-white rounded-lg font-bold">Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}