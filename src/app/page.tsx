"use client";

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Users, CheckCircle2, Circle, Plus, Trash2, Edit2, 
  Sun, MapPin, Calendar, TrendingUp 
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function Dashboard() {
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [primeiroNome, setPrimeiroNome] = useState("Dionatan");
  const [saudacao, setSaudacao] = useState("Olá");
  const [clima, setClima] = useState({ temp: 28, cidade: 'Sua Região' });

  // KPIs Dinâmicos
  const [metaAlvo, setMetaAlvo] = useState(150000);
  const [valorFechado, setValorFechado] = useState(0); 
  const [qtdOportunidades, setQtdOportunidades] = useState(0); 
  const [valorNegociacao, setValorNegociacao] = useState(0); 
  const [totalCarteira, setTotalCarteira] = useState(0);

  const [tarefas, setTarefas] = useState<any[]>([]);
  const [novaTarefaTexto, setNovaTarefaTexto] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [novaMetaValor, setNovaMetaValor] = useState("");

  useEffect(() => {
    carregarDados();
    definirSaudacao();
    window.addEventListener('focus', carregarDados);
    return () => window.removeEventListener('focus', carregarDados);
  }, []);

  const definirSaudacao = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) setSaudacao("Bom dia");
    else if (hora >= 12 && hora < 18) setSaudacao("Boa tarde");
    else setSaudacao("Boa noite");
  };

  const carregarDados = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // 1. Nome do Usuário
      const nome = user.email?.split('@')[0] || "Dionatan";
      setPrimeiroNome(nome.charAt(0).toUpperCase() + nome.slice(1).replace('hoegen', ''));

      // 2. Meta Alvo
      const { data: dMeta } = await supabase.from('metas').select('valor_meta').eq('user_id', user.id).single();
      if (dMeta) setMetaAlvo(dMeta.valor_meta);

      // 3. Soma do Pipeline
      const { data: pipe } = await supabase.from('pipeline').select('valor, status').eq('user_id', user.id);
      if (pipe) {
        const somaFechado = pipe.filter(i => i.status?.toLowerCase() === 'fechado').reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
        setValorFechado(somaFechado);

        const qtdOp = pipe.filter(i => ['prospeccao', 'qualificacao', 'apresentacao'].includes(i.status?.toLowerCase())).length;
        setQtdOportunidades(qtdOp);

        const somaNegoc = pipe.filter(i => i.status?.toLowerCase() === 'negociacao').reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
        setValorNegociacao(somaNegoc);
      }

      // 4. CONTAGEM DA CARTEIRA ATIVA (Base Importada no Admin)
      const { count } = await supabase.from('base_clientes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      setTotalCarteira(count || 0);

      // 5. Tarefas
      const { data: t } = await supabase.from('tarefas').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setTarefas(t || []);
    }
    setLoading(false);
  };

  // Funções de Meta e Tarefas omitidas para brevidade, mas devem ser mantidas do seu código anterior

  const porcentagemMeta = Math.min(Math.round((valorFechado / metaAlvo) * 100), 100);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-8 pb-20">
      {/* Cabeçalho, Cards e Tarefas seguindo o visual de bordas verdes */}
      {/* ... (Todo o visual que já construímos anteriormente) ... */}
      
      {/* CARD CARTEIRA ATIVA ATUALIZADO */}
      <div className="bg-white p-6 rounded-3xl border-2 border-green-600 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carteira Ativa</p>
              <h3 className="text-4xl font-black text-slate-800 mt-1">{totalCarteira}</h3>
            </div>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
          <p className="text-sm text-purple-600 font-bold mt-4 bg-purple-50 inline-block px-3 py-1 rounded-lg self-start">
            Total de Clientes na Base
          </p>
      </div>

      {/* Mantenha o restante do código igual ao que te mandei na resposta anterior */}
    </div>
  );
}