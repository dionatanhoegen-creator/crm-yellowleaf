"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { createPortal } from 'react-dom'; 
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Plus, Search, Calendar, User, Phone, DollarSign, 
  X, Tag, Beaker, MessageCircle, AlertCircle, 
  CheckCircle2, Trash2, Loader2, StickyNote, Download, MapPin, ShieldCheck, FileText,
  Clock, Eye, MessageSquare, AlertOctagon, ShieldAlert, Lock, Printer, AlertTriangle, Filter, ArrowUpDown, Send, History, Briefcase, Trello, Save, Users, Building2, UserPlus, Bell, AtSign
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import dynamic from 'next/dynamic';
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

const API_PRODUTOS_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";
const API_CLIENTES_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

const ESTAGIOS = [
  { id: 'prospeccao', label: 'Prospecção', color: 'border-blue-500', text: 'text-blue-700' },
  { id: 'qualificacao', label: 'Qualificação', color: 'border-purple-500', text: 'text-purple-700' },
  { id: 'apresentacao', label: 'Apresentação', color: 'border-pink-500', text: 'text-pink-700' },
  { id: 'negociacao', label: 'Negociação', color: 'border-yellow-500', text: 'text-yellow-700' },
  { id: 'fechado', label: 'Fechado', color: 'border-green-500', text: 'text-green-700' },
  { id: 'perdido', label: 'Perdido', color: 'border-red-500', text: 'text-red-700' },
];

const STAGE_COLORS: any = {
    prospeccao: [37, 99, 235], qualificacao: [147, 51, 234], apresentacao: [219, 39, 119], 
    negociacao: [234, 179, 8], fechado: [22, 163, 74], perdido: [220, 38, 38]        
};

const CANAIS_CONTATO = ['WhatsApp', 'Ligação', 'E-mail', 'Visita Presencial', 'Instagram'];
const OPCOES_CARGO_CONTATO = ['Comprador(a)', 'Proprietário(a)', 'Sócio(a)', 'Representante Médico(a)', 'Farmacêutico(a) Responsável', 'Gerente', 'Outros'];

function PipelineContent() {
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [produtosApi, setProdutosApi] = useState<any[]>([]); 
  const [exclusividades, setExclusividades] = useState<any[]>([]); 
  const [baseClientesExterna, setBaseClientesExterna] = useState<any[]>([]); 
  const [equipe, setEquipe] = useState<any[]>([]); 
  
  const [loading, setLoading] = useState(true);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [buscaTermo, setBuscaTermo] = useState(""); 
  
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  const [visaoAdmin, setVisaoAdmin] = useState<'meus' | 'todos'>('meus');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<any>(null);
  const [blockModal, setBlockModal] = useState({ open: false, title: '', message: '', motivo: '' });
  
  const [confirmModal, setConfirmModal] = useState<{open: boolean, title?: string, message: string, onConfirm: () => void, onCancel: () => void}>({
      open: false, title: 'AVISO IMPORTANTE', message: '', onConfirm: () => {}, onCancel: () => {}
  });

  const [lembreteModal, setLembreteModal] = useState({ open: false, clientes: [] as any[] });

  const [novaNotaInput, setNovaNotaInput] = useState("");
  const [isRepLocked, setIsRepLocked] = useState(false); 
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [mounted, setMounted] = useState(false);

  // --- ESTADOS DO CHAT INTERNO ---
  const [chatMsgs, setChatMsgs] = useState<any[]>([]);
  const [mensagensPendentes, setMensagensPendentes] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  const getLocalData = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };

  const [contatosList, setContatosList] = useState([{ nome: '', cargo: 'Comprador(a)', telefone: '', email: '' }]);

  const [formData, setFormData] = useState({
    cnpj: '', nome_cliente: '', produto: '', validade_produto: '',
    aplicacao: '', valor: '', data_entrada: getLocalData(), data_lembrete: '', data_lembrete_sdr: '', 
    canal_contato: 'WhatsApp', observacoes: '', observacoes_proposta: '', 
    status: 'prospeccao', kg_proposto: '1', kg_bonificado: '0', parcelas: '1', dias_primeira_parcela: '45',
    peso_formula_g: '13.2', fator_lucro: '5', custo_fixo_operacional: '0', 
    endereco: '', cidade_exclusividade: '', uf_exclusividade: '', valor_g_tabela: '0', numero_proposta: 0,
    user_id: '' 
  });

  const cargoStrLogado = String(usuarioLogado?.cargo || "").toLowerCase();
  const nomeStrLogado = String(usuarioLogado?.nome || "").toLowerCase();

  const isSDRUser = cargoStrLogado.includes('p&d') || cargoStrLogado.includes('sdr') || nomeStrLogado.includes('jaque') || nomeStrLogado.includes('eduarda');
  
  const isAdminUser = usuarioLogado && (
      ['admin', 'diretor', 'master'].some(c => cargoStrLogado.includes(c)) ||
      cargoStrLogado.includes('p&d') ||
      nomeStrLogado.includes('eduarda')
  );

  useEffect(() => { 
    setMounted(true); 
    inicializarDados();
  }, []);

  useEffect(() => {
    if (oportunidades.length === 0 || !usuarioLogado) return;
    const hoje = getLocalData();
    let temLembreteHoje = false;
    let clientesAvisar: any[] = [];

    oportunidades.forEach(op => {
        if (op.user_id === usuarioLogado.id && op.data_lembrete === hoje && !['fechado', 'perdido'].includes(op.status)) {
            temLembreteHoje = true;
            clientesAvisar.push({ id: op.id, nome: op.nome_cliente, tipo: 'Seu Contato' });
        }
        if (isSDRUser && op.data_lembrete_sdr === hoje && !['fechado', 'perdido'].includes(op.status)) {
            temLembreteHoje = true;
            clientesAvisar.push({ id: op.id, nome: op.nome_cliente, tipo: 'Cobrar Closer' });
        }
    });

    if (temLembreteHoje) {
        const checkAlarme = sessionStorage.getItem('alarme_pipeline_tocado_' + hoje);
        if (!checkAlarme) {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(() => {});
            setLembreteModal({ open: true, clientes: clientesAvisar });
            sessionStorage.setItem('alarme_pipeline_tocado_' + hoje, 'true');
        }
    }
  }, [oportunidades, usuarioLogado]);

  const opIdUrl = searchParams.get('op_id');
  useEffect(() => {
      const abrirOpViaUrl = async () => {
          if (!opIdUrl) return;

          let opEncontrada = oportunidades.find(o => String(o.id) === opIdUrl);

          if (!opEncontrada) {
              const { data } = await supabase.from('pipeline').select('*').eq('id', opIdUrl).single();
              if (data) opEncontrada = data;
          }

          if (opEncontrada && (!editingOp || String(editingOp.id) !== opIdUrl)) {
              setEditingOp(opEncontrada);
              setFormData(prev => ({...prev, ...opEncontrada, custo_fixo_operacional: opEncontrada.custo_fixo_operacional || '0'}));
              
              let contatosCarregados = [{
                  nome: opEncontrada.contato || '',
                  cargo: opEncontrada.cargo_contato || 'Comprador(a)',
                  telefone: opEncontrada.telefone || '',
                  email: opEncontrada.email || ''
              }];
              if (opEncontrada.contatos_adicionais) {
                  try {
                      const adicionaisParsed = typeof opEncontrada.contatos_adicionais === 'string' ? JSON.parse(opEncontrada.contatos_adicionais) : opEncontrada.contatos_adicionais;
                      contatosCarregados = [...contatosCarregados, ...adicionaisParsed];
                  } catch (e) {}
              }
              setContatosList(contatosCarregados);

              setIsRepLocked(false);
              setNovaNotaInput("");
              setChatInput("");
              setChatMsgs([]);
              setMensagensPendentes([]);
              setModalOpen(true);
          }
      };

      abrirOpViaUrl();
  }, [opIdUrl, oportunidades]);

  useEffect(() => {
      if (!editingOp || !modalOpen) return;

      const fetchMensagens = async () => {
          const { data, error } = await supabase
            .from('chat_mensagens')
            .select('*, perfis(nome)')
            .eq('referencia_tipo', 'pipeline')
            .eq('referencia_id', String(editingOp.id))
            .order('created_at', { ascending: true });
          
          if (error) console.error("Erro ao buscar chat:", error);
          
          setChatMsgs(data || []);
          setTimeout(() => {
              if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
          }, 100);
      };

      fetchMensagens();

      const channel = supabase.channel(`chat_${editingOp.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensagens', filter: `referencia_id=eq.${editingOp.id}` }, () => {
              fetchMensagens(); 
          })
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [editingOp, modalOpen, supabase]);

  const handleChatInputChange = (e: any) => {
      const val = e.target.value;
      setChatInput(val);

      const match = val.match(/(?:^|\s)@(\w*)$/);
      if (match) {
          setShowMentions(true);
          setMentionQuery(match[1].toLowerCase());
      } else {
          setShowMentions(false);
      }
  };

  const inserirMencao = (nomeUsuario: string) => {
      const novoTexto = chatInput.replace(/(?:^|\s)@(\w*)$/, ` @${nomeUsuario.split(' ')[0]} `);
      setChatInput(novoTexto);
      setShowMentions(false);
  };

  const enviarMensagemChat = async () => {
      if (!chatInput.trim()) return;
      const msgTexto = chatInput;
      setChatInput(""); 
      setShowMentions(false);

      const msgOtimista = {
          id: 'temp-' + Date.now(),
          user_id: usuarioLogado.id,
          referencia_tipo: 'pipeline',
          referencia_id: editingOp ? String(editingOp.id) : 'nova',
          texto: msgTexto,
          created_at: new Date().toISOString(),
          perfis: { nome: usuarioLogado.nome }
      };
      setChatMsgs(prev => [...prev, msgOtimista]);
      setTimeout(() => {
          if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }, 100);

      if (!editingOp) {
          setMensagensPendentes(prev => [...prev, msgTexto]);
          return;
      }

      const { data: novaMsg, error } = await supabase.from('chat_mensagens').insert({
          user_id: usuarioLogado.id,
          referencia_tipo: 'pipeline',
          referencia_id: String(editingOp.id),
          texto: msgTexto
      }).select();

      if (error) {
          console.error(error);
          alert("Aviso: Ocorreu um erro na rede e a mensagem pode não ter sido entregue.");
          setChatMsgs(prev => prev.filter(m => m.id !== msgOtimista.id));
          return;
      }

      if (novaMsg) {
          const regex = /@(\w+)/g;
          const mencoes = msgTexto.match(regex);
          if (mencoes) {
              mencoes.forEach(async (mentionStr) => {
                  const nomeMencionado = mentionStr.substring(1).toLowerCase(); 
                  const usuarioAlvo = equipe.find(u => u.nome.toLowerCase().includes(nomeMencionado));
                  
                  if (usuarioAlvo && usuarioAlvo.id !== usuarioLogado.id) {
                      await supabase.from('notificacoes').insert({
                          user_id: usuarioAlvo.id,
                          remetente: usuarioLogado.nome.split(' ')[0],
                          mensagem: `Mencionou você no chat da conta: ${editingOp.nome_cliente}`,
                          link: `/pipeline?op_id=${editingOp.id}`
                      });
                  }
              });
          }
      }
  };

  const fecharModalELimparURL = () => {
      setModalOpen(false);
      router.replace('/pipeline', { scroll: false });
  };

  const inicializarDados = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    let perfilUsuario = null;
    
    if (user) {
        const { data: perfil } = await supabase.from('perfis').select('*').eq('id', user.id).single();
        perfilUsuario = perfil;
        setUsuarioLogado(perfil);
    }
    
    const { data: listaEquipe } = await supabase.from('perfis').select('id, nome, cargo, acessos, telefone').order('nome');
    if (listaEquipe) {
        const vendedoresAtivos = listaEquipe.filter(u => u.acessos && u.acessos.pipeline === true);
        setEquipe(vendedoresAtivos);
    }

    await Promise.all([carregarOportunidades(perfilUsuario), carregarProdutosDaAPI(), carregarExclusividades(), carregarBaseClientesOficial()]);
    setLoading(false);
  };

  const parseMoney = (valor: any) => {
    if (typeof valor === 'number') return valor;
    if (!valor) return 0;
    let str = String(valor).replace('R$', '').trim();
    if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(str) || 0;
  };

  const formatPropostaId = (id: any) => String(id).padStart(5, '0');
  const formatCurrency = (val: any) => (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatarDataPlanilha = (val: any) => {
      if (!val) return '';
      if (typeof val === 'string' && val.includes('T') && val.includes('-')) {
          try {
              const d = new Date(val);
              d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
              return d.toLocaleDateString('pt-BR');
          } catch (e) { return String(val); }
      }
      if (val instanceof Date) return val.toLocaleDateString('pt-BR');
      return String(val);
  };

  const carregarExclusividades = async () => {
    const { data } = await supabase.from('exclusividades').select('*');
    setExclusividades(data || []);
  };

  const carregarBaseClientesOficial = async () => {
    try {
        const res = await fetch(`${API_CLIENTES_URL}?path=clientes`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) setBaseClientesExterna(json.data);
    } catch (e) {}
  };

  const carregarProdutosDaAPI = async () => {
    setLoadingProdutos(true);
    try {
        const res = await fetch(`${API_PRODUTOS_URL}?path=produtos`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            const produtosLimpos = json.data.map((p: any) => {
                let validadeBruta = p.validade || p.data_validade || p.vencimento || p['validade do ativo'] || p['Validade'] || '';
                return {
                    ativo: p.ativo ? p.ativo.trim() : 'Sem Nome',
                    preco_grama: parseMoney(p.preco_grama), 
                    peso_formula: parseMoney(p.peso_formula) || 13.2,
                    validade: formatarDataPlanilha(validadeBruta)
                }
            });
            setProdutosApi(produtosLimpos.sort((a: any, b: any) => a.ativo.localeCompare(b.ativo)));
        }
    } catch (e) {}
    setLoadingProdutos(false);
  };

  const carregarOportunidades = async (perfil: any) => {
    let query = supabase.from('pipeline').select('*').order('created_at', { ascending: false });
    
    const perfilCargo = String(perfil?.cargo || "").toLowerCase();
    const perfilNome = String(perfil?.nome || "").toLowerCase();
    const isMaster = ['admin', 'diretor', 'master'].some(c => perfilCargo.includes(c)) ||
                     perfilCargo.includes('p&d') ||
                     perfilNome.includes('eduarda');

    if (!isMaster) {
        query = query.or(`user_id.eq.${perfil.id},sdr_id.eq.${perfil.id}`);
    }
    
    const { data, error } = await query;
    if (error) console.error("Erro ao buscar:", error);
    setOportunidades(data || []);
  };

  const produtosDisponiveis = produtosApi.filter(prod => {
    const nomeProduto = prod.ativo;
    const ufAtual = (formData.uf_exclusividade || '').toUpperCase().trim();
    const cidadeAtual = (formData.cidade_exclusividade || '').toUpperCase().trim();
    if (!ufAtual) return true;
    return !exclusividades.some(ex => ex.produto === nomeProduto && ex.uf === ufAtual && (ex.cidade === cidadeAtual || ex.cidade === 'TODAS') && ex.nome_cliente !== formData.nome_cliente);
  });

  useEffect(() => {
    if (!formData.produto) return;
    const produtoSelecionado = produtosApi.find(p => p.ativo === formData.produto);
    
    if (produtoSelecionado) {
        setFormData(prev => {
            if (editingOp && editingOp.produto === prev.produto) {
                return {
                    ...prev,
                    validade_produto: prev.validade_produto || produtoSelecionado.validade || '', 
                    valor_g_tabela: prev.valor_g_tabela || produtoSelecionado.preco_grama.toFixed(2).replace('.', ','),
                    peso_formula_g: prev.peso_formula_g || produtoSelecionado.peso_formula.toString()
                };
            }
            
            return {
                ...prev,
                validade_produto: produtoSelecionado.validade || '',
                valor_g_tabela: produtoSelecionado.preco_grama.toFixed(2).replace('.', ','),
                peso_formula_g: produtoSelecionado.peso_formula.toString()
            };
        });
    }
  }, [formData.produto, produtosApi, editingOp]);

  useEffect(() => {
    const precoG = parseMoney(formData.valor_g_tabela);
    const kg = parseMoney(formData.kg_proposto);
    const vTotal = (precoG * 1000 * kg).toFixed(2); 
    setFormData(prev => prev.valor === vTotal ? prev : { ...prev, valor: vTotal });
  }, [formData.valor_g_tabela, formData.kg_proposto]);

  const buscarDadosCNPJ = async () => {
    const cnpjLimpo = formData.cnpj?.replace(/\D/g, '');
    if (cnpjLimpo?.length !== 14) return;
    setLoadingCNPJ(true);

    if (!editingOp) {
        const propostaExistente = oportunidades.find(op => (op.cnpj?.replace(/\D/g, '') || '') === cnpjLimpo);
        if (propostaExistente) {
            const statusLabel = ESTAGIOS.find(e => e.id === propostaExistente.status)?.label || propostaExistente.status;
            setConfirmModal({
                open: true,
                message: `Você já tem uma proposta para este CNPJ no status "${statusLabel.toUpperCase()}". Deseja realmente abrir uma NOVA proposta?`,
                onConfirm: () => { setConfirmModal(prev => ({ ...prev, open: false })); continuarBuscaCNPJ(cnpjLimpo); },
                onCancel: () => { setConfirmModal({ open: false, message: '', onConfirm: () => {}, onCancel: () => {} }); setFormData(prev => ({ ...prev, cnpj: '' })); setLoadingCNPJ(false); }
            });
            return; 
        }
    }
    continuarBuscaCNPJ(cnpjLimpo);
  };

  const continuarBuscaCNPJ = async (cnpjLimpo: string) => {
    const clienteNaBase = baseClientesExterna.find(c => {
        const cnpjDireto = String(c.cnpj || c.CNPJ || c.documento || c.Documento || '').replace(/\D/g, '');
        if (cnpjDireto === cnpjLimpo) return true;
        return Object.values(c).some(val => {
            if (val && (typeof val === 'string' || typeof val === 'number')) return String(val).replace(/\D/g, '') === cnpjLimpo;
            return false;
        });
    });

    if (clienteNaBase) {
        const chavesERP = Object.keys(clienteNaBase).reduce((acc, key) => { acc[key.toLowerCase().trim()] = clienteNaBase[key]; return acc; }, {} as any);
        const isBloqueado = chavesERP.bloqueado === true || String(chavesERP.bloqueado).toLowerCase() === 'sim';
        const motivoBloqueio = chavesERP.motivobloqueio || chavesERP.motivo || 'Verifique com o financeiro.';
        const vendedorERP = String(chavesERP.vendedor || chavesERP.consultor || chavesERP.representante || '').trim();
        const nomeFantasiaOuRazao = String(chavesERP.fantasia || chavesERP['nome fantasia'] || chavesERP.razaosocial || chavesERP['razão social'] || 'Cliente do ERP').toUpperCase();

        if (isBloqueado) {
            setBlockModal({ open: true, title: 'ACESSO NEGADO', message: `A farmácia "${nomeFantasiaOuRazao}" JÁ ESTÁ CADASTRADA no ERP.`, motivo: `Restrição Financeira/Administrativa: ${motivoBloqueio}` });
            setFormData(prev => ({ ...prev, cnpj: '' }));
            setLoadingCNPJ(false);
            return; 
        }

        if (vendedorERP !== "") {
            const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            const vendedorNorm = normalizeStr(vendedorERP);

            const repEncontrado = equipe.find(u => {
                const nomeNorm = normalizeStr(u.nome);
                if (vendedorNorm.includes(nomeNorm) || nomeNorm.includes(vendedorNorm)) return true;
                
                const pVend = vendedorNorm.split(/\s+/);
                const pNome = nomeNorm.split(/\s+/);
                
                if (pVend[0] === pNome[0]) {
                    if (pNome.length === 1) return true;
                    return pNome.slice(1).some(p => p.length > 2 && vendedorNorm.includes(p));
                }
                return false;
            });

            if (repEncontrado) {
                if (isSDRUser || isAdminUser) {
                    setIsRepLocked(false); 
                    setConfirmModal({
                        open: true,
                        title: 'CLIENTE COM CARTEIRA NO ERP',
                        message: `A farmácia "${nomeFantasiaOuRazao}" já pertence a ${repEncontrado.nome.toUpperCase()}.\n\nComo você tem acesso avançado (P&D/SDR/Admin), o sistema pré-selecionou este vendedor, mas você pode repassar a oportunidade para outro representante manualmente se precisar.`,
                        onConfirm: () => { setConfirmModal({ open: false, message: '', onConfirm: () => {}, onCancel: () => {} }); setFormData(prev => ({ ...prev, user_id: repEncontrado.id })); preencherDadosAPI(cnpjLimpo, chavesERP); },
                        onCancel: () => { setConfirmModal({ open: false, message: '', onConfirm: () => {}, onCancel: () => {} }); setFormData(prev => ({ ...prev, cnpj: '', user_id: usuarioLogado.id })); setLoadingCNPJ(false); }
                    });
                } else {
                    setIsRepLocked(true); 
                    setConfirmModal({
                        open: true,
                        title: 'DIRECIONAMENTO AUTOMÁTICO',
                        message: `A farmácia "${nomeFantasiaOuRazao}" já pertence à carteira de ${repEncontrado.nome.toUpperCase()}.\n\nAo continuar, esta oportunidade será criada e repassada automaticamente para o Pipeline dele(a).`,
                        onConfirm: () => { setConfirmModal({ open: false, message: '', onConfirm: () => {}, onCancel: () => {} }); setFormData(prev => ({ ...prev, user_id: repEncontrado.id })); preencherDadosAPI(cnpjLimpo, chavesERP); },
                        onCancel: () => { setConfirmModal({ open: false, message: '', onConfirm: () => {}, onCancel: () => {} }); setFormData(prev => ({ ...prev, cnpj: '', user_id: usuarioLogado.id })); setIsRepLocked(false); setLoadingCNPJ(false); }
                    });
                }
                return;
            } else {
                 if (isSDRUser || isAdminUser) {
                      setConfirmModal({
                          open: true,
                          title: 'VENDEDOR NÃO ENCONTRADO',
                          message: `A farmácia "${nomeFantasiaOuRazao}" pertence a ${vendedorERP.toUpperCase()} no ERP.\n\nPorém, este usuário NÃO possui conta no CRM.\nComo você tem acesso avançado, deseja criar a proposta e repassar para outro representante ativo?`,
                          onConfirm: () => { setConfirmModal({ open: false, message: '', onConfirm: () => {}, onCancel: () => {} }); preencherDadosAPI(cnpjLimpo, chavesERP); },
                          onCancel: () => { setConfirmModal({ open: false, message: '', onConfirm: () => {}, onCancel: () => {} }); setFormData(prev => ({ ...prev, cnpj: '' })); setLoadingCNPJ(false); }
                      });
                 } else {
                      setBlockModal({ open: true, title: 'ACESSO NEGADO', message: `A farmácia "${nomeFantasiaOuRazao}" JÁ ESTÁ CADASTRADA.`, motivo: `Pertence ao vendedor: ${vendedorERP.toUpperCase()}.\n\nEste vendedor não possui conta ativa no CRM para receber o repasse.` });
                      setFormData(prev => ({ ...prev, cnpj: '' })); setLoadingCNPJ(false);
                 }
                 return; 
            }
        }

        setIsRepLocked(false);
        setConfirmModal({
            open: true,
            title: 'FARMÁCIA SEM CARTEIRA',
            message: `A farmácia "${nomeFantasiaOuRazao}" é cliente ativo mas não tem um representante fixo no ERP.\n\nDeseja criar uma nova oportunidade e escolher o representante manualmente?`,
            onConfirm: () => { setConfirmModal({ open: false, message: '', onConfirm: () => {}, onCancel: () => {} }); preencherDadosAPI(cnpjLimpo, chavesERP); },
            onCancel: () => { setConfirmModal({ open: false, message: '', onConfirm: () => {}, onCancel: () => {} }); setFormData(prev => ({ ...prev, cnpj: '' })); setLoadingCNPJ(false); }
        });
        return;
    }

    setIsRepLocked(false);
    preencherDadosAPI(cnpjLimpo, null);
  };

  const preencherDadosAPI = async (cnpjLimpo: string, chavesERP: any) => {
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (res.ok) {
          const data = await res.json();
          const enderecoFormatado = data.logradouro ? `${data.logradouro}, ${data.numero || 'S/N'}${data.complemento ? ' - ' + data.complemento : ''}` : '';
          
          setFormData(prev => ({ 
            ...prev, 
            nome_cliente: (data.nome_fantasia || data.razao_social || chavesERP?.razaosocial || '').toUpperCase(),
            endereco: enderecoFormatado.toUpperCase(),
            cidade_exclusividade: (data.municipio || chavesERP?.cidade || '').toUpperCase(),
            uf_exclusividade: (data.uf || chavesERP?.uf || '').toUpperCase(),
          }));

          setContatosList(prev => {
              const novos = [...prev];
              novos[0] = {
                  ...novos[0],
                  telefone: data.ddd_telefone_1 && data.telefone1 ? `(${data.ddd_telefone_1}) ${data.telefone1}` : (chavesERP?.telefone || prev[0].telefone),
                  email: data.email || chavesERP?.email || prev[0].email || ''
              };
              return novos;
          });
      }
    } catch (e) {
       if (chavesERP) {
          setFormData(prev => ({ 
              ...prev, 
              nome_cliente: (chavesERP.razaosocial || chavesERP.fantasia || '').toUpperCase(), 
              endereco: (chavesERP.endereco || chavesERP.logradouro || '').toUpperCase(),
              cidade_exclusividade: (chavesERP.cidade || '').toUpperCase(), 
              uf_exclusividade: (chavesERP.uf || '').toUpperCase(), 
          }));
          
          setContatosList(prev => {
              const novos = [...prev];
              novos[0] = {
                  ...novos[0],
                  telefone: chavesERP.telefone || prev[0].telefone,
                  email: chavesERP.email || prev[0].email || ''
              };
              return novos;
          });
       }
    }
    setLoadingCNPJ(false);
  };

  const addContato = () => {
      setContatosList([...contatosList, { nome: '', cargo: 'Comprador(a)', telefone: '', email: '' }]);
  };

  const removeContato = (index: number) => {
      const novos = [...contatosList];
      novos.splice(index, 1);
      setContatosList(novos);
  };

  const updateContato = (index: number, campo: string, valor: string) => {
      const novos = [...contatosList];
      novos[index] = { ...novos[index], [campo]: valor };
      setContatosList(novos);
  };

  const adicionarNotaAoHistorico = () => {
    if (!novaNotaInput.trim()) return;
    const dataHora = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const autor = usuarioLogado?.nome ? usuarioLogado.nome.split(' ')[0] : 'Usuário';
    
    const notaFormatada = `📅 ${dataHora} | 👤 ${autor}\n${novaNotaInput}\n────────────────────────────────────────\n${formData.observacoes || ''}`;
    
    setFormData({ ...formData, observacoes: notaFormatada });
    setNovaNotaInput(""); 
  };

  const gerarPropostaIndividualPDF = () => {
    if (!editingOp) return alert("Salve a proposta primeiro antes de gerar o PDF.");

    const doc = new jsPDF();
    const darkGreen = [18, 85, 48]; 
    const lightGreen = [0, 150, 0]; 
    
    try { doc.addImage("/logo.png", "PNG", 14, 10, 40, 16); } 
    catch (e) { try { doc.addImage("/logo.jpg", "JPEG", 14, 10, 40, 16); } catch (err) {} }

    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]); 
    doc.text("PROPOSTA COMERCIAL", 196, 17, { align: "right" });

    doc.setFontSize(9); doc.setTextColor(150, 150, 150);
    doc.text(`Nº ${formatPropostaId(formData.numero_proposta)}`, 196, 22, { align: "right" });
    doc.text("YellowLeaf – Nutraceuticals Company", 196, 26, { align: "right" });

    doc.setDrawColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.setLineWidth(1.2);
    doc.line(14, 31, 196, 31);

    doc.setFillColor(248, 249, 250); 
    doc.rect(14, 35, 182, 23, 'F');

    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text("DADOS DO CLIENTE", 18, 41);

    const contatoPrincipal = contatosList[0] || { nome: '', telefone: '' };

    doc.setFontSize(9); doc.setTextColor(80, 80, 80); doc.setFont("helvetica", "normal");
    doc.text(`Razão Social: ${formData.nome_cliente || 'N/D'}`, 18, 47);
    doc.text(`Contato: ${contatoPrincipal.nome || 'N/D'}   |   Tel: ${contatoPrincipal.telefone || 'N/D'}`, 18, 52);
    doc.text(`Cidade/UF: ${formData.cidade_exclusividade || '-'} / ${formData.uf_exclusividade || '-'}`, 18, 57);

    const precoGrama = parseMoney(formData.valor_g_tabela);
    const kgProposto = parseMoney(formData.kg_proposto);
    const kgBonificado = parseMoney(formData.kg_bonificado);
    const totalKg = kgProposto + kgBonificado;
    const investimentoTotal = precoGrama * 1000 * kgProposto;
    const precoGramaBonificado = totalKg > 0 ? investimentoTotal / (totalKg * 1000) : precoGrama;
    const parcelas = parseInt(String(formData.parcelas)) || 1;
    const valorParcela = parcelas > 0 ? investimentoTotal / parcelas : investimentoTotal;
    const diasPrimeiraParcela = formData.dias_primeira_parcela || '30';
    
    const pesoFormula = parseMoney(formData.peso_formula_g) || 13.2;
    const custoFixo = parseMoney(formData.custo_fixo_operacional) || 0;
    const fatorLucro = parseMoney(formData.fator_lucro) || 5;
    
    const custoMP = precoGramaBonificado * pesoFormula;
    const custoTotalFormula = custoMP + custoFixo;
    const sugestaoVenda = (custoMP * fatorLucro) + custoFixo;
    const qtdFormulasParaPagarParcela = sugestaoVenda > 0 ? (valorParcela / sugestaoVenda) : 0;
    const viabilidadeDiaria = parseInt(String(diasPrimeiraParcela)) > 0 ? (qtdFormulasParaPagarParcela / parseInt(String(diasPrimeiraParcela))) : 0;

    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text("ESPECIFICAÇÃO DO INVESTIMENTO", 14, 66); 

    autoTable(doc, {
        startY: 69,
        head: [['DESCRIÇÃO', 'VALORES']],
        body: [
            ['Ativo/Insumo', formData.produto || 'N/D'],
            ['Validade do Lote/Ativo', formData.validade_produto || 'Consulte Lote Atual'],
            ['Preço por grama (g)', formatCurrency(precoGrama)],
            ['Quantidade da proposta (kg)', `${kgProposto} kg`],
            ['Quantidade bonificada (kg)', `${kgBonificado} kg`],
            ['Investimento Total (R$)', formatCurrency(investimentoTotal)],
            ['Preço do grama c/ bonificação (g)', formatCurrency(precoGramaBonificado)],
            ['Condição de Pagamento', `${parcelas} parcelas de ${formatCurrency(valorParcela)}`],
            ['Vencimento 1ª Parcela', `${diasPrimeiraParcela} dias`]
        ],
        theme: 'grid',
        headStyles: { fillColor: darkGreen, textColor: 255, fontStyle: 'bold', halign: 'left' },
        styles: { fontSize: 9, cellPadding: 3, textColor: [60, 60, 60] },
        columnStyles: { 0: { fontStyle: 'normal' }, 1: { fontStyle: 'bold', halign: 'right' } }
    });

    let finalY = (doc as any).lastAutoTable.finalY || 130;

    autoTable(doc, {
        startY: finalY + 6,
        head: [['ANÁLISE DE RETORNO (PAYBACK)', 'ESTIMATIVA']],
        body: [
            [`Custo Matéria-Prima (Dose ${pesoFormula}g)`, formatCurrency(custoMP)],
            ['Custo Total por Fórmula (Manipulado)', formatCurrency(custoTotalFormula)],
            [`Sugestão de Venda (Fator ${fatorLucro} no Ativo)`, formatCurrency(sugestaoVenda)],
            ['META DE VIABILIDADE', `${viabilidadeDiaria.toFixed(2).replace('.', ',')} fórmulas/dia`]
        ],
        theme: 'grid',
        headStyles: { fillColor: darkGreen, textColor: 255, fontStyle: 'bold', halign: 'left' },
        styles: { fontSize: 9, cellPadding: 3, textColor: [60, 60, 60] },
        columnStyles: { 0: { fontStyle: 'normal' }, 1: { fontStyle: 'bold', halign: 'right' } },
        didParseCell: (data) => {
            if (data.section === 'body' && data.row.index === 3) {
                data.cell.styles.fontStyle = 'bold';
                if (data.column.index === 1) data.cell.styles.textColor = lightGreen;
            }
        }
    });

    finalY = (doc as any).lastAutoTable.finalY || 165;

    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text("QUALIDADE E PRODUÇÃO CERTIFICADA", 105, finalY + 12, { align: "center" });

    doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "normal");
    const textQualidade = "Trabalhamos com matéria-prima advinda de produção certificada pelos mais altos padrões técnicos do mundo e\npromovemos sua comercialização com responsabilidade e ética.";
    doc.text(textQualidade, 105, finalY + 17, { align: "center", lineHeightFactor: 1.5 });

    let imagemAdicionada = false;
    const logoY = finalY + 23;
    try { 
        doc.addImage("/selo.jpg", "JPEG", 65, logoY, 80, 16); 
        imagemAdicionada = true; 
    } catch (e1) {
        try { doc.addImage("/selo.png", "PNG", 65, logoY, 80, 16); imagemAdicionada = true; } catch (e2) {}
    }
    
    if (!imagemAdicionada) {
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
        doc.text("HACCP   |   ISO FSSC 22000   |   GMP   |   CENTHIRD", 105, logoY + 8, { align: "center" });
    }

    doc.setDrawColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.setLineWidth(1); doc.line(14, 275, 196, 275);

    doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.setFont("helvetica", "normal");
    doc.text("YELLOW LEAF IMPORTAÇÃO E EXPORTAÇÃO LTDA | CNPJ: 45.643.261/0001-68", 14, 280);
    doc.text("www.yellowleaf.com.br | @yellowleafnutraceuticals", 14, 284);

    const representante = equipe.find(u => u.id === formData.user_id);
    const responsavelNome = representante?.nome || usuarioLogado?.nome || 'Comercial YellowLeaf';
    const responsavelTel = representante?.telefone || '(44) 99102-7642';

    doc.text(`${responsavelNome} - Comercial YellowLeaf`, 196, 280, { align: "right" });
    doc.text(`WhatsApp: ${responsavelTel}`, 196, 284, { align: "right" });

    doc.save(`Proposta_${formData.nome_cliente.replace(/\s+/g, '_')}_${formatPropostaId(formData.numero_proposta)}.pdf`);
  };

  const gerarRelatorioGeral = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    try { doc.addImage("/logo.png", "PNG", 14, 10, 40, 15); } 
    catch (e) { try { doc.addImage("/logo.jpg", "JPEG", 14, 10, 40, 15); } catch (err) {} }

    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(20, 83, 45);
    doc.text("RELATÓRIO DE PIPELINE E OPORTUNIDADES", 14, 35);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(100);
    doc.text(`Extraído em: ${new Date().toLocaleString('pt-BR')} por ${usuarioLogado?.nome || 'Sistema'}`, 14, 41);

    let dadosOrdenados = [...oportunidades];
    dadosOrdenados.sort((a, b) => (b.numero_proposta || 0) - (a.numero_proposta || 0));

    const headers = ['Nº', 'DATA', 'FARMÁCIA', 'PRODUTO', 'REPRESENTANTE', 'ESTÁGIO', 'VALOR (R$)'];
    const tableBody = dadosOrdenados.map(op => {
        const responsavelNome = equipe.find(u => u.id === op.user_id)?.nome || 'N/A';
        const dataFormatada = op.data_entrada ? op.data_entrada.split('-').reverse().join('/') : '-';
        const estagioNome = ESTAGIOS.find(e => e.id === op.status)?.label || op.status;
        const row = [formatPropostaId(op.numero_proposta), dataFormatada, op.nome_cliente, op.produto || '-', responsavelNome, estagioNome, formatCurrency(op.valor)];
        (row as any)._statusId = op.status;
        return row;
    });

    autoTable(doc, {
        startY: 48,
        head: [headers],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [20, 83, 45], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3, textColor: 60 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 5) {
                const statusId = (data.row.raw as any)._statusId;
                data.cell.styles.textColor = STAGE_COLORS[statusId] || [60, 60, 60];
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    doc.save(`Relatorio_Oportunidades_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
  };

  const handleSave = async () => {
    if (!formData.nome_cliente) return alert("Preencha a Razão Social.");
    if (!formData.user_id) return alert("Selecione um Representante Responsável para assumir esta oportunidade.");
    if (!formData.data_lembrete || formData.data_lembrete.trim() === "") return alert("Por favor, selecione uma data para 'Próximo Contato'. É obrigatório definir um retorno.");

    let valorFinal = parseFloat(String(formData.valor)) || 0;
    let numeroFinal = formData.numero_proposta;
    if (!editingOp) {
        const { data: maxOp } = await supabase.from('pipeline').select('numero_proposta').order('numero_proposta', { ascending: false }).limit(1);
        numeroFinal = (maxOp && maxOp[0]?.numero_proposta ? Number(maxOp[0].numero_proposta) : 467) + 1;
    }

    const isRepasse = formData.user_id !== usuarioLogado?.id;
    
    const contatoPrincipal = contatosList[0] || { nome: '', cargo: 'Comprador(a)', telefone: '', email: '' };
    const contatosExtras = contatosList.slice(1);

    const dadosSalvar = {
        ...formData, 
        user_id: formData.user_id, 
        sdr_id: isRepasse && !editingOp ? usuarioLogado?.id : (editingOp?.sdr_id || null), 
        numero_proposta: numeroFinal, 
        nome_cliente: formData.nome_cliente.toUpperCase(), 
        endereco: formData.endereco ? formData.endereco.toUpperCase() : '',
        contato: contatoPrincipal.nome.toUpperCase(), 
        cargo_contato: contatoPrincipal.cargo,
        telefone: contatoPrincipal.telefone, 
        email: contatoPrincipal.email.toLowerCase(), 
        contatos_adicionais: JSON.stringify(contatosExtras),
        cidade_exclusividade: formData.cidade_exclusividade ? formData.cidade_exclusividade.toUpperCase() : '', 
        uf_exclusividade: formData.uf_exclusividade ? formData.uf_exclusividade.toUpperCase() : '', 
        valor: valorFinal, 
        valor_g_tabela: parseMoney(formData.valor_g_tabela), 
        validade_produto: formData.validade_produto || null, 
        kg_proposto: parseMoney(formData.kg_proposto), 
        kg_bonificado: parseMoney(formData.kg_bonificado), 
        parcelas: parseInt(String(formData.parcelas)) || 1, 
        dias_primeira_parcela: parseInt(String(formData.dias_primeira_parcela)) || 45, 
        peso_formula_g: String(parseMoney(formData.peso_formula_g)), 
        fator_lucro: String(parseMoney(formData.fator_lucro)), 
        custo_fixo_operacional: parseMoney(formData.custo_fixo_operacional), 
        data_lembrete: (formData.data_lembrete && formData.data_lembrete.trim() !== "") ? formData.data_lembrete : null, 
        data_lembrete_sdr: (formData.data_lembrete_sdr && formData.data_lembrete_sdr.trim() !== "") ? formData.data_lembrete_sdr : null,
        data_entrada: formData.data_entrada || getLocalData(), 
        canal_contato: formData.canal_contato, 
        observacoes: formData.observacoes, 
        observacoes_proposta: formData.observacoes_proposta 
    };

    const { data: savedOpData, error } = editingOp 
        ? await supabase.from('pipeline').update(dadosSalvar).eq('id', editingOp.id).select() 
        : await supabase.from('pipeline').insert(dadosSalvar).select();
    
    if (!error) { 
      const opId = editingOp ? editingOp.id : (savedOpData && savedOpData.length > 0 ? savedOpData[0].id : null);

      if (isRepasse && !editingOp && savedOpData && savedOpData.length > 0) {
          await supabase.from('notificacoes').insert({
              user_id: formData.user_id,
              remetente: usuarioLogado.nome,
              mensagem: `Oportunidade Repassada: ${formData.nome_cliente.toUpperCase()} foi enviada para o seu Pipeline.`,
              link: `/pipeline?op_id=${savedOpData[0].id}` 
          });
      }

      if (editingOp && editingOp.sdr_id && editingOp.sdr_id !== usuarioLogado?.id) {
          await supabase.from('notificacoes').insert({
              user_id: editingOp.sdr_id,
              remetente: usuarioLogado.nome,
              mensagem: `A proposta #${formatPropostaId(numeroFinal)} da farmácia ${formData.nome_cliente} foi atualizada no Pipeline.`,
              link: `/pipeline?op_id=${editingOp.id}` 
          });
      }

      if (usuarioLogado?.nome && !usuarioLogado.nome.toLowerCase().includes('eduarda')) {
          const { data: eduardas } = await supabase.from('perfis').select('id').ilike('nome', '%eduarda%').limit(1);
          if (eduardas && eduardas.length > 0 && opId) {
              const acao = editingOp ? 'atualizou a oportunidade' : 'criou uma nova oportunidade';
              await supabase.from('notificacoes').insert({
                  user_id: eduardas[0].id,
                  remetente: usuarioLogado.nome,
                  mensagem: `${usuarioLogado.nome.split(' ')[0]} ${acao}: ${formData.nome_cliente.toUpperCase()}.`,
                  link: `/pipeline?op_id=${opId}`
              });
          }
      }

      if (!editingOp && mensagensPendentes.length > 0 && opId) {
          for (const msgTexto of mensagensPendentes) {
              const { data: novaMsg } = await supabase.from('chat_mensagens').insert({
                  user_id: usuarioLogado.id,
                  referencia_tipo: 'pipeline',
                  referencia_id: String(opId),
                  texto: msgTexto
              }).select();

              if (novaMsg) {
                  const regex = /@(\w+)/g;
                  const mencoes = msgTexto.match(regex);
                  if (mencoes) {
                      mencoes.forEach(async (mentionStr) => {
                          const nomeMencionado = mentionStr.substring(1).toLowerCase(); 
                          const usuarioAlvo = equipe.find(u => u.nome.toLowerCase().includes(nomeMencionado));
                          
                          if (usuarioAlvo && usuarioAlvo.id !== usuarioLogado.id) {
                              await supabase.from('notificacoes').insert({
                                  user_id: usuarioAlvo.id,
                                  remetente: usuarioLogado.nome.split(' ')[0],
                                  mensagem: `Mencionou você no chat da conta: ${formData.nome_cliente.toUpperCase()}`,
                                  link: `/pipeline?op_id=${opId}`
                              });
                          }
                      });
                  }
              }
          }
      }

      fecharModalELimparURL();
      setChatInput("");
      setMensagensPendentes([]); 
      carregarOportunidades(usuarioLogado); 
    } else { 
      alert(`Erro ao salvar: ${error.message}`); 
    }
  };

  const handleDelete = async () => {
    if (confirm('Deseja excluir este registro permanentemente?')) {
        const { error } = await supabase.from('pipeline').delete().eq('id', editingOp.id);
        if (!error) { 
           carregarOportunidades(usuarioLogado); 
           fecharModalELimparURL();
        } 
    }
  };

  const renderCard = (op: any) => {
    const hoje = getLocalData(); 
    const isPerdido = op.status === 'perdido';
    const isAtrasado = op.data_lembrete && op.data_lembrete < hoje;
    const isHoje = op.data_lembrete === hoje; 
    
    let borderClass = 'border-slate-200 hover:border-blue-400';
    let bgClass = 'bg-white';
    let textClass = 'text-slate-400';
    let label = 'Ligar: ';

    if (isAtrasado && !isPerdido) {
        bgClass = 'bg-red-50/50'; borderClass = 'border-red-300'; textClass = 'text-red-600 font-bold'; label = 'Atrasado: ';
    } else if (isHoje && !isPerdido) {
        borderClass = 'border-orange-400'; bgClass = 'bg-orange-50/50'; textClass = 'text-orange-600 font-bold'; label = 'HOJE: ';
    } else if (isPerdido) {
        borderClass = 'border-slate-200'; bgClass = 'bg-slate-50 opacity-60'; textClass = 'text-slate-400';
    }

    const nomeResponsavel = equipe.find(u => u.id === op.user_id)?.nome || 'N/A';
    
    return (
        <div key={op.id} onClick={() => { 
            setEditingOp(op); 
            setFormData({...formData, ...op, custo_fixo_operacional: op.custo_fixo_operacional || '0'});
            
            let contatosCarregados = [{
                nome: op.contato || '',
                cargo: op.cargo_contato || 'Comprador(a)',
                telefone: op.telefone || '',
                email: op.email || ''
            }];
            if (op.contatos_adicionais) {
                try {
                    const adicionaisParsed = typeof op.contatos_adicionais === 'string' ? JSON.parse(op.contatos_adicionais) : op.contatos_adicionais;
                    contatosCarregados = [...contatosCarregados, ...adicionaisParsed];
                } catch (e) {}
            }
            setContatosList(contatosCarregados);

            setIsRepLocked(false); 
            setNovaNotaInput(""); 
            setChatInput(""); 
            setChatMsgs([]); 
            setMensagensPendentes([]); 
            setModalOpen(true); 
        }} className={`p-4 rounded-2xl border-2 cursor-pointer shadow-sm transition hover:shadow-md ${bgClass} ${borderClass}`}>
            <div className="flex justify-between items-start mb-2">
                <div className="max-w-[80%]">
                    <span className="text-[10px] font-black tracking-widest text-slate-400 block mb-0.5">#{formatPropostaId(op.numero_proposta)}</span>
                    <h4 className="font-black text-slate-800 text-sm leading-tight truncate" title={op.nome_cliente}>{op.nome_cliente}</h4>
                </div>
                {op.telefone && (
                    <a href={`https://wa.me/55${op.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-green-500 hover:text-green-600 transition-colors p-1.5 bg-green-50 rounded-lg">
                        <MessageCircle size={16} />
                    </a>
                )}
            </div>
            
            <div className="flex flex-col gap-1.5 mb-3">
                {(op.cidade_exclusividade || op.uf_exclusividade) && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                        <MapPin size={10} className="text-slate-400"/> {op.cidade_exclusividade} - {op.uf_exclusividade}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center py-3 border-y border-slate-100 mb-3">
                <span className="text-[10px] bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase tracking-wider font-black truncate max-w-[50%]">{op.produto}</span>
                <span className="text-sm font-black text-slate-700">{formatCurrency(op.valor)}</span>
            </div>
            
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500" title="Vendedor Responsável">
                    <Briefcase size={12} className="text-blue-500"/> {nomeResponsavel.split(' ')[0]}
                </div>
                {op.data_lembrete && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${textClass}`}>
                        <Clock size={10} /> {label} {op.data_lembrete.split('-').reverse().join('/')} 
                    </div>
                )}
            </div>
        </div>
    );
  }

  const getSortedOpportunities = (estagioId: string) => {
    const ops = oportunidades.filter(o => {
        if (o.status !== estagioId) return false;
        if (isAdminUser && visaoAdmin === 'meus') {
            if (o.user_id !== usuarioLogado?.id && o.sdr_id !== usuarioLogado?.id) return false;
        }
        if (!buscaTermo) return true;
        const term = buscaTermo.toLowerCase();
        const termClean = term.replace(/\D/g, ''); 
        return o.nome_cliente?.toLowerCase().includes(term) || String(o.numero_proposta || '').includes(term) || (termClean.length > 0 && (o.cnpj || '').replace(/\D/g, '').includes(termClean));
    });
    
    if (estagioId === 'prospeccao') {
        const hoje = getLocalData();
        return ops.sort((a, b) => {
            const dataA = a.data_lembrete || '9999-99-99'; const dataB = b.data_lembrete || '9999-99-99';
            const isAtrasadoOuHojeA = dataA <= hoje; const isAtrasadoOuHojeB = dataB <= hoje;
            if (isAtrasadoOuHojeA && !isAtrasadoOuHojeB) return -1;
            if (!isAtrasadoOuHojeA && isAtrasadoOuHojeB) return 1;
            return dataA.localeCompare(dataB);
        });
    }
    return ops;
  };

  return (
    <div className="w-full p-3 md:p-4 h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 md:mb-6 gap-4 shrink-0">
        <div>
            <h1 className="text-xl md:text-2xl font-black text-[#0f392b] tracking-tight flex items-center gap-2">
                <Trello className="text-[#82D14D]"/> Pipeline Comercial
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">Gestão de propostas, aprovações e Hand-off.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 w-full xl:w-auto">
            {isAdminUser && (
                <div className="flex bg-slate-200/70 p-1 rounded-xl shrink-0 w-full sm:w-auto">
                    <button onClick={() => setVisaoAdmin('meus')} className={`flex-1 sm:flex-none px-4 py-2.5 md:py-2 text-[10px] font-black tracking-widest uppercase rounded-lg transition text-center ${visaoAdmin === 'meus' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        Meus Cards
                    </button>
                    <button onClick={() => setVisaoAdmin('todos')} className={`flex-1 sm:flex-none px-4 py-2.5 md:py-2 text-[10px] font-black tracking-widest uppercase rounded-lg transition flex items-center justify-center gap-1 ${visaoAdmin === 'todos' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Users size={12}/> Empresa
                    </button>
                </div>
            )}
            <div className="relative flex-1 sm:w-64 w-full">
                <input type="text" placeholder="Buscar (Nome, CNPJ...)" className="w-full pl-10 pr-4 py-3 md:py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold uppercase text-slate-600 shadow-sm" value={buscaTermo} onChange={(e) => setBuscaTermo(e.target.value)} />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={gerarRelatorioGeral} className="flex-1 sm:flex-none bg-slate-800 text-white px-3 md:px-4 py-3 md:py-2.5 rounded-xl font-bold shadow-lg transition active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap text-xs md:text-sm hover:bg-slate-900">
                    <Printer size={16} /> <span className="hidden sm:inline">Relatório</span>
                </button>
                <button onClick={() => { 
                    setEditingOp(null); 
                    setIsRepLocked(false); 
                    setFormData({cnpj: '', nome_cliente: '', produto: '', validade_produto: '', aplicacao: '', valor: '', data_entrada: getLocalData(), status: 'prospeccao', data_lembrete: '', data_lembrete_sdr: '', observacoes: '', observacoes_proposta: '', canal_contato: 'WhatsApp', kg_proposto: '1', kg_bonificado: '0', parcelas: '1', dias_primeira_parcela: '45', peso_formula_g: '13.2', fator_lucro: '5', custo_fixo_operacional: '0', endereco: '', cidade_exclusividade: '', uf_exclusividade: '', valor_g_tabela: '0', numero_proposta: 0, user_id: usuarioLogado?.id || ''}); 
                    setContatosList([{ nome: '', cargo: 'Comprador(a)', telefone: '', email: '' }]); 
                    setNovaNotaInput(""); 
                    setChatInput("");
                    setChatMsgs([]);
                    setMensagensPendentes([]);
                    setModalOpen(true); 
                }} className="flex-1 sm:flex-none bg-blue-600 text-white px-3 md:px-4 py-3 md:py-2.5 rounded-xl font-bold shadow-lg transition active:scale-95 whitespace-nowrap text-xs md:text-sm flex items-center justify-center gap-2 hover:bg-blue-700">
                    <Plus size={16} /> Nova Op.
                </button>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth custom-scrollbar -mx-3 px-3 md:mx-0 md:px-0">
          <div className="flex gap-3 md:gap-4 h-full min-w-max">
            {ESTAGIOS.map(est => (
              <div key={est.id} className="w-[85vw] sm:w-[300px] snap-center shrink-0 bg-slate-100/50 rounded-2xl border border-slate-200 flex flex-col h-full overflow-hidden">
                <div className={`p-4 border-b-4 ${est.color} bg-white flex justify-between items-center shadow-sm shrink-0`}>
                    <h3 className={`font-black text-xs uppercase tracking-widest ${est.text}`}>{est.label}</h3>
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-lg">{getSortedOpportunities(est.id).length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-3 custom-scrollbar">
                  {getSortedOpportunities(est.id).map(op => renderCard(op))}
                </div>
              </div>
            ))}
          </div>
      </div>

      {modalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4">
          <div className="bg-white w-full h-[95vh] md:h-auto md:max-h-[95vh] md:max-w-6xl rounded-t-3xl md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200">
            
            <div className="bg-[#1e293b] p-4 md:p-6 flex justify-between items-center text-white shrink-0 border-b-4 border-blue-500">
              <div className="overflow-hidden mr-2">
                  <h2 className="text-lg md:text-xl font-black flex items-center gap-2 truncate">
                     {editingOp ? `Editar #${formatPropostaId(editingOp.numero_proposta)}` : 'Nova Oportunidade'}
                  </h2>
                  <p className="text-xs md:text-sm font-medium text-slate-300 mt-1 truncate">{editingOp ? editingOp.nome_cliente : 'Preencha o CNPJ para validar.'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {editingOp && (
                    <button onClick={gerarPropostaIndividualPDF} className="bg-white/10 hover:bg-white/20 text-white px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold flex items-center gap-1.5 transition border border-white/20">
                        <FileText size={16}/> <span className="hidden sm:inline">Gerar PDF</span>
                    </button>
                )}
                <button onClick={fecharModalELimparURL} className="hover:bg-white/20 p-2 rounded-full transition bg-white/10 text-white"><X size={20}/></button>
              </div>
            </div>

            <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 overflow-y-auto bg-slate-50 flex-1 custom-scrollbar">
              
              {/* LADO ESQUERDO (Formulário) */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 content-start">
                  <div className="md:col-span-4 flex items-center gap-2 mb-1 md:mb-2">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs md:text-sm">1</div>
                      <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest">Identificação e Atribuição</h3>
                  </div>
                  
                  <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">CNPJ (Com Validação)</label>
                      <div className="flex gap-2">
                          <input className="w-full bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none rounded-xl p-3 text-sm font-medium transition shadow-sm" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} onBlur={buscarDadosCNPJ} placeholder="Digite para buscar..."/>
                          <button type="button" onClick={buscarDadosCNPJ} className="bg-blue-600 text-white p-3 rounded-xl shadow-sm hover:bg-blue-700 transition"><Loader2 size={20} className={loadingCNPJ ? "animate-spin" : "hidden"}/><Search size={20} className={loadingCNPJ ? "hidden" : ""}/></button>
                      </div>
                  </div>

                  <div className="md:col-span-2">
                      <label className="text-xs font-black text-green-700 mb-1.5 block uppercase tracking-widest">Farmácia (Nome Fantasia)</label>
                      <input className="w-full bg-green-50 border-2 border-green-400 focus:border-green-600 rounded-xl p-3 text-sm font-black text-green-900 uppercase outline-none shadow-sm transition-colors" value={formData.nome_cliente} onChange={e => setFormData({...formData, nome_cliente: e.target.value.toUpperCase()})} placeholder="NOME DA FARMÁCIA"/>
                  </div>

                  <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1"><MapPin size={14}/> Endereço Completo</label>
                      <input className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl p-3 text-sm font-medium uppercase outline-none shadow-sm" value={formData.endereco} onChange={e => setFormData({...formData, endereco: e.target.value.toUpperCase()})} placeholder="Rua, Número, Bairro"/>
                  </div>

                  <div className="md:col-span-1">
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Cidade</label>
                      <input className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl p-3 text-sm font-bold uppercase outline-none shadow-sm" value={formData.cidade_exclusividade} onChange={e => setFormData({...formData, cidade_exclusividade: e.target.value.toUpperCase()})} placeholder="CIDADE"/>
                  </div>

                  <div className="md:col-span-1">
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">UF</label>
                      <input className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl p-3 text-sm font-bold uppercase outline-none shadow-sm text-center" value={formData.uf_exclusividade} onChange={e => setFormData({...formData, uf_exclusividade: e.target.value.toUpperCase()})} placeholder="SP" maxLength={2}/>
                  </div>
                  
                  <div className="md:col-span-4 mt-2">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Users size={14}/> Contatos da Farmácia</label>
                      </div>
                      
                      {contatosList.map((contato, idx) => (
                          <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl mb-3 relative shadow-sm hover:border-blue-300 transition-colors">
                              {idx > 0 && (
                                  <button type="button" onClick={() => removeContato(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-2 rounded-lg transition" title="Remover Contato">
                                      <Trash2 size={16}/>
                                  </button>
                              )}
                              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">
                                  {idx === 0 ? '⭐ Contato Principal (Aparece no PDF)' : `👤 Contato Adicional ${idx + 1}`}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Nome do Contato</label>
                                      <input className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl p-3 text-sm font-bold uppercase outline-none shadow-sm transition" value={contato.nome} onChange={e => updateContato(idx, 'nome', e.target.value.toUpperCase())} placeholder="EX: DRA. JULIA"/>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Cargo / Papel</label>
                                      <select className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl p-3 text-sm font-medium outline-none shadow-sm cursor-pointer transition" value={contato.cargo} onChange={e => updateContato(idx, 'cargo', e.target.value)}>
                                          {OPCOES_CARGO_CONTATO.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">WhatsApp / Tel</label>
                                      <input className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl p-3 text-sm font-bold outline-none shadow-sm transition" value={contato.telefone} onChange={e => updateContato(idx, 'telefone', e.target.value)} placeholder="(11) 99999-9999"/>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">E-mail</label>
                                      <input type="email" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl p-3 text-sm font-medium outline-none shadow-sm transition" value={contato.email} onChange={e => updateContato(idx, 'email', e.target.value.toLowerCase())} placeholder="email@farmacia.com"/>
                                  </div>
                              </div>
                          </div>
                      ))}
                      
                      <button type="button" onClick={addContato} className="mt-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2.5 rounded-xl transition flex items-center gap-2 active:scale-95">
                          <UserPlus size={14}/> Adicionar Outro Contato
                      </button>
                  </div>

                  <div className="md:col-span-2 bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm relative mt-2">
                      <div className="absolute right-0 top-0 w-16 h-16 bg-blue-500 rounded-bl-full opacity-10 pointer-events-none"></div>
                      <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-1 relative z-10"><Briefcase size={12}/> Vendedor Responsável (Hand-off)</label>
                      <select value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})} disabled={isRepLocked} className="w-full relative z-10 bg-white border border-blue-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none shadow-sm cursor-pointer disabled:bg-slate-100 disabled:text-slate-500">
                          <option value="">Selecione o Representante...</option>
                          {equipe.map(u => <option key={u.id} value={u.id}>{u.nome} ({u.cargo})</option>)}
                      </select>
                      {isRepLocked && <p className="text-[9px] font-bold text-red-500 mt-1 uppercase relative z-10">Bloqueado pela regra de carteira ERP</p>}
                  </div>
                  <div className="md:col-span-2 mt-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Status no Funil</label>
                      <select className="w-full bg-white border border-slate-300 text-blue-700 text-sm font-bold p-3 rounded-xl outline-none shadow-sm cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                          {ESTAGIOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                      </select>
                  </div>

                  <div className="md:col-span-4 flex items-center gap-2 mb-1 md:mb-2 mt-4 md:mt-6">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs md:text-sm">2</div>
                      <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest">Produto e Precificação</h3>
                  </div>
                  <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-700 mb-1.5 flex justify-between">Ativo a Negociar <Loader2 size={12} className={loadingProdutos ? "animate-spin text-blue-500" : "hidden"}/></label>
                      <select className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold disabled:opacity-50 outline-none shadow-sm cursor-pointer" value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})} disabled={loadingProdutos}>
                          <option value="">Selecione...</option>
                          {produtosDisponiveis.map(p => <option key={p.ativo} value={p.ativo}>{p.ativo}</option>)}
                      </select>
                  </div>
                  <div className="md:col-span-2"><label className="text-xs font-bold text-slate-700 mb-1.5 block">Validade do Ativo</label><input type="text" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold outline-none shadow-sm text-slate-500" value={formData.validade_produto} onChange={e => setFormData({...formData, validade_produto: e.target.value})} placeholder="Mês/Ano ou Lote" /></div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:col-span-4">
                      <div><label className="text-xs font-bold text-slate-700 mb-1.5 block">Preço/g (R$)</label><input type="text" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-black text-emerald-700 outline-none shadow-sm" value={formData.valor_g_tabela} onChange={e => setFormData({...formData, valor_g_tabela: e.target.value})} /></div>
                      <div><label className="text-xs font-bold text-slate-700 mb-1.5 block">KG Proposto</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold outline-none shadow-sm" value={formData.kg_proposto} onChange={e => setFormData({...formData, kg_proposto: e.target.value})}/></div>
                      <div><label className="text-xs font-bold text-slate-700 mb-1.5 block">KG Bonificado</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold outline-none shadow-sm" value={formData.kg_bonificado} onChange={e => setFormData({...formData, kg_bonificado: e.target.value})}/></div>
                      <div><label className="text-xs font-bold text-slate-700 mb-1.5 block">Parcelas</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold outline-none shadow-sm" value={formData.parcelas} onChange={e => setFormData({...formData, parcelas: e.target.value})}/></div>
                  </div>
                  <div className="md:col-span-2"><label className="text-xs font-bold text-slate-700 mb-1.5 block">Dias para 1ª Parcela</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold outline-none shadow-sm" value={formData.dias_primeira_parcela} onChange={e => setFormData({...formData, dias_primeira_parcela: e.target.value})}/></div>

                  <div className="md:col-span-4 border-t border-slate-200 my-2 md:my-4 pt-4">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Variáveis do Payback (Para o PDF)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div><label className="text-xs font-bold text-slate-700 mb-1.5 block">Peso da Fórmula (g)</label><input type="text" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold outline-none shadow-sm" value={formData.peso_formula_g} onChange={e => setFormData({...formData, peso_formula_g: e.target.value})}/></div>
                          <div><label className="text-xs font-bold text-slate-700 mb-1.5 block">Fator de Lucro</label><input type="text" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold outline-none shadow-sm" value={formData.fator_lucro} onChange={e => setFormData({...formData, fator_lucro: e.target.value})}/></div>
                          <div><label className="text-xs font-bold text-slate-700 mb-1.5 block">Custo Fixo / Fórm. (R$)</label><input type="text" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold outline-none shadow-sm" value={formData.custo_fixo_operacional} onChange={e => setFormData({...formData, custo_fixo_operacional: e.target.value})}/></div>
                      </div>
                  </div>

                  <div className="md:col-span-4 bg-slate-800 p-4 rounded-2xl flex items-center justify-between text-white mt-2 shadow-lg">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-300">Total Proposta</span>
                      <span className="text-xl md:text-2xl font-black text-[#82D14D]">{formatCurrency(formData.valor)}</span>
                  </div>

                  <div className="md:col-span-4 flex items-center gap-2 mb-1 md:mb-2 mt-4 md:mt-6">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs md:text-sm">3</div>
                      <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest">Follow-up Clássico</h3>
                  </div>
                  
                  <div className="md:col-span-1">
                      <label className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1 mb-1.5"><Clock size={12}/> Próx. Contato</label>
                      <input type="date" className="w-full bg-white border border-red-200 focus:border-red-500 rounded-xl p-3 text-sm font-bold text-red-900 outline-none shadow-sm cursor-pointer" value={formData.data_lembrete} onChange={e => setFormData({...formData, data_lembrete: e.target.value})} />
                  </div>
                  <div className="md:col-span-1">
                      <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1 mb-1.5"><Clock size={12}/> Cobrar SDR</label>
                      <input type="date" className="w-full bg-white border border-purple-200 focus:border-purple-500 rounded-xl p-3 text-sm font-bold text-purple-900 outline-none shadow-sm cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200" value={formData.data_lembrete_sdr} onChange={e => setFormData({...formData, data_lembrete_sdr: e.target.value})} disabled={!isSDRUser} title={!isSDRUser ? "Apenas a equipe de SDR/P&D pode alterar esta data." : "Defina a data para cobrar o vendedor"}/>
                  </div>

                  <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1.5 block">Canal de Contato</label>
                      <select className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium outline-none shadow-sm cursor-pointer" value={formData.canal_contato} onChange={e => setFormData({...formData, canal_contato: e.target.value})}>{CANAIS_CONTATO.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  </div>

                  {/* BLOCO ORIGINAL RESTAURADO EXATAMENTE COMO PEDIDO */}
                  <div className="md:col-span-4 space-y-3 mt-4">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                          <MessageSquare size={14}/> Nova Anotação
                      </label>
                      
                      <div className="flex flex-col gap-2 bg-blue-50/50 p-3 border border-blue-100 rounded-2xl">
                          <textarea 
                              className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl p-3 outline-none text-sm text-slate-700 font-medium shadow-sm transition resize-none min-h-[80px] custom-scrollbar" 
                              placeholder="Escreva sua anotação aqui... (Use a tecla 'Enter' para pular linhas e formatar o texto livremente)" 
                              value={novaNotaInput} 
                              onChange={(e) => setNovaNotaInput(e.target.value)} 
                          />
                          <button type="button" onClick={adicionarNotaAoHistorico} className="self-end bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition font-bold shadow-md active:scale-95 flex items-center gap-2 text-xs">
                              <Send size={14}/> Registrar no Histórico
                          </button>
                      </div>

                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mt-4 mb-2">
                          <History size={14}/> Histórico Imutável
                      </label>
                      <textarea 
                          className="w-full bg-slate-100 border border-slate-200 rounded-xl p-4 h-48 resize-none text-xs text-slate-700 font-mono leading-relaxed shadow-inner outline-none custom-scrollbar" 
                          value={formData.observacoes} 
                          readOnly 
                          placeholder="Todo o histórico de conversas será registrado aqui com data e hora e não poderá ser alterado..."
                      />
                  </div>

              </div>

              {/* LADO DIREITO (Chat Novo) */}
              <div className="lg:col-span-4 flex flex-col h-[500px] lg:h-full min-h-[400px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-100 p-3 border-b border-slate-200 shrink-0">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <MessageSquare size={16} className="text-blue-500"/> Discussão da Conta
                      </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-3 custom-scrollbar" ref={chatScrollRef}>
                      {chatMsgs.length === 0 ? (
                          <div className="m-auto text-center p-4">
                              <MessageCircle size={32} className="mx-auto text-slate-300 mb-2"/>
                              <p className="text-xs text-slate-500 font-medium">Inicie a discussão desta proposta. Use @ para notificar a equipe.</p>
                          </div>
                      ) : (
                          chatMsgs.map(msg => {
                              const isMe = msg.user_id === usuarioLogado?.id;
                              return (
                                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[90%] ${isMe ? 'self-end' : 'self-start'}`}>
                                      <span className="text-[9px] font-bold text-slate-400 mb-1 ml-1">{msg.perfis?.nome?.split(' ')[0] || 'Usuário'} • {new Date(msg.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                                      <div className={`p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'}`}>
                                          {/* Renderiza as menções em negrito */}
                                          {msg.texto.split(/(@\w+)/g).map((part: string, i: number) => 
                                              part.startsWith('@') ? <span key={i} className={isMe ? "text-yellow-300 font-black" : "text-blue-600 font-black"}>{part}</span> : part
                                          )}
                                      </div>
                                  </div>
                              )
                          })
                      )}
                  </div>

                  <div className="p-3 bg-white border-t border-slate-200 shrink-0 relative">
                      {showMentions && mentionQuery !== "" && (
                          <div className="absolute bottom-full mb-2 left-3 right-3 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                              <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mencionar Usuário</div>
                              <ul className="max-h-40 overflow-y-auto custom-scrollbar p-1">
                                  {equipe.filter(u => u.nome.toLowerCase().includes(mentionQuery) || u.cargo.toLowerCase().includes(mentionQuery)).map(u => (
                                      <li key={u.id} onClick={() => inserirMencao(u.nome)} className="p-2 hover:bg-blue-50 text-xs font-bold text-slate-700 cursor-pointer rounded-lg flex justify-between items-center transition">
                                          {u.nome} <span className="text-[9px] text-slate-400 font-medium bg-white px-1.5 py-0.5 rounded border border-slate-100">{u.cargo}</span>
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      )}
                      
                      <div className="relative">
                          <textarea 
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-3 pr-12 text-sm text-slate-700 font-medium outline-none resize-none min-h-[80px] transition custom-scrollbar"
                              placeholder="Digite sua mensagem... (Use @ para marcar a equipe)"
                              value={chatInput}
                              onChange={handleChatInputChange}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      enviarMensagemChat();
                                  }
                              }}
                          />
                          <button 
                              disabled={!chatInput.trim()}
                              onClick={enviarMensagemChat} 
                              className="absolute bottom-3 right-3 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
                          >
                              <Send size={14}/>
                          </button>
                      </div>
                  </div>
              </div>

            </div>

            <div className="p-4 md:p-6 bg-white border-t border-slate-200 flex flex-col md:flex-row justify-between items-center shrink-0 gap-3">
              {editingOp ? <button onClick={handleDelete} className="w-full md:w-auto text-red-500 font-bold text-xs uppercase px-4 py-3 md:py-2 border border-red-100 md:border-none hover:bg-red-50 rounded-xl md:rounded-lg transition flex items-center justify-center gap-2"><Trash2 size={16}/> Excluir Registro</button> : <div className="hidden md:block"></div>}
              
              <div className="flex flex-col-reverse md:flex-row gap-3 w-full md:w-auto">
                  <button onClick={fecharModalELimparURL} className="w-full md:w-auto px-6 py-3.5 md:py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-sm">Cancelar</button>
                  <button onClick={handleSave} className="w-full md:w-auto bg-blue-600 text-white px-8 py-3.5 md:py-3 rounded-xl font-black shadow-lg shadow-blue-200 transition transform active:scale-95 hover:bg-blue-700 text-sm flex items-center justify-center gap-2"><Save size={18}/> Salvar Oportunidade</button>
              </div>
            </div>

          </div>
        </div>, document.body
      )}

      {confirmModal.open && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-8 text-center">
                 <div className="mx-auto w-16 h-16 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mb-6"><AlertTriangle size={32} /></div>
                 <h2 className="text-xl font-black text-slate-800 mb-3">{confirmModal.title}</h2>
                 <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{confirmModal.message}</p>
              </div>
              <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row gap-3">
                 <button onClick={confirmModal.onCancel} className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3.5 md:py-3 rounded-xl hover:bg-slate-100 transition">Cancelar</button>
                 <button onClick={confirmModal.onConfirm} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3.5 md:py-3 rounded-xl shadow-lg transition active:scale-95">Sim, Continuar</button>
              </div>
           </div>
        </div>, document.body
      )}

      {blockModal.open && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-red-600 p-6 md:p-8 flex flex-col items-center justify-center text-white"><ShieldAlert size={50} className="mb-4 opacity-90"/><h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-center">{blockModal.title}</h2></div>
              <div className="p-6 md:p-8 text-center bg-white">
                 <p className="text-slate-800 font-bold text-base md:text-lg mb-2">{blockModal.message}</p>
                 <div className="bg-red-50 border border-red-100 rounded-xl p-4 mt-4 text-left"><p className="text-xs text-red-500 font-bold uppercase tracking-wider mb-1">Motivo</p><p className="text-red-800 font-bold text-sm whitespace-pre-wrap">{blockModal.motivo}</p></div>
              </div>
              <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100"><button onClick={() => setBlockModal({ ...blockModal, open: false })} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition active:scale-95">FECHAR</button></div>
           </div>
        </div>, document.body
      )}

      {lembreteModal.open && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-blue-600 p-6 flex flex-col items-center justify-center text-white">
                 <Bell size={40} className="mb-3 animate-bounce"/>
                 <h2 className="text-xl font-black uppercase tracking-tight text-center">Lembretes de Hoje!</h2>
              </div>
              <div className="p-6 bg-white">
                 <p className="text-slate-700 font-bold mb-4 text-center text-sm">Você precisa atuar nestas oportunidades hoje:</p>
                 <div className="max-h-48 overflow-y-auto custom-scrollbar">
                     <ul className="space-y-2 mb-2 pr-2">
                       {lembreteModal.clientes.map((cliente, i) => (
                         <li 
                            key={i} 
                            onClick={() => {
                                setLembreteModal(prev => ({...prev, open: false}));
                                router.push(`/pipeline?op_id=${cliente.id}`);
                            }} 
                            className="flex items-start gap-2 text-sm font-medium text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:bg-blue-50 transition hover:border-blue-200"
                         >
                           <span className="text-blue-500 font-black mt-0.5">•</span> 
                           {cliente.nome} <span className="text-slate-400 text-xs ml-1">({cliente.tipo})</span>
                         </li>
                       ))}
                     </ul>
                 </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
                 <button onClick={() => setLembreteModal({ open: false, clientes: [] })} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg active:scale-95">
                   Ciente, vamos lá!
                 </button>
              </div>
           </div>
        </div>, document.body
      )}

    </div>
  );
}

export default function PipelinePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">Carregando Pipeline...</div>}>
      <PipelineContent />
    </Suspense>
  );
}