import { env } from "cloudflare:workers";
import { jsonError, requireUser } from "../../server-auth";

type AnalysisSheetResponse = { ok?: boolean; url?: string; created?: boolean; error?: string };
type RuntimeEnv = { ANALYSIS_SHEET_WEB_APP_URL?: string; ANALYSIS_SHEET_API_SECRET?: string };
type DiagnosticError = Error & { diagnosticCode?: string; diagnosticDetail?: string };

const FRIENDLY_ERROR = "分析シートを作成できませんでした。管理者にお問い合わせください。";

function diagnosticError(code: string, detail: string) {
  const error = new Error(detail) as DiagnosticError;
  error.diagnosticCode = code;
  error.diagnosticDetail = detail;
  return error;
}

export async function POST() {
  try {
    const user = await requireUser();
    const runtime = env as unknown as RuntimeEnv;
    const webAppUrl = runtime.ANALYSIS_SHEET_WEB_APP_URL?.trim();
    const apiSecret = runtime.ANALYSIS_SHEET_API_SECRET?.trim();
    if (!webAppUrl || !apiSecret) {
      const missing = [!webAppUrl && "ANALYSIS_SHEET_WEB_APP_URL", !apiSecret && "ANALYSIS_SHEET_API_SECRET"].filter(Boolean).join(", ");
      throw diagnosticError("CONFIG_MISSING", `Sitesの環境変数が未設定です: ${missing}`);
    }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/.test(webAppUrl)) {
      throw diagnosticError("WEB_APP_URL_INVALID", "ANALYSIS_SHEET_WEB_APP_URLにはApps Scriptの /exec URLを設定してください。");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    let response: Response;
    try {
      response = await fetch(webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: user.name, secret: apiSecret }),
        redirect: "follow",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const responseText = await response.text();
    let result: AnalysisSheetResponse;
    try {
      result = JSON.parse(responseText) as AnalysisSheetResponse;
    } catch {
      console.error("Apps Script returned non-JSON response", { status: response.status, responseText: responseText.slice(0, 500) });
      throw diagnosticError("APPS_SCRIPT_NON_JSON", `Apps ScriptがJSON以外を返しました（HTTP ${response.status}）。デプロイ設定とアクセス権を確認してください。`);
    }
    if (!response.ok || !result.ok || !result.url) {
      console.error("Apps Script returned an error", { status: response.status, appsScriptError: result.error || "unknown error" });
      throw diagnosticError("APPS_SCRIPT_ERROR", `Apps Script側で処理に失敗しました（HTTP ${response.status}）。Apps Scriptの実行ログを確認してください。`);
    }

    const sheetUrl = new URL(result.url);
    if (sheetUrl.protocol !== "https:" || sheetUrl.hostname !== "docs.google.com" || !sheetUrl.pathname.startsWith("/spreadsheets/")) {
      throw diagnosticError("SPREADSHEET_URL_INVALID", "Apps Scriptから返されたURLがGoogleスプレッドシートのURLではありません。");
    }
    return Response.json({ url: sheetUrl.toString(), created: result.created === true });
  } catch (error) {
    if (error instanceof Response) return jsonError(error);
    console.error("Analysis sheet creation failed", error);
    const diagnostic = error as DiagnosticError;
    const debug = {
      code: diagnostic.diagnosticCode || (diagnostic.name === "AbortError" ? "APPS_SCRIPT_TIMEOUT" : "UNEXPECTED_ERROR"),
      detail: diagnostic.diagnosticDetail || (diagnostic.name === "AbortError"
        ? "Apps Scriptから45秒以内に応答がありませんでした。Apps Scriptの実行ログを確認してください。"
        : "予期しないエラーです。Sitesのサーバーログを確認してください。"),
    };
    return Response.json({ error: FRIENDLY_ERROR, debug }, { status: 500 });
  }
}
