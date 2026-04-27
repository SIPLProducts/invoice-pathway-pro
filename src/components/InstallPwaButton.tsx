import { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export function InstallPwaButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(isStandalone());
  const [iosHintOpen, setIosHintOpen] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  // iOS Safari: no beforeinstallprompt. Show a small hint instead.
  if (!deferred && isIos()) {
    return (
      <Popover open={iosHintOpen} onOpenChange={setIosHintOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Share2 className="h-4 w-4" />
            <span className="hidden md:inline">Install</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 text-sm">
          <div className="font-medium mb-1">Install on iPhone / iPad</div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Tap the <span className="font-semibold">Share</span> icon in Safari, then
            choose <span className="font-semibold">“Add to Home Screen”</span>.
          </p>
        </PopoverContent>
      </Popover>
    );
  }

  if (!deferred) return null;

  const handleInstall = async () => {
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } catch {
      setDeferred(null);
    }
  };

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleInstall}>
      <Download className="h-4 w-4" />
      <span className="hidden md:inline">Install app</span>
    </Button>
  );
}
