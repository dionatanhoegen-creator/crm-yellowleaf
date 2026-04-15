"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { createPortal } from 'react-dom'; 
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Plus, Search, Calendar, User, Phone, DollarSign, 
  X, Tag, Beaker, MessageCircle, AlertCircle, 
  CheckCircle2, Trash2, Loader2, StickyNote, Download, MapPin, ShieldCheck, FileText,
  Clock, Eye, MessageSquare, AlertOctagon, ShieldAlert, Lock, Printer, AlertTriangle, Filter, ArrowUpDown, Send, History, Briefcase, Trello, Save, Users, Building2, UserPlus, Bell, AtSign, ListPlus, Package, Edit3
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// IMPORTAÇÃO DINÂMICA DO REACT-QUILL-NEW
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

// --- CONFIGURAÇÃO DO EDITOR QUILL ---
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link', 'image'],
    [{ 'color': [] }, { 'background': [] }],
    ['clean']
  ],
};

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

  // --- ESTADOS DA SEGUNDA PÁGINA ---
  const [incluirSegundaPagina, setIncluirSegundaPagina] = useState(false);
  const [conteudoRichText, setConteudoRichText] = useState("");
  const richTextRef = useRef<HTMLDivElement>(null);

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
    user_id: '',
    tipo_negociacao: 'estrategica',
    itens_cotacao: '[]',
    frete_tipo: 'CIF',
    frete_transportadora: 'Correios',
    frete_previsao: '',
    condicoes_pagamento: ''
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
              setFormData(prev => ({
                  ...prev, 
                  ...opEncontrada, 
                  custo_fixo_operacional: opEncontrada.custo_fixo_operacional || '0',
                  tipo_negociacao: opEncontrada.tipo_negociacao || 'estrategica',
                  itens_cotacao: opEncontrada.itens_cotacao || '[]',
                  frete_tipo: opEncontrada.frete_tipo || 'CIF',
                  frete_transportadora: opEncontrada.frete_transportadora || 'Correios',
                  frete_previsao: opEncontrada.frete_previsao || '',
                  condicoes_pagamento: opEncontrada.condicoes_pagamento || '',
                  observacoes_proposta: opEncontrada.observacoes_proposta || ''
              }));
              
              // --- CARREGANDO OS DADOS DA SEGUNDA PÁGINA DO BANCO ---
              if (opEncontrada.conteudo_pagina_2 && opEncontrada.conteudo_pagina_2 !== '<p><br></p>') {
                  setConteudoRichText(opEncontrada.conteudo_pagina_2);
                  setIncluirSegundaPagina(true);
              } else {
                  setConteudoRichText("");
                  setIncluirSegundaPagina(false);
              }
              // --------------------------------------------------------

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
              setModalOpen(true);
          }
      };

      abrirOpViaUrl();
  }, [opIdUrl, oportunidades]);

  const fecharModalELimparURL = () => {
      setModalOpen(false);
      setIncluirSegundaPagina(false);
      setConteudoRichText("");
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
  const formatCurrency = (val: any) => {
      const num = Number(String(val).replace(',', '.')) || 0;
      return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

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
            const mapProdutos = new Map();
            
            json.data.forEach((p: any) => {
                let ativo = p.ativo ? p.ativo.trim() : 'Sem Nome';
                let preco_grama = parseMoney(p.preco_grama || p['preço/grama'] || p.Preco);
                let validadeBruta = p.validade || p.data_validade || p.vencimento || p['validade do ativo'] || p['Validade'] || '';
                let validade = formatarDataPlanilha(validadeBruta);
                let peso_formula = parseMoney(p.peso_formula) || 13.2;

                if (!mapProdutos.has(ativo)) {
                    mapProdutos.set(ativo, { 
                        ativo, 
                        preco_grama, 
                        peso_formula,
                        validade_base: validade,
                        opcoes: [] 
                    });
                }
                
                const embalagensPadrao = [
                    { chave: 'estoque_10g', label: '10g' },
                    { chave: 'estoque_30g', label: '30g' },
                    { chave: 'estoque_50g', label: '50g' },
                    { chave: 'estoque_100g', label: '100g' },
                    { chave: 'estoque_250g', label: '250g' },
                    { chave: 'estoque_500g', label: '500g' },
                    { chave: 'estoque_1000g', label: '1000g' },
                    { chave: 'estoque_2500g', label: '2500g' },
                    { chave: 'estoque_5000g', label: '5000g' }
                ];

                let achouFracionamento = false;

                embalagensPadrao.forEach(emb => {
                    const qty = p[emb.chave];
                    if (qty !== undefined && qty !== null && String(qty).trim() !== '') {
                        mapProdutos.get(ativo).opcoes.push({
                            fracionamento: emb.label,
                            estoque: parseInt(qty) || 0,
                            preco_grama: preco_grama,
                            validade: validade
                        });
                        achouFracionamento = true;
                    }
                });

                if (!achouFracionamento) {
                    mapProdutos.get(ativo).opcoes.push({
                        fracionamento: '1000g',
                        estoque: 99,
                        preco_grama: preco_grama,
                        validade: validade
                    });
                }
            });

            const produtosAgrupados = Array.from(mapProdutos.values()).sort((a: any, b: any) => a.ativo.localeCompare(b.ativo));
            setProdutosApi(produtosAgrupados);
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

  const getItensCotacao = () => {
      try { return JSON.parse(formData.itens_cotacao || '[]'); } 
      catch { return []; }
  };

  const setItensCotacao = (novosItens: any[]) => {
      setFormData(prev => ({ ...prev, itens_cotacao: JSON.stringify(novosItens) }));
  };

  const adicionarItemCotacao = () => {
      const itens = getItensCotacao();
      itens.push({
          id: Date.now().toString(),
          insumo: '',
          info_adicional: '',
          fracionamento: '',
          tipo_venda: 'Venda',
          preco_g: 0,
          preco_total: 0,
          validade: '',
          origem: 'China'
      });
      setItensCotacao(itens);
  };

  const removerItemCotacao = (id: string) => {
      const itens = getItensCotacao().filter((it: any) => it.id !== id);
      setItensCotacao(itens);
  };

  const atualizarItemCotacao = (id: string, campo: string, valor: any) => {
      const itens = getItensCotacao().map((it: any) => {
          if (it.id !== id) return it;
          
          let novoItem = { ...it, [campo]: valor };

          if (campo === 'preco_g') {
              novoItem.preco_g = parseFloat(String(valor).replace(',', '.')) || 0;
          }

          if (campo === 'insumo') {
              const prod = produtosApi.find(p => p.ativo === valor);
              if (prod && prod.opcoes.length > 0) {
                  const opComEstoque = prod.opcoes.find((o: any) => o.estoque > 0) || prod.opcoes[0];
                  novoItem.fracionamento = opComEstoque.fracionamento;
                  novoItem.preco_g = opComEstoque.preco_grama;
                  novoItem.validade = opComEstoque.validade;
              } else {
                  novoItem.fracionamento = '';
                  novoItem.preco_g = 0;
                  novoItem.validade = '';
              }
          }

          if (campo === 'fracionamento') {
              const prod = produtosApi.find(p => p.ativo === novoItem.insumo);
              if (prod) {
                  const opcaoSelecionada = prod.opcoes.find((o: any) => o.fracionamento === valor);
                  if (opcaoSelecionada) {
                      novoItem.preco_g = opcaoSelecionada.preco_grama;
                      novoItem.validade = opcaoSelecionada.validade;
                  }
              }
          }

          if (campo === 'fracionamento' || campo === 'tipo_venda' || campo === 'insumo' || campo === 'preco_g') {
              const numStr = String(novoItem.fracionamento).replace(/\D/g, ''); 
              const gramas = parseFloat(numStr) || 0;
              const precoTratado = parseFloat(String(novoItem.preco_g).replace(',', '.')) || 0;

              if (novoItem.tipo_venda === 'Bonificado') {
                  novoItem.preco_total = 0;
              } else {
                  novoItem.preco_total = gramas * precoTratado;
              }
          }

          return novoItem;
      });
      setItensCotacao(itens);
  };

  useEffect(() => {
      if (formData.tipo_negociacao === 'cotacao') {
          const itens = getItensCotacao();
          const totalCotacao = itens.reduce((acc: number, it: any) => acc + (Number(it.preco_total) || 0), 0);
          setFormData(prev => prev.valor === String(totalCotacao.toFixed(2)) ? prev : { ...prev, valor: String(totalCotacao.toFixed(2)) });
      } else {
          const precoG = parseMoney(formData.valor_g_tabela);
          const kg = parseMoney(formData.kg_proposto);
          const vTotal = (precoG * 1000 * kg).toFixed(2); 
          setFormData(prev => prev.valor === vTotal ? prev : { ...prev, valor: vTotal });
      }
  }, [formData.tipo_negociacao, formData.itens_cotacao, formData.valor_g_tabela, formData.kg_proposto]);

  useEffect(() => {
    if (formData.tipo_negociacao === 'cotacao') return;
    if (!formData.produto) return;
    const produtoSelecionado = produtosApi.find(p => p.ativo === formData.produto);
    if (produtoSelecionado) {
        setFormData(prev => {
            if (editingOp && editingOp.produto === prev.produto) {
                return {
                    ...prev,
                    validade_produto: prev.validade_produto || produtoSelecionado.validade_base || '', 
                    valor_g_tabela: prev.valor_g_tabela || produtoSelecionado.preco_grama.toFixed(2).replace('.', ','),
                    peso_formula_g: prev.peso_formula_g || produtoSelecionado.peso_formula.toString()
                };
            }
            return {
                ...prev,
                validade_produto: produtoSelecionado.validade_base || '',
                valor_g_tabela: produtoSelecionado.preco_grama.toFixed(2).replace('.', ','),
                peso_formula_g: produtoSelecionado.peso_formula.toString()
            };
        });
    }
  }, [formData.produto, produtosApi, editingOp, formData.tipo_negociacao]);


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
          const enderecoFormatado = data.logradouro ? `${data.logradouro}, ${data.numero || 'S/N'}${data.complemento ? ' - ' + data.complemento : ''}, ${data.bairro || ''}` : '';
          
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

  const gerarPropostaIndividualPDF = async () => {
    if (!editingOp) return alert("Salve a proposta primeiro antes de gerar o PDF.");

    const doc = new jsPDF({ orientation: 'portrait' });
    const darkGreen = [18, 85, 48]; 
    const lightGreen = [0, 150, 0]; 
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    
    try { doc.addImage("/logo.png", "PNG", 14, 10, 40, 16); } 
    catch (e) { try { doc.addImage("/logo.jpg", "JPEG", 14, 10, 40, 16); } catch (err) {} }

    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]); 
    
    const isPedido = formData.status === 'fechado';
    const tituloDoc = formData.tipo_negociacao === 'cotacao' 
        ? (isPedido ? "PEDIDO COMERCIAL" : "ORÇAMENTO") 
        : "PROPOSTA COMERCIAL";
    
    doc.text(tituloDoc, pageWidth - 14, 17, { align: "right" });

    doc.setFontSize(9); doc.setTextColor(150, 150, 150);
    doc.text(`Nº ${formatPropostaId(formData.numero_proposta)}`, pageWidth - 14, 22, { align: "right" });
    
    const dataEmissao = new Date().toLocaleDateString('pt-BR');
    const validadeBase = new Date();
    validadeBase.setDate(validadeBase.getDate() + 7); 
    const dataValidade = validadeBase.toLocaleDateString('pt-BR');

    doc.text(`Emissão: ${dataEmissao}  |  Validade: ${dataValidade}`, pageWidth - 14, 26, { align: "right" });

    doc.setDrawColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.setLineWidth(1.2);
    doc.line(14, 31, pageWidth - 14, 31);

    doc.setFillColor(248, 249, 250); 
    doc.rect(14, 35, pageWidth - 28, 25, 'F');

    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text("DADOS DO CLIENTE", 18, 41);

    const contatoPrincipal = contatosList[0] || { nome: '', telefone: '' };
    const enderecoFormatadoPDF = `${formData.endereco || 'N/D'} - ${formData.cidade_exclusividade || ''} / ${formData.uf_exclusividade || ''}`;

    doc.setFontSize(8.5); doc.setTextColor(80, 80, 80); doc.setFont("helvetica", "normal");
    doc.text(`Razão Social: ${formData.nome_cliente || 'N/D'}`, 18, 46.5);
    
    let clienteY = 51;
    if (contatoPrincipal.nome && contatoPrincipal.nome.trim() !== '') {
        doc.text(`Contato: ${contatoPrincipal.nome}`, 18, clienteY);
        clienteY += 4.5;
    }
    if (contatoPrincipal.telefone && contatoPrincipal.telefone.trim() !== '') {
        doc.text(`Telefone: ${contatoPrincipal.telefone}`, 18, clienteY);
        clienteY += 4.5;
    }
    doc.text(`Endereço: ${enderecoFormatadoPDF}`, 18, clienteY);

    let finalY = 67;

    if (formData.tipo_negociacao === 'cotacao') {
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
        doc.text("ITENS DA COTAÇÃO", 14, finalY); 

        const itens = getItensCotacao();
        const tableBody = itens.map((it: any) => [
            it.insumo,
            it.info_adicional || '-',
            `${it.fracionamento}`,
            it.tipo_venda,
            formatCurrency(it.preco_g),
            formatCurrency(it.preco_total),
            it.validade || '-'
        ]);

        autoTable(doc, {
            startY: finalY + 2,
            head: [['Insumo', 'Info Adicional', 'Embalagem', 'Classificação', 'Preço/g', 'Total', 'Validade']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: darkGreen, textColor: 255, fontStyle: 'bold', halign: 'left' },
            styles: { fontSize: 7, cellPadding: 2, textColor: [60, 60, 60] }, 
            columnStyles: { 5: { fontStyle: 'bold', textColor: lightGreen } },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 3) { 
                    if (data.cell.raw === 'Bonificado') data.cell.styles.textColor = [34, 197, 94];
                }
            }
        });

        finalY = (doc as any).lastAutoTable.finalY;
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
        doc.text(`TOTAL: ${formatCurrency(formData.valor)}`, pageWidth - 14, finalY + 8, { align: "right" });
        finalY += 14;

    } else {
        const precoG = parseMoney(formData.valor_g_tabela);
        const kg = parseMoney(formData.kg_proposto);
        const kgBonificado = parseMoney(formData.kg_bonificado);
        const totalKg = kg + kgBonificado;
        const investimentoTotal = precoG * 1000 * kg;
        const precoGramaBonificado = totalKg > 0 ? investimentoTotal / (totalKg * 1000) : precoG;
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

        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
        doc.text("ESPECIFICAÇÃO DO INVESTIMENTO", 14, finalY); 
        
        autoTable(doc, {
            startY: finalY + 2,
            head: [['DESCRIÇÃO', 'VALORES']],
            body: [
                ['Ativo/Insumo', formData.produto || 'N/D'],
                ['Validade do Lote/Ativo', formData.validade_produto || 'Consulte Lote Atual'],
                ['Preço por grama (g)', formatCurrency(precoG)],
                ['Quantidade da proposta (kg)', `${kg} kg`],
                ['Quantidade bonificada (kg)', `${kgBonificado} kg`],
                ['Investimento Total (R$)', formatCurrency(investimentoTotal)],
                ['Preço do grama c/ bonificação (g)', formatCurrency(precoGramaBonificado)],
                ['Condição de Pagamento', `${parcelas} parcelas de ${formatCurrency(valorParcela)}`],
                ['Vencimento 1ª Parcela', `${diasPrimeiraParcela} dias`]
            ],
            theme: 'grid',
            headStyles: { fillColor: darkGreen, textColor: 255, fontStyle: 'bold', halign: 'left' },
            styles: { fontSize: 8.5, cellPadding: 2, textColor: [60, 60, 60] },
            columnStyles: { 0: { cellWidth: 120, fontStyle: 'normal' }, 1: { cellWidth: 62, fontStyle: 'bold', halign: 'right' } }
        });

        finalY = (doc as any).lastAutoTable.finalY;
        
        autoTable(doc, {
            startY: finalY + 4,
            head: [['ANÁLISE DE RETORNO (PAYBACK)', 'ESTIMATIVA']],
            body: [
                [`Custo Matéria-Prima (Dose ${pesoFormula}g)`, formatCurrency(custoMP)],
                ['Custo Total por Fórmula (Manipulado)', formatCurrency(custoTotalFormula)],
                [`Sugestão de Venda (Fator ${fatorLucro} no Ativo)`, formatCurrency(sugestaoVenda)],
                ['META DE VIABILIDADE', `${viabilidadeDiaria.toFixed(2).replace('.', ',')} fórmulas/dia`]
            ],
            theme: 'grid',
            headStyles: { fillColor: darkGreen, textColor: 255, fontStyle: 'bold', halign: 'left' },
            styles: { fontSize: 8.5, cellPadding: 2, textColor: [60, 60, 60] },
            columnStyles: { 0: { cellWidth: 120, fontStyle: 'normal' }, 1: { cellWidth: 62, fontStyle: 'bold', halign: 'right' } }
        });
        
        finalY = (doc as any).lastAutoTable.finalY;
        finalY += 8; 
    }

    if (finalY > 235) {
        doc.addPage();
        finalY = 20;
    }

    // --- 1. BLOCO DE LOGÍSTICA ---
    doc.setFontSize(9.5); doc.setFont("helvetica", "bold"); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text("CONDIÇÕES COMERCIAIS:", 14, finalY);
    
    const drawRow = (label: string, value: string, y: number) => {
        doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
        doc.text(label, 14, y);
        const labelWidth = doc.getTextWidth(label);
        doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
        doc.text(` ${value}`, 14 + labelWidth, y);
    };

    drawRow("PAGAMENTO:", formData.condicoes_pagamento || 'A combinar', finalY + 5);
    drawRow("TRANSPORTADORA:", formData.frete_transportadora || '-', finalY + 9.5);

    const pDias = formData.frete_previsao ? formData.frete_previsao.trim() : '';
    let prazoStr = 'A combinar';
    if (pDias) {
        prazoStr = pDias.toLowerCase().includes('dia') ? pDias : (pDias === '1' ? '1 dia' : `${pDias} dias`);
    }
    drawRow("PRAZO DE ENTREGA:", `Postagem + ${prazoStr} após confirmação.`, finalY + 14);

    const freteTexto = formData.frete_tipo === 'CIF' ? 'CIF - Por conta da YellowLeaf' : (formData.frete_tipo === 'FOB' ? 'FOB - Por conta do Cliente' : '-');
    drawRow("FRETE:", freteTexto, finalY + 18.5);
    
    finalY += 25;

    // --- 2. OBSERVAÇÕES ADICIONAIS ---
    if (formData.observacoes_proposta && formData.observacoes_proposta.trim() !== '') {
        doc.setFontSize(9.5); doc.setFont("helvetica", "bold"); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
        doc.text("OBSERVAÇÕES ADICIONAIS:", 14, finalY);
        doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
        const splitObs = doc.splitTextToSize(formData.observacoes_proposta, pageWidth - 28);
        doc.text(splitObs, 14, finalY + 5);
        finalY += (splitObs.length * 4) + 6; 
    }

    // --- 3. BLOCO DE CARTÃO DE CRÉDITO ---
    doc.setFillColor(232, 245, 233); 
    doc.rect(14, finalY, pageWidth - 28, 10, 'F');
    doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text("NOVIDADE NA YELLOWLEAF!", 18, finalY + 4.5);
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    doc.text("Agora você pode pagar suas compras com CARTÃO DE CRÉDITO! Mais facilidade e praticidade, solicite o link para pagamento.", 18, finalY + 8);
    

    // --- NOVA: PÁGINA 2 (ANEXOS LIVRES) COM IMPORTAÇÃO DINÂMICA ---
    if (incluirSegundaPagina && richTextRef.current && conteudoRichText.trim() !== '' && conteudoRichText !== '<p><br></p>') {
        doc.addPage();
        
        // TRUQUE MÁGICO: Importar o html2canvas APENAS na hora de gerar o PDF!
        const html2canvas = (await import('html2canvas')).default;
        
        // Tira uma foto (canvas) do que o usuário formatou no ReactQuill
        const canvas = await html2canvas(richTextRef.current, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        
        // Calcula a proporção da imagem para caber na página A4
        const imgWidth = pageWidth - 28; // Margens laterais de 14
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Adiciona um título opcional e cola a imagem gerada
        doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
        doc.text("ANEXOS E INFORMAÇÕES ADICIONAIS", 14, 20);
        doc.addImage(imgData, 'PNG', 14, 26, imgWidth, imgHeight);
    }

    // --- RODAPÉ COM SELOS (EM TODAS AS PÁGINAS) ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
        doc.text("QUALIDADE E PRODUÇÃO CERTIFICADA", pageWidth / 2, 258, { align: "center" });
        doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "normal");
        const textQualidade = "Trabalhamos com matéria-prima advinda de produção certificada pelos mais altos padrões técnicos do mundo e\npromovemos sua comercialização com responsabilidade e ética.";
        doc.text(textQualidade, pageWidth / 2, 263, { align: "center", lineHeightFactor: 1.5 }); 

        let imagemAdicionada = false;
        try { doc.addImage("/selo.jpg", "JPEG", (pageWidth / 2) - 40, 269, 80, 13); imagemAdicionada = true; } 
        catch (e1) { try { doc.addImage("/selo.png", "PNG", (pageWidth / 2) - 40, 269, 80, 13); imagemAdicionada = true; } catch (e2) {} }
        
        if (!imagemAdicionada) {
            doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
            doc.text("HACCP   |   ISO FSSC 22000   |   GMP   |   CENTHIRD", pageWidth / 2, 276, { align: "center" });
        }

        doc.setDrawColor(darkGreen[0], darkGreen[1], darkGreen[2]);
        doc.setLineWidth(1); 
        const bottomLineY = 289;
        doc.line(14, bottomLineY - 4, pageWidth - 14, bottomLineY - 4); 

        doc.setFontSize(7.5); doc.setTextColor(150, 150, 150); doc.setFont("helvetica", "normal");
        doc.text("YELLOW LEAF IMPORTAÇÃO E EXPORTAÇÃO LTDA | CNPJ: 45.643.261/0001-68", 14, bottomLineY);
        
        const representante = equipe.find(u => u.id === formData.user_id);
        const responsavelNome = representante?.nome || usuarioLogado?.nome || 'Comercial YellowLeaf';
        const responsavelTel = representante?.telefone || '(44) 99102-7642';
        doc.text(`${responsavelNome} - WhatsApp: ${responsavelTel}`, pageWidth - 14, bottomLineY, { align: "right" });
    }

    const fileNamePrefix = formData.tipo_negociacao === 'cotacao' ? (isPedido ? 'Pedido' : 'Orcamento') : 'Proposta';
    doc.save(`${fileNamePrefix}_${formData.nome_cliente.replace(/\s+/g, '_')}_${formatPropostaId(formData.numero_proposta)}.pdf`);
  };

  // --- RELATÓRIO GERAL ATUALIZADO COM COLUNA ANEXO ---
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
    
    // NOVA COLUNA "ANEXO"
    const headers = ['Nº', 'DATA', 'FARMÁCIA', 'PRODUTO/ITENS', 'REPRESENTANTE', 'ESTÁGIO', 'VALOR (R$)', 'ANEXO'];
    
    const tableBody = dadosOrdenados.map(op => {
        const responsavelNome = equipe.find(u => u.id === op.user_id)?.nome || 'N/A';
        const dataFormatada = op.data_entrada ? op.data_entrada.split('-').reverse().join('/') : '-';
        const estagioNome = ESTAGIOS.find(e => e.id === op.status)?.label || op.status;
        const descricao = op.tipo_negociacao === 'cotacao' ? 'Cotação Múltipla' : (op.produto || '-');
        
        // VERIFICA SE TEM A SEGUNDA PÁGINA
        const temAnexo = (op.conteudo_pagina_2 && op.conteudo_pagina_2 !== '<p><br></p>') ? 'Sim' : 'Não';

        return [formatPropostaId(op.numero_proposta), dataFormatada, op.nome_cliente, descricao, responsavelNome, estagioNome, formatCurrency(op.valor), temAnexo];
    });

    autoTable(doc, {
        startY: 48,
        head: [headers],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [20, 83, 45], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3, textColor: 60 }
    });
    doc.save(`Relatorio_Oportunidades_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
  };

  const handleSave = async () => {
    if (!formData.nome_cliente) return alert("Preencha a Razão Social.");
    if (!formData.user_id) return alert("Selecione um Representante Responsável.");
    if (!formData.data_lembrete || formData.data_lembrete.trim() === "") return alert("Defina uma data de próximo contato.");

    let numeroFinal = formData.numero_proposta;
    if (!editingOp) {
        const { data: maxOp } = await supabase.from('pipeline').select('numero_proposta').order('numero_proposta', { ascending: false }).limit(1);
        numeroFinal = (maxOp && maxOp[0]?.numero_proposta ? Number(maxOp[0].numero_proposta) : 467) + 1;
    }
    const isRepasse = formData.user_id !== usuarioLogado?.id;
    const contatoPrincipal = contatosList[0] || { nome: '', cargo: 'Comprador(a)', telefone: '', email: '' };
    const contatosExtras = contatosList.slice(1);
    
    // --- DADOS SALVOS NO BANCO AGORA INCLUEM A SEGUNDA PÁGINA ---
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
        valor: parseFloat(String(formData.valor)) || 0, 
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
        observacoes_proposta: formData.observacoes_proposta,
        tipo_negociacao: formData.tipo_negociacao,
        itens_cotacao: formData.itens_cotacao,
        frete_tipo: formData.frete_tipo,
        frete_transportadora: formData.frete_transportadora,
        frete_previsao: formData.frete_previsao,
        condicoes_pagamento: formData.condicoes_pagamento,
        conteudo_pagina_2: incluirSegundaPagina ? conteudoRichText : null // NOVO CAMPO
    };

    const { data: savedOpData, error } = editingOp 
        ? await supabase.from('pipeline').update(dadosSalvar).eq('id', editingOp.id).select() 
        : await supabase.from('pipeline').insert(dadosSalvar).select();
    
    if (!error) { 
      const opId = editingOp ? editingOp.id : (savedOpData && savedOpData.length > 0 ? savedOpData[0].id : null);
      if (isRepasse && !editingOp && savedOpData && savedOpData.length > 0) {
          await supabase.from('notificacoes').insert({ user_id: formData.user_id, remetente: usuarioLogado.nome, mensagem: `Oportunidade Repassada: ${formData.nome_cliente.toUpperCase()}`, link: `/pipeline?op_id=${savedOpData[0].id}` });
      }
      fecharModalELimparURL();
      setNovaNotaInput("");
      carregarOportunidades(usuarioLogado); 
    } else { alert(`Erro ao salvar no banco. Você criou a coluna 'conteudo_pagina_2' no Supabase? Erro: ${error.message}`); }
  };

  const handleDelete = async () => {
    if (confirm('Deseja excluir este registro permanentemente?')) {
        const { error } = await supabase.from('pipeline').delete().eq('id', editingOp.id);
        if (!error) { carregarOportunidades(usuarioLogado); fecharModalELimparURL(); } 
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
    if (isAtrasado && !isPerdido) { bgClass = 'bg-red-50/50'; borderClass = 'border-red-300'; textClass = 'text-red-600 font-bold'; label = 'Atrasado: '; } 
    else if (isHoje && !isPerdido) { borderClass = 'border-orange-400'; bgClass = 'bg-orange-50/50'; textClass = 'text-orange-600 font-bold'; label = 'HOJE: '; } 
    else if (isPerdido) { borderClass = 'border-slate-200'; bgClass = 'bg-slate-50 opacity-60'; textClass = 'text-slate-400'; }
    const nomeResponsavel = equipe.find(u => u.id === op.user_id)?.nome || 'N/A';
    return (
        <div key={op.id} onClick={() => { 
            setEditingOp(op); setFormData({...formData, ...op}); 
            
            // --- RECARREGA A SEGUNDA PÁGINA AO CLICAR NO CARD ---
            if (op.conteudo_pagina_2 && op.conteudo_pagina_2 !== '<p><br></p>') {
                setConteudoRichText(op.conteudo_pagina_2);
                setIncluirSegundaPagina(true);
            } else {
                setConteudoRichText("");
                setIncluirSegundaPagina(false);
            }

            let contatosCarregados = [{ nome: op.contato || '', cargo: op.cargo_contato || 'Comprador(a)', telefone: op.telefone || '', email: op.email || '' }];
            if (op.contatos_adicionais) { try { contatosCarregados = [...contatosCarregados, ...JSON.parse(op.contatos_adicionais)]; } catch (e) {} }
            setContatosList(contatosCarregados); setIsRepLocked(false); setNovaNotaInput(""); setModalOpen(true); 
        }} className={`p-4 rounded-2xl border-2 cursor-pointer shadow-sm transition hover:shadow-md ${bgClass} ${borderClass}`}>
            <div className="flex justify-between items-start mb-2">
                <div className="max-w-[80%]">
                    <span className="text-[10px] font-black tracking-widest text-slate-400 block mb-0.5">#{formatPropostaId(op.numero_proposta)}</span>
                    <h4 className="font-black text-slate-800 text-sm leading-tight truncate">{op.nome_cliente}</h4>
                </div>
                {op.telefone && (
                    <a href={`https://wa.me/55${op.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-green-500 p-1.5 bg-green-50 rounded-lg"><MessageCircle size={16} /></a>
                )}
            </div>
            <div className="flex flex-col gap-1.5 mb-3">
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold"><MapPin size={10} className="text-slate-400"/> {op.cidade_exclusividade} - {op.uf_exclusividade}</div>
            </div>
            <div className="flex justify-between items-center py-3 border-y border-slate-100 mb-3">
                <span className={`text-[10px] border px-2 py-0.5 rounded uppercase font-black truncate max-w-[50%] ${op.tipo_negociacao === 'cotacao' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>{op.tipo_negociacao === 'cotacao' ? 'Cotação Múltipla' : op.produto}</span>
                <span className="text-sm font-black text-slate-700">{formatCurrency(op.valor)}</span>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500"><Briefcase size={12} className="text-blue-500"/> {nomeResponsavel.split(' ')[0]}</div>
                {op.data_lembrete && <div className={`flex items-center gap-1 text-[10px] font-bold ${textClass}`}><Clock size={10} /> {label} {op.data_lembrete.split('-').reverse().join('/')}</div>}
            </div>
        </div>
    );
  }

  const getSortedOpportunities = (estagioId: string) => {
    return oportunidades.filter(o => {
        if (o.status !== estagioId) return false;
        if (isAdminUser && visaoAdmin === 'meus') { if (o.user_id !== usuarioLogado?.id && o.sdr_id !== usuarioLogado?.id) return false; }
        if (!buscaTermo) return true;
        const term = buscaTermo.toLowerCase();
        return o.nome_cliente?.toLowerCase().includes(term) || String(o.numero_proposta || '').includes(term);
    });
  };

  return (
    <div className="w-full p-3 md:p-4 h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 md:mb-6 gap-4 shrink-0">
        <div>
            <h1 className="text-xl md:text-2xl font-black text-[#0f392b] tracking-tight flex items-center gap-2"><Trello className="text-[#82D14D]"/> Pipeline Comercial</h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">Gestão de propostas, aprovações e Hand-off.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 w-full xl:w-auto">
            {isAdminUser && (
                <div className="flex bg-slate-200/70 p-1 rounded-xl shrink-0 w-full sm:w-auto">
                    <button onClick={() => setVisaoAdmin('meus')} className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase rounded-lg ${visaoAdmin === 'meus' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Meus Cards</button>
                    <button onClick={() => setVisaoAdmin('todos')} className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase rounded-lg ${visaoAdmin === 'todos' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>Empresa</button>
                </div>
            )}
            <input type="text" placeholder="Buscar..." className="pl-4 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm font-bold uppercase text-slate-600 shadow-sm" value={buscaTermo} onChange={(e) => setBuscaTermo(e.target.value)} />
            <button onClick={gerarRelatorioGeral} className="bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg text-xs md:text-sm"><Printer size={16} /></button>
            <button onClick={() => { setEditingOp(null); setModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg text-xs md:text-sm flex items-center justify-center gap-2"><Plus size={16} /> Nova Op.</button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth custom-scrollbar -mx-3 px-3 md:mx-0 md:px-0">
          <div className="flex gap-3 md:gap-4 h-full min-w-max">
            {ESTAGIOS.map(est => (
              <div key={est.id} className="w-[85vw] sm:w-[300px] snap-center shrink-0 bg-slate-100/50 rounded-2xl border border-slate-200 flex flex-col h-full overflow-hidden">
                <div className={`p-4 border-b-4 ${est.color} bg-white flex justify-between items-center shrink-0`}><h3 className={`font-black text-xs uppercase tracking-widest ${est.text}`}>{est.label}</h3><span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-lg">{getSortedOpportunities(est.id).length}</span></div>
                <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-3 custom-scrollbar">{getSortedOpportunities(est.id).map(op => renderCard(op))}</div>
              </div>
            ))}
          </div>
      </div>

      {modalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4">
          <div className="bg-white w-full h-[95vh] md:h-auto md:max-h-[95vh] max-w-5xl md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden mx-auto">
            <div className="bg-[#1e293b] p-4 md:p-6 flex justify-between items-center text-white shrink-0 border-b-4 border-blue-500">
              <div className="overflow-hidden mr-2">
                  <h2 className="text-lg md:text-xl font-black flex items-center gap-2 truncate">{editingOp ? `Editar #${formatPropostaId(editingOp.numero_proposta)}` : 'Nova Oportunidade'}</h2>
                  <p className="text-xs md:text-sm font-medium text-slate-300 truncate">{editingOp ? editingOp.nome_cliente : 'Preencha o CNPJ para validar.'}</p>
              </div>
              <div className="flex items-center gap-2">
                {editingOp && <button onClick={gerarPropostaIndividualPDF} className="bg-white/10 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/20"><FileText size={16}/> Gerar PDF</button>}
                <button onClick={fecharModalELimparURL} className="hover:bg-white/20 p-2 rounded-full transition bg-white/10 text-white"><X size={20}/></button>
              </div>
            </div>

            <div className="p-4 md:p-8 overflow-y-auto bg-slate-50 flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 content-start">
                  <div className="md:col-span-4 flex items-center gap-2 mb-1 md:mb-2"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm">1</div><h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Identificação e Atribuição</h3></div>
                  <div className="md:col-span-2"><label className="text-xs font-bold text-slate-700 mb-1.5 block">CNPJ</label><div className="flex gap-2"><input className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} onBlur={buscarDadosCNPJ}/><button type="button" onClick={buscarDadosCNPJ} className="bg-blue-600 text-white p-3 rounded-xl shadow-sm"><Search size={20}/></button></div></div>
                  <div className="md:col-span-2"><label className="text-xs font-black text-green-700 mb-1.5 block uppercase">Farmácia</label><input className="w-full bg-green-50 border-2 border-green-400 rounded-xl p-3 text-sm font-black text-green-900 uppercase" value={formData.nome_cliente} onChange={e => setFormData({...formData, nome_cliente: e.target.value.toUpperCase()})}/></div>
                  <div className="md:col-span-2"><label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1"><MapPin size={14}/> Endereço</label><input className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium uppercase" value={formData.endereco} onChange={e => setFormData({...formData, endereco: e.target.value.toUpperCase()})}/></div>
                  <div className="md:col-span-1"><label className="text-xs font-bold text-slate-700 mb-1.5 block">Cidade</label><input className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold uppercase" value={formData.cidade_exclusividade} onChange={e => setFormData({...formData, cidade_exclusividade: e.target.value.toUpperCase()})}/></div>
                  <div className="md:col-span-1"><label className="text-xs font-bold text-slate-700 mb-1.5 block">UF</label><input className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold uppercase text-center" value={formData.uf_exclusividade} onChange={e => setFormData({...formData, uf_exclusividade: e.target.value.toUpperCase()})} maxLength={2}/></div>
                  
                  <div className="md:col-span-4 mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {contatosList.map((contato, idx) => (
                              <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl relative shadow-sm hover:border-blue-300 transition-colors">
                                  {idx > 0 && <button type="button" onClick={() => removeContato(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 bg-slate-50 p-2 rounded-lg transition"><Trash2 size={16}/></button>}
                                  <h4 className="text-[10px] font-black text-blue-600 uppercase mb-4">{idx === 0 ? '⭐ Contato Principal' : `👤 Contato Adicional ${idx + 1}`}</h4>
                                  <div className="space-y-3">
                                      <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold uppercase" value={contato.nome} onChange={e => updateContato(idx, 'nome', e.target.value.toUpperCase())} placeholder="Nome do Contato"/>
                                      <div className="grid grid-cols-2 gap-2">
                                          <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" value={contato.telefone} onChange={e => updateContato(idx, 'telefone', e.target.value)} placeholder="WhatsApp"/>
                                          <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium" value={contato.email} onChange={e => updateContato(idx, 'email', e.target.value.toLowerCase())} placeholder="E-mail"/>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                      <button type="button" onClick={addContato} className="mt-4 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-2 w-full md:w-auto"><UserPlus size={14}/> Adicionar Outro Contato</button>
                  </div>

                  <div className="md:col-span-2 bg-blue-50 border border-blue-200 p-4 rounded-xl relative mt-2">
                      <label className="text-[10px] font-black text-blue-800 uppercase mb-2 flex items-center gap-1 relative z-10"><Briefcase size={12}/> Vendedor Responsável</label>
                      <select value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})} disabled={isRepLocked} className="w-full relative z-10 bg-white border border-blue-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none shadow-sm cursor-pointer disabled:bg-slate-100 disabled:text-slate-500">
                          <option value="">Selecione o Representante...</option>
                          {equipe.map(u => <option key={u.id} value={u.id}>{u.nome} ({u.cargo})</option>)}
                      </select>
                      {isRepLocked && <p className="text-[9px] font-bold text-red-500 mt-1 uppercase relative z-10">Bloqueado pela regra de carteira ERP</p>}
                  </div>
                  <div className="md:col-span-2 mt-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Status no Funil</label>
                      <select className="w-full bg-white border border-slate-300 text-blue-700 text-sm font-bold p-3 rounded-xl outline-none shadow-sm cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                          {ESTAGIOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                      </select>
                  </div>

                  <div className="md:col-span-4 flex items-center gap-2 mb-1 md:mb-2 mt-4 md:mt-6"><div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-sm">2</div><h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Produto e Precificação</h3></div>

                  <div className="md:col-span-4 bg-slate-100 p-1.5 rounded-xl flex mb-4">
                      <button type="button" onClick={() => setFormData({...formData, tipo_negociacao: 'estrategica'})} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${formData.tipo_negociacao === 'estrategica' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Proposta Estratégica (1 Ativo)</button>
                      <button type="button" onClick={() => setFormData({...formData, tipo_negociacao: 'cotacao'})} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${formData.tipo_negociacao === 'cotacao' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}>Cotação Padrão (Múltiplos Itens)</button>
                  </div>

                  {formData.tipo_negociacao === 'estrategica' ? (
                      <>
                          <div className="md:col-span-2"><label className="text-xs font-bold text-slate-700 mb-1.5 flex justify-between">Ativo a Negociar</label><select className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold" value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})}><option value="">Selecione...</option>{produtosDisponiveis.map(p => <option key={p.ativo} value={p.ativo}>{p.ativo}</option>)}</select></div>
                          <div className="md:col-span-2"><label className="text-xs font-bold text-slate-700 mb-1.5 block">Validade</label><input type="text" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold" value={formData.validade_produto} onChange={e => setFormData({...formData, validade_produto: e.target.value})} placeholder="Mês/Ano ou Lote" /></div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:col-span-4">
                              <div><label className="text-xs font-bold text-slate-700 mb-1.5 block">Preço/g (R$)</label><input type="text" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-black text-emerald-700" value={formData.valor_g_tabela} onChange={e => setFormData({...formData, valor_g_tabela: e.target.value})} /></div>
                              <div><label className="text-xs font-bold text-slate-700 mb-1.5 block">KG Proposto</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold" value={formData.kg_proposto} onChange={e => setFormData({...formData, kg_proposto: e.target.value})}/></div>
                              <div><label className="text-xs font-bold text-slate-700 mb-1.5 block">KG Bonificado</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold" value={formData.kg_bonificado} onChange={e => setFormData({...formData, kg_bonificado: e.target.value})}/></div>
                              <div><label className="text-xs font-bold text-slate-700 mb-1.5 block">Parcelas</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold" value={formData.parcelas} onChange={e => setFormData({...formData, parcelas: e.target.value})}/></div>
                          </div>
                          
                          <div className="md:col-span-2">
                              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Dias para 1ª Parcela</label>
                              <input type="number" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold" value={formData.dias_primeira_parcela} onChange={e => setFormData({...formData, dias_primeira_parcela: e.target.value})}/>
                          </div>
                          <div className="md:col-span-4 border-t border-slate-200 my-2 md:my-4 pt-4">
                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Variáveis do Payback (Para o PDF)</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div><label className="text-xs font-bold text-slate-700 mb-1.5 block">Peso da Fórmula (g)</label><input type="text" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold" value={formData.peso_formula_g} onChange={e => setFormData({...formData, peso_formula_g: e.target.value})}/></div>
                                  <div><label className="text-xs font-bold text-slate-700 mb-1.5 block">Fator de Lucro</label><input type="text" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold" value={formData.fator_lucro} onChange={e => setFormData({...formData, fator_lucro: e.target.value})}/></div>
                                  <div><label className="text-xs font-bold text-slate-700 mb-1.5 block">Custo Fixo / Fórm. (R$)</label><input type="text" className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-bold" value={formData.custo_fixo_operacional} onChange={e => setFormData({...formData, custo_fixo_operacional: e.target.value})}/></div>
                              </div>
                          </div>

                      </>
                  ) : (
                      <div className="md:col-span-4 bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm">
                          <div className="flex justify-between items-center mb-4 border-b pb-3"><h4 className="text-[10px] font-black text-slate-500 uppercase"><Package size={14}/> Itens da Cotação</h4><button type="button" onClick={adicionarItemCotacao} className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"><ListPlus size={14}/> Adicionar Insumo</button></div>
                          <div className="space-y-3">
                              {getItensCotacao().map((item: any) => {
                                  const produtoDaLinha = produtosDisponiveis.find(p => p.ativo === item.insumo);
                                  return (
                                  <div key={item.id} className="grid grid-cols-12 gap-3 bg-white p-3 rounded-lg border relative items-end">
                                      <button type="button" onClick={() => removerItemCotacao(item.id)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1"><X size={12}/></button>
                                      <div className="col-span-12 md:col-span-3"><label className="text-[10px] font-bold text-slate-500">Insumo</label><select className="w-full border rounded p-2 text-xs font-bold" value={item.insumo} onChange={e => atualizarItemCotacao(item.id, 'insumo', e.target.value)}><option value="">Selecione...</option>{produtosDisponiveis.map(p => <option key={p.ativo} value={p.ativo}>{p.ativo}</option>)}</select></div>
                                      <div className="col-span-12 md:col-span-2"><label className="text-[10px] font-bold text-slate-500">Embalagem</label><select className="w-full border rounded p-2 text-xs font-bold" value={item.fracionamento} onChange={e => atualizarItemCotacao(item.id, 'fracionamento', e.target.value)} disabled={!item.insumo}><option value="">Selecione...</option>{produtoDaLinha && produtoDaLinha.opcoes.map((op: any, index: number) => (<option key={op.fracionamento + index} value={op.fracionamento} disabled={op.estoque <= 0}>{op.fracionamento} {op.estoque <= 0 ? '(Zerado)' : `(${op.estoque} pct)`}</option>))}</select></div>
                                      <div className="col-span-6 md:col-span-2"><label className="text-[10px] font-bold text-slate-500">Tipo</label><select className="w-full border rounded p-2 text-xs font-bold" value={item.tipo_venda} onChange={e => atualizarItemCotacao(item.id, 'tipo_venda', e.target.value)}><option value="Venda">Venda</option><option value="Bonificado">Bonificado</option></select></div>
                                      <div className="col-span-6 md:col-span-1"><label className="text-[10px] font-bold text-slate-500">Preço/g</label><input type="text" className="w-full bg-white border rounded p-2 text-xs font-mono" value={item.preco_g} onChange={e => atualizarItemCotacao(item.id, 'preco_g', e.target.value)} /></div>
                                      <div className="col-span-12 md:col-span-2"><label className="text-[10px] font-bold text-slate-500">Info</label><input type="text" className="w-full border rounded p-2 text-xs" value={item.info_adicional} onChange={e => atualizarItemCotacao(item.id, 'info_adicional', e.target.value)} /></div>
                                      <div className="col-span-12 md:col-span-2"><label className="text-[10px] font-black text-slate-700 text-right">Total Linha</label><div className={`w-full p-2 rounded text-xs font-black text-right border ${item.tipo_venda === 'Bonificado' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-800'}`}>{formatCurrency(item.preco_total)}</div></div>
                                  </div>
                              )})}
                          </div>
                      </div>
                  )}

                  <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-2 bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm">
                      <div className="md:col-span-4 mb-2"><h4 className="text-[10px] font-black text-slate-500 uppercase"><Building2 size={14}/> Faturamento e Logística</h4></div>
                      <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Frete</label><select className="w-full border border-slate-300 rounded-xl p-3 text-sm font-bold" value={formData.frete_tipo} onChange={e => setFormData({...formData, frete_tipo: e.target.value})}><option value="CIF">CIF</option><option value="FOB">FOB</option></select></div>
                      <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Transportadora</label><select className="w-full border border-slate-300 rounded-xl p-3 text-sm font-bold" value={formData.frete_transportadora} onChange={e => setFormData({...formData, frete_transportadora: e.target.value})}><option value="Correios">Correios</option><option value="Quality">Quality</option><option value="Braspress">Braspress</option></select></div>
                      <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Postagem (Dias)</label><input type="text" className="w-full border border-slate-300 rounded-xl p-3 text-sm font-bold" value={formData.frete_previsao} onChange={e => setFormData({...formData, frete_previsao: e.target.value})} placeholder="Ex: 5" /></div>
                      <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Condições</label><input type="text" className="w-full border border-slate-300 rounded-xl p-3 text-sm font-bold" value={formData.condicoes_pagamento} onChange={e => setFormData({...formData, condicoes_pagamento: e.target.value})} /></div>
                  </div>

                  <div className="md:col-span-4 bg-slate-800 p-4 rounded-2xl flex items-center justify-between text-white mt-2 shadow-lg"><span className="text-xs font-black uppercase text-slate-300">Total Proposta</span><span className="text-xl md:text-2xl font-black text-[#82D14D]">{formatCurrency(formData.valor)}</span></div>
                  
                  <div className="md:col-span-4 mt-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-2"><FileText size={14}/> Observações (Pág. 1)</label>
                      <div className="relative">
                          <textarea 
                              maxLength={250}
                              className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl p-4 outline-none text-sm text-slate-700 font-medium shadow-sm transition resize-none min-h-[100px] custom-scrollbar" 
                              value={formData.observacoes_proposta} 
                              onChange={(e) => setFormData({...formData, observacoes_proposta: e.target.value})} 
                          />
                          <p className="text-[9px] font-bold text-slate-400 absolute bottom-3 right-4">
                              {(formData.observacoes_proposta || '').length}/250 caracteres
                          </p>
                      </div>
                  </div>

                  {/* --- BLOCO NOVO: PÁGINA 2 (ANEXOS LIVRES) --- */}
                  <div className="md:col-span-4 mt-4 bg-white border-2 border-blue-100 p-5 rounded-2xl">
                      <div className="flex items-center justify-between mb-4">
                          <div>
                              <h4 className="text-sm font-black text-blue-900 flex items-center gap-2"><Edit3 size={18}/> Anexos Livres (Página 2)</h4>
                              <p className="text-[10px] font-bold text-slate-500 mt-1">Habilite para adicionar prints, tabelas e formatação livre em uma segunda página do PDF.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" checked={incluirSegundaPagina} onChange={() => setIncluirSegundaPagina(!incluirSegundaPagina)} />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                      </div>

                      {incluirSegundaPagina && (
                          <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white relative">
                              {/* Esta div invisível é onde o HTML fica puro para o html2canvas ler perfeitamente */}
                              <div className="absolute opacity-0 pointer-events-none w-[800px] left-0 top-0 -z-50 bg-white p-6" ref={richTextRef}>
                                  <div dangerouslySetInnerHTML={{ __html: conteudoRichText }} className="prose prose-sm max-w-none prose-img:max-w-full prose-table:w-full prose-td:border prose-td:p-2 prose-th:bg-slate-100 prose-th:border prose-th:p-2"></div>
                              </div>
                              
                              <ReactQuill 
                                  theme="snow" 
                                  value={conteudoRichText} 
                                  onChange={setConteudoRichText}
                                  modules={quillModules}
                                  className="bg-white min-h-[300px]"
                                  placeholder="Cole prints (Ctrl+V), crie listas ou digite observações longas..."
                              />
                          </div>
                      )}
                  </div>
                  
                  <div className="md:col-span-4 flex items-center gap-2 mb-1 md:mb-2 mt-4 md:mt-6"><div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-sm">3</div><h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Follow-up Interno</h3></div>
                  <div className="md:col-span-1"><label className="text-[10px] font-black text-red-600 uppercase flex items-center gap-1 mb-1.5"><Clock size={12}/> Próx. Contato</label><input type="date" className="w-full bg-white border border-red-200 rounded-xl p-3 text-sm font-bold text-red-900 outline-none" value={formData.data_lembrete} onChange={e => setFormData({...formData, data_lembrete: e.target.value})} /></div>
                  <div className="md:col-span-1"><label className="text-[10px] font-black text-purple-600 uppercase flex items-center gap-1 mb-1.5"><Clock size={12}/> Cobrar SDR</label><input type="date" className="w-full bg-white border border-purple-200 rounded-xl p-3 text-sm font-bold text-purple-900 outline-none" value={formData.data_lembrete_sdr} onChange={e => setFormData({...formData, data_lembrete_sdr: e.target.value})} disabled={!isSDRUser} /></div>
                  <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-700 uppercase mb-1.5 block">Canal</label><select className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium outline-none" value={formData.canal_contato} onChange={e => setFormData({...formData, canal_contato: e.target.value})}>{CANAIS_CONTATO.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div className="md:col-span-4 space-y-3 mt-4"><label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-2"><MessageSquare size={14}/> Nova Anotação</label><div className="flex flex-col gap-2 bg-blue-50/50 p-3 border border-blue-100 rounded-2xl"><textarea className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none text-sm text-slate-700 font-medium" placeholder="..." value={novaNotaInput} onChange={(e) => setNovaNotaInput(e.target.value)} /><button type="button" onClick={adicionarNotaAoHistorico} className="self-end bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs">Registrar</button></div><label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mt-4 mb-2"><History size={14}/> Histórico Imutável</label><textarea className="w-full bg-slate-100 border border-slate-200 rounded-xl p-4 h-48 resize-none text-xs text-slate-700 font-mono" value={formData.observacoes} readOnly /></div>
              </div>
            </div>

            <div className="p-4 md:p-6 bg-white border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-3">
              {editingOp ? <button onClick={handleDelete} className="w-full md:w-auto text-red-500 font-bold text-xs uppercase px-4 py-3"><Trash2 size={16}/></button> : <div className="hidden md:block"></div>}
              <div className="flex flex-col-reverse md:flex-row gap-3 w-full md:w-auto"><button onClick={fecharModalELimparURL} className="w-full md:w-auto px-6 py-3.5 font-bold text-slate-600 bg-slate-100 rounded-xl transition text-sm">Cancelar</button><button onClick={handleSave} className="w-full md:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-xl font-black shadow-lg text-sm flex items-center justify-center gap-2"><Save size={18}/> Salvar Oportunidade</button></div>
            </div>
          </div>
        </div>, document.body
      )}

      {confirmModal.open && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-8 text-center"><div className="mx-auto w-16 h-16 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mb-6"><AlertTriangle size={32} /></div><h2 className="text-xl font-black text-slate-800 mb-3">{confirmModal.title}</h2><p className="text-slate-600 font-medium whitespace-pre-wrap">{confirmModal.message}</p></div>
              <div className="p-4 md:p-6 bg-slate-50 border-t flex flex-col md:flex-row gap-3"><button onClick={confirmModal.onCancel} className="w-full bg-white border text-slate-600 font-bold py-3 rounded-xl">Cancelar</button><button onClick={confirmModal.onConfirm} className="w-full bg-yellow-500 text-white font-bold py-3 rounded-xl shadow-lg">Sim, Continuar</button></div>
           </div>
        </div>, document.body
      )}

      {blockModal.open && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-red-600 p-6 md:p-8 flex flex-col items-center justify-center text-white"><ShieldAlert size={50} className="mb-4 opacity-90"/><h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-center">{blockModal.title}</h2></div>
              <div className="p-6 md:p-8 text-center bg-white"><p className="text-slate-800 font-bold text-base md:text-lg mb-2">{blockModal.message}</p><div className="bg-red-50 border border-red-100 rounded-xl p-4 mt-4 text-left"><p className="text-xs text-red-500 font-bold uppercase tracking-wider mb-1">Motivo</p><p className="text-red-800 font-bold text-sm whitespace-pre-wrap">{blockModal.motivo}</p></div></div>
              <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100"><button onClick={() => setBlockModal({ ...blockModal, open: false })} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition active:scale-95">FECHAR</button></div>
           </div>
        </div>, document.body
      )}

      {lembreteModal.open && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-blue-600 p-6 flex flex-col items-center justify-center text-white"><Bell size={40} className="mb-3 animate-bounce"/><h2 className="text-xl font-black uppercase">Lembretes de Hoje!</h2></div>
              <div className="p-6 bg-white"><p className="text-slate-700 font-bold mb-4 text-center text-sm">Você precisa atuar nestas oportunidades hoje:</p><div className="max-h-48 overflow-y-auto custom-scrollbar"><ul className="space-y-2 pr-2">{lembreteModal.clientes.map((cliente, i) => (<li key={i} onClick={() => { setLembreteModal(prev => ({...prev, open: false})); router.push(`/pipeline?op_id=${cliente.id}`); }} className="flex items-start gap-2 text-sm font-medium text-slate-600 bg-slate-50 p-3 rounded-xl border cursor-pointer hover:bg-blue-50 transition"><span className="text-blue-500 font-black">•</span> {cliente.nome}</li>))}</ul></div></div>
              <div className="p-4 bg-slate-50 border-t flex justify-center"><button onClick={() => setLembreteModal({ open: false, clientes: [] })} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg">Ciente, vamos lá!</button></div>
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
