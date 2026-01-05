"use client";

import React, { useState } from 'react';
import { 
  Shield, User, Lock, Edit, Trash2, CheckCircle2, XCircle, Key
} from 'lucide-react';

// USUÁRIO MASTER (Imutável)
const MASTER_USER = "dionatan@yellowleaf.com.br";

interface Usuario {
  id: number;
  nome: string;
  email: string;
  ativo: boolean;
  permissao: 'admin' | 'user';
}

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([
    { id: 1, nome: "Dionatan Hoegen", email: "dionatan@yellowleaf.com.br", ativo: true, permissao: 'admin' },
    { id: 2, nome: "João Vendedor", email: "joao@yellowleaf.com.br", ativo: true, permissao: 'user' },
    { id: 3, nome: "Maria Representante", email: "maria@yellowleaf.com.br", ativo: false, permissao: 'user' },
  ]);

  const toggleStatus = (id: number) => {
    setUsuarios(prev => prev.map(u => {
      if (u.email === MASTER_USER) return u; // Não deixa desativar o Master
      return u.id === id ? { ...u, ativo: !u.ativo } : u;
    }));
  };

  const resetSenha = (email: string) => {
    alert(`Link de redefinição de senha enviado para: ${email}`);
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8 flex items-center gap-3">
           <div className="p-3 bg-slate-800 text-white rounded-xl">
              <Shield size={32}/>
           </div>
           <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Painel Administrativo</h1>
              <p className="text-slate-500">Gestão de acessos e segurança.</p>
           </div>
        </div>

        {/* LISTA DE USUÁRIOS */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
           <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Usuários Cadastrados</h3>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition">
                 + Novo Usuário
              </button>
           </div>

           <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                 <tr>
                    <th className="p-4">Nome</th>
                    <th className="p-4">Login (E-mail)</th>
                    <th className="p-4 text-center">Perfil</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Ações</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {usuarios.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 transition">
                       <td className="p-4 font-bold text-slate-700 flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                             <User size={16}/>
                          </div>
                          {user.nome} 
                          {user.email === MASTER_USER && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200">MASTER</span>}
                       </td>
                       <td className="p-4 text-slate-500">{user.email}</td>
                       <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.permissao === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'}`}>
                             {user.permissao.toUpperCase()}
                          </span>
                       </td>
                       <td className="p-4 text-center">
                          <button 
                             onClick={() => toggleStatus(user.id)}
                             disabled={user.email === MASTER_USER}
                             className={`flex items-center gap-1 mx-auto px-3 py-1 rounded-full text-xs font-bold transition ${user.ativo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                          >
                             {user.ativo ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
                             {user.ativo ? 'ATIVO' : 'BLOQUEADO'}
                          </button>
                       </td>
                       <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                             <button 
                                onClick={() => resetSenha(user.email)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Resetar Senha"
                             >
                                <Key size={16}/>
                             </button>
                             <button className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition" title="Editar">
                                <Edit size={16}/>
                             </button>
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

      </div>
    </div>
  );
}