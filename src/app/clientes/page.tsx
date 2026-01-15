"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom'; // O segredo para o modal funcionar
import { 
  Search, Users, UserX, UserPlus, AlertOctagon, 
  MapPin, X, MessageCircle, ShoppingBag 
} from 'lucide-react';

const API_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // Garante que estamos no navegador para usar o Portal
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const response = await fetch(`${API_URL}?path=clientes`);
      const json = await response.json();
      if (json.success && Array.isArray(json.data)) {
        setClientes(json.data);
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CÁLCULOS DO DASHBOARD ---
  const stats = useMemo(() => {
    const total = clientes.length;
    const bloqueados = clientes.filter(c => c.bloqueado).length;
    
    // Inativos: Data de compra > 365 dias atrás
    const inativos = clientes.filter(c => {
      if (!c.ultima_compra) return false;
      const diffTime = Math.abs(new Date().getTime() - new Date(c.ultima_compra).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 365;
    }).length;

    // Novos: Sem data de última compra (considerados prospects ou recém cadastrados)
    const novos = clientes.filter(c => !c.ultima_compra).length;

    return { total, bloqueados, inativos, novos };
  }, [clientes]);

  // Filtro de busca
  const clientesFiltrados = clientes.filter(c => {
    const termo = busca.toLowerCase();
    return (
      (c.razao && c.razao.toLowerCase().includes(termo)) ||
      (c.fantasia && c.fantasia.toLowerCase().includes(termo)) ||
      (c.cnpj && c.cnpj.toString().includes(termo))
    );
  });

  const getInitials = (name: string) => name ? name.substring(0, 2).toUpperCase() : "CL";
  
  const abrirWhats = (numero: string) => {
    if (!numero) return alert("Número não cadastrado");
    const limpo = numero.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/55${limpo}`, '_blank');
  };

  const calcularRecencia = (dataStr: string) => {
    if (!dataStr) return { dias: null, texto: "Sem registro" };
    const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(dataStr).getTime()) / (1000 * 60 * 60 * 24)); 
    return { dias: diffDays, texto: `${diffDays} dias sem comprar` };
  };

  const formatarMoeda = (valor: any) => {
    if (!valor) return "-";
    if (typeof valor === 'number') return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    let limpo = valor.toString().replace("R$", "").trim();
    if (limpo.includes(',') && limpo.includes('.')) limpo = limpo.replace(/\./g, '').replace(',', '.'); 
    else if (limpo.includes(',')) limpo = limpo.replace(',', '.');
    const numero = parseFloat(limpo);
    return isNaN(numero) ? "R$ 0,00" : numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER E TÍTULO */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Carteira de Clientes</h1>
          <p className="text-slate-500">Gestão de relacionamento e monitoramento de inatividade.</p>
        </div>

        {/* --- MINI DASHBOARD (NOVO) --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24}/></div>
             <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Total Clientes</p>
                <p className="text-2xl font-black text-slate-800">{loading ? '-' : stats.total}</p>
             </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-red-50 text-red-600 rounded-xl"><AlertOctagon size={24}/></div>
             <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Bloqueados</p>
                <p className="text-2xl font-black text-slate-800">{loading ? '-' : stats.bloqueados}</p>
             </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><UserX size={24}/></div>
             <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Inativos (+1 ano)</p>
                <p className="text-2xl font-black text-slate-800">{loading ? '-' : stats.inativos}</p>
             </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-green-50 text-green-600 rounded-xl"><UserPlus size={24}/></div>
             <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Novos / Sem Hist.</p>
                <p className="text-2xl font-black text-slate-800">{loading ? '-' : stats.novos}</p>
             </div>
          </div>
        </div>

        {/* BARRA DE BUSCA */}
        <div className="relative w-full mb-6">
          <input 
            type="text" 
            placeholder="Buscar por Nome, Razão Social ou CNPJ..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:border-green-500 outline-none text-lg font-medium transition"
          />
          <Search size={24} className="absolute left-4 top-4 text-slate-300" />
        </div>

        {/* LISTA DE CARDS */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-slate-200 rounded-2xl"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientesFiltrados.map((cli, index) => {
              const recencia = calcularRecencia(cli.ultima_compra);
              const alerta = recencia.dias && recencia.dias > 60; // Alerta se > 60 dias

              return (
                <div 
                  key={index} 
                  onClick={() => setClienteSelecionado(cli)}
                  className={`group bg-white rounded-2xl p-5 border shadow-sm cursor-pointer hover:shadow-lg hover:border-green-400 transition-all flex flex-col justify-between h-full relative overflow-hidden ${
                    cli.bloqueado ? 'border-l-8 border-l-red-500' : 'border-l-8 border-l-green-500'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0 ${
                      cli.bloqueado ? 'bg-red-500' : 'bg-slate-800'
                    }`}>
                      {getInitials(cli.fantasia || cli.razao)}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-lg font-bold text-slate-800 leading-tight truncate" title={cli.fantasia || cli.razao}>
                        {cli.fantasia || cli.razao}
                      </h3>
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-1">
                        <MapPin size={10}/> {cli.cidade} - {cli.uf}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-50 pt-3">
                      <span className="text-[10px] font-mono text-slate-400">{cli.cnpj}</span>
                      {cli.ultima_compra ? (
                        <div className={`text-xs font-bold px-2 py-1 rounded-lg ${alerta ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                          📅 {recencia.texto}
                        </div>
                      ) : (
                        <div className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-600">Novo / Sem Compra</div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- MODAL TELETRANSPORTADO (PORTAL) --- */}
        {clienteSelecionado && mounted && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Overlay Click para fechar */}
            <div className="absolute inset-0" onClick={() => setClienteSelecionado(null)}></div>

            <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10 animate-in zoom-in-95 duration-200">
              
              {/* CABEÇALHO MODAL */}
              <div className="bg-slate-800 p-6 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-bold text-xl">
                     {getInitials(clienteSelecionado.fantasia)}
                   </div>
                   <div>
                     <h2 className="text-2xl font-black leading-none">{clienteSelecionado.fantasia}</h2>
                     <p className="text-slate-400 text-sm mt-1 font-mono">{clienteSelecionado.razao}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setClienteSelecionado(null)} 
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
                >
                  <X size={24}/>
                </button>
              </div>

              {/* CONTEÚDO MODAL */}
              <div className="p-8 overflow-y-auto custom-scrollbar bg-slate-50 flex-1">
                
                {/* ALERTA BLOQUEIO */}
                {clienteSelecionado.bloqueado && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl mb-6 flex items-center gap-3">
                    <AlertOctagon size={24}/>
                    <div>
                      <strong className="block text-sm">BLOQUEADO ADMINISTRATIVAMENTE</strong>
                      <p className="text-xs">{clienteSelecionado.motivoBloqueio}</p>
                    </div>
                  </div>
                )}

                {/* GRID INFO */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">CNPJ</label>
                    <p className="text-sm font-mono font-bold text-slate-700 truncate" title={clienteSelecionado.cnpj}>{clienteSelecionado.cnpj}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Representante</label>
                    <p className="text-sm font-bold text-blue-600 truncate">{clienteSelecionado.vendedor || "---"}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Localização</label>
                    <p className="text-sm font-bold text-slate-700 truncate">{clienteSelecionado.cidade} - {clienteSelecionado.uf}</p>
                  </div>
                  <div className={`p-4 rounded-xl border shadow-sm ${clienteSelecionado.ultima_compra ? 'bg-white border-slate-200' : 'bg-slate-100 border-transparent'}`}>
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Última Compra</label>
                    {clienteSelecionado.ultima_compra ? (
                      <div>
                        <p className="text-sm font-black text-slate-800">{new Date(clienteSelecionado.ultima_compra).toLocaleDateString('pt-BR')}</p>
                        <p className={`text-[10px] font-bold mt-0.5 ${calcularRecencia(clienteSelecionado.ultima_compra).dias! > 60 ? 'text-red-500' : 'text-green-600'}`}>
                          {calcularRecencia(clienteSelecionado.ultima_compra).texto}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Nunca comprou</p>
                    )}
                  </div>
                </div>

                {/* ENDEREÇO */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 mb-8 shadow-sm flex items-start gap-3">
                    <MapPin className="text-slate-400 mt-1" size={20}/>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Endereço de Entrega</label>
                      <p className="text-sm font-medium text-slate-700">{clienteSelecionado.endereco || "Endereço não cadastrado na base"}</p>
                    </div>
                </div>

                {/* HISTÓRICO */}
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <ShoppingBag size={20} className="text-green-600"/> Histórico de Pedidos
                  <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs align-middle">
                    {clienteSelecionado.historico_compras?.length || 0}
                  </span>
                </h3>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="p-4 bg-slate-50">Data</th>
                          <th className="p-4 bg-slate-50 w-1/2">Produto / Insumo</th>
                          <th className="p-4 bg-slate-50 text-center">Qtd</th>
                          <th className="p-4 bg-slate-50 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {clienteSelecionado.historico_compras && clienteSelecionado.historico_compras.length > 0 ? (
                          clienteSelecionado.historico_compras.map((compra: any, idx: number) => {
                            const [ano, mes] = compra.data.split('-');
                            return (
                              <tr key={idx} className="hover:bg-blue-50 transition-colors">
                                <td className="p-4 font-mono text-slate-500">{mes}/{ano}</td>
                                <td className="p-4 font-bold text-slate-700">{compra.produto}</td>
                                <td className="p-4 text-center text-slate-600 font-medium">{compra.qtd}</td>
                                <td className="p-4 text-right font-mono text-green-700 font-bold">
                                  {formatarMoeda(compra.valor)}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                              Nenhum pedido encontrado no histórico importado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* ACTIONS */}
              <div className="p-5 bg-white border-t border-slate-200 flex gap-4 shrink-0">
                <button 
                  onClick={() => setClienteSelecionado(null)}
                  className="px-8 py-3 rounded-xl border-2 border-slate-100 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Fechar
                </button>
                <button 
                  onClick={() => {
                      const num = prompt("Digite o celular (apenas números):", clienteSelecionado.whatsapp || "");
                      if(num) abrirWhats(num);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-green-200 transition transform active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <MessageCircle size={20}/> Iniciar Conversa no WhatsApp
                </button>
              </div>

            </div>
          </div>,
          document.body // <-- AQUI É O PULO DO GATO: Renderiza direto no body
        )}

      </div>
    </div>
  );
}