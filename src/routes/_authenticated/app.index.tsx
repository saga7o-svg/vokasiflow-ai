import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMe, Loading } from "@/components/app/shell";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — VokasiFlow AI" },
      { name: "description", content: "Ringkasan program magang vokasi." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppIndexRedirect,
});

function AppIndexRedirect() {
  const { data: me, isPending, isError } = useMe();
  const navigate = useNavigate();

  useEffect(() => {
    if (me) {
      if (me.role === "ADMIN") {
        navigate({ to: "/app/admin/dashboard", replace: true });
      } else {
        navigate({ to: "/app/guru/dashboard", replace: true });
      }
    } else if (isError) {
      navigate({ to: "/auth", replace: true });
    }
  }, [me, isError, navigate]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <Loading count={2} />
      <p className="mt-4 text-xs text-muted-foreground animate-pulse">
        Mengarahkan ke dashboard Anda...
      </p>
    </div>
  );
}
