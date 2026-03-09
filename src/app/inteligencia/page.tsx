"use client";

import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, Search, Download, Building2, Beaker, Calendar, 
  MapPin, Target, Activity, FileText, User, X, ChevronDown, Check,
  Briefcase, TrendingUp, BarChart3, Maximize2, Hash
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_CLIENTES_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";
const API_PRODUTOS_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

export default function InteligenciaPage() {
  const [loading, setLoading] = useState(false);
  const [tipoBusca, setTipoBusca] = useState<'produto' | 'farmacia'>('produto');
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscou, setBuscou] = useState(false);

  // Estados de Busca
  const [produtosApi, setProdutosApi] = useState<string[]>([]);
  const [ativosSelecionados, setAtivosSelecionados] = useState<string[]>([]);
  const [termoProdutoDropdown, setTermoProdutoDropdown] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [termoFarmacia, setTermoFarmacia] = useState("");

  // Estado do Dossiê (Modal)
  const [dossieAtivo, setDossieAtivo] = useState<any>(null);

  useEffect(() => {
    carregarListaProdutos();
  }, []);

  const carregarListaProdutos = async () => {
    try {
        const res = await fetch(`${API_PRODUTOS_URL}?path=produtos`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            const listaNomes = json.data.map((p: any) => p.ativo?.trim()).filter(Boolean);
            setProdutosApi(Array.from(new Set(listaNomes)).sort() as string[]);
        }
    } catch (e) { console.error("Erro API Produtos:", e); }
  };

  const toggleAtivo = (ativo: string) => {
      if (ativosSelecionados.includes(ativo)) {
          setAtivosSelecionados(ativosSelecionados.filter(a => a !== ativo));
      } else {
          setAtivosSelecionados([...ativosSelecionados, ativo]);
      }
      setTermoProdutoDropdown("");
  };

  const cleanText = (text: any) => {
      if (!text) return "";
      return String(text)
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
          .replace(/[®™]/g, "") 
          .trim();
  };

  const formatCurrency = (val: any) => {
      const num = Number(val);
      if (isNaN(num)) return val;
      return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const realizarBusca = async () => {
    if (tipoBusca === 'produto' && ativosSelecionados.length === 0) return alert("Selecione pelo menos um ativo para a análise.");
    if (tipoBusca === 'farmacia' && !termoFarmacia.trim()) return alert("Digite o identificador da farmácia.");
    
    setLoading(true);
    setBuscou(true);
    setDropdownAberto(false);

    try {
      const res = await fetch(`${API_CLIENTES_URL}?path=clientes`);
      const json = await res.json();
      
      let baseDados = [];
      if (json.success && Array.isArray(json.data)) {
          baseDados = json.data;
      }

      const resultadosFiltrados: any[] = [];

      baseDados.forEach((cliente: any) => {
          const clienteLimpo: any = {};
          Object.keys(cliente).forEach(k => {
              const keyLimpa = cleanText(k).replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
              clienteLimpo[keyLimpa] = cliente[k];
          });

          const nomeFarmacia = clienteLimpo.fantasia || clienteLimpo.nome_fantasia || clienteLimpo.razao_social || clienteLimpo.cliente || clienteLimpo.nome || 'FARMÁCIA NÃO IDENTIFICADA';
          const cnpj = clienteLimpo.cnpj || clienteLimpo.documento || clienteLimpo.cpf_cnpj || 'CNPJ N/D';
          const vendedor = clienteLimpo.vendedor || clienteLimpo.representante || clienteLimpo.consultor || 'N/D';
          const cidadeUf = `${clienteLimpo.municipio || clienteLimpo.cidade || '-'} / ${clienteLimpo.uf || clienteLimpo.estado || '-'}`;
          const ultimaCompra = clienteLimpo.ultima_compra || clienteLimpo.data_ultima_compra || clienteLimpo.data || '-';
          const status = clienteLimpo.bloqueado ? 'Bloqueado' : 'Ativo';

          const textoClienteCompleto = cleanText(JSON.stringify(cliente));

          let encontrou = false;

          if (tipoBusca === 'produto') {
              ativosSelecionados.forEach(ativo => {
                  if (textoClienteCompleto.includes(cleanText(ativo))) encontrou = true;
              });
          } else {
              const termoFarm = cleanText(termoFarmacia);
              const nomeFarmLimpo = cleanText(nomeFarmacia);
              const cnpjLimpo = cleanText(cnpj).replace(/\D/g, '');
              const termoFarmNum = termoFarm.replace(/\D/g, '');

              if (nomeFarmLimpo.includes(termoFarm) || (termoFarmNum && cnpjLimpo.includes(termoFarmNum))) {
                  encontrou = true;
              }
          }

          if (encontrou) {
              resultadosFiltrados.push({
                  id: cnpj + Math.random(),
                  farmacia: nomeFarmacia,
                  cnpj: cnpj,
                  cidadeUf: cidadeUf,
                  vendedor: vendedor,
                  ultima_compra: ultimaCompra,
                  status: status,
                  raw_data: cliente // Guarda o objeto original completo para o Dossiê
              });
          }
      });

      setResultados(resultadosFiltrados);
    } catch (e) {
      console.error("Erro BI:", e);
      alert("Falha na conexão com o Data Lake. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 55, 43); 
    doc.text("RELATÓRIO EXECUTIVO DE INTELIGÊNCIA", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const textoFiltro = tipoBusca === 'produto' ? `Ativos Analisados: ${ativosSelecionados.join(', ')}` : `Farmácia Alvo: ${termoFarmacia}`;
    doc.text(`Filtro: ${textoFiltro} | Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 26);

    const tableBody = resultados.map(r => [ r.farmacia, r.cnpj, r.cidadeUf, r.vendedor, r.ultima_compra, r.status ]);

    autoTable(doc, {
        startY: 35,
        head: [['FARMÁCIA', 'CNPJ', 'LOCALIZAÇÃO', 'ACCOUNT EXEC.', 'ÚLT. TRANSAÇÃO', 'STATUS']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [15, 55, 43], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4 },
    });

    doc.save(`BI_YellowLeaf_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Renderiza as informações extras ignorando campos básicos já mostrados no cabeçalho
  const renderDossierExtraData = (rawData: any) => {
      const chavesIgnoradas = ['nome', 'fantasia', 'razao_social', 'cnpj', 'documento', 'cidade', 'municipio', 'uf', 'estado', 'vendedor', 'representante', 'id'];
      
      const extras = Object.entries(rawData).filter(([key, value]) => {
          if (!value || value === '') return false; // Ignora vazios
          const keyLimpa = cleanText(key);
          if (chavesIgnoradas.some(ign => keyLimpa.includes(ign))) return false; // Ignora básicos
          return true;
      });

      if (extras.length === 0) return <p className="text-slate-400 text-sm italic">Nenhum dado transacional adicional encontrado no ERP para esta conta.</p>;

      return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {extras.map(([key, value]: any, i) => {
                  const isValor = cleanText(key).includes('valor') || cleanText(key).includes('preco') || cleanText(key).includes('faturamento');
                  const isData = cleanText(key).includes('data');
                  const isHistorico = cleanText(key).includes('historico') || cleanText(key).includes('obs') || cleanText(key).includes('produto') || cleanText(key).includes('compra');
                  
                  let formattedValue = "";

                  // Tratamento para Objetos e Arrays
                  if (typeof value === 'object' && value !== null) {
                      try {
                          if (Array.isArray(value)) {
                              // Se for array (ex: lista de produtos), formata com bullets
                              formattedValue = value.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join('\n• ');
                              if (formattedValue) formattedValue = '• ' + formattedValue;
                          } else {
                              // Se for objeto, formata como string legível
                              formattedValue = JSON.stringify(value, null, 2);
                          }
                      } catch (e) {
                          formattedValue = String(value);
                      }
                  } else {
                      formattedValue = String(value);
                  }

                  if (isValor && !isNaN(Number(value))) {
                      formattedValue = formatCurrency(value);
                  } else if (isData && typeof value === 'string' && value.includes('T')) {
                      formattedValue = new Date(value).toLocaleDateString('pt-BR');
                  }

                  return (
                      <div key={i} className={`bg-slate-50 p-4 rounded-xl border border-slate-200 ${isHistorico ? 'md:col-span-2' : ''}`}>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{key.replace(/_/g, ' ')}</p>
                          <div className={`text-sm text-slate-800 ${isValor ? 'font-black text-blue-700 text-lg' : 'font-medium'} ${isHistorico ? 'whitespace-pre-wrap leading-relaxed' : 'truncate'}`}>
                              {formattedValue}
                          </div>
                      </div>
                  );
              })}
          </div>
      );
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER CORPORATIVO */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
           <div>
             <h1 className="text-3xl font-black text-[#0f392b] tracking-tight flex items-center gap-3">
                <BarChart3 className="text-[#82D14D]" size={32} /> Market Intelligence Unit
             </h1>
             <p className="text-slate-500 mt-1 font-medium">Extração profunda de dados do ERP para direcionamento estratégico.</p>
           </div>
        </div>

        {/* MOTOR DE BUSCA AVANÇADO */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 mb-8 relative z-20">
            <div className="flex flex-col md:flex-row gap-6">
                
                {/* Toggles de Tipo */}
                <div className="flex flex-col gap-2 shrink-0 md:w-48 border-r border-slate-100 pr-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Módulo de Pesquisa</p>
                    <button onClick={() => {setTipoBusca('produto'); setResultados([]); setBuscou(false);}} className={`px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 w-full ${tipoBusca === 'produto' ? 'bg-[#0f392b] text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                        <Beaker size={16}/> Por Ativo
                    </button>
                    <button onClick={() => {setTipoBusca('farmacia'); setResultados([]); setBuscou(false);}} className={`px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 w-full ${tipoBusca === 'farmacia' ? 'bg-[#0f392b] text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                        <Building2 size={16}/> Por Conta (CNPJ)
                    </button>
                </div>

                {/* Input Area */}
                <div className="flex-1 flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                        {tipoBusca === 'produto' ? 'Selecione os ativos para cruzamento (Deep Search)' : 'Identificação da conta no Data Lake'}
                    </p>
                    
                    {tipoBusca === 'produto' ? (
                        <div className="relative">
                            <div className="min-h-[56px] w-full bg-slate-50 border-2 border-slate-200 hover:border-blue-400 focus-within:border-blue-500 rounded-2xl p-2 flex flex-wrap gap-2 items-center cursor-text transition" onClick={() => setDropdownAberto(true)}>
                                {ativosSelecionados.length === 0 && !termoProdutoDropdown && (
                                    <span className="text-slate-400 font-medium px-2 absolute pointer-events-none">Ex: Lipoartich, Anidream®...</span>
                                )}
                                {ativosSelecionados.map(ativo => (
                                    <span key={ativo} className="bg-[#82D14D]/20 text-[#0f392b] border border-[#82D14D]/50 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 z-10">
                                        {ativo} <button onClick={(e) => { e.stopPropagation(); toggleAtivo(ativo); }} className="hover:bg-[#82D14D]/50 rounded-full p-0.5"><X size={14}/></button>
                                    </span>
                                ))}
                                <input type="text" className="flex-1 bg-transparent outline-none min-w-[150px] p-2 text-slate-800 font-bold" value={termoProdutoDropdown} onChange={(e) => {setTermoProdutoDropdown(e.target.value); setDropdownAberto(true);}} onFocus={() => setDropdownAberto(true)} />
                                <ChevronDown size={20} className="text-slate-400 mr-2"/>
                            </div>
                            {dropdownAberto && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setDropdownAberto(false)}></div>
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-72 overflow-y-auto z-40 p-2 custom-scrollbar">
                                        {produtosApi.filter(p => p.toLowerCase().includes(termoProdutoDropdown.toLowerCase())).map(produto => (
                                            <button key={produto} onClick={() => toggleAtivo(produto)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between text-sm font-bold text-slate-700">
                                                {produto} {ativosSelecionados.includes(produto) && <Check size={16} className="text-[#82D14D]"/>}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="relative flex items-center">
                            <input type="text" placeholder="Razão Social, Nome Fantasia ou CNPJ..." className="w-full pl-6 pr-4 py-4 bg-slate-50 border-2 border-slate-200 focus:border-blue-500 rounded-2xl outline-none text-lg font-bold text-slate-800 transition" value={termoFarmacia} onChange={(e) => setTermoFarmacia(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && realizarBusca()} />
                        </div>
                    )}
                </div>

                {/* Botão */}
                <div className="flex flex-col justify-end shrink-0">
                    <button onClick={realizarBusca} disabled={loading} className="h-[56px] w-full md:w-40 bg-[#0f392b] hover:bg-[#16503c] text-white rounded-2xl font-black shadow-lg transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wide text-xs">
                        {loading ? <Activity className="animate-spin" size={20}/> : <Search size={20}/>} {loading ? 'Buscando' : 'Executar'}
                    </button>
                </div>
            </div>
        </div>

        {/* ÁREA DE RESULTADOS (DATA GRID) */}
        {buscou && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4 px-2">
                    <div>
                        <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                            <Target className="text-blue-600"/> Contas Identificadas
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">O motor extraiu <strong className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{resultados.length}</strong> registros qualificados.</p>
                    </div>
                    {resultados.length > 0 && (
                        <button onClick={exportarPDF} className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition flex items-center gap-2 shadow-sm shrink-0">
                            <Download size={16}/> Relatório Executivo (PDF)
                        </button>
                    )}
                </div>

                {resultados.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm">
                        <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6"><Search size={40}/></div>
                        <h4 className="text-xl font-bold text-slate-700">Database Miss</h4>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">Não encontramos transações ou históricos que correspondam a este filtro no Data Lake atual.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="p-5">Conta / Fantasia</th>
                                        <th className="p-5">Localização</th>
                                        <th className="p-5">Account Exec.</th>
                                        <th className="p-5">Última Transação</th>
                                        <th className="p-5 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {resultados.map((res, i) => (
                                        <tr key={i} className="hover:bg-blue-50/30 transition group">
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center shrink-0 font-bold"><Building2 size={18}/></div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{res.farmacia}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{res.cnpj}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5 text-xs font-medium text-slate-600"><span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400"/> {res.cidadeUf}</span></td>
                                            <td className="p-5 text-xs font-medium text-slate-600"><span className="flex items-center gap-1.5"><User size={14} className="text-slate-400"/> {res.vendedor}</span></td>
                                            <td className="p-5 text-xs font-medium text-slate-600"><span className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400"/> {res.ultima_compra}</span></td>
                                            <td className="p-5 text-right">
                                                <button onClick={() => setDossieAtivo(res)} className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-600 hover:text-white transition flex items-center gap-2 ml-auto shadow-sm">
                                                    <Maximize2 size={14}/> Abrir Dossiê
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- MODAL: DOSSIÊ CORPORATIVO (RAIO-X DO CLIENTE) --- */}
        {dossieAtivo && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95">
                    
                    {/* CABEÇALHO DO MODAL */}
                    <div className="bg-[#0f392b] p-8 flex justify-between items-start text-white shrink-0 relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 text-white/5 transform rotate-12"><Building2 size={200}/></div>
                        <div className="relative z-10 w-full">
                            <div className="flex justify-between items-center w-full mb-4">
                                <span className="bg-[#82D14D] text-[#0f392b] px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg"><Briefcase size={12}/> Dossiê de Inteligência</span>
                                <button onClick={() => setDossieAtivo(null)} className="hover:bg-white/20 p-2 rounded-full transition bg-black/20 text-white"><X size={20}/></button>
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tight mb-2 pr-12">{dossieAtivo.farmacia}</h2>
                            <div className="flex gap-6 text-sm font-medium text-slate-300">
                                <span className="flex items-center gap-2"><Hash size={16}/> {dossieAtivo.cnpj}</span>
                                <span className="flex items-center gap-2"><MapPin size={16}/> {dossieAtivo.cidadeUf}</span>
                            </div>
                        </div>
                    </div>

                    {/* CORPO DO DOSSIÊ (SCROLL) */}
                    <div className="p-8 overflow-y-auto flex-1 bg-slate-50 custom-scrollbar space-y-8">
                        
                        {/* Resumo Rápido */}
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-200 pb-2"><User size={16}/> Gestão da Conta</h3>
                            <div className="flex gap-4">
                                <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 flex-1 shadow-sm">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Account Executive (Vendedor)</p>
                                    <p className="text-lg font-black text-slate-800">{dossieAtivo.vendedor}</p>
                                </div>
                                <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 flex-1 shadow-sm">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Última Transação Registrada</p>
                                    <p className="text-lg font-black text-slate-800">{dossieAtivo.ultima_compra}</p>
                                </div>
                                <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 flex-1 shadow-sm">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Status ERP</p>
                                    <p className={`text-lg font-black ${dossieAtivo.status === 'Ativo' ? 'text-green-600' : 'text-red-600'}`}>{dossieAtivo.status}</p>
                                </div>
                            </div>
                        </div>

                        {/* Extração Profunda de Dados */}
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-200 pb-2"><TrendingUp size={16}/> Detalhamento de Transações e Histórico</h3>
                            {renderDossierExtraData(dossieAtivo.raw_data)}
                        </div>

                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}