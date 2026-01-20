"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell
} from 'recharts';
import { Filter, Calendar, User, XCircle, Activity, AlertTriangle, UserMinus } from 'lucide-react';

const API_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

export default function FaturamentoPage() {
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- FILTROS ---
  // Agora ano é string para aceitar "todos"
  const [anoSelecionado, setAnoSelecionado] = useState<string>(new Date().getFullYear().toString());
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>(""); 
  const [listaVendedores, setListaVendedores] = useState<any[]>([]); 

  useEffect(() => {
    carregarDados();
  }, [anoSelecionado, vendedorSelecionado]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("path", "dashboard/faturamento");
      // Se for "todos", manda vazio para a API entender que é geral
      params.append("ano", anoSelecionado === "todos" ? "" : anoSelecionado);
      if (vendedorSelecionado) params.append("representante", vendedorSelecionado);

      const res = await fetch(`${API_URL}?${params.toString()}`);
      const json = await res.json();
      
      if (json.success) {
        setDados(json.data);
        if (listaVendedores.length === 0 && json.data.rankings?.vendedores) {
            setListaVendedores(json.data.rankings.vendedores);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fmtBRL = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtCompact = (v: number) => `R$ ${(v / 1000).toFixed(0)}k`;

  // Lista de anos + Opção TODOS
  const anosDisponiveis = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() + 1 - i).toString());

  // Definição de cores para o gráfico anual
  const coresPorAno: any = {
    "2024": "#94a3b8", // Cinza
    "2025": "#3b82f6", // Azul
    "2026": "#22c55e", // Verde
    "2027": "#a855f7"  // Roxo
  };

  if (loading && !dados) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-900 font-bold animate-pulse">📊 Processando Inteligência...</div>;
  if (!dados && !loading) return <div className="p-8 text-center text-red-500">Erro de conexão com API.</div>;

  const { kpi, grafico, rankings } = dados || { kpi: {}, grafico: [], rankings: { estados: [], produtos: [], vendedores: [] } };
  const graficoRecente = grafico || [];
  
  // Flag para saber se estamos vendo Anos ou Meses
  const isVisaoAnual = anoSelecionado === "todos";

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Dashboard Executivo</h1>
            <p className="text-slate-500 mt-1">Visão 360º da operação comercial.</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm border text-sm font-mono text-slate-600">
             Atualizado: {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm uppercase tracking-wide border-r border-slate-100 pr-4 mr-2">
                <Filter size={18} /> Filtros
            </div>

            {/* Filtro de Ano */}
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Calendar size={16}/></div>
                <select 
                    value={anoSelecionado} 
                    onChange={(e) => setAnoSelecionado(e.target.value)}
                    className="pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                >
                    <option value="todos">📅 Todos os Anos</option>
                    {anosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}
                </select>
            </div>

            {/* Filtro de Representante */}
            <div className="relative w-full md:w-64">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><User size={16}/></div>
                <select 
                    value={vendedorSelecionado} 
                    onChange={(e) => setVendedorSelecionado(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                >
                    <option value="">Todos os Representantes</option>
                    {(listaVendedores.length > 0 ? listaVendedores : rankings.vendedores).map((v: any, i: number) => (
                        <option key={i} value={v.nome}>{v.nome}</option>
                    ))}
                </select>
            </div>

            {vendedorSelecionado !== "" && (
                <button onClick={() => setVendedorSelecionado("")} className="flex items-center gap-1 text-red-500 text-xs font-bold hover:bg-red-50 px-3 py-2 rounded-lg transition"><XCircle size={14}/> Limpar</button>
            )}
            {loading && <span className="text-xs text-blue-500 animate-pulse font-bold ml-auto">Atualizando...</span>}
        </div>

        {/* 1. LINHA DE KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <KpiBox titulo={isVisaoAnual ? "Faturamento Acumulado" : `Faturamento (${anoSelecionado})`} valor={fmtBRL(kpi.faturamentoAno)} delta={vendedorSelecionado ? "Filtrado" : "Total"} cor="blue" />
          <KpiBox titulo="Novos Clientes" valor={kpi.novosClientes} delta={isVisaoAnual ? "Total Período" : "No Ano"} cor="green" />
          <KpiBox titulo="Ticket Médio" valor={fmtBRL(kpi.ticketMedio)} delta="Por pedido" cor="purple" />
          <KpiBox titulo="Carteira Ativa" valor={kpi.churn?.ativos || 0} delta=" Compra < 6 meses" cor="emerald" />
        </div>

        {/* 2. GRID INTELIGENTE (GRÁFICO + CHURN) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* GRÁFICO PRINCIPAL (Dinâmico: Barras ou Área) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                {isVisaoAnual ? "📊 Comparativo Anual de Vendas" : `📈 Tendência Mensal (${anoSelecionado})`}
                </h3>
                {vendedorSelecionado && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">👤 {vendedorSelecionado}</span>}
            </div>
            
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {isVisaoAnual ? (
                    // GRÁFICO DE BARRAS POR ANO
                    <BarChart data={graficoRecente}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontWeight:'bold'}} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={fmtCompact} />
                        <Tooltip cursor={{fill: 'transparent'}} formatter={(val: number) => fmtBRL(val)} />
                        <Bar dataKey="valor" radius={[6, 6, 0, 0]} barSize={60}>
                            {graficoRecente.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={coresPorAno[entry.name] || '#64748b'} />
                            ))}
                        </Bar>
                    </BarChart>
                ) : (
                    // GRÁFICO DE LINHA MENSAL
                    <AreaChart data={graficoRecente}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={fmtCompact} />
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} formatter={(val: number) => [fmtBRL(val), "Receita"]} />
                        <Area type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* PAINEL DE RISCO (CHURN) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">⚠️ Risco de Churn (Inatividade)</h3>
            <p className="text-xs text-slate-500 mb-6">Clientes sem comprar baseados na última venda.</p>
            
            <div className="space-y-4 flex-1">
                {/* 6 a 12 Meses */}
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 text-yellow-600 rounded-full"><Activity size={16}/></div>
                        <div>
                            <p className="text-xs font-bold text-yellow-700 uppercase">6 a 12 Meses</p>
                            <p className="text-xs text-yellow-600">Risco Moderado</p>
                        </div>
                    </div>
                    <span className="text-xl font-black text-yellow-700">{kpi.churn?.inativos6m || 0}</span>
                </div>

                {/* 1 a 2 Anos */}
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-full"><AlertTriangle size={16}/></div>
                        <div>
                            <p className="text-xs font-bold text-orange-700 uppercase">1 a 2 Anos</p>
                            <p className="text-xs text-orange-600">Risco Alto</p>
                        </div>
                    </div>
                    <span className="text-xl font-black text-orange-700">{kpi.churn?.inativos12m || 0}</span>
                </div>

                {/* +2 Anos */}
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 text-red-600 rounded-full"><UserMinus size={16}/></div>
                        <div>
                            <p className="text-xs font-bold text-red-700 uppercase">+2 Anos</p>
                            <p className="text-xs text-red-600">Perdidos / Inativos</p>
                        </div>
                    </div>
                    <span className="text-xl font-black text-red-700">{kpi.churn?.perdidos || 0}</span>
                </div>
            </div>
            
            <div className="mt-4 pt-4 border-t text-center">
                <p className="text-xs text-slate-400">Total na Base: <span className="font-bold text-slate-600">
                    {(kpi.churn?.ativos || 0) + (kpi.churn?.inativos6m || 0) + (kpi.churn?.inativos12m || 0) + (kpi.churn?.perdidos || 0)}
                </span> clientes</p>
            </div>
          </div>
        </div>

        {/* 3. RANKINGS SECUNDÁRIOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Regiões */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">🗺️ Top Regiões</h3>
                <div className="space-y-3">
                {rankings.estados.map((uf: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-400 w-4">#{i+1}</span>
                        <span className="font-bold text-slate-700">{uf.uf}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(uf.total / (rankings.estados[0]?.total || 1)) * 100}%` }}></div>
                        </div>
                        <span className="text-xs font-medium w-20 text-right">{fmtCompact(uf.total)}</span>
                    </div>
                    </div>
                ))}
                </div>
            </div>

            {/* Performance Equipe */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    🥇 Performance Comercial ({anoSelecionado === "todos" ? "Geral" : anoSelecionado})
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rankings.vendedores} layout="vertical" margin={{ left: 20, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="nome" type="category" width={120} tick={{fontSize: 12, fill: '#475569', fontWeight: 600}} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(val: number) => fmtBRL(val)} />
                        <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20}>
                        {rankings.vendedores.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={vendedorSelecionado === entry.nome ? '#22c55e' : (index < 3 ? '#2563eb' : '#94a3b8')} />
                        ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

function KpiBox({ titulo, valor, delta, cor }: any) {
  const styles: any = {
    blue:   "border-blue-100 bg-blue-50/50 text-blue-600",
    green:  "border-emerald-100 bg-emerald-50/50 text-emerald-600",
    purple: "border-purple-100 bg-purple-50/50 text-purple-600",
    emerald:"border-teal-100 bg-teal-50/50 text-teal-600",
    slate:  "border-slate-100 bg-slate-50/50 text-slate-600",
  };
  
  return (
    <div className={`p-5 rounded-xl border bg-white shadow-sm hover:shadow-md transition duration-200`}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{titulo}</p>
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{valor}</h2>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${styles[cor]}`}>
          {delta}
        </span>
      </div>
    </div>
  );
}