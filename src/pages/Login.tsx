import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ShieldCheck, Lock, Mail, Building2, ArrowRight, CheckCircle2, Copy, UserCircle2 } from "lucide-react";
import logo from "@/assets/rithwik-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { DEMO_USERS, getCurrentUser, signIn, type DemoUser } from "@/lib/demoAuth";

const roleColors: Record<DemoUser["role"], string> = {
  site: "bg-blue-500/10 text-blue-700 ring-blue-500/20",
  accounts: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20",
  management: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
  admin: "bg-purple-500/10 text-purple-700 ring-purple-500/20",
};

export default function Login() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("anil.kumar@rithwik.com");
  const [password, setPassword] = useState("site@123");

  useEffect(() => {
    if (getCurrentUser()) navigate("/", { replace: true });
  }, [navigate]);

  const doSignIn = (em: string, pw: string, displayName?: string) => {
    setLoading(true);
    setTimeout(() => {
      const user = signIn(em, pw);
      setLoading(false);
      if (!user) {
        toast.error("Invalid credentials. Try a demo account below.");
        return;
      }
      toast.success(`Welcome back, ${displayName ?? user.name}`);
      navigate("/", { replace: true });
    }, 500);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }
    doSignIn(email, password);
  };

  const useDemo = (u: DemoUser) => {
    setEmail(u.email);
    setPassword(u.password);
    doSignIn(u.email, u.password, u.name);
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast.success(`${label} copied`),
      () => toast.error("Copy failed"),
    );
  };

  return (
    <div className="min-h-screen w-full bg-background lg:grid lg:grid-cols-[1fr_minmax(420px,560px)]">
      {/* Left brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-primary lg:flex lg:flex-col lg:justify-between lg:p-12 text-primary-foreground">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
            backgroundSize: "44px 44px, 64px 64px",
          }}
        />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary-glow/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="font-display text-lg font-bold tracking-tight">DMR & GRN Portal</div>
              <div className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">Enterprise Edition</div>
            </div>
          </div>
          <div className="inline-flex items-center rounded-xl bg-white px-5 py-3 shadow-lg ring-1 ring-white/30">
            <img src={logo} alt="Rithwik" className="h-12 w-auto" />
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider ring-1 ring-white/20 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            SAP S/4HANA Connected
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight">
            Digitize site receipts.
            <br />
            <span className="text-primary-foreground/70">Accelerate GRN posting.</span>
          </h1>
          <p className="text-sm leading-relaxed text-primary-foreground/80">
            One unified workspace for OCR-based invoice capture, SAP-integrated validations, GRN posting and finance
            tracking — across every project site.
          </p>
          <ul className="space-y-3 text-sm text-primary-foreground/90">
            {[
              "OCR invoice capture with confidence scoring",
              "Auto-validated PO, GSTIN, HSN & tax codes",
              "Real-time GRN, MIRO and payment tracking",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] text-primary-foreground/60">
          <span>© {new Date().getFullYear()} Rithwik Projects Pvt. Ltd.</span>
          <span>v2.4.1 · Build 24081</span>
        </div>
      </aside>

      {/* Right form panel */}
      <main className="flex min-h-screen flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center justify-end">
            <span className="rounded-full border bg-card px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Secure sign-in
            </span>
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight">Sign in to your workspace</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Use your corporate credentials, or pick a demo account below.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-xs font-medium">Company</Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="company" defaultValue="RITHWIK" readOnly className="h-11 pl-9 font-medium" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">Work email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@rithwik.com"
                  className="h-11 pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                <button type="button" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox id="remember" defaultChecked /> Keep me signed in for 30 days
              </label>
            </div>

            <Button type="submit" disabled={loading} className="h-11 w-full text-sm font-semibold">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Demo accounts
                </span>
              </div>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-500/20">
                For evaluation only
              </span>
            </div>

            <div className="grid gap-2">
              {DEMO_USERS.map((u) => (
                <div
                  key={u.id}
                  className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-shadow hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
                    {u.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{u.name}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${roleColors[u.role]}`}
                      >
                        {u.roleLabel}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => copy(u.email, "Email")}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        title="Copy email"
                      >
                        {u.email} <Copy className="h-3 w-3 opacity-60" />
                      </button>
                      <span className="opacity-40">·</span>
                      <button
                        type="button"
                        onClick={() => copy(u.password, "Password")}
                        className="inline-flex items-center gap-1 font-mono hover:text-foreground"
                        title="Copy password"
                      >
                        {u.password} <Copy className="h-3 w-3 opacity-60" />
                      </button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => useDemo(u)}
                    className="shrink-0"
                  >
                    Use
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
            By signing in you agree to Rithwik's{" "}
            <a href="#" className="font-medium text-foreground hover:underline">Terms of Use</a> and{" "}
            <a href="#" className="font-medium text-foreground hover:underline">Privacy Policy</a>. Activity is monitored
            for compliance.
          </p>
        </div>
      </main>
    </div>
  );
}
