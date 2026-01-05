"use client";

import React, { useState } from 'react';
import { Outfit } from "next/font/google";
import "./globals.css";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, Trello, Package, Lock, 
  BarChart3, LogOut, Menu, X, ChevronRight
} from 'lucide-react';

const outfit = Outfit({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const MENU = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Clientes', path: '/clientes', icon: Users },
    { name: 'Pipeline', path: '/pipeline', icon: Trello },
    { name: 'Produtos', path: '/produtos', icon: Package },
    { name: 'Exclusividades', path: '/exclusividades', icon: Lock },
    { name: 'Faturamento', path: '/faturamento', icon: BarChart3 },
  ];

  return (
    <html lang="pt-br">
      <body className={`${outfit.className} bg-slate-50 text-slate-700 overflow-x-hidden`}>
        
        {/* --- CABEÇALHO (PRIORIDADE BAIXA: Z-10) --- */}
        <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-10 flex items-center px-4 justify-between shadow-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsOpen(true)} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition">
                <Menu size={24} />
              </button>
              <div className="flex flex-col leading-none">
                 <span className="font-black text-lg text-[#0f392b]">YELLOW<span className="text-[#82D14D]">LEAF</span></span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase">CRM System</span>
              </div>
            </div>

            {/* ATALHOS RÁPIDOS */}
            <div className="hidden md:flex items-center gap-2 pl-6 border-l border-slate-200 h-8">
               {MENU.slice(0, 4).map((item) => (
                 <Link key={item.path} href={item.path} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${pathname === item.path ? 'bg-green-50 text-green-700 border border-green-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'}`}>
                    <item.icon size={14}/> {item.name}
                 </Link>
               ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-700">Dionatan Hoegen</p>
                <p className="text-[10px] text-green-600 font-bold">Representante</p>
             </div>
             <div className="w-9 h-9 rounded-full bg-[#0f392b] text-[#82D14D] flex items-center justify-center font-bold text-sm">DH</div>
          </div>
        </header>

        {/* --- MENU LATERAL (PRIORIDADE MÉDIA: Z-20) --- */}
        <div className={`fixed inset-0 bg-black/60 z-20 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} onClick={() => setIsOpen(false)}/>
        <aside className={`fixed top-0 left-0 h-full w-72 bg-[#0f392b] text-white z-30 shadow-2xl transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 flex justify-between items-center border-b border-white/10 h-16">
            <span className="font-bold text-lg">Menu</span>
            <button onClick={() => setIsOpen(false)}><X size={20} /></button>
          </div>
          <nav className="p-4 space-y-2">
            {MENU.map((item) => (
              <Link key={item.path} href={item.path} onClick={() => setIsOpen(false)} className={`flex items-center justify-between p-3 rounded-xl transition-all ${pathname === item.path ? 'bg-[#82D14D] text-[#0f392b] font-bold' : 'text-slate-300 hover:bg-white/5'}`}>
                <div className="flex items-center gap-3"><item.icon size={20}/> <span>{item.name}</span></div>
                {pathname === item.path && <ChevronRight size={16} />}
              </Link>
            ))}
          </nav>
        </aside>

        {/* --- CONTEÚDO (SEM TRAVAS DE Z-INDEX) --- */}
        <main className="w-full min-h-screen pt-16 bg-slate-50">
          {children}
        </main>
      </body>
    </html>
  );
}