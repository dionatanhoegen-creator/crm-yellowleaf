"use client";

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  TrendingUp, Users, Package, Search, Calendar, DollarSign, 
  Activity, Clock, ShieldCheck, Tag, BarChart3, AlertCircle, 
  ShoppingCart, Info, CheckCircle2, User, Database
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API_PRODUTOS_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";
const API_CLIENTES_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

export default function AnaliseVendasPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  
  const [visaoAtiva, setVisaoAtiva] = useState<'clientes' | 'produtos'>('produtos');
  const [busca, setBusca] = useState("");
  const [itemSelecionado, setItemSelecionado] = useState<string | null>(null);

  const [dadosClientes, setDadosClientes] = useState<any>({});
  const [dadosProdutos, setDadosProdutos] = useState<any>({});
  const [metricas, setMetricas] = useState({ crm: 0, erp: 0 });

  useEffect(() => {
    inicializarDataLake();
  }, []);

  const inicializarDataLake = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfilLogado } = await supabase.from('perfis').select('cargo, nome').eq('id', user.id).single();

      let queryVendas = supabase.from('pipeline').select('*').eq('status', 'fechado');
      if (perfilLogado && perfilLogado.cargo !== 'admin') {
          queryVendas = queryVendas.eq('user_id', user.id);
      }
      const queryPerfis = supabase.from('perfis').select('id, nome');

      const [resCRM, resPerfis, resProdutos, resClientes, resFaturamento, resVendasERP] = await Promise.all([
          queryVendas,
          queryPerfis,
          fetch(`${API_PRODUTOS_URL}?path=produtos`).then(r => r.json()).catch(() => ({success: false, data: []})),
          fetch(`${API_CLIENTES_URL}?path=clientes`).then(r => r.json()).catch(() => ({success: false, data: []})),
          fetch(`${API_CLIENTES_URL}?path=faturamento`).then(r => r.json()).catch(() => ({success: false, data: []})),
          fetch(`${API_CLIENTES_URL}?path=vendas`).then(r => r.json()).catch(() => ({success: false, data: []}))
      ]);

      const vendasCRM = resCRM.data || [];
      const perfis = resPerfis.data || [];
      const listaAPIProdutos = (resProdutos.success && Array.isArray(resProdutos.data)) ? resProdutos.data : [];
      const listaAPIClientes = (resClientes.success && Array.isArray(resClientes.data)) ? resClientes.data : [];
      
      let vendasERPExtraidas: any[] = [];
      if (resFaturamento.success && Array.isArray(resFaturamento.data) && resFaturamento.data.length > 0) {
          vendasERPExtraidas = resFaturamento.data;
      } else if (resVendasERP.success && Array.isArray(resVendasERP.data) && resVendasERP.data.length > 0) {
          vendasERPExtraidas = resVendasERP.data;
      } else {
          listaAPIClientes.forEach(cliente => {
              const historico = cliente.historico || cliente.historico_compras || cliente.vendas || cliente.compras || [];
              if (Array.isArray(historico)) {
                  historico.forEach(compra => {
                      vendasERPExtraidas.push({
                          ...compra,
                          nome_cliente_pai: cliente.fantasia || cliente.nome_fantasia || cliente.razao_social || 'Cliente ERP',
                          vendedor_pai: cliente.vendedor || cliente.consultor || 'Vendedor ERP'
                      });
                  });
              }
          });
      }

      setMetricas({ crm: vendasCRM.length, erp: vendasERPExtraidas.length });

      const mapaVendedores: any = {};
      perfis.forEach(p => mapaVendedores[p.id] = p.nome);

      construirInteligencia(vendasCRM, vendasERPExtraidas, listaAPIProdutos, listaAPIClientes, mapaVendedores);
    } catch (e) {
      console.error("Erro crítico ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  };

  const normalizeChave = (str: string) => {
      if (!str) return 'DESCONHECIDO';
      return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  };

  const parseBRNumber = (val: any) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      let str = String(val).replace(/[^\d.,-]/g, '').trim();
      if (str.includes('.') && str.includes(',')) {
          str = str.replace(/\./g, '').replace(',', '.');
      } else if (str.includes(',')) {
          str = str.replace(',', '.');
      }
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
  };

  const extractYYYYMM = (str: string) => {
      const s = String(str || '').trim();
      if (s.includes('T')) return s.substring(0, 7); 
      if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.substring(0, 7); 
      if (s.match(/^\d{2}\/\d{2}\/\d{4}/)) {
          const parts = s.substring(0,10).split('/');
          return `${parts[2]}-${parts[1]}`;
      }
      return '2000-01'; 
  };

  const getTimestamp = (str: string) => {
      const s = String(str || '').trim();
      if (s.match(/^\d{2}\/\d{2}\/\d{4}/)) {
          const parts = s.substring(0,10).split('/');
          return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`).getTime();
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  const formatDataBRSegura = (str: string) => {
      const s = String(str || '').trim();
      if (!s) return '-';
      if (s.match(/^\d{2}\/\d{2}\/\d{4}/)) return s.substring(0, 10); 
      if (s.includes('T')) return s.split('T')[0].split('-').reverse().join('/');
      if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.substring(0,10).split('-').reverse().join('/');
      return s;
  };

  const formatCurrencySafe = (val: any) => {
      const num = Number(val);
      if (isNaN(num)) return 'R$ 0,00';
      return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatKg = (val: any) => {
      const num = Number(val);
      if (isNaN(num) || num === 0) return '0';
      return num.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  };

  const construirInteligencia = (vendasCRM: any[], vendasERP: any[], listaAPIProdutos: any[], listaAPIClientes: any[], mapaVendedores: any) => {
    const mapaClientes: any = {};
    const mapaProdutos: any = {};
    const chavesProdutosOficiais: string[] = [];

    listaAPIProdutos.forEach(p => {
        if (!p.ativo) return;
        const key = normalizeChave(p.ativo);
        chavesProdutosOficiais.push(key);
        if (!mapaProdutos[key]) {
            mapaProdutos[key] = { 
                nome_original: p.ativo.trim(), 
                totalVendido: 0, quantidadeVendas: 0, historico: [], clientes: new Set(), totalKg: 0 
            };
        }
    });

    const padronizarProduto = (nomeBruto: string) => {
        if (!nomeBruto) return { key: 'DIVERSOS', nome: 'Produto Diverso' };
        const keyLimpa = normalizeChave(nomeBruto);
        const keySemPeso = keyLimpa.replace(/(1KG|5KG|10KG|500G|250G|100G)/g, '');
        for (const oficial of chavesProdutosOficiais.sort((a,b) => b.length - a.length)) {
            if (keyLimpa.includes(oficial) || keySemPeso.includes(oficial)) {
                return { key: oficial, nome: mapaProdutos[oficial].nome_original };
            }
        }
        return { key: keyLimpa, nome: nomeBruto.trim() };
    };

    listaAPIClientes.forEach(c => {
        const nomeOriginal = (c.fantasia || c.nome_fantasia || c.razao_social || '').trim();
        if (!nomeOriginal) return;
        const key = normalizeChave(nomeOriginal);
        if (!mapaClientes[key]) mapaClientes[key] = { nome_original: nomeOriginal, totalGasto: 0, quantidadeCompras: 0, historico: [], produtosComprados: new Set(), totalKg: 0, vendedor_erp: c.vendedor || '' };
    });

    const formatarHistorico = (venda: any, origem: 'CRM' | 'ERP') => {
        if (origem === 'CRM') {
            const prod = padronizarProduto(venda.produto);
            return {
                id: venda.id,
                cliente_chave: normalizeChave(venda.nome_cliente),
                cliente_nome: venda.nome_cliente || 'Cliente Avulso',
                produto_chave: prod.key,
                produto_nome: prod.nome,
                valor: parseBRNumber(venda.valor),
                data: venda.data_entrada || venda.created_at || '',
                vendedor: mapaVendedores[venda.user_id] || 'Consultor',
                kg: parseBRNumber(venda.kg_proposto),
                fonte: 'CRM'
            };
        } else {
            const prod = padronizarProduto(venda.produto || venda.ativo || venda.item);
            return {
                id: `erp-${Math.random()}`,
                cliente_chave: normalizeChave(venda.cliente || venda.razao_social || venda.fantasia || venda.nome_cliente_pai),
                cliente_nome: String(venda.cliente || venda.razao_social || venda.fantasia || venda.nome_cliente_pai || 'Cliente ERP').trim(),
                produto_chave: prod.key,
                produto_nome: prod.nome,
                valor: parseBRNumber(venda.valor || venda.total || venda.faturamento || venda.preco),
                data: String(venda.data || venda.data_venda || venda.criado_em || venda.data_faturamento || ''),
                vendedor: String(venda.vendedor || venda.representante || venda.vendedor_pai || 'Vendedor ERP').trim(),
                kg: parseBRNumber(venda.kg || venda.quantidade || venda.peso || venda.qte),
                fonte: 'ERP'
            };
        }
    };

    const todasAsVendas = [
        ...vendasERP.map(v => formatarHistorico(v, 'ERP')),
        ...vendasCRM.map(v => formatarHistorico(v, 'CRM'))
    ].sort((a, b) => getTimestamp(a.data) - getTimestamp(b.data));

    todasAsVendas.forEach(venda => {
        if (!mapaClientes[venda.cliente_chave]) {
            mapaClientes[venda.cliente_chave] = { nome_original: venda.cliente_nome, totalGasto: 0, quantidadeCompras: 0, historico: [], produtosComprados: new Set(), totalKg: 0, vendedor_erp: venda.vendedor };
        }
        
        const isRecompra = mapaClientes[venda.cliente_chave].quantidadeCompras > 0;
        mapaClientes[venda.cliente_chave].totalGasto += venda.valor;
        mapaClientes[venda.cliente_chave].totalKg += venda.kg;
        mapaClientes[venda.cliente_chave].quantidadeCompras += 1;
        mapaClientes[venda.cliente_chave].produtosComprados.add(venda.produto_nome);
        
        mapaClientes[venda.cliente_chave].historico.unshift({
            id: venda.id, data: venda.data, produto: venda.produto_nome, valor: venda.valor, vendedor: venda.vendedor, tipo: isRecompra ? 'Recompra' : 'Nova Compra', kg: venda.kg, fonte: venda.fonte
        });

        if (!mapaProdutos[venda.produto_chave]) {
            mapaProdutos[venda.produto_chave] = { nome_original: venda.produto_nome, totalVendido: 0, quantidadeVendas: 0, historico: [], clientes: new Set(), totalKg: 0 };
        }
        
        mapaProdutos[venda.produto_chave].totalVendido += venda.valor;
        mapaProdutos[venda.produto_chave].totalKg += venda.kg;
        mapaProdutos[venda.produto_chave].quantidadeVendas += 1;
        mapaProdutos[venda.produto_chave].clientes.add(venda.cliente_nome);
        
        mapaProdutos[venda.produto_chave].historico.unshift({
            id: venda.id, data: venda.data, cliente: venda.cliente_nome, valor: venda.valor, vendedor: venda.vendedor, kg: venda.kg, fonte: venda.fonte
        });
    });

    setDadosClientes(mapaClientes);
    setDadosProdutos(mapaProdutos);
  };

  const listaDados = visaoAtiva === 'clientes' ? Object.values(dadosClientes) : Object.values(dadosProdutos);
  const listaLateral = listaDados
      .filter((item: any) => String(item.nome_original).toLowerCase().includes(busca.toLowerCase()))
      .sort((a: any, b: any) => {
          const valA = a.totalGasto || a.totalVendido || 0;
          const valB = b.totalGasto || b.totalVendido || 0;
          if (valB !== valA) return valB - valA; 
          return String(a.nome_original).localeCompare(String(b.nome_original));
      })
      .slice(0, 150); 

  const detalhesItem = itemSelecionado 
      ? (visaoAtiva === 'clientes' ? dadosClientes[itemSelecionado] : dadosProdutos[itemSelecionado]) 
      : null;

  const montarDadosGrafico = (historico: any[]) => {
      const agregado: Record<string, number> = {};
      historico.forEach(h => {
          if(!h.data) return;
          const mesAno = extractYYYYMM(h.data); 
          if(!agregado[mesAno]) agregado[mesAno] = 0;
          agregado[mesAno] += h.valor;
      });
      return Object.keys(agregado).sort().map(k => {
          const parts = k.split('-'); 
          return { name: `${parts[1]}/${parts[0]}`, valor: agregado[k] };
      });
  };

  // APP-VIEW LAYOUT: Travando a altura na tela (`h-[calc(100vh-64px)]`)
  return (
    <div className="p-4 md:p-6 bg-slate-50 h-[calc(100vh-64px)] flex flex-col font-sans text-slate-800 overflow-hidden">
      <div className="max-w-[1600px] w-full mx-auto flex flex-col h-full">
        
        {/* CABEÇALHO COMPACTO */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
            <div>
                <h1 className="text-2xl font-black text-[#0f392b] tracking-tight flex items-center gap-2">
                    <TrendingUp className="text-[#82D14D]" size={24} /> Análise Profunda
                </h1>
                <p className="text-slate-500 text-xs font-medium">Unificação total do histórico: Propostas do CRM + Vendas do ERP.</p>
            </div>
            
            <div className="flex gap-2">
                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                    <Database size={14} className="text-emerald-500"/>
                    <span className="text-xs font-bold text-slate-600">ERP: <strong className="text-emerald-600">{metricas.erp}</strong></span>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                    <Activity size={14} className="text-blue-500"/>
                    <span className="text-xs font-bold text-slate-600">CRM: <strong className="text-blue-600">{metricas.crm}</strong></span>
                </div>
            </div>
        </div>

        {/* ÁREA DE CONTEÚDO PRINCIPAL DIVIDIDA */}
        <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
            
            {/* BARRA LATERAL ESQUERDA */}
            <div className="lg:w-[320px] xl:w-[380px] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0">
                <div className="p-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
                    <div className="flex bg-slate-200/70 p-1 rounded-lg mb-3">
                        <button onClick={() => { setVisaoAtiva('produtos'); setItemSelecionado(null); }} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black tracking-wide rounded-md transition ${visaoAtiva === 'produtos' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Package size={14}/> PRODUTOS
                        </button>
                        <button onClick={() => { setVisaoAtiva('clientes'); setItemSelecionado(null); }} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black tracking-wide rounded-md transition ${visaoAtiva === 'clientes' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Users size={14}/> CLIENTES
                        </button>
                    </div>

                    <div className="relative">
                        <input type="text" placeholder={`Pesquisar ${visaoAtiva}...`} value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none text-xs font-bold transition shadow-inner text-slate-700" />
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-slate-50/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-10 h-full text-slate-400">
                            <Activity className="animate-spin text-blue-500 mb-2" size={24}/>
                            <span className="text-xs font-bold animate-pulse">Sincronizando...</span>
                        </div>
                    ) : listaLateral.length === 0 ? (
                        <p className="text-center text-slate-400 text-xs font-medium p-10">Nenhum dado encontrado.</p>
                    ) : (
                        listaLateral.map((item: any) => {
                            const chave = normalizeChave(item.nome_original);
                            const isSelected = itemSelecionado === chave;
                            const valorStr = formatCurrencySafe(item.totalGasto || item.totalVendido);
                            const qtd = item.quantidadeCompras || item.quantidadeVendas;
                            const temVenda = qtd > 0;

                            return (
                                <button 
                                    key={chave}
                                    onClick={() => setItemSelecionado(chave)}
                                    className={`w-full text-left p-3 rounded-xl transition-all border mb-2 ${isSelected ? 'bg-blue-600 border-blue-700 shadow text-white' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}`}
                                >
                                    <h3 className={`font-bold truncate text-xs mb-1 ${isSelected ? 'text-white' : 'text-slate-700'}`} title={item.nome_original}>{item.nome_original}</h3>
                                    
                                    <div className="flex justify-between items-end">
                                        <div className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1 w-max ${isSelected ? 'bg-blue-700 text-blue-200' : (temVenda ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400')}`}>
                                            {temVenda ? <CheckCircle2 size={10}/> : <AlertCircle size={10}/>}
                                            {qtd} {visaoAtiva === 'clientes' ? 'Compras' : 'Vendas'}
                                        </div>
                                        <span className={`text-xs font-black ${isSelected ? 'text-white' : (temVenda ? 'text-slate-800' : 'text-slate-300')}`}>{temVenda ? valorStr : '-'}</span>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* PAINEL DIREITO (DRILL-DOWN) */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                {!detalhesItem ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-50/50">
                        <div className="w-20 h-20 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                            {visaoAtiva === 'clientes' ? <Users size={32} className="text-slate-300"/> : <Package size={32} className="text-slate-300"/>}
                        </div>
                        <h2 className="text-xl font-black text-slate-700 mb-2">Painel de Raio-X</h2>
                        <p className="text-slate-500 text-sm font-medium max-w-md">Selecione um item no menu à esquerda para visualizar o gráfico e a linha do tempo.</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full animate-in fade-in duration-200">
                        
                        {/* HEADER VERDE COMPACTO */}
                        <div className="p-5 lg:p-6 border-b border-slate-100 bg-[#0f392b] text-white shrink-0 relative overflow-hidden">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 text-white/5 transform -rotate-12 pointer-events-none">
                                {visaoAtiva === 'clientes' ? <Users size={250}/> : <Package size={250}/>}
                            </div>
                            
                            <div className="relative z-10">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className="bg-[#82D14D] text-[#0f392b] px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">
                                        Ficha do {visaoAtiva === 'clientes' ? 'Cliente' : 'Produto'}
                                    </span>
                                    {visaoAtiva === 'clientes' && detalhesItem.vendedor_erp && (
                                        <span className="bg-white/10 text-white/80 border border-white/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1">
                                            <User size={10}/> ERP: {detalhesItem.vendedor_erp}
                                        </span>
                                    )}
                                </div>

                                <h2 className="text-2xl font-black tracking-tight mb-5 leading-tight truncate" title={detalhesItem.nome_original}>{detalhesItem.nome_original}</h2>
                                
                                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                                    <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                                        <p className="text-[9px] text-white/60 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><DollarSign size={10}/> {visaoAtiva === 'clientes' ? 'LTV' : 'Receita Gerada'}</p>
                                        <p className="text-lg font-black text-white">{formatCurrencySafe(detalhesItem.totalGasto || detalhesItem.totalVendido)}</p>
                                    </div>
                                    <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                                        <p className="text-[9px] text-white/60 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Package size={10}/> Volume (KG)</p>
                                        <p className="text-lg font-black text-[#82D14D]">{formatKg(detalhesItem.totalKg)} <span className="text-xs font-medium">kg</span></p>
                                    </div>
                                    <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                                        <p className="text-[9px] text-white/60 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><ShoppingCart size={10}/> Transações</p>
                                        <p className="text-lg font-black text-white">{detalhesItem.quantidadeCompras || detalhesItem.quantidadeVendas}</p>
                                    </div>
                                    <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                                        <p className="text-[9px] text-white/60 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Activity size={10}/> Ticket Médio</p>
                                        <p className="text-lg font-black text-white">
                                            {(detalhesItem.quantidadeCompras || detalhesItem.quantidadeVendas) > 0 
                                                ? formatCurrencySafe((detalhesItem.totalGasto || detalhesItem.totalVendido) / (detalhesItem.quantidadeCompras || detalhesItem.quantidadeVendas)) 
                                                : 'R$ 0'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* GRÁFICO E TIMELINE LADO A LADO - OCUPANDO ESPAÇO RESTANTE */}
                        <div className="flex-1 bg-slate-50 p-4 lg:p-5 overflow-y-auto">
                            {detalhesItem.historico.length === 0 ? (
                                <div className="bg-white rounded-xl border border-slate-200 border-dashed p-10 text-center max-w-sm mx-auto mt-8">
                                    <Clock size={20} className="text-blue-400 mx-auto mb-3"/>
                                    <h3 className="text-sm font-bold text-slate-700 mb-1">Sem histórico</h3>
                                    <p className="text-slate-500 text-xs">Este {visaoAtiva === 'clientes' ? 'cliente' : 'produto'} não possui registros.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 h-full min-h-[300px]">
                                    
                                    {/* GRÁFICO */}
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
                                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0">
                                            <BarChart3 className="text-blue-600"/> Evolução Mensal
                                        </h3>
                                        <div className="flex-1 min-h-[200px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={montarDadosGrafico(detalhesItem.historico)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '11px', fontWeight: 'bold'}} formatter={(val: number) => [formatCurrencySafe(val), "Volume"]} />
                                                    <Bar dataKey="valor" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                                        {montarDadosGrafico(detalhesItem.historico).map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={index === montarDadosGrafico(detalhesItem.historico).length - 1 ? '#82D14D' : '#3b82f6'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* TIMELINE */}
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
                                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0">
                                            <Clock className="text-blue-600"/> Histórico
                                        </h3>
                                        <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1 relative before:absolute before:inset-0 before:ml-[15px] before:w-0.5 before:bg-slate-200">
                                            {detalhesItem.historico.map((hist: any, i: number) => (
                                                <div key={`${hist.id}-${i}`} className="relative flex items-start gap-3 group">
                                                    <div className="w-8 h-8 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow-sm flex items-center justify-center shrink-0 z-10 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                        <ShieldCheck size={12}/>
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex-1 group-hover:border-blue-200 transition-colors">
                                                        <div className="flex justify-between items-start mb-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded flex items-center gap-1 ${hist.fonte === 'ERP' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
                                                                    {hist.fonte === 'ERP' ? <Database size={8}/> : <Activity size={8}/>} {hist.fonte}
                                                                </span>
                                                                <span className="text-[9px] font-black text-slate-500 flex items-center gap-1">
                                                                    <Calendar size={10}/> {formatDataBRSegura(hist.data)}
                                                                </span>
                                                            </div>
                                                            {visaoAtiva === 'clientes' && (
                                                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${hist.tipo === 'Nova Compra' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                                                                    {hist.tipo}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="font-bold text-slate-800 text-xs mb-2">
                                                            {visaoAtiva === 'clientes' ? hist.produto : hist.cliente}
                                                        </h4>
                                                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                                                            <div className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                                <User size={10} className="text-blue-500"/> {hist.vendedor}
                                                            </div>
                                                            <div className="text-right">
                                                                {hist.kg > 0 && <span className="text-[9px] font-bold text-slate-400 mr-2">{formatKg(hist.kg)} kg</span>}
                                                                <span className="font-black text-slate-700 text-xs">{formatCurrencySafe(hist.valor)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}