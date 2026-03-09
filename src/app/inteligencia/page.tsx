"use client";

import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, Search, Download, Building2, Beaker, Calendar, 
  MapPin, Target, Activity, FileText, User, X, ChevronDown, Check,
  Briefcase, TrendingUp, BarChart3, Hash, ShoppingBag, Map
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
      if (!val) return 'R$ 0,00';
      let num = typeof val === 'string' ? parseFloat(val.replace(/\./g, '').replace(',', '.')) : val;
      if (isNaN(num)) return val;
      return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Formata a data (Ex: 2025-09-01 para 09/2025 ou 01/09/2025)
  const formatDate = (val: any) => {
      if (!val) return '-';
      if (typeof val === 'string' && val.includes('-')) {
          const parts = val.split('-');
          if (parts.length === 3) return `${parts[1]}/${parts[0]}`; // Retorna MM/YYYY igual ao seu print
      }
      return val;
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
          const cidadeUf = `${clienteLimpo.municipio || clienteLimpo.cidade || '-'} - ${clienteLimpo.uf || clienteLimpo.estado || '-'}`;
          const ultimaCompra = clienteLimpo.ultima_compra || clienteLimpo.data_ultima_compra || clienteLimpo.data || '-';
          const endereco = clienteLimpo.endereco || clienteLimpo.logradouro || 'Endereço não cadastrado';

          // Extrair o array de histórico de compras
          let historicoArray: any[] = [];
          const chavesHistorico = ['historico_compras', 'produtos', 'compras', 'historico'];
          
          for (const key of Object.keys(clienteLimpo)) {
              if (chavesHistorico.some(k => key.includes(k))) {
                  let val = clienteLimpo[key];
                  if (typeof val === 'string') {
                      try { val = JSON.parse(val); } catch (e) {} // Tenta converter a string JSON
                  }
                  if (Array.isArray(val)) {
                      historicoArray = val;
                      break;
                  }
              }
          }

          let encontrou = false;
          let historicoFiltradoParaDossie = historicoArray; // Por padrão, mostra tudo

          if (tipoBusca === 'produto') {
              // Se buscou por produto, vamos filtrar o histórico DESTA farmácia para mostrar só o que interessa
              const comprasRelevantes = historicoArray.filter((compra: any) => {
                  const nomeProdutoCompra = cleanText(compra.produto || '');
                  return ativosSelecionados.some(ativo => nomeProdutoCompra.includes(cleanText(ativo)));
              });

              if (comprasRelevantes.length > 0) {
                  encontrou = true;
                  historicoFiltradoParaDossie = comprasRelevantes; // O Dossiê vai mostrar SÓ essas compras
              }
          } else {
              // Busca por Farmácia
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
                  endereco: endereco,
                  ultima_compra: ultimaCompra,
                  status: clienteLimpo.bloqueado ? 'Bloqueado' : 'Ativo',
                  historico_tabela: historicoFiltradoParaDossie // Passa o histórico pronto para a tabela do modal
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
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">Não encontramos transações para os filtros selecionados no Data Lake atual.</p>
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
                <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95">
                    
                    {/* CABEÇALHO DO MODAL (Estilo Corporate) */}
                    <div className="bg-[#1e293b] p-6 flex justify-between items-start text-white shrink-0 relative overflow-hidden rounded-t-[2rem]">
                        <div className="relative z-10 w-full">
                            <div className="flex justify-between items-start w-full">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center font-bold text-xl backdrop-blur-sm">
                                        {dossieAtivo.farmacia.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tight leading-none mb-1">{dossieAtivo.farmacia}</h2>
                                        <p className="text-xs font-medium text-slate-400 font-mono tracking-wider">{dossieAtivo.cnpj}</p>
                                    </div>
                                </div>
                                <button onClick={() => setDossieAtivo(null)} className="hover:bg-white/20 p-2 rounded-full transition bg-white/10 text-white"><X size={20}/></button>
                            </div>
                        </div>
                    </div>

                    {/* CORPO DO DOSSIÊ */}
                    <div className="p-6 overflow-y-auto flex-1 bg-slate-50 custom-scrollbar space-y-6">
                        
                        {/* Cards Superiores (Resumo) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><User size={12}/> Representante</p>
                                <p className="text-sm font-black text-blue-700 uppercase">{dossieAtivo.vendedor}</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={12}/> Localização</p>
                                <p className="text-sm font-black text-slate-800 uppercase">{dossieAtivo.cidadeUf}</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={12}/> Última Compra</p>
                                <p className="text-sm font-black text-slate-800">{dossieAtivo.ultima_compra}</p>
                            </div>
                        </div>

                        {/* Endereço (Se houver) */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Map size={16}/></div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Endereço de Entrega</p>
                                <p className="text-sm font-bold text-slate-700 uppercase">{dossieAtivo.endereco}</p>
                            </div>
                        </div>

                        {/* TABELA DE HISTÓRICO DE PEDIDOS */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <ShoppingBag className="text-green-600" size={20}/>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                                    {tipoBusca === 'produto' ? 'Transações Encontradas (Filtro Ativo)' : 'Histórico de Pedidos'}
                                </h3>
                                <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full">{dossieAtivo.historico_tabela.length}</span>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto max-h-[350px] custom-scrollbar">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                                                <th className="p-4">Data</th>
                                                <th className="p-4">Produto / Insumo</th>
                                                <th className="p-4 text-center">Qtd</th>
                                                <th className="p-4 text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {dossieAtivo.historico_tabela.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-slate-400 text-xs font-medium">
                                                        Nenhuma transação formatada encontrada para exibição.
                                                    </td>
                                                </tr>
                                            ) : (
                                                dossieAtivo.historico_tabela.map((item: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50 transition">
                                                        <td className="p-4 text-slate-500 font-medium">
                                                            {formatDate(item.data || item.data_compra)}
                                                        </td>
                                                        <td className="p-4 font-black text-slate-800 uppercase">
                                                            {item.produto || item.insumo || item.ativo || '-'}
                                                        </td>
                                                        <td className="p-4 text-center font-bold text-slate-600">
                                                            {item.qtd || item.quantidade || '1'}
                                                        </td>
                                                        <td className="p-4 text-right font-black text-green-700">
                                                            {formatCurrency(item.valor || item.preco)}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}