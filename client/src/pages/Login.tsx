import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Eye, EyeOff, Loader2, TrendingUp, ShieldCheck, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface AuthResponse {
  success: boolean;
  user?: { id: number; name: string | null; email: string | null; role: string };
  error?: string;
}

async function callAuth(path: string, body: object): Promise<AuthResponse> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function Login() {
  const utils = trpc.useUtils();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    setLoginLoading(true);
    try {
      const result = await callAuth("/api/auth/login", {
        email: loginEmail,
        password: loginPassword,
      });
      if (result.success) {
        toast.success("Login realizado com sucesso!");
        await utils.auth.me.invalidate();
        window.location.href = "/";
      } else {
        toast.error(result.error || "Erro ao fazer login.");
      }
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword || !regConfirm) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (regPassword !== regConfirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setRegLoading(true);
    try {
      const result = await callAuth("/api/auth/register", {
        name: regName,
        email: regEmail,
        password: regPassword,
      });
      if (result.success) {
        toast.success("Conta criada com sucesso! Bem-vindo(a)!");
        await utils.auth.me.invalidate();
        window.location.href = "/";
      } else {
        toast.error(result.error || "Erro ao criar conta.");
      }
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setRegLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            FinançaFamiliar
          </span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Controle financeiro completo para sua família
            </h1>
            <p className="text-blue-200 text-lg leading-relaxed">
              Gerencie receitas, despesas, metas e investimentos em um só lugar. Alcance o método 50/30/20 com facilidade.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: TrendingUp, title: "Receitas e Despesas", desc: "Categorize e acompanhe cada centavo" },
              { icon: BarChart3, title: "Gráficos e Relatórios", desc: "Visualize sua evolução financeira" },
              { icon: ShieldCheck, title: "Metas e Orçamento", desc: "Planeje e conquiste seus objetivos" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="text-blue-300 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-400 text-sm">
          © {new Date().getFullYear()} FinançaFamiliar. Seus dados, sua privacidade.
        </p>
      </div>

      {/* Right panel — auth forms */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              FinançaFamiliar
            </span>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Criar conta</TabsTrigger>
            </TabsList>

            {/* Login */}
            <TabsContent value="login">
              <Card className="border-0 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl">Bem-vindo(a) de volta</CardTitle>
                  <CardDescription>Entre com seu e-mail e senha para acessar</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">E-mail</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        autoComplete="email"
                        disabled={loginLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPwd ? "text" : "password"}
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          autoComplete="current-password"
                          disabled={loginLoading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPwd(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loginLoading}>
                      {loginLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Entrando...</> : "Entrar"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Register */}
            <TabsContent value="register">
              <Card className="border-0 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl">Criar sua conta</CardTitle>
                  <CardDescription>Comece a organizar as finanças da sua família</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name">Nome completo</Label>
                      <Input
                        id="reg-name"
                        type="text"
                        placeholder="João Silva"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        autoComplete="name"
                        disabled={regLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">E-mail</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        autoComplete="email"
                        disabled={regLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="reg-password"
                          type={showRegPwd ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                          autoComplete="new-password"
                          disabled={regLoading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPwd(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showRegPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm">Confirmar senha</Label>
                      <Input
                        id="reg-confirm"
                        type="password"
                        placeholder="Repita a senha"
                        value={regConfirm}
                        onChange={e => setRegConfirm(e.target.value)}
                        autoComplete="new-password"
                        disabled={regLoading}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={regLoading}>
                      {regLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando conta...</> : "Criar conta gratuita"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
