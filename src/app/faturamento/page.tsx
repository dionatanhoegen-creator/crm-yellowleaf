"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell
} from 'recharts';

const API_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

export default function FaturamentoPage() {
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const res = await fetch(`${API_URL}?path=dashboard/faturamento`);
      const json = await res.json();
      if (json.success) setDados(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fmtBRL = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtCompact = (v: number) => `R$ ${(v / 1000).toFixed(1)}k`;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-900 font-bold animate-pulse">📊 Carregando Inteligência de Dados...</div>;
  if (!dados) return <div className="p-8 text-center text-red-500">Erro de conexão com API.</div>;

  const { kpi, grafico, rankings } = dados;
  const graficoRecente = grafico?.slice(-12) || [];

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Dashboard Executivo</h1>
            <p className="text-slate-500 mt-1">Visão 360º da operação comercial.</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm border text-sm font-mono text-slate-600">
            Atualizado: {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* 1. LINHA DE KPIs (TOP CARDS) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <KpiBox titulo="Faturamento (Ano)" valor={fmtBRL(kpi.faturamentoAno)} delta="+12%" cor="blue" />
          <KpiBox titulo="Novos Clientes" valor={kpi.novosClientes} delta="Carteira Ativa" cor="green" />
          <KpiBox titulo="Ticket Médio" valor={fmtBRL(kpi.ticketMedio)} delta="Por pedido" cor="purple" />
          <KpiBox titulo="Vendas Totais (Geral)" valor={fmtBRL(kpi.totalVendasGeral)} delta="Histórico" cor="slate" />
        </div>

        {/* 2. GRID PRINCIPAL (LAYOUT ASSIMÉTRICO) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* GRÁFICO DE TENDÊNCIA (Ocupa 2 colunas) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              📈 Tendência de Receita <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-full">12 Meses</span>
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
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
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} 
                    formatter={(val: number) => [fmtBRL(val), "Receita"]}
                  />
                  <Area type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TOP ESTADOS & PRODUTOS (Ocupa 1 coluna) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-6">
            
            {/* Estados */}
            <div>
              <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">🗺️ Top Regiões</h3>
              <div className="space-y-3">
                {rankings.estados.map((uf: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-400 w-4">#{i+1}</span>
                      <span className="font-bold text-slate-700">{uf.uf}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(uf.total / rankings.estados[0].total) * 100}%` }}></div>
                      </div>
                      <span className="text-xs font-medium w-16 text-right">{fmtCompact(uf.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 my-1"></div>

            {/* Produtos */}
            <div>
              <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">🏆 Top Produtos</h3>
              <div className="space-y-3">
                {rankings.produtos.map((prod: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm group">
                    <div className="truncate pr-2 text-slate-600 group-hover:text-blue-600 transition max-w-[70%]">
                      {prod.nome}
                    </div>
                    <div className="font-mono font-bold text-slate-700">{fmtCompact(prod.total)}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* 3. RANKING DE VENDEDORES (BARRA HORIZONTAL) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            🥇 Performance da Equipe Comercial
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankings.vendedores} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="nome" 
                  type="category" 
                  width={120} 
                  tick={{fontSize: 12, fill: '#475569', fontWeight: 600}} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 shadow-xl rounded-lg border text-sm">
                          <p className="font-bold text-slate-800 mb-1">{data.nomeCompleto}</p>
                          <p className="text-blue-600 font-bold">Total: {fmtBRL(data.total)}</p>
                          <p className="text-slate-500 text-xs">Ticket Médio: {fmtBRL(data.ticket)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20}>
                  {rankings.vendedores.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index < 3 ? '#2563eb' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

// COMPONENTE DE KPI
function KpiBox({ titulo, valor, delta, cor }: any) {
  const styles: any = {
    blue:   "border-blue-100 bg-blue-50/50 text-blue-600",
    green:  "border-emerald-100 bg-emerald-50/50 text-emerald-600",
    purple: "border-purple-100 bg-purple-50/50 text-purple-600",
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