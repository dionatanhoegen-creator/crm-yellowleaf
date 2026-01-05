"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, MapPin, Building2, Calendar, CheckCircle2, 
  XCircle, AlertTriangle, ArrowRight, Eraser, Package
} from 'lucide-react';

const API_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

export default function ExclusividadesPage() {
  const [uf, setUf] = useState("PR");
  const [cidade, setCidade] = useState("");
  const [produtoBusca, setProdutoBusca] = useState("");
  
  const [dadosRaw, setDadosRaw] = useState<any>(null);
  const [listaProdutos, setListaProdutos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const ESTADOS = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
    'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  ];

  useEffect(() => {
    if (uf) carregarDadosEstado(uf);
  }, [uf]);

  const carregarDadosEstado = async (ufSelecionada: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?path=exclusividades/panorama&uf=${ufSelecionada}`);
      const json = await res.json();
      setDadosRaw(json);

      const todosNomes = new Set([
        ...(json.bloqueados || []).map((i:any) => i.nome),
        ...(json.comum || []).map((i:any) => i.nome),
        ...(json.livres || []).map((i:any) => i.nome)
      ]);
      setListaProdutos(Array.from(todosNomes).sort());
      
    } finally { setLoading(false); }
  };

  // --- O CORAÇÃO DA CORREÇÃO ---
  const processarResultados = () => {
    if (!dadosRaw) return { vigente: [], fracionado: [], disponivel: [] };

    const termo = produtoBusca.toLowerCase().trim();
    const cidadeAlvo = cidade.toLowerCase().trim();
    const filtrarNome = (nome: string) => !termo || (nome && nome.toLowerCase().includes(termo));

    // 1. CALCULA VIGENTE (VERMELHO) 🔴
    // Regra: Está na aba "Ativas" e bate com a cidade/estado
    const vigente = (dadosRaw.bloqueados || []).filter((item: any) => {
       if (!filtrarNome(item.nome)) return false;

       const tipo = item.tipo ? item.tipo.toLowerCase() : '';
       const cidadeItem = item.cidade ? item.cidade.toLowerCase() : '';

       if (tipo === 'nacional' || tipo === 'estadual') return true;
       if (!cidadeAlvo) return true; // Se não digitou cidade, mostra bloqueios gerais
       if (cidadeItem.includes(cidadeAlvo)) return true;

       return false;
    });

    // 2. CALCULA FRACIONADO (AMARELO) 🟡
    // Regra: Está na aba "Vencidas" e bate com a cidade/estado
    const fracionado = (dadosRaw.comum || []).filter((item: any) => {
       if (!filtrarNome(item.nome)) return false;

       // Mesma lógica de cidade dos bloqueados
       const tipo = item.tipo ? item.tipo.toLowerCase() : '';
       const cidadeItem = item.cidade ? item.cidade.toLowerCase() : '';

       if (tipo === 'nacional' || tipo === 'estadual') return true;
       if (!cidadeAlvo) return false; // Se não tem cidade alvo, geralmente não mostramos vencidos de outras cidades no amarelo
       if (cidadeItem.includes(cidadeAlvo)) return true;
       
       return false;
    });

    // 3. CALCULA DISPONÍVEL (VERDE) 🟢
    // A CORREÇÃO: Verde = (Tudo) - (Vermelho) - (Amarelo)
    
    // Cria um Set com os nomes que JÁ ESTÃO nas colunas vermelha ou amarela
    const nomesOcupados = new Set([
        ...vigente.map((i:any) => i.nome),
        ...fracionado.map((i:any) => i.nome)
    ]);

    const disponivel: any[] = [];

    // Varre a lista completa de produtos que conhecemos
    listaProdutos.forEach(prodName => {
        if (!filtrarNome(prodName)) return;

        // Se o nome já está ocupado (seja no vermelho ou amarelo), PULA!
        if (nomesOcupados.has(prodName)) return;

        // Se chegou aqui, não está bloqueado nem vencido nesta cidade.
        // Vamos verificar se ele tem bloqueios em OUTRAS cidades apenas para avisar.
        const bloqueiosOutros = (dadosRaw.bloqueados || []).filter((b:any) => b.nome === prodName);
        
        let obs = "Totalmente livre no estado";
        if (bloqueiosOutros.length > 0) {
            obs = `Livre aqui (Bloqueado em ${bloqueiosOutros.length} outras cidades)`;
        }

        disponivel.push({
            nome: prodName,
            obs: obs
        });
    });

    return { 
        vigente: vigente.sort((a:any,b:any) => a.nome.localeCompare(b.nome)), 
        fracionado: fracionado.sort((a:any,b:any) => a.nome.localeCompare(b.nome)), 
        disponivel: disponivel.sort((a:any,b:any) => a.nome.localeCompare(b.nome))
    };
  };

  const resultados = processarResultados();

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-700">
      
      <div className="max-w-6xl mx-auto mb-10">
        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
          <Search size={32} className="text-green-600"/> 
          Consultor de Viabilidade
        </h1>
        <p className="text-slate-500 mt-2">
          Verifique instantaneamente se você pode vender um produto em determinada cidade.
        </p>
      </div>

      {/* FILTROS */}
      <div className="max-w-6xl mx-auto bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 mb-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-green-500"></div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          
          {/* PRODUTO */}
          <div className="md:col-span-5 relative">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Package size={14}/> 1. Qual produto? (Opcional)
            </label>
            <input 
              type="text" list="produtos-list"
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-lg font-bold outline-none focus:border-green-500"
              placeholder="Ex: Nutberry, R-GEN..."
              value={produtoBusca} onChange={e => setProdutoBusca(e.target.value)}
            />
            <datalist id="produtos-list">
              {listaProdutos.map(prod => <option key={prod} value={prod} />)}
            </datalist>
            {produtoBusca && (
              <button onClick={() => setProdutoBusca('')} className="absolute right-4 bottom-4 text-slate-300 hover:text-red-400"><Eraser size={20}/></button>
            )}
          </div>

          {/* ESTADO */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <MapPin size={14}/> 2. Estado
            </label>
            <select 
              value={uf} onChange={e => setUf(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-lg font-bold outline-none focus:border-green-500 cursor-pointer"
            >
              {ESTADOS.map(est => <option key={est} value={est}>{est}</option>)}
            </select>
          </div>

          {/* CIDADE */}
          <div className="md:col-span-5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Building2 size={14}/> 3. Cidade (Teste Curitiba)
            </label>
            <input 
              type="text" 
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-lg font-bold outline-none focus:border-green-500"
              placeholder="Digite a cidade..."
              value={cidade} onChange={e => setCidade(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* RESULTADOS */}
      {loading ? (
        <div className="text-center py-20 opacity-50 animate-pulse">
           <div className="inline-block w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
           <p className="font-bold">Consultando banco de dados...</p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 🔴 VIGENTE */}
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 flex flex-col h-[500px]">
            <div className="p-5 border-b border-red-100 bg-red-50 rounded-t-2xl">
              <h2 className="font-black text-red-700 flex items-center gap-2"><XCircle size={24}/> BLOQUEADOS</h2>
              <p className="text-xs text-red-500 mt-1 font-bold">CONTRATO ATIVO</p>
              <span className="text-xs bg-white px-2 py-0.5 rounded-full text-red-400 mt-2 inline-block">{resultados.vigente.length} itens</span>
            </div>
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              {resultados.vigente.map((item: any, i) => (
                <div key={i} className="mb-3 p-3 bg-white border border-red-100 rounded-xl shadow-sm">
                  <p className="font-bold text-slate-800 text-lg">{item.nome}</p>
                  <div className="mt-2 text-xs space-y-1 text-slate-500">
                    <p className="flex items-center gap-1"><Building2 size={12}/> <span className="font-bold">{item.farmacia}</span></p>
                    <p className="flex items-center gap-1"><MapPin size={12}/> {item.cidade || 'Todo o Estado'}</p>
                    <p className="flex items-center gap-1 text-red-600 font-bold"><Calendar size={12}/> Vence: {item.vigencia}</p>
                  </div>
                </div>
              ))}
              {resultados.vigente.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300"><p className="text-sm">Nenhum bloqueio.</p></div>}
            </div>
          </div>

          {/* 🟡 FRACIONAMENTO */}
          <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 flex flex-col h-[500px]">
            <div className="p-5 border-b border-yellow-100 bg-yellow-50 rounded-t-2xl">
              <h2 className="font-black text-yellow-700 flex items-center gap-2"><AlertTriangle size={24}/> FRACIONAMENTO</h2>
              <p className="text-xs text-yellow-600 mt-1 font-bold">VENDA MÍNIMA / EX-EXCLUSIVO</p>
              <span className="text-xs bg-white px-2 py-0.5 rounded-full text-yellow-600 mt-2 inline-block">{resultados.fracionado.length} itens</span>
            </div>
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              {resultados.fracionado.map((item: any, i) => (
                <div key={i} className="mb-3 p-3 bg-white border border-yellow-100 rounded-xl shadow-sm hover:bg-yellow-50 transition">
                  <p className="font-bold text-slate-800">{item.nome}</p>
                  <div className="mt-2 text-xs space-y-1 text-slate-500">
                     <p>Ex-Contrato: {item.farmacia}</p>
                     <p>Venceu em: {item.vigencia}</p>
                  </div>
                </div>
              ))}
               {resultados.fracionado.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300"><p className="text-sm">Nenhum registro.</p></div>}
            </div>
          </div>

          {/* 🟢 DISPONÍVEL */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-green-500 flex flex-col h-[500px] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
            <div className="p-5 border-b border-green-100 bg-green-50">
              <h2 className="font-black text-green-700 flex items-center gap-2"><CheckCircle2 size={24}/> DISPONÍVEL</h2>
              <p className="text-xs text-green-600 mt-1 font-bold">NOVOS NEGÓCIOS</p>
              <span className="text-xs bg-white px-2 py-0.5 rounded-full text-green-600 mt-2 inline-block">{resultados.disponivel.length} itens</span>
            </div>
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar bg-green-50/30">
              {resultados.disponivel.map((item: any, i) => (
                <div key={i} className="mb-2 p-3 bg-white border border-transparent hover:border-green-300 rounded-xl shadow-sm flex items-center justify-between group">
                  <div>
                    <p className="font-bold text-slate-800">{item.nome}</p>
                    {item.obs && <p className="text-[10px] text-green-600 font-bold mt-0.5">{item.obs}</p>}
                  </div>
                  <ArrowRight size={16} className="text-green-300 group-hover:text-green-600 transition"/>
                </div>
              ))}
               {resultados.disponivel.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300"><p className="text-sm">Nenhuma oportunidade.</p></div>}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}