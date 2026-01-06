"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { 
  Plus, Search, Calendar, User, Phone, DollarSign, 
  X, Tag, Beaker, MessageCircle, AlertCircle, 
  CheckCircle2, Trash2, Loader2, StickyNote, Download, MapPin, Mail, Instagram, ShieldCheck
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const [formData, setFormData] = useState({
    cnpj: '', nomeCliente: '', contato: '', telefone: '', email: '', produto: '',
    aplicacao: '', valor: '', dataEntrada: new Date().toISOString().split('T')[0],
    estagio: 'prospeccao', dataLembrete: '', observacoes: '',
    kg_proposto: '1', kg_bonificado: '0', parcelas: '1', dias_primeira_parcela: '45',
    peso_formula_g: '1', fator_lucro: '5', cidade: '', uf: '', observacoes_proposta: ''
  });

  useEffect(() => { setMounted(true); carregarOportunidades(); }, []);

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
        nomeCliente: data.nome_fantasia || data.razao_social || '',
        cidade: data.municipio || '',
        uf: data.uf || '',
        telefone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1}) ${data.telefone1}` : prev.telefone
      }));
    } catch (e) { console.error("Erro CNPJ"); }
    setLoadingCNPJ(false);
  };

  const gerarPDF = (item: any) => {
    const doc = new jsPDF();
    const verdeYellow = [20, 83, 45];
    const dataAtual = new Date();

    // 1. Cabeçalho
    doc.setFontSize(22);
    doc.setTextColor(verdeYellow[0], verdeYellow[1], verdeYellow[2]);
    doc.text("PROPOSTA COMERCIAL", 20, 25);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("YellowLeaf - Nutraceuticals Company", 20, 31);
    doc.line(20, 35, 190, 35);

    // 2. Dados do Cliente
    doc.setFontSize(11); doc.setTextColor(0); doc.text("IDENTIFICAÇÃO DO CLIENTE", 20, 45);
    doc.setFontSize(10);
    doc.text(`Cliente: ${item.nomeCliente}`, 20, 52);
    doc.text(`Contato: ${item.contato} | Tel: ${item.telefone}`, 20, 57);
    doc.text(`Localidade: ${item.cidade} / ${item.uf}`, 20, 62);

    // 3. Tabela de Investimento
    const totalKG = Number(item.kg_proposto) + Number(item.kg_bonificado);
    const vGrama = (Number(item.valor) / (totalKG * 1000)).toFixed(2);
    const vParcela = Number(item.valor) / Number(item.parcelas);

    autoTable(doc, {
      startY: 70,
      head: [['ESPECIFICAÇÃO TÉCNICA', 'DADOS']],
      body: [
        ['Ativo Proposto', item.produto || 'Geral'],
        ['Quantidade KG', `${item.kg_proposto} KG + ${item.kg_bonificado} KG Bônus`],
        ['Investimento Total', `R$ ${Number(item.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`],
        ['Condição de Pagamento', `${item.parcelas} parcelas de R$ ${vParcela.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`]
      ],
      headStyles: { fillColor: verdeYellow }
    });

    // 4. Cronograma de Pagamento Automático
    let cronograma = [];
    for(let i=0; i < Number(item.parcelas); i++) {
      const dataParc = new Date();
      dataParc.setDate(dataParc.getDate() + Number(item.dias_primeira_parcela) + (i * 30));
      cronograma.push([`Parcela ${i+1}`, dataParc.toLocaleDateString('pt-BR'), `R$ ${vParcela.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`]);
    }

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['PROJEÇÃO DE VENCIMENTOS', 'DATA', 'VALOR']],
      body: cronograma,
      headStyles: { fillColor: [37, 99, 235] }
    });

    // 5. Apresentação YellowLeaf
    const currentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(11); doc.setTextColor(verdeYellow[0], verdeYellow[1], verdeYellow[2]);
    doc.text("DIFERENCIAIS YELLOWLEAF", 20, currentY);
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text("Nossa especialidade é ser diferente. Insumos com certificação internacional.", 20, currentY + 6);
    doc.text("SELOS DE QUALIDADE: HACCP | ISO 9001 | GMP | FSSC 22000", 20, currentY + 12);

    // 6. Observações da Proposta
    if (item.observacoes_proposta) {
      doc.text("OBSERVAÇÕES:", 20, currentY + 22);
      doc.text(doc.splitTextToSize(item.observacoes_proposta, 170), 20, currentY + 27);
    }

    // 7. Rodapé Assimétrico
    const fY = 275; doc.setFontSize(7); doc.setTextColor(150);
    doc.text("YELLOW LEAF IMPORTAÇÃO E EXPORTAÇÃO LTDA | CNPJ: 45.643.261/0001-68", 20, fY);
    doc.text("Av. Moaci, 395 - CJ 132 - São Paulo/SP | www.yellowleaf.com.br", 20, fY + 4);
    doc.text("Dionatan Hoegen - Representante Comercial", 190, fY, { align: 'right' });
    doc.text("WhatsApp: (44) 99102-7642 | @dionatan.magistral", 190, fY + 4, { align: 'right' });

    doc.save(`Proposta Comercial YellowLeaf - ${item.produto} - ${dataAtual.toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
  };

  const handleSave = async () => {
    if (!formData.nomeCliente || !formData.valor) return alert("Preencha Nome e Valor.");
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      user_id: user?.id, cnpj: formData.cnpj, nome_cliente: formData.nomeCliente, contato: formData.contato,
      telefone: formData.telefone, email: formData.email, produto: formData.produto, aplicacao: formData.aplicacao,
      valor: parseFloat(String(formData.valor)), status: formData.estagio, data_entrada: formData.dataEntrada,
      data_lembrete: formData.dataLembrete || null, observacoes: formData.observacoes,
      kg_proposto: Number(formData.kg_proposto), kg_bonificado: Number(formData.kg_bonificado),
      parcelas: Number(formData.parcelas), dias_primeira_parcela: Number(formData.dias_primeira_parcela),
      peso_formula_g: Number(formData.peso_formula_g), fator_lucro: Number(formData.fator_lucro),
      cidade_exclusividade: formData.cidade, uf_exclusividade: formData.uf, observacoes_proposta: formData.observacoes_proposta
    };

    const { error } = editingOp ? await supabase.from('pipeline').update(payload).eq('id', editingOp.id) : await supabase.from('pipeline').insert(payload);
    if (!error) { setModalOpen(false); carregarOportunidades(); } else { alert("Erro ao salvar. Verifique se rodou o SQL."); }
  };

  return (
    <div className="w-full p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-[#1e293b] italic uppercase tracking-tighter">Pipeline YellowLeaf</h1>
        <button onClick={() => { setEditingOp(null); setModalOpen(true); }} className="bg-[#2563eb] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition active:scale-95">+ Nova Oportunidade</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 h-[calc(100vh-180px)] overflow-x-auto pb-4">
        {ESTAGIOS.map(est => (
          <div key={est.id} className="bg-slate-50/50 rounded-2xl border border-slate-200 flex flex-col min-w-[250px] overflow-hidden">
            <div className={`p-4 border-b-2 ${est.color} bg-white flex justify-between items-center`}><h3 className={`font-black text-xs uppercase ${est.text}`}>{est.label}</h3></div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {oportunidades.filter(o => o.status === est.id).map(op => (
                <div key={op.id} onClick={() => { setEditingOp(op); setFormData({...op, estagio: op.status, cidade: op.cidade_exclusividade, uf: op.uf_exclusividade}); setModalOpen(true); }} className="bg-white p-4 rounded-xl border border-slate-100 cursor-pointer hover:border-blue-400">
                  <h4 className="font-bold text-slate-700 text-sm uppercase truncate">{op.nome_cliente}</h4>
                  <div className="flex justify-between items-end mt-2"><span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-bold">{op.produto}</span><span className="text-xs font-black text-slate-600">R$ {Number(op.valor).toLocaleString('pt-BR')}</span></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95">
            <div className="bg-[#242f3e] p-6 flex justify-between items-center text-white shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">✨ {editingOp ? 'Editar Proposta Comercial' : 'Nova Oportunidade'}</h2>
              <div className="flex gap-2">
                {editingOp && <button onClick={() => gerarPDF(formData)} className="bg-green-600 px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:scale-105 transition uppercase shadow-md"><Download size={14}/> Gerar PDF</button>}
                <button onClick={() => setModalOpen(false)}><X/></button>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-5 overflow-y-auto bg-white flex-1">
              <div className="md:col-span-4 border-b pb-2"><h3 className="text-[10px] font-black text-blue-600 uppercase">1. Identificação Comercial</h3></div>
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">CNPJ</label><div className="flex gap-2"><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} onBlur={buscarDadosCNPJ}/><button onClick={buscarDadosCNPJ} className="bg-blue-50 text-blue-600 p-3 rounded-xl border"><Search size={20}/></button></div></div>
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Razão / Fantasia</label><input className="w-full bg-slate-50 border rounded-xl p-3 font-bold uppercase" value={formData.nomeCliente} onChange={e => setFormData({...formData, nomeCliente: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Cidade</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.cidade} readOnly/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">UF</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.uf} readOnly/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Contato (A/C)</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.contato} onChange={e => setFormData({...formData, contato: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})}/></div>

              <div className="md:col-span-4 border-b pb-2 mt-4"><h3 className="text-[10px] font-black text-green-600 uppercase">2. Condições da Proposta</h3></div>
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Ativo</label><input className="w-full bg-slate-50 border rounded-xl p-3 font-bold" value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">KG Proposto</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.kg_proposto} onChange={e => setFormData({...formData, kg_proposto: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">KG Bônus</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.kg_bonificado} onChange={e => setFormData({...formData, kg_bonificado: e.target.value})}/></div>
              
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Valor Total R$</label><input type="number" className="w-full bg-green-50 border rounded-xl p-3 font-black text-green-700" value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Parcelas</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.parcelas} onChange={e => setFormData({...formData, parcelas: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Início (Dias)</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.dias_primeira_parcela} onChange={e => setFormData({...formData, dias_primeira_parcela: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Fator Lucro</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.fator_lucro} onChange={e => setFormData({...formData, fator_lucro: e.target.value})}/></div>

              <div className="md:col-span-4 bg-slate-50 p-4 rounded-2xl border">
                  <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-2"><StickyNote size={14}/> Observações Internas</label>
                  <textarea rows={2} className="w-full bg-white border rounded-xl p-3 text-sm" value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})}/>
              </div>
              <div className="md:col-span-4 bg-blue-50/20 p-4 rounded-2xl border border-blue-100">
                  <label className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2 mb-2"><FileText size={14}/> Condições que saem no PDF</label>
                  <textarea rows={2} className="w-full bg-white border border-blue-100 rounded-xl p-3 text-sm" value={formData.observacoes_proposta} onChange={e => setFormData({...formData, observacoes_proposta: e.target.value})} placeholder="Ex: Prazo de entrega de 5 dias úteis..."/>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
              {editingOp ? <button onClick={() => { if(confirm('Excluir?')) { supabase.from('pipeline').delete().eq('id', editingOp.id); carregarOportunidades(); setModalOpen(false); }}} className="text-red-500 font-bold text-xs uppercase">Excluir</button> : <div/>}
              <div className="flex gap-2"><button onClick={() => setModalOpen(false)} className="px-6 font-bold text-slate-400">CANCELAR</button><button onClick={handleSave} className="bg-[#2563eb] text-white px-12 py-3 rounded-xl font-bold shadow-lg uppercase tracking-widest active:scale-95 transition">Salvar</button></div>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}