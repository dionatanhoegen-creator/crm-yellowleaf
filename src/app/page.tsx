"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Para navegar entre as telas
import { 
  Sun, CloudRain, Calendar, CheckSquare, 
  TrendingUp, Users, DollarSign, ArrowRight, Quote,
  MapPin, Clock, MoreHorizontal, RefreshCw
} from 'lucide-react';

// --- ONDE A META É DEFINIDA (LINHAS 14 e 15) ---
// Atualmente são números fixos. Futuramente podemos conectar isso 
// para somar automaticamente as vendas do mês na sua planilha.
const USUARIO_NOME = "Dionatan";
const META_MENSAL = 150000; // SUA META (R$ 150.000,00)
const VENDIDO_ATUAL = 87500; // QUANTO JÁ VENDEU (R$ 87.500,00)

const FRASES_MOTIVACIONAIS = [
  "Na saúde, não vendemos insumos, entregamos qualidade de vida aos pacientes.",
  "O prescritor não compra um ativo, ele compra a solução para a dor do paciente.",
  "A farmácia de manipulação precisa de parceiros consultivos, não tiradores de pedido.",
  "Constância é o segredo. Cada visita é uma semente plantada no mercado magistral.",
  "O 'não' faz parte. O 'sim' é conquistado com técnica, empatia e conhecimento técnico."
];

const TAREFAS_INICIAIS = [
  { id: 1, texto: "Confirmar visita na Dermato Clean", hora: "09:00", feito: true },
  { id: 2, texto: "Enviar lâmina do Anethin® para Dr. Roberto", hora: "10:30", feito: false },
  { id: 3, texto: "Reunião de alinhamento YellowLeaf", hora: "14:00", feito: false },
  { id: 4, texto: "Cobrar feedback da Farmácia Essência", hora: "16:00", feito: false },
];

export default function Dashboard() {
  const router = useRouter(); // Hook para navegação
  const [saudacao, setSaudacao] = useState("");
  const [dataAtual, setDataAtual] = useState("");
  const [clima, setClima] = useState<{temp: number, condicao: string}>({ temp: 24, condicao: 'Carregando...' });
  const [fraseDoDia, setFraseDoDia] = useState("");
  const [tarefas, setTarefas] = useState(TAREFAS_INICIAIS);
  const [syncing, setSyncing] = useState(false); // Estado visual de sincronização

  useEffect(() => {
    const agora = new Date();
    const hora = agora.getHours();
    
    if (hora >= 5 && hora < 12) setSaudacao("Bom dia");
    else if (hora >= 12 && hora < 18) setSaudacao("Boa tarde");
    else setSaudacao("Boa noite");

    const opcoesData: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    setDataAtual(agora.toLocaleDateString('pt-BR', opcoesData));

    setFraseDoDia(FRASES_MOTIVACIONAIS[Math.floor(Math.random() * FRASES_MOTIVACIONAIS.length)]);

    if (navigator.geolocation) {
       setTimeout(() => {
         setClima({ temp: 28, condicao: 'Ensolarado' }); 
       }, 1000);
    }
  }, []);

  const toggleTarefa = (id: number) => {
    setTarefas(prev => prev.map(t => t.id === id ? {...t, feito: !t.feito} : t));
  };

  // Simulação de sincronização com Google Calendar
  const handleSyncAgenda = () => {
    setSyncing(true);
    // Aqui entrará a lógica futura de API do Google Calendar
    setTimeout(() => {
        setSyncing(false);
        alert("Sincronização com Google Calendar realizada! (Simulação)");
    }, 2000);
  };

  const percentualMeta = Math.min(Math.round((VENDIDO_ATUAL / META_MENSAL) * 100), 100);

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        
        {/* --- 1. HERO SECTION --- */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
          <div>
            <p className="text-slate-500 font-medium capitalize mb-1 flex items-center gap-2">
              <Calendar size={16} className="text-green-600"/> {dataAtual}
            </p>
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight">
              {saudacao}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-800">{USUARIO_NOME}!</span>
            </h1>
            <p className="text-slate-500 mt-2 text-lg">Pronto para dominar o mercado hoje?</p>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 min-w-[180px]">
             <div className="p-3 bg-blue-50 text-blue-500 rounded-full">
               <Sun size={24}/>
             </div>
             <div>
               <p className="text-2xl font-black text-slate-800">{clima.temp}°C</p>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                 <MapPin size={10}/> Sua Região
               </p>
             </div>
          </div>
        </div>

        {/* --- 2. GRID DE KPIs --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           
           {/* Card Meta */}
           <div className="bg-slate-800 rounded-3xl p-6 text-white relative overflow-hidden group shadow-lg hover:shadow-xl transition">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <TrendingUp size={120} />
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Meta Mensal</p>
              <div className="flex items-baseline gap-2 mb-4">
                 <span className="text-3xl font-black">R$ {VENDIDO_ATUAL.toLocaleString('pt-BR')}</span>
                 <span className="text-sm text-slate-400">/ {META_MENSAL.toLocaleString('pt-BR')}</span>
              </div>
              <div className="w-full bg-slate-700 h-3 rounded-full overflow-hidden border border-slate-600">
                 <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${percentualMeta}%` }}></div>
              </div>
              <p className="text-xs mt-2 text-green-400 font-bold text-right">{percentualMeta}% Concluído 🚀</p>
           </div>

           {/* Card Pipeline */}
           <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-blue-200 transition group">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Oportunidades</p>
                    <h3 className="text-3xl font-black text-slate-800 mt-1">12</h3>
                 </div>
                 <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition">
                    <DollarSign size={24} />
                 </div>
              </div>
              <p className="text-sm text-slate-500 mt-4">
                 <span className="text-blue-600 font-bold">R$ 145k</span> em negociação ativa
              </p>
           </div>

           {/* Card Clientes */}
           <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-purple-200 transition group">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Carteira Ativa</p>
                    <h3 className="text-3xl font-black text-slate-800 mt-1">48</h3>
                 </div>
                 <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition">
                    <Users size={24} />
                 </div>
              </div>
              <p className="text-sm text-slate-500 mt-4">
                 <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">+3 novos</span> este mês
              </p>
           </div>
        </div>

        {/* --- 3. ÁREA DE TRABALHO --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Agenda e Ações */}
           <div className="lg:col-span-2 space-y-8">
              
              {/* Lista de Tarefas */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                       <CheckSquare className="text-green-600"/> Agenda de Hoje
                    </h3>
                    <div className="flex gap-2">
                        {/* BOTÃO SINCRONIZAR AGENDA */}
                        <button 
                            onClick={handleSyncAgenda}
                            className="text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition flex items-center gap-2"
                            title="Sincronizar com Google Agenda"
                        >
                           <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> {syncing ? "Sincronizando..." : "Sync Agenda"}
                        </button>
                        <button className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition">
                           + Nova Tarefa
                        </button>
                    </div>
                 </div>

                 <div className="space-y-3">
                    {tarefas.map(tarefa => (
                       <div 
                         key={tarefa.id} 
                         onClick={() => toggleTarefa(tarefa.id)}
                         className={`flex items-center gap-4 p-4 rounded-xl border transition cursor-pointer group ${tarefa.feito ? 'bg-slate-50 border-transparent opacity-60' : 'bg-white border-slate-100 hover:border-green-300 hover:shadow-sm'}`}
                       >
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${tarefa.feito ? 'bg-green-500 border-green-500' : 'border-slate-300 group-hover:border-green-400'}`}>
                             {tarefa.feito && <CheckSquare size={14} className="text-white" />}
                          </div>
                          <div className="flex-1">
                             <p className={`text-sm font-bold ${tarefa.feito ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                {tarefa.texto}
                             </p>
                          </div>
                          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded flex items-center gap-1">
                             <Clock size={12}/> {tarefa.hora}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              {/* BOTÕES DE AÇÃO RÁPIDA (AGORA COM LINKS REAIS) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 
                 {/* 1. Novo Pedido -> Vai para o Pipeline */}
                 <button 
                    onClick={() => router.push('/pipeline')}
                    className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-green-300 hover:shadow-md transition text-left group"
                 >
                    <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition">
                       <DollarSign size={20}/>
                    </div>
                    <p className="font-bold text-slate-700">Novo Pedido</p>
                 </button>

                 {/* 2. Novo Cliente -> Vai para Clientes */}
                 <button 
                    onClick={() => router.push('/clientes')}
                    className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-300 hover:shadow-md transition text-left group"
                 >
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition">
                       <Users size={20}/>
                    </div>
                    <p className="font-bold text-slate-700">Novo Cliente</p>
                 </button>

                 {/* 3. Relatórios -> Vai para Faturamento */}
                 <button 
                    onClick={() => router.push('/faturamento')}
                    className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-purple-300 hover:shadow-md transition text-left group"
                 >
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition">
                       <TrendingUp size={20}/>
                    </div>
                    <p className="font-bold text-slate-700">Relatórios</p>
                 </button>

                 {/* 4. Outros -> Exemplo (Produtos) */}
                 <button 
                    onClick={() => router.push('/produtos')}
                    className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-orange-300 hover:shadow-md transition text-left group"
                 >
                    <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition">
                       <MoreHorizontal size={20}/>
                    </div>
                    <p className="font-bold text-slate-700">Catálogo</p>
                 </button>
              </div>
           </div>

           {/* Coluna Direita (Inspiração + Calendário) */}
           <div className="space-y-6">
              
              {/* Card Inspiração */}
              <div className="bg-gradient-to-br from-green-600 to-emerald-900 rounded-3xl p-8 text-white text-center relative overflow-hidden shadow-xl transform hover:scale-[1.02] transition duration-500">
                 <Quote size={48} className="text-white/10 absolute top-4 left-4" />
                 <p className="text-xs font-bold text-green-200 uppercase tracking-widest mb-4">Insight do Dia</p>
                 <p className="text-lg font-medium leading-relaxed italic opacity-90">
                   "{fraseDoDia}"
                 </p>
                 <div className="mt-6 inline-block px-4 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-bold backdrop-blur-md">
                    #FocoNoResultado
                 </div>
              </div>

              {/* Próximos Eventos */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                 <h4 className="font-bold text-slate-800 mb-4">Próximos Eventos</h4>
                 <div className="space-y-4">
                    <div className="flex gap-4 items-center">
                       <div className="bg-slate-50 p-2 rounded-xl text-center min-w-[50px] border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">JAN</p>
                          <p className="text-xl font-black text-slate-700">12</p>
                       </div>
                       <div>
                          <p className="font-bold text-slate-700 text-sm">Webinar SlimHaut®</p>
                          <p className="text-xs text-slate-400">19:00 • Online</p>
                       </div>
                    </div>
                    <div className="flex gap-4 items-center">
                       <div className="bg-slate-50 p-2 rounded-xl text-center min-w-[50px] border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">JAN</p>
                          <p className="text-xl font-black text-slate-700">15</p>
                       </div>
                       <div>
                          <p className="font-bold text-slate-700 text-sm">Visita Fábrica</p>
                          <p className="text-xs text-slate-400">08:30 • São Paulo</p>
                       </div>
                    </div>
                 </div>
                 <button className="w-full mt-6 py-2.5 text-xs font-bold text-slate-500 hover:text-green-600 hover:bg-slate-50 rounded-xl transition flex items-center justify-center gap-2 border border-dashed border-slate-200">
                    Ver Calendário Completo <ArrowRight size={14}/>
                 </button>
              </div>

           </div>
        </div>

      </div>
    </div>
  );
}