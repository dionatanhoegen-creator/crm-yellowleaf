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

      // 1. Busca Vendas Novas (CRM)
      let queryVendas = supabase.from('pipeline').select('*').eq('status', 'fechado');
      if (perfilLogado && perfilLogado.cargo !== 'admin') {
          queryVendas = queryVendas.eq('user_id', user.id);
      }

      // 2. Busca Usuários do CRM
      const queryPerfis = supabase.from('perfis').select('id, nome');

      // 3. Executa todas as conexões com o Data Lake simultaneamente
      const [resCRM, resPerfis, resProdutos, resClientes, resVendasERP] = await Promise.all([
          queryVendas,
          queryPerfis,
          fetch(`${API_PRODUTOS_URL}?path=produtos`).then(r => r.json()).catch(() => ({success: false, data: []})),
          fetch(`${API_CLIENTES_URL}?path=clientes`).then(r => r.json()).catch(() => ({success: false, data: []})),
          // ---> NOVA CONEXÃO: Busca o histórico maciço de vendas do ERP
          fetch(`${API_CLIENTES_URL}?path=vendas`).then(r => r.json()).catch(() => ({success: false, data: []})) 
      ]);

      const vendasCRM = resCRM.data || [];
      const perfis = resPerfis.data || [];
      const listaAPIProdutos = (resProdutos.success && Array.isArray(resProdutos.data)) ? resProdutos.data : [];
      const listaAPIClientes = (resClientes.success && Array.isArray(resClientes.data)) ? resClientes.data : [];
      const vendasERP = (resVendasERP.success && Array.isArray(resVendasERP.data)) ? resVendasERP.data : [];

      setMetricas({ crm: vendasCRM.length, erp: vendasERP.length });

      const mapaVendedores: any = {};
      perfis.forEach(p => mapaVendedores[p.id] = p.nome);

      construirInteligencia(vendasCRM, vendasERP, listaAPIProdutos, listaAPIClientes, mapaVendedores);
    } catch (e) {
      console.error("Erro crítico ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  };

  // Normaliza o nome para garantir que o CRM cruze com o ERP perfeitamente (Ignora acentos e espaços)
  const normalizeChave = (str: string) => {
      if (!str) return 'DESCONHECIDO';
      return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  };

  const construirInteligencia = (vendasCRM: any[], vendasERP: any[], listaAPIProdutos: any[], listaAPIClientes: any[], mapaVendedores: any) => {
    const mapaClientes: any = {};
    const mapaProdutos: any = {};

    // Injeta Base de Produtos
    listaAPIProdutos.forEach(p => {
        if (!p.ativo) return;
        const key = normalizeChave(p.ativo);
        if (!mapaProdutos[key]) mapaProdutos[key] = { nome_original: p.ativo.trim(), totalVendido: 0, quantidadeVendas: 0, historico: [], clientes: new Set(), totalKg: 0 };
    });

    // Injeta Base de Clientes
    listaAPIClientes.forEach(c => {
        const nomeOriginal = (c.fantasia || c.nome_fantasia || c.razao_social || '').trim();
        if (!nomeOriginal) return;
        const key = normalizeChave(nomeOriginal);
        if (!mapaClientes[key]) mapaClientes[key] = { nome_original: nomeOriginal, totalGasto: 0, quantidadeCompras: 0, historico: [], produtosComprados: new Set(), totalKg: 0 };
    });

    // UNIFICAÇÃO DAS VENDAS: Transforma ERP e CRM no mesmo formato
    const formatarHistorico = (venda: any, origem: 'CRM' | 'ERP') => {
        if (origem === 'CRM') {
            return {
                id: venda.id,
                cliente_chave: normalizeChave(venda.nome_cliente),
                cliente_nome: venda.nome_cliente || 'Cliente Avulso',
                produto_chave: normalizeChave(venda.produto),
                produto_nome: venda.produto || 'Produto Diverso',
                valor: Number(venda.valor) || 0,
                data: venda.data_entrada || venda.created_at,
                vendedor: mapaVendedores[venda.user_id] || 'Consultor',
                kg: Number(venda.kg_proposto) || 0,
                fonte: 'CRM'
            };
        } else {
            return {
                id: `erp-${Math.random()}`,
                cliente_chave: normalizeChave(venda.cliente || venda.razao_social || venda.fantasia),
                cliente_nome: (venda.cliente || venda.razao_social || venda.fantasia || 'Cliente ERP').trim(),
                produto_chave: normalizeChave(venda.produto || venda.ativo || venda.item),
                produto_nome: (venda.produto || venda.ativo || venda.item || 'Produto ERP').trim(),
                valor: Number(venda.valor || venda.total || venda.faturamento || 0),
                data: venda.data || venda.data_venda || venda.criado_em || new Date().toISOString(),
                vendedor: (venda.vendedor || venda.representante || 'Vendedor ERP').trim(),
                kg: Number(venda.kg || venda.quantidade || venda.peso || 0),
                fonte: 'ERP'
            };
        }
    };

    const todasAsVendas = [
        ...vendasERP.map(v => formatarHistorico(v, 'ERP')),
        ...vendasCRM.map(v => formatarHistorico(v, 'CRM'))
    ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()); // Ordena da mais antiga para a mais nova para calcular recompra

    // Processa a Linha do Tempo Unificada
    todasAsVendas.forEach(venda => {
        // Atualiza Cliente
        if (!mapaClientes[venda.cliente_chave]) {
            mapaClientes[venda.cliente_chave] = { nome_original: venda.cliente_nome, totalGasto: 0, quantidadeCompras: 0, historico: [], produtosComprados: new Set(), totalKg: 0 };
        }
        
        const isRecompra = mapaClientes[venda.cliente_chave].quantidadeCompras > 0;
        mapaClientes[venda.cliente_chave].totalGasto += venda.valor;
        mapaClientes[venda.cliente_chave].totalKg += venda.kg;
        mapaClientes[venda.cliente_chave].quantidadeCompras += 1;
        mapaClientes[venda.cliente_chave].produtosComprados.add(venda.produto_nome);
        mapaClientes[venda.cliente_chave].historico.unshift({
            id: venda.id, data: venda.data, produto: venda.produto_nome, valor: venda.valor, vendedor: venda.vendedor, tipo: isRecompra ? 'Recompra' : 'Nova Compra', kg: venda.kg, fonte: venda.fonte
        });

        // Atualiza Produto
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

  const formatCurrency = (val: number) => (Number(val)||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

  const listaDados = visaoAtiva === 'clientes' ? Object.values(dadosClientes) : Object.values(dadosProdutos);
  const listaLateral = listaDados
      .filter((item: any) => item.nome_original.toLowerCase().includes(busca.toLowerCase()))
      .sort((a: any, b: any) => {
          const valA = a.totalGasto || a.totalVendido || 0;
          const valB = b.totalGasto || b.totalVendido || 0;
          if (valB !== valA) return valB - valA; 
          return a.nome_original.localeCompare(b.nome_original);
      })
      .slice(0, 150); 

  const detalhesItem = itemSelecionado 
      ? (visaoAtiva === 'clientes' ? dadosClientes[itemSelecionado] : dadosProdutos[itemSelecionado]) 
      : null;

  const montarDadosGrafico = (historico: any[]) => {
      const agregado: Record<string, number> = {};
      historico.forEach(h => {
          if(!h.data) return;
          const mesAno = String(h.data).substring(0, 7); 
          if(!agregado[mesAno]) agregado[mesAno] = 0;
          agregado[mesAno] += h.valor;
      });
      return Object.keys(agregado).sort().map(k => ({
          name: k.split('-').reverse().join('/'), 
          valor: agregado[k]
      }));
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto">
        
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-black text-[#0f392b] tracking-tight flex items-center gap-3">
                    <TrendingUp className="text-[#82D14D]" size={32} /> Análise Profunda de Vendas
                </h1>
                <p className="text-slate-500 mt-1 font-medium">Unificação total do histórico: Propostas do CRM + Vendas do ERP.</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
                <div className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <Database size={16} className="text-emerald-500"/>
                    <span className="text-sm font-bold text-slate-600">Histórico ERP: <strong className="text-emerald-600 text-lg">{metricas.erp}</strong> linhas</span>
                </div>
                <div className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <Activity size={16} className="text-blue-500"/>
                    <span className="text-sm font-bold text-slate-600">Novas CRM: <strong className="text-blue-600 text-lg">{metricas.crm}</strong> vendas</span>
                </div>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)]">
            
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
                        <p className="text-center text-slate-400 text-sm font-medium p-10">Nenhum dado encontrado.</p>
                    ) : (
                        listaLateral.map((item: any) => {
                            const chave = normalizeChave(item.nome_original);
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

            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                {!detalhesItem ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-50/50">
                        <div className="w-24 h-24 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                            {visaoAtiva === 'clientes' ? <Users size={40} className="text-slate-300"/> : <Package size={40} className="text-slate-300"/>}
                        </div>
                        <h2 className="text-2xl font-black text-slate-700 mb-2">Painel de Raio-X</h2>
                        <p className="text-slate-500 font-medium max-w-md">Selecione um {visaoAtiva === 'clientes' ? 'cliente' : 'produto'} no menu à esquerda para visualizar a soma total do histórico do ERP com as vendas do CRM.</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full animate-in fade-in duration-300">
                        
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
                                
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm md:col-span-2">
                                        <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><DollarSign size={12}/> {visaoAtiva === 'clientes' ? 'LTV (Gasto Total)' : 'Receita Gerada'}</p>
                                        <p className="text-2xl font-black text-white">{formatCurrency(detalhesItem.totalGasto || detalhesItem.totalVendido)}</p>
                                    </div>
                                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                                        <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Package size={12}/> Volume (KG)</p>
                                        <p className="text-2xl font-black text-[#82D14D]">{detalhesItem.totalKg} <span className="text-sm text-white/50 font-medium">kg</span></p>
                                    </div>
                                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                                        <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><ShoppingCart size={12}/> Transações</p>
                                        <p className="text-2xl font-black text-white">{detalhesItem.quantidadeCompras || detalhesItem.quantidadeVendas}</p>
                                    </div>
                                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                                        <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Activity size={12}/> Ticket Médio</p>
                                        <p className="text-xl font-black text-white">
                                            {(detalhesItem.quantidadeCompras || detalhesItem.quantidadeVendas) > 0 
                                                ? formatCurrency((detalhesItem.totalGasto || detalhesItem.totalVendido) / (detalhesItem.quantidadeCompras || detalhesItem.quantidadeVendas)) 
                                                : 'R$ 0'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-8">
                            {detalhesItem.historico.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 text-center max-w-lg mx-auto mt-10">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Clock size={24}/>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-700 mb-2">Sem histórico de vendas</h3>
                                    <p className="text-slate-500 text-sm">Este {visaoAtiva === 'clientes' ? 'cliente' : 'produto'} não possui registros nem no ERP e nem no CRM.</p>
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
                                            <Clock className="text-blue-600"/> Histórico de {visaoAtiva === 'clientes' ? 'Compras' : 'Vendas'}
                                        </h3>
                                        <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1 relative before:absolute before:inset-0 before:ml-[19px] before:w-0.5 before:bg-slate-200">
                                            {detalhesItem.historico.map((hist: any, i: number) => (
                                                <div key={`${hist.id}-${i}`} className="relative flex items-start gap-4 group">
                                                    <div className="w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow-sm flex items-center justify-center shrink-0 z-10 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                        <ShieldCheck size={16}/>
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex-1 group-hover:border-blue-300 transition-colors">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1 ${hist.fonte === 'ERP' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
                                                                    {hist.fonte === 'ERP' ? <Database size={10}/> : <Activity size={10}/>} {hist.fonte}
                                                                </span>
                                                                <span className="text-[10px] font-black text-slate-500 flex items-center gap-1">
                                                                    <Calendar size={12}/> {formatDate(hist.data)}
                                                                </span>
                                                            </div>
                                                            
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
                                                                {hist.kg > 0 && <span className="text-[10px] font-bold text-slate-400 mr-2">{hist.kg} kg</span>}
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