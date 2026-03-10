"use client";

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  TrendingUp, Users, Package, Search, Calendar, DollarSign, 
  ArrowRight, Activity, Clock, ShieldCheck, Tag, Filter, BarChart3, AlertCircle, ShoppingCart
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

  useEffect(() => {
    inicializarDataLake();
  }, []);

  const inicializarDataLake = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase.from('pipeline').select('*, perfis(nome)').eq('status', 'fechado').order('created_at', { ascending: true });
      const [resCRM, resProdutos, resClientes] = await Promise.all([
          query,
          fetch(`${API_PRODUTOS_URL}?path=produtos`).then(r => r.json()),
          fetch(`${API_CLIENTES_URL}?path=clientes`).then(r => r.json())
      ]);

      const vendasCRM = resCRM.data || [];
      const listaAPIProdutos = (resProdutos.success && Array.isArray(resProdutos.data)) ? resProdutos.data : [];
      const listaAPIClientes = (resClientes.success && Array.isArray(resClientes.data)) ? resClientes.data : [];

      construirInteligencia(vendasCRM, listaAPIProdutos, listaAPIClientes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const construirInteligencia = (vendasCRM: any[], listaAPIProdutos: any[], listaAPIClientes: any[]) => {
    const mapaClientes: any = {};
    const mapaProdutos: any = {};

    // 1. Injeta TODOS os produtos da API no mapa (Para a lista nunca ficar vazia)
    listaAPIProdutos.forEach(p => {
        if (!p.ativo) return;
        const nome = p.ativo.trim();
        const key = nome.toUpperCase();
        if (!mapaProdutos[key]) {
            mapaProdutos[key] = {
                nome_original: nome,
                totalVendido: 0,
                quantidadeVendas: 0,
                historico: [],
                clientes: new Set(),
                preco_base: p.preco_grama || 0
            };
        }
    });

    // 2. Injeta TODOS os clientes da API no mapa
    listaAPIClientes.forEach(c => {
        const nome = (c.fantasia || c.nome_fantasia || c.razao_social || '').trim();
        if (!nome) return;
        const key = nome.toUpperCase();
        if (!mapaClientes[key]) {
            mapaClientes[key] = {
                nome_original: nome,
                totalGasto: 0,
                quantidadeCompras: 0,
                historico: [],
                produtosComprados: new Set(),
                cidade: c.cidade || '',
                uf: c.uf || '',
                vendedor_erp: c.vendedor || c.consultor || ''
            };
        }
    });

    // 3. Sobrepõe as vendas do CRM (Gera o histórico de Timeline e Drill-down)
    vendasCRM.forEach(venda => {
        const cKey = (venda.nome_cliente || 'Desconhecido').trim().toUpperCase();
        const pKey = (venda.produto || 'Sem Produto').trim().toUpperCase();
        const valor = Number(venda.valor) || 0;
        const dataVenda = venda.data_entrada || venda.created_at;
        const vendedor = venda.perfis?.nome || 'Sistema';

        // Atualiza Cliente
        if (!mapaClientes[cKey]) mapaClientes[cKey] = { nome_original: venda.nome_cliente, totalGasto: 0, quantidadeCompras: 0, historico: [], produtosComprados: new Set() };
        
        const isRecompra = mapaClientes[cKey].quantidadeCompras > 0;
        mapaClientes[cKey].totalGasto += valor;
        mapaClientes[cKey].quantidadeCompras += 1;
        mapaClientes[cKey].produtosComprados.add(venda.produto);
        mapaClientes[cKey].historico.unshift({
            id: venda.id, data: dataVenda, produto: venda.produto, valor: valor, vendedor: vendedor, tipo: isRecompra ? 'Recompra' : 'Nova Compra', kg: venda.kg_proposto
        });

        // Atualiza Produto
        if (!mapaProdutos[pKey]) mapaProdutos[pKey] = { nome_original: venda.produto, totalVendido: 0, quantidadeVendas: 0, historico: [], clientes: new Set() };
        
        mapaProdutos[pKey].totalVendido += valor;
        mapaProdutos[pKey].quantidadeVendas += 1;
        mapaProdutos[pKey].clientes.add(venda.nome_cliente);
        mapaProdutos[pKey].historico.unshift({
            id: venda.id, data: dataVenda, cliente: venda.nome_cliente, valor: valor, vendedor: vendedor, kg: venda.kg_proposto
        });
    });

    setDadosClientes(mapaClientes);
    setDadosProdutos(mapaProdutos);
  };

  const formatCurrency = (val: number) => (Number(val)||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

  // Prepara as listas para a barra lateral ordenando pelos que mais venderam/compraram primeiro, depois ordem alfabética
  const listaDados = visaoAtiva === 'clientes' ? Object.values(dadosClientes) : Object.values(dadosProdutos);
  const listaLateral = listaDados
      .filter((item: any) => item.nome_original.toLowerCase().includes(busca.toLowerCase()))
      .sort((a: any, b: any) => {
          const valA = a.totalGasto || a.totalVendido || 0;
          const valB = b.totalGasto || b.totalVendido || 0;
          if (valB !== valA) return valB - valA;
          return a.nome_original.localeCompare(b.nome_original);
      })
      .slice(0, 150); // Mostra os top 150 para não travar o navegador

  const detalhesItem = itemSelecionado 
      ? (visaoAtiva === 'clientes' ? dadosClientes[itemSelecionado] : dadosProdutos[itemSelecionado]) 
      : null;

  // Monta dados do gráfico se houver histórico
  const montarDadosGrafico = (historico: any[]) => {
      const agregado: any = {};
      historico.forEach(h => {
          const mesAno = h.data.substring(0, 7); // YYYY-MM
          if(!agregado[mesAno]) agregado[mesAno] = 0;
          agregado[mesAno] += h.valor;
      });
      return Object.keys(agregado).sort().map(k => ({
          name: k.split('-').reverse().join('/'), // MM/YYYY
          valor: agregado[k]
      }));
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto">
        
        {/* CABEÇALHO */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-black text-[#0f392b] tracking-tight flex items-center gap-3">
                    <TrendingUp className="text-[#82D14D]" size={32} /> Análise Profunda de Vendas
                </h1>
                <p className="text-slate-500 mt-1 font-medium">Drill-down completo do histórico de compras do ERP integrado ao CRM.</p>
            </div>
            <div className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white text-blue-600"><Package size={14}/></div>
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-white text-emerald-600"><Users size={14}/></div>
                </div>
                <span className="text-sm font-bold text-slate-600">{Object.keys(dadosProdutos).length} Produtos mapeados</span>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)]">
            
            {/* BARRA LATERAL (LISTA) */}
            <div className="lg:w-[400px] bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0">
                <div className="p-5 border-b border-slate-100 bg-slate-50/80">
                    <div className="flex bg-slate-200/70 p-1 rounded-xl mb-4">
                        <button onClick={() => { setVisaoAtiva('produtos'); setItemSelecionado(null); }} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-black tracking-wide rounded-lg transition ${visaoAtiva === 'produtos' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Package size={16}/> PRODUTOS
                        </button>
                        <button onClick={() => { setVisaoAtiva('clientes'); setItemSelecionado(null); }} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-black tracking-wide rounded-lg transition ${visaoAtiva === 'clientes' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Users size={16}/> CLIENTES
                        </button>
                    </div>

                    <div className="relative">
                        <input type="text" placeholder={`Pesquisar ${visaoAtiva}...`} value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-bold transition shadow-inner text-slate-700" />
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-10 h-full text-slate-400">
                            <Activity className="animate-spin text-blue-500 mb-4" size={32}/>
                            <span className="text-sm font-bold animate-pulse">Sincronizando Data Lake...</span>
                        </div>
                    ) : listaLateral.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm font-medium p-10">Nenhum {visaoAtiva} encontrado.</p>
                    ) : (
                        listaLateral.map((item: any) => {
                            const chave = item.nome_original.toUpperCase();
                            const isSelected = itemSelecionado === chave;
                            const valorStr = formatCurrency(item.totalGasto || item.totalVendido);
                            const qtd = item.quantidadeCompras || item.quantidadeVendas;
                            const temVenda = qtd > 0;

                            return (
                                <button 
                                    key={chave}
                                    onClick={() => setItemSelecionado(chave)}
                                    className={`w-full text-left p-4 rounded-2xl transition-all border ${isSelected ? 'bg-blue-600 border-blue-700 shadow-lg text-white transform scale-[1.02]' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'}`}
                                >
                                    <h3 className={`font-bold truncate text-sm mb-1.5 ${isSelected ? 'text-white' : 'text-slate-700'}`} title={item.nome_original}>{item.nome_original}</h3>
                                    
                                    <div className="flex justify-between items-end">
                                        <div className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 w-max ${isSelected ? 'bg-blue-700 text-blue-200' : (temVenda ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400')}`}>
                                            {temVenda ? <CheckCircle2 size={10}/> : <AlertCircle size={10}/>}
                                            {qtd} {visaoAtiva === 'clientes' ? 'Compras' : 'Vendas'}
                                        </div>
                                        <span className={`text-sm font-black ${isSelected ? 'text-white' : (temVenda ? 'text-slate-800' : 'text-slate-300')}`}>{temVenda ? valorStr : '-'}</span>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* PAINEL PRINCIPAL (DETALHES) */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                {!detalhesItem ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-50/50">
                        <div className="w-24 h-24 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                            {visaoAtiva === 'clientes' ? <Users size={40} className="text-slate-300"/> : <Package size={40} className="text-slate-300"/>}
                        </div>
                        <h2 className="text-2xl font-black text-slate-700 mb-2">Painel de Raio-X</h2>
                        <p className="text-slate-500 font-medium max-w-md">Selecione um {visaoAtiva === 'clientes' ? 'cliente' : 'produto'} no menu à esquerda para visualizar métricas detalhadas, gráficos de crescimento e histórico de interações.</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full animate-in fade-in duration-300">
                        
                        {/* CABEÇALHO DO DETALHE */}
                        <div className="p-8 lg:p-10 border-b border-slate-100 bg-[#0f392b] text-white shrink-0 relative overflow-hidden">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 text-white/5 transform -rotate-12 pointer-events-none">
                                {visaoAtiva === 'clientes' ? <Users size={300}/> : <Package size={300}/>}
                            </div>
                            
                            <div className="relative z-10">
                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                    <span className="bg-[#82D14D] text-[#0f392b] px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm">
                                        Ficha do {visaoAtiva === 'clientes' ? 'Cliente' : 'Produto'}
                                    </span>
                                    {visaoAtiva === 'clientes' && detalhesItem.vendedor_erp && (
                                        <span className="bg-white/10 text-white/80 border border-white/20 px-3 py-1 rounded-md text-[10px] font-bold uppercase flex items-center gap-1">
                                            <User size={12}/> Carteira ERP: {detalhesItem.vendedor_erp}
                                        </span>
                                    )}
                                </div>

                                <h2 className="text-3xl lg:text-4xl font-black tracking-tight mb-8 leading-tight max-w-3xl">{detalhesItem.nome_original}</h2>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                                        <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><DollarSign size={12}/> {visaoAtiva === 'clientes' ? 'LTV (Gasto Total)' : 'Receita Gerada'}</p>
                                        <p className="text-2xl font-black text-white">{formatCurrency(detalhesItem.totalGasto || detalhesItem.totalVendido)}</p>
                                    </div>
                                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                                        <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><ShoppingCart size={12}/> {visaoAtiva === 'clientes' ? 'Nº de Compras' : 'Volume de Vendas'}</p>
                                        <p className="text-2xl font-black text-white">{detalhesItem.quantidadeCompras || detalhesItem.quantidadeVendas} <span className="text-sm text-white/50 font-medium">transações</span></p>
                                    </div>
                                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                                        <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Tag size={12}/> {visaoAtiva === 'clientes' ? 'Ativos Testados' : 'Carteira de Clientes'}</p>
                                        <p className="text-2xl font-black text-white">
                                            {visaoAtiva === 'clientes' ? detalhesItem.produtosComprados.size : detalhesItem.clientes.size} <span className="text-sm text-white/50 font-medium">únicos</span>
                                        </p>
                                    </div>
                                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                                        <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Activity size={12}/> Ticket Médio</p>
                                        <p className="text-2xl font-black text-white">
                                            {(detalhesItem.quantidadeCompras || detalhesItem.quantidadeVendas) > 0 
                                                ? formatCurrency((detalhesItem.totalGasto || detalhesItem.totalVendido) / (detalhesItem.quantidadeCompras || detalhesItem.quantidadeVendas)) 
                                                : 'R$ 0,00'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CORPO INFERIOR: GRÁFICO + TIMELINE */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-8">
                            
                            {detalhesItem.historico.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 text-center max-w-lg mx-auto mt-10">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Clock size={24}/>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-700 mb-2">Aguardando a Primeira Venda</h3>
                                    <p className="text-slate-500 text-sm">Este {visaoAtiva === 'clientes' ? 'cliente' : 'produto'} consta na nossa base oficial do ERP, mas ainda não possui propostas fechadas registradas através do CRM.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    
                                    {/* GRÁFICO */}
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <BarChart3 className="text-blue-600"/> Evolução de Negócios (Mensal)
                                        </h3>
                                        <div className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={montarDadosGrafico(detalhesItem.historico)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '12px', fontWeight: 'bold'}} formatter={(val: number) => [formatCurrency(val), "Volume"]} />
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
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col max-h-[400px]">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 shrink-0">
                                            <Clock className="text-blue-600"/> Histórico Detalhado (Timeline)
                                        </h3>
                                        <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1 relative before:absolute before:inset-0 before:ml-[19px] before:w-0.5 before:bg-slate-200">
                                            {detalhesItem.historico.map((hist: any) => (
                                                <div key={hist.id} className="relative flex items-start gap-4 group">
                                                    <div className="w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow-sm flex items-center justify-center shrink-0 z-10 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                        <ShieldCheck size={16}/>
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex-1 group-hover:border-blue-300 transition-colors">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-[10px] font-black text-slate-500 flex items-center gap-1">
                                                                <Calendar size={12}/> {formatDate(hist.data)}
                                                            </span>
                                                            {visaoAtiva === 'clientes' && (
                                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${hist.tipo === 'Nova Compra' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                                                                    {hist.tipo}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="font-bold text-slate-800 text-sm mb-3">
                                                            {visaoAtiva === 'clientes' ? hist.produto : hist.cliente}
                                                        </h4>
                                                        <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
                                                            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                                <User size={12} className="text-blue-500"/> {hist.vendedor}
                                                            </div>
                                                            <div className="text-right">
                                                                {hist.kg && <span className="text-[10px] font-bold text-slate-400 mr-2">{hist.kg} kg</span>}
                                                                <span className="font-black text-slate-700 text-sm">{formatCurrency(hist.valor)}</span>
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