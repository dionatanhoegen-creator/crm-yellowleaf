"use client";

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Users, CheckCircle2, Circle, Plus, Trash2, Edit2, 
  Sun, MapPin, Calendar, TrendingUp, ArrowRight 
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

export default function Dashboard() {
  const supabase = createClientComponentClient();
  
  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);
  const [primeiroNome, setPrimeiroNome] = useState("Visitante");
  const [saudacao, setSaudacao] = useState("Olá");
  const [clima, setClima] = useState({ temp: 28, cidade: 'Sua Região' });

  // Dados Financeiros Calculados
  const [metaAlvo, setMetaAlvo] = useState(150000); // Meta definida pelo usuário
  const [valorFechado, setValorFechado] = useState(0); // Soma de 'Fechado'
  const [qtdOportunidades, setQtdOportunidades] = useState(0); // Contagem (Prosp + Qualif + Apres)
  const [valorNegociacao, setValorNegociacao] = useState(0); // Soma de 'Negociação'
  
  // Tarefas
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [novaTarefaTexto, setNovaTarefaTexto] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [novaMetaValor, setNovaMetaValor] = useState("");

  // --- EFEITO INICIAL ---
  useEffect(() => {
    carregarDados();
    definirSaudacao();
  }, []);

  const definirSaudacao = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) setSaudacao("Bom dia");
    else if (hora >= 12 && hora < 18) setSaudacao("Boa tarde");
    else setSaudacao("Boa noite");
  };

  const carregarDados = async () => {
    setLoading(true);
    
    // 1. Pega Usuário e Formata Nome
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && user.email) {
      let nomeLimpo = user.email.split('@')[0];
      // Lógica para pegar só o primeiro nome (ex: dionatanhoegen -> Dionatan)
      // Assume que o sobrenome começa onde termina o primeiro nome conhecido ou formata simples
      if(nomeLimpo.toLowerCase().startsWith("dionatan")) nomeLimpo = "Dionatan";
      else nomeLimpo = nomeLimpo.charAt(0).toUpperCase() + nomeLimpo.slice(1);
      
      setPrimeiroNome(nomeLimpo);

      // 2. Busca Meta ALVO (Tabela Metas)
      let { data: dadosMeta } = await supabase.from('metas').select('*').eq('user_id', user.id).single();
      if (!dadosMeta) {
        // Cria meta padrão se não existir
        const { data: novaMeta } = await supabase.from('metas').insert({ user_id: user.id, valor_meta: 150000 }).select().single();
        dadosMeta = novaMeta;
      }
      if (dadosMeta) setMetaAlvo(dadosMeta.valor_meta);

      // 3. Busca Dados do PIPELINE (Para calcular os KPIs)
      const { data: pipelineData } = await supabase
        .from('pipeline')
        .select('valor, status')
        .eq('user_id', user.id);

      if (pipelineData) {
        // A. Calcular Valor Fechado (Meta Atual)
        const fechados = pipelineData.filter(item => item.status === 'Fechado');
        const somaFechado = fechados.reduce((acc, curr) => acc + (curr.valor || 0), 0);
        setValorFechado(somaFechado);

        // B. Calcular Qtd Oportunidades (Prospecção + Qualificação + Apresentação)
        const oportunidades = pipelineData.filter(item => 
          ['Prospecção', 'Qualificação', 'Apresentação'].includes(item.status)
        );
        setQtdOportunidades(oportunidades.length);

        // C. Calcular Valor em Negociação
        const negociacoes = pipelineData.filter(item => item.status === 'Negociação');
        const somaNegociacao = negociacoes.reduce((acc, curr) => acc + (curr.valor || 0), 0);
        setValorNegociacao(somaNegociacao);
      }

      // 4. Busca Tarefas
      const { data: dadosTarefas } = await supabase
        .from('tarefas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setTarefas(dadosTarefas || []);
    }
    setLoading(false);
  };

  // --- AÇÕES ---
  const adicionarTarefa = async () => {
    if (!novaTarefaTexto.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('tarefas').insert({ user_id: user.id, titulo: novaTarefaTexto, concluido: false }).select().single();
    if (data) {
      setTarefas([data, ...tarefas]);
      setNovaTarefaTexto("");
      setIsTaskModalOpen(false);
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
    await supabase.from('metas').update({ valor_meta: valorNumerico }).eq('user_id', user.id);
    setMetaAlvo(valorNumerico);
    setIsMetaModalOpen(false);
  };

  // Porcentagem da Meta
  const porcentagemMeta = Math.min(Math.round((valorFechado / metaAlvo) * 100), 100);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8 pb-20 md:pb-4">
      
      {/* 1. CABEÇALHO ORGANIZADO */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        
        {/* Saudação + Nome */}
        <div className="text-center xl:text-left min-w-[200px]">
          <p className="text-slate-500 font-medium flex items-center justify-center xl:justify-start gap-2 mb-1">
             <Calendar size={16} className="text-green-600"/> {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            {saudacao}, <span className="text-green-700">{primeiroNome}!</span>
          </h1>
        </div>
        
        {/* Frase Motivacional */}
        <div className="flex-1 w-full xl:w-auto bg-green-50 border border-green-100 p-4 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center text-center">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-200 rounded-full blur-2xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-sm text-green-800 font-medium italic relative z-10 max-w-lg leading-relaxed">
            "O prescritor não compra um ativo, ele compra a solução para a dor do paciente."
          </p>
          <span className="text-[10px] font-black text-green-700 uppercase mt-2 block tracking-widest bg-white/50 px-2 py-0.5 rounded-full">
            #FocoNoResultado
          </span>
        </div>

        {/* Clima */}
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-4 min-w-[180px]">
           <div className="p-3 bg-white text-blue-500 rounded-full shadow-sm">
             <Sun size={24}/>
           </div>
           <div>
             <p className="text-2xl font-black text-slate-800">{clima.temp}°C</p>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
               <MapPin size={10}/> {clima.cidade}
             </p>
           </div>
        </div>
      </div>

      {/* 2. DASHBOARD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CARD META - Soma de 'Fechado' */}
        <div className="bg-[#1e293b] text-white p-6 rounded-3xl relative overflow-hidden shadow-lg border-2 border-green-600 group">
          <button 
             onClick={() => setIsMetaModalOpen(true)}
             className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition text-white z-20"
             title="Editar Meta Alvo"
          >
            <Edit2 size={16} />
          </button>
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500 rounded-full blur-3xl opacity-10 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <TrendingUp size={20} className="text-green-400"/>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Meta Mensal</p>
          </div>
          
          <div className="flex items-end gap-2 mb-4 relative z-10">
            <span className="text-3xl font-bold">R$ {valorFechado.toLocaleString('pt-BR')}</span>
            <span className="text-sm text-slate-500 mb-1">/ {metaAlvo.toLocaleString('pt-BR')}</span>
          </div>

          <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden relative z-10">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000"
              style={{ width: `${porcentagemMeta}%` }}
            ></div>
          </div>
          <div className="flex justify-end mt-2 relative z-10">
            <span className="text-xs font-bold text-green-400">{porcentagemMeta}% Concluído 🚀</span>
          </div>
        </div>

        {/* CARD OPORTUNIDADES - Contagem Prospecção/Qualificação/Apresentação */}
        <div className="bg-white p-6 rounded-3xl border-2 border-green-600 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Oportunidades</p>
              {/* Mostra a quantidade calculada */}
              <h3 className="text-4xl font-black text-slate-800 mt-1">{qtdOportunidades}</h3>
            </div>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
          {/* Mostra soma de 'Negociação' */}
          <p className="text-sm text-blue-600 font-bold mt-4 bg-blue-50 inline-block px-3 py-1 rounded-lg self-start">
            R$ {valorNegociacao.toLocaleString('pt-BR')} <span className="text-blue-400 font-normal">em negociação</span>
          </p>
        </div>

        {/* CARD CARTEIRA ATIVA (Estático por enquanto, aguardando tabela Clientes) */}
        <div className="bg-white p-6 rounded-3xl border-2 border-green-600 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carteira Ativa</p>
              <h3 className="text-4xl font-black text-slate-800 mt-1">48</h3>
            </div>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
          <p className="text-sm text-purple-600 font-bold mt-4 bg-purple-50 inline-block px-3 py-1 rounded-lg self-start">
            +3 novos <span className="text-purple-400 font-normal">este mês</span>
          </p>
        </div>
      </div>

      {/* 3. AGENDA E EVENTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-green-600" size={24} />
              <h3 className="font-bold text-lg text-slate-700">Agenda de Tarefas</h3>
            </div>
            <button onClick={() => setIsTaskModalOpen(true)} className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-green-100 transition"><Plus size={16} /> Nova Tarefa</button>
          </div>
          <div className="space-y-3">
            {tarefas.length === 0 ? (
              <div className="text-center py-10 text-slate-400"><p>Nenhuma tarefa pendente. Aproveite o dia! ☀️</p></div>
            ) : (
              tarefas.map((tarefa) => (
                <div key={tarefa.id} className="group flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-green-200 transition-all">
                  <button onClick={() => toggleTarefa(tarefa.id, tarefa.concluido)} className={`transition-colors ${tarefa.concluido ? 'text-green-500' : 'text-slate-300 hover:text-green-500'}`}>
                    {tarefa.concluido ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>
                  <span className={`flex-1 font-medium text-sm ${tarefa.concluido ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{tarefa.titulo}</span>
                  <button onClick={() => deletarTarefa(tarefa.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={18} /></button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-fit">
          <h3 className="font-bold text-lg text-slate-700 mb-6">Próximos Eventos</h3>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="bg-slate-100 rounded-xl px-3 py-2 flex flex-col items-center justify-center min-w-[60px]"><span className="text-[10px] font-bold text-slate-400 uppercase">JAN</span><span className="text-xl font-black text-slate-700">12</span></div>
              <div><p className="font-bold text-slate-700 text-sm">Webinar SlimHaut®</p><p className="text-xs text-slate-400 mt-1">19:00 • Online</p></div>
            </div>
            <button className="w-full py-3 border border-slate-200 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-50 transition">Ver Calendário Completo</button>
          </div>
        </div>
      </div>

      {/* MODAIS (Tarefas e Meta) */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-lg mb-4">Nova Tarefa</h3>
            <input autoFocus type="text" placeholder="Ex: Ligar para Dr. Roberto..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 outline-none focus:border-green-500" value={novaTarefaTexto} onChange={(e) => setNovaTarefaTexto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionarTarefa()} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg font-bold text-sm">Cancelar</button>
              <button onClick={adicionarTarefa} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700">Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {isMetaModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg mb-4">Alterar Meta Alvo</h3>
            <p className="text-xs text-slate-400 mb-2">Defina seu objetivo mensal:</p>
            <input type="number" placeholder="150000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 outline-none focus:border-green-500 font-bold text-lg" value={novaMetaValor} onChange={(e) => setNovaMetaValor(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsMetaModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg font-bold text-sm">Cancelar</button>
              <button onClick={atualizarMeta} className="px-4 py-2 bg-[#1e293b] text-white rounded-lg font-bold text-sm hover:bg-slate-800">Salvar Meta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
