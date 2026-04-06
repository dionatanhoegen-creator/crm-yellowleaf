"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell
} from 'recharts';
import { Filter, Calendar, User, XCircle, Activity, AlertTriangle, UserMinus, ArrowUpRight, Users } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const API_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

export default function FaturamentoPage() {
  const supabase = createClientComponentClient();
  const [dados, setDados] = useState<any>(null);
  const [churnLocal, setChurnLocal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Segurança e Autenticação
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);

  // Filtros
  const [anoSelecionado, setAnoSelecionado] = useState<string>(new Date().getFullYear().toString());
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>(""); 
  const [listaVendedores, setListaVendedores] = useState<any[]>([]); 

  // Carrega o usuário primeiro
  useEffect(() => {
    const carregarAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const { data: perfil } = await supabase.from('perfis').select('*').eq('id', user.id).single();
          setUsuarioLogado(perfil);

          const cargoStr = String(perfil?.cargo || "").toLowerCase();
          const nomeStr = String(perfil?.nome || "").toLowerCase();
          
          // Regra Master: Admins, Diretores, P&D, SDR, Eduarda e Jaque
          const master = ['admin', 'diretor', 'master'].some(c => cargoStr.includes(c)) ||
                         cargoStr.includes('p&d') || cargoStr.includes('sdr') ||
                         nomeStr.includes('eduarda') || nomeStr.includes('jaque');
          setIsMaster(master);
      }
      setAuthLoaded(true);
    };
    carregarAuth();
  }, [supabase]);

  // Carrega os dados só depois de saber quem é o usuário
  useEffect(() => {
    if (authLoaded) carregarDados();
  }, [anoSelecionado, vendedorSelecionado, authLoaded]);

  const carregarDados = async () => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      params.append("path", "dashboard/faturamento");
      params.append("ano", anoSelecionado === "todos" ? "" : anoSelecionado);
      
      // TRAVA DE SEGURANÇA RLS: Força a busca apenas pela Rafaela/Vendedor logado
      let repTarget = vendedorSelecionado;
      if (!isMaster && usuarioLogado) {
          repTarget = usuarioLogado.nome; 
      }
      if (repTarget) params.append("representante", repTarget);

      // Função segura para buscar exclusividades
      const fetchExclusividadesSeguro = async () => {
          try {
              const { data } = await supabase.from('exclusividades').select('nome_cliente');
              return data || [];
          } catch (e) {
              return [];
          }
      };

      const cacheBuster = new Date().getTime();
      const [resDash, resVen, exclusividades] = await Promise.all([
          fetch(`${API_URL}?${params.toString()}&t=${cacheBuster}`).then(r => r.json()).catch(() => null),
          fetch(`${API_URL}?path=vendas&t=${cacheBuster}`).then(r => r.json()).catch(() => null),
          fetchExclusividadesSeguro()
      ]);
      
      if (!resDash) throw new Error("Falha na comunicação com a planilha");
      
      let dataFinal = resDash.data || resDash;
      if (dataFinal && dataFinal.data && dataFinal.data.kpi) {
           dataFinal = dataFinal.data;
      }
      setDados(dataFinal);
      
      const listaNova = dataFinal.rankings?.listaVendedores || dataFinal.listaVendedores;
      if (Array.isArray(listaNova) && listaNova.length > 0) {
          setListaVendedores(listaNova);
      } else if (listaVendedores.length === 0 && dataFinal.rankings?.vendedores) {
          setListaVendedores(dataFinal.rankings.vendedores);
      }

      // ==========================================
      // CÁLCULO DE EMOJIS E CHURN (Protegido por Usuário)
      // ==========================================
      const extractArray = (r: any) => (r && r.data && Array.isArray(r.data) ? r.data : (Array.isArray(r) ? r : []));
      const vendasArray = extractArray(resVen);
      
      const clientesComContrato = new Set(exclusividades.map((e: any) => String(e.nome_cliente).trim().toUpperCase()));
      const ultimasCompras = new Map();

      const normalizeKey = (key: string) => key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '');

      vendasArray.forEach((v: any) => {
          const objNorm: any = {};
          Object.keys(v).forEach(k => objNorm[normalizeKey(k)] = v[k]);

          const vendedor = String(objNorm.vendedor || objNorm.representante || '').trim().toUpperCase();
          
          // Trava para o Vendedor Logado não calcular churn da empresa toda
          if (!isMaster && usuarioLogado) {
             const nomeLogadoNorm = normalizeKey(usuarioLogado.nome || "");
             const vendedorNorm = normalizeKey(vendedor);
             if (!vendedorNorm.includes(nomeLogadoNorm) && !nomeLogadoNorm.includes(vendedorNorm)) return;
          } else if (vendedorSelecionado && vendedor !== vendedorSelecionado.trim().toUpperCase()) {
             return;
          }

          const cliente = String(objNorm.nomefantasia || objNorm.razaosocial || objNorm.cliente || '').trim().toUpperCase();
          if (!cliente) return;

          let timestamp = 0;
          const anoSheet = String(objNorm.ano || '').trim();
          const mesSheet = String(objNorm.mes || '').trim();
          
          if (anoSheet && mesSheet && anoSheet !== 'undefined') {
              timestamp = new Date(parseInt(anoSheet), parseInt(mesSheet) - 1, 15).getTime();
          } else if (objNorm.data || objNorm.datavenda) {
              timestamp = new Date(objNorm.data || objNorm.datavenda).getTime();
          }

          if (timestamp > 0) {
              if (!ultimasCompras.has(cliente) || timestamp > ultimasCompras.get(cliente)) {
                  ultimasCompras.set(cliente, timestamp);
              }
          }
      });

      let churnCalc = { c6_12: { cont: 0 }, c1_2: { cont: 0 }, cMais2: { cont: 0 } };
      const hoje = new Date().getTime();

      ultimasCompras.forEach((ultimoTs, cliente) => {
          const meses = (hoje - ultimoTs) / (1000 * 60 * 60 * 24 * 30.44); 
          const temContrato = clientesComContrato.has(cliente);

          if (temContrato) {
              if (meses >= 6 && meses < 12) churnCalc.c6_12.cont++;
              else if (meses >= 12 && meses < 24) churnCalc.c1_2.cont++;
              else if (meses >= 24) churnCalc.cMais2.cont++;
          }
      });

      setChurnLocal(churnCalc);

    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dados. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  const fmtBRL = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || "R$ 0,00";
  const fmtCompact = (v: number) => `R$ ${(v / 1000).toFixed(0)}k`;

  const anosDisponiveis = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() + 1 - i).toString());
  const coresPorAno: any = { "2024": "#cbd5e1", "2025": "#3b82f6", "2026": "#10b981", "2027": "#8b5cf6" };

  if (loading && !dados) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-slate-400 font-medium animate-pulse"><Activity size={32} className="mb-4 text-blue-500"/> Carregando Inteligência...</div>;
  
  if (erro) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-red-500 gap-4">
        <AlertTriangle size={48} />
        <p className="font-bold">{erro}</p>
        <button onClick={carregarDados} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Tentar Novamente</button>
    </div>
  );

  if (!dados) return null;

  const kpi = dados.kpi || {};
  const churnAPI = kpi.churn || {};
  
  const graficoRecente = Array.isArray(dados.grafico) ? dados.grafico : [];
  const rankings = dados.rankings || { estados: [], produtos: [], vendedores: [] };
  const isVisaoAnual = anoSelecionado === "todos";

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER LIMPO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Performance Comercial</h1>
            <p className="text-slate-500 text-sm mt-1">Acompanhamento estratégico de vendas e retenção.</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm text-xs font-medium text-slate-500">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Atualizado: {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* FILTROS MINIMALISTAS */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
            <div className="relative group">
                <select 
                    value={anoSelecionado} 
                    onChange={(e) => setAnoSelecionado(e.target.value)}
                    className="appearance-none pl-9 pr-8 py-2.5 bg-white border border-slate-200 hover:border-blue-400 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 transition cursor-pointer min-w-[140px]"
                >
                    <option value="todos">Todos os Anos</option>
                    {anosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}
                </select>
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            </div>

            <div className="relative group">
                {isMaster ? (
                    <select 
                        value={vendedorSelecionado} 
                        onChange={(e) => setVendedorSelecionado(e.target.value)}
                        className="appearance-none pl-9 pr-8 py-2.5 bg-white border border-slate-200 hover:border-blue-400 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 transition cursor-pointer min-w-[220px]"
                    >
                        <option value="">Todos os Representantes</option>
                        {(listaVendedores.length > 0 ? listaVendedores : (rankings.vendedores || [])).map((v: any, i: number) => (
                            <option key={i} value={v.nome}>{v.nome}</option>
                        ))}
                    </select>
                ) : (
                    <div className="pl-9 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-500 cursor-not-allowed min-w-[220px] flex items-center select-none" title="Você visualiza apenas sua carteira">
                        {usuarioLogado?.nome || 'Minhas Vendas'}
                    </div>
                )}
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            </div>

            {isMaster && vendedorSelecionado && (
                <button onClick={() => setVendedorSelecionado("")} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition flex items-center gap-1">
                    <XCircle size={14}/> Limpar
                </button>
            )}
        </div>

        {/* KPI GRID - CLEAN */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <KpiCard title="Faturamento Total" value={fmtBRL(kpi.faturamentoAno || 0)} sub={vendedorSelecionado || !isMaster ? "Sua Carteira" : "Período Selecionado"} trend="up" />
          <KpiCard title="Ticket Médio" value={fmtBRL(kpi.ticketMedio || 0)} sub="Por transação" />
          <KpiCard title="Novos Clientes" value={kpi.novosClientes || 0} sub="Cadastrados no período" icon={<Users size={18} className="text-blue-500"/>} />
          <KpiCard title="Carteira Ativa" value={churnAPI.ativos || 0} sub="Compraram < 6 meses" icon={<Activity size={18} className="text-emerald-500"/>} />
        </div>

        {/* ÁREA PRINCIPAL: GRÁFICO + CHURN */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* GRÁFICO PRINCIPAL */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Evolução de Receita</h3>
                    <p className="text-xs text-slate-400 mt-1">{isVisaoAnual ? "Comparativo anual" : `Detalhamento mensal de ${anoSelecionado}`}</p>
                </div>
                {vendedorSelecionado && isMaster && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full uppercase tracking-wider">{vendedorSelecionado}</span>}
            </div>
            
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {isVisaoAnual ? (
                    <BarChart data={graficoRecente} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} tickFormatter={fmtCompact} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} formatter={(val: number) => [fmtBRL(val), "Receita"]} />
                        <Bar dataKey="valor" radius={[6, 6, 6, 6]}>
                            {graficoRecente.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={coresPorAno[entry.name] || '#94a3b8'} />
                            ))}
                        </Bar>
                    </BarChart>
                ) : (
                    <AreaChart data={graficoRecente}>
                        <defs>
                            <linearGradient id="colorVis" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} tickFormatter={fmtCompact} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} formatter={(val: number) => [fmtBRL(val), "Receita"]} />
                        <Area type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={3} fill="url(#colorVis)" />
                    </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* PAINEL CHURN (COM DADOS OFICIAIS DA API) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Risco de Churn</h3>
                <p className="text-xs text-slate-400 mt-1">Clientes sem compra recente na base.</p>
            </div>
            
            <div className="space-y-3 flex-1">
                <ChurnRow 
                    label="6 a 12 Meses" 
                    count={churnAPI.inativos6m || 0} 
                    contratos={churnLocal?.c6_12?.cont || 0} 
                    color="bg-yellow-500" 
                    risk="Moderado" 
                />
                <ChurnRow 
                    label="1 a 2 Anos" 
                    count={churnAPI.inativos12m || 0} 
                    contratos={churnLocal?.c1_2?.cont || 0} 
                    color="bg-orange-500" 
                    risk="Alto" 
                />
                <ChurnRow 
                    label="+2 Anos" 
                    count={churnAPI.perdidos || 0} 
                    contratos={churnLocal?.cMais2?.cont || 0} 
                    color="bg-red-500" 
                    risk="Crítico" 
                />
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-50 text-center">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total na Base</p>
                <p className="text-2xl font-black text-slate-700">
                    {(churnAPI.ativos || 0) + (churnAPI.inativos6m || 0) + (churnAPI.inativos12m || 0) + (churnAPI.perdidos || 0)}
                </p>
            </div>
          </div>
        </div>

        {/* RANKINGS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <RankingCard title="Top Regiões" items={rankings.estados || []} type="uf" />
            {isMaster && (
               <RankingCard title="Performance Equipe" items={rankings.vendedores || []} type="vendedor" highlight={vendedorSelecionado} />
            )}
        </div>

      </div>
    </div>
  );
}

// --- SUB-COMPONENTES ---

function KpiCard({ title, value, sub, icon, trend }: any) {
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
                {icon || (trend === "up" ? <ArrowUpRight size={16} className="text-green-500"/> : null)}
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">{sub}</p>
        </div>
    )
}

function ChurnRow({ label, count, contratos, color, risk }: any) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${color}`}></div>
                <div>
                    <p className="text-xs font-bold text-slate-700">{label}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase">{risk}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {contratos > 0 && (
                    <span 
                        className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm border border-green-200" 
                        title={`${contratos} farmácias possuem contrato ativo de exclusividade`}
                    >
                        {contratos} 🏥
                    </span>
                )}
                <span className="text-lg font-black text-slate-800">{count}</span>
            </div>
        </div>
    )
}

function RankingCard({ title, items, type, highlight }: any) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800 mb-5">{title}</h3>
            <div className="space-y-4">
                {items && items.length > 0 ? items.slice(0, 5).map((item: any, i: number) => (
                    <div key={i} className={`flex items-center justify-between text-sm ${highlight === item.nome ? 'bg-blue-50 p-2 rounded-lg -mx-2' : ''}`}>
                        <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-300 w-4">0{i+1}</span>
                            <span className={`font-bold ${highlight === item.nome ? 'text-blue-700' : 'text-slate-600'}`}>
                                {item.uf || item.nome}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                <div className={`h-full rounded-full ${highlight === item.nome ? 'bg-blue-500' : 'bg-slate-300'}`} style={{ width: `${(item.total / (items[0]?.total || 1)) * 100}%` }}></div>
                            </div>
                            <span className="font-mono font-medium text-slate-700 text-xs w-20 text-right">
                                {item.total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>
                )) : <p className="text-xs text-slate-400 italic">Sem dados disponíveis.</p>}
            </div>
        </div>
    )
}