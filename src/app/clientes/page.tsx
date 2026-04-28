"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, Users, UserX, UserPlus, AlertOctagon, 
  MapPin, X, MessageCircle, ShoppingBag, Printer, Download, Filter, Briefcase 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = "https://script.google.com/macros/s/AKfycbw81mirFOFVrPZUoCokzCcqW_EDrwL8DztfypKwlUrnSuJXjpmOBWi_gRbS5oXZhB-9/exec";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroVendedorPrincipal, setFiltroVendedorPrincipal] = useState("");
  const [loading, setLoading] = useState(true);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const [modalRelatorioOpen, setModalRelatorioOpen] = useState(false);
  const [filtroUF, setFiltroUF] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroStatusRelatorio, setFiltroStatusRelatorio] = useState("todos"); 
  const [filtroVendedorRelatorio, setFiltroVendedorRelatorio] = useState(""); 
  
  const [colunasRelatorio, setColunasRelatorio] = useState({
      fantasia: true,
      razao: true,
      cnpj: true,
      cidade: true,
      uf: true,
      vendedor: true,
      ultima_compra: true,
      recencia: true,
  });

  useEffect(() => {
    setMounted(true);
    fetchClientes();
  }, []);

// FUNÇÃO 100% LIMPA (Sem disparar o bloqueio CORS do Google)
  const fetchClientes = async () => {
    try {
      // O truque do timestamp continua para enganar o cache da Vercel
      const timestamp = new Date().getTime();
      
      // Chamada simples: sem o bloco { cache: ... } que irrita o Google
      const response = await fetch(`${API_URL}?path=clientes&t=${timestamp}`);
      
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

  const vendedoresDisponiveis = useMemo(() => {
      const vends = clientes.map(c => c.vendedor).filter(Boolean);
      return Array.from(new Set(vends)).sort();
  }, [clientes]);

  const stats = useMemo(() => {
    const total = clientes.length;
    const bloqueados = clientes.filter(c => c.bloqueado).length;
    
    const inativos = clientes.filter(c => {
      if (!c.ultima_compra) return false;
      const diffTime = Math.abs(new Date().getTime() - new Date(c.ultima_compra).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 365;
    }).length;

    const novos = clientes.filter(c => !c.ultima_compra).length;

    return { total, bloqueados, inativos, novos };
  }, [clientes]);

  const clientesFiltrados = clientes.filter(c => {
    const termo = busca.toLowerCase();
    const matchTexto = (c.razao && c.razao.toLowerCase().includes(termo)) ||
                       (c.fantasia && c.fantasia.toLowerCase().includes(termo)) ||
                       (c.cnpj && c.cnpj.toString().includes(termo));
    
    const matchVendedor = filtroVendedorPrincipal ? c.vendedor === filtroVendedorPrincipal : true;

    return matchTexto && matchVendedor;
  });

  const ufsDisponiveis = useMemo(() => {
      const ufs = clientes.map(c => c.uf).filter(Boolean);
      return Array.from(new Set(ufs)).sort();
  }, [clientes]);

  const cidadesDisponiveis = useMemo(() => {
      let clis = clientes;
      if (filtroUF) clis = clis.filter(c => c.uf === filtroUF);
      const cids = clis.map(c => c.cidade).filter(Boolean);
      return Array.from(new Set(cids)).sort();
  }, [clientes, filtroUF]);

  const getInitials = (name: string) => name ? name.substring(0, 2).toUpperCase() : "CL";
  
  const abrirWhats = (numero: string) => {
    if (!numero) return alert("Número não cadastrado");
    const limpo = numero.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/55${limpo}`, '_blank');
  };

  const calcularRecencia = (dataStr: string) => {
    if (!dataStr) return { dias: null, texto: "Sem registo" };
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

  const gerarRelatorioPDF = () => {
      const doc = new jsPDF({ orientation: "landscape" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text("RELATÓRIO DE CARTEIRA DE CLIENTES", 14, 15);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      let subTitulo = `Gerado em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`;
      if (filtroUF) subTitulo += ` | UF: ${filtroUF}`;
      if (filtroCidade) subTitulo += ` | Cidade: ${filtroCidade}`;
      if (filtroVendedorRelatorio) subTitulo += ` | Gerente: ${filtroVendedorRelatorio}`;
      if (filtroStatusRelatorio !== 'todos') subTitulo += ` | Filtro: ${filtroStatusRelatorio.toUpperCase()}`;
      doc.text(subTitulo, 14, 21);

      let dadosOrdenados = clientes.filter(c => {
          if (filtroUF && c.uf !== filtroUF) return false;
          if (filtroCidade && c.cidade !== filtroCidade) return false;
          if (filtroVendedorRelatorio && c.vendedor !== filtroVendedorRelatorio) return false; 
          
          if (filtroStatusRelatorio === 'bloqueados' && !c.bloqueado) return false;
          if (filtroStatusRelatorio === 'inativos') {
              if (!c.ultima_compra) return false; 
              const diffTime = Math.abs(new Date().getTime() - new Date(c.ultima_compra).getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays <= 365) return false;
          }
          if (filtroStatusRelatorio === 'novos' && c.ultima_compra) return false;
          
          return true;
      });

      dadosOrdenados.sort((a, b) => (a.fantasia || a.razao || "").localeCompare(b.fantasia || b.razao || ""));

      let headers = [];
      if (colunasRelatorio.fantasia) headers.push('Nome Fantasia');
      if (colunasRelatorio.razao) headers.push('Razão Social');
      if (colunasRelatorio.cnpj) headers.push('CNPJ');
      if (colunasRelatorio.cidade) headers.push('Cidade');
      if (colunasRelatorio.uf) headers.push('UF');
      if (colunasRelatorio.vendedor) headers.push('Representante');
      if (colunasRelatorio.ultima_compra) headers.push('Últ. Compra');
      if (colunasRelatorio.recencia) headers.push('Status/Recência');

      const tableBody = dadosOrdenados.map(c => {
          let row: any[] = [];
          if (colunasRelatorio.fantasia) row.push(c.fantasia || '-');
          if (colunasRelatorio.razao) row.push(c.razao || '-');
          if (colunasRelatorio.cnpj) row.push(c.cnpj || '-');
          if (colunasRelatorio.cidade) row.push(c.cidade || '-');
          if (colunasRelatorio.uf) row.push(c.uf || '-');
          if (colunasRelatorio.vendedor) row.push(c.vendedor || '-');
          
          if (colunasRelatorio.ultima_compra) {
              row.push(c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString('pt-BR') : 'Sem registo');
          }

          if (colunasRelatorio.recencia) {
              if (c.bloqueado) {
                  row.push({ content: 'BLOQUEADO', styles: { textColor: [220, 38, 38], fontStyle: 'bold' }});
              } else if (!c.ultima_compra) {
                  row.push({ content: 'NOVO/SEM HIST', styles: { textColor: [22, 163, 74], fontStyle: 'bold' }});
              } else {
                  const rec = calcularRecencia(c.ultima_compra);
                  const isCritical = rec.dias && rec.dias > 365;
                  row.push({ content: rec.texto, styles: { textColor: isCritical ? [234, 88, 12] : [71, 85, 105], fontStyle: isCritical ? 'bold' : 'normal' }});
              }
          }
          return row;
      });

      autoTable(doc, {
          startY: 28,
          head: [headers],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 2, textColor: 60 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`Relatorio_Clientes_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
      setModalRelatorioOpen(false);
  };

  return (
    <div className="p-3 md:p-6 bg-slate-50 min-h-screen font-sans text-slate-800 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Carteira de Clientes</h1>
              <p className="text-xs md:text-sm text-slate-500 mt-1">Gestão de relacionamento e monitoramento de inatividade.</p>
          </div>
          <button 
              onClick={() => setModalRelatorioOpen(true)} 
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white px-5 py-3 sm:py-2.5 rounded-xl font-bold shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
          >
              <Printer size={18} /> Relatório PDF
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
             <div className="p-2 md:p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0"><Users className="w-5 h-5 md:w-6 md:h-6"/></div>
             <div className="min-w-0">
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase truncate">Total Clientes</p>
                <p className="text-xl md:text-2xl font-black text-slate-800">{loading ? '-' : stats.total}</p>
             </div>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
             <div className="p-2 md:p-3 bg-red-50 text-red-600 rounded-xl shrink-0"><AlertOctagon className="w-5 h-5 md:w-6 md:h-6"/></div>
             <div className="min-w-0">
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase truncate">Bloqueados</p>
                <p className="text-xl md:text-2xl font-black text-slate-800">{loading ? '-' : stats.bloqueados}</p>
             </div>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
             <div className="p-2 md:p-3 bg-orange-50 text-orange-600 rounded-xl shrink-0"><UserX className="w-5 h-5 md:w-6 md:h-6"/></div>
             <div className="min-w-0">
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase truncate">Inativos (+1 ano)</p>
                <p className="text-xl md:text-2xl font-black text-slate-800">{loading ? '-' : stats.inativos}</p>
             </div>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
             <div className="p-2 md:p-3 bg-green-50 text-green-600 rounded-xl shrink-0"><UserPlus className="w-5 h-5 md:w-6 md:h-6"/></div>
             <div className="min-w-0">
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase truncate">Novos / S. Hist.</p>
                <p className="text-xl md:text-2xl font-black text-slate-800">{loading ? '-' : stats.novos}</p>
             </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Buscar por Nome, Razão Social ou CNPJ..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 md:py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:border-green-500 outline-none text-base md:text-lg font-medium transition"
            />
            <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
          </div>
          
          <div className="w-full md:w-72 shrink-0">
             <select 
                 value={filtroVendedorPrincipal} 
                 onChange={(e) => setFiltroVendedorPrincipal(e.target.value)}
                 className="w-full p-3.5 md:p-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:border-green-500 outline-none text-sm font-bold text-slate-600 cursor-pointer appearance-none"
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em' }}
             >
                 <option value="">Todos os Gerentes de Conta</option>
                 {vendedoresDisponiveis.map(v => <option key={v} value={v}>{v}</option>)}
             </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-slate-200 rounded-2xl"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientesFiltrados.map((cli, index) => {
              const recencia = calcularRecencia(cli.ultima_compra);
              const alerta = recencia.dias && recencia.dias > 60;

              return (
                <div 
                  key={index} 
                  onClick={() => setClienteSelecionado(cli)}
                  className={`group bg-white rounded-2xl p-4 md:p-5 border shadow-sm cursor-pointer hover:shadow-lg hover:border-green-400 transition-all flex flex-col justify-between h-full relative overflow-hidden ${
                    cli.bloqueado ? 'border-l-8 border-l-red-500' : 'border-l-8 border-l-green-500'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-bold text-base md:text-lg shadow-sm flex-shrink-0 ${
                      cli.bloqueado ? 'bg-red-500' : 'bg-slate-800'
                    }`}>
                      {getInitials(cli.fantasia || cli.razao)}
                    </div>
                    <div className="overflow-hidden min-w-0">
                      <h3 className="text-base md:text-lg font-bold text-slate-800 leading-tight truncate" title={cli.fantasia || cli.razao}>
                        {cli.fantasia || cli.razao}
                      </h3>
                      <p className="text-[10px] md:text-xs text-slate-500 truncate flex items-center gap-1 mt-1">
                        <MapPin size={10} className="shrink-0"/> <span className="truncate">{cli.cidade} - {cli.uf}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-50 pt-3">
                      <span className="text-[10px] font-mono text-slate-400">{cli.cnpj}</span>
                      {cli.ultima_compra ? (
                        <div className={`text-[10px] md:text-xs font-bold px-2 py-1 rounded-lg ${alerta ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                          📅 {recencia.texto}
                        </div>
                      ) : (
                        <div className="text-[10px] md:text-xs font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-600">Novo / Sem Compra</div>
                      )}
                  </div>
                </div>
              );
            })}
            
            {clientesFiltrados.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white">
                    <p className="text-slate-500 font-medium">Nenhum cliente encontrado para os filtros selecionados.</p>
                </div>
            )}
          </div>
        )}

        {modalRelatorioOpen && mounted && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-end md:items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200 md:p-4">
             <div className="bg-white w-full max-w-3xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200 border border-slate-100 max-h-[90vh] flex flex-col">
                <div className="bg-slate-800 p-5 md:p-6 flex justify-between items-center text-white shrink-0">
                   <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Filter size={20}/> Relatório de Clientes</h2>
                   <button onClick={() => setModalRelatorioOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition"><X size={20}/></button>
                </div>
                
                <div className="p-5 md:p-8 overflow-y-auto custom-scrollbar flex-1">
                   <h3 className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-wider mb-4">1. Filtrar Dados</h3>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div>
                          <label className="text-[10px] md:text-xs font-bold text-slate-500 mb-1.5 block">Gerente de Conta</label>
                          <select 
                              value={filtroVendedorRelatorio} 
                              onChange={(e) => setFiltroVendedorRelatorio(e.target.value)}
                              className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 outline-none focus:border-blue-500"
                          >
                              <option value="">Todos</option>
                              {vendedoresDisponiveis.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-[10px] md:text-xs font-bold text-slate-500 mb-1.5 block">Estado (UF)</label>
                          <select 
                              value={filtroUF} 
                              onChange={(e) => { setFiltroUF(e.target.value); setFiltroCidade(""); }}
                              className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 outline-none focus:border-blue-500"
                          >
                              <option value="">Todas as UFs</option>
                              {ufsDisponiveis.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-[10px] md:text-xs font-bold text-slate-500 mb-1.5 block">Cidade</label>
                          <select 
                              value={filtroCidade} 
                              onChange={(e) => setFiltroCidade(e.target.value)}
                              className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 outline-none focus:border-blue-500 disabled:opacity-50"
                              disabled={!filtroUF}
                          >
                              <option value="">Todas as Cidades</option>
                              {cidadesDisponiveis.map(cid => <option key={cid} value={cid}>{cid}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-[10px] md:text-xs font-bold text-slate-500 mb-1.5 block">Status</label>
                          <select 
                              value={filtroStatusRelatorio} 
                              onChange={(e) => setFiltroStatusRelatorio(e.target.value)}
                              className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 outline-none focus:border-blue-500"
                          >
                              <option value="todos">Todos</option>
                              <option value="ativos">Apenas Ativos</option>
                              <option value="inativos">Inativos (+1 ano)</option>
                              <option value="bloqueados">Bloqueados</option>
                              <option value="novos">Novos (Sem Compra)</option>
                          </select>
                      </div>
                   </div>

                   <h3 className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-wider mb-4 border-t border-slate-100 pt-6">2. Colunas do Relatório</h3>
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {Object.keys(colunasRelatorio).map((key) => {
                          const label = key === 'ultima_compra' ? 'Última Compra' : key === 'recencia' ? 'Status/Dias' : key;
                          return (
                              <label key={key} className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                                  <input 
                                      type="checkbox" 
                                      checked={(colunasRelatorio as any)[key]} 
                                      onChange={(e) => setColunasRelatorio({...colunasRelatorio, [key]: e.target.checked})}
                                      className="w-4 h-4 md:w-5 md:h-5 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-xs md:text-sm font-bold text-slate-700 capitalize truncate">{label}</span>
                              </label>
                          )
                      })}
                   </div>
                </div>

                <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 pb-8 sm:pb-6">
                   <button onClick={() => setModalRelatorioOpen(false)} className="w-full sm:w-auto px-6 py-3.5 sm:py-3 font-bold text-slate-500 bg-white sm:bg-transparent border border-slate-200 sm:border-transparent hover:bg-slate-200 rounded-xl transition text-sm">Cancelar</button>
                   <button onClick={gerarRelatorioPDF} className="w-full sm:w-auto bg-green-600 text-white px-8 py-3.5 sm:py-3 rounded-xl text-sm font-black hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg hover:shadow-green-200 transition transform active:scale-95">
                      <Download size={18}/> Extrair PDF
                   </button>
                </div>
             </div>
          </div>, document.body
        )}

        {clienteSelecionado && mounted && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-end md:items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200 md:p-4">
            <div className="absolute inset-0" onClick={() => setClienteSelecionado(null)}></div>

            <div className="bg-white w-full md:max-w-5xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] md:max-h-[90vh] relative z-10 animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200">
              
              <div className="bg-slate-800 p-5 md:p-6 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                   <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg md:text-xl shrink-0">
                     {getInitials(clienteSelecionado.fantasia)}
                   </div>
                   <div className="min-w-0">
                     <h2 className="text-lg md:text-2xl font-black leading-none truncate">{clienteSelecionado.fantasia}</h2>
                     <p className="text-slate-400 text-xs md:text-sm mt-1 font-mono truncate">{clienteSelecionado.razao}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setClienteSelecionado(null)} 
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition shrink-0 ml-2"
                >
                  <X size={20}/>
                </button>
              </div>

              <div className="p-4 md:p-8 overflow-y-auto custom-scrollbar bg-slate-50 flex-1">
                
                {clienteSelecionado.bloqueado && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-3 md:p-4 rounded-xl mb-4 md:mb-6 flex items-center gap-3">
                    <AlertOctagon size={24} className="shrink-0"/>
                    <div>
                      <strong className="block text-xs md:text-sm">BLOQUEADO ADMINISTRATIVAMENTE</strong>
                      <p className="text-[10px] md:text-xs mt-0.5">{clienteSelecionado.motivoBloqueio}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                  <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">CNPJ</label>
                    <p className="text-sm font-mono font-bold text-slate-700 truncate" title={clienteSelecionado.cnpj}>{clienteSelecionado.cnpj}</p>
                  </div>
                  <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Gerente de Conta</label>
                    <p className="text-sm font-bold text-blue-600 truncate flex items-center gap-1.5"><Briefcase size={14}/> {clienteSelecionado.vendedor || "---"}</p>
                  </div>
                  <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Localização</label>
                    <p className="text-xs md:text-sm font-bold text-slate-700 truncate">{clienteSelecionado.cidade} - {clienteSelecionado.uf}</p>
                  </div>
                  <div className={`p-3 md:p-4 rounded-xl border shadow-sm ${clienteSelecionado.ultima_compra ? 'bg-white border-slate-200' : 'bg-slate-100 border-transparent'}`}>
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Última Compra</label>
                    {clienteSelecionado.ultima_compra ? (
                      <div>
                        <p className="text-xs md:text-sm font-black text-slate-800">{new Date(clienteSelecionado.ultima_compra).toLocaleDateString('pt-BR')}</p>
                        <p className={`text-[9px] md:text-[10px] font-bold mt-0.5 ${calcularRecencia(clienteSelecionado.ultima_compra).dias! > 60 ? 'text-red-500' : 'text-green-600'}`}>
                          {calcularRecencia(clienteSelecionado.ultima_compra).texto}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs md:text-sm text-slate-400 italic">Nunca comprou</p>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 mb-6 md:mb-8 shadow-sm flex items-start gap-3">
                    <MapPin className="text-slate-400 mt-0.5 shrink-0" size={18}/>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Endereço de Entrega</label>
                      <p className="text-xs md:text-sm font-medium text-slate-700">{clienteSelecionado.endereco || "Endereço não cadastrado na base"}</p>
                    </div>
                </div>

                <h3 className="text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2">
                  <ShoppingBag size={18} className="text-green-600"/> Histórico de Pedidos
                  <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] md:text-xs align-middle">
                    {clienteSelecionado.historico_compras?.length || 0}
                  </span>
                </h3>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="max-h-60 md:max-h-80 overflow-y-auto overflow-x-auto custom-scrollbar">
                    <table className="w-full text-xs md:text-sm text-left min-w-[400px]">
                      <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] md:text-xs uppercase sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="p-3 md:p-4 bg-slate-50">Data</th>
                          <th className="p-3 md:p-4 bg-slate-50 w-1/2">Produto / Insumo</th>
                          <th className="p-3 md:p-4 bg-slate-50 text-center">Qtd</th>
                          <th className="p-3 md:p-4 bg-slate-50 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {clienteSelecionado.historico_compras && clienteSelecionado.historico_compras.length > 0 ? (
                          clienteSelecionado.historico_compras.map((compra: any, idx: number) => {
                            const [ano, mes] = compra.data.split('-');
                            return (
                              <tr key={idx} className="hover:bg-blue-50 transition-colors">
                                <td className="p-3 md:p-4 font-mono text-slate-500 whitespace-nowrap">{mes}/{ano}</td>
                                <td className="p-3 md:p-4 font-bold text-slate-700 leading-tight">{compra.produto}</td>
                                <td className="p-3 md:p-4 text-center text-slate-600 font-medium">{compra.qtd}</td>
                                <td className="p-3 md:p-4 text-right font-mono text-green-700 font-bold whitespace-nowrap">
                                  {formatarMoeda(compra.valor)}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-6 md:p-8 text-center text-slate-400 italic">
                              Nenhum pedido encontrado no histórico importado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              <div className="p-4 md:p-5 bg-white border-t border-slate-200 flex flex-col-reverse md:flex-row gap-3 shrink-0 pb-8 md:pb-5">
                <button 
                  onClick={() => setClienteSelecionado(null)}
                  className="w-full md:w-auto px-8 py-3.5 md:py-3 rounded-xl border border-slate-200 md:border-2 md:border-slate-100 text-slate-600 font-bold hover:bg-slate-50 transition text-sm"
                >
                  Fechar
                </button>
                <button 
                  onClick={() => {
                      const num = prompt("Digite o telemóvel (apenas números):", clienteSelecionado.whatsapp || "");
                      if(num) abrirWhats(num);
                  }}
                  className="w-full md:flex-1 bg-green-600 hover:bg-green-700 text-white py-3.5 md:py-3 rounded-xl font-bold shadow-lg hover:shadow-green-200 transition transform active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                >
                  <MessageCircle size={18}/> Conversar no WhatsApp
                </button>
              </div>

            </div>
          </div>,
          document.body
        )}

      </div>
    </div>
  );
}