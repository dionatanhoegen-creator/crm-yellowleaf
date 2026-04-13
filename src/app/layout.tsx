"use client";

import React, { useState, useEffect } from 'react';
import { Outfit } from "next/font/google";
import "./globals.css";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  LayoutDashboard, Users, Trello, Package, Lock, 
  BarChart3, LogOut, Menu, X, ChevronRight,
  FileText, Shield, ChevronDown, Stethoscope, Lightbulb, CalendarCheck, Target, TrendingUp, Bell, CheckCircle2, Circle, Trash2, Radar
} from 'lucide-react';

const outfit = Outfit({ subsets: ["latin"] });

const MENU_BASE = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, key: 'faturamento', section: 'Visão Geral' },
  { name: 'Faturamento', path: '/faturamento', icon: BarChart3, key: 'faturamento', section: 'Visão Geral' },
  { name: 'Relatórios', path: '/relatorios', icon: FileText, key: 'relatorios', section: 'Visão Geral' },
  { name: 'Prospecção', path: '/prospeccao', icon: Target, key: 'pipeline', section: 'Vendas & Comercial' },
  { name: 'Pipeline', path: '/pipeline', icon: Trello, key: 'pipeline', section: 'Vendas & Comercial' },
  { name: 'Clientes', path: '/clientes', icon: Users, key: 'clientes', section: 'Vendas & Comercial' },
  { name: 'Radar P&D', path: '/mailing', icon: Radar, key: 'prescritores', section: 'Pesquisa & Desenvolvimento' },
  { name: 'Prescritores', path: '/prescritores', icon: Stethoscope, key: 'prescritores', section: 'Pesquisa & Desenvolvimento' },
  { name: 'Visitas P&D', path: '/visitas', icon: CalendarCheck, key: 'prescritores', section: 'Pesquisa & Desenvolvimento' },
  { name: 'Inteligência', path: '/inteligencia', icon: Lightbulb, key: 'inteligencia', section: 'Pesquisa & Desenvolvimento' },
  { name: 'Produtos', path: '/produtos', icon: Package, key: 'produtos', section: 'Apoio Técnico' },
  { name: 'Exclusividades', path: '/exclusividades', icon: Lock, key: 'exclusividades', section: 'Apoio Técnico' },
  { name: 'Equipe', path: '/equipe', icon: Shield, key: 'admin', section: 'Administração' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [isOpen, setIsOpen] = useState(false); 
  const [isProfileOpen, setIsProfileOpen] = useState(false); 
  const [userEmail, setUserEmail] = useState("Carregando..."); 
  const [menuPermitido, setMenuPermitido] = useState<any[]>([]);

  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const isLoginPage = pathname === '/login';

  const tocarSom = () => {
      try {
         const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
         audio.play().catch(() => {});
      } catch(e) {}
  };

  useEffect(() => {
    // --- TRUQUE DE MESTRE: INJEÇÃO FORÇADA DO PWA ---
    // Obriga o navegador a ler o manifest e acionar o botão de "Instalar App"
    if (typeof window !== 'undefined') {
        if (!document.querySelector('link[rel="manifest"]')) {
            const link = document.createElement('link');
            link.rel = 'manifest';
            link.href = '/manifest.json';
            document.head.appendChild(link);
        }
        
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
              .then(() => console.log('Robô PWA ativado com sucesso!'))
              .catch((err) => console.log('Erro no robô PWA', err));
        }
    }
    // ------------------------------------------------

    let intervalId: NodeJS.Timeout;

    const carregarAcessos = async () => {
      if (isLoginPage) return;

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserEmail(user.email || "Usuário");
        
        const { data: perfil } = await supabase.from('perfis').select('acessos').eq('id', user.id).single();
        
        if (perfil && perfil.acessos) {
            const menuFiltrado = MENU_BASE.filter(item => perfil.acessos[item.key] === true);
            setMenuPermitido(menuFiltrado);
        } else {
            setMenuPermitido([]);
        }

        buscarNotificacoes(user.id);
        intervalId = setInterval(() => buscarNotificacoes(user.id), 15000);

      } else {
        setUserEmail("Visitante");
        setMenuPermitido([]);
      }
    };

    carregarAcessos();

    return () => {
        if (intervalId) clearInterval(intervalId);
    };
  }, [supabase, isLoginPage]);

  const buscarNotificacoes = async (userId: string) => {
      const { data } = await supabase
          .from('notificacoes')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30); 

      if (data) {
          setNotificacoes(prev => {
              const novasNaoLidas = data.filter(d => !d.lida).length;
              const antigasNaoLidas = prev.filter(p => !p.lida).length;
              if (novasNaoLidas > antigasNaoLidas) tocarSom();
              return data;
          });
      }
  };

  const clicarNotificacao = async (id: string, link?: string) => {
      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
      await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
      
      if (link) {
          setIsNotifOpen(false);
          router.push(link);
      }
  };

  const toggleLida = async (e: React.MouseEvent, id: string, statusAtual: boolean) => {
      e.stopPropagation(); 
      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: !statusAtual } : n));
      await supabase.from('notificacoes').update({ lida: !statusAtual }).eq('id', id);
  };

  const limparNotificacoesLidas = async () => {
      const lidas = notificacoes.filter(n => n.lida);
      if (lidas.length === 0) return;
      
      const idsLidas = lidas.map(n => n.id);
      setNotificacoes(prev => prev.filter(n => !n.lida));
      await supabase.from('notificacoes').delete().in('id', idsLidas);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    router.refresh();
    router.push('/login');
  };

  if (isLoginPage) {
    return (
      <html lang="pt-br">
        <head>
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#0f392b" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        </head>
        <body className={`${outfit.className} bg-slate-50 text-slate-700`}>
          {children}
        </body>
      </html>
    );
  }

  const notificacoesNaoLidas = notificacoes.filter(n => !n.lida).length;
  const temNotificacaoLida = notificacoes.some(n => n.lida);

  const groupedMenu = menuPermitido.reduce((acc, item) => {
      if (!acc[item.section]) acc[item.section] = [];
      acc[item.section].push(item);
      return acc;
  }, {} as Record<string, typeof MENU_BASE>);

  return (
    <html lang="pt-br">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f392b" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className={`${outfit.className} bg-slate-50 text-slate-700 overflow-x-hidden`}>
        
        <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-[40] flex items-center px-4 justify-between shadow-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsOpen(true)} className="p-2 -ml-2 sm:ml-0 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-green-600 transition active:scale-95">
                <Menu size={24} />
              </button>
              <div className="flex flex-col leading-none select-none">
                 <span className="font-black text-lg text-[#0f392b] tracking-tight">YELLOW<span className="text-[#82D14D]">LEAF</span></span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">CRM System</span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2 pl-6 border-l border-slate-200 h-8 overflow-hidden max-w-2xl">
               {menuPermitido.slice(0, 5).map((item) => {
                 const active = pathname === item.path;
                 return (
                   <Link key={item.path} href={item.path} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-bold transition-all whitespace-nowrap ${active ? 'bg-green-50 text-green-700 border border-green-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'}`}>
                      <item.icon size={14}/> {item.name}
                   </Link>
                 );
               })}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
             <div className="relative">
                 <button onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false); }} className={`p-2.5 rounded-xl transition relative ${isNotifOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
                     <Bell size={20} className={notificacoesNaoLidas > 0 ? "animate-pulse" : ""} />
                     {notificacoesNaoLidas > 0 && (
                         <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full shadow-sm shadow-red-200 border-2 border-white">
                             {notificacoesNaoLidas}
                         </span>
                     )}
                 </button>

                 {isNotifOpen && (
                     <>
                         <div className="fixed inset-0 z-[50] bg-black/50 sm:bg-transparent transition-all" onClick={() => setIsNotifOpen(false)}></div>
                         <div className="fixed sm:absolute inset-x-0 bottom-0 sm:inset-auto sm:right-0 sm:top-14 w-full sm:w-96 bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-slate-200 z-[60] overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-top-4 flex flex-col max-h-[85vh] sm:max-h-[500px]">
                             <div className="p-4 bg-slate-800 flex justify-between items-center text-white shrink-0">
                                 <h3 className="font-bold text-sm flex items-center gap-2"><Bell size={18} className="text-yellow-400"/> Notificações</h3>
                                 <div className="flex items-center gap-3">
                                    {temNotificacaoLida && (
                                      <button onClick={limparNotificacoesLidas} className="text-[10px] font-bold text-slate-300 hover:text-red-400 flex items-center gap-1 transition">
                                          <Trash2 size={12}/> Limpar Lidas
                                      </button>
                                    )}
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded">{notificacoesNaoLidas} Novas</span>
                                    <button onClick={() => setIsNotifOpen(false)} className="sm:hidden text-slate-300 hover:text-white"><X size={20}/></button>
                                 </div>
                             </div>
                             <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-slate-50 pb-8 sm:pb-2">
                                 {notificacoes.length === 0 ? (
                                     <p className="text-center text-slate-400 text-xs p-6 font-medium">Nenhuma notificação por enquanto.</p>
                                 ) : (
                                     notificacoes.map((n: any) => (
                                         <div key={n.id} onClick={() => clicarNotificacao(n.id, n.link)} className={`p-3 mb-2 rounded-xl text-sm border transition cursor-pointer flex gap-3 ${n.lida ? 'bg-slate-100 border-transparent opacity-75 hover:bg-slate-200' : 'bg-white border-blue-200 shadow-sm hover:border-blue-400'}`}>
                                             <button 
                                                onClick={(e) => toggleLida(e, n.id, n.lida)} 
                                                className="mt-1 shrink-0 transition-transform hover:scale-110"
                                                title={n.lida ? "Marcar como não lida" : "Marcar como lida"}
                                             >
                                                 {n.lida ? <CheckCircle2 size={20} className="text-slate-400"/> : <div className="w-4 h-4 rounded-full bg-blue-500 shadow-sm shadow-blue-200 flex items-center justify-center border-2 border-white ml-0.5 mt-0.5"></div>}
                                             </button>
                                             <div className="flex-1">
                                                 <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">{n.remetente || 'Sistema'}</p>
                                                 <p className={`text-xs leading-tight ${n.lida ? 'text-slate-600' : 'text-slate-800 font-bold'}`}>{n.mensagem}</p>
                                                 <span className="text-[9px] text-slate-400 font-medium block mt-1.5">{new Date(n.created_at).toLocaleString('pt-BR')}</span>
                                             </div>
                                         </div>
                                     ))
                                 )}
                             </div>
                         </div>
                     </>
                 )}
             </div>

             <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

             <div className="relative shrink-0">
                <button onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); }} className="flex items-center gap-2 sm:gap-3 hover:bg-slate-50 p-1.5 sm:p-2 rounded-xl transition">
                    <div className="text-right hidden sm:block">
                       <p className="text-xs font-bold text-slate-700 max-w-[150px] truncate">{userEmail}</p>
                       <p className="text-[10px] text-green-600 font-bold">Usuário Conectado</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-[#0f392b] text-[#82D14D] flex items-center justify-center font-bold text-sm border-2 border-[#82D14D]">
                       {userEmail.substring(0, 2).toUpperCase()}
                    </div>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform hidden sm:block ${isProfileOpen ? 'rotate-180' : ''}`}/>
                </button>

                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-[50] bg-black/50 sm:bg-transparent transition-all" onClick={() => setIsProfileOpen(false)}></div> 
                    <div className="fixed sm:absolute inset-x-0 bottom-0 sm:inset-auto sm:right-0 sm:top-14 w-full sm:w-56 bg-white rounded-t-3xl sm:rounded-xl shadow-2xl sm:shadow-xl sm:border border-slate-100 p-5 sm:p-2 z-[60] animate-in slide-in-from-bottom-10 sm:slide-in-from-top-2 pb-10 sm:pb-2">
                       <div className="px-3 py-3 sm:py-2 border-b border-slate-100 mb-3 sm:mb-1 flex justify-between items-center sm:block">
                          <div>
                             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left">Minha Conta</p>
                             <p className="text-sm font-bold text-slate-800 truncate mt-1 sm:hidden">{userEmail}</p>
                          </div>
                          <button onClick={() => setIsProfileOpen(false)} className="sm:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                       </div>
                       
                       {menuPermitido.some(m => m.key === 'admin') && (
                           <Link href="/equipe" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 sm:gap-2 w-full text-left px-4 sm:px-3 py-4 sm:py-2 text-base sm:text-sm text-slate-700 hover:bg-slate-50 rounded-xl sm:rounded-lg transition font-medium">
                              <Shield size={18} className="sm:w-4 sm:h-4"/> Gestão de Acessos
                           </Link>
                       )}
                       <button onClick={handleLogout} className="flex items-center gap-3 sm:gap-2 w-full text-left px-4 sm:px-3 py-4 sm:py-2 text-base sm:text-sm text-red-600 hover:bg-red-50 rounded-xl sm:rounded-lg transition font-bold mt-2 sm:mt-1 border border-red-50 sm:border-transparent bg-red-50/50 sm:bg-transparent">
                          <LogOut size={18} className="sm:w-4 sm:h-4"/> Sair do Sistema
                       </button>
                    </div>
                  </>
                )}
             </div>
          </div>
        </header>

        <div className={`fixed inset-0 bg-black/60 z-[50] backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} onClick={() => setIsOpen(false)}/>

        <aside className={`fixed top-0 left-0 h-full w-[80vw] max-w-[300px] sm:w-72 bg-[#0f392b] text-white z-[60] shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 flex justify-between items-center border-b border-white/10 h-16 shrink-0">
            <span className="font-bold text-lg text-white tracking-wide">Módulos</span>
            <button onClick={() => setIsOpen(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition"><X size={20} /></button>
          </div>

          <nav className="p-4 overflow-y-auto h-[calc(100vh-140px)] custom-scrollbar">
            {Object.keys(groupedMenu).map((section) => (
               <div key={section} className="mb-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-3">{section}</h4>
                  <div className="space-y-1">
                      {groupedMenu[section].map((item) => {
                        const active = pathname === item.path;
                        return (
                          <Link key={item.path} href={item.path} onClick={() => setIsOpen(false)} className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${active ? 'bg-[#82D14D] text-[#0f392b] font-bold shadow-lg' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                            <div className="flex items-center gap-3">
                              <item.icon size={18} className={active ? 'text-[#0f392b]' : 'text-slate-400 group-hover:text-white'} />
                              <span className="text-sm font-medium">{item.name}</span>
                            </div>
                            {active && <ChevronRight size={16} />}
                          </Link>
                        );
                      })}
                  </div>
               </div>
            ))}
            {menuPermitido.length === 0 && <p className="text-center text-xs text-slate-500 mt-10 px-4 leading-relaxed">Seu usuário não possui módulos liberados.<br/>Fale com o Administrador.</p>}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#0a261d] border-t border-white/5">
            <button onClick={handleLogout} className="flex items-center justify-center gap-3 text-red-400 hover:text-red-300 text-sm font-bold w-full p-3 rounded-xl border border-red-500/20 hover:bg-white/5 transition">
              <LogOut size={18} /> Encerrar Sessão
            </button>
          </div>
        </aside>

        <main className="w-full min-h-screen pt-16 bg-slate-50 relative z-0">
          {children}
        </main>
      </body>
    </html>
  );
}
