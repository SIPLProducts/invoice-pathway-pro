import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-card">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ready ? "Choose a strong password for your account." : "Open this page from the reset link in your email."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pwd" className="text-xs font-medium">New password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pwd2" className="text-xs font-medium">Confirm password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="pwd2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11 pl-9" />
            </div>
          </div>
          <Button type="submit" disabled={!ready || saving} className="h-11 w-full font-semibold">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
