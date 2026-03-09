"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  CalendarCheck, Search, Printer, AlertCircle, Clock, MapPin, 
  Building2, Edit, MessageCircle, X, FileText, ChevronRight, 
  Activity, Save, Beaker, ChevronDown, Check
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_PRODUTOS_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";
const API_CLIENTES_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

const ESTAGIOS = [
  { id: 'agendado', label: 'Planejado / Agendado', color: 'border-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  { id: 'realizado', label: 'Visita Realizada', color: 'border-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
  { id: 'followup', label: 'Aguardando Follow-up', color: 'border-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
  { id: 'concluido', label: 'Ciclo Concluído', color: 'border-green-500', text: 'text-green-700', bg: 'bg-green-50' }
];

export default function PipelinePDPage() {
  const supabase = createClientComponentClient();
  
  const [visitas, setVisitas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [mounted, setMounted] = useState(false);

  // Estados do Modal de Edição Rápida
  const [modalAberto, setModalAberto] = useState(false);
  const [visitaEditando, setVisitaEditando] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);

  // Bases da API
  const [produtosApi, setProdutosApi] = useState<string[]>([]);
  const [baseFarmaciasApi, setBaseFarmaciasApi] = useState<any[]>([]);

  // Controles de Dropdown na edição
  const [termoProdutoDropdown, setTermoProdutoDropdown] = useState("");
  const [dropdownProdutosAberto, setDropdownProdutosAberto] = useState(false);
  const [farmaciasBuscadas, setFarmaciasBuscadas] = useState<any[]>([]);
  const [dropdownFarmaciaAberto, setDropdownFarmaciaAberto] = useState(false);

  useEffect(() => {
    setMounted(true);
    carregarVisitas();
    carregarListaProdutos();
    carregarBaseFarmacias();
  }, []);

  const carregarListaProdutos = async () => {
    try {
        const res = await fetch(`${API_PRODUTOS_URL}?path=produtos`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            const listaNomes = json.data.map((p: any) => p.ativo?.trim()).filter(Boolean);
            setProdutosApi(Array.from(new Set(listaNomes)).sort() as string[]);
        }
    } catch (e) { console.error("Erro API Produtos:", e); }
  };

  const carregarBaseFarmacias = async () => {
    try {
        const res = await fetch(`${API_CLIENTES_URL}?path=clientes`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            setBaseFarmaciasApi(json.data);
        }
    } catch (e) { console.error("Erro API Farmácias:", e); }
  };

  const carregarVisitas = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Puxa as interações GLOBALMENTE (Fim da visão de túnel)
      const { data, error } = await supabase.from('interacoes')
          .select('*, prescritores(nome, especialidade, clinica, cidade, uf, telefone), perfis(nome)')
          .order('data_proximo_contato', { ascending: true, nullsFirst: false });
      
      if (error) throw error;

      const formatadas = (data || []).map(v => ({ ...v, status: v.status || 'realizado' }));
      setVisitas(formatadas);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const mudarStatus = async (id: string, novoStatus: string) => {
      setVisitas(visitas.map(v => v.id === id ? { ...v, status: novoStatus } : v));
      await supabase.from('interacoes').update({ status: novoStatus }).eq('id', id);
  };

  const abrirEdicaoVisita = (visita: any) => {
      setVisitaEditando({
          ...visita,
          tipo: visita.tipo || 'Visita Presencial',
          status: visita.status || 'realizado',
          resumo: visita.resumo || '',
          proximo_passo: visita.proximo_passo || '',
          data_proximo_contato: visita.data_proximo_contato || '',
          farmacia_vinculada: visita.farmacia_vinculada || '',
          produtos_vinculados_array: visita.produtos_vinculados ? visita.produtos_vinculados.split(';').filter(Boolean) : []
      });
      setModalAberto(true);
  };

  const buscarFarmaciaInteligente = (termo: string) => {
      setVisitaEditando({...visitaEditando, farmacia_vinculada: termo});
      setDropdownFarmaciaAberto(true);
      
      if (termo.length > 2) {
          const termoLimpo = termo.toLowerCase().trim();
          const termoNum = termo.replace(/\D/g, '');

          const filtradas = baseFarmaciasApi.filter(f => {
              const fantasia = String(f.fantasia || f.nome_fantasia || '').toLowerCase();
              const razao = String(f.razao_social || f.cliente || '').toLowerCase();
              const cnpj = String(f.cnpj || f.documento || '').replace(/\D/g, '');

              return fantasia.includes(termoLimpo) || razao.includes(termoLimpo) || (termoNum && cnpj.includes(termoNum));
          }).slice(0, 10);

          const formatadas = filtradas.map(f => ({
              nome: f.fantasia || f.nome_fantasia || f.razao_social || 'Desconhecida',
              documento: f.cnpj || f.documento || ''
          }));

          setFarmaciasBuscadas(formatadas);
      } else {
          setFarmaciasBuscadas([]);
      }
  };

  const toggleAtivoEdit = (ativo: string) => {
      const atual = visitaEditando.produtos_vinculados_array || [];
      if (atual.includes(ativo)) {
          setVisitaEditando({...visitaEditando, produtos_vinculados_array: atual.filter((a:string) => a !== ativo)});
      } else {
          setVisitaEditando({...visitaEditando, produtos_vinculados_array: [...atual, ativo]});
      }
      setTermoProdutoDropdown("");
  };

  const salvarEdicaoVisita = async (e: React.FormEvent) => {
      e.preventDefault();
      setSalvando(true);
      try {
          await supabase.from('interacoes').update({
              tipo: visitaEditando.tipo,
              resumo: visitaEditando.resumo,
              proximo_passo: visitaEditando.proximo_passo,
              farmacia_vinculada: visitaEditando.farmacia_vinculada,
              produtos_vinculados: visitaEditando.produtos_vinculados_array.join(';'),
              data_proximo_contato: visitaEditando.data_proximo_contato || null,
              status: visitaEditando.status
          }).eq('id', visitaEditando.id);

          setModalAberto(false);
          carregarVisitas();
      } catch (err) {
          alert("Erro ao atualizar visita.");
      } finally {
          setSalvando(false);
      }
  };

  const gerarRelatorioGerencial = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    try { doc.addImage("/logo.png", "PNG", 14, 10, 35, 15); } 
    catch (e) { try { doc.addImage("/logo.jpg", "JPEG", 14, 10, 35, 15); } catch (err) {} }

    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(20, 83, 45); 
    doc.text("RELATÓRIO DE PERFORMANCE DE P&D", 14, 34); 
    
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(100);
    doc.text(`Visitas Extraídas: ${filtradas.length} | Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 40);

    const tableBody = filtradas.map(v => [
        new Date(v.created_at).toLocaleDateString('pt-BR'),
        v.prescritores?.nome || 'N/D',
        v.tipo || '-',
        v.farmacia_vinculada || '-',
        v.produtos_vinculados ? String(v.produtos_vinculados).replace(/;/g, ', ') : '-',
        ESTAGIOS.find(e => e.id === v.status)?.label || v.status
    ]);

    autoTable(doc, {
        startY: 46,
        head: [['DATA INSERÇÃO', 'PRESCRITOR', 'TIPO DE CONTATO', 'FARMÁCIA INDICADA', 'ATIVOS TRABALHADOS', 'STATUS DO CICLO']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [20, 83, 45], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
    });

    doc.save(`Relatorio_Visitas_PD_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const isAtrasado = (dataISO: string) => {
      if (!dataISO) return false;
      const hoje = new Date().toISOString().split('T')[0];
      return dataISO < hoje;
  };

  const filtradas = visitas.filter(v => {
      const t = busca.toLowerCase();
      return (
          (v.prescritores?.nome && String(v.prescritores.nome).toLowerCase().includes(t)) ||
          (v.farmacia_vinculada && String(v.farmacia_vinculada).toLowerCase().includes(t)) ||
          (v.produtos_vinculados && String(v.produtos_vinculados).toLowerCase().includes(t)) ||
          (v.resumo && String(v.resumo).toLowerCase().includes(t))
      );
  });

  return (
    <div className="p-4 w-full h-[calc(100vh-64px)] flex flex-col font-sans">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
            <h1 className="text-2xl font-black text-[#0f392b] tracking-tight flex items-center gap-2">
                <CalendarCheck className="text-[#82D14D]"/> Pipeline de Visitação P&D
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Gerencie e avance as etapas das suas visitas médicas.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
                <input type="text" placeholder="Buscar médico, farmácia, ativo..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 shadow-sm" value={busca} onChange={(e) => setBusca(e.target.value)} />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <button onClick={gerarRelatorioGerencial} className="bg-[#0f392b] hover:bg-[#16503c] text-white px-4 py-2.5 rounded-xl font-bold shadow-lg transition active:scale-95 flex items-center gap-2 whitespace-nowrap text-sm">
                <Printer size={16} /> Relatório PDF
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 h-full min-w-max">
              {ESTAGIOS.map(estagio => {
                  const visitasColuna = filtradas.filter(v => v.status === estagio.id);
                  
                  return (
                      <div key={estagio.id} className="w-80 bg-slate-100/50 rounded-2xl border border-slate-200 flex flex-col h-full overflow-hidden">
                          <div className={`p-4 border-b-4 ${estagio.color} bg-white flex justify-between items-center shadow-sm shrink-0`}>
                              <h3 className={`font-black text-xs uppercase tracking-widest ${estagio.text}`}>{estagio.label}</h3>
                              <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-lg">{visitasColuna.length}</span>
                          </div>

                          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                              {visitasColuna.map(visita => {
                                  const atrasado = isAtrasado(visita.data_proximo_contato) && estagio.id !== 'concluido';
                                  const telefone = visita.prescritores?.telefone;

                                  return (
                                      <div key={visita.id} className={`bg-white p-4 rounded-xl border shadow-sm transition hover:shadow-md flex flex-col ${atrasado ? 'border-red-300 bg-red-50/10' : 'border-slate-200 hover:border-blue-300'}`}>
                                          
                                          <div className="flex justify-between items-start mb-3">
                                              <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider border border-blue-100">{visita.tipo || '-'}</span>
                                              <div className="flex gap-2 items-center">
                                                  {telefone && (
                                                      <a href={`https://wa.me/55${telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-600 transition-colors p-1" title="Abrir WhatsApp">
                                                          <MessageCircle size={16} />
                                                      </a>
                                                  )}
                                                  <button onClick={() => abrirEdicaoVisita(visita)} className="text-slate-400 hover:text-blue-600 p-1 transition" title="Editar Visita"><Edit size={14}/></button>
                                              </div>
                                          </div>

                                          <h4 className="font-black text-slate-800 leading-tight mb-1 truncate" title={visita.prescritores?.nome}>{visita.prescritores?.nome || 'Médico Excluído'}</h4>
                                          <p className="text-[10px] text-slate-500 flex items-center gap-1 mb-3"><MapPin size={10}/> {visita.prescritores?.cidade || '-'} / {visita.prescritores?.uf || '-'}</p>

                                          <div className="space-y-1.5 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                              {visita.farmacia_vinculada ? (
                                                  <p className="text-[10px] font-bold text-slate-700 flex items-center gap-1 truncate"><Building2 size={12} className="text-blue-500"/> {visita.farmacia_vinculada}</p>
                                              ) : (
                                                  <p className="text-[10px] font-medium text-slate-400 italic">Sem farmácia vinculada</p>
                                              )}

                                              {visita.produtos_vinculados && (
                                                  <div className="flex flex-wrap gap-1 mt-1">
                                                      {String(visita.produtos_vinculados).split(';').filter(Boolean).map((p: string, i: number) => (
                                                          <span key={i} className="text-[8px] font-black bg-[#82D14D]/20 text-[#0f392b] px-1.5 py-0.5 rounded border border-[#82D14D]/40 uppercase truncate max-w-full">{p}</span>
                                                      ))}
                                                  </div>
                                              )}
                                          </div>
                                          
                                          {visita.data_proximo_contato && estagio.id !== 'concluido' && (
                                              <div className={`mt-1 mb-3 flex items-center gap-1 text-[10px] font-bold p-1.5 rounded border ${atrasado ? 'text-red-700 bg-red-100 border-red-200 animate-pulse' : 'text-orange-700 bg-orange-50 border-orange-100'}`}>
                                                  {atrasado ? <AlertCircle size={12}/> : <Clock size={12}/>} 
                                                  Follow-up: {new Date(visita.data_proximo_contato).toLocaleDateString('pt-BR', {timeZone:'UTC'})}
                                              </div>
                                          )}

                                          <div className="mt-auto pt-2 border-t border-slate-100">
                                              <select value={visita.status} onChange={(e) => mudarStatus(visita.id, e.target.value)} className="w-full text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none cursor-pointer hover:border-blue-400 transition">
                                                  {ESTAGIOS.map(e => <option key={e.id} value={e.id}>Mover para: {e.label}</option>)}
                                              </select>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>

      {modalAberto && visitaEditando && mounted && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
                  
                  <div className="bg-[#1e293b] p-6 flex justify-between items-center text-white shrink-0">
                      <div>
                          <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2"><Edit className="text-blue-400" size={20}/> Editar Histórico da Visita</h2>
                          <p className="text-sm font-medium text-slate-300 mt-1">{visitaEditando.prescritores?.nome || 'Médico'}</p>
                      </div>
                      <button type="button" onClick={() => setModalAberto(false)} className="hover:bg-white/20 p-2 rounded-full transition bg-white/10"><X size={20}/></button>
                  </div>

                  <form onSubmit={salvarEdicaoVisita} className="p-6 md:p-8 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Tipo de Contato</label>
                              <select value={visitaEditando.tipo} onChange={e => setVisitaEditando({...visitaEditando, tipo: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                  <option value="Visita Presencial">Visita Presencial</option>
                                  <option value="Apresentação Online">Apresentação Online</option>
                                  <option value="Evento / Congresso">Evento / Congresso</option>
                                  <option value="WhatsApp/Telefone">WhatsApp / Telefone</option>
                                  <option value="Outros">Outros</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Status no Pipeline</label>
                              <select value={visitaEditando.status} onChange={e => setVisitaEditando({...visitaEditando, status: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none text-blue-700">
                                  {ESTAGIOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                              </select>
                          </div>
                      </div>

                      {/* EDIÇÃO: PRODUTOS E FARMÁCIAS */}
                      <div className="relative">
                          <label className="text-xs font-bold text-slate-700 mb-1.5 block">Ativos Apresentados (Selecione da lista)</label>
                          <div className="min-h-[52px] w-full bg-white border border-slate-300 hover:border-blue-400 focus-within:border-blue-500 rounded-xl p-2 flex flex-wrap gap-2 items-center cursor-text transition shadow-sm" onClick={() => setDropdownProdutosAberto(true)}>
                              {visitaEditando.produtos_vinculados_array.length === 0 && !termoProdutoDropdown && (
                                  <span className="text-slate-400 font-medium px-2 absolute pointer-events-none text-sm">Ex: Lipoartich, Purim...</span>
                              )}
                              {visitaEditando.produtos_vinculados_array.map((ativo:string) => (
                                  <span key={ativo} className="bg-[#82D14D]/20 text-[#0f392b] border border-[#82D14D]/50 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 z-10">
                                      {ativo} <button type="button" onClick={(e) => { e.stopPropagation(); toggleAtivoEdit(ativo); }} className="hover:bg-[#82D14D]/50 rounded-full p-0.5"><X size={12}/></button>
                                  </span>
                              ))}
                              <input type="text" className="flex-1 bg-transparent outline-none min-w-[100px] p-1 text-slate-800 font-medium text-sm" value={termoProdutoDropdown} onChange={(e) => {setTermoProdutoDropdown(e.target.value); setDropdownProdutosAberto(true);}} onFocus={() => setDropdownProdutosAberto(true)} />
                              <ChevronDown size={18} className="text-slate-400 mr-2"/>
                          </div>
                          {dropdownProdutosAberto && (
                              <>
                                  <div className="fixed inset-0 z-30" onClick={() => setDropdownProdutosAberto(false)}></div>
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-40 p-1 custom-scrollbar">
                                      {produtosApi.filter(p => p.toLowerCase().includes(termoProdutoDropdown.toLowerCase())).map(produto => (
                                          <button type="button" key={produto} onClick={() => toggleAtivoEdit(produto)} className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-50 transition flex items-center justify-between text-sm font-bold text-slate-700">
                                              {produto} {visitaEditando.produtos_vinculados_array.includes(produto) && <Check size={14} className="text-[#82D14D]"/>}
                                          </button>
                                      ))}
                                  </div>
                              </>
                          )}
                      </div>

                      <div className="relative">
                          <label className="text-xs font-bold text-slate-700 mb-1.5 block flex items-center justify-between">
                              <span>Vincular Farmácia Parceira</span>
                              <span className="text-[10px] text-slate-400 font-normal uppercase">Opcional</span>
                          </label>
                          <div className="flex items-center bg-white border border-slate-300 rounded-xl shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 transition px-3">
                              <Building2 size={18} className="text-slate-400"/>
                              <input type="text" value={visitaEditando.farmacia_vinculada} onChange={(e) => buscarFarmaciaInteligente(e.target.value)} onFocus={() => setDropdownFarmaciaAberto(true)} className="w-full p-3 bg-transparent outline-none text-sm font-medium text-slate-900 placeholder-slate-400" placeholder="Digite nome, razão social ou CNPJ..."/>
                              {visitaEditando.farmacia_vinculada && <button type="button" onClick={() => {setVisitaEditando({...visitaEditando, farmacia_vinculada: ''}); setFarmaciasBuscadas([])}}><X size={16} className="text-slate-400 hover:text-red-500"/></button>}
                          </div>
                          {dropdownFarmaciaAberto && farmaciasBuscadas.length > 0 && (
                              <>
                                  <div className="fixed inset-0 z-30" onClick={() => setDropdownFarmaciaAberto(false)}></div>
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-40">
                                      {farmaciasBuscadas.map((f, i) => (
                                          <button type="button" key={i} onClick={() => {setVisitaEditando({...visitaEditando, farmacia_vinculada: f.nome}); setDropdownFarmaciaAberto(false);}} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-0 flex flex-col">
                                              <span className="text-sm font-bold text-slate-700">{f.nome}</span>
                                              {f.documento && <span className="text-[10px] text-slate-400 font-mono">{f.documento}</span>}
                                          </button>
                                      ))}
                                  </div>
                              </>
                          )}
                      </div>

                      <div>
                          <label className="text-xs font-bold text-slate-700 mb-1.5 block">Resumo do Contato</label>
                          <textarea required rows={4} value={visitaEditando.resumo} onChange={e => setVisitaEditando({...visitaEditando, resumo: e.target.value})} className="w-full p-4 border border-slate-300 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-sm"></textarea>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Próximo Passo</label>
                              <input type="text" value={visitaEditando.proximo_passo} onChange={e => setVisitaEditando({...visitaEditando, proximo_passo: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"/>
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1.5 block flex items-center gap-1"><Clock size={12}/> Data do Follow-up</label>
                              <input type="date" value={visitaEditando.data_proximo_contato} onChange={e => setVisitaEditando({...visitaEditando, data_proximo_contato: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold text-red-800 bg-white focus:ring-2 focus:ring-red-500 outline-none shadow-sm cursor-pointer"/>
                          </div>
                      </div>

                      <div className="pt-6 border-t border-slate-200 flex justify-end gap-3 mt-4">
                          <button type="button" onClick={() => setModalAberto(false)} className="px-6 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition text-sm">Cancelar</button>
                          <button type="submit" disabled={salvando} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black hover:bg-blue-700 flex items-center gap-2 shadow-lg hover:shadow-blue-200 disabled:opacity-50 text-sm transition transform active:scale-95">
                              {salvando ? <Activity className="animate-spin" size={16}/> : <Save size={16}/>} Atualizar Histórico
                          </button>
                      </div>
                  </form>
              </div>
          </div>, document.body
      )}
    </div>
  );
}