"use client";

import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, Search, Download, Building2, Beaker, Calendar, 
  MapPin, Target, Activity, FileText, User, X, ChevronDown, Check
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Reutilizando as URLs do seu Pipeline
const API_CLIENTES_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";
const API_PRODUTOS_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

export default function InteligenciaPage() {
  const [loading, setLoading] = useState(false);
  const [tipoBusca, setTipoBusca] = useState<'produto' | 'farmacia'>('produto');
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscou, setBuscou] = useState(false);

  // --- ESTADOS PARA BUSCA DE PRODUTOS ---
  const [produtosApi, setProdutosApi] = useState<string[]>([]);
  const [ativosSelecionados, setAtivosSelecionados] = useState<string[]>([]);
  const [termoProdutoDropdown, setTermoProdutoDropdown] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState(false);

  // --- ESTADOS PARA BUSCA DE FARMÁCIA ---
  const [termoFarmacia, setTermoFarmacia] = useState("");

  useEffect(() => {
    carregarListaProdutos();
  }, []);

  const carregarListaProdutos = async () => {
    try {
        const res = await fetch(`${API_PRODUTOS_URL}?path=produtos`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            const listaNomes = json.data.map((p: any) => p.ativo?.trim()).filter(Boolean);
            // Remove duplicatas e ordena
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

  // Simulação de busca na base
  const realizarBusca = async () => {
    if (tipoBusca === 'produto' && ativosSelecionados.length === 0) return alert("Selecione pelo menos um ativo.");
    if (tipoBusca === 'farmacia' && !termoFarmacia.trim()) return alert("Digite o nome ou CNPJ da farmácia.");
    
    setLoading(true);
    setBuscou(true);
    setDropdownAberto(false);

    try {
      // Puxa os dados do ERP (Google Sheets)
      const res = await fetch(`${API_CLIENTES_URL}?path=clientes`);
      const json = await res.json();
      
      let baseDados = [];
      if (json.success && Array.isArray(json.data)) {
          baseDados = json.data;
      }

      const resultadosFiltrados: any[] = [];

      baseDados.forEach((cliente: any) => {
          // Mapeamento robusto dos dados principais
          const nomeFarmacia = cliente.fantasia || cliente.nome_fantasia || cliente.razao_social || cliente.cliente || 'FARMÁCIA NÃO IDENTIFICADA';
          const cnpj = cliente.cnpj || cliente.documento || 'CNPJ N/D';
          const vendedor = cliente.vendedor || cliente.representante || cliente.consultor || 'Vendedor Não Atribuído';
          const cidadeUf = `${cliente.municipio || cliente.cidade || '-'} / ${cliente.uf || '-'}`;
          const ultimaCompra = cliente.ultima_compra || cliente.data_ultima_compra || 'Sem registro de data';
          const status = cliente.bloqueado ? 'Bloqueado' : 'Ativo';

          // Converte o objeto do cliente inteiro em uma string para busca profunda
          const textoClienteCompleto = JSON.stringify(cliente).toLowerCase();

          if (tipoBusca === 'produto') {
              let encontrouAlgum = false;
              let detalhesCapturados: string[] = [];

              ativosSelecionados.forEach(ativo => {
                  if (textoClienteCompleto.includes(ativo.toLowerCase())) {
                      encontrouAlgum = true;
                      
                      // Faz uma varredura nas chaves do cliente para ver exatamente ONDE o ativo foi mencionado
                      Object.entries(cliente).forEach(([chave, valor]) => {
                          const valorStr = String(valor).toLowerCase();
                          // Evita pegar nas chaves básicas se por acaso o nome da farmácia tiver o nome do ativo
                          if (valorStr.includes(ativo.toLowerCase()) && !['fantasia', 'nome_fantasia', 'razao_social'].includes(chave.toLowerCase())) {
                              detalhesCapturados.push(`${chave.replace(/_/g, ' ').toUpperCase()}: ${valor}`);
                          }
                      });
                  }
              });

              if (encontrouAlgum) {
                  resultadosFiltrados.push({
                      id: cnpj + Math.random(),
                      farmacia: nomeFarmacia,
                      cnpj: cnpj,
                      cidadeUf: cidadeUf,
                      vendedor: vendedor,
                      // Remove duplicatas dos detalhes capturados
                      detalhe: detalhesCapturados.length > 0 ? Array.from(new Set(detalhesCapturados)).join(' | ') : 'Encontrado no histórico oculto',
                      ultima_compra: ultimaCompra,
                      status: status
                  });
              }
          } else {
              // Busca por Farmácia
              const termoFarm = termoFarmacia.toLowerCase().trim();
              if (nomeFarmacia.toLowerCase().includes(termoFarm) || cnpj.replace(/\D/g, '').includes(termoFarm.replace(/\D/g, ''))) {
                  
                  // Tenta capturar tudo que pareça um produto ou histórico
                  let historico = cliente.produtos || cliente.historico || cliente.compras || 'Nenhum detalhe de produto especificado na planilha.';
                  
                  resultadosFiltrados.push({
                      id: cnpj + Math.random(),
                      farmacia: nomeFarmacia,
                      cnpj: cnpj,
                      cidadeUf: cidadeUf,
                      vendedor: vendedor,
                      detalhe: historico,
                      ultima_compra: ultimaCompra,
                      status: status
                  });
              }
          }
      });

      setResultados(resultadosFiltrados);
    } catch (e) {
      console.error("Erro ao buscar inteligência:", e);
      alert("Falha ao cruzar os dados com o ERP. Verifique a conexão.");
    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Paisagem para caber mais dados
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(20, 83, 45); 
    doc.text("RELATÓRIO DE INTELIGÊNCIA P&D", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const textoFiltro = tipoBusca === 'produto' ? `Ativos: ${ativosSelecionados.join(', ')}` : `Farmácia: ${termoFarmacia}`;
    doc.text(`Filtro Pesquisado: ${textoFiltro}`, 14, 26);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 32);

    const tableBody = resultados.map(r => [
        r.farmacia,
        r.cnpj,
        r.cidadeUf,
        r.vendedor,
        r.ultima_compra,
        r.detalhe.substring(0, 80) + (r.detalhe.length > 80 ? '...' : '') // Limita o texto
    ]);

    autoTable(doc, {
        startY: 40,
        head: [['FARMÁCIA', 'CNPJ', 'LOCAL', 'VENDEDOR', 'ÚLT. COMPRA', 'DETALHES ENCONTRADOS']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [20, 83, 45], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 5: { cellWidth: 80 } }
    });

    const nomeArquivo = tipoBusca === 'produto' ? 'Ativos' : 'Farmacia';
    doc.save(`Inteligencia_${nomeArquivo}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-10 text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm transform rotate-3">
                <Lightbulb size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inteligência de Mercado</h1>
            <p className="text-slate-500 mt-2 max-w-2xl mx-auto">Cruze dados do ERP para descobrir o histórico de compras de ativos. Use isso para direcionar sua visitação médica com precisão cirúrgica.</p>
        </div>

        {/* MOTOR DE BUSCA */}
        <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100 mb-8 relative z-20">
            
            <div className="flex gap-2 mb-4 border-b border-slate-100 pb-4">
                <button 
                    onClick={() => {setTipoBusca('produto'); setResultados([]); setBuscou(false);}}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${tipoBusca === 'produto' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                    <Beaker size={16}/> Buscar por Ativos
                </button>
                <button 
                    onClick={() => {setTipoBusca('farmacia'); setResultados([]); setBuscou(false);}}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${tipoBusca === 'farmacia' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                    <Building2 size={16}/> Buscar por Farmácia
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                {tipoBusca === 'produto' ? (
                    <div className="flex-1 relative">
                        {/* INPUT FALSO QUE ABRE O DROPDOWN */}
                        <div 
                            className="min-h-[56px] w-full bg-slate-50 border-2 border-slate-200 hover:border-blue-300 rounded-2xl p-2 flex flex-wrap gap-2 items-center cursor-text transition"
                            onClick={() => setDropdownAberto(true)}
                        >
                            {ativosSelecionados.length === 0 && !termoProdutoDropdown && (
                                <span className="text-slate-400 font-medium px-2 absolute pointer-events-none">Selecione ou digite os ativos (Ex: Lipoartich)...</span>
                            )}
                            
                            {ativosSelecionados.map(ativo => (
                                <span key={ativo} className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 z-10 shadow-sm">
                                    {ativo}
                                    <button onClick={(e) => { e.stopPropagation(); toggleAtivo(ativo); }} className="hover:bg-blue-200 rounded-full p-0.5 transition">
                                        <X size={14}/>
                                    </button>
                                </span>
                            ))}

                            <input 
                                type="text"
                                className="flex-1 bg-transparent outline-none min-w-[150px] p-2 text-slate-700 font-bold"
                                value={termoProdutoDropdown}
                                onChange={(e) => {setTermoProdutoDropdown(e.target.value); setDropdownAberto(true);}}
                                onFocus={() => setDropdownAberto(true)}
                            />
                            <ChevronDown size={20} className="text-slate-400 mr-2"/>
                        </div>

                        {/* LISTA SUSPENSA DE ATIVOS */}
                        {dropdownAberto && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setDropdownAberto(false)}></div>
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-64 overflow-y-auto z-40 p-2">
                                    {produtosApi.filter(p => p.toLowerCase().includes(termoProdutoDropdown.toLowerCase())).length === 0 ? (
                                        <div className="p-4 text-center text-slate-500 text-sm">Nenhum ativo encontrado na tabela de preços.</div>
                                    ) : (
                                        produtosApi.filter(p => p.toLowerCase().includes(termoProdutoDropdown.toLowerCase())).map(produto => (
                                            <button 
                                                key={produto} 
                                                onClick={() => toggleAtivo(produto)}
                                                className="w-full text-left px-4 py-3 rounded-xl hover:bg-blue-50 transition flex items-center justify-between text-sm font-bold text-slate-700"
                                            >
                                                {produto}
                                                {ativosSelecionados.includes(produto) && <Check size={16} className="text-blue-600"/>}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 relative flex items-center">
                        <input 
                            type="text" 
                            placeholder="Digite o Nome Fantasia, Razão Social ou CNPJ..."
                            className="w-full pl-6 pr-4 py-4 bg-slate-50 border-2 border-slate-200 focus:border-blue-500 rounded-2xl outline-none text-lg font-medium text-slate-700 transition"
                            value={termoFarmacia}
                            onChange={(e) => setTermoFarmacia(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && realizarBusca()}
                        />
                    </div>
                )}

                <button 
                    onClick={realizarBusca} 
                    disabled={loading}
                    className="w-full md:w-48 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black shadow-lg shadow-blue-200 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                >
                    {loading ? <Activity className="animate-spin" size={24}/> : <Search size={24}/>}
                    {loading ? 'Cruzando...' : 'Pesquisar'}
                </button>
            </div>
        </div>

        {/* ÁREA DE RESULTADOS */}
        {buscou && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4 px-2">
                    <div>
                        <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                            <Target className="text-blue-500"/> Resultados Encontrados
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            A base ERP retornou <strong className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{resultados.length}</strong> cruzamentos de dados.
                        </p>
                    </div>
                    {resultados.length > 0 && (
                        <button onClick={exportarPDF} className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition flex items-center gap-2 shadow-sm shrink-0">
                            <Download size={16}/> Relatório em PDF
                        </button>
                    )}
                </div>

                {resultados.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm">
                        <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search size={40}/>
                        </div>
                        <h4 className="text-xl font-bold text-slate-700">Nenhum cruzamento exato</h4>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">Não encontramos histórico de compra para os filtros selecionados. Tente buscar com termos mais amplos ou verificar na planilha original.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {resultados.map((res, index) => (
                            <div key={index} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition group flex flex-col md:flex-row gap-6 items-start">
                                
                                <div className="flex items-start gap-4 flex-1 w-full">
                                    <div className="w-12 h-12 bg-slate-800 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                                        <Building2 size={24}/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className="font-black text-lg text-slate-800 uppercase tracking-tight truncate" title={res.farmacia}>{res.farmacia}</h4>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${res.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {res.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 font-mono mt-0.5 mb-3">{res.cnpj}</p>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-1.5"><MapPin size={14} className="text-blue-500"/> <span className="truncate">{res.cidadeUf}</span></div>
                                            <div className="flex items-center gap-1.5"><User size={14} className="text-purple-500"/> <span className="truncate" title={res.vendedor}>{res.vendedor}</span></div>
                                            <div className="flex items-center gap-1.5"><Calendar size={14} className="text-orange-500"/> <span>Última Compra: <b>{res.ultima_compra}</b></span></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:w-[350px] w-full shrink-0 bg-blue-50/50 border border-blue-100 rounded-xl p-4 self-stretch flex flex-col">
                                    <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                        <FileText size={12}/> Detalhe da Inteligência Encontrado
                                    </h5>
                                    <p className="text-xs text-slate-700 leading-relaxed font-medium break-words overflow-y-auto max-h-24 custom-scrollbar pr-2">
                                        {res.detalhe}
                                    </p>
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