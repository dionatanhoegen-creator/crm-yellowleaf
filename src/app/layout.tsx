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
  FileText, Shield, ChevronDown, Stethoscope, Lightbulb, CalendarCheck, Target, TrendingUp, Bell, CheckCircle2
} from 'lucide-react';

const outfit = Outfit({ subsets: ["latin"] });

const MENU_BASE = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, key: 'faturamento' },
  { name: 'Análise de Vendas', path: '/analise-vendas', icon: TrendingUp, key: 'faturamento' },
  { name: 'Prospecção', path: '/prospeccao', icon: Target, key: 'pipeline' },
  { name: 'Inteligência', path: '/inteligencia', icon: Lightbulb, key: 'inteligencia' },
  { name: 'Clientes', path: '/clientes', icon: Users, key: 'clientes' },
  { name: 'Prescritores', path: '/prescritores', icon: Stethoscope, key: 'prescritores' },
  { name: 'Visitas P&D', path: '/visitas', icon: CalendarCheck, key: 'prescritores' }, 
  { name: 'Pipeline', path: '/pipeline', icon: Trello, key: 'pipeline' },
  { name: 'Produtos', path: '/produtos', icon: Package, key: 'produtos' },
  { name: 'Exclusividades', path: '/exclusividades', icon: Lock, key: 'exclusividades' },
  { name: 'Faturamento', path: '/faturamento', icon: BarChart3, key: 'faturamento' },
  { name: 'Relatórios', path: '/relatorios', icon: FileText, key: 'relatorios' }, 
  { name: 'Equipe', path: '/equipe', icon: Shield, key: 'admin' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [isOpen, setIsOpen] = useState(false); 
  const [isProfileOpen, setIsProfileOpen] = useState(false); 
  const [userEmail, setUserEmail] = useState("Carregando..."); 
  const [menuPermitido, setMenuPermitido] = useState<any[]>([]);

  // --- ESTADOS DO SISTEMA DE NOTIFICAÇÕES ---
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const isLoginPage = pathname === '/login';

  // --- O BARULHINHO (SOM DE NOTIFICAÇÃO) ---
  const tocarSom = () => {
      try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play();
      } catch (e) { console.error("Sem permissão para tocar som.", e); }
  };

  useEffect(() => {
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

        // Busca notificações imediatas
        buscarNotificacoes(user.id);
        // Deixa o "Radar" ligado a cada 15 segundos
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

  // Função que busca as notificações no banco
  const buscarNotificacoes = async (userId: string) => {
      const { data } = await supabase
          .from('notificacoes')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);

      if (data) {
          setNotificacoes(prev => {
              const novasNaoLidas = data.filter(d => !d.lida).length;
              const antigasNaoLidas = prev.filter(p => !p.lida).length;
              
              // Se o número de não lidas aumentou, toca o sino!
              if (novasNaoLidas > antigasNaoLidas) {
                  tocarSom();
              }
              return data;
          });
      }
  };

  // Marcar como lida
  const marcarComoLida = async (id: string, link?: string) => {
      // Atualiza na tela na hora
      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
      // Grava no banco
      await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
      
      // Se houver link, navega
      if (link) {
          setIsNotifOpen(false);
          router.push(link);
      }
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
        <body className={`${outfit.className} bg-slate-50 text-slate-700`}>
          {children}
        </body>
      </html>
    );
  }

  const notificacoesNaoLidas = notificacoes.filter(n => !n.lida).length;

  return (
    <html lang="pt-br">
      <body className={`${outfit.className} bg-slate-50 text-slate-700 overflow-x-hidden`}>
        
        {/* --- CABEÇALHO FIXO GLOBAL --- */}
        <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-[40] flex items-center px-4 justify-between shadow-sm">
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsOpen(true)}
                className="p-2 -ml-2 sm:ml-0 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-green-600 transition active:scale-95"
              >
                <Menu size={24} />
              </button>

              <div className="flex flex-col leading-none select-none">
                 <span className="font-black text-lg text-[#0f392b] tracking-tight">YELLOW<span className="text-[#82D14D]">LEAF</span></span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">CRM System</span>
              </div>
            </div>

            {/* --- BARRA DE NAVEGAÇÃO RÁPIDA (DINÂMICA) --- */}
            <div className="hidden lg:flex items-center gap-2 pl-6 border-l border-slate-200 h-8 overflow-hidden max-w-2xl">
               {menuPermitido.slice(0, 5).map((item) => {
                 const active = pathname === item.path;
                 return (
                   <Link 
                     key={item.path}
                     href={item.path} 
                     className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
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

          <div className="flex items-center gap-2 sm:gap-3">
             
             {/* --- O SININHO DE NOTIFICAÇÕES --- */}
             <div className="relative">
                 <button 
                     onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false); }}
                     className={`p-2.5 rounded-xl transition relative ${isNotifOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                 >
                     <Bell size={20} className={notificacoesNaoLidas > 0 ? "animate-pulse" : ""} />
                     {notificacoesNaoLidas > 0 && (
                         <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full shadow-sm shadow-red-200 border-2 border-white">
                             {notificacoesNaoLidas}
                         </span>
                     )}
                 </button>

                 {isNotifOpen && (
                     <>
                         {/* Fundo escuro apenas no mobile */}
                         <div className="fixed inset-0 z-[50] bg-black/50 sm:bg-transparent transition-all" onClick={() => setIsNotifOpen(false)}></div>
                         
                         {/* Dropdown / Bottom Sheet */}
                         <div className="fixed sm:absolute inset-x-0 bottom-0 sm:inset-auto sm:right-0 sm:top-14 w-full sm:w-80 bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl sm:shadow-2xl border-t sm:border border-slate-200 z-[60] overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-top-4 flex flex-col max-h-[85vh] sm:max-h-[400px]">
                             
                             <div className="p-5 sm:p-4 bg-slate-800 flex justify-between items-center text-white shrink-0">
                                 <h3 className="font-bold text-base sm:text-sm flex items-center gap-2"><Bell size={18} className="text-yellow-400"/> Notificações</h3>
                                 <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded">{notificacoesNaoLidas} Novas</span>
                                    <button onClick={() => setIsNotifOpen(false)} className="sm:hidden text-slate-300 hover:text-white"><X size={20}/></button>
                                 </div>
                             </div>
                             
                             <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-2 bg-slate-50 pb-8 sm:pb-2">
                                 {notificacoes.length === 0 ? (
                                     <p className="text-center text-slate-400 text-sm sm:text-xs p-6 font-medium">Nenhuma notificação por enquanto.</p>
                                 ) : (
                                     notificacoes.map((n: any) => (
                                         <div 
                                             key={n.id} 
                                             onClick={() => marcarComoLida(n.id, n.link)}
                                             className={`p-4 sm:p-3 mb-2 sm:mb-2 rounded-2xl sm:rounded-xl text-sm border transition cursor-pointer flex gap-3 ${n.lida ? 'bg-transparent border-transparent opacity-60 hover:bg-slate-100' : 'bg-white border-blue-200 shadow-sm hover:border-blue-300'}`}
                                         >
                                             <div className="mt-1 shrink-0">
                                                 {n.lida ? <CheckCircle2 size={18} className="text-slate-300"/> : <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shadow-sm shadow-blue-200"></div>}
                                             </div>
                                             <div>
                                                 <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">{n.remetente || 'Sistema'}</p>
                                                 <p className={`text-sm sm:text-xs leading-tight ${n.lida ? 'text-slate-500' : 'text-slate-800 font-bold'}`}>{n.mensagem}</p>
                                                 <span className="text-[10px] sm:text-[9px] text-slate-400 font-medium block mt-1.5 sm:mt-1">{new Date(n.created_at).toLocaleString('pt-BR')}</span>
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

             {/* --- PERFIL COM DROPDOWN --- */}
             <div className="relative shrink-0">
                <button 
                   onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); }}
                   className="flex items-center gap-2 sm:gap-3 hover:bg-slate-50 p-1.5 sm:p-2 rounded-xl transition"
                >
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
                    {/* Fundo escuro apenas no mobile */}
                    <div className="fixed inset-0 z-[50] bg-black/50 sm:bg-transparent transition-all" onClick={() => setIsProfileOpen(false)}></div> 
                    
                    {/* Dropdown / Bottom Sheet */}
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
                       <button 
                          onClick={handleLogout}
                          className="flex items-center gap-3 sm:gap-2 w-full text-left px-4 sm:px-3 py-4 sm:py-2 text-base sm:text-sm text-red-600 hover:bg-red-50 rounded-xl sm:rounded-lg transition font-bold mt-2 sm:mt-1 border border-red-50 sm:border-transparent bg-red-50/50 sm:bg-transparent"
                       >
                          <LogOut size={18} className="sm:w-4 sm:h-4"/> Sair do Sistema
                       </button>
                    </div>
                  </>
                )}
             </div>

          </div>
        </header>

        {/* --- MENU LATERAL (DRAWER DINÂMICO) --- */}
        <div 
          className={`fixed inset-0 bg-black/60 z-[50] backdrop-blur-sm transition-opacity duration-300 ${
            isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
          }`}
          onClick={() => setIsOpen(false)}
        />

        <aside 
          className={`fixed top-0 left-0 h-full w-[80vw] max-w-[300px] sm:w-72 bg-[#0f392b] text-white z-[60] shadow-2xl transform transition-transform duration-300 ease-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-6 flex justify-between items-center border-b border-white/10 h-16">
            <span className="font-bold text-lg text-white tracking-wide">Módulos</span>
            <button onClick={() => setIsOpen(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition"><X size={20} /></button>
          </div>

          <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-140px)] custom-scrollbar">
            {menuPermitido.map((item) => {
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
            
            {menuPermitido.length === 0 && (
                <p className="text-center text-xs text-slate-500 mt-10 px-4 leading-relaxed">Seu usuário não possui módulos liberados.<br/>Fale com o Administrador.</p>
            )}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#0a261d] border-t border-white/5">
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-3 text-red-400 hover:text-red-300 text-sm font-bold w-full p-3 rounded-xl border border-red-500/20 hover:bg-white/5 transition"
            >
              <LogOut size={18} /> Encerrar Sessão
            </button>
          </div>
        </aside>

        {/* --- CONTEÚDO PRINCIPAL --- */}
        <main className="w-full min-h-screen pt-16 bg-slate-50 relative z-0">
          {children}
        </main>

      </body>
    </html>
  );
}