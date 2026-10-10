import { useEffect, useState } from "react";
import { normalizeCode } from "../shared/protocol";
import { Home } from "./Home";
import { Table } from "./table/Table";

function codeFromPath(): string | null {
  const m = window.location.pathname.match(/^\/r\/([A-Za-z0-9]+)/);
  return m ? normalizeCode(m[1]) : null;
}

export function navigate(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function App() {
  const [code, setCode] = useState(codeFromPath);

  useEffect(() => {
    const onPop = () => setCode(codeFromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return code ? <Table code={code} /> : <Home />;
}
