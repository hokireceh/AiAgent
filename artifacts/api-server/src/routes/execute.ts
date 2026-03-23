import { Router, type IRouter } from "express";

const router: IRouter = Router();
const PISTON_API = "https://emkc.org/api/v2/piston";

let runtimesCache: any[] | null = null;
let runtimesCacheTime = 0;

async function getPistonRuntimes() {
  const now = Date.now();
  if (runtimesCache && now - runtimesCacheTime < 5 * 60 * 1000) return runtimesCache;
  const res = await fetch(`${PISTON_API}/runtimes`);
  if (!res.ok) throw new Error("Piston unavailable");
  runtimesCache = await res.json();
  runtimesCacheTime = now;
  return runtimesCache!;
}

const LANG_MAP: Record<string, string> = {
  python: "python", javascript: "javascript", typescript: "typescript",
  cpp: "c++", c: "c", java: "java", go: "go", rust: "rust",
  php: "php", ruby: "ruby", bash: "bash", r: "r", swift: "swift",
};

async function resolveLang(language: string) {
  const runtimes = await getPistonRuntimes();
  const target = LANG_MAP[language.toLowerCase()] ?? language.toLowerCase();
  const runtime = runtimes.find(
    (r: any) => r.language === target || r.aliases?.includes(target) ||
                r.language === language.toLowerCase() || r.aliases?.includes(language.toLowerCase())
  );
  return runtime
    ? { language: runtime.language, version: runtime.version }
    : { language: language.toLowerCase(), version: "*" };
}

// Get runtimes
router.get("/runtimes", async (req, res) => {
  try {
    const runtimes = await getPistonRuntimes();
    res.json({ runtimes });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch runtimes");
    res.status(503).json({ error: "service_unavailable", runtimes: [] });
  }
});

// Execute code
router.post("/", async (req, res) => {
  const { language, code, stdin = "", version } = req.body;

  if (!language || !code) {
    return res.status(400).json({ error: "validation_error", message: "language and code required" });
  }

  try {
    const resolved = (!version || version === "*")
      ? await resolveLang(language)
      : { language: LANG_MAP[language.toLowerCase()] ?? language.toLowerCase(), version };

    const payload = {
      language: resolved.language,
      version: resolved.version,
      files: [{ content: code }],
      stdin,
      args: [],
      compile_timeout: 15000,
      run_timeout: 15000,
      compile_memory_limit: -1,
      run_memory_limit: -1,
    };

    const pistonRes = await fetch(`${PISTON_API}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!pistonRes.ok) {
      const text = await pistonRes.text();
      req.log.error({ text }, "Piston execution failed");
      return res.status(pistonRes.status).json({ error: "execution_failed", message: text });
    }

    const data: any = await pistonRes.json();
    const run = data.run ?? {};
    const compile = data.compile ?? {};

    const stdout = run.stdout ?? "";
    const compileErr = [compile.stderr, compile.stdout].filter(Boolean).join("\n");
    const stderr = [compileErr, run.stderr].filter(Boolean).join("\n");
    const output = stdout + (stderr ? (stdout ? "\n" : "") + stderr : "");
    const exitCode = run.code ?? compile.code ?? 0;

    res.json({
      stdout,
      stderr,
      output,
      exitCode,
      language: data.language ?? resolved.language,
      version: data.version ?? resolved.version,
      cpuTime: run.cpu_time ?? null,
      wallTime: run.wall_time ?? null,
    });
  } catch (err: any) {
    req.log.error({ err }, "Execute route error");
    res.status(500).json({
      stdout: "",
      stderr: err.message ?? "Execution error",
      output: err.message ?? "Execution error",
      exitCode: 1,
      language,
      version: version ?? "unknown",
      cpuTime: null,
      wallTime: null,
    });
  }
});

export default router;
