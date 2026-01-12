"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Users, 
  Calendar, CheckCircle2, XCircle, FileText, PieChart, Download, Filter
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- UTILITÁRIOS ---
const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  // Ajuste de fuso simples para visualização
  const date = new Date(dateStr);
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
  return date.toLocaleDateString('pt-BR');
};

const LABELS_STATUS: Record<string, string> = {
  'prospeccao': 'Prospecção',
  'qualificacao': 'Qualificação',
  'apresentacao': 'Apresentação',
  'negociacao': 'Negociação',
  'fechado': 'Venda Fechada',
  'perdido': 'Perdido'
};

export default function RelatoriosPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [listaCompleta, setListaCompleta] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState('abertos'); 

  // Métricas
  const [metrics, setMetrics] = useState({
    totalOportunidades: 0,
    valorTotalPipeline: 0,
    valorFechado: 0,
    qtdFechado: 0,
    taxaConversao: 0,
    ticketMedio: 0
  });

  const [funil, setFunil] = useState<Record<string, { qtd: number, valor: number }>>({});

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    const { data: pipeline } = await supabase.from('pipeline').select('*').order('created_at', { ascending: false });

    if (pipeline) {
      setListaCompleta(pipeline);

      const totalOps = pipeline.length;
      const totalValor = pipeline.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
      
      const fechados = pipeline.filter(i => i.status === 'fechado');
      const qtdFechado = fechados.length;
      const valorFechado = fechados.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);

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

  const listaFiltrada = listaCompleta.filter(item => {
    if (filtroStatus === 'todos') return true;
    if (filtroStatus === 'fechados') return item.status === 'fechado';
    if (filtroStatus === 'abertos') return item.status !== 'fechado' && item.status !== 'perdido';
    return true;
  });

  // --- GERADOR DE PDF COM LOGO ---
  const gerarRelatorioGerencial = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Paisagem
    
    // 1. INSERE O LOGO (Se existir)
    try {
        // Posição X=14, Y=10, Largura=35, Altura=15
        doc.addImage("/logo.jpg", "JPEG", 14, 8, 35, 15);
    } catch (e) {
        console.error("Erro ao carregar logo no relatório", e);
    }

    // 2. TÍTULO E DATAS
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    // Ajustei o Y para 30 para ficar abaixo do logo
    doc.text("Relatório Gerencial de Vendas", 14, 32);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} | Filtro: ${filtroStatus.toUpperCase()}`, 14, 38);

    // 3. TABELA DE DADOS
    const tableBody = listaFiltrada.map(item => [
        item.nome_cliente || 'Sem Nome',
        item.produto || '-',
        LABELS_STATUS[item.status] || item.status,
        formatCurrency(item.valor || 0),
        formatDate(item.data_entrada),
        item.canal_contato || 'N/D',
        item.observacoes ? item.observacoes.substring(0, 50) + '...' : '' 
    ]);

    autoTable(doc, {
        startY: 42, // Começa logo após o cabeçalho
        head: [['Cliente', 'Produto', 'Estágio', 'Valor', 'Entrada', 'Canal', 'Observações Internas']],
        body: tableBody,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [20, 83, 45], textColor: 255, fontStyle: 'bold' }, 
        columnStyles: {
            0: { cellWidth: 40 }, 
            1: { cellWidth: 35 }, 
            2: { cellWidth: 25 }, 
            3: { cellWidth: 25, halign: 'right' }, 
            4: { cellWidth: 20, halign: 'center' }, 
            5: { cellWidth: 25 }, 
            6: { cellWidth: 'auto' } 
        }
    });

    // RODAPÉ COM TOTAIS
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(0);
    const totalDestaPagina = listaFiltrada.reduce((acc, i) => acc + (Number(i.valor)||0), 0);
    doc.text(`TOTAL LISTADO: ${formatCurrency(totalDestaPagina)}`, 14, finalY);

    doc.save(`Relatorio_Vendas_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold animate-pulse">Carregando dados...</div>;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        
        {/* CABEÇALHO DA PÁGINA */}
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

        {/* 1. KPIs PRINCIPAIS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
           <CardMetric 
             icon={<DollarSign size={24}/>} 
             label="Pipeline Total" 
             value={formatCurrency(metrics.valorTotalPipeline)} 
             color="text-blue-600" bg="bg-blue-50" border="border-blue-100"
           />
           <CardMetric 
             icon={<CheckCircle2 size={24}/>} 
             label="Vendas Fechadas" 
             value={formatCurrency(metrics.valorFechado)} 
             subValue={`${metrics.qtdFechado} contratos`}
             color="text-green-600" bg="bg-green-50" border="border-green-100"
           />
           <CardMetric 
             icon={<TrendingUp size={24}/>} 
             label="Conversão" 
             value={`${metrics.taxaConversao.toFixed(1)}%`} 
             subValue="Eficiência"
             color="text-purple-600" bg="bg-purple-50" border="border-purple-100"
           />
           <CardMetric 
             icon={<Users size={24}/>} 
             label="Ticket Médio" 
             value={formatCurrency(metrics.ticketMedio)} 
             color="text-orange-600" bg="bg-orange-50" border="border-orange-100"
           />
        </div>

        {/* 2. GRÁFICOS E FUNIL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
              <PieChart size={20} className="text-slate-400"/> Funil de Vendas (Volume)
            </h3>
            <div className="space-y-4">
              {Object.values(funil).map((f: any) => {
                const percent = metrics.totalOportunidades > 0 ? (f.qtd / metrics.totalOportunidades) * 100 : 0;
                return (
                  <div key={f.label}>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1 uppercase">
                      <span>{f.label}</span>
                      <span>{f.qtd} ({percent.toFixed(0)}%)</span>
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

          {/* PAINEL META */}
          <div className="bg-slate-800 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
             <div className="relative z-10">
               <h3 className="font-bold text-lg mb-2">Meta vs Realizado</h3>
               <div className="text-4xl font-black mb-1">{formatCurrency(metrics.valorFechado)}</div>
               <p className="text-green-400 text-xs font-bold uppercase tracking-wider mb-8">Já Faturado</p>
               <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                 <p className="text-xs text-slate-300 mb-1 font-bold uppercase">Potencial na Mesa</p>
                 <p className="text-xl font-bold">{formatCurrency(metrics.valorTotalPipeline - metrics.valorFechado)}</p>
               </div>
             </div>
             <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-green-500 rounded-full blur-[80px] opacity-20"></div>
          </div>
        </div>

        {/* 3. TABELA DETALHADA E EXPORTAÇÃO */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div>
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><FileText size={20} className="text-blue-600"/> Relatório Detalhado</h3>
                    <p className="text-xs text-slate-500">Visualize e exporte os dados para apresentar à diretoria.</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-white border border-slate-200 rounded-lg p-1">
                        <button onClick={() => setFiltroStatus('abertos')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${filtroStatus === 'abertos' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>Abertos</button>
                        <button onClick={() => setFiltroStatus('fechados')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${filtroStatus === 'fechados' ? 'bg-green-100 text-green-700' : 'text-slate-500 hover:bg-slate-50'}`}>Fechados</button>
                        <button onClick={() => setFiltroStatus('todos')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${filtroStatus === 'todos' ? 'bg-slate-200 text-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}>Todos</button>
                    </div>
                    <button onClick={gerarRelatorioGerencial} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition active:scale-95">
                        <Download size={14}/> Baixar PDF
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                        <tr>
                            <th className="p-4">Cliente</th>
                            <th className="p-4">Produto</th>
                            <th className="p-4">Estágio</th>
                            <th className="p-4">Valor</th>
                            <th className="p-4">Entrada</th>
                            <th className="p-4">Canal</th>
                            <th className="p-4">Obs. Interna</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {listaFiltrada.length === 0 && (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
                        )}
                        {listaFiltrada.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition">
                                <td className="p-4 font-bold text-slate-700">{item.nome_cliente}</td>
                                <td className="p-4 text-slate-600"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">{item.produto}</span></td>
                                <td className="p-4 font-bold text-slate-500 uppercase">{LABELS_STATUS[item.status]}</td>
                                <td className="p-4 font-bold text-slate-700">{formatCurrency(item.valor)}</td>
                                <td className="p-4 text-slate-500">{formatDate(item.data_entrada)}</td>
                                <td className="p-4 text-slate-500">{item.canal_contato || '-'}</td>
                                <td className="p-4 text-slate-400 italic max-w-[200px] truncate" title={item.observacoes}>{item.observacoes || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right text-xs font-bold text-slate-500">
                Mostrando {listaFiltrada.length} registros
            </div>
        </div>

      </div>
    </div>
  );
}

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