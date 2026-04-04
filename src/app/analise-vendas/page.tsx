"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, Users, Package, Calendar, DollarSign, 
  Activity, BarChart3, ShoppingCart, User, Award, 
  Filter
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

  // Filtros Globais
  const [anoSelecionado, setAnoSelecionado] = useState<string>("todos");
  const [mesSelecionado, setMesSelecionado] = useState<string>("todos");
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>("todos");
  
  // Listas para os filtros
  const [anosDisponiveis, setAnosDisponiveis] = useState<string[]>([]);
  const [vendedoresDisponiveis, setVendedoresDisponiveis] = useState<string[]>([]);

  // DEBUG & DIAGNÓSTICO
  const [debugInfo, setDebugInfo] = useState({ linhasRecebidas: 0, linhasLimpas: 0, colunasVistas: '', log: '' });

  useEffect(() => {
    inicializarDados();
  }, []);

  const inicializarDados = async () => {
    setLoading(true);
    let logMsg = "Iniciando Varredura Completa da API...\n";
    
    const { data: { user } } = await supabase.auth.getUser();
    let perfilUsuario = null;
    let master = false;

    if (user) {
        const { data: perfil } = await supabase.from('perfis').select('*').eq('id', user.id).single();
        perfilUsuario = perfil;
        setUsuarioLogado(perfil);
        
        const cargoStr = String(perfil?.cargo || "").toLowerCase();
        master = ['admin', 'diretor', 'master'].includes(cargoStr) || cargoStr.includes('sdr') || cargoStr.includes('p&d');
        setIsMaster(master);
        logMsg += `Usuário Logado: ${perfil?.nome} | Master: ${master}\n`;
    }

    let dadosExtraidos: any[] = [];

    const extractArray = (res: any) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (res.data && Array.isArray(res.data)) return res.data;
        if (res.items && Array.isArray(res.items)) return res.items;
        return [];
    };

    // 2. A REDE DE ARRASTO CORRIGIDA: Agora pedindo a rota exata que está no Apps Script!
    try {
        const cacheBuster = new Date().getTime();
        
        const [resDash, resVen, resFat, resCli] = await Promise.all([
            fetch(`${API_CLIENTES_URL}?path=dashboard/faturamento&t=${cacheBuster}`).then(r => r.json()).catch(() => null),
            fetch(`${API_CLIENTES_URL}?path=vendas&t=${cacheBuster}`).then(r => r.json()).catch(() => null),
            fetch(`${API_CLIENTES_URL}?path=faturamento&t=${cacheBuster}`).then(r => r.json()).catch(() => null),
            fetch(`${API_CLIENTES_URL}?path=clientes&t=${cacheBuster}`).then(r => r.json()).catch(() => null)
        ]);

        const dataDash = extractArray(resDash);
        const dataVen = extractArray(resVen);
        const dataFat = extractArray(resFat);
        const dataCli = extractArray(resCli);
        
        logMsg += `Resposta API -> Dashboard/Fat: ${dataDash.length} | Vendas: ${dataVen.length} | Clientes: ${dataCli.length}\n`;

        // Junta tudo que achou
        dadosExtraidos = [...dataDash, ...dataVen, ...dataFat];

        // Fallback: Se não achou vendas diretas, caça no histórico de clientes
        let countHist = 0;
        dataCli.forEach((c: any) => {
            const hist = c.historico || c.vendas || c.compras || c.faturamento || [];
            if (Array.isArray(hist)) {
                hist.forEach((compra: any) => {
                    countHist++;
                    dadosExtraidos.push({
                        ...compra,
                        cliente_extraido: c.fantasia || c.nome_fantasia || c.razao_social || c.cliente,
                        vendedor_extraido: c.vendedor || c.consultor || c.representante || c.responsavel
                    });
                });
            }
        });
        
        logMsg += `Extraído do Histórico de Clientes: ${countHist} linhas.\n`;
        logMsg += `Total Geral Extraído: ${dadosExtraidos.length} linhas.\n`;

    } catch (e) {
        console.error("Erro ao puxar dados da Planilha:", e);
        logMsg += `ERRO API: ${String(e)}\n`;
    }

    const normalizeKey = (key: string) => {
        return key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    const colunasExemplo = dadosExtraidos.length > 0 ? Object.keys(dadosExtraidos[0]).join(' | ') : 'Nenhuma';

    // 3. Mapeia e Normaliza as Colunas
    const vendasFormatadas = dadosExtraidos.map(v => {
        const objNorm: any = {};
        Object.keys(v).forEach(k => {
            objNorm[normalizeKey(k)] = v[k];
        });

        let anoCalculado = '2000';
        let mesCalculado = '01';
        let timestamp = 0;

        if (objNorm.ano && objNorm.mes) {
            anoCalculado = String(objNorm.ano).trim();
            mesCalculado = String(objNorm.mes).trim().padStart(2, '0');
            timestamp = new Date(parseInt(anoCalculado), parseInt(mesCalculado) - 1, 15).getTime();
        } 
        else {
            const dataBruta = String(objNorm.data || objNorm.datavenda || objNorm.criadoem || new Date().toISOString());
            if (dataBruta.match(/^\d{2}\/\d{2}\/\d{4}/)) {
                const p = dataBruta.substring(0,10).split('/');
                anoCalculado = p[2]; mesCalculado = p[1];
                timestamp = new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00Z`).getTime();
            } else {
                const d = new Date(dataBruta);
                if (!isNaN(d.getTime())) {
                    timestamp = d.getTime();
                    anoCalculado = d.getFullYear().toString();
                    mesCalculado = String(d.getMonth() + 1).padStart(2, '0');
                }
            }
        }

        return {
            id: Math.random().toString(36).substr(2, 9),
            cliente: String(objNorm.cliente_extraido || objNorm.nomefantasia || objNorm.razaosocial || objNorm.cliente || 'CLIENTE NÃO IDENTIFICADO').trim().toUpperCase(),
            produto: String(objNorm.ativo || objNorm.produto || objNorm.item || 'PRODUTO NÃO IDENTIFICADO').trim().toUpperCase(),
            valor: parseBRNumber(objNorm.valorcontabil || objNorm.valor || objNorm.total || objNorm.faturamento || 0),
            kg: parseBRNumber(objNorm.qtde || objNorm.quantidade || objNorm.kg || objNorm.peso || 0),
            vendedor: String(objNorm.vendedor_extraido || objNorm.vendedor || objNorm.representante || objNorm.consultor || 'SEM VENDEDOR').trim().toUpperCase(),
            timestamp,
            ano: anoCalculado,
            mes: mesCalculado
        };
    }).filter(v => v.valor > 0 || v.kg > 0); 

    logMsg += `Linhas limpas válidas: ${vendasFormatadas.length}\n`;

    setDebugInfo({
        linhasRecebidas: dadosExtraidos.length,
        linhasLimpas: vendasFormatadas.length,
        colunasVistas: colunasExemplo,
        log: logMsg
    });

    const anosSet = new Set<string>();
    const vendSet = new Set<string>();
    vendasFormatadas.forEach(v => {
        if (v.ano && v.ano !== 'NaN') anosSet.add(v.ano);
        if (v.vendedor && v.vendedor !== 'SEM VENDEDOR') vendSet.add(v.vendedor);
    });

    setAnosDisponiveis(Array.from(anosSet).sort().reverse());
    setVendedoresDisponiveis(Array.from(vendSet).sort());
    setVendasBrutas(vendasFormatadas);
    setLoading(false);
  };

  const parseBRNumber = (val: any) => {
      if (val === null || val === undefined || val === '') return 0;
      if (typeof val === 'number') return val;
      let str = String(val).replace(/[^\d.,-]/g, '').trim();
      if (!str) return 0;
      if (str.includes('.') && str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
      else if (str.includes(',')) str = str.replace(',', '.');
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
  };

  const dadosFiltrados = useMemo(() => {
      return vendasBrutas.filter(v => {
          const matchAno = anoSelecionado === "todos" ? true : v.ano === anoSelecionado;
          const matchMes = mesSelecionado === "todos" ? true : v.mes === mesSelecionado;
          
          let matchVend = true;
          if (!isMaster && usuarioLogado) {
              const nomeUser = usuarioLogado.nome ? usuarioLogado.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
              const nomeVend = v.vendedor ? v.vendedor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
              if (!nomeUser) {
                  matchVend = false;
              } else {
                  matchVend = nomeVend.includes(nomeUser) || nomeUser.includes(nomeVend);
              }
          } else {
              matchVend = vendedorSelecionado === "todos" ? true : v.vendedor === vendedorSelecionado;
          }
          
          return matchAno && matchMes && matchVend;
      });
  }, [vendasBrutas, anoSelecionado, mesSelecionado, vendedorSelecionado, isMaster, usuarioLogado]);

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
          let chave = `${v.mes}/${v.ano}`; 
          if (!agregado[chave]) agregado[chave] = 0;
          agregado[chave] += v.valor;
      });

      return Object.keys(agregado).sort((a, b) => {
          const [p1A, p2A] = a.split('/');
          const [p1B, p2B] = b.split('/');
          if (p2A !== p2B) return Number(p2A) - Number(p2B);
          return Number(p1A) - Number(p1B);
      }).map(k => ({ name: k, valor: agregado[k] }));
  }, [dadosFiltrados]);

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
              <h2 className="text-xl font-bold text-slate-600">Lendo API de Vendas...</h2>
              <p className="text-sm mt-2">Sincronizando com a rota de dashboard do ERP...</p>
          </div>
      );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <BarChart3 className="text-emerald-600" size={28} /> BI Faturamento
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-1">Análise oficial integrada ao ERP.</p>
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
                    {isMaster ? (
                        <select value={vendedorSelecionado} onChange={e => setVendedorSelecionado(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer w-40 truncate">
                            <option value="todos">Toda Equipe</option>
                            {vendedoresDisponiveis.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    ) : (
                        <div className="text-sm font-bold text-slate-700 w-40 truncate select-none" title="Você visualiza apenas a sua carteira de comissões">
                            {usuarioLogado?.nome || 'Minhas Vendas'}
                        </div>
                    )}
                </div>
            </div>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><TrendingUp className="text-blue-600"/> Curva de Crescimento</h3>
                        <p className="text-sm font-medium text-slate-400 mt-1">Evolução do faturamento no período selecionado.</p>
                    </div>
                </div>
                
                <div className="flex-1 w-full min-h-[350px]">
                    {dadosGrafico.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full w-full">
                            <p className="text-slate-500 font-bold mb-4 text-center">Sem dados para exibir. Confira o painel de diagnóstico abaixo:</p>
                            <div className="bg-slate-100 p-5 rounded-2xl w-full text-xs font-mono text-slate-600 space-y-2 border border-slate-200 shadow-inner">
                                <p className="text-sm font-black text-slate-800 mb-2 border-b border-slate-200 pb-2">🛠 Raio-X do Sistema</p>
                                <p><span className="font-bold">Total Recebido da API:</span> {debugInfo.linhasRecebidas} linhas.</p>
                                <p><span className="font-bold">Total Válido (&gt;0):</span> {debugInfo.linhasLimpas} linhas.</p>
                                <p className="text-[10px] break-all mt-2 text-slate-500"><span className="font-bold text-slate-700">Colunas Encontradas:</span> <br/>{debugInfo.colunasVistas}</p>
                                <div className="mt-4 bg-slate-800 text-green-400 p-3 rounded-lg overflow-hidden text-[10px]">
                                    {debugInfo.log.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                                </div>
                            </div>
                        </div>
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

            <div className="space-y-8">
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