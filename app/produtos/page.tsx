"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // <--- IMPORTANTE: O segredo para o modal não cortar

// URL DA API
const API_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [mounted, setMounted] = useState(false); // <--- NOVO: Para confirmar que a tela carregou

  useEffect(() => {
    setMounted(true); // Ativa o portal
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      const res = await fetch(`${API_URL}?path=produtos`);
      const json = await res.json();
      
      if (json.success && Array.isArray(json.data)) {
        setProdutos(json.data);
      } else {
        setProdutos([]);
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    } finally {
      setLoading(false);
    }
  };

  const produtosFiltrados = produtos.filter(p => {
    const nome = typeof p === 'object' ? p.ativo : p;
    return nome && nome.toLowerCase().includes(busca.toLowerCase());
  });

  const abrirDetalhes = (produto: any) => {
    if (typeof produto === 'string') {
      setProdutoSelecionado({ ativo: produto, legado: true });
    } else {
      setProdutoSelecionado(produto);
    }
  };

  const validityStatus = produtoSelecionado ? checkValidityStatus(produtoSelecionado.validade) : null;

  const headerColorClass = 
    validityStatus === 'warning' ? 'bg-orange-2000 text-orange-900 border-b border-orange-100' :
    validityStatus === 'success' ? 'bg-green-50 text-green-900 border-b border-green-100' :
    'bg-gray-50 text-gray-800 border-b border-gray-100';

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Catálogo de Ativos</h1>
            <p className="text-gray-500">Consulte estoques, margens e rendimento.</p>
          </div>
          <div className="w-full md:w-1/3 relative">
             <input 
              type="text" 
              placeholder="🔍 Buscar ativo..." 
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full p-3 pl-4 border border-gray-300 rounded-full shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-200 rounded-xl"></div>)}
          </div>
        )}

        {/* GRID DE PRODUTOS */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {produtosFiltrados.map((item, index) => {
              const isObj = typeof item === 'object';
              const nome = isObj ? item.ativo : item;
              const preco = isObj ? item.preco_grama : 0;
              const estoqueTotal = isObj ? (Number(item.estoque_100g||0) + Number(item.estoque_250g||0) + Number(item.estoque_1000g||0)) : 0;

              return (
                <div 
                  key={index} 
                  onClick={() => abrirDetalhes(item)}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-1 transition cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase">
                      Ativo
                    </div>
                    {isObj && (
                      <div className={`w-3 h-3 rounded-full ${estoqueTotal > 0 ? 'bg-green-500' : 'bg-red-500'}`} title={estoqueTotal > 0 ? 'Em Estoque' : 'Esgotado'}></div>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition truncate">{nome}</h3>
                  
                  <div className="flex justify-between items-end mt-4">
                    <div>
                      <p className="text-xs text-gray-400">Preço Sugerido</p>
                      <p className="text-xl font-bold text-gray-900">
                        {preco ? `R$ ${preco}` : '-'} <span className="text-xs font-normal text-gray-400">/g</span>
                      </p>
                    </div>
                    <button className="text-blue-600 text-sm font-bold hover:underline">Ver Detalhes →</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- MODAL DE DETALHES COM PORTAL (A CORREÇÃO ESTÁ AQUI) --- */}
        {produtoSelecionado && mounted && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Overlay Click para fechar */}
            <div className="absolute inset-0" onClick={() => setProdutoSelecionado(null)}></div>

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 relative z-10">
              
              {/* CABEÇALHO */}
               <div className={`${headerColorClass} p-6 flex justify-between items-start transition-colors duration-300`}>
                <div>
                  <h2 className="text-2xl font-bold">{produtoSelecionado.ativo}</h2>
                  <div className="mt-2">
                    {validityStatus === 'warning' && (
                      <div className="inline-flex items-center gap-2 bg-black bg-opacity-20 px-3 py-1 rounded-lg text-orange-100 text-sm font-bold animate-pulse">
                        <span>⚠️</span> Atenção: Validade inferior a 1 ano ({produtoSelecionado.validade})
                      </div>
                    )}
                    {validityStatus === 'success' && (
                      <div className="inline-flex items-center gap-2 bg-black bg-opacity-20 px-3 py-1 rounded-lg text-green-100 text-sm font-bold">
                        <span>🎉</span> Validade boa hein! Bora vender!! ({produtoSelecionado.validade})
                      </div>
                    )}
                    {validityStatus === null && (
                      <p className="text-gray-300 text-sm opacity-80">Validade: {produtoSelecionado.validade || 'N/A'}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setProdutoSelecionado(null)} className="text-gray-400 hover:text-white text-2xl bg-white/10 rounded-full w-8 h-8 flex items-center justify-center transition">✕</button>
              </div>

              {/* CORPO */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                
                {/* PREÇOS */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                    <p className="text-green-800 text-sm font-bold uppercase mb-1">Preço</p>
                    <p className="text-3xl font-bold text-green-700"> {produtoSelecionado.preco_grama || '-'} g</p>
                    <p className="text-xs text-green-600 mt-1">Sugerido para venda</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-orange-200 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-bl">MÍNIMO</div>
                    <p className="text-orange-800 text-sm font-bold uppercase mb-1">Valor de Negociação</p>
                    <p className="text-3xl font-bold text-orange-700"> {produtoSelecionado.preco_grama_minimo || '-'} g</p>
                    <p className="text-xs text-orange-600 mt-1">Limite para desconto</p>
                  </div>
                </div>

                <hr className="border-gray-100 mb-6" />

                {/* ESTOQUE COM RENDIMENTO */}
                <h3 className="text-gray-800 font-bold mb-4 flex items-center gap-2">
                  📦 Fracionamentos Disponíveis
                </h3>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <EstoqueCard 
                    label="100g" 
                    qtd={produtoSelecionado.estoque_100g} 
                    rendimento={produtoSelecionado.rendimento_100g}
                  />
                  <EstoqueCard 
                    label="250g" 
                    qtd={produtoSelecionado.estoque_250g} 
                    rendimento={produtoSelecionado.rendimento_250g}
                  />
                  <EstoqueCard 
                    label="1kg (1000g)" 
                    qtd={produtoSelecionado.estoque_1000g} 
                    rendimento={produtoSelecionado.rendimento_1000g}
                    destaque={true} 
                  />
                </div>

                {/* TÉCNICO */}
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 border border-gray-100">
                  <p><strong>💊 Dosagem Usual:</strong> {produtoSelecionado.dosagem_usual || 'Não informado'}</p>
                  <p className="mt-1">
                    <strong>⚖️ Peso Fórmula:</strong> {produtoSelecionado.peso_formula || '-'} g
                  </p>
                </div>

              </div>

              <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end">
                <button onClick={() => setProdutoSelecionado(null)} className="bg-gray-800 hover:bg-black text-white px-6 py-2 rounded-lg font-bold transition shadow-lg">
                  Fechar X
                </button>
              </div>

            </div>
          </div>,
          document.body // O PULO DO GATO: Renderiza fora do layout principal
        )}
      </div>
    </div>
  );
}

// --- FUNÇÕES AUXILIARES MANTIDAS IGUAIS ---

function EstoqueCard({ label, qtd, rendimento, destaque = false }: { label: string, qtd: any, rendimento?: any, destaque?: boolean }) {
  const temEstoque = Number(qtd) > 0;
  
  return (
    <div className={`p-3 rounded-lg border text-center transition flex flex-col justify-between h-full ${
      temEstoque ? (destaque ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200') : 'bg-gray-100 border-gray-200 opacity-60'
    }`}>
      <div>
        <p className="text-xs text-gray-500 uppercase font-bold mb-1">{label}</p>
        {temEstoque ? (
          <p className={`text-xl font-bold ${destaque ? 'text-blue-700' : 'text-gray-800'}`}>{qtd} un</p>
        ) : (
          <p className="text-sm font-bold text-red-400">Esgotado</p>
        )}
      </div>
      
      {/* Exibição do Rendimento */}
      {temEstoque && rendimento > 0 && (
        <div className={`mt-2 pt-2 border-t text-[10px] font-bold ${destaque ? 'border-blue-200 text-blue-800' : 'border-gray-100 text-gray-600'}`}>
          Rende ±{Math.floor(Number(rendimento))} fórmulas
        </div>
      )}
    </div>
  );
}

function checkValidityStatus(validityStr: string | undefined): 'warning' | 'success' | null {
  if (!validityStr || !validityStr.includes('/')) return null;
  try {
    const parts = validityStr.split('/');
    const mes = parseInt(parts[0], 10);
    const ano = parseInt(parts[1], 10);
    const dataValidade = new Date(ano, mes - 1, 1);
    const hoje = new Date();
    const umAnoFuturo = new Date(hoje);
    umAnoFuturo.setFullYear(hoje.getFullYear() + 1);
    if (dataValidade < umAnoFuturo) return 'warning'; 
    else return 'success';
  } catch (e) { return null; }
}