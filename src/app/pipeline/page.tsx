"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { 
  Plus, Search, Calendar, User, Phone, DollarSign, 
  X, Tag, Beaker, MessageCircle, AlertCircle, 
  CheckCircle2, Trash2, Loader2, StickyNote, Download, MapPin, ShieldCheck
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- TABELA TÉCNICA OFICIAL ATUALIZADA (Imagem 055738) ---
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

  useEffect(() => { setMounted(true); carregarOportunidades(); }, []);

  useEffect(() => {
    if (TABELA_PRODUTOS[formData.produto]) {
      const p = TABELA_PRODUTOS[formData.produto];
      setFormData(prev => ({ 
        ...prev, 
        valor_g_tabela: p.preco_g.toFixed(2),
        peso_formula_g: p.peso.toString(),
        valor: (p.preco_g * 1000 * Number(prev.kg_proposto)).toFixed(2)
      }));
    }
  }, [formData.produto]);

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

  const formatCurrency = (val: any) => {
    return (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const gerarPDF = (item: any) => {
    const doc = new jsPDF();
    const vY = [20, 83, 45]; // Verde YellowLeaf
    doc.setFont("helvetica");

    // 1. Cabeçalho com Logo (puxando public/logo.jpg)
    try {
      doc.addImage("/logo.jpg", "JPEG", 150, 10, 40, 20);
    } catch (e) { console.warn("Logo não encontrada na pasta public"); }

    doc.setFontSize(22);
    doc.setTextColor(vY[0], vY[1], vY[2]);
    doc.text("PROPOSTA COMERCIAL", 20, 25);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("YellowLeaf - Nutraceuticals Company", 20, 31);
    doc.line(20, 35, 190, 35);

    // 2. DADOS DO CLIENTE
    doc.setFontSize(11); doc.setTextColor(0); doc.text("DADOS DO CLIENTE", 20, 45);
    doc.setFontSize(10);
    doc.text(`Razão Social: ${item.nome_cliente || 'N/A'}`, 20, 52);
    doc.text(`Contato: ${item.contato || 'N/A'}  |  Telefone: ${item.telefone || 'N/A'}`, 20, 57);
    doc.text(`Localidade: ${item.cidade_exclusividade || 'N/A'} / ${item.uf_exclusividade || ''}`, 20, 62);

    // 3. ESPECIFICAÇÃO DO INVESTIMENTO (Tabela separada conforme Imagem 3)
    const totalKG = Number(item.kg_proposto) + Number(item.kg_bonificado);
    const vGramaReal = (Number(item.valor) / (totalKG * 1000)) || 0;
    const vParc = (Number(item.valor) / Number(item.parcelas)) || 0;

    autoTable(doc, {
      startY: 70,
      head: [['ESPECIFICAÇÃO DO INVESTIMENTO', 'VALORES']],
      body: [
        ['Ativo/Insumo', item.produto || 'Ativo'],
        ['Preço por grama (Tabela)', formatCurrency(item.valor_g_tabela)],
        ['Quantidade proposta (kg)', `${item.kg_proposto} kg`],
        ['Quantidade bonificada (kg)', `${item.kg_bonificado} kg`],
        ['Investimento Total', formatCurrency(item.valor)],
        ['Valor do grama com bonificação aplicada (R$/g)', formatCurrency(vGramaReal)],
        ['Condição de Pagamento', `${item.parcelas} parcelas de ${formatCurrency(vParc)}`],
        ['Vencimento do primeiro pagamento', `${item.dias_primeira_parcela} dias`]
      ],
      headStyles: { fillColor: vY, fontStyle: 'bold' },
      theme: 'striped'
    });

    // 4. PAYBACK DA FÓRMULA
    const custoF = (vGramaReal * (Number(item.peso_formula_g) || 13.2));
    const precoV = (custoF * (Number(item.fator_lucro) || 5));
    const formulasDia = vParc > 0 ? ((vParc / precoV) / 22) : 0;

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['ANÁLISE TÉCNICA DE RETORNO (PAYBACK)', 'VALOR']],
      body: [
        ['Custo por fórmula (Manipulado)', formatCurrency(custoF)],
        ['Sugestão de Venda (Fator 5)', formatCurrency(precoV)],
        ['Vendas necessárias/dia para pagar parcela', `${formulasDia.toFixed(2)} fórmulas/dia`]
      ],
      headStyles: { fillColor: [37, 99, 235] }
    });

    // 5. DIFERENCIAIS INSTITUCIONAIS
    const curY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(11); doc.setTextColor(vY[0], vY[1], vY[2]);
    doc.text("QUALIDADE E PRODUÇÃO CERTIFICADA", 20, curY);
    doc.setFontSize(9); doc.setTextColor(80);
    const desc = "Contamos com um corpo técnico capacitado na validação de ativos fitoterápicos e extratos vegetais, com foco em pureza e eficácia. Nossos parceiros operam sob os mais rigorosos padrões internacionais.";
    doc.text(doc.splitTextToSize(desc, 170), 20, curY + 6);
    doc.setFontSize(9); doc.setTextColor(vY[0], vY[1], vY[2]);
    doc.text("CERTIFICAÇÕES: HACCP • ISO • FSSC 22000 • GMP", 20, curY + 20);

    if (item.observacoes_proposta) {
      doc.setTextColor(0);
      doc.text("NOTAS E CONDIÇÕES:", 20, curY + 30);
      doc.setFontSize(8); doc.setTextColor(100);
      doc.text(doc.splitTextToSize(item.observacoes_proposta, 170), 20, curY + 35);
    }

    // 6. Rodapé Assimétrico
    const fY = 282; doc.setFontSize(7); doc.setTextColor(150);
    // Esquerda: YellowLeaf
    doc.text("YELLOW LEAF IMPORTAÇÃO E EXPORTAÇÃO LTDA | CNPJ: 45.643.261/0001-68", 20, fY);
    doc.text("www.yellowleaf.com.br | @yellowleafnutraceuticals", 20, fY + 4);
    // Direita: Dionatan
    doc.text("Dionatan Hoegen - Representante Comercial", 190, fY, { align: 'right' });
    doc.text("WhatsApp: (44) 99102-7642 | @dionatan.magistral", 190, fY + 4, { align: 'right' });

    doc.save(`Proposta Comercial YellowLeaf - ${item.produto}.pdf`);
  };

  const handleSave = async () => {
    if (!formData.nome_cliente || !formData.valor) return alert("Preencha Razão Social e Valor.");
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      ...formData,
      user_id: user?.id,
      valor: parseFloat(String(formData.valor).replace(',', '.')),
      kg_proposto: Number(formData.kg_proposto),
      kg_bonificado: Number(formData.kg_bonificado),
      parcelas: Number(formData.parcelas)
    };
    const { error } = editingOp ? await supabase.from('pipeline').update(payload).eq('id', editingOp.id) : await supabase.from('pipeline').insert(payload);
    if (!error) { setModalOpen(false); carregarOportunidades(); } else { alert("Erro ao salvar."); }
  };

  return (
    <div className="w-full p-4">
      {/* Header oficial */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-[#1e293b] italic uppercase tracking-tighter">Pipeline YellowLeaf</h1>
        <button onClick={() => { setEditingOp(null); setFormData({...formData, cnpj: '', nome_cliente: '', contato: '', telefone: '', email: '', produto: '', valor: '', status: 'prospeccao'}); setModalOpen(true); }} className="bg-[#2563eb] text-white px-6 py-2.5 rounded-xl font-bold">+ Nova Oportunidade</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 h-[calc(100vh-180px)] overflow-x-auto pb-4">
        {ESTAGIOS.map(est => (
          <div key={est.id} className="bg-slate-50/50 rounded-2xl border flex flex-col min-w-[250px] overflow-hidden">
            <div className={`p-4 border-b-2 ${est.color} bg-white flex justify-between items-center`}><h3 className={`font-black text-xs uppercase ${est.text}`}>{est.label}</h3></div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {oportunidades.filter(o => o.status === est.id).map(op => (
                <div key={op.id} onClick={() => { setEditingOp(op); setFormData(op); setModalOpen(true); }} className="bg-white p-4 rounded-xl border hover:border-blue-400 cursor-pointer shadow-sm">
                  <h4 className="font-bold text-slate-700 text-sm uppercase truncate">{op.nome_cliente}</h4>
                  <div className="flex justify-between mt-2"><span className="text-[10px] text-blue-600 font-bold">{op.produto}</span><span className="text-xs font-black">{formatCurrency(op.valor)}</span></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && createPortal(
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
            <div className="bg-[#242f3e] p-6 flex justify-between items-center text-white shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">✨ {editingOp ? 'Editar Proposta' : 'Nova Oportunidade'}</h2>
              <div className="flex gap-2">
                {editingOp && <button onClick={() => gerarPDF(formData)} className="bg-green-600 px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:scale-105 transition uppercase shadow-md"><Download size={14}/> PDF</button>}
                <button onClick={() => setModalOpen(false)}><X/></button>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-5 overflow-y-auto bg-white flex-1">
              <div className="md:col-span-4 border-b pb-2"><h3 className="text-[10px] font-black text-blue-600 uppercase">1. Identificação Técnica</h3></div>
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">CNPJ</label><div className="flex gap-2"><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} onBlur={buscarDadosCNPJ}/><button onClick={buscarDadosCNPJ} className="bg-blue-50 text-blue-600 p-3 rounded-xl border"><Search size={20}/></button></div></div>
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Razão Social</label><input className="w-full bg-slate-50 border rounded-xl p-3 font-bold uppercase" value={formData.nome_cliente} onChange={e => setFormData({...formData, nome_cliente: e.target.value})}/></div>
              
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Cidade</label><input className="w-full bg-slate-100 border rounded-xl p-3" value={formData.cidade_exclusividade} readOnly/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">UF</label><input className="w-full bg-slate-100 border rounded-xl p-3" value={formData.uf_exclusividade} readOnly/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Contato</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.contato} onChange={e => setFormData({...formData, contato: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})}/></div>

              <div className="md:col-span-4 border-b pb-2 mt-4"><h3 className="text-[10px] font-black text-green-600 uppercase">2. Proposta de Investimento</h3></div>
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Ativo</label><select className="w-full bg-slate-50 border rounded-xl p-3 font-bold" value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})}><option value="">Selecione...</option>{Object.keys(TABELA_PRODUTOS).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Valor do G (Tabela)</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.valor_g_tabela} onChange={e => setFormData({...formData, valor_g_tabela: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">KG Proposto</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.kg_proposto} onChange={e => setFormData({...formData, kg_proposto: e.target.value})}/></div>
              
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Investimento Total R$</label><input className="w-full bg-green-50 border-green-200 border rounded-xl p-3 font-black text-green-700" value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">KG Bônus</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.kg_bonificado} onChange={e => setFormData({...formData, kg_bonificado: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Parcelas</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.parcelas} onChange={e => setFormData({...formData, parcelas: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Venc. 1ª Parcela (Dias)</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.dias_primeira_parcela} onChange={e => setFormData({...formData, dias_primeira_parcela: e.target.value})}/></div>

              <div className="md:col-span-4 bg-blue-50/20 p-4 rounded-2xl border border-blue-100">
                  <label className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2 mb-2"><StickyNote size={14}/> Notas Estratégicas (PDF)</label>
                  <textarea rows={2} className="w-full bg-white border border-blue-100 rounded-xl p-3 text-sm outline-none" value={formData.observacoes_proposta} onChange={e => setFormData({...formData, observacoes_proposta: e.target.value})}/>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
              {editingOp ? <button onClick={() => { if(confirm('Excluir?')) { supabase.from('pipeline').delete().eq('id', editingOp.id); carregarOportunidades(); setModalOpen(false); }}} className="text-red-500 font-bold text-xs uppercase">Excluir</button> : <div/>}
              <div className="flex gap-2">
                <button onClick={() => setModalOpen(false)} className="px-6 font-bold text-slate-400">CANCELAR</button>
                <button onClick={handleSave} className="bg-[#2563eb] text-white px-12 py-3 rounded-xl font-bold shadow-lg uppercase tracking-widest transition">Salvar</button>
              </div>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}