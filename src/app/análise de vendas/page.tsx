"use client";

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  TrendingUp, Users, Package, Search, Calendar, DollarSign, 
  ArrowRight, Activity, Clock, ShieldCheck, Tag, Filter
} from 'lucide-react';

export default function AnaliseVendasPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [vendas, setVendas] = useState<any[]>([]);
  
  // Controles de Visão
  const [visaoAtiva, setVisaoAtiva] = useState<'clientes' | 'produtos'>('clientes');
  const [busca, setBusca] = useState("");
  const [itemSelecionado, setItemSelecionado] = useState<string | null>(null);

  // Dados Processados
  const [dadosClientes, setDadosClientes] = useState<any>({});
  const [dadosProdutos, setDadosProdutos] = useState<any>({});

  useEffect(() => {
    carregarVendas();
  }, []);

  const carregarVendas = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase.from('perfis').select('cargo, nome').eq('id', user.id).single();

      // Puxa apenas as propostas ganhas (fechadas)
      let query = supabase.from('pipeline')
        .select('*, perfis(nome)')
        .eq('status', 'fechado')
        .order('created_at', { ascending: true }); // Crescente para calcular recompra

      if (perfil && perfil.cargo !== 'admin') {
          query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      processarDados(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const processarDados = (dadosBrutos: any[]) => {
    const mapaClientes: any = {};
    const mapaProdutos: any = {};

    dadosBrutos.forEach((venda) => {
        const cliente = venda.nome_cliente || 'Desconhecido';
        const produto = venda.produto || 'Sem Produto';
        const valor = Number(venda.valor) || 0;
        const dataVenda = venda.data_entrada || venda.created_at;
        const vendedor = venda.perfis?.nome || 'Sistema';

        // --- LÓGICA DE CLIENTES ---
        if (!mapaClientes[cliente]) {
            mapaClientes[cliente] = {
                nome: cliente,
                totalGasto: 0,
                quantidadeCompras: 0,
                historico: [],
                produtosComprados: new Set()
            };
        }

        const isRecompra = mapaClientes[cliente].quantidadeCompras > 0;
        
        mapaClientes[cliente].totalGasto += valor;
        mapaClientes[cliente].quantidadeCompras += 1;
        mapaClientes[cliente].produtosComprados.add(produto);
        
        mapaClientes[cliente].historico.unshift({
            id: venda.id,
            data: dataVenda,
            produto: produto,
            valor: valor,
            vendedor: vendedor,
            tipo: isRecompra ? 'Recompra' : 'Nova Compra',
            kg: venda.kg_proposto
        }); // unshift para deixar o mais recente no topo da lista

        // --- LÓGICA DE PRODUTOS ---
        if (!mapaProdutos[produto]) {
            mapaProdutos[produto] = {
                nome: produto,
                totalVendido: 0,
                quantidadeVendas: 0,
                historico: [],
                clientes: new Set()
            };
        }

        mapaProdutos[produto].totalVendido += valor;
        mapaProdutos[produto].quantidadeVendas += 1;
        mapaProdutos[produto].clientes.add(cliente);
        
        mapaProdutos[produto].historico.unshift({
            id: venda.id,
            data: dataVenda,
            cliente: cliente,
            valor: valor,
            vendedor: vendedor,
            kg: venda.kg_proposto
        });
    });

    setDadosClientes(mapaClientes);
    setDadosProdutos(mapaProdutos);
    setVendas(dadosBrutos);
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

  // Listas para a barra lateral (filtradas)
  const listaLateral = Object.values(visaoAtiva === 'clientes' ? dadosClientes : dadosProdutos)
      .filter((item: any) => item.nome.toLowerCase().includes(busca.toLowerCase()))
      .sort((a: any, b: any) => (b.totalGasto || b.totalVendido) - (a.totalGasto || a.totalVendido));

  const detalhesItem = itemSelecionado 
      ? (visaoAtiva === 'clientes' ? dadosClientes[itemSelecionado] : dadosProdutos[itemSelecionado]) 
      : null;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <TrendingUp className="text-blue-600" size={32} /> Análise Profunda de Vendas
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Explore o histórico de compras por cliente ou por produto.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)]">
            
            {/* BARRA LATERAL (LISTA) */}
            <div className="lg:w-1/3 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    
                    {/* TABS */}
                    <div className="flex bg-slate-200/50 p-1 rounded-xl mb-4">
                        <button 
                            onClick={() => { setVisaoAtiva('clientes'); setItemSelecionado(null); }} 
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition ${visaoAtiva === 'clientes' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Users size={16}/> Clientes
                        </button>
                        <button 
                            onClick={() => { setVisaoAtiva('produtos'); setItemSelecionado(null); }} 
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition ${visaoAtiva === 'produtos' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Package size={16}/> Produtos
                        </button>
                    </div>

                    {/* BUSCA */}
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder={`Buscar ${visaoAtiva}...`} 
                            value={busca} 
                            onChange={(e) => setBusca(e.target.value)} 
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-medium transition" 
                        />
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                    {loading ? (
                        <div className="flex justify-center p-10"><Activity className="animate-spin text-blue-500"/></div>
                    ) : listaLateral.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm p-10">Nenhum dado encontrado.</p>
                    ) : (
                        listaLateral.map((item: any) => {
                            const isSelected = itemSelecionado === item.nome;
                            const valorStr = formatCurrency(item.totalGasto || item.totalVendido);
                            const qtd = item.quantidadeCompras || item.quantidadeVendas;

                            return (
                                <button 
                                    key={item.nome}
                                    onClick={() => setItemSelecionado(item.nome)}
                                    className={`w-full text-left p-4 rounded-2xl transition border ${isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                                >
                                    <h3 className={`font-bold truncate ${isSelected ? 'text-blue-800' : 'text-slate-700'}`} title={item.nome}>{item.nome}</h3>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{qtd} {visaoAtiva === 'clientes' ? 'Compras' : 'Vendas'}</span>
                                        <span className={`text-sm font-black ${isSelected ? 'text-blue-600' : 'text-slate-600'}`}>{valorStr}</span>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* PAINEL PRINCIPAL (DETALHES) */}
            <div className="lg:w-2/3 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                {!detalhesItem ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-60">
                        {visaoAtiva === 'clientes' ? <Users size={64} className="text-slate-300 mb-4"/> : <Package size={64} className="text-slate-300 mb-4"/>}
                        <h2 className="text-xl font-bold text-slate-500">Selecione um item na lista</h2>
                        <p className="text-sm text-slate-400 mt-2 max-w-sm">Clique em um {visaoAtiva === 'clientes' ? 'cliente' : 'produto'} ao lado para ver todo o histórico de compras, datas e vendedores.</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full animate-in fade-in duration-300">
                        
                        {/* CABEÇALHO DO DETALHE */}
                        <div className="p-8 border-b border-slate-100 bg-slate-800 text-white shrink-0 relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 text-white/5 transform rotate-12">
                                {visaoAtiva === 'clientes' ? <Users size={200}/> : <Package size={200}/>}
                            </div>
                            
                            <div className="relative z-10">
                                <span className="bg-blue-500 text-white px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest mb-3 inline-block">
                                    Raio-X do {visaoAtiva === 'clientes' ? 'Cliente' : 'Produto'}
                                </span>
                                <h2 className="text-2xl font-black tracking-tight mb-6">{detalhesItem.nome}</h2>
                                
                                <div className="grid grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Faturamento Total</p>
                                        <p className="text-2xl font-black text-emerald-400">{formatCurrency(detalhesItem.totalGasto || detalhesItem.totalVendido)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                            {visaoAtiva === 'clientes' ? 'Total de Compras' : 'Total de Vendas'}
                                        </p>
                                        <p className="text-xl font-bold text-white">{detalhesItem.quantidadeCompras || detalhesItem.quantidadeVendas}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                            {visaoAtiva === 'clientes' ? 'Ativos Diferentes' : 'Clientes Únicos'}
                                        </p>
                                        <p className="text-xl font-bold text-white">
                                            {visaoAtiva === 'clientes' ? detalhesItem.produtosComprados.size : detalhesItem.clientes.size}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* LINHA DO TEMPO (TIMELINE) */}
                        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Clock className="text-blue-600"/> Linha do Tempo de {visaoAtiva === 'clientes' ? 'Compras' : 'Vendas'}
                            </h3>

                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                {detalhesItem.historico.map((hist: any, index: number) => (
                                    <div key={hist.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        
                                        {/* Ícone Central */}
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                            <ShieldCheck size={16}/>
                                        </div>

                                        {/* Card de Conteúdo */}
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all hover:shadow-md">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md flex items-center gap-1 border border-slate-200">
                                                    <Calendar size={10}/> {formatDate(hist.data)}
                                                </span>
                                                
                                                {/* TAG DE RECOMPRA SÓ APARECE NA VISÃO DE CLIENTES */}
                                                {visaoAtiva === 'clientes' && (
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${hist.tipo === 'Nova Compra' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                                                        {hist.tipo}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <h4 className="font-bold text-slate-800 text-base mb-1 truncate" title={visaoAtiva === 'clientes' ? hist.produto : hist.cliente}>
                                                {visaoAtiva === 'clientes' ? hist.produto : hist.cliente}
                                            </h4>
                                            
                                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                                    <User size={12}/> {hist.vendedor}
                                                </div>
                                                <span className="font-black text-slate-700">{formatCurrency(hist.valor)}</span>
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

      </div>
    </div>
  );
}