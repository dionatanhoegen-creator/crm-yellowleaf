"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { 
  Plus, Search, Calendar, User, Phone, DollarSign, 
  X, Briefcase, Tag, Beaker, MessageCircle, AlertCircle, Clock,
  CheckCircle2, Trash2, ShieldAlert, AlertTriangle, Loader2, StickyNote, FileText, Download, MapPin, Mail
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

const ESTAGIOS = [
  { id: 'prospeccao', label: 'Prospecção', color: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  { id: 'qualificacao', label: 'Qualificação', color: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  { id: 'apresentacao', label: 'Apresentação', color: 'border-pink-500', bg: 'bg-pink-50', text: 'text-pink-700' },
  { id: 'negociacao', label: 'Negociação', color: 'border-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  { id: 'fechado', label: 'Fechado', color: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  { id: 'perdido', label: 'Perdido', color: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700' },
];

const PRODUTOS_SUGESTAO = ["Allisane®", "Anethin®", "Anidream®", "ArtemiFresh®", "BioCarum®", "Cardasense®", "CarySlim®", "FIThymus®", "GF Slim II®", "Glutaliz®", "GraperLIP®", "Junipure®", "LipoArtich II®", "NobiLIP®", "Noble Skin®", "Nutberry Slim®", "Nutmeg B12®", "OriganLIP®", "Pepper PRO®", "Powder Lymp II®", "Purin 7®", "R-GEN2®", "ReduCINN®", "Reichi UP II ®", "Sinensis Lean II ®", "Sineredux II ®", "SlimHaut®", "TarhunLIP®", "Taurymus®", "TBooster®", "VerumFEM®"];

export default function PipelinePage() {
  const supabase = createClientComponentClient();
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<any>(null);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // FORMULÁRIO COM ACRÉSCIMOS TÉCNICOS
  const [formData, setFormData] = useState({
    cnpj: '', nomeCliente: '', contato: '', telefone: '', email: '', produto: '',
    aplicacao: '', valor: '', dataEntrada: new Date().toISOString().split('T')[0],
    estagio: 'prospeccao', dataLembrete: '', observacoes: '',
    kg_proposto: '1', kg_bonificado: '0', parcelas: '1', peso_formula_g: '1',
    fator_lucro: '5', cidade_exclusividade: ''
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

  // GERADOR DE PDF CUSTOMIZADO
  const gerarPDF = (item: any) => {
    const doc = new jsPDF();
    const verdeYellow = [20, 83, 45];

    // Cabeçalho Profissional
    doc.setFontSize(22);
    doc.setTextColor(verdeYellow[0], verdeYellow[1], verdeYellow[2]);
    doc.text("YELLOWLEAF", 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("PROPOSTA DE PARCERIA COMERCIAL", 105, 26, { align: 'center' });
    doc.line(20, 35, 190, 35);

    // Identificação (Puxando Razão Social conforme solicitado)
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("DADOS DO PARCEIRO", 20, 45);
    doc.setFontSize(10);
    doc.text(`Farmácia: ${item.nomeCliente || 'A definir'}`, 20, 52);
    doc.text(`Aos Cuidados: ${item.contato || 'Responsável'}`, 20, 57);
    doc.text(`Cidade/Exclusividade: ${item.cidade_exclusividade || 'A definir'}`, 20, 62);

    // Cálculos de Investimento
    const totalKG = Number(item.kg_proposto) + Number(item.kg_bonificado);
    const valorGramaReal = (Number(item.valor) / (totalKG * 1000)).toFixed(2);
    const custoFormula = (Number(valorGramaReal) * Number(item.peso_formula_g)).toFixed(2);
    const precoVenda = (Number(custoFormula) * Number(item.fator_lucro)).toFixed(2);
    const formulasDia = (((Number(item.valor)/Number(item.parcelas)) / Number(precoVenda)) / 22).toFixed(2);

    autoTable(doc, {
      startY: 75,
      head: [['ESPECIFICAÇÃO', 'VALORES']],
      body: [
        ['Ativo Proposto', item.produto || 'Geral'],
        ['Quantidade (KG)', `${item.kg_proposto} KG + ${item.kg_bonificado} KG Bônus`],
        ['Investimento Total', `R$ ${Number(item.valor).toLocaleString('pt-BR')}`],
        ['Condição', `${item.parcelas}x de R$ ${(Number(item.valor)/Number(item.parcelas)).toLocaleString('pt-BR')}`],
        ['Valor por Grama (Efetivo)', `R$ ${valorGramaReal}`]
      ],
      headStyles: { fillColor: verdeYellow }
    });

    // Payback Table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['ANÁLISE DE PAYBACK (RETORNO)', 'RESULTADO']],
      body: [
        ['Custo por fórmula (Manipulado)', `R$ ${custoFormula}`],
        ['Sugestão de Venda (Consumidor)', `R$ ${precoVenda}`],
        ['Vendas p/ pagar investimento', `${formulasDia} fórmulas/dia`]
      ],
      headStyles: { fillColor: [37, 99, 235] }
    });

    // Rodapé Assimétrico
    const footerY = 275;
    doc.setFontSize(7);
    doc.setTextColor(150);
    // Esquerda: YellowLeaf
    doc.text("YELLOW LEAF IMPORTAÇÃO E EXPORTAÇÃO LTDA | 45.643.261/0001-68", 20, footerY);
    doc.text("Av. Moaci, 395 - CJ 132 - São Paulo/SP | 0800 000 1560", 20, footerY + 4);
    doc.text("www.yellowleaf.com.br | @yellowleafnutraceuticals", 20, footerY + 8);
    // Direita: Dionatan
    doc.text("Dionatan Hoegen - Representante Comercial", 190, footerY, { align: 'right' });
    doc.text("WhatsApp: (44) 99102-7642", 190, footerY + 4, { align: 'right' });
    doc.text("@dionatan.magistral", 190, footerY + 8, { align: 'right' });

    doc.save(`Proposta_YellowLeaf_${item.nomeCliente}.pdf`);
  };

  const buscarDadosCNPJ = async () => {
    const cnpjLimpo = formData.cnpj?.replace(/\D/g, '');
    if (cnpjLimpo?.length !== 14) return;
    setLoadingCNPJ(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      const data = await res.json();
      const tel = data.ddd_telefone_1 && data.telefone1 ? `(${data.ddd_telefone_1}) ${data.telefone1}` : formData.telefone;
      setFormData(prev => ({ ...prev, nomeCliente: data.nome_fantasia || data.razao_social || '', telefone: tel, email: data.email || prev.email }));
    } catch (e) { console.error("Erro CNPJ"); }
    setLoadingCNPJ(false);
  };

  const handleSave = async () => {
    if (!formData.nomeCliente || !formData.valor) return alert("Preencha Nome e Valor.");
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      ...formData, user_id: user?.id, valor: parseFloat(String(formData.valor).replace(',', '.')), status: formData.estagio
    };
    const { error } = editingOp ? await supabase.from('pipeline').update(payload).eq('id', editingOp.id) : await supabase.from('pipeline').insert(payload);
    if (!error) { setModalOpen(false); carregarOportunidades(); }
  };

  const deleteOportunidade = async () => {
    if (editingOp) { await supabase.from('pipeline').delete().eq('id', editingOp.id); carregarOportunidades(); setModalOpen(false); setConfirmDelete(false); }
  };

  const isAtrasado = (data?: string) => { if (!data) return false; return new Date(data) < new Date(new Date().setHours(0,0,0,0)); };

  return (
    <div className="w-full p-4">
      <div className="flex justify-between items-center mb-6 pt-4">
        <h1 className="text-2xl font-black text-[#1e293b] italic uppercase tracking-tighter">Pipeline YellowLeaf</h1>
        <button onClick={() => { setEditingOp(null); setFormData({ cnpj: '', nomeCliente: '', contato: '', telefone: '', email: '', produto: '', aplicacao: '', valor: '', dataEntrada: new Date().toISOString().split('T')[0], estagio: 'prospeccao', dataLembrete: '', observacoes: '', kg_proposto: '1', kg_bonificado: '0', parcelas: '1', peso_formula_g: '1', fator_lucro: '5', cidade_exclusividade: '' }); setModalOpen(true); }} className="bg-[#2563eb] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md">+ Nova Oportunidade</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 h-[calc(100vh-180px)] overflow-x-auto pb-4">
        {ESTAGIOS.map(est => (
          <div key={est.id} className="bg-slate-50/50 rounded-2xl border border-slate-200 flex flex-col min-w-[250px] overflow-hidden">
            <div className={`p-4 border-b-2 ${est.color} bg-white flex justify-between items-center`}>
              <div><h3 className={`font-black text-xs uppercase ${est.text}`}>{est.label}</h3><p className="text-[10px] text-slate-400 font-bold">R$ {oportunidades.filter(o => o.status === est.id).reduce((a, b) => a + Number(b.valor), 0).toLocaleString('pt-BR')}</p></div>
              <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{oportunidades.filter(o => o.status === est.id).length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {oportunidades.filter(o => o.status === est.id).map(op => (
                <div key={op.id} onClick={() => { setEditingOp(op); setFormData({ ...op, estagio: op.status }); setModalOpen(true); }} 
                  className={`bg-white p-4 rounded-xl shadow-sm border-2 transition-all cursor-pointer relative ${isAtrasado(op.data_lembrete) && op.status !== 'fechado' ? 'border-red-500 animate-pulse shadow-red-50' : 'border-slate-50 hover:border-blue-400'}`}>
                  {isAtrasado(op.data_lembrete) && op.status !== 'fechado' && <AlertCircle size={14} className="absolute top-2 right-2 text-red-500" />}
                  <h4 className="font-bold text-slate-700 text-sm uppercase truncate">{op.nome_cliente}</h4>
                  <div className="flex justify-between items-end mt-2"><span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-bold">{op.produto || 'Geral'}</span><span className="text-xs font-black text-slate-600">R$ {op.valor?.toLocaleString('pt-BR')}</span></div>
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
              <h2 className="text-lg font-bold flex items-center gap-2">✨ {editingOp ? 'Editar Proposta' : 'Nova Oportunidade'}</h2>
              <div className="flex gap-2">
                {editingOp && <button onClick={() => gerarPDF(formData)} className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition shadow-md"><Download size={14}/> PDF</button>}
                <button onClick={() => setModalOpen(false)} className="hover:bg-white/10 p-1 rounded-full"><X/></button>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-5 overflow-y-auto bg-white flex-1">
              <div className="md:col-span-3 border-b pb-2"><h3 className="text-[10px] font-black text-blue-600 uppercase">1. Dados da Farmácia</h3></div>
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">CNPJ</label>
              <div className="flex gap-2"><input className="w-full bg-slate-50 border rounded-xl p-3 font-mono text-sm" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} onBlur={buscarDadosCNPJ}/><button onClick={buscarDadosCNPJ} className="bg-blue-50 text-blue-600 p-3 rounded-xl border border-blue-100"><Search size={20}/></button></div></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Cidade Exclusividade</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.cidade_exclusividade} onChange={e => setFormData({...formData, cidade_exclusividade: e.target.value})} placeholder="Ex: Assis/SP"/></div>
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Razão Social / Nome Fantasia</label><input className="w-full bg-slate-50 border rounded-xl p-3 font-bold uppercase" value={formData.nomeCliente} onChange={e => setFormData({...formData, nomeCliente: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">A/C (Contato)</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.contato} onChange={e => setFormData({...formData, contato: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})}/></div>
              <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">E-mail Comercial</label><input className="w-full bg-slate-50 border rounded-xl p-3" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/></div>

              <div className="md:col-span-3 border-b pb-2 mt-4"><h3 className="text-[10px] font-black text-green-600 uppercase">2. Proposta Técnica e Payback</h3></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Ativo</label><input list="p" className="w-full bg-slate-50 border rounded-xl p-3 font-bold" value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})}/><datalist id="p">{PRODUTOS_SUGESTAO.map(p => <option key={p} value={p}/>)}</datalist></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">KG Proposto</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.kg_proposto} onChange={e => setFormData({...formData, kg_proposto: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">KG Bonificado</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.kg_bonificado} onChange={e => setFormData({...formData, kg_bonificado: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Investimento Total R$</label><input type="number" className="w-full bg-green-50 border-green-200 border rounded-xl p-3 font-black text-green-700" value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Parcelas</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.parcelas} onChange={e => setFormData({...formData, parcelas: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Peso da Fórmula (g)</label><input type="number" className="w-full bg-slate-50 border rounded-xl p-3" value={formData.peso_formula_g} onChange={e => setFormData({...formData, peso_formula_g: e.target.value})}/></div>

              <div className="md:col-span-2 border-t pt-4 grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-slate-400 uppercase">Fase Atual</label><select className="w-full bg-white border rounded-xl p-3 font-bold" value={formData.estagio} onChange={e => setFormData({...formData, estagio: e.target.value as any})}>{ESTAGIOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</select></div>
                <div><label className="text-[10px] font-bold text-orange-500 uppercase">Lembrete</label><input type="date" className="w-full bg-orange-50 border-orange-200 border rounded-xl p-3 font-bold" value={formData.dataLembrete} onChange={e => setFormData({...formData, dataLembrete: e.target.value})}/></div>
              </div>

              <div className="md:col-span-3 bg-blue-50/30 p-4 rounded-2xl border border-blue-100">
                  <label className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2 mb-2"><StickyNote size={14}/> Notas Estratégicas</label>
                  <textarea rows={2} className="w-full bg-white border border-blue-100 rounded-xl p-3 text-sm outline-none" placeholder="Anote aqui as condições especiais..." value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})}/>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
              {editingOp ? <button onClick={() => setConfirmDelete(true)} className="text-red-500 font-bold text-xs uppercase">Excluir</button> : <div/>}
              <div className="flex gap-2"><button onClick={() => setModalOpen(false)} className="px-6 font-bold text-slate-400">Cancelar</button><button onClick={handleSave} className="bg-[#2563eb] text-white px-10 py-3 rounded-xl font-bold shadow-lg uppercase">Salvar no CRM</button></div>
            </div>
          </div>
        </div>, document.body
      )}

      {confirmDelete && mounted && createPortal(<div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"><div className="bg-white w-full max-w-sm rounded-2xl p-8 text-center shadow-2xl"><AlertTriangle size={48} className="text-red-500 mx-auto mb-4"/><h3 className="text-lg font-bold text-slate-800">Deseja excluir?</h3><div className="flex gap-3 mt-8"><button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 border rounded-xl font-bold text-slate-500">Não</button><button onClick={deleteOportunidade} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Sim, Excluir</button></div></div></div>, document.body)}
    </div>
  );
}