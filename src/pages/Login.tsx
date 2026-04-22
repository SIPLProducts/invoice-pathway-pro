import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ShieldCheck, Lock, Mail, Building2, ArrowRight, CheckCircle2 } from "lucide-react";
import logo from "@/assets/rithwik-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("anil.kumar@rithwik.com");
  const [password, setPassword] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Welcome back, Anil");
      navigate("/");
    }, 900);
  };

  return (
    <div className="min-h-screen w-full bg-background lg:grid lg:grid-cols-[1fr_minmax(420px,520px)]">
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
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center justify-end">
            <span className="rounded-full border bg-card px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Secure sign-in
            </span>
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight">Sign in to your workspace</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Use your corporate credentials to access the DMR & GRN Portal.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-xs font-medium">Company</Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="company"
                  defaultValue="RITHWIK"
                  readOnly
                  className="h-11 pl-9 font-medium"
                />
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

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Button type="button" variant="outline" className="h-11">
                <ShieldCheck className="h-4 w-4" /> SAP SSO
              </Button>
              <Button type="button" variant="outline" className="h-11">
                <Lock className="h-4 w-4" /> Microsoft 365
              </Button>
            </div>
          </form>

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
