"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  DollarSign, Users, CheckCircle2, Circle, Plus, Trash2, Edit2, 
  Sun, MapPin, Calendar, TrendingUp, X, Clock, Search, Bell, Info
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function Dashboard() {
  const supabase = createClientComponentClient();
  
  // Estados de Dados
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [clientesBase, setClientesBase] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados do Modal de Tarefa
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<any>(null);
  const [formTarefa, setFormTarefa] = useState({
    titulo: '',
    cliente_id: '',
    nomeCliente: '',
    data: '',
    hora: '',
    observacoes: ''
  });

  const [busca, setBusca] = useState("");
  const [sugestoes, setSugestoes] = useState<any[]>([]);

  useEffect(() => {
    carregarTudo();
    const interval = setInterval(checarLembretes, 30000);
    return () => clearInterval(interval);
  }, []);

  const carregarTudo = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Busca Tarefas com join na base de clientes
      const { data: t } = await supabase
        .from('tarefas')
        .select('*, base_clientes(fantasia)')
        .eq('user_id', user.id)
        .order('data_lembrete', { ascending: true });
      setTarefas(t || []);

      // Carrega KPIs (Soma Pipeline e Contagem Clientes) - Lógica já validada
      // ... (mantemos a lógica de soma de valores que funcionou anteriormente)
    }
    setLoading(false);
  };

  const buscarClientesHibrido = async (val: string) => {
    setBusca(val);
    if (val.length < 2) { setSugestoes([]); return; }

    // Busca na Base Importada E no Pipeline
    const { data: base } = await supabase.from('base_clientes').select('id, fantasia').ilike('fantasia', `%${val}%`).limit(3);
    const { data: pipe } = await supabase.from('pipeline').select('id, nome_cliente').ilike('nome_cliente', `%${val}%`).limit(3);

    const unificados = [
      ...(base?.map(b => ({ id: b.id, nome: b.fantasia, origem: 'BASE' })) || []),
      ...(pipe?.map(p => ({ id: p.id, nome: p.nome_cliente, origem: 'PIPELINE' })) || [])
    ];
    setSugestoes(unificados);
  };

  const salvarTarefa = async () => {
    if (!formTarefa.titulo || !formTarefa.data || !formTarefa.hora) {
      alert("Preencha o título, data e horário.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const dataHoraISO = `${formTarefa.data}T${formTarefa.hora}:00`;

    const payload = {
      user_id: user?.id,
      titulo: formTarefa.titulo,
      cliente_id: formTarefa.cliente_id || null,
      data_lembrete: dataHoraISO,
      observacoes: formTarefa.observacoes,
      concluido: false
    };

    if (editingTarefa) {
      await supabase.from('tarefas').update(payload).eq('id', editingTarefa.id);
    } else {
      await supabase.from('tarefas').insert(payload);
    }

    setIsTaskModalOpen(false);
    setEditingTarefa(null);
    carregarTudo();
  };

  const checarLembretes = () => {
    const agora = new Date();
    tarefas.forEach(t => {
      const dataT = new Date(t.data_lembrete);
      if (Math.abs(agora.getTime() - dataT.getTime()) < 60000 && !t.concluido) {
        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play();
        alert(`🔔 HORA DE: ${t.titulo}`);
      }
    });
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8">
      {/* ... Cabeçalho de Boas Vindas ... */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AGENDA DE TAREFAS - DESIGN REVOLUCIONÁRIO */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-white to-slate-50">
            <div>
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Bell className="text-green-600" size={24} /> Fluxo de Trabalho
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Lembretes e Compromissos</p>
            </div>
            <button 
              onClick={() => {
                setEditingTarefa(null);
                setFormTarefa({ titulo: '', cliente_id: '', nomeCliente: '', data: '', hora: '', observacoes: '' });
                setIsTaskModalOpen(true);
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg shadow-green-100 flex items-center gap-2"
            >
              <Plus size={20}/> NOVA TAREFA
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
            {tarefas.map(t => (
              <div key={t.id} className="group bg-slate-50 hover:bg-white hover:shadow-md border border-transparent hover:border-green-100 p-5 rounded-[2rem] transition-all flex items-center gap-6">
                <button onClick={() => {/* toggle conclusão */}} className="shrink-0">
                  {t.concluido ? <CheckCircle2 className="text-green-500" size={28}/> : <Circle className="text-slate-200" size={28}/>}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                      {new Date(t.data_lembrete).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                    </span>
                    {t.base_clientes && <span className="text-[10px] font-black text-green-600">| {t.base_clientes.fantasia}</span>}
                  </div>
                  <h4 className={`font-bold text-slate-700 ${t.concluido ? 'line-through opacity-50' : ''}`}>{t.titulo}</h4>
                  {t.observacoes && <p className="text-xs text-slate-400 mt-1 italic">"{t.observacoes}"</p>}
                </div>
                <button 
                  onClick={() => {
                    const dt = new Date(t.data_lembrete);
                    setEditingTarefa(t);
                    setFormTarefa({
                      titulo: t.titulo,
                      cliente_id: t.cliente_id,
                      nomeCliente: t.base_clientes?.fantasia || '',
                      data: dt.toISOString().split('T')[0],
                      hora: dt.toTimeString().slice(0,5),
                      observacoes: t.observacoes
                    });
                    setIsTaskModalOpen(true);
                  }}
                  className="p-3 bg-white text-slate-400 hover:text-blue-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition"
                >
                  <Edit2 size={18}/>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ... Coluna Lateral de Clima e Eventos ... */}
      </div>

      {/* MODAL DE TAREFA - O MELHOR DESIGN */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 bg-slate-800 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black italic tracking-tighter">
                  {editingTarefa ? 'EDITAR COMPROMISSO' : 'NOVA TAREFA ESTRATÉGICA'}
                </h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">YellowLeaf CRM System</p>
              </div>
              <button onClick={() => setIsTaskModalOpen(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition"><X size={24}/></button>
            </div>

            <div className="p-10 space-y-8 overflow-y-auto">
              {/* Título */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">O que precisa ser feito? *</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-bold text-slate-700 outline-none focus:border-green-500 transition"
                  placeholder="Ex: Ligar para o Bruno da Experimental"
                  value={formTarefa.titulo}
                  onChange={e => setFormTarefa({...formTarefa, titulo: e.target.value})}
                />
              </div>

              {/* Busca de Cliente */}
              <div className="relative space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Vincular Cliente (Busca Inteligente)</label>
                <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-3xl p-2 pr-6">
                  <div className="p-3 bg-white rounded-2xl text-slate-400 mr-2"><Search size={20}/></div>
                  <input 
                    type="text" 
                    className="flex-1 bg-transparent font-bold text-slate-700 outline-none"
                    placeholder="Busque por nome ou CNPJ..."
                    value={formTarefa.nomeCliente || busca}
                    onChange={e => buscarClientesHibrido(e.target.value)}
                  />
                  {formTarefa.cliente_id && <CheckCircle2 className="text-green-500" size={20}/>}
                </div>
                {sugestoes.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-top-2">
                    {sugestoes.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => {
                          setFormTarefa({...formTarefa, cliente_id: s.id, nomeCliente: s.nome});
                          setSugestoes([]);
                        }}
                        className="w-full p-4 text-left hover:bg-green-50 flex justify-between items-center transition"
                      >
                        <span className="font-bold text-slate-700 text-sm">{s.nome}</span>
                        <span className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded-full text-slate-400">{s.origem}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Data e Hora Lado a Lado */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Data *</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-bold text-slate-700 outline-none focus:border-green-500"
                    value={formTarefa.data}
                    onChange={e => setFormTarefa({...formTarefa, data: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Horário *</label>
                  <input 
                    type="time" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-bold text-slate-700 outline-none focus:border-green-500"
                    value={formTarefa.hora}
                    onChange={e => setFormTarefa({...formTarefa, hora: e.target.value})}
                  />
                </div>
              </div>

              {/* Observações / Histórico */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Observações e Detalhes</label>
                <textarea 
                  rows={3}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-5 font-medium text-slate-600 outline-none focus:border-green-500 transition resize-none"
                  placeholder="Anotações para não esquecer nada durante a visita ou ligação..."
                  value={formTarefa.observacoes}
                  onChange={e => setFormTarefa({...formTarefa, observacoes: e.target.value})}
                />
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button 
                onClick={() => setIsTaskModalOpen(false)}
                className="flex-1 py-5 rounded-[2rem] font-black text-slate-400 hover:bg-slate-200 transition"
              >
                DESCARTAR
              </button>
              <button 
                onClick={salvarTarefa}
                className="flex-[2] py-5 bg-green-600 hover:bg-green-700 text-white rounded-[2rem] font-black shadow-xl shadow-green-100 transition active:scale-95"
              >
                {editingTarefa ? 'ATUALIZAR COMPROMISSO' : 'CONFIRMAR AGENDAMENTO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}