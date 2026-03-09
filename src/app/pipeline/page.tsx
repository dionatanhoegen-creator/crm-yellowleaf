"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Stethoscope, Search, Plus, CalendarCheck, Clock, CheckCircle2, AlertCircle, FileText, ChevronRight, X, Save, Printer, Building2, Beaker, Activity, MapPin, Edit, MessageCircle
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  useEffect(() => {
    setMounted(true);
    carregarVisitas();
  }, []);

  const carregarVisitas = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase.from('perfis').select('cargo, nome').eq('id', user.id).single();

      // Puxa as interações CRUZANDO com os dados do Médico (agora incluindo o telefone)
      let query = supabase.from('interacoes')
          .select('*, prescritores(nome, especialidade, clinica, cidade, uf, telefone), perfis(nome)')
          .order('data_proximo_contato', { ascending: true, nullsFirst: false });
      
      // Visão de Túnel
      if (perfil && perfil.cargo !== 'admin') {
          query = query.eq('user_id', user.id);
      }

      const { data } = await query;
      
      // Garante que tudo tem um status para o Kanban não quebrar
      const formatadas = (data || []).map(v => ({
          ...v,
          status: v.status || 'realizado'
      }));

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
      setVisitaEditando({...visita});
      setModalAberto(true);
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
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 55, 43); 
    doc.text("RELATÓRIO DE PERFORMANCE DE P&D", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Visitas Extraídas: ${filtradas.length} | Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 26);

    const tableBody = filtradas.map(v => [
        new Date(v.created_at).toLocaleDateString('pt-BR'),
        v.prescritores?.nome || 'N/D',
        v.tipo,
        v.farmacia_vinculada || '-',
        v.produtos_vinculados ? v.produtos_vinculados.replace(/;/g, ', ') : '-',
        ESTAGIOS.find(e => e.id === v.status)?.label || v.status
    ]);

    autoTable(doc, {
        startY: 35,
        head: [['DATA INSERÇÃO', 'PRESCRITOR', 'TIPO DE CONTATO', 'FARMÁCIA INDICADA', 'ATIVOS TRABALHADOS', 'STATUS DO CICLO']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [15, 55, 43], textColor: 255, fontStyle: 'bold' },
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
          (v.prescritores?.nome && v.prescritores.nome.toLowerCase().includes(t)) ||
          (v.farmacia_vinculada && v.farmacia_vinculada.toLowerCase().includes(t)) ||
          (v.produtos_vinculados && v.produtos_vinculados.toLowerCase().includes(t)) ||
          (v.resumo && v.resumo.toLowerCase().includes(t))
      );
  });

  return (
    <div className="p-4 w-full h-[calc(100vh-64px)] flex flex-col font-sans">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
            <h1 className="text-2xl font-black text-[#0f392b] tracking-tight flex items-center gap-2">
                <CalendarCheck className="text-[#82D14D]"/> Pipeline de Visitação P&D
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Gerencie e avance as etapas das suas visitas médicas.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
                <input 
                    type="text" placeholder="Buscar médico, farmácia, ativo..." 
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 shadow-sm"
                    value={busca} onChange={(e) => setBusca(e.target.value)}
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <button onClick={gerarRelatorioGerencial} className="bg-[#0f392b] hover:bg-[#16503c] text-white px-4 py-2.5 rounded-xl font-bold shadow-lg transition active:scale-95 flex items-center gap-2 whitespace-nowrap text-sm">
                <Printer size={16} /> Relatório PDF
            </button>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 h-full min-w-max">
              {ESTAGIOS.map(estagio => {
                  const visitasColuna = filtradas.filter(v => v.status === estagio.id);
                  
                  return (
                      <div key={estagio.id} className="w-80 bg-slate-100/50 rounded-2xl border border-slate-200 flex flex-col h-full overflow-hidden">
                          {/* Topo da Coluna */}
                          <div className={`p-4 border-b-4 ${estagio.color} bg-white flex justify-between items-center shadow-sm shrink-0`}>
                              <h3 className={`font-black text-xs uppercase tracking-widest ${estagio.text}`}>{estagio.label}</h3>
                              <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-lg">{visitasColuna.length}</span>
                          </div>

                          {/* Lista de Cards da Coluna */}
                          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                              {visitasColuna.map(visita => {
                                  const atrasado = isAtrasado(visita.data_proximo_contato) && estagio.id !== 'concluido';
                                  const telefone = visita.prescritores?.telefone;

                                  return (
                                      <div key={visita.id} className={`bg-white p-4 rounded-xl border shadow-sm transition hover:shadow-md flex flex-col ${atrasado ? 'border-red-300 bg-red-50/10' : 'border-slate-200 hover:border-blue-300'}`}>
                                          
                                          {/* Cabeçalho do Card */}
                                          <div className="flex justify-between items-start mb-3">
                                              <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider border border-blue-100">{visita.tipo}</span>
                                              <div className="flex gap-2 items-center">
                                                  {telefone && (
                                                      <a 
                                                          href={`https://wa.me/55${telefone.replace(/\D/g, '')}`} 
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          className="text-green-500 hover:text-green-600 transition-colors p-1"
                                                          title="Abrir WhatsApp"
                                                      >
                                                          <MessageCircle size={16} />
                                                      </a>
                                                  )}
                                                  <button onClick={() => abrirEdicaoVisita(visita)} className="text-slate-400 hover:text-blue-600 p-1 transition"><Edit size={14}/></button>
                                              </div>
                                          </div>

                                          {/* Médico */}
                                          <h4 className="font-black text-slate-800 leading-tight mb-1 truncate" title={visita.prescritores?.nome}>
                                              {visita.prescritores?.nome || 'Médico Excluído'}
                                          </h4>
                                          <p className="text-[10px] text-slate-500 flex items-center gap-1 mb-3">
                                              <MapPin size={10}/> {visita.prescritores?.cidade || '-'} / {visita.prescritores?.uf || '-'}
                                          </p>

                                          {/* Farmácia & Produtos */}
                                          <div className="space-y-1.5 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                              {visita.farmacia_vinculada ? (
                                                  <p className="text-[10px] font-bold text-slate-700 flex items-center gap-1 truncate"><Building2 size={12} className="text-blue-500"/> {visita.farmacia_vinculada}</p>
                                              ) : (
                                                  <p className="text-[10px] font-medium text-slate-400 italic">Sem farmácia vinculada</p>
                                              )}

                                              {visita.produtos_vinculados && (
                                                  <div className="flex flex-wrap gap-1 mt-1">
                                                      {visita.produtos_vinculados.split(';').filter(Boolean).map((p: string, i: number) => (
                                                          <span key={i} className="text-[8px] font-black bg-[#82D14D]/20 text-[#0f392b] px-1.5 py-0.5 rounded border border-[#82D14D]/40 uppercase truncate max-w-full">
                                                              {p}
                                                          </span>
                                                      ))}
                                                  </div>
                                              )}
                                          </div>
                                          
                                          {/* Alerta de Follow-up (Embutido no Card) */}
                                          {visita.data_proximo_contato && estagio.id !== 'concluido' && (
                                              <div className={`mt-1 mb-3 flex items-center gap-1 text-[10px] font-bold p-1.5 rounded border ${atrasado ? 'text-red-700 bg-red-100 border-red-200 animate-pulse' : 'text-orange-700 bg-orange-50 border-orange-100'}`}>
                                                  {atrasado ? <AlertCircle size={12}/> : <Clock size={12}/>} 
                                                  Follow-up: {new Date(visita.data_proximo_contato).toLocaleDateString('pt-BR', {timeZone:'UTC'})}
                                              </div>
                                          )}

                                          {/* Avançar Etapa */}
                                          <div className="mt-auto pt-2 border-t border-slate-100">
                                              <select 
                                                  value={visita.status} 
                                                  onChange={(e) => mudarStatus(visita.id, e.target.value)}
                                                  className="w-full text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none cursor-pointer hover:border-blue-400 transition"
                                              >
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

      {/* MODAL DE EDIÇÃO DE VISITA */}
      {modalAberto && visitaEditando && mounted && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
                  
                  <div className="bg-[#1e293b] p-6 flex justify-between items-center text-white shrink-0">
                      <div>
                          <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2"><Edit className="text-blue-400" size={20}/> Editar Histórico da Visita</h2>
                          <p className="text-sm font-medium text-slate-300 mt-1">{visitaEditando.prescritores?.nome}</p>
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

                      <div>
                          <label className="text-xs font-bold text-slate-700 mb-1.5 block">Resumo do Contato</label>
                          <textarea required rows={4} value={visitaEditando.resumo} onChange={e => setVisitaEditando({...visitaEditando, resumo: e.target.value})} className="w-full p-4 border border-slate-300 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-sm"></textarea>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Próximo Passo</label>
                              <input type="text" value={visitaEditando.proximo_passo || ''} onChange={e => setVisitaEditando({...visitaEditando, proximo_passo: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"/>
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1.5 block flex items-center gap-1"><Clock size={12}/> Data do Follow-up</label>
                              <input type="date" value={visitaEditando.data_proximo_contato || ''} onChange={e => setVisitaEditando({...visitaEditando, data_proximo_contato: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold text-red-800 bg-white focus:ring-2 focus:ring-red-500 outline-none shadow-sm cursor-pointer"/>
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