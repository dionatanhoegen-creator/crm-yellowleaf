"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { 
  Plus, Search, Calendar, User, Phone, DollarSign, 
  X, Tag, Beaker, MessageCircle, AlertCircle, 
  CheckCircle2, Trash2, Loader2, StickyNote, Download, MapPin, ShieldCheck, FileText
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import dynamic from 'next/dynamic';
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

// --- TABELA DE PREÇOS BASE (Sincronizada com seu catálogo) ---
const TABELA_PRODUTOS: Record<string, any> = {
  "Allisane®": { preco_g: 2.50, peso: 15.0 },
  "Anethin®": { preco_g: 2.50, peso: 12.0 },
  "Anidream®": { preco_g: 12.00, peso: 1.5 },
  "ArtemiFresh®": { preco_g: 2.50, peso: 15.0 },
  "BioCarum®": { preco_g: 2.50, peso: 15.0 },
  "Cardasense®": { preco_g: 2.50, peso: 12.0 },
  "CarySlim®": { preco_g: 2.50, peso: 12.0 },
  "FIThymus®": { preco_g: 2.50, peso: 12.0 },
  "GF Slim II®": { preco_g: 2.50, peso: 27.0 },
  "Glutaliz®": { preco_g: 3.00, peso: 15.0 },
  "Sineredux II ®": { preco_g: 2.50, peso: 13.2 },
  "SlimHaut®": { preco_g: 2.50, peso: 15.0 },
  "VerumFEM®": { preco_g: 3.00, peso: 12.0 }
};

const ESTAGIOS = [
  { id: 'prospeccao', label: 'Prospecção', color: 'border-blue-500', text: 'text-blue-700' },
  { id: 'qualificacao', label: 'Qualificação', color: 'border-purple-500', text: 'text-purple-700' },
  { id: 'apresentacao', label: 'Apresentação', color: 'border-pink-500', text: 'text-pink-700' },
  { id: 'negociacao', label: 'Negociação', color: 'border-yellow-500', text: 'text-yellow-700' },
  { id: 'fechado', label: 'Fechado', color: 'border-green-500', text: 'text-green-700' },
  { id: 'perdido', label: 'Perdido', color: 'border-red-500', text: 'text-red-700' },
];

export default function PipelinePage() {
  const supabase = createClientComponentClient();
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [exclusividades, setExclusividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<any>(null);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [formData, setFormData] = useState({
    cnpj: '', nome_cliente: '', contato: '', telefone: '', email: '', produto: '',
    aplicacao: '', valor: '', data_entrada: new Date().toISOString().split('T')[0],
    status: 'prospeccao', data_lembrete: '', observacoes: '',
    kg_proposto: '1', kg_bonificado: '0', parcelas: '1', dias_primeira_parcela: '45',
    peso_formula_g: '13.2', fator_lucro: '5', cidade_exclusividade: '', uf_exclusividade: '', 
    observacoes_proposta: '', valor_g_tabela: '0'
  });

  useEffect(() => { 
    setMounted(true); 
    carregarOportunidades();
    carregarExclusividades(); // Puxa os dados da "Aba Exclusividades"
  }, []);

  // BUSCA DADOS DA OUTRA ABA (EXCLUSIVIDADES)
  const carregarExclusividades = async () => {
    const { data } = await supabase.from('exclusividades').select('*');
    setExclusividades(data || []);
  };

  // LÓGICA PARA FORÇAR A LISTA DE ATIVOS DISPONÍVEIS
  const produtosFiltrados = Object.keys(TABELA_PRODUTOS).filter(nome => {
    const ufCliente = (formData.uf_exclusividade || '').toUpperCase();
    const cidadeCliente = (formData.cidade_exclusividade || '').toUpperCase();

    // Verifica se esse produto tem exclusividade para OUTRA pessoa nessa região
    const bloqueado = exclusividades.some(ex => 
      ex.produto === nome && 
      ex.uf === ufCliente && 
      (ex.cidade === cidadeCliente || ex.cidade === 'TODAS') &&
      ex.nome_cliente !== formData.nome_cliente // Se não for o mesmo cliente, bloqueia
    );

    return !bloqueado; // Só mostra se não estiver bloqueado para outros
  });

  // CÁLCULO AUTOMÁTICO
  useEffect(() => {
    if (TABELA_PRODUTOS[formData.produto]) {
      const p = TABELA_PRODUTOS[formData.produto];
      const vTotal = (p.preco_g * 1000 * Number(formData.kg_proposto || 0)).toFixed(2);
      setFormData(prev => ({ ...prev, valor_g_tabela: p.preco_g.toFixed(2), peso_formula_g: p.peso.toString(), valor: vTotal }));
    }
  }, [formData.produto, formData.kg_proposto]);

  const carregarOportunidades = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('pipeline').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setOportunidades(data || []);
    }
    setLoading(false);
  };

  const buscarDadosCNPJ = async () => {
    const cnpjLimpo = formData.cnpj?.replace(/\D/g, '');
    if (cnpjLimpo?.length !== 14) return;
    setLoadingCNPJ(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      const data = await res.json();
      setFormData(prev => ({ 
        ...prev, 
        nome_cliente: data.nome_fantasia || data.razao_social || '',
        cidade_exclusividade: data.municipio || '',
        uf_exclusividade: data.uf || '',
        telefone: data.ddd_telefone_1 && data.telefone1 ? `(${data.ddd_telefone_1}) ${data.telefone1}` : prev.telefone
      }));
    } catch (e) { console.error("Erro CNPJ"); }
    setLoadingCNPJ(false);
  };

  const formatCurrency = (val: any) => (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const cleanHtmlForPdf = (html: string) => {
    if (!html) return "";
    let text = html.replace(/<p>/g, "").replace(/<\/p>/g, "\n").replace(/<br>/g, "\n");
    text = text.replace(/<li>/g, "  • ").replace(/<\/li>/g, "\n");
    text = text.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ");
    return text.trim();
  };

  const gerarPDFPremium = (item: any) => {
    const doc = new jsPDF();
    const verdeEscuro: [number, number, number] = [20, 83, 45];
    const verdeMedio: [number, number, number] = [34, 139, 34];
    const cinzaSuave: [number, number, number] = [243, 244, 246];
    const textoCinza: [number, number, number] = [60, 60, 60];

    try { doc.addImage("/logo.jpg", "JPEG", 20, 10, 40, 20); } catch (e) {}
    doc.setFont("helvetica", "bold"); doc.setFontSize(24);
    doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
    doc.text("PROPOSTA COMERCIAL", 190, 22, { align: 'right' });
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(120);
    doc.text("YellowLeaf – Nutraceuticals Company", 190, 28, { align: 'right' });
    doc.setFillColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
    doc.rect(0, 35, 210, 2, 'F');

    doc.setFillColor(cinzaSuave[0], cinzaSuave[1], cinzaSuave[2]);
    doc.rect(20, 45, 170, 25, 'F');
    doc.setDrawColor(220); doc.rect(20, 45, 170, 25, 'S');
    doc.setFontSize(11); doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
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

    autoTable(doc, {
      startY: 88, margin: { left: 20, right: 20 },
      head: [['DESCRIÇÃO', 'VALORES']],
      body: [
        ['Ativo/Insumo', item.produto || 'Insumo'],
        ['Preço por grama (Tabela)', formatCurrency(item.valor_g_tabela)],
        ['Quantidade proposta', `${item.kg_proposto} kg`],
        ['Quantidade bonificada', `${item.kg_bonificado} kg`],
        ['Investimento Total', { content: formatCurrency(item.valor), styles: { fontStyle: 'bold' } }],
        ['Valor do grama c/ bonificação', { content: formatCurrency(vGramaReal), styles: { fontStyle: 'bold', textColor: textoCinza } }],
        ['Condição de Pagamento', `${item.parcelas} parcelas de ${formatCurrency(vParc)}`],
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
      head: [['ANÁLISE TÉCNICA DE RETORNO (PAYBACK)', 'ESTIMATIVA']],
      body: [
        ['Custo por fórmula (Manipulado)', formatCurrency(custoF)],
        ['Sugestão de Venda (Fator 5)', formatCurrency(precoV)],
        [{ content: 'META DE VIABILIDADE (Ponto de Equilíbrio)', styles: { fontStyle: 'bold', fontSize: 11 } }, { content: `${formulasDia.toFixed(2)} fórmulas/dia`, styles: { fontStyle: 'bold', textColor: verdeMedio, fontSize: 12, halign: 'right' } }]
      ],
      theme: 'grid',
      headStyles: { fillColor: verdeEscuro, textColor: 255, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 10, cellPadding: 2, textColor: textoCinza },
      columnStyles: { 0: { cellWidth: 110 }, 1: { halign: 'right' } }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 12; 
    if (item.observacoes_proposta) {
      doc.setFontSize(11); doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]); doc.setFont("helvetica", "bold");
      doc.text("NOTAS E CONDIÇÕES COMERCIAIS:", 20, currentY);
      currentY += 6; doc.setFontSize(9); doc.setTextColor(textoCinza[0], textoCinza[1], textoCinza[2]); doc.setFont("helvetica", "normal");
      const notasTexto = cleanHtmlForPdf(item.observacoes_proposta);
      const splitText = doc.splitTextToSize(notasTexto, 170);
      const limitedText = splitText.slice(0, 3);
      doc.text(limitedText, 20, currentY);
      currentY += (limitedText.length * 5) + 5; 
    }

    const certY = currentY + 5;
    doc.setFontSize(12); doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]); doc.setFont("helvetica", "bold");
    doc.text("QUALIDADE E PRODUÇÃO CERTIFICADA", 105, certY, { align: 'center' });
    doc.setFontSize(9); doc.setTextColor(textoCinza[0], textoCinza[1], textoCinza[2]); doc.setFont("helvetica", "normal");
    const certText = "Nossos parceiros industriais operam sob os mais rigorosos padrões internacionais de qualidade, com produção auditada assegurando rastreabilidade e alto desempenho dos ativos.";
    doc.text(doc.splitTextToSize(certText, 160), 105, certY + 6, { align: 'center' });

    try {
      const imgW = 100; const imgH = 20; const xPos = (210 - imgW) / 2;
      doc.addImage("/selo.jpg", "JPEG", xPos, certY + 16, imgW, imgH);
    } catch (e) { doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.text("SELOS: HACCP • ISO • GMP", 105, certY + 22, { align: 'center' }); }

    const fY = 285; doc.setFontSize(7); doc.setTextColor(150);
    doc.text("YELLOW LEAF IMPORTAÇÃO E EXPORTAÇÃO LTDA | CNPJ: 45.643.261/0001-68", 20, fY);
    doc.text("www.yellowleaf.com.br | @yellowleafnutraceuticals", 20, fY + 4);
    doc.text("Dionatan Hoegen - Representante Comercial", 190, fY, { align: 'right' });
    doc.text(`WhatsApp: (44) 99102-7642 | @dionatan.magistral`, 190, fY + 4, { align: 'right' });

    doc.save(`Proposta Comercial - ${item.nome_cliente}.pdf`);
  };

  const handleSave = async () => {
    if (!formData.nome_cliente) return alert("Preencha a Razão Social.");
    const { data: { user } } = await supabase.auth.getUser();
    
    // TRATAMENTO DOS DADOS PARA O BANCO (FIX DATA ERROR)
    const payload = {
      ...formData,
      user_id: user?.id,
      valor: parseFloat(String(formData.valor).replace(',', '.')) || 0,
      valor_g_tabela: parseFloat(String(formData.valor_g_tabela).replace(',', '.')) || 0,
      kg_proposto: parseFloat(String(formData.kg_proposto)) || 0,
      kg_bonificado: parseFloat(String(formData.kg_bonificado)) || 0,
      parcelas: parseInt(String(formData.parcelas)) || 1,
      dias_primeira_parcela: parseInt(String(formData.dias_primeira_parcela)) || 45,
      data_lembrete: (formData.data_lembrete && formData.data_lembrete !== "") ? formData.data_lembrete : null,
      data_entrada: formData.data_entrada || new Date().toISOString().split('T')[0]
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

  return (
    <div className="w-full p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-[#1e293b] italic uppercase tracking-tighter">Pipeline YellowLeaf</h1>
        <button onClick={() => { setEditingOp(null); setFormData({cnpj: '', nome_cliente: '', contato: '', telefone: '', email: '', produto: '', aplicacao: '', valor: '', data_entrada: new Date().toISOString().split('T')[0], status: 'prospeccao', data_lembrete: '', observacoes: '', kg_proposto: '1', kg_bonificado: '0', parcelas: '1', dias_primeira_parcela: '45', peso_formula_g: '13.2', fator_lucro: '5', cidade_exclusividade: '', uf_exclusividade: '', observacoes_proposta: '', valor_g_tabela: '0'}); setModalOpen(true); }} className="bg-[#2563eb] text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition active:scale-95">+ Nova Oportunidade</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 h-[calc(100vh-180px)] overflow-x-auto pb-4">
        {ESTAGIOS.map(est => (
          <div key={est.id} className="bg-slate-50/50 rounded-2xl border flex flex-col min-w-[250px] overflow-hidden">
            <div className={`p-4 border-b-2 ${est.color} bg-white flex justify-between items-center`}><h3 className={`font-black text-xs uppercase ${est.text}`}>{est.label}</h3></div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {oportunidades.filter(o => o.status === est.id).map(op => (
                <div key={op.id} onClick={() => { setEditingOp(op); setFormData(op); setModalOpen(true); }} className="bg-white p-4 rounded-xl border border-slate-100 cursor-pointer hover:border-blue-400 shadow-sm transition">
                  <h4 className="font-bold text-slate-700 text-sm uppercase truncate">{op.nome_cliente}</h4>
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-bold">{op.produto}</span>
                    <span className="text-xs font-black text-slate-600">{formatCurrency(op.valor)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95">
            <div className="bg-[#242f3e] p-6 flex justify-between items-center text-white shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">✨ {editingOp ? 'Editar Oportunidade' : 'Nova Oportunidade'}</h2>
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
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">CNPJ</label><div className="flex gap-2"><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} onBlur={buscarDadosCNPJ}/><button onClick={buscarDadosCNPJ} className="bg-blue-50 text-blue-600 p-3 rounded-xl border"><Search size={20}/></button></div></div>
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Razão Social</label><input className="w-full bg-slate-50 border rounded-xl p-3 font-bold uppercase" value={formData.nome_cliente} onChange={e => setFormData({...formData, nome_cliente: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Cidade</label><input className="w-full bg-slate-100 border rounded-xl p-3" value={formData.cidade_exclusividade} readOnly/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">UF</label><input className="w-full bg-slate-100 border rounded-xl p-3" value={formData.uf_exclusividade} readOnly/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Contato</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.contato} onChange={e => setFormData({...formData, contato: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})}/></div>

              <div className="md:col-span-4 border-b pb-2 mt-4"><h3 className="text-[10px] font-black text-green-600 uppercase">2. Proposta e Payback</h3></div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Ativo (Sincronizado com Exclusividades)</label>
                <select className="w-full bg-slate-50 border rounded-xl p-3 font-bold" value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})}>
                  <option value="">Selecione um ativo...</option>
                  {produtosFiltrados.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Valor G (Tabela)</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.valor_g_tabela} onChange={e => setFormData({...formData, valor_g_tabela: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">KG Proposto</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.kg_proposto} onChange={e => setFormData({...formData, kg_proposto: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Investimento Total R$</label><input className="w-full bg-slate-100 border text-slate-600 rounded-xl p-3 font-bold" value={formData.valor} readOnly /></div>
              
              <div className="md:col-span-4 bg-blue-50/20 p-4 rounded-2xl border border-blue-100">
                  <label className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2 mb-2"><StickyNote size={14}/> Notas e Condições (Máx 3 linhas)</label>
                  <div className="bg-white rounded-xl overflow-hidden border border-blue-100 text-slate-700">
                    <ReactQuill theme="snow" value={formData.observacoes_proposta} onChange={(val) => setFormData({...formData, observacoes_proposta: val})} modules={{ toolbar: [['bold', 'italic', 'underline'], [{'list': 'ordered'}, {'list': 'bullet'}], ['clean']] }} />
                  </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end items-center shrink-0 gap-2">
              <button onClick={() => setModalOpen(false)} className="px-6 font-bold text-slate-400">CANCELAR</button>
              <button onClick={handleSave} className="bg-[#2563eb] text-white px-12 py-3 rounded-xl font-bold uppercase active:scale-95 transition">Salvar Dados</button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}