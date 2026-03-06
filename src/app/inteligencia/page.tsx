"use client";

import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, Search, Download, Building2, Beaker, Calendar, 
  MapPin, Target, Activity, FileText, ChevronRight
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_CLIENTES_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

export default function InteligenciaPage() {
  const [loading, setLoading] = useState(false);
  const [tipoBusca, setTipoBusca] = useState<'produto' | 'farmacia'>('produto');
  const [termoBusca, setTermoBusca] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscou, setBuscou] = useState(false);

  const formatCurrency = (val: number) => (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Simulação de busca na base (Ajuste os campos conforme sua planilha retorna)
  const realizarBusca = async () => {
    if (!termoBusca.trim()) return alert("Digite um termo para pesquisar.");
    setLoading(true);
    setBuscou(true);

    try {
      // Puxa os dados da sua planilha do Google (Aba Clientes/Vendas)
      const res = await fetch(`${API_CLIENTES_URL}?path=clientes`);
      const json = await res.json();
      
      let baseDados = [];
      if (json.success && Array.isArray(json.data)) {
          baseDados = json.data;
      }

      // LÓGICA DE INTELIGÊNCIA E FILTRAGEM
      const termo = termoBusca.toLowerCase().trim();
      const resultadosFiltrados: any[] = [];

      baseDados.forEach((cliente: any) => {
          // Supondo que a planilha retorne o histórico no campo "historico_compras" ou "produtos"
          // Como não sei o nome exato da coluna da sua planilha, estou criando uma busca profunda (Deep Search)
          const textoClienteCompleto = JSON.stringify(cliente).toLowerCase();

          if (tipoBusca === 'produto') {
              // Se achou o nome do ativo no histórico desse cliente
              if (textoClienteCompleto.includes(termo)) {
                  resultadosFiltrados.push({
                      id: cliente.cnpj || Math.random(),
                      farmacia: cliente.nome_fantasia || cliente.razao_social || 'Farmácia Não Identificada',
                      cidade: cliente.municipio || cliente.cidade || '-',
                      uf: cliente.uf || '-',
                      detalhe: `Possui histórico de compra relacionado a: ${termo.toUpperCase()}`,
                      ultima_compra: cliente.ultima_compra || 'Data não registrada',
                      status: cliente.bloqueado ? 'Bloqueado' : 'Ativo'
                  });
              }
          } else {
              // Busca por Farmácia
              const nomeFarmacia = (cliente.nome_fantasia || cliente.razao_social || '').toLowerCase();
              if (nomeFarmacia.includes(termo) || (cliente.cnpj && cliente.cnpj.includes(termo))) {
                  resultadosFiltrados.push({
                      id: cliente.cnpj || Math.random(),
                      farmacia: cliente.nome_fantasia || cliente.razao_social,
                      cidade: cliente.municipio || cliente.cidade || '-',
                      uf: cliente.uf || '-',
                      detalhe: cliente.produtos_comprados || 'Verifique o histórico completo na planilha',
                      ultima_compra: cliente.ultima_compra || '-',
                      status: cliente.bloqueado ? 'Bloqueado' : 'Ativo'
                  });
              }
          }
      });

      setResultados(resultadosFiltrados);
    } catch (e) {
      console.error("Erro ao buscar inteligência:", e);
      alert("Falha ao cruzar os dados com o ERP. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(20, 83, 45); // Verde Escuro
    doc.text("RELATÓRIO DE INTELIGÊNCIA DE MERCADO", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Termo Pesquisado: ${termoBusca.toUpperCase()} (${tipoBusca === 'produto' ? 'Por Ativo' : 'Por Farmácia'})`, 14, 26);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 32);

    const tableBody = resultados.map(r => [
        r.farmacia,
        `${r.cidade}/${r.uf}`,
        r.ultima_compra,
        r.status
    ]);

    autoTable(doc, {
        startY: 40,
        head: [['FARMÁCIA', 'LOCALIZAÇÃO', 'ÚLTIMA INTERAÇÃO/COMPRA', 'STATUS']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [20, 83, 45], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
    });

    doc.save(`Inteligencia_${termoBusca}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-10 text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm transform rotate-3">
                <Lightbulb size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inteligência de Mercado</h1>
            <p className="text-slate-500 mt-2 max-w-xl mx-auto">Cruze dados do ERP para descobrir quais farmácias compram quais ativos. Ideal para direcionar a visitação médica.</p>
        </div>

        {/* MOTOR DE BUSCA */}
        <div className="bg-white p-2 rounded-3xl shadow-xl border border-slate-100 mb-8 flex flex-col md:flex-row items-center relative z-10">
            <div className="flex w-full md:w-auto p-2 bg-slate-50 rounded-2xl mb-2 md:mb-0 md:mr-2">
                <button 
                    onClick={() => {setTipoBusca('produto'); setResultados([]); setBuscou(false);}}
                    className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${tipoBusca === 'produto' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Beaker size={16}/> Por Ativo
                </button>
                <button 
                    onClick={() => {setTipoBusca('farmacia'); setResultados([]); setBuscou(false);}}
                    className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${tipoBusca === 'farmacia' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Building2 size={16}/> Por Farmácia
                </button>
            </div>

            <div className="flex-1 w-full relative flex items-center">
                <input 
                    type="text" 
                    placeholder={tipoBusca === 'produto' ? "Ex: Lipoartich, Purin..." : "Ex: Farmácia São João, CNPJ..."}
                    className="w-full pl-6 pr-4 py-4 bg-transparent outline-none text-lg font-medium text-slate-700 placeholder-slate-300"
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && realizarBusca()}
                />
            </div>

            <button 
                onClick={realizarBusca} 
                disabled={loading}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black shadow-lg shadow-blue-200 transition transform active:scale-95 disabled:opacity-50 m-2 flex items-center justify-center gap-2"
            >
                {loading ? <Activity className="animate-spin" size={24}/> : <Search size={24}/>}
                <span className="md:hidden">Pesquisar</span>
            </button>
        </div>

        {/* ÁREA DE RESULTADOS */}
        {buscou && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-end mb-4 px-2">
                    <div>
                        <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                            <Target className="text-blue-500"/> Resultados da Análise
                        </h3>
                        <p className="text-sm text-slate-500">Encontramos <strong className="text-blue-600">{resultados.length}</strong> registros para "{termoBusca}".</p>
                    </div>
                    {resultados.length > 0 && (
                        <button onClick={exportarPDF} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition flex items-center gap-2 shadow-sm">
                            <Download size={14}/> Exportar PDF
                        </button>
                    )}
                </div>

                {resultados.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search size={32}/>
                        </div>
                        <h4 className="text-lg font-bold text-slate-700">Nenhum dado cruzado</h4>
                        <p className="text-slate-500 mt-2">Não encontramos ocorrências de "{termoBusca}" na base atual do ERP.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {resultados.map((res, index) => (
                            <div key={index} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition group flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                        <Building2 size={20}/>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800 uppercase tracking-tight">{res.farmacia}</h4>
                                        <div className="flex items-center gap-3 text-xs font-medium text-slate-500 mt-1">
                                            <span className="flex items-center gap-1"><MapPin size={12}/> {res.cidade}/{res.uf}</span>
                                            <span className="flex items-center gap-1"><Calendar size={12}/> {res.ultima_compra}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-slate-600 font-medium sm:max-w-xs w-full text-center sm:text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5 tracking-wider">Status / Retorno</p>
                                    {res.status === 'Ativo' ? (
                                        <span className="text-green-600 font-bold">Cliente Ativo</span>
                                    ) : (
                                        <span className="text-red-500 font-bold">Bloqueado no ERP</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
}