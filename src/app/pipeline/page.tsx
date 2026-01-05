"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { 
  Plus, Search, Calendar, User, Phone, DollarSign, 
  X, Briefcase, Tag, Beaker, MessageCircle, AlertCircle, Clock,
  CheckCircle2, Trash2, ShieldAlert, AlertTriangle
} from 'lucide-react';

const API_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";
const USUARIO_LOGADO = "Dionatan"; 

// --- TIPOS ---
interface Oportunidade {
  id: string;
  cnpj: string;
  nomeCliente: string; 
  contato: string;     
  telefone: string;
  produto: string;
  aplicacao: string;
  valor: number;
  dataEntrada: string;
  dataLembrete?: string;
  estagio: 'prospeccao' | 'qualificacao' | 'apresentacao' | 'negociacao' | 'fechado' | 'perdido';
  motivoPerda?: string;
  responsavel: string;
  clienteJaCadastrado?: boolean;
}

// --- CONSTANTES ---
const PRODUTOS_SUGESTAO = [
  "Allisane®", "Anethin®", "Anidream®", "ArtemiFresh®", "BioCarum®", 
  "Cardasense®", "CarySlim®", "FIThymus®", "GF Slim II®", "Glutaliz®", 
  "GraperLIP®", "Junipure®", "LipoArtich II®", "NobiLIP®", "Noble Skin®", 
  "Nutberry Slim®", "Nutmeg B12®", "OriganLIP®", "Pepper PRO®", "Powder Lymp II®", 
  "Purin 7®", "R-GEN2®", "ReduCINN®", "Reichi UP II ®", "Sinensis Lean II ®", 
  "Sineredux II ®", "SlimHaut®", "TarhunLIP®", "Taurymus®", "TBooster®", "VerumFEM®"
];

const MOTIVOS_PERDA = ["Preço alto", "Fechou com concorrente", "Sem estoque", "Projeto cancelado", "Cliente parou de responder", "Outros"];

const ESTAGIOS = [
  { id: 'prospeccao', label: 'Prospecção', color: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  { id: 'qualificacao', label: 'Qualificação', color: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  { id: 'apresentacao', label: 'Apresentação', color: 'border-pink-500', bg: 'bg-pink-50', text: 'text-pink-700' },
  { id: 'negociacao', label: 'Negociação', color: 'border-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  { id: 'fechado', label: 'Fechado', color: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  { id: 'perdido', label: 'Perdido', color: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700' },
];

export default function PipelinePage() {
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([
    {
      id: '1',
      cnpj: '87.367.165/0001-84',
      nomeCliente: 'Farmácia A Fórmula',
      contato: 'Dr. Roberto',
      telefone: '(41) 99999-8888',
      produto: 'Anethin®',
      aplicacao: 'Emagrecimento',
      valor: 15000,
      dataEntrada: '2025-01-10',
      estagio: 'prospeccao',
      responsavel: 'Dionatan'
    }
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<Oportunidade | null>(null);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [baseClientes, setBaseClientes] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  
  // ESTADOS DE CONTROLE VISUAL
  const [erroBloqueio, setErroBloqueio] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // Estado para Notificações (Toast)
  const [toast, setToast] = useState<{show: boolean, msg: string, type: 'success' | 'error' | 'warning'}>({
    show: false, msg: '', type: 'success'
  });

  const [formData, setFormData] = useState<Partial<Oportunidade>>({
    estagio: 'prospeccao',
    dataEntrada: new Date().toISOString().split('T')[0], 
    responsavel: USUARIO_LOGADO,
    produto: '',
    aplicacao: ''
  });

  useEffect(() => {
    setMounted(true); // Habilita o Portal
    const carregarBaseClientes = async () => {
      try {
        const res = await fetch(`${API_URL}?path=clientes`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) setBaseClientes(json.data);
      } catch (e) { console.error("Erro ao carregar base", e); }
    };
    carregarBaseClientes();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const handleOpenModal = (op?: Oportunidade) => {
    setErroBloqueio(null);
    setConfirmDelete(false);
    if (op) {
      setEditingOp(op);
      setFormData(op);
    } else {
      setEditingOp(null);
      setFormData({
        estagio: 'prospeccao',
        dataEntrada: new Date().toISOString().split('T')[0],
        responsavel: USUARIO_LOGADO,
        valor: 0,
        produto: '',
        aplicacao: ''
      });
    }
    setModalOpen(true);
  };

  const buscarDadosCNPJ = async () => {
    const cnpjLimpo = formData.cnpj?.replace(/\D/g, '');
    if (!cnpjLimpo || cnpjLimpo.length !== 14) return;

    setLoadingCNPJ(true);
    setErroBloqueio(null);

    // 1. Verifica na base interna
    const clienteExistente = baseClientes.find(c => {
       const cCnpj = c.cnpj?.toString().replace(/\D/g, '');
       return cCnpj === cnpjLimpo;
    });

    if (clienteExistente) {
        const donoCarteira = clienteExistente.vendedor || clienteExistente.representante || '';
        
        // TRAVA DE VENDEDOR
        if (donoCarteira && !donoCarteira.toUpperCase().includes(USUARIO_LOGADO.toUpperCase())) {
            setErroBloqueio(`AÇÃO BLOQUEADA: Este cliente pertence à carteira de ${donoCarteira}.`);
            setFormData(prev => ({
                ...prev,
                nomeCliente: clienteExistente.fantasia || clienteExistente.razao,
                clienteJaCadastrado: true
            }));
            setLoadingCNPJ(false);
            return;
        }

        setFormData(prev => ({
            ...prev,
            nomeCliente: clienteExistente.fantasia || clienteExistente.razao,
            telefone: clienteExistente.whatsapp || clienteExistente.telefone || prev.telefone,
            contato: clienteExistente.comprador || prev.contato,
            clienteJaCadastrado: true
        }));
        showToast(`Cliente encontrado na base!`, 'success');
        setLoadingCNPJ(false);
        return;
    }

    // 2. Busca BrasilAPI
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (!response.ok) throw new Error('Erro');
      const data = await response.json();
      
      setFormData(prev => ({
        ...prev,
        nomeCliente: data.nome_fantasia || data.razao_social,
        telefone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1}) ${data.telefone1}` : prev.telefone,
        clienteJaCadastrado: false
      }));
    } catch (error) {
        showToast("CNPJ não encontrado.", 'error');
    } finally {
      setLoadingCNPJ(false);
    }
  };

  const handleSave = () => {
    if (erroBloqueio) {
        showToast("Ação bloqueada. Verifique os avisos.", 'error');
        return;
    }
    if (!formData.nomeCliente) {
        showToast("O Nome do Cliente é obrigatório.", 'warning');
        return;
    }
    if (formData.estagio === 'perdido' && !formData.motivoPerda) {
        showToast("Informe o Motivo da Perda.", 'warning');
        return;
    }

    if (editingOp) {
      setOportunidades(prev => prev.map(item => 
        item.id === editingOp.id ? { ...formData as Oportunidade } : item
      ));
      showToast("Oportunidade atualizada!", 'success');
    } else {
      const novaOp: Oportunidade = {
        ...formData as Oportunidade,
        id: Date.now().toString()
      };
      setOportunidades([...oportunidades, novaOp]);
      showToast("Oportunidade criada com sucesso!", 'success');
    }
    setModalOpen(false);
  };

  const deleteOportunidade = () => {
      if (!editingOp) return;
      setOportunidades(prev => prev.filter(op => op.id !== editingOp.id));
      setConfirmDelete(false);
      setModalOpen(false);
      showToast("Oportunidade excluída.", 'success');
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const handleWhatsappClick = (e: React.MouseEvent, telefone: string) => {
    e.stopPropagation(); 
    const numeroLimpo = telefone.replace(/\D/g, '');
    const numeroFinal = numeroLimpo.length <= 11 ? `55${numeroLimpo}` : numeroLimpo;
    if (numeroFinal) window.open(`https://wa.me/${numeroFinal}`, '_blank');
  };

  const agendarGoogleAgenda = () => {
    if (!formData.nomeCliente) return;
    const titulo = encodeURIComponent(`Reunião com ${formData.nomeCliente}`);
    const detalhes = encodeURIComponent(`Tratar sobre: ${formData.produto || 'Oportunidade'}\nContato: ${formData.contato}\nTelefone: ${formData.telefone}`);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&details=${detalhes}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full">
      {/* TOAST DE NOTIFICAÇÃO (FLUTUANTE) */}
      {toast.show && mounted && createPortal(
          <div className={`fixed top-5 right-5 z-[100000] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${
              toast.type === 'success' ? 'bg-green-600 text-white' : 
              toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white'
          }`}>
              {toast.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
              <div>
                  <p className="font-bold text-sm">{toast.type === 'success' ? 'Sucesso' : 'Atenção'}</p>
                  <p className="text-sm opacity-90">{toast.msg}</p>
              </div>
          </div>,
          document.body
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pt-4">
        <h1 className="text-2xl font-black text-slate-800">Pipeline de Vendas</h1>
        <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md text-sm whitespace-nowrap">
          <Plus size={18}/> Nova Oportunidade
        </button>
      </div>

      {/* KANBAN */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 h-[calc(100vh-160px)]">
        {ESTAGIOS.map(estagio => {
          const itens = oportunidades.filter(o => o.estagio === estagio.id);
          const totalColuna = itens.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
          return (
            <div key={estagio.id} className="flex flex-col h-full bg-slate-100/50 rounded-xl border border-slate-200 overflow-hidden min-w-[200px]">
              <div className={`p-2 border-b-2 ${estagio.color} bg-white`}>
                <div className="flex justify-between items-center mb-1">
                  <h3 className={`font-bold text-xs truncate ${estagio.text}`}>{estagio.label}</h3>
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{itens.length}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold">{formatMoney(totalColuna)}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {itens.map(item => (
                  <div key={item.id} onClick={() => handleOpenModal(item)} className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 cursor-pointer hover:border-blue-400 transition group relative">
                    <div className="flex justify-between items-start mb-1">
                        <div className="bg-slate-50 text-slate-400 text-[9px] px-1.5 py-0.5 rounded font-mono truncate max-w-[80px]">{item.cnpj || 'S/ CNPJ'}</div>
                        {item.clienteJaCadastrado && <span className="text-[8px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><CheckCircle2 size={8}/> BASE</span>}
                        {item.estagio === 'perdido' && <span className="text-[8px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Perdido</span>}
                    </div>
                    <h4 className="font-bold text-slate-700 text-sm leading-tight mb-1 line-clamp-2">{item.nomeCliente}</h4>
                    <div className="mb-2">
                      {item.produto ? <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1 truncate"><Beaker size={10}/> {item.produto}</p> : <p className="text-[10px] text-purple-500 font-bold flex items-center gap-1 truncate"><Tag size={10}/> {item.aplicacao || 'Geral'}</p>}
                    </div>
                    <div className="space-y-1 border-t border-slate-50 pt-1">
                      <div className="flex justify-between items-center">
                         <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate max-w-[80px]"><User size={10} className="text-slate-300"/> {item.contato || '-'}</div>
                         <div className="flex items-center gap-1 text-[10px] text-slate-500"><Calendar size={10} className="text-slate-300"/> {new Date(item.dataEntrada).toLocaleDateString('pt-BR').slice(0,5)}</div>
                      </div>
                      {item.telefone && <button onClick={(e) => handleWhatsappClick(e, item.telefone)} className="w-full flex items-center justify-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 text-[10px] font-bold py-1 rounded transition mt-1"><MessageCircle size={10} /> Zap</button>}
                    </div>
                    <div className="mt-2 flex justify-between items-center"><span className="text-xs font-black text-slate-600">{formatMoney(item.valor)}</span></div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- MODAL PRINCIPAL (COM PORTAL) --- */}
      {modalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">{editingOp ? '✏️ Editar' : '✨ Nova Oportunidade'}</h2>
              <div className="flex gap-2">
                 <button onClick={agendarGoogleAgenda} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition"><Calendar size={14}/> Agendar</button>
                 <button onClick={() => setModalOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition"><X size={18}/></button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar flex-1">
              
              {/* ERRO VISUAL DENTRO DA TELA */}
              {erroBloqueio && (
                <div className="md:col-span-2 bg-red-50 border-l-4 border-red-500 p-4 rounded-r flex items-start gap-3 animate-pulse">
                    <ShieldAlert className="text-red-600 shrink-0" size={24} />
                    <div>
                        <h3 className="text-red-700 font-bold text-sm">Ação Não Permitida</h3>
                        <p className="text-red-600 text-xs mt-1">{erroBloqueio}</p>
                    </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">CNPJ (Busca Automática)</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="00.000.000/0000-00" 
                    className={`w-full bg-slate-50 border rounded-lg p-2 font-mono text-sm outline-none focus:border-blue-500 ${formData.clienteJaCadastrado ? 'border-green-500 bg-green-50 text-green-800' : 'border-slate-200'}`}
                    value={formData.cnpj || ''} 
                    onChange={e => {
                        setFormData({...formData, cnpj: e.target.value, clienteJaCadastrado: false});
                        setErroBloqueio(null);
                    }} 
                    onBlur={buscarDadosCNPJ}
                  />
                  <button onClick={buscarDadosCNPJ} className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200 transition">{loadingCNPJ ? <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div> : <Search size={18}/>}</button>
                </div>
                {formData.clienteJaCadastrado && !erroBloqueio && <p className="text-[10px] text-green-600 font-bold mt-1 flex items-center gap-1"><CheckCircle2 size={10}/> Cliente identificado na sua carteira!</p>}
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nome do Cliente</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500" value={formData.nomeCliente || ''} onChange={e => setFormData({...formData, nomeCliente: e.target.value})}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Contato</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" placeholder="Ex: Dra. Ana" value={formData.contato || ''} onChange={e => setFormData({...formData, contato: e.target.value})}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" placeholder="(00) 00000-0000" value={formData.telefone || ''} onChange={e => setFormData({...formData, telefone: e.target.value})}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Produto / Ativo</label>
                <input type="text" list="lista-produtos-sugestao" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" placeholder="Selecione..." value={formData.produto || ''} onChange={e => setFormData({...formData, produto: e.target.value})}/>
                <datalist id="lista-produtos-sugestao">{PRODUTOS_SUGESTAO.map((prod, i) => <option key={i} value={prod} />)}</datalist>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Aplicação</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" placeholder="Ex: Dermato..." value={formData.aplicacao || ''} onChange={e => setFormData({...formData, aplicacao: e.target.value})}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Valor (R$)</label>
                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-green-700 outline-none focus:border-green-500" value={formData.valor || ''} onChange={e => setFormData({...formData, valor: parseFloat(e.target.value)})}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Data Entrada</label>
                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" value={formData.dataEntrada} onChange={e => setFormData({...formData, dataEntrada: e.target.value})}/>
              </div>
              <div className="md:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Fase Atual</label>
                        <select className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 cursor-pointer" value={formData.estagio} onChange={e => setFormData({...formData, estagio: e.target.value as any})}>
                        {ESTAGIOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                        </select>
                    </div>
                    {formData.estagio === 'perdido' && (
                        <div className="animate-in fade-in">
                            <label className="text-[10px] font-bold text-red-400 uppercase">Motivo Perda</label>
                            <select className="w-full bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-sm outline-none focus:border-red-500" value={formData.motivoPerda || ''} onChange={e => setFormData({...formData, motivoPerda: e.target.value})}>
                                <option value="">Selecione...</option>
                                {MOTIVOS_PERDA.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    )}
                    {formData.estagio !== 'perdido' && formData.estagio !== 'fechado' && (
                        <div>
                            <label className="text-[10px] font-bold text-yellow-600 uppercase">Lembrete</label>
                            <input type="date" className="w-full bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-2 text-sm outline-none focus:border-yellow-500" value={formData.dataLembrete || ''} onChange={e => setFormData({...formData, dataLembrete: e.target.value})}/>
                        </div>
                    )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-2 shrink-0">
              
              {editingOp ? (
                 <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 rounded-lg bg-red-100 text-red-600 font-bold hover:bg-red-200 text-sm transition flex items-center gap-2">
                    <Trash2 size={16}/> Excluir
                 </button>
              ) : <div></div>}

              <div className="flex gap-2">
                 <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-500 font-bold hover:bg-slate-200 text-sm transition">Cancelar</button>
                 <button 
                    onClick={handleSave} 
                    disabled={!!erroBloqueio}
                    className={`px-6 py-2 rounded-lg font-bold shadow-md text-sm transition ${erroBloqueio ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                 >
                    {editingOp ? 'Salvar' : 'Criar'}
                 </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* --- CONFIRMAÇÃO DE EXCLUSÃO (CORRIGIDO) --- */}
      {confirmDelete && mounted && createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 text-center animate-in zoom-in-95">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                 <AlertTriangle size={32}/>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir Oportunidade?</h3>
              <p className="text-slate-500 text-sm mb-6">Tem certeza que deseja remover este item? Esta ação não pode ser desfeita.</p>
              
              <div className="flex gap-3 justify-center">
                 <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition">Cancelar</button>
                 <button onClick={deleteOportunidade} className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold text-sm hover:bg-red-700 shadow-md transition">Sim, Excluir</button>
              </div>
           </div>
        </div>,
        document.body
      )}

    </div>
  );
}