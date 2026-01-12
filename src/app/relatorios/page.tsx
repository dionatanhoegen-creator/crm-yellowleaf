"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Users, 
  Calendar, CheckCircle2, XCircle, AlertCircle, PieChart
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Função para formatar dinheiro
const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RelatoriosPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  
  // Estados para métricas
  const [metrics, setMetrics] = useState({
    totalOportunidades: 0,
    valorTotalPipeline: 0,
    valorFechado: 0,
    qtdFechado: 0,
    taxaConversao: 0,
    ticketMedio: 0
  });

  // Estado para o Funil
  const [funil, setFunil] = useState<Record<string, { qtd: number, valor: number }>>({});

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    const { data: pipeline } = await supabase.from('pipeline').select('*');

    if (pipeline) {
      // 1. Cálculos Gerais
      const totalOps = pipeline.length;
      const totalValor = pipeline.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
      
      const fechados = pipeline.filter(i => i.status === 'fechado');
      const qtdFechado = fechados.length;
      const valorFechado = fechados.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);

      // 2. Cálculo do Funil (Agrupamento)
      const novoFunil: any = {
        'prospeccao': { qtd: 0, valor: 0, label: 'Prospecção', color: 'bg-blue-500' },
        'qualificacao': { qtd: 0, valor: 0, label: 'Qualificação', color: 'bg-purple-500' },
        'apresentacao': { qtd: 0, valor: 0, label: 'Apresentação', color: 'bg-pink-500' },
        'negociacao': { qtd: 0, valor: 0, label: 'Negociação', color: 'bg-yellow-500' },
        'fechado': { qtd: 0, valor: 0, label: 'Fechado', color: 'bg-green-500' },
        'perdido': { qtd: 0, valor: 0, label: 'Perdido', color: 'bg-red-500' },
      };

      pipeline.forEach(item => {
        if (novoFunil[item.status]) {
          novoFunil[item.status].qtd += 1;
          novoFunil[item.status].valor += (Number(item.valor) || 0);
        }
      });

      setMetrics({
        totalOportunidades: totalOps,
        valorTotalPipeline: totalValor,
        valorFechado: valorFechado,
        qtdFechado: qtdFechado,
        taxaConversao: totalOps > 0 ? (qtdFechado / totalOps) * 100 : 0,
        ticketMedio: qtdFechado > 0 ? valorFechado / qtdFechado : 0
      });

      setFunil(novoFunil);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold animate-pulse">Calculando métricas...</div>;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
           <div className="flex items-center gap-3">
             <div className="p-3 bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-200">
               <BarChart3 size={32}/>
             </div>
             <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Comercial</h1>
               <p className="text-slate-500">Panorama geral de performance e resultados.</p>
             </div>
           </div>
           <button onClick={carregarDados} className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-bold border border-blue-100 hover:bg-blue-50 transition shadow-sm">
             Atualizar Dados ↻
           </button>
        </div>

        {/* 1. KPIs PRINCIPAIS (CARDS) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
           <CardMetric 
             icon={<DollarSign size={24}/>} 
             label="Valor em Pipeline (Total)" 
             value={formatCurrency(metrics.valorTotalPipeline)} 
             color="text-blue-600" bg="bg-blue-50" border="border-blue-100"
           />
           <CardMetric 
             icon={<CheckCircle2 size={24}/>} 
             label="Vendas Fechadas" 
             value={formatCurrency(metrics.valorFechado)} 
             subValue={`${metrics.qtdFechado} contratos assinados`}
             color="text-green-600" bg="bg-green-50" border="border-green-100"
           />
           <CardMetric 
             icon={<TrendingUp size={24}/>} 
             label="Taxa de Conversão" 
             value={`${metrics.taxaConversao.toFixed(1)}%`} 
             subValue="Eficiência comercial"
             color="text-purple-600" bg="bg-purple-50" border="border-purple-100"
           />
           <CardMetric 
             icon={<Users size={24}/>} 
             label="Ticket Médio" 
             value={formatCurrency(metrics.ticketMedio)} 
             subValue="Por venda fechada"
             color="text-orange-600" bg="bg-orange-50" border="border-orange-100"
           />
        </div>

        {/* 2. FUNIL DE VENDAS E DISTRIBUIÇÃO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* FUNIL GRÁFICO (BARRAS) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
              <PieChart size={20} className="text-slate-400"/> Funil de Vendas (Volume)
            </h3>
            <div className="space-y-4">
              {Object.values(funil).map((f: any) => {
                // Calcula largura da barra baseada no total (máx 100%)
                const percent = metrics.totalOportunidades > 0 ? (f.qtd / metrics.totalOportunidades) * 100 : 0;
                return (
                  <div key={f.label}>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1 uppercase">
                      <span>{f.label}</span>
                      <span>{f.qtd} Oportunidades ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div className={`h-full rounded-full ${f.color}`} style={{ width: `${percent}%`, minWidth: percent > 0 ? '5px' : '0' }}></div>
                    </div>
                    <div className="text-right text-[10px] font-bold text-slate-400 mt-1">
                      {formatCurrency(f.valor)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* RESUMO RÁPIDO (SIDEBAR) */}
          <div className="bg-slate-800 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
             <div className="relative z-10">
               <h3 className="font-bold text-lg mb-2">Meta Mensal</h3>
               <p className="text-slate-400 text-sm mb-6">Acompanhe o progresso financeiro.</p>
               
               <div className="text-4xl font-black mb-1">{formatCurrency(metrics.valorFechado)}</div>
               <p className="text-green-400 text-xs font-bold uppercase tracking-wider mb-8">Já Faturado</p>

               <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                 <p className="text-xs text-slate-300 mb-1 font-bold uppercase">Potencial na Mesa</p>
                 <p className="text-xl font-bold">{formatCurrency(metrics.valorTotalPipeline - metrics.valorFechado)}</p>
               </div>
             </div>
             
             {/* Decorative Circles */}
             <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-green-500 rounded-full blur-[80px] opacity-20"></div>
             <div className="absolute top-10 -left-10 w-40 h-40 bg-blue-500 rounded-full blur-[80px] opacity-20"></div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Componente Auxiliar de Card
function CardMetric({ icon, label, value, subValue, color, bg, border }: any) {
  return (
    <div className={`bg-white p-6 rounded-2xl border shadow-sm ${border} hover:shadow-md transition`}>
      <div className={`w-10 h-10 ${bg} ${color} rounded-lg flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
      <h2 className="text-2xl font-black text-slate-800">{value}</h2>
      {subValue && <p className="text-xs text-slate-400 mt-2 font-medium">{subValue}</p>}
    </div>
  );
}