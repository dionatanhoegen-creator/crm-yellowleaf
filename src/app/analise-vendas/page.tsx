"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, Users, Package, Calendar, DollarSign, 
  Activity, BarChart3, ShoppingCart, User, Award, 
  Filter, Search, ArrowUpRight, ArrowDownRight, Database
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const API_CLIENTES_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

export default function AnaliseVendasPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [vendasBrutas, setVendasBrutas] = useState<any[]>([]);

  // Segurança e Autenticação
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [nomeVendedorErp, setNomeVendedorErp] = useState<string>("");

  // Filtros Globais
  const [anoSelecionado, setAnoSelecionado] = useState<string>(new Date().getFullYear().toString());
  const [mesSelecionado, setMesSelecionado] = useState<string>("todos");
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>("todos");
  
  // Listas para os filtros
  const [anosDisponiveis, setAnosDisponiveis] = useState<string[]>([]);
  const [vendedoresDisponiveis, setVendedoresDisponiveis] = useState<string[]>([]);

  useEffect(() => {
    inicializarDados();
  }, []);

  const inicializarDados = async () => {
    setLoading(true);
    
    // 1. Puxa perfil do usuário logado para aplicar regras de segurança
    const { data: { user } } = await supabase.auth.getUser();
    let perfilUsuario = null;
    let master = false;

    if (user) {
        const { data: perfil } = await supabase.from('perfis').select('*').eq('id', user.id).single();
        perfilUsuario = perfil;
        setUsuarioLogado(perfil);
        master = ['admin', 'Admin', 'diretor', 'Diretor'].includes(perfil?.cargo);
        setIsMaster(master);
    }

    // 2. Puxa dados brutos do ERP
    try {
      const [resFaturamento, resVendas, resClientes] = await Promise.all([
          fetch(`${API_CLIENTES_URL}?path=faturamento`).then(r => r.json()).catch(() => ({success: false, data: []})),
          fetch(`${API_CLIENTES_URL}?path=vendas`).then(r => r.json()).catch(() => ({success: false, data: []})),
          fetch(`${API_CLIENTES_URL}?path=clientes`).then(r => r.json()).catch(() => ({success: false, data: []}))
      ]);

      let dadosExtraidos: any[] = [];

      if (resFaturamento.success && Array.isArray(resFaturamento.data) && resFaturamento.data.length > 0) {
          dadosExtraidos = resFaturamento.data;
      } else if (resVendas.success && Array.isArray(resVendas.data) && resVendas.data.length > 0) {
          dadosExtraidos = resVendas.data;
      } else if (resClientes.success && Array.isArray(resClientes.data)) {
          resClientes.data.forEach((c: any) => {
              const hist = c.historico || c.vendas || c.compras || [];
              if (Array.isArray(hist)) {
                  hist.forEach((compra: any) => {
                      dadosExtraidos.push({
                          ...compra,
                          cliente_nome: c.fantasia || c.nome_fantasia || c.razao_social,
                          vendedor_nome: c.vendedor || c.consultor
                      });
                  });
              }
          });
      }

      const vendasFormatadas = dadosExtraidos.map(v => {
          const dataBruta = String(v.data || v.data_venda || v.criado_em || v.data_faturamento || new Date().toISOString());
          let timestamp = 0;
          let ano = '2000';
          let mes = '01';

          if (dataBruta.match(/^\d{2}\/\d{2}\/\d{4}/)) {
              const p = dataBruta.substring(0,10).split('/');
              ano = p[2]; mes = p[1];
              timestamp = new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00Z`).getTime();
          } else {
              const d = new Date(dataBruta);
              if (!isNaN(d.getTime())) {
                  timestamp = d.getTime();
                  ano = d.getFullYear().toString();
                  mes = String(d.getMonth() + 1).padStart(2, '0');
              }
          }

          return {
              id: Math.random().toString(36).substr(2, 9),
              cliente: String(v.cliente || v.razao_social || v.fantasia || v.cliente_nome || 'Consumidor Final').trim().toUpperCase(),
              produto: String(v.produto || v.ativo || v.item || 'PRODUTO NÃO IDENTIFICADO').trim().toUpperCase(),
              valor: parseBRNumber(v.valor || v.total || v.faturamento || v.preco),
              kg: parseBRNumber(v.kg || v.quantidade || v.peso || v.qte),
              vendedor: String(v.vendedor || v.representante || v.vendedor_nome || 'SEM VENDEDOR').trim().toUpperCase(),
              timestamp,
              ano,
              mes,
              dataCompleta: dataBruta
          };
      }).filter(v => v.valor > 0 || v.kg > 0); 

      const anosSet = new Set<string>();
      const vendSet = new Set<string>();
      vendasFormatadas.forEach(v => {
          if (v.ano && v.ano !== 'NaN') anosSet.add(v.ano);
          if (v.vendedor && v.vendedor !== 'SEM VENDEDOR') vendSet.add(v.vendedor);
      });

      setAnosDisponiveis(Array.from(anosSet).sort().reverse());
      const vendArr = Array.from(vendSet).sort();
      setVendedoresDisponiveis(vendArr);
      setVendasBrutas(vendasFormatadas);

      // 3. Aplica regra de acesso e trava o filtro se não for Master
      if (!master && perfilUsuario) {
          const normalizeStr = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
          const nomeUser = normalizeStr(perfilUsuario.nome);
          
          const match = vendArr.find(v => {
              const vNorm = normalizeStr(v);
              return vNorm.includes(nomeUser) || nomeUser.includes(vNorm);
          });
          
          if (match) {
              setVendedorSelecionado(match);
              setNomeVendedorErp(match);
          } else {
              setVendedorSelecionado("NENHUM");
              setNomeVendedorErp("NENHUM");
          }
      }

    } catch (e) {
      console.error("Erro ao puxar dados do ERP:", e);
    } finally {
      setLoading(false);
    }
  };

  const parseBRNumber = (val: any) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      let str = String(val).replace(/[^\d.,-]/g, '').trim();
      if (str.includes('.') && str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
      else if (str.includes(',')) str = str.replace(',', '.');
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
  };

  // --- MOTOR DE INTELIGÊNCIA (Reativo aos filtros e segurança) ---
  const dadosFiltrados = useMemo(() => {
      return vendasBrutas.filter(v => {
          const matchAno = anoSelecionado === "todos" ? true : v.ano === anoSelecionado;
          const matchMes = mesSelecionado === "todos" ? true : v.mes === mesSelecionado;
          
          // Trava de Segurança RLS Visual
          let targetVendedor = vendedorSelecionado;
          if (!isMaster) {
              targetVendedor = nomeVendedorErp; // Vendedor só vê ele mesmo
          }
          const matchVend = targetVendedor === "todos" ? true : v.vendedor === targetVendedor;
          
          return matchAno && matchMes && matchVend;
      });
  }, [vendasBrutas, anoSelecionado, mesSelecionado, vendedorSelecionado, isMaster, nomeVendedorErp]);

  const kpis = useMemo(() => {
      let totalValor = 0;
      let totalKg = 0;
      const clientesUnicos = new Set();
      
      dadosFiltrados.forEach(v => {
          totalValor += v.valor;
          totalKg += v.kg;
          clientesUnicos.add(v.cliente);
      });

      return {
          faturamento: totalValor,
          volumeKg: totalKg,
          transacoes: dadosFiltrados.length,
          clientesAtivos: clientesUnicos.size,
          ticketMedio: dadosFiltrados.length > 0 ? totalValor / dadosFiltrados.length : 0
      };
  }, [dadosFiltrados]);

  const dadosGrafico = useMemo(() => {
      const agregado: any = {};
      dadosFiltrados.forEach(v => {
          let chave = '';
          if (mesSelecionado !== "todos" && anoSelecionado !== "todos") {
              const d = new Date(v.timestamp);
              chave = `${String(d.getDate()).padStart(2, '0')}/${v.mes}`; 
          } else {
              chave = `${v.mes}/${v.ano}`; 
          }
          
          if (!agregado[chave]) agregado[chave] = 0;
          agregado[chave] += v.valor;
      });

      return Object.keys(agregado).sort((a, b) => {
          const [p1A, p2A] = a.split('/');
          const [p1B, p2B] = b.split('/');
          if (p2A !== p2B) return Number(p2A) - Number(p2B);
          return Number(p1A) - Number(p1B);
      }).map(k => ({ name: k, valor: agregado[k] }));
  }, [dadosFiltrados, mesSelecionado, anoSelecionado]);

  const getTop = (campo: 'produto' | 'cliente' | 'vendedor', limite: number) => {
      const mapa: any = {};
      dadosFiltrados.forEach(v => {
          const chave = v[campo];
          if (!mapa[chave]) mapa[chave] = { nome: chave, valor: 0, kg: 0 };
          mapa[chave].valor += v.valor;
          mapa[chave].kg += v.kg;
      });
      return Object.values(mapa).sort((a: any, b: any) => b.valor - a.valor).slice(0, limite);
  };

  const topProdutos = useMemo(() => getTop('produto', 5), [dadosFiltrados]);
  const topClientes = useMemo(() => getTop('cliente', 5), [dadosFiltrados]);

  const fmtMon = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtNum = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-400">
              <Activity className="animate-spin text-emerald-500 mb-4" size={40}/>
              <h2 className="text-xl font-bold text-slate-600">Sincronizando com ERP...</h2>
              <p className="text-sm mt-2">Processando e aplicando regras de segurança.</p>
          </div>
      );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* HEADER & FILTROS GLOBAIS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <BarChart3 className="text-emerald-600" size={28} /> BI Faturamento
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-1">Análise oficial baseada nos dados do ERP.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <Calendar size={16} className="text-slate-400"/>
                    <select value={anoSelecionado} onChange={e => setAnoSelecionado(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
                        <option value="todos">Todos Anos</option>
                        {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <Filter size={16} className="text-slate-400"/>
                    <select value={mesSelecionado} onChange={e => setMesSelecionado(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
                        <option value="todos">Ano Inteiro</option>
                        <option value="01">Jan</option><option value="02">Fev</option><option value="03">Mar</option>
                        <option value="04">Abr</option><option value="05">Mai</option><option value="06">Jun</option>
                        <option value="07">Jul</option><option value="08">Ago</option><option value="09">Set</option>
                        <option value="10">Out</option><option value="11">Nov</option><option value="12">Dez</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <User size={16} className="text-slate-400"/>
                    <select 
                        value={!isMaster ? nomeVendedorErp : vendedorSelecionado} 
                        onChange={e => setVendedorSelecionado(e.target.value)} 
                        disabled={!isMaster}
                        title={!isMaster ? "Você tem acesso visual apenas à sua carteira." : "Acesso Master: Selecione o vendedor."}
                        className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer w-40 truncate disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isMaster && <option value="todos">Toda Equipe</option>}
                        {!isMaster && nomeVendedorErp === "NENHUM" && <option value="NENHUM">Sem Vendas Registradas</option>}
                        {vendedoresDisponiveis.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
            </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition">
                <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition transform group-hover:scale-110"><DollarSign size={80}/></div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 relative z-10">Receita Total</p>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight relative z-10">{fmtMon(kpis.faturamento)}</h2>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition">
                <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition transform group-hover:scale-110"><Package size={80}/></div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 relative z-10">Volume Vendido (KG)</p>
                <h2 className="text-3xl font-black text-[#82D14D] tracking-tight relative z-10">{fmtNum(kpis.volumeKg)} <span className="text-lg font-bold text-slate-400">kg</span></h2>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-purple-300 transition">
                <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition transform group-hover:scale-110"><ShoppingCart size={80}/></div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 relative z-10">Ticket Médio</p>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight relative z-10">{fmtMon(kpis.ticketMedio)}</h2>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-orange-300 transition">
                <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition transform group-hover:scale-110"><Users size={80}/></div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 relative z-10">Clientes Compradores</p>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight relative z-10">{kpis.clientesAtivos} <span className="text-lg font-bold text-slate-400">ativos</span></h2>
            </div>
        </div>

        {/* ÁREA DE GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* GRÁFICO PRINCIPAL */}
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><TrendingUp className="text-blue-600"/> Curva de Crescimento</h3>
                        <p className="text-sm font-medium text-slate-400 mt-1">Evolução do faturamento no período selecionado.</p>
                    </div>
                </div>
                
                <div className="h-[350px] w-full">
                    {dadosGrafico.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-400 font-medium">Sem dados para o filtro selecionado.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: 600}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                                <RechartsTooltip 
                                    cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4'}} 
                                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold'}} 
                                    formatter={(val: number) => [fmtMon(val), "Receita"]} 
                                />
                                <Area type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={4} fill="url(#colorValor)" activeDot={{r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2}} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* TOP PRODUTOS E CLIENTES (RANKINGS) */}
            <div className="space-y-8">
                
                {/* Ranking Produtos */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2">
                        <Award className="text-amber-500" size={18}/> Top 5 Produtos
                    </h3>
                    <div className="space-y-4">
                        {topProdutos.length === 0 ? <p className="text-sm text-slate-400">Sem dados.</p> : topProdutos.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between items-center group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
                                    <div className="truncate">
                                        <p className="text-sm font-bold text-slate-700 truncate group-hover:text-blue-600 transition cursor-default" title={p.nome}>{p.nome}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">{fmtNum(p.kg)} kg vendidos</p>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-slate-800 shrink-0 ml-2">{fmtMon(p.valor)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ranking Clientes */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2">
                        <Users className="text-blue-500" size={18}/> Top 5 Clientes
                    </h3>
                    <div className="space-y-4">
                        {topClientes.length === 0 ? <p className="text-sm text-slate-400">Sem dados.</p> : topClientes.map((c: any, i: number) => (
                            <div key={i} className="flex justify-between items-center group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
                                    <div className="truncate">
                                        <p className="text-sm font-bold text-slate-700 truncate cursor-default" title={c.nome}>{c.nome}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-slate-800 shrink-0 ml-2">{fmtMon(c.valor)}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>

      </div>
    </div>
  );
}