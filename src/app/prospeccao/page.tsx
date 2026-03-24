"use client";

import React, { useState, useEffect } from 'react';
import { 
  Target, Upload, Search, CheckCircle2, AlertTriangle, 
  Download, Users, ArrowRight, Building2, MapPin, Activity, FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_CLIENTES_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

export default function ProspeccaoPage() {
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [clientesERP, setClientesERP] = useState<any[]>([]);
  
  // Estados do Mailing
  const [textoColado, setTextoColado] = useState("");
  const [analisado, setAnalisado] = useState(false);
  const [resultados, setResultados] = useState({
      virgens: [] as any[],
      clientes: [] as any[],
      totalLinhas: 0,
      cabecalhos: [] as string[]
  });

  useEffect(() => {
    carregarBaseERP();
  }, []);

  const carregarBaseERP = async () => {
    setLoading(true);
    try {
        const res = await fetch(`${API_CLIENTES_URL}?path=clientes`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            setClientesERP(json.data);
        }
    } catch (e) {
        console.error("Erro ao puxar ERP:", e);
    } finally {
        setLoading(false);
    }
  };

  const limparCNPJ = (cnpj: any) => {
      if (!cnpj) return "";
      return String(cnpj).replace(/\D/g, ''); 
  };

  const cruzarDados = async () => {
      if (!textoColado.trim()) return alert("Cole os dados do Excel primeiro!");
      
      setLoading(true);
      setProgresso(0);

      const cnpjsERP = new Set(
          clientesERP.map(c => limparCNPJ(c.cnpj || c.documento)).filter(c => c.length > 0)
      );

      const linhas = textoColado.split('\n').filter(l => l.trim().length > 0);
      
      if (linhas.length < 2) {
          setLoading(false);
          return alert("O texto colado precisa ter pelo menos um cabeçalho e uma linha de dados.");
      }

      const cabecalhosRaw = linhas[0].split('\t');
      const cabecalhos = cabecalhosRaw.map(h => h.toLowerCase().trim());
      const indexCnpj = cabecalhos.findIndex(h => h.includes('cnpj') || h.includes('documento'));

      if (indexCnpj === -1) {
          setLoading(false);
          return alert("Não encontrei uma coluna chamada 'CNPJ' no cabeçalho colado. Verifique os dados.");
      }

      // Prepara os cabeçalhos finais para garantir que Razão Social e Fantasia existam
      let cabecalhosFinais = [...cabecalhosRaw.map(h => h.trim())];
      const temRazao = cabecalhos.some(h => h.includes('razão') || h.includes('razao'));
      const temFantasia = cabecalhos.some(h => h.includes('fantasia'));
      
      if (!temRazao) cabecalhosFinais.push('Razão Social');
      if (!temFantasia) cabecalhosFinais.push('Nome Fantasia');

      const novasOportunidades: any[] = [];
      const jaClientes: any[] = [];

      for (let i = 1; i < linhas.length; i++) {
          const colunas = linhas[i].split('\t');
          const lead: any = {};
          
          // Inicializa todas as chaves
          cabecalhosFinais.forEach(cab => lead[cab] = '');

          // Popula o que veio do Excel
          cabecalhosRaw.forEach((cabecalho, index) => {
              lead[cabecalho.trim()] = colunas[index] ? colunas[index].trim() : '';
          });

          const cnpjLead = limparCNPJ(colunas[indexCnpj]);

          if (cnpjLead.length >= 11) {
              
              // --- BUSCA NA RECEITA FEDERAL (BRASIL API) ---
              try {
                  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLead}`);
                  if (res.ok) {
                      const data = await res.json();
                      
                      // Preenche Razão Social se estiver vazio
                      const chaveRazao = cabecalhosFinais.find(h => h.toLowerCase().includes('razão') || h.toLowerCase().includes('razao')) || 'Razão Social';
                      if (!lead[chaveRazao] || lead[chaveRazao].trim() === '') {
                          lead[chaveRazao] = data.razao_social || '';
                      }

                      // Preenche Fantasia se estiver vazio
                      const chaveFantasia = cabecalhosFinais.find(h => h.toLowerCase().includes('fantasia')) || 'Nome Fantasia';
                      if (!lead[chaveFantasia] || lead[chaveFantasia].trim() === '') {
                          lead[chaveFantasia] = data.nome_fantasia || data.razao_social || '';
                      }
                  }
              } catch (e) {
                  // Se a API falhar (ex: excesso de requisições), ignora silenciosamente e usa o que tem do Excel
              }

              lead.cnpj_limpo = cnpjLead;
              if (cnpjsERP.has(cnpjLead)) {
                  jaClientes.push(lead);
              } else {
                  novasOportunidades.push(lead);
              }
          }
          
          // Atualiza a barra de progresso (útil se o Mailing for grande)
          setProgresso(Math.round((i / (linhas.length - 1)) * 100));
      }

      setResultados({
          virgens: novasOportunidades,
          clientes: jaClientes,
          totalLinhas: linhas.length - 1,
          cabecalhos: cabecalhosFinais
      });
      
      setAnalisado(true);
      setLoading(false);
  };

  const exportarPDFOportunidades = () => {
      if (resultados.virgens.length === 0 && resultados.clientes.length === 0) {
          return alert("Não há dados para exportar.");
      }

      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(20, 83, 45); 
      doc.text("RELATÓRIO DE MAILING: DIAGNÓSTICO DE BASE", 14, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} | Total Analisado: ${resultados.totalLinhas}`, 14, 26);

      const chavesDisponiveis = resultados.cabecalhos.slice(0, 9); 
      const tableHead = chavesDisponiveis.map(k => k.toUpperCase());
      
      let startY = 35;

      // TABELA 1: OPORTUNIDADES VIRGENS
      if (resultados.virgens.length > 0) {
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(37, 99, 235); // Azul
          doc.text(`OPORTUNIDADES (LEADS VIRGENS) - ${resultados.virgens.length} encontrados`, 14, startY);
          
          const tableBodyVirgens = resultados.virgens.map(lead => chavesDisponiveis.map(k => lead[k] || '-'));
          
          autoTable(doc, {
              startY: startY + 5,
              head: [tableHead],
              body: tableBodyVirgens,
              theme: 'grid',
              headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
              styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }, 
          });
          
          startY = (doc as any).lastAutoTable.finalY + 15;
      }

      // TABELA 2: JÁ CLIENTES (BASE ERP)
      if (resultados.clientes.length > 0) {
          if (startY > 170) { 
              doc.addPage(); 
              startY = 20; 
          }
          
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(22, 163, 74); // Verde
          doc.text(`JÁ SÃO CLIENTES (BASE ERP) - ${resultados.clientes.length} encontrados`, 14, startY);
          
          const tableBodyClientes = resultados.clientes.map(cliente => chavesDisponiveis.map(k => cliente[k] || '-'));

          autoTable(doc, {
              startY: startY + 5,
              head: [tableHead],
              body: tableBodyClientes,
              theme: 'grid',
              headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
              styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }, 
          });
      }

      doc.save(`Mailing_Completo_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportarExcelOportunidades = () => {
      if (resultados.virgens.length === 0 && resultados.clientes.length === 0) {
          return alert("Não há dados para exportar.");
      }

      const chavesDisponiveis = resultados.cabecalhos;
      
      let csvContent = "\uFEFF"; 
      // Adiciona uma coluna STATUS no início
      csvContent += `"STATUS DE MAILING";` + chavesDisponiveis.map(k => `"${k.toUpperCase()}"`).join(';') + "\n";

      // Adiciona Oportunidades
      resultados.virgens.forEach(lead => {
          const linha = chavesDisponiveis.map(k => {
              let valor = lead[k] || '';
              valor = String(valor).replace(/"/g, '""').replace(/\n/g, ' ');
              return `"${valor}"`; 
          });
          csvContent += `"OPORTUNIDADE (LEAD)";` + linha.join(';') + "\n";
      });

      // Adiciona Clientes
      resultados.clientes.forEach(cliente => {
          const linha = chavesDisponiveis.map(k => {
              let valor = cliente[k] || '';
              valor = String(valor).replace(/"/g, '""').replace(/\n/g, ' ');
              return `"${valor}"`; 
          });
          csvContent += `"JÁ É CLIENTE (ERP)";` + linha.join(';') + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Mailing_Classificado_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const reiniciar = () => {
      setTextoColado("");
      setAnalisado(false);
      setProgresso(0);
      setResultados({ virgens: [], clientes: [], totalLinhas: 0, cabecalhos: [] });
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-10 text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm transform rotate-3">
                <Target size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Prospecção & Mailing</h1>
            <p className="text-slate-500 mt-2 max-w-2xl mx-auto">
                Cruze a sua lista de contatos do Excel com a nossa base oficial de clientes (ERP). 
                Descubra instantaneamente quem são os novos prospects e não perca tempo com quem já é cliente.
            </p>
        </div>

        {!analisado ? (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                    <h2 className="text-xl font-bold text-slate-800">Copie do Excel e Cole Abaixo</h2>
                </div>

                <div className="mb-6">
                    <p className="text-sm font-medium text-slate-500 mb-2">
                        Selecione as colunas na sua planilha (certifique-se de incluir a coluna <strong className="text-slate-700">CNPJ</strong>), aperte <strong className="text-slate-700">Ctrl+C</strong> e cole (<strong className="text-slate-700">Ctrl+V</strong>) dentro da caixa:
                    </p>
                    <textarea 
                        className="w-full h-64 p-4 border-2 border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition text-xs font-mono whitespace-pre text-slate-600 custom-scrollbar shadow-inner"
                        placeholder="CNPJ&#9;Razão Social&#9;Cidade&#10;12.345.678/0001-90&#9;Farmácia Exemplo&#9;São Paulo..."
                        value={textoColado}
                        onChange={(e) => setTextoColado(e.target.value)}
                    ></textarea>
                </div>

                <button 
                    onClick={cruzarDados}
                    disabled={loading || !textoColado || clientesERP.length === 0}
                    className="w-full bg-[#0f392b] hover:bg-[#16503c] text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-lg transition transform active:scale-[0.98] disabled:opacity-50 uppercase tracking-wide relative overflow-hidden"
                >
                    {/* Barra de Progresso visual no fundo do botão */}
                    {loading && (
                        <div 
                            className="absolute left-0 top-0 bottom-0 bg-green-500/30 transition-all duration-300"
                            style={{ width: `${progresso}%` }}
                        ></div>
                    )}
                    <span className="relative flex items-center gap-3 z-10">
                        {loading ? <Activity className="animate-spin" size={24}/> : <Search size={24}/>}
                        {loading ? `Analisando Dados: ${progresso}%...` : 'Cruzar com a Base ERP'}
                    </span>
                </button>

                {clientesERP.length === 0 && !loading && (
                    <p className="text-center text-red-500 text-sm font-bold mt-4 animate-pulse">Aguardando conexão com o ERP (Data Lake)...</p>
                )}
            </div>
        ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Activity className="text-blue-600"/> Diagnóstico do Mailing
                    </h2>
                    <button onClick={reiniciar} className="text-sm font-bold text-slate-500 hover:text-slate-800 transition px-5 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
                        Nova Análise
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center shrink-0">
                            <Upload size={28}/>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Analisado</p>
                            <p className="text-3xl font-black text-slate-800">{resultados.totalLinhas}</p>
                        </div>
                    </div>

                    <div className="bg-blue-600 p-6 rounded-2xl border border-blue-700 shadow-lg shadow-blue-200 flex items-center gap-4 transform hover:-translate-y-1 transition">
                        <div className="w-14 h-14 bg-white/20 text-white rounded-xl flex items-center justify-center shrink-0">
                            <Target size={28}/>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Oportunidades Virgens</p>
                            <p className="text-3xl font-black text-white">{resultados.virgens.length}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 opacity-80">
                        <div className="w-14 h-14 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0">
                            <CheckCircle2 size={28}/>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Já são Clientes</p>
                            <p className="text-3xl font-black text-slate-800">{resultados.clientes.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <Building2 className="text-blue-600"/> Tabela de Oportunidades (Visualização)
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Ao exportar, o sistema separará Leads Virgens de Clientes ERP automaticamente.</p>
                        </div>
                        
                        {(resultados.virgens.length > 0 || resultados.clientes.length > 0) && (
                            <div className="flex gap-2">
                                <button onClick={exportarPDFOportunidades} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm shrink-0">
                                    <Download size={16}/> Baixar PDF
                                </button>
                                <button onClick={exportarExcelOportunidades} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm shrink-0">
                                    <FileSpreadsheet size={16}/> Baixar Excel / CSV
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50">
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                                    {resultados.cabecalhos.slice(0, 9).map((k, idx) => (
                                        <th key={idx} className="p-4">{k}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {resultados.virgens.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-10 text-center">
                                            <AlertTriangle size={32} className="mx-auto text-yellow-400 mb-3"/>
                                            <p className="text-slate-600 font-bold">Nenhuma oportunidade virgem encontrada.</p>
                                            <p className="text-slate-400 text-sm">Todos os registros colados já constam na base do ERP.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    resultados.virgens.slice(0, 100).map((lead, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/50 transition">
                                            {resultados.cabecalhos.slice(0, 9).map((k, colIdx) => (
                                                <td key={colIdx} className="p-4 font-medium text-slate-700 truncate max-w-[150px]" title={lead[k]}>
                                                    {lead[k] || '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        {resultados.virgens.length > 100 && (
                            <div className="p-4 text-center text-xs font-bold text-slate-500 bg-slate-50 border-t border-slate-100">
                                Mostrando os primeiros 100 registros virgens. Clique em "Baixar Excel / CSV" para obter a lista separada e completa.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        )}

      </div>
    </div>
  );
}