"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { 
  Plus, Search, Calendar, User, Phone, DollarSign, 
  X, Tag, Beaker, MessageCircle, AlertCircle, 
  CheckCircle2, Trash2, Loader2, StickyNote, Download, MapPin, ShieldCheck, FileText,
  Clock, Eye, MessageSquare, AlertOctagon, ShieldAlert, Lock, Hash
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

const CANAIS_CONTATO = ['WhatsApp', 'Ligação', 'E-mail', 'Visita Presencial', 'Instagram'];

export default function PipelinePage() {
  const supabase = createClientComponentClient();
  
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [produtosApi, setProdutosApi] = useState<any[]>([]); 
  const [exclusividades, setExclusividades] = useState<any[]>([]); 
  const [baseClientesExterna, setBaseClientesExterna] = useState<any[]>([]); 
  
  const [loading, setLoading] = useState(true);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [buscaTermo, setBuscaTermo] = useState(""); // NOVO: Estado para busca
  
  // MODAIS
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<any>(null);
  const [blockModal, setBlockModal] = useState({ open: false, title: '', message: '', motivo: '' });

  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const getLocalData = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    cnpj: '', nome_cliente: '', contato: '', telefone: '', email: '', produto: '',
    aplicacao: '', valor: '', 
    data_entrada: getLocalData(), 
    data_lembrete: '', 
    canal_contato: 'WhatsApp',
    observacoes: '',
    observacoes_proposta: '', 
    status: 'prospeccao',
    kg_proposto: '1', kg_bonificado: '0', parcelas: '1', dias_primeira_parcela: '45',
    peso_formula_g: '13.2', fator_lucro: '5', cidade_exclusividade: '', uf_exclusividade: '', 
    valor_g_tabela: '0',
    numero_proposta: 0 // NOVO CAMPO
  });

  useEffect(() => { 
    setMounted(true); 
    inicializarDados();
  }, []);

  const inicializarDados = async () => {
    setLoading(true);
    await Promise.all([
        carregarOportunidades(), 
        carregarProdutosDaAPI(), 
        carregarExclusividades(), 
        carregarBaseClientesOficial()
    ]);
    setLoading(false);
  };

  const parseMoney = (valor: any) => {
    if (typeof valor === 'number') return valor;
    if (!valor) return 0;
    let str = String(valor).replace('R$', '').trim();
    if (str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
    }
    return parseFloat(str) || 0;
  };

  const carregarExclusividades = async () => {
    const { data } = await supabase.from('exclusividades').select('*');
    setExclusividades(data || []);
  };

  const carregarBaseClientesOficial = async () => {
    try {
        const res = await fetch(`${API_CLIENTES_URL}?path=clientes`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            setBaseClientesExterna(json.data);
        }
    } catch (e) { console.error("Erro base externa:", e); }
  };

  const carregarProdutosDaAPI = async () => {
    setLoadingProdutos(true);
    try {
        const res = await fetch(`${API_PRODUTOS_URL}?path=produtos`);
        const json = await res.json();
        
        if (json.success && Array.isArray(json.data)) {
            const produtosLimpos = json.data.map((p: any) => ({
                ativo: p.ativo ? p.ativo.trim() : 'Sem Nome',
                preco_grama: parseMoney(p.preco_grama), 
                peso_formula: parseMoney(p.peso_formula) || 13.2
            }));
            setProdutosApi(produtosLimpos.sort((a: any, b: any) => a.ativo.localeCompare(b.ativo)));
        }
    } catch (e) { console.error("Erro API Produtos:", e); }
    setLoadingProdutos(false);
  };

  const carregarOportunidades = async () => {
    const { data } = await supabase.from('pipeline').select('*').order('created_at', { ascending: false });
    setOportunidades(data || []);
  };

  const produtosDisponiveis = produtosApi.filter(prod => {
    const nomeProduto = prod.ativo;
    const ufAtual = (formData.uf_exclusividade || '').toUpperCase().trim();
    const cidadeAtual = (formData.cidade_exclusividade || '').toUpperCase().trim();

    if (!ufAtual) return true;

    const bloqueado = exclusividades.some(ex => 
      ex.produto === nomeProduto && 
      ex.uf === ufAtual && 
      (ex.cidade === cidadeAtual || ex.cidade === 'TODAS') &&
      ex.nome_cliente !== formData.nome_cliente
    );

    return !bloqueado; 
  });

  useEffect(() => {
    if (!formData.produto) return;
    const produtoSelecionado = produtosApi.find(p => p.ativo === formData.produto);
    if (produtoSelecionado) {
        const precoAtual = parseMoney(formData.valor_g_tabela);
        if (precoAtual === 0 || !formData.valor_g_tabela) {
             setFormData(prev => ({ 
                ...prev, 
                valor_g_tabela: produtoSelecionado.preco_grama.toFixed(2).replace('.', ','), 
                peso_formula_g: produtoSelecionado.peso_formula.toString()
            }));
        }
    }
  }, [formData.produto, produtosApi]);

  useEffect(() => {
    const precoG = parseMoney(formData.valor_g_tabela);
    const kg = parseMoney(formData.kg_proposto);
    const vTotal = (precoG * 1000 * kg).toFixed(2); 

    setFormData(prev => {
        if (prev.valor === vTotal) return prev; 
        return { ...prev, valor: vTotal };
    });
  }, [formData.valor_g_tabela, formData.kg_proposto]);


  const buscarDadosCNPJ = async () => {
    const cnpjLimpo = formData.cnpj?.replace(/\D/g, '');
    if (cnpjLimpo?.length !== 14) return;
    
    setLoadingCNPJ(true);

    // 1. VERIFICAÇÃO DE PROPOSTA EXISTENTE (NOVO)
    // Se não estivermos editando (é uma nova proposta), verifica se já existe
    if (!editingOp) {
        const propostaExistente = oportunidades.find(op => {
            const opCnpj = op.cnpj?.replace(/\D/g, '') || '';
            return opCnpj === cnpjLimpo;
        });

        if (propostaExistente) {
            // Encontra o label do status para ficar bonito na mensagem
            const statusLabel = ESTAGIOS.find(e => e.id === propostaExistente.status)?.label || propostaExistente.status;
            
            const confirmar = window.confirm(`ATENÇÃO:\nVocê já tem uma proposta para este CNPJ no status "${statusLabel.toUpperCase()}".\n\nDeseja realmente abrir uma NOVA proposta?`);
            
            if (!confirmar) {
                setFormData(prev => ({ ...prev, cnpj: '' })); // Limpa o campo
                setLoadingCNPJ(false);
                return; // Para tudo
            }
        }
    }

    // 2. VERIFICAÇÃO BASE EXTERNA (BLOQUEIOS)
    const clienteNaBase = baseClientesExterna.find(c => {
        const cnpjBase = String(c.cnpj || '').replace(/\D/g, '');
        return cnpjBase === cnpjLimpo;
    });

    if (clienteNaBase) {
        if (clienteNaBase.bloqueado) {
            setBlockModal({
                open: true,
                title: 'CLIENTE BLOQUEADO',
                message: 'Este CNPJ possui restrições administrativas.',
                motivo: clienteNaBase.motivoBloqueio || 'Entre em contato com o financeiro.'
            });
            setFormData(prev => ({ ...prev, cnpj: '' }));
            setLoadingCNPJ(false);
            return; 
        }

        if (clienteNaBase.vendedor && clienteNaBase.vendedor.trim() !== "") {
            setBlockModal({
                open: true,
                title: 'CARTEIRA DEFINIDA',
                message: 'Este cliente já pertence à carteira de outro representante.',
                motivo: `Carteira exclusiva de: ${clienteNaBase.vendedor}`
            });
            setFormData(prev => ({ ...prev, cnpj: '' }));
            setLoadingCNPJ(false);
            return; 
        }
    }

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (!res.ok) throw new Error("Erro CNPJ");
      
      const data = await res.json();
      setFormData(prev => ({ 
        ...prev, 
        nome_cliente: (data.nome_fantasia || data.razao_social || '').toUpperCase(),
        cidade_exclusividade: (data.municipio || '').toUpperCase(),
        uf_exclusividade: (data.uf || '').toUpperCase(),
        telefone: data.ddd_telefone_1 && data.telefone1 ? `(${data.ddd_telefone_1}) ${data.telefone1}` : prev.telefone
      }));
    } catch (e) { }
    
    setLoadingCNPJ(false);
  };

  const formatCurrency = (val: any) => (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const cleanHtmlForPdf = (html: string) => {
    if (!html) return "";
    let text = html.replace(/<p>/g, "").replace(/<\/p>/g, "\n").replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<li>/g, "• ").replace(/<\/li>/g, "\n");
    text = text.replace(/<[^>]+>/g, "");
    text = text.replace(/&nbsp;/g, " ").replace(/\n\s*\n/g, "\n").trim();
    return text;
  };

  const gerarPDFPremium = (item: any) => {
    const doc = new jsPDF();
    const verdeEscuro: [number, number, number] = [20, 83, 45];
    const cinzaSuave: [number, number, number] = [243, 244, 246];
    const textoCinza: [number, number, number] = [60, 60, 60];

    try { doc.addImage("/logo.jpg", "JPEG", 20, 12, 50, 20); } catch (e) {}

    doc.setFont("helvetica", "bold"); doc.setFontSize(24);
    doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
    doc.text(`PROPOSTA #${item.numero_proposta || '---'}`, 190, 20, { align: 'right' }); // MOSTRA NÚMERO NO PDF
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(120);
    doc.text("YellowLeaf – Nutraceuticals Company", 190, 26, { align: 'right' });
    doc.setFillColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
    doc.rect(0, 35, 210, 2, 'F');

    doc.setFillColor(cinzaSuave[0], cinzaSuave[1], cinzaSuave[2]);
    doc.rect(20, 45, 170, 25, 'F');
    doc.setFont("helvetica", "bold"); doc.text("DADOS DO CLIENTE", 25, 52);
    doc.setFontSize(10); doc.setTextColor(textoCinza[0], textoCinza[1], textoCinza[2]); doc.setFont("helvetica", "normal");
    doc.text(`Razão Social: ${item.nome_cliente || 'N/A'}`, 25, 58);
    doc.text(`Contato: ${item.contato || 'N/A'}  |  Tel: ${item.telefone || 'N/A'}`, 25, 63);
    doc.text(`Cidade/UF: ${item.cidade_exclusividade || 'N/A'} / ${item.uf_exclusividade || ''}`, 25, 68);

    doc.setFontSize(12); doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]); doc.setFont("helvetica", "bold");
    doc.text("ESPECIFICAÇÃO DO INVESTIMENTO", 20, 83);
    const totalKG = Number(item.kg_proposto) + Number(item.kg_bonificado);
    const vGramaReal = (Number(item.valor) / (totalKG * 1000)) || 0;
    const vParc = (Number(item.valor) / Number(item.parcelas)) || 0;
    const valorGExibicao = parseMoney(item.valor_g_tabela);

    autoTable(doc, {
      startY: 88, margin: { left: 20, right: 20 },
      head: [['DESCRIÇÃO', 'VALORES']],
      body: [
        ['Ativo/Insumo', item.produto || 'Insumo'],
        ['Preço por grama (g)', formatCurrency(valorGExibicao)], 
        ['Quantidade da proposta (kg)', `${item.kg_proposto} kg`],
        ['Quantidade bonificada (kg)', `${item.kg_bonificado} kg`],
        ['Investimento Total (R$)', { content: formatCurrency(item.valor), styles: { fontStyle: 'bold' } }],
        ['Preço do grama c/ bonificação (g)', { content: formatCurrency(vGramaReal), styles: { fontStyle: 'bold', textColor: textoCinza } }],
        ['Condição de Pagamento ', `${item.parcelas} parcelas de ${formatCurrency(vParc)}`],
        ['Vencimento 1ª Parcela', `${item.dias_primeira_parcela} dias`]
      ],
      theme: 'grid',
      headStyles: { fillColor: verdeEscuro, textColor: 255, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 10, cellPadding: 2, textColor: textoCinza },
      columnStyles: { 0: { cellWidth: 110 }, 1: { halign: 'right', fontStyle: 'bold' } }
    });

    const paybackY = (doc as any).lastAutoTable.finalY + 8;
    const custoF = (vGramaReal * (Number(item.peso_formula_g) || 13.2));
    const precoV = (custoF * (Number(item.fator_lucro) || 5));
    const formulasDia = vParc > 0 ? ((vParc / precoV) / 22) : 0;

    autoTable(doc, {
      startY: paybackY, margin: { left: 20, right: 20 },
      head: [['ANÁLISE DE RETORNO (PAYBACK)', 'ESTIMATIVA']],
      body: [
        ['Custo por fórmula (R$) (Manipulado)', formatCurrency(custoF)],
        ['Sugestão de Venda (R$) (Fator 5)', formatCurrency(precoV)],
        [{ content: 'META DE VIABILIDADE', styles: { fontStyle: 'bold', fontSize: 11 } }, { content: `${formulasDia.toFixed(2)} fórmulas/dia`, styles: { fontStyle: 'bold', textColor: [0, 128, 0], fontSize: 12, halign: 'right' } }]
      ],
      theme: 'grid',
      headStyles: { fillColor: verdeEscuro, textColor: 255, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 10, cellPadding: 2, textColor: textoCinza },
      columnStyles: { 0: { cellWidth: 110 }, 1: { halign: 'right' } }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 8; 
    if (item.observacoes_proposta) {
        const notasTexto = cleanHtmlForPdf(item.observacoes_proposta);
        autoTable(doc, {
            startY: currentY, margin: { left: 20, right: 20 },
            head: [['CONDIÇÕES GERAIS DA PROPOSTA']],
            body: [[notasTexto]],
            theme: 'grid',
            headStyles: { fillColor: verdeEscuro, textColor: 255, fontStyle: 'bold', halign: 'left' },
            styles: { fontSize: 9, cellPadding: 3, textColor: textoCinza, valign: 'middle', overflow: 'linebreak' },
            columnStyles: { 0: { cellWidth: 'auto' } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;
    } else { currentY += 8; }

    const certY = currentY; 
    doc.setFontSize(12); doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]); doc.setFont("helvetica", "bold");
    doc.text("QUALIDADE E PRODUÇÃO CERTIFICADA", 105, certY, { align: 'center' });

    const textY = certY + 5;
    doc.setFontSize(9); doc.setTextColor(textoCinza[0], textoCinza[1], textoCinza[2]); doc.setFont("helvetica", "normal");
    const certText = "Trabalhamos com matéria-prima advinda de produção certificada pelos mais altos padrões técnicos do mundo e promovemos sua comercialização com responsabilidade e ética.";
    const splitCertText = doc.splitTextToSize(certText, 170);
    doc.text(splitCertText, 105, textY, { align: 'center' });

    const imgY = textY + (splitCertText.length * 4) + 3; 
    try {
      const imgW = 90; const imgH = 15; const xPos = (210 - imgW) / 2;
      if (imgY + imgH < 280) { doc.addImage("/selo.jpg", "JPEG", xPos, imgY, imgW, imgH); } 
      else { doc.addPage(); doc.addImage("/selo.jpg", "JPEG", xPos, 20, imgW, imgH); }
    } catch (e) {}

    const fY = 285; doc.setFontSize(7); doc.setTextColor(150);
    doc.text("YELLOW LEAF IMPORTAÇÃO E EXPORTAÇÃO LTDA | CNPJ: 45.643.261/0001-68", 20, fY);
    doc.text("www.yellowleaf.com.br | @yellowleafnutraceuticals", 20, fY + 4);
    doc.text("Dionatan Hoegen - Representante Comercial", 190, fY, { align: 'right' });
    doc.text(`WhatsApp: (44) 99102-7642 | @dionatan.magistral`, 190, fY + 4, { align: 'right' });

    doc.save(`Proposta Comercial - ${item.nome_cliente}.pdf`);
  };

  const handleSave = async () => {
    if (!formData.nome_cliente) return alert("Preencha a Razão Social.");
    if (!formData.observacoes || formData.observacoes.trim() === "") {
        return alert("O campo 'Anotações Internas' é obrigatório. Registre o andamento da negociação.");
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    
    let valorFinal = 0;
    if (String(formData.valor).includes('.')) {
        valorFinal = parseFloat(String(formData.valor));
    } else {
        valorFinal = parseFloat(String(formData.valor).replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
    }

    // --- LÓGICA DE NUMERAÇÃO DA PROPOSTA ---
    let numeroFinal = formData.numero_proposta;
    
    // Se é uma NOVA proposta (não edição) e ainda não tem número
    if (!editingOp) {
        // Acha o maior número atual
        const maiorNumero = oportunidades.reduce((max, op) => {
            const num = Number(op.numero_proposta) || 0;
            return num > max ? num : max;
        }, 467); // Começa do 467 para o primeiro ser 468
        
        numeroFinal = maiorNumero + 1;
    }

    const payload = {
      ...formData,
      user_id: user?.id,
      numero_proposta: numeroFinal, // SALVA O NÚMERO
      nome_cliente: formData.nome_cliente.toUpperCase(),
      contato: formData.contato ? formData.contato.toUpperCase() : '',
      cidade_exclusividade: formData.cidade_exclusividade ? formData.cidade_exclusividade.toUpperCase() : '',
      uf_exclusividade: formData.uf_exclusividade ? formData.uf_exclusividade.toUpperCase() : '',
      
      valor: valorFinal,
      valor_g_tabela: parseFloat(String(formData.valor_g_tabela).replace(',', '.')) || 0,
      kg_proposto: parseFloat(String(formData.kg_proposto)) || 0,
      kg_bonificado: parseFloat(String(formData.kg_bonificado)) || 0,
      parcelas: parseInt(String(formData.parcelas)) || 1,
      dias_primeira_parcela: parseInt(String(formData.dias_primeira_parcela)) || 45,
      data_lembrete: (formData.data_lembrete && formData.data_lembrete.trim() !== "") ? formData.data_lembrete : null,
      data_entrada: formData.data_entrada || getLocalData(),
      canal_contato: formData.canal_contato,
      observacoes: formData.observacoes,
      observacoes_proposta: formData.observacoes_proposta 
    };

    const { error } = editingOp ? await supabase.from('pipeline').update(payload).eq('id', editingOp.id) : await supabase.from('pipeline').insert(payload);
    
    if (!error) { 
      setModalOpen(false); 
      carregarOportunidades(); 
    } else { 
      console.error("Erro banco:", error); 
      alert(`Erro ao salvar: ${error.message}`); 
    }
  };

  const handleDelete = async () => {
    if (confirm('Deseja excluir este registro permanentemente?')) {
        const { error } = await supabase.from('pipeline').delete().eq('id', editingOp.id);
        if (!error) { carregarOportunidades(); setModalOpen(false); } 
    }
  };

  const openWhatsApp = (e: React.MouseEvent, telefone: string) => {
    e.stopPropagation();
    if (!telefone) return alert("Número de telefone não disponível.");
    const num = telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${num}`, '_blank');
  };

  const renderCard = (op: any) => {
    const hoje = getLocalData(); 
    const dataLembrete = op.data_lembrete; 
    const isPerdido = op.status === 'perdido';
    
    const isAtrasado = dataLembrete && dataLembrete < hoje;
    const isHoje = dataLembrete === hoje; 
    
    let borderClass = 'border-slate-100 hover:border-blue-300';
    let bgClass = 'bg-white';
    let textClass = 'text-slate-400';
    let label = 'Ligar: ';
    let dateStyle = {};

    if (isAtrasado && !isPerdido) {
        bgClass = 'bg-red-50 animate-pulse';
        borderClass = 'border-red-300';
        textClass = 'text-red-600 font-bold';
        label = 'Atrasado: ';
    } else if (isHoje && !isPerdido) {
        borderClass = 'border-orange-400';
        bgClass = 'bg-orange-50';
        textClass = 'text-orange-600 font-bold';
        label = 'HOJE: ';
    } else if (isPerdido) {
        borderClass = 'border-slate-200';
        bgClass = 'bg-gray-50 opacity-75';
        textClass = 'text-slate-400';
        if (dataLembrete) dateStyle = { textDecoration: 'line-through' };
    }
    
    return (
        <div key={op.id} onClick={() => { setEditingOp(op); setFormData(op); setModalOpen(true); }} className={`p-4 rounded-xl border cursor-pointer shadow-sm transition hover:-translate-y-1 ${bgClass} ${borderClass}`}>
            <div className="flex justify-between items-start">
                <div className="max-w-[80%]">
                    {/* Exibe o número da proposta em cima */}
                    <span className="text-[10px] font-mono text-slate-400 block">#{op.numero_proposta || '---'}</span>
                    <h4 className="font-bold text-slate-700 text-sm uppercase truncate" title={op.nome_cliente}>{op.nome_cliente}</h4>
                </div>
                {op.telefone && (
                    <a 
                        href={`https://wa.me/55${op.telefone.replace(/\D/g, '')}`} 
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} 
                        className="text-green-500 hover:text-green-600 transition-colors p-1 relative z-10"
                        title="Abrir WhatsApp"
                    >
                        <MessageCircle size={18} />
                    </a>
                )}
            </div>
            
            <div className="flex flex-col gap-1 mt-2 mb-2">
                {(op.cidade_exclusividade || op.uf_exclusividade) && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                        <MapPin size={10} /> {op.cidade_exclusividade} - {op.uf_exclusividade}
                    </div>
                )}
                {op.observacoes && (
                    <p className="text-[10px] text-slate-400 italic truncate" title={op.observacoes}>
                        "{op.observacoes}"
                    </p>
                )}
            </div>

            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100/50">
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-bold truncate max-w-[50%]">{op.produto}</span>
                <span className="text-xs font-black text-slate-600">{formatCurrency(op.valor)}</span>
            </div>
            
            {op.data_lembrete && (
                <div className={`mt-2 flex items-center gap-1 text-[10px] font-bold ${textClass}`} style={dateStyle}>
                    <Clock size={10} /> {label} {op.data_lembrete.split('-').reverse().join('/')} 
                </div>
            )}
        </div>
    );
  }

  // Ordenação + Filtro de Busca
  const getSortedOpportunities = (estagioId: string) => {
    // 1. Filtra por status e pelo termo de busca
    const ops = oportunidades.filter(o => {
        const matchesStatus = o.status === estagioId;
        if (!matchesStatus) return false;
        
        const term = buscaTermo.toLowerCase();
        // Busca por Nome ou Número da Proposta
        return o.nome_cliente.toLowerCase().includes(term) || String(o.numero_proposta || '').includes(term);
    });
    
    if (estagioId === 'prospeccao') {
        const hoje = getLocalData();
        return ops.sort((a, b) => {
            const dataA = a.data_lembrete || '9999-99-99';
            const dataB = b.data_lembrete || '9999-99-99';
            
            const isAtrasadoOuHojeA = dataA <= hoje;
            const isAtrasadoOuHojeB = dataB <= hoje;

            if (isAtrasadoOuHojeA && !isAtrasadoOuHojeB) return -1;
            if (!isAtrasadoOuHojeA && isAtrasadoOuHojeB) return 1;
            
            return dataA.localeCompare(dataB);
        });
    }
    
    return ops;
  };

  return (
    <div className="w-full p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-2xl font-black text-[#1e293b] italic uppercase tracking-tighter">Pipeline YellowLeaf</h1>
        
        {/* BARRA DE BUSCA E BOTÃO */}
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <input 
                    type="text" 
                    placeholder="Buscar Cliente ou N° Proposta..." 
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold uppercase text-slate-600"
                    value={buscaTermo}
                    onChange={(e) => setBuscaTermo(e.target.value)}
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            
            <button onClick={() => { setEditingOp(null); setFormData({cnpj: '', nome_cliente: '', contato: '', telefone: '', email: '', produto: '', aplicacao: '', valor: '', data_entrada: getLocalData(), status: 'prospeccao', data_lembrete: '', observacoes: '', observacoes_proposta: '', canal_contato: 'WhatsApp', kg_proposto: '1', kg_bonificado: '0', parcelas: '1', dias_primeira_parcela: '45', peso_formula_g: '13.2', fator_lucro: '5', cidade_exclusividade: '', uf_exclusividade: '', valor_g_tabela: '0', numero_proposta: 0}); setModalOpen(true); }} className="bg-[#2563eb] text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition active:scale-95 whitespace-nowrap">+ Nova Oportunidade</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 h-[calc(100vh-180px)] overflow-x-auto pb-4">
        {ESTAGIOS.map(est => (
          <div key={est.id} className="bg-slate-50/50 rounded-2xl border flex flex-col min-w-[250px] overflow-hidden">
            <div className={`p-4 border-b-2 ${est.color} bg-white flex justify-between items-center`}><h3 className={`font-black text-xs uppercase ${est.text}`}>{est.label}</h3></div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {getSortedOpportunities(est.id).map(op => renderCard(op))}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95">
            <div className="bg-[#242f3e] p-6 flex justify-between items-center text-white shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                  ✨ {editingOp ? `Editar Proposta #${editingOp.numero_proposta}` : 'Nova Oportunidade'}
              </h2>
              <div className="flex gap-2">
                {editingOp && <button onClick={() => gerarPDFPremium(formData)} className="bg-green-600 px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:scale-105 transition uppercase shadow-lg"><Download size={14}/> PDF Premium</button>}
                <button onClick={() => setModalOpen(false)} className="hover:bg-white/10 p-1 rounded-full"><X/></button>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-5 overflow-y-auto bg-white flex-1">
              <div className="md:col-span-4 border-b pb-2 flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-blue-600 uppercase">1. Identificação e Status</h3>
                  <select className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-lg outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      {ESTAGIOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
              </div>
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">CNPJ</label><div className="flex gap-2"><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} onBlur={buscarDadosCNPJ} placeholder="Digite para validar..."/><button onClick={buscarDadosCNPJ} className="bg-blue-50 text-blue-600 p-3 rounded-xl border"><Search size={20}/></button></div></div>
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Razão Social</label><input className="w-full bg-slate-50 border rounded-xl p-3 font-bold uppercase" value={formData.nome_cliente} onChange={e => setFormData({...formData, nome_cliente: e.target.value.toUpperCase()})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Cidade</label><input className="w-full bg-slate-100 border rounded-xl p-3" value={formData.cidade_exclusividade} readOnly/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">UF</label><input className="w-full bg-slate-100 border rounded-xl p-3" value={formData.uf_exclusividade} readOnly/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Contato</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.contato} onChange={e => setFormData({...formData, contato: e.target.value.toUpperCase()})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})}/></div>

              <div className="md:col-span-4 border-b pb-2 mt-4"><h3 className="text-[10px] font-black text-green-600 uppercase">2. Proposta e Payback</h3></div>
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase flex justify-between">Ativo {loadingProdutos ? '(Carregando...)' : ''}</label><select className="w-full bg-slate-50 border rounded-xl p-3 font-bold disabled:opacity-50" value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})} disabled={loadingProdutos}><option value="">Selecione...</option>{produtosDisponiveis.map(p => <option key={p.ativo} value={p.ativo}>{p.ativo}</option>)}</select></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Valor G (Tabela)</label><input type="text" className="w-full bg-slate-50 border rounded-xl p-3 font-bold text-blue-700" value={formData.valor_g_tabela} onChange={e => setFormData({...formData, valor_g_tabela: e.target.value})} /></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">KG Proposto</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.kg_proposto} onChange={e => setFormData({...formData, kg_proposto: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Total R$</label><input className="w-full bg-slate-100 border text-slate-600 rounded-xl p-3 font-bold" value={formData.valor} readOnly /></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">KG Bônus</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.kg_bonificado} onChange={e => setFormData({...formData, kg_bonificado: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Parcelas</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.parcelas} onChange={e => setFormData({...formData, parcelas: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Venc. 1ª Parc</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.dias_primeira_parcela} onChange={e => setFormData({...formData, dias_primeira_parcela: e.target.value})}/></div>

              <div className="md:col-span-4 bg-blue-50/20 p-4 rounded-2xl border border-blue-100"><label className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2 mb-2"><FileText size={14}/> Notas e Condições (Para o PDF)</label><div className="bg-white rounded-xl overflow-hidden border border-blue-100 text-slate-700"><ReactQuill theme="snow" value={formData.observacoes_proposta} onChange={(val) => setFormData({...formData, observacoes_proposta: val})} modules={{ toolbar: [['bold', 'italic', 'underline'], [{'list': 'ordered'}, {'list': 'bullet'}], ['clean']] }} /></div></div>

              <div className="md:col-span-4 border-b pb-2 mt-4"><h3 className="text-[10px] font-black text-orange-600 uppercase">3. Gestão e Acompanhamento (Interno)</h3></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Data Entrada</label><input type="date" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.data_entrada} onChange={e => setFormData({...formData, data_entrada: e.target.value})} /></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Próximo Contato</label><input type="date" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.data_lembrete} onChange={e => setFormData({...formData, data_lembrete: e.target.value})} /></div>
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Canal de Contato</label><select className="w-full bg-slate-50 border rounded-xl p-3" value={formData.canal_contato} onChange={e => setFormData({...formData, canal_contato: e.target.value})}>{CANAIS_CONTATO.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="md:col-span-4"><label className="text-[10px] font-bold text-slate-400 uppercase flex gap-2"><MessageSquare size={14}/> Anotações Internas (OBRIGATÓRIO)</label><textarea className="w-full bg-slate-50 border rounded-xl p-3 h-20 resize-none" placeholder="Ex: Cliente pediu desconto, ligar novamente semana que vem..." value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})} /></div>
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-end items-center shrink-0 gap-2">
              {editingOp && <button onClick={handleDelete} className="text-red-500 font-bold text-xs uppercase px-4 py-2 hover:bg-red-50 rounded-lg">Excluir</button>}
              <button onClick={() => setModalOpen(false)} className="px-6 font-bold text-slate-400">CANCELAR</button>
              <button onClick={handleSave} className="bg-[#2563eb] text-white px-12 py-3 rounded-xl font-bold uppercase active:scale-95 transition">Salvar Dados</button>
            </div>
          </div>
        </div>, document.body
      )}

      {blockModal.open && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-red-600 p-6 flex flex-col items-center justify-center text-white">
                 <ShieldAlert size={64} className="mb-4 opacity-90"/>
                 <h2 className="text-2xl font-black uppercase tracking-tight text-center">{blockModal.title}</h2>
              </div>
              <div className="p-8 text-center">
                 <p className="text-slate-600 font-bold text-lg mb-2">{blockModal.message}</p>
                 <div className="bg-red-50 border border-red-100 rounded-xl p-4 mt-4">
                    <p className="text-xs text-red-500 font-bold uppercase tracking-wider mb-1">Motivo do Bloqueio</p>
                    <p className="text-red-800 font-bold text-sm">{blockModal.motivo}</p>
                 </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                 <button 
                    onClick={() => setBlockModal({ ...blockModal, open: false })}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition transform active:scale-[0.98]"
                 >
                    ENTENDIDO, FECHAR AVISO
                 </button>
              </div>
           </div>
        </div>, document.body
      )}
    </div>
  );
}