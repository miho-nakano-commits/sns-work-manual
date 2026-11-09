"use client";

import { FormEvent, useContext, useEffect, useState } from "react";

import { mediaUrl } from "./media-catalog";
import { STEPS, type Screen, type StepData } from "./curriculum";
import { TOTAL_STEPS, STEP5_VIDEO_COUNT, STEP6_VIDEO_COUNT, practiceCompletedCount, STEP3_CHECK_PREFIX, initialState, normalizeProgress, changeCheck, markStepIncomplete, type SavedState } from "./progress";
import { StepFiveContent } from "./step-five";
import { currentPracticeVideo, prepareStepFive, selectPracticeVideo } from "./step-five-progress";
import { practiceIds } from "./practice-catalog";
import { Encouragement } from "./step-five";
import { restoreDraft, useProgressSave, type ProgressBaseline } from "./use-progress-save";
import { driveProgressView } from "./drive-model";
import { DriveContext, DrivePanel, useDriveSave } from "./drive-ui";
import { DriveFolderAdmin } from "./drive-admin";
import { StaffReviewLink } from "./staff-review-link";
import { ZoomGuideCard, ZoomGuideEntry } from "./zoom-guide";

type SessionUser = { id: string; name: string; role: "user" | "admin" };
type AdminProgress = { id: string; name: string; progressRate: number; currentStep: number; completedCount: number; lastWorkedStep: number; updatedAt: string | null; step5CompletedCount: number; step6CompletedCount: number; legacySubmissionCount: number; driveStep4Saved: boolean; driveStep5Count: number; driveStep6Count: number; driveProgressRate: number; driveCompletedCount: number; oldCompleted: number[]; driveUpdatedAt: string | null };
const ANALYSIS_SHEET_URL_KEY = "analysisSheetUrl";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = await response.json() as T & { error?: string; debug?: { code?: string; detail?: string } };
  if (!response.ok && data.debug) console.error(`[${data.debug.code || "API_ERROR"}] ${data.debug.detail || "詳細なし"}`);
  if (!response.ok) throw new Error(data.error || "処理に失敗しました");
  return data;
}

export default function Home() {
  const [view, setView] = useState<"home" | "step" | "complete">("home");
  const [stepId, setStepId] = useState(1);
  const [page, setPage] = useState(0);
  const [saved, setSaved] = useState<SavedState>(initialState);
  const [session, setSession] = useState<SessionUser | null>(null);
  const drive = useDriveSave(session?.id, session?.role === "admin");
  const displaySaved = driveProgressView(saved, drive.data.checks);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [ready, setReady] = useState(false);
  const [progressReady, setProgressReady] = useState(false);
  const [progressBaseline, setProgressBaseline] = useState<ProgressBaseline | null>(null);
  const { saveStatus, flush, saveError, hasStoredDraft } = useProgressSave(saved, session?.id, progressReady && session?.role === "user", progressBaseline);
  const combinedSaveStatus = drive.error ? "error" : drive.busy ? "saving" : saveStatus;
  const [loadError, setLoadError] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [analysisSheetBusy, setAnalysisSheetBusy] = useState(false);
  const [analysisSheetError, setAnalysisSheetError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const me = await api<{ user: SessionUser | null }>("/api/me");
        if (me.user) {
          const data = await api<{ progress: SavedState; revision: string }>("/api/progress");
          setProgressBaseline({ progress: data.progress, revision: data.revision }); setSession(me.user); setSaved(restoreDraft(me.user.id, data.progress)); setProgressReady(true); setShowAdmin(me.user.role === "admin");
        } else {
          const data = await api<{ needsSetup: boolean }>("/api/auth/users");
          setNeedsSetup(data.needsSetup);
        }
      } catch { setLoadError("進み具合を読み込めませんでした。ページを再読み込みしてください。"); }
      setReady(true);
    })();
  }, []);

  const step = STEPS[stepId - 1];
  const screen = step.screens[page];
  const completedSteps = displaySaved.completed.filter(id => id >= 1 && id <= TOTAL_STEPS);
  const totalProgress = Math.round((completedSteps.length / TOTAL_STEPS) * 100);
  const pageProgress = stepId >= 5 ? Math.round(practiceCompletedCount(displaySaved.checks, stepId) / practiceIds(stepId).length * 100) : Math.round(((page + 1) / step.screens.length) * 100);
  const screenKey = stepId === 3 && screen.type === "checklist" ? STEP3_CHECK_PREFIX : `${stepId}-${page}`;
  const allChecked = screen && (screen.type === "checklist" ? (screen.items || []).every((_, i) => displaySaved.checks[`${screenKey}-${i}`]) : screen.type === "practiceComplete" ? practiceCompletedCount(displaySaved.checks, stepId) === practiceIds(stepId).length : true);

  const startStep = (requestedId: number) => { const id = Math.min(TOTAL_STEPS, Math.max(1, requestedId)); const resumed = id >= 5 ? prepareStepFive(displaySaved, id) : saved; const savedPage = Math.min(resumed.position[id] || 0, STEPS[id - 1].screens.length - 1); setStepId(id); setPage(savedPage); setSaved({ ...saved, form: {...saved.form, ...resumed.form}, currentStep: id, lastWorkedStep: id, position: { ...resumed.position, [id]: savedPage } }); setView("step"); setHintOpen(false); window.scrollTo(0, 0); };
  const goHome = () => { setView("home"); window.scrollTo(0, 0); };
  const next = () => {
    if (!allChecked) return;
    if (page < step.screens.length - 1) {
      const nextPage = page + 1; setPage(nextPage); setSaved(s => ({ ...s, currentStep: stepId, lastWorkedStep: stepId, position: { ...s.position, [stepId]: nextPage } })); setHintOpen(false); window.scrollTo(0, 0); return;
    }
    const completed = stepId <= 3 ? Array.from(new Set([...saved.completed, stepId])) : saved.completed;
    const nextStep = Math.min(stepId + 1, TOTAL_STEPS);
    const progressed = normalizeProgress({ ...saved, completed, currentStep: nextStep, lastWorkedStep: nextStep, position: { ...saved.position, [stepId]: page } });
    const navigation = nextStep >= 5 ? prepareStepFive(driveProgressView(progressed, drive.data.checks), nextStep) : progressed;
    const resumed = {...progressed, form: {...progressed.form,...navigation.form}, position: navigation.position};
    setSaved(resumed);
    if (stepId === TOTAL_STEPS) setView("complete"); else { setStepId(stepId + 1); setPage(Math.min(resumed.position[stepId + 1] || 0, STEPS[stepId].screens.length - 1)); setView("step"); }
    window.scrollTo(0, 0);
  };
  const back = () => { if (page > 0) { const previous = page - 1; setPage(previous); setSaved(s => ({ ...s, position: { ...s.position, [stepId]: previous }, currentStep: stepId, lastWorkedStep: stepId })); setHintOpen(false); window.scrollTo(0, 0); } else goHome(); };
  const updateCheck = (key: string, value: boolean) => {
    if (key === "4-5-4" || key.startsWith("practice:")) {
      const contentId = key === "4-5-4" ? "step4-first-video" : key.split(":")[1];
      void drive.saveCheck(contentId,value).then(ok=>{if(ok && stepId>=5 && value && practiceIds(stepId).every(id=>id===contentId || drive.data.checks[id])) stepFivePage(2);});
      return;
    }
    const updated = changeCheck(stepId >= 5 ? prepareStepFive(saved, stepId) : saved, key, value);
    // Historical completions stay historical even when the new checklist changes.
    updated.completed = [...updated.completed.filter(id=>id<=3), ...saved.completed.filter(id=>id>=4)];
    if (stepId >= 5 && practiceCompletedCount(updated.checks, stepId) === practiceIds(stepId).length && value) {
      updated.position[stepId] = 2;
      setPage(2);
      window.scrollTo(0, 0);
    }
    setSaved(updated);
  };
  const selectVideo = (index: number) => { setSaved(state => {const selected = selectPracticeVideo(driveProgressView(state,drive.data.checks),index,stepId); return {...state,position:selected.position,form:{...state.form,...selected.form},currentStep:stepId,lastWorkedStep:stepId};}); setPage(1); window.scrollTo(0, 0); };
  const stepFivePage = (target: number) => { setSaved(state => ({ ...state, position: { ...state.position, [stepId]: target } })); setPage(target); window.scrollTo(0, 0); };
  const markIncomplete = (id: number) => { if(id>=4) {for(const contentId of id===4?["step4-first-video"]:practiceIds(id)) void drive.saveCheck(contentId,false);} else setSaved(s=>markStepIncomplete(s,id)); };
  const createAnalysisSheet = async () => {
    if (analysisSheetBusy) return;
    setAnalysisSheetBusy(true); setAnalysisSheetError("");
    try {
      const data = await api<{ url: string }>("/api/analysis-sheet", { method: "POST", body: "{}" });
      setSaved(s => ({ ...s, form: { ...s.form, [ANALYSIS_SHEET_URL_KEY]: data.url } }));
    } catch (error) {
      console.error("Analysis sheet request failed", error);
      setAnalysisSheetError("分析シートを作成できませんでした。管理者にお問い合わせください。");
    } finally {
      setAnalysisSheetBusy(false);
    }
  };

  const finishLogin = async (user: SessionUser) => {
    const data = await api<{ progress: SavedState; revision: string }>("/api/progress");
    setProgressBaseline({ progress: data.progress, revision: data.revision }); setSession(user); setSaved(restoreDraft(user.id, data.progress)); setProgressReady(true); setShowAdmin(user.role === "admin"); setView("home");
  };
  const logout = async () => {
    if (!await drive.flush() || !await flush()) return;
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    const data = await api<{ needsSetup: boolean }>("/api/auth/users");
    setSession(null); setProgressReady(false); setProgressBaseline(null); setSaved(initialState); setNeedsSetup(data.needsSetup); setShowAdmin(false); setView("home");
  };

  const saveNotice = <>{saveError && <p className="form-error" role="alert">{saveError}</p>}{hasStoredDraft && <p role="status">この端末に未保存の記録を保管しています。古い記録は最新の進捗へ自動反映しません。</p>}</>;

  if (!ready) return <main className="loading">読み込んでいます…</main>;

  if (loadError) return <main className="auth-page"><section className="auth-card"><h1>読み込みを確認してください</h1><p role="alert">{loadError}</p><button className="primary-button" onClick={() => window.location.reload()}>再読み込み</button></section></main>;

  if (session && !drive.ready) return <main className="auth-page"><section className="auth-card"><h1>保存先を読み込んでいます</h1>{drive.error && <p role="alert">{drive.error}</p>}<button onClick={()=>window.location.reload()}>再読み込み</button></section></main>;

  if (!session) return needsSetup
    ? <SetupScreen onReady={finishLogin} />
    : <LoginScreen onLogin={finishLogin} />;

  if (session.role === "admin" && showAdmin) return <>{saveNotice}<StaffReviewLink /><AdminScreen user={session} onManual={() => setShowAdmin(false)} onLogout={logout} /></>;

  if (view === "home") return <>{saveNotice}<StaffReviewLink />{drive.error && <p className="form-error" role="alert">{drive.error}</p>}<HomeScreen user={session} saved={displaySaved} legacySaved={saved} totalProgress={totalProgress} startStep={startStep} markIncomplete={markIncomplete} onLogout={logout} onAdmin={session.role === "admin" ? () => setShowAdmin(true) : undefined} saveStatus={combinedSaveStatus} onRetry={() => {void drive.flush();void flush();}} /></>;
  if (view === "complete") return <>{saveNotice}<Celebration completed={completedSteps} onHome={goHome} /></>;

  return (
    <DriveContext.Provider value={{folderUrl:drive.data.folderUrl,ready:drive.ready,busy:drive.busy,error:drive.error,retry:()=>{void drive.flush();}}}><main className="app-shell">{saveNotice}
      <header className="topbar">
        <button className="brand-button" onClick={goHome} aria-label="トップへ戻る"><span className="brand-mark">S</span><span>SNSお仕事マニュアル</span></button>
        <div className="account-actions"><span>{session.name}さん</span><SaveIndicator status={combinedSaveStatus} onRetry={() => {void drive.flush();void flush();}} /><button className="text-button" onClick={goHome}>トップへ</button><button className="text-button" onClick={() => void logout()}>ログアウト</button></div>
      </header>
      <div className="step-layout">
        <aside className="step-sidebar">
          <p className="eyebrow">STEP {stepId}</p>
          <h1>{step.short}</h1>
          <div className="position"><strong>{stepId >= 5 ? `${practiceCompletedCount(displaySaved.checks, stepId)} / ${practiceIds(stepId).length}本 完成` : `${page + 1} / ${step.screens.length}`}</strong><span>{pageProgress}%</span></div>
          <div className="progress-track" aria-label={`進捗 ${pageProgress}%`}><span style={{ width: `${pageProgress}%` }} /></div>
          <p className="now-label">いま：{screen.title}</p>
          <nav className="dot-nav" aria-label="このSTEPの画面">
            {step.screens.map((s, i) => <button key={i} className={i === page ? "active" : i < page ? "done" : ""} onClick={() => { setPage(i); setSaved(state => ({ ...state, currentStep: stepId, lastWorkedStep: stepId, position: { ...state.position, [stepId]: i } })); setHintOpen(false); }} aria-label={`${i + 1}. ${s.title}`}><span>{i < page ? "✓" : i + 1}</span><em>{s.title}</em></button>)}
          </nav>
        </aside>
        <section className={`lesson tone-${step.tone}`}>
          <div className="mobile-progress"><span>STEP {stepId}　{stepId >= 5 ? `${practiceCompletedCount(displaySaved.checks, stepId)} / ${practiceIds(stepId).length}本 完成` : `${page + 1} / ${step.screens.length}`}</span><strong>{pageProgress}%</strong></div>
          <div className="progress-track mobile"><span style={{ width: `${pageProgress}%` }} /></div>
          <p className="section-kicker">{screen.type === "checklist" ? "最後の確認" : `LESSON ${String(page + 1).padStart(2, "0")}`}</p>
          <h2>{screen.type === "intro" && stepId < 5 ? step.title : screen.title}</h2>
          <ScreenContent key={`${stepId}-${page}`} screen={screen} step={step} saved={displaySaved} legacySaved={saved} screenKey={screenKey} updateCheck={updateCheck} analysisSheetUrl={saved.form[ANALYSIS_SHEET_URL_KEY] || ""} analysisSheetBusy={analysisSheetBusy} analysisSheetError={analysisSheetError} createAnalysisSheet={createAnalysisSheet} onSelectVideo={selectVideo} onExplanation={() => stepFivePage(0)} onShowClear={() => stepFivePage(2)} />
          {((stepId === 5 && (screen.type === "practiceComplete" || (screen.type === "practiceVideo" && currentPracticeVideo(displaySaved, 5) === STEP5_VIDEO_COUNT - 1))) || (stepId === 6 && page === 0)) && <ZoomGuideEntry />}
          {screen.hint && <div className="hint-wrap"><button className="hint-button" onClick={() => setHintOpen(!hintOpen)} aria-expanded={hintOpen}>💡 ヒントを見る</button>{hintOpen && <div className="hint-box">{screen.hint}</div>}</div>}
          {screen.type !== "practiceVideo" && <div className="lesson-actions">
            <button className="secondary-button" onClick={back}>← 戻る</button>
            <button className="primary-button" onClick={next} disabled={!allChecked}>{page === step.screens.length - 1 ? `STEP${stepId} 完了` : "次へ →"}</button>
          </div>}
          {!allChecked && <p className="disabled-note">{stepId >= 5 ? `${practiceIds(stepId).length}本すべてをGoogleドライブに保存し、チェックすると完了できます` : "すべてにチェックすると完了できます"}</p>}
        </section>
      </div>
    </main></DriveContext.Provider>
  );
}

function SaveIndicator({ status, onRetry }: { status: "saved" | "saving" | "error"; onRetry: () => void }) {
  return <span className={`save-state ${status}`} role="status">{status === "error" ? <button type="button" className="text-button" onClick={onRetry}>保存できません・再試行</button> : status === "saving" ? "保存中…" : "✓ 保存済み"}</span>;
}

function SetupScreen({ onReady }: { onReady: (user: SessionUser) => Promise<void> }) {
  const [name, setName] = useState(""); const [pin, setPin] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); setBusy(true); try { const data = await api<{ user: SessionUser }>("/api/admin/bootstrap", { method: "POST", body: JSON.stringify({ name, pin }) }); await onReady(data.user); } catch (e) { setError(e instanceof Error ? e.message : "初期設定に失敗しました"); } finally { setBusy(false); } };
  return <main className="auth-page"><section className="auth-card setup-card"><div className="auth-emblem">S</div><p className="eyebrow">FIRST SETUP</p><h1>最初の管理者を登録</h1><p>最初に一度だけ、利用者を登録する管理者アカウントを作ります。</p><form onSubmit={submit}><label><span>管理者名</span><input value={name} onChange={e => setName(e.target.value)} maxLength={40} autoComplete="name" placeholder="例：支援員 田中" required /></label><label><span>管理者PIN（数字4桁）</span><input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" pattern="\d{4}" autoComplete="new-password" placeholder="••••" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy || pin.length !== 4}>{busy ? "登録中…" : "管理者を登録する"}</button></form><p className="auth-note">登録後、管理者画面から30〜40名分の利用者名とPINを追加できます。</p></section></main>;
}

function LoginScreen({ onLogin }: { onLogin: (user: SessionUser) => Promise<void> }) {
  const [name, setName] = useState(""); const [pin, setPin] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); setBusy(true); try { const data = await api<{ user: SessionUser }>("/api/auth/login", { method: "POST", body: JSON.stringify({ name, pin }) }); await onLogin(data.user); } catch { setError("氏名またはPINコードが正しくありません。"); } finally { setBusy(false); } };
  return <main className="auth-page"><section className="auth-card"><div className="auth-emblem">S</div><p className="eyebrow">SNS WORK QUEST</p><h1>SNSお仕事マニュアル</h1><p>氏名と4桁のPINコードを入力してください。</p><form onSubmit={submit} autoComplete="off"><label><span>氏名</span><input value={name} onChange={e => setName(e.target.value)} maxLength={40} autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="氏名を入力" required /></label><label><span>4桁PIN</span><input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" pattern="\d{4}" autoComplete="new-password" placeholder="••••" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy || !name.trim() || pin.length !== 4}>{busy ? "確認中…" : "ログイン"}</button></form><p className="auth-note">PINを忘れた場合は、管理者へお知らせください。</p></section></main>;
}

function AdminScreen({ user, onManual, onLogout }: { user: SessionUser; onManual: () => void; onLogout: () => Promise<void> }) {
  const [rows, setRows] = useState<AdminProgress[]>([]); const [name, setName] = useState(""); const [pin, setPin] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { const data = await api<{ users: AdminProgress[] }>("/api/admin/progress"); setRows(data.users); } catch (e) { setError(e instanceof Error ? e.message : "一覧を取得できませんでした"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const addUser = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(""); try { await api("/api/admin/users", { method: "POST", body: JSON.stringify({ name, pin }) }); setName(""); setPin(""); await load(); } catch (e) { setError(e instanceof Error ? e.message : "登録できませんでした"); } finally { setBusy(false); } };
  return <main className="admin-page"><header className="topbar"><div className="brand"><span className="brand-mark">S</span><span>SNSお仕事マニュアル</span></div><div className="account-actions"><span>{user.name}さん</span><button className="text-button" onClick={onManual}>マニュアルを見る</button><button className="text-button" onClick={() => void onLogout()}>ログアウト</button></div></header><div className="admin-wrap"><section className="admin-heading"><div><p className="eyebrow">ADMIN QUEST BOARD</p><h1>利用者の進捗</h1><p>利用者ごとの進み具合と最終作業日時を確認できます。</p></div><div className="admin-count"><strong>{rows.length}</strong><span>利用者</span></div></section><section className="admin-panel add-user"><h2>利用者を登録</h2><form onSubmit={addUser}><label><span>利用者名</span><input value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="例：山田さん" required /></label><label><span>4桁PIN</span><input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" pattern="\d{4}" placeholder="••••" required /></label><button className="primary-button" disabled={busy || pin.length !== 4}>{busy ? "登録中…" : "利用者を追加"}</button></form>{error && <p className="form-error" role="alert">{error}</p>}<p className="admin-help">利用者へ、入力する氏名とPINを個別に伝えてください。</p></section><DriveFolderAdmin /><section className="admin-panel"><div className="panel-title"><h2>進捗一覧</h2><button className="secondary-button compact" onClick={() => void load()}>更新</button></div>{loading ? <p>読み込んでいます…</p> : rows.length === 0 ? <div className="empty-state">利用者を登録すると、ここに進捗が表示されます。</div> : <div className="progress-table-wrap"><table className="progress-table"><thead><tr><th>利用者名</th><th>新方式の進捗率</th><th>現在</th><th>完了</th><th>STEP4の保存</th><th>STEP5の保存</th><th>STEP6の保存</th><th>旧記録（保管）</th><th>最終作業日時</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.name}</strong></td><td><div className="table-progress"><span><i style={{ width: `${row.driveProgressRate}%` }} /></span><b>{row.driveProgressRate}%</b></div></td><td>STEP {row.currentStep}</td><td>{row.driveCompletedCount} / {TOTAL_STEPS}</td><td>{row.driveStep4Saved ? "保存完了" : "保存未確認"}</td><td>{row.driveStep5Count} / {STEP5_VIDEO_COUNT}本</td><td>{row.driveStep6Count} / {STEP6_VIDEO_COUNT}本</td><td>旧完了STEP：{row.oldCompleted.join("・") || "なし"}<br />旧提出：Step5 {row.step5CompletedCount}本／Step6 {row.step6CompletedCount}本<br />番号のみの旧記録：{row.legacySubmissionCount}件</td><td>{formatDate(row.driveUpdatedAt || row.updatedAt)}</td></tr>)}</tbody></table></div>}</section></div></main>;
}

function formatDate(value: string | null) {
  if (!value) return "未実施";
  const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(normalized));
}

function HomeScreen({ user, saved, legacySaved, totalProgress, startStep, markIncomplete, onLogout, onAdmin, saveStatus, onRetry }: { user: SessionUser; saved: SavedState; legacySaved: SavedState; totalProgress: number; startStep: (id: number) => void; markIncomplete: (id: number) => void; onLogout: () => Promise<void>; onAdmin?: () => void; saveStatus: "saved" | "saving" | "error"; onRetry: () => void }) {
  const completed = saved.completed.filter(id => id >= 1 && id <= TOTAL_STEPS);
  const currentStep = Math.min(TOTAL_STEPS, Math.max(1, saved.currentStep));
  const lastWorkedStep = Math.min(TOTAL_STEPS, Math.max(1, saved.lastWorkedStep));
  return <main className="home">
    <p className="drive-panel">Step4〜Step6はGoogleドライブ保存方式の進捗を表示しています。旧方式で完了したSTEP：{legacySaved.completed.filter(id=>id>=4).join("・") || "なし"}（旧記録は保管）。以前の提出チェックを新しい保存完了チェックには自動変換していません。</p>
    <header className="home-nav"><div className="brand"><span className="brand-mark">S</span><span>SNSお仕事マニュアル</span></div><div className="account-actions"><span>{user.name}さん</span><SaveIndicator status={saveStatus} onRetry={onRetry} />{onAdmin && <button className="text-button" onClick={onAdmin}>管理者画面</button>}<button className="text-button" onClick={() => void onLogout()}>ログアウト</button></div></header>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">SNS WORK STARTER</p><h1>はじめての<br /><em>SNS運用</em><br />お仕事マニュアル</h1><p className="hero-lead">読むだけではなく、考えて、選んで、確認する。<br />一人で作業を始めるための体験型マニュアルです。</p><button className="primary-button large" onClick={() => startStep(lastWorkedStep)}>{completed.length || Object.keys(saved.position).length ? "前回の続きから始める" : "STEP1からはじめる"} →</button></div>
      <div className="hero-board"><div className="board-top"><span>YOUR PROGRESS</span><strong>{totalProgress}%</strong></div><div className="progress-track hero-track"><span style={{ width: `${totalProgress}%` }} /></div><p>{completed.length === 0 ? "最初のSTEPから、ゆっくり始めましょう。" : completed.length === TOTAL_STEPS ? "すべてのSTEPをクリアしました！" : `${completed.length} / ${TOTAL_STEPS} STEP完了しています。`}</p><div className="skill-pills"><span>調べる</span><span>考える</span><span>つくる</span></div></div>
    </section>
    <section className="user-progress-panel"><div className="progress-title"><div><p className="eyebrow">MY QUEST STATUS</p><h2>{user.name}さんの進捗</h2></div><strong>{totalProgress}%</strong></div><div className="user-progress-stats"><div><span>完了STEP</span><b>{completed.length} / {TOTAL_STEPS}</b></div><div><span>前回作業したSTEP</span><b>STEP {lastWorkedStep}</b></div><div><span>現在のSTEP</span><b>STEP {currentStep}</b></div></div><div className="step-status-list">{STEPS.map(step => { const status = completed.includes(step.id) ? "完了" : step.id === currentStep || saved.position[step.id] !== undefined || (step.id >= 5 && practiceCompletedCount(saved.checks, step.id) > 0) ? "作業中" : "未実施"; return <button key={step.id} className={status === "完了" ? "complete" : status === "作業中" ? "current" : "pending"} onClick={() => startStep(step.id)}><span>STEP {step.id}</span><strong>{step.short}</strong><em>{status}</em></button>; })}</div></section>
    <section className="can-do"><p className="eyebrow">このアプリでできるようになること</p><div className="can-grid"><div><b>01</b><span>良いお手本を<br />見つける</span></div><div><b>02</b><span>理由を考えて<br />判断する</span></div><div><b>03</b><span>動画をつくり<br />自分で確認する</span></div></div></section>
    <section className="curriculum">
      <div className="section-heading"><div><p className="eyebrow">BASIC COURSE</p><h2>基本編</h2><p>まずは「調べる・編集する」仕事の基本から。</p></div><span className="course-badge">STEP 1—5</span></div>
      <div className="step-grid">{STEPS.filter(s => s.id <= 5).map(s => <StepCard key={s.id} step={s} completed={completed.includes(s.id)} onStart={() => startStep(s.id)} onIncomplete={() => markIncomplete(s.id)} />)}</div>
    </section>
    <ZoomGuideCard />
    <section className="curriculum" id="step6-course"><div className="section-heading"><div><p className="eyebrow">ADVANCED COURSE</p><h2>応用編</h2><p>ズームと音声編集を、自分のペースで練習しましょう。</p></div><span className="course-badge">STEP 6</span></div><div className="step-grid">{STEPS.filter(s => s.id === 6).map(s => <StepCard key={s.id} step={s} completed={completed.includes(s.id)} onStart={() => startStep(s.id)} onIncomplete={() => markIncomplete(s.id)} />)}</div></section>
    <footer><span className="brand-mark">S</span><p>少しずつ、確実に。<br /><small>進み具合はアカウントごとに自動で保存されます。</small></p></footer>
  </main>
}

function StepCard({ step, completed, onStart, onIncomplete }: { step: StepData; completed: boolean; onStart: () => void; onIncomplete: () => void }) {
  return <article className={`step-card tone-${step.tone}`}><div className="card-number">{String(step.id).padStart(2,"0")}</div><div className="card-status">{completed ? "✓ クリア" : step.id === 6 ? "応用" : "基本"}</div><p>STEP {step.id}</p><h3>{step.short}</h3><div className="outcome"><span>できるようになること</span>{step.outcome}</div><div className="card-actions"><button onClick={onStart}>{completed ? "もう一度見る" : "このSTEPを始める"}<span>→</span></button>{completed && <button className="card-reset" onClick={onIncomplete}>{step.id >= 5 ? `${practiceIds(step.id).length}本のチェックを外す` : "未完に戻す"}</button>}</div></article>
}

function ScreenContent({ screen, step, saved, legacySaved, screenKey, updateCheck, analysisSheetUrl, analysisSheetBusy, analysisSheetError, createAnalysisSheet, onSelectVideo, onExplanation, onShowClear }: { screen: Screen; step: StepData; saved: SavedState; legacySaved: SavedState; screenKey: string; updateCheck: (k:string,v:boolean)=>void; analysisSheetUrl: string; analysisSheetBusy: boolean; analysisSheetError: string; createAnalysisSheet: () => Promise<void>; onSelectVideo: (index: number) => void; onExplanation: () => void; onShowClear: () => void }) {
  if (screen.type.startsWith("practice")) return <><Lead text={screen.lead} /><StepFiveContent stepId={step.id} type={screen.type} saved={saved} legacySaved={legacySaved} update={updateCheck} onSelectVideo={onSelectVideo} onExplanation={onExplanation} onShowClear={onShowClear} /></>;
  if (screen.type === "intro" && step.id >= 5) return <><Lead text={screen.lead} /><Encouragement count={practiceCompletedCount(saved.checks, step.id)} /><Flow steps={screen.items || []} /></>;
  if (screen.type === "why" || screen.type === "process") return <><Lead text={screen.lead} /><Flow steps={screen.steps || []} /></>;
  if (screen.type === "decision") return <Decision steps={screen.steps || []} hint={screen.hint || ""} />;
  if (screen.type === "compare") return <Compare ok={screen.ok || []} ng={screen.ng || []} />;
  if (screen.type === "referenceVideo") return <><Lead text={screen.lead} /><ReferenceVideo /></>;
  if (screen.type === "resources") return <><Lead text={screen.lead} /><EditingResources /></>;
  if (screen.type === "video") return <><Lead text={screen.lead} /><div className="reference-video"><video controls playsInline preload="metadata"><source src={mediaUrl(step.videoUrl)} type="video/mp4" />お使いのブラウザは動画の再生に対応していません。</video><p>再生ボタンを押して、実際の編集操作を確認してください。</p></div></>;
  if (screen.type === "checklist") return <><Lead text={screen.lead} />{step.id===4 && <><DrivePanel /><p className="practice-note">旧方式のSTEP4：{legacySaved.completed.includes(4)?"完了記録あり（保管）":"完了記録なし"}。旧提出チェックは保管し、Googleドライブ保存完了には自動変換しません。</p></>}<Checklist items={screen.items || []} prefix={screenKey} saved={saved} update={updateCheck} /></>;
  return <><Lead text={screen.lead} />{screen.items && <CardList items={screen.items} type={screen.type} />}{screen.action === "analysisSheet" && <AnalysisSheetAction url={analysisSheetUrl} busy={analysisSheetBusy} error={analysisSheetError} onCreate={createAnalysisSheet} />}{screen.image && <Placeholder label={screen.image} />}</>;
}

function ReferenceVideo() {
  return <div className="reference-video"><video controls playsInline preload="metadata"><source src={mediaUrl("/step4-reference.mp4")} type="video/mp4" />お使いのブラウザは動画の再生に対応していません。</video><p>再生ボタンを押して、映像のつなぎ方やテンポを確認してください。</p></div>;
}

function EditingResources() {
  return <div className="editing-resources">
    <section><span>01</span><div><h3>用意された見本動画を保存</h3><a href={mediaUrl("/step4-reference.mp4")} download="見本動画.mp4">見本動画をダウンロード</a><p>見本動画・MP4形式</p></div></section>
    <section><span>02</span><div><h3>用意された画像素材を保存</h3><a href={mediaUrl("/step4-image-materials.zip")} download="Step4画像素材.zip">画像素材をまとめてダウンロード</a><p>添付画像7枚・ZIP形式</p></div></section>
    <section><span>03</span><div><h3>CapCutを開く</h3><a href="https://www.capcut.com/my-edit?from_page=landing_page&start_tab=video" target="_blank" rel="noopener noreferrer">CapCutを開く <span aria-hidden="true">↗</span></a></div></section>
  </div>;
}

function AnalysisSheetAction({ url, busy, error, onCreate }: { url: string; busy: boolean; error: string; onCreate: () => Promise<void> }) {
  if (process.env.NEXT_PUBLIC_REVIEW_MODE === "true") return <div className="analysis-sheet-action"><p>確認用環境ではGoogleスプレッドシート連携を停止しています。本番のシートは変更されません。</p><button className="video-button" disabled>確認用では利用できません</button></div>;
  return <div className="analysis-sheet-action">{url ? <a className="video-button" href={url} target="_blank" rel="noopener noreferrer">▦　記入用スプレッドシートを開く</a> : <button type="button" className="video-button" onClick={() => void onCreate()} disabled={busy}>{busy ? "スプレッドシートを準備しています…" : "▦　記入用スプレッドシートを開く"}</button>}{error && <p className="form-error" role="alert">{error}</p>}</div>;
}

function Lead({ text }: { text?: string }) { return text ? <p className="lesson-lead">{text}</p> : null; }
function Flow({ steps }: { steps: string[] }) {
  const [openItems, setOpenItems] = useState<number[]>([]);
  const toggle = (index: number) => setOpenItems(items => items.includes(index) ? items.filter(item => item !== index) : [...items, index]);
  return <div className="flow">{steps.map((text, i) => {
    const [summary, details] = splitDetails(text);
    const isOpen = openItems.includes(i);
    const detailsId = `flow-details-${i}`;
    return <div key={text}><span>{String(i+1).padStart(2,"0")}</span>{details ? <div className={`flow-accordion ${isOpen ? "open" : ""}`}><button type="button" onClick={() => toggle(i)} aria-expanded={isOpen} aria-controls={detailsId}><strong>{summary}</strong><em aria-hidden="true">⌄</em></button>{isOpen && <div className="flow-details" id={detailsId}>{details}</div>}</div> : <strong>{text}</strong>}{i < steps.length-1 && <b>↓</b>}</div>;
  })}</div>
}
function splitDetails(text: string): [string, string] {
  const divider = text.indexOf("\n\n");
  return divider === -1 ? [text, ""] : [text.slice(0, divider), text.slice(divider + 2)];
}
function CardList({ items, type }: { items: string[]; type: string }) {
  const [openItems, setOpenItems] = useState<number[]>([]);
  const toggle = (index: number) => setOpenItems(current => current.includes(index) ? current.filter(item => item !== index) : [...current, index]);
  return <div className={`info-grid ${type}`}>{items.map((text, i) => {
    const [summary, details] = splitDetails(text);
    const isOpen = openItems.includes(i);
    const detailsId = `info-details-${type}-${i}`;
    return <div key={text} className={details ? "has-details" : undefined}><span>{type === "mistakes" ? "!" : type === "points" ? "✓" : String(i+1).padStart(2,"0")}</span>{details ? <div className={`info-accordion ${isOpen ? "open" : ""}`}><button type="button" onClick={() => toggle(i)} aria-expanded={isOpen} aria-controls={detailsId}><p>{summary}</p><em aria-hidden="true">⌄</em></button>{isOpen && <div className="info-details" id={detailsId}>{details}</div>}</div> : <p>{text}</p>}</div>;
  })}</div>;
}
function Compare({ ok, ng }: { ok:string[]; ng:string[] }) { return <div className="compare"><section className="ok"><h3><span>OK</span> この場合は対象</h3>{ok.map(x=><p key={x}>✓　{x}</p>)}</section><section className="ng"><h3><span>NG</span> この場合は対象外</h3>{ng.map(x=><p key={x}>×　{x}</p>)}</section></div> }
function Decision({ steps, hint }: { steps:string[]; hint:string }) { return <><div className="decision">{steps.map((s,i)=><div className="decision-row" key={s}><div className="question"><small>確認 {i+1}</small><strong>{s}</strong></div><div className="answer yes"><b>YES</b><span>{i === steps.length-1 ? "記入・次の作業へ" : "次の確認へ ↓"}</span></div><div className="answer no"><b>NO</b><span>対象外・見直す</span></div></div>)}</div><div className="decision-result">判断のしかた：{hint}</div></> }
function Placeholder({ label }: { label:string }) { return <div className="placeholder"><div>▧</div><strong>ここに説明画像を入れる</strong><span>{label}</span></div> }
function Checklist({ items, prefix, offset=0, saved, update }: { items:string[]; prefix:string; offset?:number; saved:SavedState; update:(k:string,v:boolean)=>void }) { const drive=useContext(DriveContext); return <div className="checklist">{items.map((x,i)=>{const key=`${prefix}-${i+offset}`; return <label key={key} className={saved.checks[key] ? "checked" : ""}><input type="checkbox" checked={!!saved.checks[key]} disabled={key==="4-5-4" && (!drive.ready || drive.busy || (!drive.folderUrl && !saved.checks[key]))} onChange={e=>update(key,e.target.checked)} /><span className="fake-check">✓</span><strong>{x}</strong></label>})}</div> }

function Celebration({ completed=[], onHome }: { completed?:number[]; onHome:()=>void }) {
  const levels = STEPS.map(s => s.outcome);
  const allDone = completed.length === TOTAL_STEPS;
  return <main className="celebration"><header className="topbar"><button className="brand-button" onClick={onHome}><span className="brand-mark">S</span><span>SNSお仕事マニュアル</span></button></header><section className="celebrate-hero"><div className="seal">✓</div><p className="eyebrow">{allDone ? "ALL QUESTS COMPLETE" : "STEP COMPLETE"}</p><h1>{allDone ? "すべてのSTEPをクリア" : "STEP6 完了"}</h1><p>{allDone ? "6つのSTEPをやり遂げました。ここまで進めた経験が、SNSのお仕事を一人で進める力になります。" : "STEP6を完了しました。トップへ戻って、ほかのSTEPも確認しましょう。"}</p></section><section className="level-list">{levels.map((x,i)=>{const done=completed.includes(i+1); return <div key={x} className={done?"cleared":""}><span>LEVEL {i+1}</span><strong>{x}</strong><em>{done?"✓ CLEAR":"未完了"}</em></div>})}</section><div className="celebrate-actions"><button className="secondary-button" onClick={onHome}>トップへ戻る</button></div></main>
}
