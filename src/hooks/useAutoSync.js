import { useEffect } from "react";
import { syncOutbox } from "../offline/syncEngine";

export function useAutoSync() {
  useEffect(() => {
    const run = () => syncOutbox().catch(console.error);

    window.addEventListener("online", run);
    const t = setInterval(run, 60_000);

    run(); // al iniciar

    return () => {
      window.removeEventListener("online", run);
      clearInterval(t);
    };
  }, []);
}
