import { env } from "cloudflare:workers";
import { jsonError, requireUser } from "../../server-auth";

type AnalysisSheetResponse = { ok?: boolean; url?: string; created?: boolean; error?: string };
type RuntimeEnv = { ANALYSIS_SHEET_WEB_APP_URL?: string; ANALYSIS_SHEET_API_SECRET?: string };

const FRIENDLY_ERROR = "分析シートを作成できませんでした。管理者にお問い合わせください。";

export async function POST() {
  try {
    const user = await requireUser();
    const runtime = env as unknown as RuntimeEnv;
    const webAppUrl = runtime.ANALYSIS_SHEET_WEB_APP_URL?.trim();
    const apiSecret = runtime.ANALYSIS_SHEET_API_SECRET?.trim();
    if (!webAppUrl || !apiSecret) throw new Error("Analysis sheet integration is not configured");

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
      throw new Error(`Apps Script returned non-JSON response (${response.status}): ${responseText.slice(0, 200)}`);
    }
    if (!response.ok || !result.ok || !result.url) throw new Error(`Apps Script error (${response.status}): ${result.error || "unknown error"}`);

    const sheetUrl = new URL(result.url);
    if (sheetUrl.protocol !== "https:" || sheetUrl.hostname !== "docs.google.com" || !sheetUrl.pathname.startsWith("/spreadsheets/")) {
      throw new Error("Apps Script returned an unexpected spreadsheet URL");
    }
    return Response.json({ url: sheetUrl.toString(), created: result.created === true });
  } catch (error) {
    if (error instanceof Response) return jsonError(error);
    console.error("Analysis sheet creation failed", error);
    return Response.json({ error: FRIENDLY_ERROR }, { status: 500 });
  }
}
