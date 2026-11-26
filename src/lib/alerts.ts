import Swal from "sweetalert2";

const base = {
  confirmButtonColor: "hsl(var(--primary))",
  cancelButtonColor: "hsl(var(--muted-foreground))",
  background: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
};

export const alertSuccess = (title: string, text?: string) =>
  Swal.fire({ ...base, icon: "success", title, text });

export const alertError = (title: string, text?: string) =>
  Swal.fire({ ...base, icon: "error", title, text });

export const confirmAction = async (title: string, text?: string, confirmText = "Yes, post") =>
  (await Swal.fire({ ...base, icon: "question", title, text, showCancelButton: true, confirmButtonText: confirmText })).isConfirmed;
