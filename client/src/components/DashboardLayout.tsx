import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  BarChart3,
  Building2,
  CreditCard,
  DollarSign,
  Fuel,
  LayoutDashboard,
  Layers,
  LogOut,
  PanelLeft,
  PiggyBank,
  Receipt,
  Repeat,
  ShoppingCart,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Settings,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';

const menuGroups = [
  {
    label: "Visão Geral",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
    ],
  },
  {
    label: "Finanças",
    items: [
      { icon: Building2, label: "Contas Bancárias", path: "/contas-bancarias" },
      { icon: TrendingUp, label: "Receitas", path: "/receitas" },
      { icon: TrendingDown, label: "Despesas", path: "/despesas" },
      { icon: Receipt, label: "Contas a Pagar", path: "/contas" },
      { icon: CreditCard, label: "Cartões", path: "/cartoes" },
      { icon: Repeat, label: "Recorrências", path: "/recorrencias" },
    ],
  },
  {
    label: "Planejamento",
    items: [
      { icon: Wallet, label: "Orçamento", path: "/orcamento" },
      { icon: Target, label: "Metas", path: "/metas" },
      { icon: Layers, label: "50/30/20", path: "/categorias" },
      { icon: PiggyBank, label: "Investimentos", path: "/investimentos" },
    ],
  },
  {
    label: "Utilidades",
    items: [
      { icon: ShoppingCart, label: "Mercado", path: "/mercado" },
      { icon: Fuel, label: "Combustível", path: "/combustivel" },
      { icon: Users, label: "Família", path: "/familia" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { icon: Settings, label: "Configurações", path: "/configuracoes" },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 360;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
    return null;
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (w: number) => void }) {
  const { user } = useAuth();
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.replace('/login');
  };
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const allItems = menuGroups.flatMap(g => g.items);
  const activeItem = allItems.find(item => item.path === location);

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border"
          style={{ background: 'var(--sidebar)' }}
          disableTransition={isResizing}
        >
          {/* ── Header ── */}
          <SidebarHeader className="h-16 justify-center px-3 border-b border-sidebar-border/60">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSidebar}
                className="h-9 w-9 flex items-center justify-center hover:bg-sidebar-accent rounded-xl transition-all duration-200 shrink-0 group"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground/50 group-hover:text-sidebar-foreground transition-colors" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 animate-pulse-glow"
                    style={{ background: 'linear-gradient(135deg, oklch(0.65 0.25 270), oklch(0.68 0.22 210))' }}
                  >
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <span
                      className="font-bold tracking-tight text-sidebar-foreground truncate block text-sm"
                      style={{ fontFamily: "'Sora', sans-serif", letterSpacing: '-0.01em' }}
                    >
                      FinançaFamiliar
                    </span>
                    <span className="text-[10px] text-sidebar-foreground/40 font-medium tracking-wider uppercase">
                      Controle Financeiro
                    </span>
                  </div>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* ── Navigation ── */}
          <SidebarContent className="gap-0 py-3 overflow-x-hidden">
            {menuGroups.map((group, gi) => (
              <div key={group.label} className={`px-2 ${gi > 0 ? 'mt-1' : ''}`}>
                {!isCollapsed && (
                  <div className="text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-[0.12em] px-3 mb-1.5 h-5 flex items-center">
                    {group.label}
                  </div>
                )}
                <SidebarMenu className="gap-0.5">
                  {group.items.map(item => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`
                            h-9 rounded-xl transition-all duration-200 relative group
                            ${isActive
                              ? 'text-white font-semibold'
                              : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/80'
                            }
                          `}
                          style={isActive ? {
                            background: 'linear-gradient(135deg, oklch(0.65 0.25 270 / 0.85), oklch(0.68 0.22 210 / 0.70))',
                            boxShadow: '0 2px 12px oklch(0.65 0.25 270 / 0.30)',
                          } : {}}
                        >
                          <item.icon className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                          <span className="text-[13px]">{item.label}</span>
                          {isActive && !isCollapsed && (
                            <ChevronRight className="h-3 w-3 ml-auto opacity-60" />
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          {/* ── Footer ── */}
          <SidebarFooter className="p-3 border-t border-sidebar-border/60">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-sidebar-accent transition-all duration-200 w-full text-left focus:outline-none group">
                  <Avatar className="h-8 w-8 shrink-0 ring-2 ring-sidebar-border group-hover:ring-primary/50 transition-all">
                    <AvatarFallback
                      className="text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, oklch(0.65 0.25 270), oklch(0.68 0.22 210))' }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate leading-none text-sidebar-foreground">{user?.name || "Usuário"}</p>
                      <p className="text-[11px] text-sidebar-foreground/40 truncate mt-0.5">{user?.email || ""}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/40 transition-colors"
            style={{ zIndex: 50 }}
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      <SidebarInset className="bg-background">
        {/* Mobile header */}
        {isMobile && (
          <div
            className="flex border-b border-border/50 h-14 items-center justify-between px-4 sticky top-0 z-40"
            style={{ background: 'oklch(0.115 0.018 255 / 0.95)', backdropFilter: 'blur(12px)' }}
          >
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8 rounded-xl" />
              <span className="font-semibold text-foreground text-sm">{activeItem?.label ?? "Menu"}</span>
            </div>
          </div>
        )}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </SidebarInset>
    </>
  );
}
