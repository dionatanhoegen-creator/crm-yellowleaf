"use client";

import React, { useState } from 'react';
import { Outfit } from "next/font/google";
import { Lock, Mail, ArrowRight, Loader2, Leaf } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Importa nosso cliente

const outfit = Outfit({ subsets: ["latin"] });

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Busca o usuário no Supabase
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('senha', password) // Em produção, usaríamos hash/criptografia
        .single();

      if (error || !data) {
        throw new Error("E-mail ou senha incorretos.");
      }

      if (!data.ativo) {
        throw new Error("Usuário bloqueado. Contate o administrador.");
      }

      // 2. Se deu certo, salva no navegador (simples) e redireciona
      // Dica: Para segurança total, futuramente usaremos o Auth do Next.js
      localStorage.setItem('crm_user', JSON.stringify(data));
      
      router.push("/"); // Manda para o Dashboard

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${outfit.className} min-h-screen flex items-center justify-center bg-slate-50 p-4`}>
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* LADO ESQUERDO (Visual) */}
        <div className="md:w-1/2 bg-[#0f392b] p-12 text-white flex flex-col justify-between relative overflow-hidden">
           <div className="absolute top-0 left-0 w-64 h-64 bg-[#82D14D] opacity-10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
           <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#82D14D] opacity-10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>

           <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                 <Leaf className="text-[#82D14D]" size={32} />
                 <span className="font-black text-2xl tracking-tight">YELLOW<span className="text-[#82D14D]">LEAF</span></span>
              </div>
              <p className="text-[#82D14D] text-xs font-bold uppercase tracking-widest ml-10">CRM System</p>
           </div>
           <div className="relative z-10 space-y-6">
              <h2 className="text-4xl font-bold leading-tight">Gestão inteligente para o mercado magistral.</h2>
              <p className="text-slate-300 text-lg">Acesse sua carteira, gerencie o pipeline e acompanhe suas metas em um só lugar.</p>
           </div>
           <div className="relative z-10 text-xs text-slate-500">© {new Date().getFullYear()} Yellow Leaf. Todos os direitos reservados.</div>
        </div>

        {/* LADO DIREITO (Formulário) */}
        <div className="md:w-1/2 p-12 flex flex-col justify-center bg-white">
           <div className="max-w-md mx-auto w-full">
              <div className="text-center mb-10">
                 <h3 className="text-2xl font-bold text-slate-800 mb-2">Bem-vindo de volta!</h3>
                 <p className="text-slate-500">Insira suas credenciais para acessar.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">E-mail</label>
                    <div className="relative">
                       <Mail className="absolute left-4 top-3.5 text-slate-400" size={20} />
                       <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemplo@yellowleaf.com.br" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition font-medium text-slate-700"/>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Senha</label>
                    <div className="relative">
                       <Lock className="absolute left-4 top-3.5 text-slate-400" size={20} />
                       <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition font-medium text-slate-700"/>
                    </div>
                 </div>

                 {error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-pulse">
                       <div className="w-2 h-2 bg-red-500 rounded-full"></div>{error}
                    </div>
                 )}

                 <button type="submit" disabled={loading} className="w-full bg-[#0f392b] hover:bg-[#164a3a] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                    {loading ? <Loader2 className="animate-spin" /> : <>Acessar Sistema <ArrowRight size={20}/></>}
                 </button>
              </form>
           </div>
        </div>
      </div>
    </div>
  );
}