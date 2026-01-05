"use client";

import React, { useState, useEffect } from 'react';
import { Outfit } from "next/font/google";
import "./globals.css";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Adicionado useRouter
import { 
  LayoutDashboard, Users, Trello, Package, Lock, 
  BarChart3, LogOut, Menu, X, ChevronRight,
  FileText, Shield, ChevronDown, UserCircle
} from 'lucide-react';

const outfit = Outfit({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter(); // Para redirecionar
  const [isOpen, setIsOpen] = useState(false); // Menu Lateral
  const [isProfileOpen, setIsProfileOpen] = useState(false); // Menu do Perfil

  // ITENS DO MENU
  const MENU = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Clientes', path: '/clientes', icon: Users },
    { name: 'Pipeline', path: '/pipeline', icon: Trello },
    { name: 'Produtos', path: '/produtos', icon: Package },
    { name: 'Exclusividades', path: '/exclusividades', icon: Lock },
    { name: 'Faturamento', path: '/faturamento', icon: BarChart3 },
    { name: 'Relatórios', path: '/relatorios', icon: FileText }, 
    { name: 'Admin', path: '/admin', icon: Shield }, 
  ];

  // --- FUNÇÃO DE LOGOUT ---
  const handleLogout = () => {
    // 1. Limpa a "sessão" do navegador
    localStorage.removeItem('crm_user');
    // 2. Manda para a tela de login
    router.push('/login');
  };

  return (
    <html lang="pt-br">
      <body className={`${outfit.className} bg-slate-50 text-slate-700 overflow-x-hidden`}>
        
        {/* --- 1. CABEÇALHO FIXO GLOBAL --- */}
        <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-[40] flex items-center px-4 justify-between shadow-sm">
          
          <div className="flex items-center gap-6">
            {/* BLOCO ESQUERDA: MENU + LOGO */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsOpen(true)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-green-600 transition active:scale-95"
              >
                <Menu size={24} />
              </button>

              <div className="flex flex-col leading-none select-none">
                 <span className="font-black text-lg text-[#0f392b] tracking-tight">YELLOW<span className="text-[#82D14D]">LEAF</span></span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">CRM System</span>
              </div>
            </div>

            {/* --- BARRA DE NAVEGAÇÃO RÁPIDA (GLOBAL) --- */}
            <div className="hidden md:flex items-center gap-2 pl-6 border-l border-slate-200 h-8">
               {MENU.slice(0, 4).map((item) => {
                 const active = pathname === item.path;
                 return (
                   <Link 
                     key={item.path}
                     href={item.path} 
                     className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                       active 
                         ? 'bg-green-50 text-green-700 border border-green-200' 
                         : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'
                     }`}
                   >
                      <item.icon size={14}/> {item.name}
                   </Link>
                 );
               })}
            </div>
          </div>

          {/* --- PERFIL (DIREITA) COM DROPDOWN --- */}
          <div className="relative">
             <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-xl transition"
             >
                 <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-slate-700">Dionatan Hoegen</p>
                    <p className="text-[10px] text-green-600 font-bold">Representante</p>
                 </div>
                 <div className="w-9 h-9 rounded-full bg-[#0f392b] text-[#82D14D] flex items-center justify-center font-bold text-sm border-2 border-[#82D14D]">
                    DH
                 </div>
                 <ChevronDown size={16} className={`text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}/>
             </button>

             {/* MENU SUSPENSO (DROPDOWN) */}
             {isProfileOpen && (
               <>
                 <div className="fixed inset-0 z-[30]" onClick={() => setIsProfileOpen(false)}></div> {/* Fecha ao clicar fora */}
                 <div className="absolute right-0 top-14 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-[40] animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                       <p className="text-xs font-bold text-slate-400 uppercase">Minha Conta</p>
                    </div>
                    <Link href="/admin" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition font-medium">
                       <Shield size={16}/> Admin
                    </Link>
                    <button 
                       onClick={handleLogout}
                       className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition font-bold mt-1"
                    >
                       <LogOut size={16}/> Sair do Sistema
                    </button>
                 </div>
               </>
             )}
          </div>
        </header>

        {/* --- 2. MENU LATERAL (DRAWER) --- */}
        <div 
          className={`fixed inset-0 bg-black/60 z-[50] backdrop-blur-sm transition-opacity duration-300 ${
            isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
          }`}
          onClick={() => setIsOpen(false)}
        />

        <aside 
          className={`fixed top-0 left-0 h-full w-72 bg-[#0f392b] text-white z-[60] shadow-2xl transform transition-transform duration-300 ease-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-6 flex justify-between items-center border-b border-white/10 h-16">
            <span className="font-bold text-lg text-white tracking-wide">Menu Completo</span>
            <button onClick={() => setIsOpen(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition"><X size={20} /></button>
          </div>

          <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-140px)]">
            {MENU.map((item) => {
              const active = pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                    active ? 'bg-[#82D14D] text-[#0f392b] font-bold shadow-lg' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={20} className={active ? 'text-[#0f392b]' : 'text-slate-400 group-hover:text-white'} />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  {active && <ChevronRight size={16} />}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#0a261d] border-t border-white/5">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 text-red-400 hover:text-red-300 text-sm font-bold w-full p-2 rounded-lg hover:bg-white/5 transition"
            >
              <LogOut size={18} /> Sair
            </button>
          </div>
        </aside>

        {/* --- 3. CONTEÚDO PRINCIPAL --- */}
        <main className="w-full min-h-screen pt-16 bg-slate-50 relative z-0">
          {children}
        </main>

      </body>
    </html>
  );
}