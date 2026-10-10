import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AicoLogo } from "@/components/brand/AicoLogo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(237,252,243,0.92))] p-8 text-center shadow-[0_30px_80px_-55px_rgba(7,130,95,0.75)]">
        <AicoLogo className="mx-auto w-44" />
        <h1 className="font-display mt-6 text-5xl font-semibold tracking-tight text-foreground">404</h1>
        <p className="mt-3 text-lg text-muted-foreground">Aradiginiz ekran AICO akisinda bulunamadi.</p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Komuta paneline don
        </a>
      </div>
    </div>
  );
};

export default NotFound;
