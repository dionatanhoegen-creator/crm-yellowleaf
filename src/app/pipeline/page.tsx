"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Search,
  Calendar,
  User,
  Beaker,
  Tag,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const API_URL =
  "https://script.google.com/macros/s/AKfycbzHIwreq_eM4TYwGTlpV_zEZwFgK0CxApBjMMSqkzaTVPkyz5R42fM-qc9aMLpzKGSz/exec";

// =====================
// TIPOS
// =====================
interface Oportunidade {
  id: string;
  cnpj: string;
  nomeCliente: string;
  contato: string;
  telefone: string;
  produto: string;
  aplicacao: string;
  valor: number;
  dataEntrada: string;
  dataLembrete?: string;
  estagio:
    | "prospeccao"
    | "qualificacao"
    | "apresentacao"
    | "negociacao"
    | "fechado"
    | "perdido";
  motivoPerda?: string;
  responsavel: string;
  clienteJaCadastrado?: boolean;
}

// =====================
// CONSTANTES
// =====================
const ESTAGIOS = [
  { id: "prospeccao", label: "Prospecção", color: "border-blue-500" },
  { id: "qualificacao", label: "Qualificação", color: "border-purple-500" },
  { id: "apresentacao", label: "Apresentação", color: "border-pink-500" },
  { id: "negociacao", label: "Negociação", color: "border-yellow-500" },
  { id: "fechado", label: "Fechado", color: "border-green-500" },
  { id: "perdido", label: "Perdido", color: "border-red-500" },
];

const MOTIVOS_PERDA = [
  "Preço alto",
  "Fechou com concorrente",
  "Sem estoque",
  "Projeto cancelado",
  "Cliente parou de responder",
  "Outros",
];

// =====================
// COMPONENTE
// =====================
export default function PipelinePage() {
  const supabase = createClientComponentClient();

  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<Oportunidade | null>(null);
  const [formData, setFormData] = useState<Partial<Oportunidade>>({
    estagio: "prospeccao",
    dataEntrada: new Date().toISOString().split("T")[0],
  });

  const [toast, setToast] = useState<{
    show: boolean;
    msg: string;
    type: "success" | "error" | "warning";
  }>({ show: false, msg: "", type: "success" });

  const [erroBloqueio, setErroBloqueio] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // =====================
  // LOAD
  // =====================
  useEffect(() => {
    setMounted(true);
    carregarOportunidades();
  }, []);

  const carregarOportunidades = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("pipeline")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setOportunidades(
        data.map((item: any) => ({
          id: item.id,
          cnpj: item.cnpj,
          nomeCliente: item.nome_cliente,
          contato: item.contato,
          telefone: item.telefone,
          produto: item.produto,
          aplicacao: item.aplicacao,
          valor: item.valor,
          dataEntrada: item.data_entrada,
          dataLembrete: item.data_lembrete,
          estagio: item.status,
          motivoPerda: item.motivo_perda,
          responsavel: "",
        }))
      );
    }

    setLoading(false);
  };

  const showToast = (
    msg: string,
    type: "success" | "error" | "warning" = "success"
  ) => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000);
  };

  // =====================
  // SAVE
  // =====================
  const handleSave = async () => {
    if (!formData.nomeCliente) {
      showToast("Nome do cliente obrigatório", "warning");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      cnpj: formData.cnpj,
      nome_cliente: formData.nomeCliente,
      contato: formData.contato,
      telefone: formData.telefone,
      produto: formData.produto,
      aplicacao: formData.aplicacao,
      valor: formData.valor || 0,
      status: formData.estagio,
      data_entrada: formData.dataEntrada,
      data_lembrete: formData.dataLembrete,
      motivo_perda: formData.motivoPerda,
    };

    if (editingOp) {
      await supabase.from("pipeline").update(payload).eq("id", editingOp.id);
      showToast("Oportunidade atualizada");
    } else {
      await supabase.from("pipeline").insert(payload);
      showToast("Oportunidade criada");
    }

    setModalOpen(false);
    carregarOportunidades();
  };

  // =====================
  // UI
  // =====================
  return (
    <div className="w-full p-4">
      {toast.show &&
        mounted &&
        createPortal(
          <div className="fixed top-5 right-5 z-[100000] bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex gap-3">
            <CheckCircle2 />
            <div>
              <p className="font-bold">Aviso</p>
              <p className="text-sm">{toast.msg}</p>
            </div>
          </div>,
          document.body
        )}

      <h1 className="text-2xl font-black mb-4">Pipeline de Vendas</h1>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-2">
          {ESTAGIOS.map((estagio) => (
            <div key={estagio.id} className="bg-slate-100 rounded p-2">
              <h3 className="font-bold text-sm mb-2">{estagio.label}</h3>
              {oportunidades
                .filter((o) => o.estagio === estagio.id)
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-2 rounded mb-2 cursor-pointer"
                    onClick={() => {
                      setEditingOp(item);
                      setFormData(item);
                      setModalOpen(true);
                    }}
                  >
                    <p className="font-bold text-sm">{item.nomeCliente}</p>
                    <p className="text-xs text-slate-500">{item.produto}</p>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

