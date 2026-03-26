"use client";

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Users, CheckCircle2, Circle, Plus, Trash2, Edit2, 
  Sun, Moon, MapPin, Calendar, TrendingUp, X, Search, Cloud, CloudRain, CloudLightning
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// --- BIBLIOTECA DE FRASES MOTIVACIONAIS ---
const FRASES_MOTIVACIONAIS = [
  { texto: "O prescritor não compra um ativo, ele compra a solução para a dor do paciente.", tag: "#FocoNoResultado" },
  { texto: "Seu maior diferencial não é o produto, é o seu nível de conhecimento.", tag: "#Autoridade" },
  { texto: "A venda acontece quando a confiança do prescritor é maior que a dúvida.", tag: "#Confiança" },
  { texto: "Entenda o paciente do seu cliente, e você nunca mais precisará vender.", tag: "#VisãoEstratégica" },
  { texto: "Você não é um vendedor, você é um consultor científico de resultados.", tag: "#Consultoria" },
  { texto: "Cada 'não' é apenas um ajuste de rota para o próximo 'sim'.", tag: "#Resiliência" },
  { texto: "A melhor apresentação de vendas é fazer as perguntas certas.", tag: "#Empatia" },
  { texto: "O sucesso não é um grande salto, são os pequenos passos bem feitos todos os dias.", tag: "#Constância" }
];

export default function Dashboard() {
  const supabase = createClientComponentClient();
  
  // --- ESTADOS GERAIS ---
  const [loading, setLoading] = useState(true);
  const [primeiroNome, setPrimeiroNome] = useState("Equipe"); 
  const [saudacao, setSaudacao] = useState("Olá");
  const [fraseAtual, setFraseAtual] = useState(FRASES_MOTIVACIONAIS[0]);
  
  const [clima, setClima] = useState({ temp: 28, cidade: 'Maringá', condicao: 'Carregando...', tipo: 'Clear' });
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
    definirSaudacaoEFrase();
    buscarLocalizacaoEClima();
    window.addEventListener('focus', carregarDados);
    
    // Atualiza saudação e frase a cada hora
    const timerHora = setInterval(definirSaudacaoEFrase, 3600000);
    // Verificador de Lembretes (roda a cada minuto)
    const timerLembrete = setInterval(checarLembretes, 60000);
    
    return () => {
      window.removeEventListener('focus', carregarDados);
      clearInterval(timerHora);
      clearInterval(timerLembrete);
    };
  }, []);

  const definirSaudacaoEFrase = () => {
    const hora = new Date().getHours();
    
    // Define Saudação
    if (hora >= 5 && hora < 12) setSaudacao("Bom dia");
    else if (hora >= 12 && hora < 18) setSaudacao("Boa tarde");
    else setSaudacao("Boa noite");

    // Define Frase baseada na hora (Muda a cada hora, circulando o array)
    const indexFrase = hora % FRASES_MOTIVACIONAIS.length;
    setFraseAtual(FRASES_MOTIVACIONAIS[indexFrase]);
  };

  const buscarLocalizacaoEClima = () => {
    // Pede a localização do navegador
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          buscarClimaAPI(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          // Se o usuário negar, ou der erro, usa Maringá como fallback
          buscarClimaAPI(-23.4205, -51.9333); 
        }
      );
    } else {
      buscarClimaAPI(-23.4205, -51.9333);
    }
  };

  const buscarClimaAPI = async (lat: number, lon: number) => {
    try {
      const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
      if (!API_KEY) return;
      
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${API_KEY}`);
      const data = await res.json();
      
      if (data.main) {
        setClima({ 
          temp: Math.round(data.main.temp), 
          cidade: data.name, 
          condicao: data.weather[0].description,
          tipo: data.weather[0].main // Clear, Clouds, Rain, Thunderstorm
        });
        setDetalhesClima(data);
      }
    } catch (e) { console.error("Erro clima", e); }
  };

  // --- Ícone Dinâmico de Clima ---
  const RenderWeatherIcon = () => {
    const hora = new Date().getHours();
    const isNoite = hora >= 18 || hora < 5; // Define se é noite

    switch (clima.tipo) {
      case 'Rain': case 'Drizzle': return <CloudRain size={28} className="text-blue-500" />;
      case 'Thunderstorm': return <CloudLightning size={28} className="text-slate-600" />;
      case 'Clouds': return <Cloud size={28} className="text-slate-400" />;
      default: return isNoite ? <Moon size={28} className="text-slate-400" /> : <Sun size={28} className="text-yellow-500" />; // Clear/Sun ou Moon
    }
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
      const { data: perfil } = await supabase.from('perfis').select('*').eq('id', user.id).single();
      
      if (perfil && perfil.nome) {
          const primeiroNomeCortado = perfil.nome.split(' ')[0];
          setPrimeiroNome(primeiroNomeCortado.charAt(0).toUpperCase() + primeiroNomeCortado.slice(1).toLowerCase());
      } else {
          const emailBase = user.email?.split('@')[0] || "Usuário";
          setPrimeiroNome(emailBase.charAt(0).toUpperCase() + emailBase.slice(1));
      }

      const { data: dMeta } = await supabase.from('metas').select('valor_meta').eq('user_id', user.id).single();
      if (dMeta) setMetaAlvo(dMeta.valor_meta);

      let queryPipeline = supabase.from('pipeline').select('valor, status');
      if (perfil && perfil.cargo !== 'admin') queryPipeline = queryPipeline.eq('user_id', perfil.id);
      
      const { data: pipe } = await queryPipeline;
      
      if (pipe) {
        setValorFechado(pipe.filter(i => i.status?.toLowerCase() === 'fechado').reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0));
        setQtdOportunidades(pipe.filter(i => ['prospeccao', 'qualificacao', 'apresentacao'].includes(i.status?.toLowerCase())).length);
        setValorNegociacao(pipe.filter(i => i.status?.toLowerCase() === 'negociacao').reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0));
      }

      let queryClientes = supabase.from('base_clientes').select('*', { count: 'exact', head: true });
      if (perfil && perfil.cargo !== 'admin') queryClientes = queryClientes.eq('user_id', perfil.id);
      
      const { count } = await queryClientes;
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
  const dataHojeFormatada = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20 md:pb-8 font-sans">
      
      {/* 1. CABEÇALHO PREMIUM */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 md:gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        
        {/* Saudação */}
        <div className="text-center xl:text-left min-w-[220px]">
          <p className="text-slate-500 font-medium flex items-center justify-center xl:justify-start gap-2 mb-1.5 uppercase text-[10px] tracking-widest">
             <Calendar size={14} className="text-green-600"/> {dataHojeFormatada}
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
            {saudacao}, <span className="text-green-600">{primeiroNome}!</span>
          </h1>
        </div>
        
        {/* Frase Dinâmica */}
        <div className="flex-1 w-full bg-gradient-to-br from-green-50 to-emerald-50/30 border border-green-100 p-5 rounded-3xl text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/20 rounded-full blur-3xl -mr-10 -mt-10 transition duration-500 group-hover:bg-green-300/20"></div>
          <p className="text-sm md:text-base text-green-900 font-medium italic relative z-10 transition-all duration-500">
            "{fraseAtual.texto}"
          </p>
          <span className="text-[10px] font-black text-green-700 uppercase mt-3 block tracking-widest relative z-10">
            {fraseAtual.tag}
          </span>
        </div>

        {/* Clima Inteligente */}
        <div 
          onClick={() => setShowClimaModal(true)}
          className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-3xl border border-slate-100 flex items-center justify-center xl:justify-start gap-4 w-full xl:w-auto xl:min-w-[180px] cursor-pointer hover:shadow-md transition-all duration-300 group"
        >
           <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm group-hover:scale-110 transition duration-300">
              <RenderWeatherIcon />
           </div>
           <div className="text-left">
             <p className="text-2xl font-black text-slate-800 tracking-tight">{clima.temp}°C</p>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-0.5"><MapPin size={10}/> {clima.cidade}</p>
           </div>
        </div>
      </div>

      {/* 2. CARDS PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-[2rem] relative overflow-hidden shadow-lg border border-slate-700/50 hover:shadow-xl transition duration-300">
          <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <button onClick={() => setIsMetaModalOpen(true)} className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white z-10 transition backdrop-blur-sm"><Edit2 size={16} /></button>
          
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Meta Mensal</p>
          <div className="flex items-end gap-2 mb-5 relative z-10">
            <span className="text-3xl font-black tracking-tight">R$ {valorFechado.toLocaleString('pt-BR')}</span>
            <span className="text-sm text-slate-400 mb-1.5 font-medium">/ {metaAlvo.toLocaleString('pt-BR')}</span>
          </div>
          <div className="w-full h-2.5 bg-slate-700/50 rounded-full overflow-hidden backdrop-blur-sm relative z-10">
             <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000 relative" style={{ width: `${porcentagemMeta}%` }}>
                <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/20 blur-[2px]"></div>
             </div>
          </div>
          <p className="text-[10px] font-bold text-green-400 mt-3 text-right uppercase tracking-wider">{porcentagemMeta}% Concluído 🚀</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between group">
          <div className="flex justify-between items-start">
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Oportunidades</p>
               <h3 className="text-4xl font-black text-slate-800 mt-2 tracking-tight">{qtdOportunidades}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition"><DollarSign size={24} /></div>
          </div>
          <p className="text-xs text-blue-700 font-bold mt-5 bg-blue-50/80 inline-block px-3.5 py-2 rounded-xl self-start border border-blue-100/50">
             R$ {valorNegociacao.toLocaleString('pt-BR')} <span className="text-blue-500 font-medium">em negociação</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between group">
          <div className="flex justify-between items-start">
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carteira Ativa</p>
               <h3 className="text-4xl font-black text-slate-800 mt-2 tracking-tight">{totalCarteira}</h3>
            </div>
            <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition"><Users size={24} /></div>
          </div>
          <p className="text-xs text-purple-700 font-bold mt-5 bg-purple-50/80 inline-block px-3.5 py-2 rounded-xl self-start border border-purple-100/50">
             Farmácias na base
          </p>
        </div>
      </div>

      {/* 3. TAREFAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><CheckCircle2 className="text-green-500" /> Agenda de Tarefas</h3>
            <button onClick={() => setIsTaskModalOpen(true)} className="w-full sm:w-auto bg-green-50 text-green-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-green-100 transition active:scale-95 shadow-sm border border-green-100">+ Nova Tarefa</button>
          </div>
          
          <div className="space-y-3">
            {tarefas.length === 0 && (
               <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-2xl">
                 <p className="text-slate-400 text-sm font-medium">Nenhuma tarefa pendente para hoje. Bom trabalho! 🎉</p>
               </div>
            )}
            {tarefas.map((t) => (
              <div key={t.id} className="group flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-green-300 hover:shadow-md transition-all duration-300">
                <button onClick={() => toggleTarefa(t.id, t.concluido)} className={`shrink-0 transition-transform hover:scale-110 ${t.concluido ? 'text-green-500' : 'text-slate-300 hover:text-green-400'}`}>
                   {t.concluido ? <CheckCircle2 size={26} /> : <Circle size={26} />}
                </button>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate transition-colors ${t.concluido ? 'text-slate-400 line-through' : 'text-slate-700 group-hover:text-slate-900'}`}>{t.titulo}</p>
                    {t.base_clientes && <p className="text-[10px] text-green-600 font-black uppercase tracking-widest truncate mt-0.5">{t.base_clientes.fantasia}</p>}
                </div>
                <div className="text-[11px] font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg shrink-0 border border-slate-100">
                   {new Date(t.data_lembrete).toLocaleString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                </div>
                <button onClick={() => deletarTarefa(t.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition shrink-0"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm h-fit">
          <h3 className="font-black text-lg text-slate-800 mb-6">Próximos Eventos</h3>
          <div className="space-y-5">
            <div className="flex gap-4 p-3 rounded-2xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100 cursor-pointer">
               <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-2 py-2 text-center w-14 shrink-0 flex flex-col justify-center">
                 <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">MAR</p>
                 <p className="text-xl font-black text-slate-800 leading-none mt-1">12</p>
               </div>
               <div className="flex flex-col justify-center">
                 <p className="font-bold text-slate-800 text-sm">Webinar SlimHaut®</p>
                 <p className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1"><Sun size={12}/> 19:00 • Online</p>
               </div>
            </div>
            {/* Espaço para mais eventos */}
          </div>
        </div>
      </div>

      {/* --- MODAIS MANTIDOS E ESTILIZADOS --- */}

      {/* Modal Clima */}
      {showClimaModal && detalhesClima && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-end md:items-center justify-center md:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-t-[2rem] md:rounded-[2rem] p-6 md:p-8 w-full md:max-w-sm shadow-2xl relative pb-10 md:pb-8 animate-in slide-in-from-bottom-10 md:zoom-in-95 border border-slate-100">
            <button onClick={() => setShowClimaModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition"><X size={20}/></button>
            <div className="text-center space-y-4 pt-2">
              <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{clima.cidade}</h3>
              <div className="text-6xl font-black text-slate-800 tracking-tighter flex items-center justify-center gap-2">
                 {clima.temp}° <RenderWeatherIcon />
              </div>
              <p className="text-slate-500 capitalize font-medium text-lg">{clima.condicao}</p>
              
              <div className="grid grid-cols-2 gap-4 pt-6 mt-4">
                <div className="text-left bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Umidade</p><p className="font-black text-slate-700 text-xl">{detalhesClima.main.humidity}%</p></div>
                <div className="text-left bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vento</p><p className="font-black text-slate-700 text-xl">{Math.round(detalhesClima.wind.speed * 3.6)} km/h</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tarefa e Meta (Mantidos os originais com os novos border-radius e sombras suaves) */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-end md:items-center justify-center backdrop-blur-sm md:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-[2rem] md:rounded-[2rem] p-6 md:p-8 w-full md:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col animate-in slide-in-from-bottom-10 md:zoom-in-95 pb-8 md:pb-8 border border-slate-100">
            <div className="flex justify-between items-center mb-6 shrink-0">
               <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Plus className="text-green-500"/> Nova Tarefa</h3>
               <button onClick={() => setIsTaskModalOpen(false)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition"><X size={18}/></button>
            </div>
            
            <div className="space-y-5 flex-1">
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">O que precisa ser feito? *</label>
                 <input autoFocus type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-green-500 focus:bg-white outline-none text-sm font-bold transition shadow-sm" value={novaTarefaTexto} onChange={(e) => setNovaTarefaTexto(e.target.value)} placeholder="Ex: Ligar para Doutor João" />
              </div>
              
              <div className="relative">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Vincular a um Cliente (Opcional)</label>
                 <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:border-green-500 focus-within:bg-white transition shadow-sm">
                    <Users size={18} className="text-slate-400 ml-2 shrink-0"/>
                    <input type="text" placeholder="Buscar farmácia..." className="flex-1 p-2 bg-transparent outline-none font-bold text-sm" value={clienteSelecionado ? clienteSelecionado.fantasia : buscaCliente} onChange={(e) => pesquisarCliente(e.target.value)} />
                    {clienteSelecionado && <button onClick={() => setClienteSelecionado(null)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition"><X size={14}/></button>}
                 </div>
                 {clientesFiltrados.length > 0 && !clienteSelecionado && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                       {clientesFiltrados.map(c => (
                          <button key={c.id} onClick={() => { setClienteSelecionado(c); setClientesFiltrados([]); }} className="w-full p-4 text-left hover:bg-green-50 text-sm font-bold text-slate-700 border-b border-slate-50 last:border-0 transition">{c.fantasia}</button>
                       ))}
                    </div>
                 )}
              </div>
              
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Data e Hora do Lembrete *</label>
                 <input type="datetime-local" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-green-500 focus:bg-white text-sm font-bold text-slate-700 transition shadow-sm" value={dataLembrete} onChange={(e) => setDataLembrete(e.target.value)} />
              </div>
              
              <div className="flex flex-col-reverse md:flex-row gap-3 pt-6 mt-auto border-t border-slate-100">
                 <button onClick={() => setIsTaskModalOpen(false)} className="w-full md:flex-1 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 font-bold transition">Cancelar</button>
                 <button onClick={adicionarTarefa} className="w-full md:flex-1 py-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl shadow-lg shadow-green-200 transition active:scale-95">Salvar Tarefa</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMetaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-end md:items-center justify-center backdrop-blur-sm md:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-[2rem] md:rounded-[2rem] p-6 md:p-8 w-full md:max-w-sm shadow-2xl pb-10 md:pb-8 animate-in slide-in-from-bottom-10 md:zoom-in-95 border border-slate-100">
            <h3 className="font-black text-2xl text-slate-800 mb-2 tracking-tight">Ajustar Meta</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">Defina o seu alvo de vendas para este mês.</p>
            
            <div className="relative mb-8">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">R$</span>
                <input type="number" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-green-500 focus:bg-white font-black text-xl text-slate-800 shadow-sm transition" placeholder="Ex: 150000" value={novaMetaValor} onChange={(e) => setNovaMetaValor(e.target.value)} />
            </div>
            
            <div className="flex flex-col-reverse md:flex-row gap-3">
                <button onClick={() => setIsMetaModalOpen(false)} className="w-full md:flex-1 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 font-bold transition">Cancelar</button>
                <button onClick={atualizarMeta} className="w-full md:flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black shadow-lg shadow-slate-300 transition active:scale-95">Salvar Meta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}