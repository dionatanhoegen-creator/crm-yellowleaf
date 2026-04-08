"use client";

import React, { useState } from 'react';
import { 
  Search, MapPin, Phone, Star, UserPlus, Radar, 
  Building2, AlertTriangle, CheckCircle2, Loader2, Info
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function MailingPage() {
  const supabase = createClientComponentClient();
  const [termo, setTermo] = useState("Nutricionista");
  const [localizacao, setLocalizacao] = useState("Maringá, PR");
  
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);
  const [leadSalvo, setLeadSalvo] = useState<string | null>(null);

  // =========================================================================
  // MOTOR DE BUSCA (Atualmente em Modo Simulação para testes)
  // =========================================================================
  const buscarLeads = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termo || !localizacao) return alert("Preencha o que está buscando e a cidade!");
    
    setLoading(true);
    setResultados([]);
    setLeadSalvo(null);

    // MODO SIMULAÇÃO: Cria um delay de 2 segundos para simular a busca no Google
    setTimeout(() => {
        const dadosMockados = [
            {
                id: 'place_1',
                nome: `Dra. Amanda Silva - ${termo}`,
                endereco: `Av. Tiradentes, 1000 - Zona 1, ${localizacao}`,
                telefone: '(44) 99999-1111',
                rating: 4.9,
                avaliacoes: 124,
                especialidade: termo
            },
            {
                id: 'place_2',
                nome: `Clínica Bem Estar (${termo})`,
                endereco: `Rua Neo Alves Martins, 550 - Zona 3, ${localizacao}`,
                telefone: '(44) 3222-2222',
                rating: 4.7,
                avaliacoes: 89,
                especialidade: termo
            },
            {
                id: 'place_3',
                nome: `Dr. Roberto Mendes | ${termo} Esportivo`,
                endereco: `Av. São Paulo, 120 - Zona 2, ${localizacao}`,
                telefone: '(44) 98888-3333',
                rating: 5.0,
                avaliacoes: 210,
                especialidade: termo
            },
            {
                id: 'place_4',
                nome: `Instituto de Nutrição Avançada`,
                endereco: `Av. Brasil, 4500 - Centro, ${localizacao}`,
                telefone: '(44) 3030-4444',
                rating: 4.5,
                avaliacoes: 45,
                especialidade: termo
            }
        ];
        
        setResultados(dadosMockados);
        setLoading(false);
    }, 1500);

    /* ======================================================================================
    CÓDIGO REAL DO GOOGLE PLACES API (Descomentar quando tiver a Chave de API)
    ======================================================================================
    try {
        const GOOGLE_API_KEY = "SUA_CHAVE_AQUI"; // Coloque a chave do Google Cloud aqui
        const query = `${termo} em ${localizacao}`;
        
        const res = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_API_KEY,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.rating,places.userRatingCount'
            },
            body: JSON.stringify({ textQuery: query, languageCode: "pt-BR" })
        });
        
        const data = await res.json();
        
        if (data.places) {
            const leadsMapeados = data.places.map((p: any) => ({
                id: p.id,
                nome: p.displayName?.text || 'Sem Nome',
                endereco: p.formattedAddress || '',
                telefone: p.nationalPhoneNumber || '',
                rating: p.rating || 0,
                avaliacoes: p.userRatingCount || 0,
                especialidade: termo
            }));
            setResultados(leadsMapeados);
        }
    } catch (err) {
        console.error(err);
        alert("Erro ao buscar no Google.");
    } finally {
        setLoading(false);
    }
    */
  };

  // =========================================================================
  // FUNÇÃO PARA ENVIAR O LEAD DIRETO PARA A BASE DE PRESCRITORES
  // =========================================================================
  const salvarLeadComoPrescritor = async (lead: any) => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return alert("Sessão expirada.");

          const { error } = await supabase.from('prescritores').insert({
              user_id: user.id,
              nome: lead.nome.toUpperCase(),
              especialidade: lead.especialidade.toUpperCase(),
              telefone: lead.telefone,
              endereco: lead.endereco.toUpperCase(),
              cidade: localizacao.split(',')[0].trim().toUpperCase(), // Tenta extrair a cidade do filtro
              uf: localizacao.split(',')[1]?.trim().toUpperCase() || '', // Tenta extrair UF
              potencial: 'C', // Entra como C por padrão (lead frio)
              perfil_prescritor: 'Tradicional',
              observacoes: `Lead captado via Radar de Prospecção (Google Places).\nAvaliação no Google: ${lead.rating} estrelas (${lead.avaliacoes} avaliações).`,
          });

          if (error) throw error;
          
          setLeadSalvo(lead.id); // Marca o botão como salvo (check verde)
          setTimeout(() => setLeadSalvo(null), 3000); // Tira o check verde depois de 3 seg
          
      } catch (err: any) {
          alert(`Erro ao salvar no banco de dados: ${err.message}`);
      }
  };

  return (
    <div className="p-3 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4 md:pb-6">
           <div>
             <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
                <Radar className="text-blue-600 animate-pulse" /> Radar de Prospecção
             </h1>
             <p className="text-xs md:text-sm text-slate-500 mt-1">Busque novos leads profissionais no Google e salve direto no CRM.</p>
           </div>
        </div>

        {/* AVISO MODO DEMO */}
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-2xl mb-8 flex items-start gap-3 shadow-sm">
            <Info size={20} className="shrink-0 mt-0.5 text-yellow-600"/>
            <div>
                <strong className="block text-sm font-black uppercase tracking-wider mb-1">Modo de Simulação Ativado</strong>
                <p className="text-xs md:text-sm font-medium leading-relaxed">
                    Esta tela está rodando com dados falsos para você testar a usabilidade e a integração do botão "Salvar". Para puxar os dados reais da internet, será necessário gerar uma <strong>Chave de API do Google Cloud (Places API)</strong> e inserir no código.
                </p>
            </div>
        </div>

        {/* CAIXA DE BUSCA */}
        <form onSubmit={buscarLeads} className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-lg shadow-slate-200/50 mb-8 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
                <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">O que você procura?</label>
                <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        value={termo}
                        onChange={(e) => setTermo(e.target.value)}
                        placeholder="Ex: Nutricionista, Dermatologista..." 
                        className="w-full pl-12 pr-4 py-3 md:py-4 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none text-sm md:text-base font-bold text-slate-700 transition"
                    />
                </div>
            </div>
            
            <div className="flex-1">
                <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Onde?</label>
                <div className="relative">
                    <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        value={localizacao}
                        onChange={(e) => setLocalizacao(e.target.value)}
                        placeholder="Ex: Maringá, PR" 
                        className="w-full pl-12 pr-4 py-3 md:py-4 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none text-sm md:text-base font-bold text-slate-700 transition"
                    />
                </div>
            </div>

            <div className="flex items-end">
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full md:w-auto h-[46px] md:h-[58px] px-8 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition transform active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 text-sm md:text-base"
                >
                    {loading ? <Loader2 className="animate-spin" size={20}/> : <Radar size={20}/>}
                    {loading ? 'Rastreando...' : 'Buscar Leads'}
                </button>
            </div>
        </form>

        {/* ÁREA DE RESULTADOS */}
        <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Building2 className="text-slate-400" size={18}/> 
                Resultados Encontrados {resultados.length > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-xs">{resultados.length}</span>}
            </h3>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                    {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>)}
                </div>
            ) : resultados.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <Radar size={48} className="mx-auto text-slate-200 mb-4"/>
                    <p className="text-slate-500 font-bold text-lg">Pronto para buscar.</p>
                    <p className="text-sm text-slate-400 mt-1">Preencha os campos acima para varrer a região.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
                    {resultados.map((lead) => (
                        <div key={lead.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition group flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <h4 className="font-black text-lg text-slate-800 leading-tight">{lead.nome}</h4>
                                    <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded-lg shrink-0">
                                        <Star size={12} className="text-yellow-500 fill-current"/>
                                        <span className="text-xs font-bold text-yellow-700">{lead.rating}</span>
                                        <span className="text-[9px] text-yellow-600 font-medium">({lead.avaliacoes})</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-1.5 mb-5 mt-3">
                                    {lead.telefone ? (
                                        <p className="text-xs md:text-sm text-slate-600 flex items-center gap-2 font-medium">
                                            <Phone size={14} className="text-blue-500 shrink-0"/> {lead.telefone}
                                        </p>
                                    ) : (
                                        <p className="text-xs md:text-sm text-slate-400 flex items-center gap-2 italic">
                                            <Phone size={14} className="text-slate-300 shrink-0"/> Telefone não público
                                        </p>
                                    )}
                                    
                                    <p className="text-xs md:text-sm text-slate-600 flex items-start gap-2 font-medium">
                                        <MapPin size={14} className="text-red-400 shrink-0 mt-0.5"/> 
                                        <span className="line-clamp-2 leading-relaxed">{lead.endereco}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end">
                                <button 
                                    onClick={() => salvarLeadComoPrescritor(lead)}
                                    disabled={leadSalvo === lead.id}
                                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition active:scale-95 ${
                                        leadSalvo === lead.id 
                                        ? 'bg-green-100 text-green-700 border border-green-200' 
                                        : 'bg-slate-100 text-blue-700 hover:bg-blue-600 hover:text-white border border-slate-200 hover:border-transparent'
                                    }`}
                                >
                                    {leadSalvo === lead.id ? (
                                        <><CheckCircle2 size={16}/> Salvo na Base!</>
                                    ) : (
                                        <><UserPlus size={16}/> Salvar como Prescritor</>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

      </div>
    </div>
  );
}