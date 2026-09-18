"use client";

import { FormEvent, useEffect, useState } from "react";

type Screen = {
  type: "intro" | "why" | "goal" | "prepare" | "process" | "points" | "example" | "compare" | "mistakes" | "decision" | "video" | "checklist" | "form" | "multiChecklist";
  title: string;
  lead?: string;
  items?: string[];
  steps?: string[];
  ok?: string[];
  ng?: string[];
  hint?: string;
  image?: string;
};

type StepData = {
  id: number;
  short: string;
  title: string;
  outcome: string;
  tone: string;
  videoUrl: string;
  screens: Screen[];
};

const PROCESS = (title: string, steps: string[], lead?: string): Screen => ({ type: "process", title, steps, lead });
const LIST = (type: Screen["type"], title: string, items: string[], lead?: string): Screen => ({ type, title, items, lead });

const STEPS: StepData[] = [
  {
    id: 1, short: "参考アカウントを探す", title: "インフルエンサー・クリエイターをリサーチする", outcome: "企業SNSの参考になるアカウントを、自分で選べる", tone: "blue", videoUrl: "VIDEO_URL_STEP1",
    screens: [
      { type: "intro", title: "今回やること", lead: "企業がSNSを運用するときに、参考になるアカウントを30件探します。", hint: "今日は『条件に合うアカウントを見つけて、表に記録する』仕事です。" },
      { type: "why", title: "なぜ、この作業をするの？", steps: ["良いSNSアカウントを作りたい", "うまくいっているアカウントを研究する", "人気の理由と投稿内容を調べる", "良いところを今後の運用に活かす"] },
      { type: "goal", title: "完成イメージ", lead: "条件を満たす企業アカウントが、スプレッドシートに30件そろった状態です。", items: ["アカウント名", "Instagram URL", "フォロワー数", "投稿内容", "参考になるポイント", "代表的な投稿URL"] },
      LIST("prepare", "始める前の準備", ["Instagramを開ける端末", "指定された検索キーワード", "記入用スプレッドシート", "投稿の日付とフォロワー数を確認できる状態"], "4つそろったら、作業を始められます。"),
      PROCESS("作業の流れ", ["Instagramを開く", "指定キーワードで検索", "アカウントを見る", "3つの条件を確認", "スプレッドシートへ入力", "次のアカウントを探す"]),
      LIST("points", "見るポイント", ["企業が運営しているか", "直近1か月以内にリール投稿があるか", "フォロワーが1万人以上か", "定期的に投稿されているか"], "フォロワー数だけで決めず、3つの条件を順番に見ます。"),
      { type: "example", title: "記入の具体例", lead: "例：〇〇コーヒー公式｜12,500人｜新商品や店舗の紹介｜短い動画で商品の魅力が伝わる｜代表リールURL", image: "Instagram検索画面" },
      { type: "compare", title: "OK例とNG例", ok: ["企業が運営している", "1か月以内にリール投稿あり", "フォロワー1万人以上", "定期的に投稿"], ng: ["長期間投稿がない", "投稿数が極端に少ない", "リールがほとんどない", "フォロワー1万人未満"] },
      LIST("mistakes", "よくある失敗", ["個人アカウントを入れてしまう", "フォロワー数の単位を見間違える", "古い投稿だけで判断する", "URLをコピーし忘れる"], "入力前に、条件を上からもう一度確認しましょう。"),
      { type: "decision", title: "迷ったときの判断フロー", steps: ["企業が運営？", "1か月以内にリールあり？", "フォロワー1万人以上？"], hint: "3つともYES → 記入。1つでもNO → 対象外にして次を探す。" },
      { type: "video", title: "実際の操作方法を動画で見る", lead: "検索のしかたやURLのコピーなど、細かな画面操作は動画で確認します。", image: "STEP1 Instagram検索画面" },
      LIST("checklist", "作業完了チェック", ["30アカウント記入できている", "すべて企業アカウント", "すべてフォロワー1万人以上", "直近1か月以内にリール投稿あり", "URLなどの記入漏れなし"], "すべて確認できたらSTEP1完了です。")
    ]
  },
  {
    id: 2, short: "伸びているリールを探す", title: "伸びているリール動画をリサーチする", outcome: "多く見られる動画の特徴を見つけられる", tone: "green", videoUrl: "VIDEO_URL_STEP2",
    screens: [
      { type: "intro", title: "今回やること", lead: "どんな動画が多くの人に見られているのかを調べます。", hint: "再生数と動画の中身を、セットで記録します。" },
      { type: "why", title: "なぜ、この作業をするの？", steps: ["再生数が多い", "たくさんの人に見られている", "見てもらいやすい理由がある", "共通点を探す", "今後の動画作りに活かす"] },
      { type: "goal", title: "完成イメージ", lead: "指定された件数のリールと、『伸びたと思う理由』が表に整理された状態です。", items: ["投稿URL", "アカウント名", "再生回数", "動画の内容", "冒頭・長さ・テロップ", "BGMと参考ポイント"] },
      LIST("prepare", "始める前の準備", ["Instagram", "指定されたジャンル", "記入用スプレッドシート", "音を出せる環境またはイヤホン"]),
      PROCESS("作業の流れ", ["指定ジャンルを見る", "リールを見る", "再生数を確認", "伸びている動画を選ぶ", "特徴を見る", "スプレッドシートへ入力"]),
      LIST("points", "動画を見る8つのポイント", ["最初に何を見せている？", "最初にどんな文字が出る？", "続きが気になる始まり方？", "人物は映っている？", "テンポは速い？遅い？", "テロップの使い方は？", "動画の長さは？", "一番印象に残るのは？"]),
      { type: "example", title: "考えてみよう", lead: "『最初の2秒で完成品を見せているので、続きが気になる』のように、見た事実と理由を短く書きます。", image: "リール再生数の確認画面" },
      { type: "compare", title: "OK例とNG例", ok: ["再生数を正しく記録", "冒頭やテンポも観察", "理由を自分の言葉で書く"], ng: ["なんとなく選ぶ", "再生数だけを記録", "『すごい』だけで終わる"] },
      LIST("mistakes", "よくある失敗", ["再生数といいね数を間違える", "動画を最後まで見ずに決める", "URLを別の投稿からコピーする", "参考ポイントが空欄になる"]),
      { type: "decision", title: "この動画は記録する？", steps: ["指定ジャンル？", "基準より再生数が多い？", "伸びた理由を1つ言える？"], hint: "3つともYES → 記入。NOがある → 別のリールを見る。" },
      { type: "video", title: "実際の操作方法を動画で見る", lead: "再生数の見方や投稿URLのコピー方法を確認できます。", image: "STEP2 リール確認画面" },
      LIST("checklist", "作業完了チェック", ["指定件数を記入した", "投稿URLに間違いがない", "再生回数を記入した", "8つのポイントを確認した", "伸びた理由を自分の言葉で書いた"])
    ]
  },
  {
    id: 3, short: "人気のBGMを探す", title: "伸びているBGM・音源をリサーチする", outcome: "流行と企業での使いやすさを考えて音源を選べる", tone: "purple", videoUrl: "VIDEO_URL_STEP3",
    screens: [
      { type: "intro", title: "今回やること", lead: "Instagramで、現在よく使われているBGM・音源を探します。", hint: "『人気』だけでなく『企業でも使いやすいか』も見ます。" },
      { type: "why", title: "なぜ、この作業をするの？", steps: ["人気の音源", "多くの動画で使われている", "見てもらいやすくなる場合がある", "企業動画でも使えそうなものを探す"] },
      { type: "goal", title: "完成イメージ", lead: "使えそうな音源が、使用数や合う動画と一緒に記録された状態です。", items: ["BGM名", "音源URL", "使用されている投稿数", "どんな動画に合いそうか", "参考動画URL"] },
      LIST("prepare", "始める前の準備", ["Instagram", "音を確認できる環境", "記入用スプレッドシート", "企業の雰囲気が分かる資料"]),
      PROCESS("作業の流れ", ["リールを見る", "BGMを確認", "音源ページを開く", "使用数を確認", "候補を保存", "スプレッドシートへ入力"]),
      LIST("points", "判断するポイント", ["企業の雰囲気に合う？", "歌詞や言葉に問題はない？", "商品・サービスの邪魔をしない？", "どんな動画に合うか説明できる？"]),
      { type: "example", title: "記入の具体例", lead: "明るく軽いテンポ｜商品紹介や店舗紹介に合いそう｜使用数2.4万件｜参考動画URL", image: "音源ページの使用数確認画面" },
      { type: "compare", title: "OK例とNG例", ok: ["企業の雰囲気に合う", "言葉の意味に問題がない", "合う動画を説明できる"], ng: ["流行だけで決める", "不適切な言葉が入る", "音が商品説明を邪魔する"] },
      LIST("mistakes", "よくある失敗", ["曲名だけでURLを記録しない", "使用数を見ない", "歌詞の意味を確認しない", "参考動画URLを忘れる"]),
      { type: "decision", title: "企業動画で使いやすい？", steps: ["企業の雰囲気に合う？", "歌詞・音に問題なし？", "合う動画を説明できる？"], hint: "すべてYES → 候補に保存。1つでもNO → 今回は使わない。" },
      { type: "video", title: "実際の操作方法を動画で見る", lead: "音源ページの開き方とURLの取り方を確認できます。", image: "STEP3 音源ページ" },
      LIST("checklist", "作業完了チェック", ["指定件数のBGMを記入した", "音源URLを記入した", "使用数を確認した", "合いそうな動画を書いた", "企業でも使いやすいと判断した"])
    ]
  },
  {
    id: 4, short: "動画を編集する", title: "用意された素材を使って動画を編集する", outcome: "素材を整理して、見やすい動画を1本完成できる", tone: "orange", videoUrl: "VIDEO_URL_STEP4",
    screens: [
      { type: "intro", title: "今回やること", lead: "用意された動画素材を使って、1本の動画を完成させます。", hint: "初めは撮影せず、『編集する』ことに集中します。" },
      { type: "why", title: "なぜ、この作業をするの？", steps: ["用意された素材を見る", "良い部分を選ぶ", "見やすい順番につなぐ", "編集の基本を身につける"] },
      { type: "goal", title: "完成イメージ", lead: "短くテンポがよく、文字と音が見やすい1本の縦動画です。", items: ["冒頭で内容が分かる", "不要な間がない", "読みやすいテロップ", "ちょうどよいBGM音量"] },
      LIST("prepare", "始める前の準備", ["用意された動画素材", "指定された編集アプリ", "完成見本または指示書", "保存形式・提出場所の確認"]),
      PROCESS("作業の流れ", ["素材を確認", "使う動画を選ぶ", "順番を決める", "不要部分をカット", "動画をつなぐ", "BGM・テロップ", "最初から再生", "保存・提出"]),
      LIST("points", "編集の基本ルール", ["長すぎる部分はカット", "何も起きていない時間を減らす", "文字は読みやすい大きさ", "文字を画面いっぱいに入れない", "BGMを大きくしすぎない", "完成後は最初から最後まで再生"]),
      { type: "example", title: "具体例", lead: "商品を手に取るまでの長い待ち時間を短く切り、動きが始まるところへつなぎます。", image: "動画編集タイムライン画面" },
      { type: "compare", title: "OK例とNG例", ok: ["短くテンポよく切り替わる", "短く読みやすいテロップ", "声とBGMが両方聞こえる"], ng: ["何も起きない映像が長い", "画面いっぱいの長文", "BGMが大きすぎる"] },
      LIST("mistakes", "よくある失敗", ["動画の最後が途中で切れる", "テロップに誤字がある", "書き出した動画を確認しない", "指定と違う形式で保存する"]),
      { type: "decision", title: "提出してよい？", steps: ["最初から最後まで再生できる？", "文字と音に問題なし？", "指定形式で保存した？"], hint: "すべてYES → 提出。NOがある → その場所を直して再確認。" },
      { type: "video", title: "実際の操作方法を動画で見る", lead: "カット・テロップ・BGM・保存の操作を動画で確認します。", image: "STEP4 編集操作画面" },
      LIST("checklist", "完成チェック", ["動画が途中で切れていない", "不要な部分が残っていない", "テロップに誤字なし", "テロップが読みやすい", "BGMが入っている", "音量がおかしくない", "最初から最後まで再生できる", "指定形式で保存されている"])
    ]
  },
  {
    id: 5, short: "投稿企画を考える", title: "企業SNSの投稿企画を考える", outcome: "伸びた動画を参考に、自社向けの企画をまとめられる", tone: "pink", videoUrl: "VIDEO_URL_STEP5",
    screens: [
      { type: "intro", title: "ここからは高難易度編", lead: "基本編が問題なくできるようになった人向けです。企業SNSの投稿企画を考えます。", hint: "ゼロから思いつこうとせず、良い動画を分解して考えます。" },
      { type: "why", title: "企画の基本的な考え方", steps: ["伸びている動画を探す", "なぜ伸びたのか考える", "動画の構成を分ける", "自社向けに置き換える", "企画としてまとめる"] },
      { type: "goal", title: "完成イメージ", lead: "誰に、何を、どのように見せるかが決まり、撮影を始められる企画書です。", items: ["企画タイトル", "見てほしい人", "動画の内容", "最初の3秒", "撮影するもの・素材", "期待する反応"] },
      LIST("prepare", "始める前の準備", ["紹介する企業・商品情報", "参考にする動画", "企画を考える時間", "撮影できる場所・素材の候補"]),
      PROCESS("企画を作る流れ", ["参考動画を選ぶ", "伸びた理由を書く", "構成を分ける", "自社の商品に置き換える", "最初の3秒を決める", "企画フォームを埋める"]),
      LIST("points", "参考にしてよいポイント", ["動画の構成", "見せ方", "切り口", "テンポ"], "他社投稿をそのままコピーしてはいけません。会社名・言葉・映像を写すのではなく、仕組みを参考にします。"),
      { type: "example", title: "置き換えの具体例", lead: "参考：『3秒で完成品→作り方』の構成。自社向け：『完成した商品→制作の裏側』に置き換える。", image: "参考動画の構成メモ" },
      { type: "compare", title: "OK例とNG例", ok: ["構成を自社向けに置き換える", "自社の商品・言葉を使う", "見てほしい人が明確"], ng: ["文章をそのまま使う", "映像をまねして区別できない", "誰向けか決まっていない"] },
      LIST("mistakes", "よくある失敗", ["内容を詰め込みすぎる", "最初の3秒が決まっていない", "撮れない内容を企画する", "視聴者の反応を考えていない"]),
      { type: "decision", title: "この企画で撮影できる？", steps: ["誰向けか明確？", "他社のコピーではない？", "必要な素材を用意できる？"], hint: "すべてYES → 企画フォームへ。NOがある → 内容を1つ減らすか置き換える。" },
      { type: "form", title: "企画テンプレート", lead: "入力は自動保存されます。途中で閉じても続きから書けます。" },
      { type: "video", title: "実際の操作方法を動画で見る", lead: "参考動画の分け方と企画書の書き方を確認できます。", image: "STEP5 企画作成画面" },
      LIST("checklist", "企画の完成チェック", ["すべての項目を入力した", "誰に見てほしいか明確", "最初の3秒が決まっている", "他社投稿のコピーではない", "必要な素材を用意できる"])
    ]
  },
  {
    id: 6, short: "自分で動画を作る", title: "企画・撮影・編集まで自分で動画を作る", outcome: "企画から提出まで、一人で動画制作を進められる", tone: "navy", videoUrl: "VIDEO_URL_STEP6",
    screens: [
      { type: "intro", title: "今回の目標", lead: "企画・撮影準備・撮影・編集・提出まで、一人で完成させます。", hint: "一度に全部考えず、今いる工程だけに集中します。" },
      { type: "why", title: "仕事の全体像", steps: ["企画", "撮影準備", "撮影", "素材確認", "編集", "BGM・テロップ", "完成確認", "提出"] },
      { type: "goal", title: "完成イメージ", lead: "企画に合った縦動画が完成し、自分で確認して指定の場所へ提出できた状態です。", items: ["企画どおりの内容", "明るく安定した映像", "見やすい編集", "正しい形式で提出"] },
      LIST("prepare", "撮影前の準備", ["企画書を読み直す", "撮影するものをそろえる", "端末の充電・空き容量を確認", "明るさと背景を確認"]),
      PROCESS("作業の流れ", ["企画を確認", "撮影準備", "複数回撮影", "素材確認", "編集", "BGM・テロップ", "完成確認", "提出"]),
      LIST("points", "撮影時の基本", ["縦向きで撮る", "手ブレに注意", "明るい場所で撮影", "余計なものが映っていないか確認", "1回だけでなく複数回撮影", "前後を少し長めに撮る"]),
      { type: "example", title: "撮影の具体例", lead: "撮影ボタンを押して1秒待つ → 動作をする → 終わって1秒待つ。前後の余白があると編集しやすくなります。", image: "縦向き撮影の見本" },
      { type: "compare", title: "OK例とNG例", ok: ["縦向き・明るい", "同じ場面を複数回撮る", "背景が整理されている"], ng: ["横向きで撮る", "暗く手ブレしている", "関係ない物や人が映る"] },
      LIST("mistakes", "よくある失敗", ["レンズが汚れている", "録画開始直後に動き出す", "1回だけ撮って終わる", "素材確認前に撮影場所を片づける"]),
      { type: "decision", title: "編集へ進んでよい？", steps: ["必要な場面が全部ある？", "明るさ・手ブレに問題なし？", "使える撮影が2つ以上ある？"], hint: "すべてYES → 編集へ。NOがある → その場面だけ撮り直す。" },
      { type: "video", title: "実際の操作方法を動画で見る", lead: "撮影設定から書き出し・提出までの操作を確認できます。", image: "STEP6 撮影・編集画面" },
      { type: "multiChecklist", title: "3段階の完成チェック", lead: "各段階を確認すると、最後の完了ボタンが使えます。" }
    ]
  }
];

const FORM_FIELDS = ["企画タイトル", "参考動画URL", "誰に見てほしいか", "動画の内容", "最初の3秒で何を見せるか", "撮影するもの", "必要な素材", "使用するBGM", "視聴者にどんな反応をしてほしいか"];
const MULTI_CHECKS = {
  "撮影前": ["企画書を確認した", "必要な物をそろえた", "充電と空き容量を確認した", "背景と明るさを確認した"],
  "撮影後": ["必要な場面が全部ある", "手ブレ・暗さを確認した", "複数回撮影した", "余計なものが映っていない"],
  "編集後": ["最初から最後まで再生した", "誤字と音量を確認した", "企画どおりの内容になった", "指定形式で保存した"]
};

type SavedState = { completed: number[]; position: Record<number, number>; checks: Record<string, boolean>; form: Record<string, string>; currentStep: number; lastWorkedStep: number };
type SessionUser = { id: string; name: string; role: "user" | "admin" };
type LoginUser = SessionUser;
type AdminProgress = { id: string; name: string; progressRate: number; currentStep: number; completedCount: number; lastWorkedStep: number; updatedAt: string | null };
const initialState: SavedState = { completed: [], position: {}, checks: {}, form: {}, currentStep: 1, lastWorkedStep: 1 };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "処理に失敗しました");
  return data;
}

export default function Home() {
  const [view, setView] = useState<"home" | "step" | "basicDone" | "final">("home");
  const [stepId, setStepId] = useState(1);
  const [page, setPage] = useState(0);
  const [saved, setSaved] = useState<SavedState>(initialState);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loginUsers, setLoginUsers] = useState<LoginUser[]>([]);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [ready, setReady] = useState(false);
  const [progressReady, setProgressReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [showAdmin, setShowAdmin] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const me = await api<{ user: SessionUser | null }>("/api/me");
        if (me.user) {
          const data = await api<{ progress: SavedState }>("/api/progress");
          setSession(me.user); setSaved({ ...initialState, ...data.progress }); setProgressReady(true); setShowAdmin(me.user.role === "admin");
        } else {
          const data = await api<{ users: LoginUser[]; needsSetup: boolean }>("/api/auth/users");
          setLoginUsers(data.users); setNeedsSetup(data.needsSetup);
        }
      } catch { setLoginUsers([]); }
      setReady(true);
    })();
  }, []);
  useEffect(() => {
    if (!session || !progressReady) return;
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      void api<{ ok: boolean }>("/api/progress", { method: "PUT", body: JSON.stringify(saved) })
        .then(() => setSaveStatus("saved")).catch(() => setSaveStatus("error"));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [saved, session, progressReady]);

  const step = STEPS[stepId - 1];
  const screen = step.screens[page];
  const totalProgress = Math.round((saved.completed.length / STEPS.length) * 100);
  const pageProgress = Math.round(((page + 1) / step.screens.length) * 100);
  const screenKey = `${stepId}-${page}`;
  const allChecked = screen && (screen.type === "checklist" ? (screen.items || []).every((_, i) => saved.checks[`${screenKey}-${i}`]) : screen.type === "multiChecklist" ? Object.values(MULTI_CHECKS).flat().every((_, i) => saved.checks[`${screenKey}-${i}`]) : true);

  const startStep = (id: number) => { const savedPage = saved.position[id] || 0; setStepId(id); setPage(savedPage); setSaved(s => ({ ...s, currentStep: id, lastWorkedStep: id, position: { ...s.position, [id]: savedPage } })); setView("step"); setHintOpen(false); window.scrollTo(0, 0); };
  const goHome = () => { setView("home"); window.scrollTo(0, 0); };
  const next = () => {
    if (page < step.screens.length - 1) {
      const nextPage = page + 1; setPage(nextPage); setSaved(s => ({ ...s, currentStep: stepId, lastWorkedStep: stepId, position: { ...s.position, [stepId]: nextPage } })); setHintOpen(false); window.scrollTo(0, 0); return;
    }
    const completed = Array.from(new Set([...saved.completed, stepId]));
    const nextStep = Math.min(stepId + 1, 6);
    setSaved(s => ({ ...s, completed, currentStep: nextStep, lastWorkedStep: nextStep, position: { ...s.position, [stepId]: page } }));
    if (stepId === 4) setView("basicDone"); else if (stepId === 6) setView("final"); else { setStepId(stepId + 1); setPage(0); setView("step"); }
    window.scrollTo(0, 0);
  };
  const back = () => { if (page > 0) { const previous = page - 1; setPage(previous); setSaved(s => ({ ...s, position: { ...s.position, [stepId]: previous }, currentStep: stepId, lastWorkedStep: stepId })); setHintOpen(false); window.scrollTo(0, 0); } else goHome(); };
  const updateCheck = (key: string, value: boolean) => setSaved(s => ({ ...s, checks: { ...s.checks, [key]: value } }));
  const updateForm = (field: string, value: string) => setSaved(s => ({ ...s, form: { ...s.form, [field]: value } }));

  const finishLogin = async (user: SessionUser) => {
    const data = await api<{ progress: SavedState }>("/api/progress");
    setSession(user); setSaved({ ...initialState, ...data.progress }); setProgressReady(true); setShowAdmin(user.role === "admin"); setView("home");
  };
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    const data = await api<{ users: LoginUser[]; needsSetup: boolean }>("/api/auth/users");
    setSession(null); setProgressReady(false); setSaved(initialState); setLoginUsers(data.users); setNeedsSetup(data.needsSetup); setShowAdmin(false); setView("home");
  };

  if (!ready) return <main className="loading">読み込んでいます…</main>;

  if (!session) return needsSetup
    ? <SetupScreen onReady={finishLogin} />
    : <LoginScreen users={loginUsers} onLogin={finishLogin} />;

  if (session.role === "admin" && showAdmin) return <AdminScreen user={session} onManual={() => setShowAdmin(false)} onLogout={logout} />;

  if (view === "home") return <HomeScreen user={session} saved={saved} totalProgress={totalProgress} startStep={startStep} onLogout={logout} onAdmin={session.role === "admin" ? () => setShowAdmin(true) : undefined} saveStatus={saveStatus} />;
  if (view === "basicDone") return <Celebration basic onHome={goHome} onNext={() => startStep(5)} />;
  if (view === "final") return <Celebration completed={saved.completed} onHome={goHome} />;

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-button" onClick={goHome} aria-label="トップへ戻る"><span className="brand-mark">S</span><span>SNSお仕事マニュアル</span></button>
        <div className="account-actions"><span>{session.name}さん</span><span className={`save-state ${saveStatus}`}>{saveStatus === "saving" ? "保存中…" : saveStatus === "error" ? "保存できません" : "✓ 保存済み"}</span><button className="text-button" onClick={goHome}>トップへ</button><button className="text-button" onClick={() => void logout()}>ログアウト</button></div>
      </header>
      <div className="step-layout">
        <aside className="step-sidebar">
          <p className="eyebrow">STEP {stepId}</p>
          <h1>{step.short}</h1>
          <div className="position"><strong>{page + 1} / {step.screens.length}</strong><span>{pageProgress}%</span></div>
          <div className="progress-track" aria-label={`進捗 ${pageProgress}%`}><span style={{ width: `${pageProgress}%` }} /></div>
          <p className="now-label">いま：{screen.title}</p>
          <nav className="dot-nav" aria-label="このSTEPの画面">
            {step.screens.map((s, i) => <button key={i} className={i === page ? "active" : i < page ? "done" : ""} onClick={() => { setPage(i); setSaved(state => ({ ...state, currentStep: stepId, lastWorkedStep: stepId, position: { ...state.position, [stepId]: i } })); setHintOpen(false); }} aria-label={`${i + 1}. ${s.title}`}><span>{i < page ? "✓" : i + 1}</span><em>{s.title}</em></button>)}
          </nav>
        </aside>
        <section className={`lesson tone-${step.tone}`}>
          <div className="mobile-progress"><span>STEP {stepId}　{page + 1} / {step.screens.length}</span><strong>{pageProgress}%</strong></div>
          <div className="progress-track mobile"><span style={{ width: `${pageProgress}%` }} /></div>
          <p className="section-kicker">{screen.type === "checklist" || screen.type === "multiChecklist" ? "最後の確認" : `LESSON ${String(page + 1).padStart(2, "0")}`}</p>
          <h2>{screen.title}</h2>
          <ScreenContent screen={screen} step={step} saved={saved} screenKey={screenKey} updateCheck={updateCheck} updateForm={updateForm} />
          {screen.hint && <div className="hint-wrap"><button className="hint-button" onClick={() => setHintOpen(!hintOpen)} aria-expanded={hintOpen}>💡 ヒントを見る</button>{hintOpen && <div className="hint-box">{screen.hint}</div>}</div>}
          <div className="lesson-actions">
            <button className="secondary-button" onClick={back}>← 戻る</button>
            <button className="primary-button" onClick={next} disabled={!allChecked}>{page === step.screens.length - 1 ? `STEP${stepId} 完了` : "次へ →"}</button>
          </div>
          {!allChecked && <p className="disabled-note">すべてにチェックすると完了できます</p>}
        </section>
      </div>
    </main>
  );
}

function SetupScreen({ onReady }: { onReady: (user: SessionUser) => Promise<void> }) {
  const [name, setName] = useState(""); const [pin, setPin] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); setBusy(true); try { const data = await api<{ user: SessionUser }>("/api/admin/bootstrap", { method: "POST", body: JSON.stringify({ name, pin }) }); await onReady(data.user); } catch (e) { setError(e instanceof Error ? e.message : "初期設定に失敗しました"); } finally { setBusy(false); } };
  return <main className="auth-page"><section className="auth-card setup-card"><div className="auth-emblem">S</div><p className="eyebrow">FIRST SETUP</p><h1>最初の管理者を登録</h1><p>最初に一度だけ、利用者を登録する管理者アカウントを作ります。</p><form onSubmit={submit}><label><span>管理者名</span><input value={name} onChange={e => setName(e.target.value)} maxLength={40} autoComplete="name" placeholder="例：支援員 田中" required /></label><label><span>管理者PIN（数字4桁）</span><input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" pattern="\d{4}" autoComplete="new-password" placeholder="••••" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy || pin.length !== 4}>{busy ? "登録中…" : "管理者を登録する"}</button></form><p className="auth-note">登録後、管理者画面から30〜40名分の利用者名とPINを追加できます。</p></section></main>;
}

function LoginScreen({ users, onLogin }: { users: LoginUser[]; onLogin: (user: SessionUser) => Promise<void> }) {
  const [userId, setUserId] = useState(""); const [pin, setPin] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); setBusy(true); try { const data = await api<{ user: SessionUser }>("/api/auth/login", { method: "POST", body: JSON.stringify({ userId, pin }) }); await onLogin(data.user); } catch (e) { setError(e instanceof Error ? e.message : "ログインできませんでした"); } finally { setBusy(false); } };
  return <main className="auth-page"><section className="auth-card"><div className="auth-emblem">S</div><p className="eyebrow">SNS WORK QUEST</p><h1>SNSお仕事マニュアル</h1><p>自分の名前を選んで、4桁のPINを入力してください。</p><form onSubmit={submit}><label><span>利用者名</span><select value={userId} onChange={e => setUserId(e.target.value)} required><option value="">名前を選んでください</option>{users.map(user => <option key={user.id} value={user.id}>{user.name}{user.role === "admin" ? "（管理者）" : ""}</option>)}</select></label><label><span>4桁のPINコード</span><input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" pattern="\d{4}" autoComplete="current-password" placeholder="••••" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy || !userId || pin.length !== 4}>{busy ? "確認中…" : "ログイン"}</button></form><p className="auth-note">PINを忘れた場合は、管理者へお知らせください。</p></section></main>;
}

function AdminScreen({ user, onManual, onLogout }: { user: SessionUser; onManual: () => void; onLogout: () => Promise<void> }) {
  const [rows, setRows] = useState<AdminProgress[]>([]); const [name, setName] = useState(""); const [pin, setPin] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { const data = await api<{ users: AdminProgress[] }>("/api/admin/progress"); setRows(data.users); } catch (e) { setError(e instanceof Error ? e.message : "一覧を取得できませんでした"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const addUser = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(""); try { await api("/api/admin/users", { method: "POST", body: JSON.stringify({ name, pin }) }); setName(""); setPin(""); await load(); } catch (e) { setError(e instanceof Error ? e.message : "登録できませんでした"); } finally { setBusy(false); } };
  return <main className="admin-page"><header className="topbar"><div className="brand"><span className="brand-mark">S</span><span>SNSお仕事マニュアル</span></div><div className="account-actions"><span>{user.name}さん</span><button className="text-button" onClick={onManual}>マニュアルを見る</button><button className="text-button" onClick={() => void onLogout()}>ログアウト</button></div></header><div className="admin-wrap"><section className="admin-heading"><div><p className="eyebrow">ADMIN QUEST BOARD</p><h1>利用者の進捗</h1><p>利用者ごとの進み具合と最終作業日時を確認できます。</p></div><div className="admin-count"><strong>{rows.length}</strong><span>利用者</span></div></section><section className="admin-panel add-user"><h2>利用者を登録</h2><form onSubmit={addUser}><label><span>利用者名</span><input value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="例：山田さん" required /></label><label><span>4桁PIN</span><input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" pattern="\d{4}" placeholder="••••" required /></label><button className="primary-button" disabled={busy || pin.length !== 4}>{busy ? "登録中…" : "利用者を追加"}</button></form>{error && <p className="form-error" role="alert">{error}</p>}<p className="admin-help">利用者へ、選択する名前とPINを個別に伝えてください。</p></section><section className="admin-panel"><div className="panel-title"><h2>進捗一覧</h2><button className="secondary-button compact" onClick={() => void load()}>更新</button></div>{loading ? <p>読み込んでいます…</p> : rows.length === 0 ? <div className="empty-state">利用者を登録すると、ここに進捗が表示されます。</div> : <div className="progress-table-wrap"><table className="progress-table"><thead><tr><th>利用者名</th><th>進捗率</th><th>現在</th><th>完了</th><th>最終作業日時</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.name}</strong></td><td><div className="table-progress"><span><i style={{ width: `${row.progressRate}%` }} /></span><b>{row.progressRate}%</b></div></td><td>STEP {row.currentStep}</td><td>{row.completedCount} / 6</td><td>{formatDate(row.updatedAt)}</td></tr>)}</tbody></table></div>}</section></div></main>;
}

function formatDate(value: string | null) {
  if (!value) return "未実施";
  const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(normalized));
}

function HomeScreen({ user, saved, totalProgress, startStep, onLogout, onAdmin, saveStatus }: { user: SessionUser; saved: SavedState; totalProgress: number; startStep: (id: number) => void; onLogout: () => Promise<void>; onAdmin?: () => void; saveStatus: "saved" | "saving" | "error" }) {
  const completed = saved.completed;
  return <main className="home">
    <header className="home-nav"><div className="brand"><span className="brand-mark">S</span><span>SNSお仕事マニュアル</span></div><div className="account-actions"><span>{user.name}さん</span><span className={`save-state ${saveStatus}`}>{saveStatus === "saving" ? "保存中…" : saveStatus === "error" ? "保存できません" : "✓ 保存済み"}</span>{onAdmin && <button className="text-button" onClick={onAdmin}>管理者画面</button>}<button className="text-button" onClick={() => void onLogout()}>ログアウト</button></div></header>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">SNS WORK STARTER</p><h1>はじめての<br /><em>SNS運用</em><br />お仕事マニュアル</h1><p className="hero-lead">読むだけではなく、考えて、選んで、確認する。<br />一人で作業を始めるための体験型マニュアルです。</p><button className="primary-button large" onClick={() => startStep(saved.lastWorkedStep)}>{completed.length || Object.keys(saved.position).length ? "前回の続きから始める" : "STEP1からはじめる"} →</button></div>
      <div className="hero-board"><div className="board-top"><span>YOUR PROGRESS</span><strong>{totalProgress}%</strong></div><div className="progress-track hero-track"><span style={{ width: `${totalProgress}%` }} /></div><p>{completed.length === 0 ? "最初のSTEPから、ゆっくり始めましょう。" : completed.length === 6 ? "すべてのSTEPをクリアしました！" : `STEP${completed.length}まで完了しています。`}</p><div className="skill-pills"><span>調べる</span><span>考える</span><span>つくる</span></div></div>
    </section>
    <section className="user-progress-panel"><div className="progress-title"><div><p className="eyebrow">MY QUEST STATUS</p><h2>{user.name}さんの進捗</h2></div><strong>{totalProgress}%</strong></div><div className="user-progress-stats"><div><span>完了STEP</span><b>{completed.length} / 6</b></div><div><span>前回作業したSTEP</span><b>STEP {saved.lastWorkedStep}</b></div><div><span>現在のSTEP</span><b>STEP {saved.currentStep}</b></div></div><div className="step-status-list">{STEPS.map(step => { const status = completed.includes(step.id) ? "完了" : step.id === saved.currentStep ? "作業中" : "未実施"; return <button key={step.id} className={status === "完了" ? "complete" : status === "作業中" ? "current" : "pending"} onClick={() => startStep(step.id)}><span>STEP {step.id}</span><strong>{step.short}</strong><em>{status}</em></button>; })}</div></section>
    <section className="can-do"><p className="eyebrow">このアプリでできるようになること</p><div className="can-grid"><div><b>01</b><span>良いお手本を<br />見つける</span></div><div><b>02</b><span>理由を考えて<br />判断する</span></div><div><b>03</b><span>動画をつくり<br />自分で確認する</span></div></div></section>
    <section className="curriculum">
      <div className="section-heading"><div><p className="eyebrow">BASIC COURSE</p><h2>基本編</h2><p>まずは「調べる・編集する」仕事の基本から。</p></div><span className="course-badge">STEP 1—4</span></div>
      <div className="step-grid">{STEPS.slice(0,4).map(s => <StepCard key={s.id} step={s} completed={completed.includes(s.id)} onStart={() => startStep(s.id)} />)}</div>
    </section>
    <section className="curriculum advanced">
      <div className="advanced-note"><span>LEVEL UP</span><strong>ここからは、基本編が問題なくできるようになった人向けです。</strong></div>
      <div className="section-heading"><div><p className="eyebrow">ADVANCED COURSE</p><h2>高難易度編</h2><p>企画から撮影・編集まで、一人で進める力をつけます。</p></div><span className="course-badge dark">STEP 5—6</span></div>
      <div className="step-grid advanced-grid">{STEPS.slice(4).map(s => <StepCard key={s.id} step={s} completed={completed.includes(s.id)} onStart={() => startStep(s.id)} />)}</div>
    </section>
    <footer><span className="brand-mark">S</span><p>少しずつ、確実に。<br /><small>進み具合はアカウントごとに自動で保存されます。</small></p></footer>
  </main>
}

function StepCard({ step, completed, onStart }: { step: StepData; completed: boolean; onStart: () => void }) {
  return <article className={`step-card tone-${step.tone}`}><div className="card-number">{String(step.id).padStart(2,"0")}</div><div className="card-status">{completed ? "✓ クリア" : step.id > 4 ? "高難易度" : "基本"}</div><p>STEP {step.id}</p><h3>{step.short}</h3><div className="outcome"><span>できるようになること</span>{step.outcome}</div><button onClick={onStart}>{completed ? "もう一度見る" : "このSTEPを始める"}<span>→</span></button></article>
}

function ScreenContent({ screen, step, saved, screenKey, updateCheck, updateForm }: { screen: Screen; step: StepData; saved: SavedState; screenKey: string; updateCheck: (k:string,v:boolean)=>void; updateForm:(k:string,v:string)=>void }) {
  if (screen.type === "why" || screen.type === "process") return <><Lead text={screen.lead} /><Flow steps={screen.steps || []} /></>;
  if (screen.type === "decision") return <Decision steps={screen.steps || []} hint={screen.hint || ""} />;
  if (screen.type === "compare") return <Compare ok={screen.ok || []} ng={screen.ng || []} />;
  if (screen.type === "video") return <><Lead text={screen.lead} /><Placeholder label={screen.image || "操作説明画面"} /><a className="video-button" href={step.videoUrl} onClick={e => { if (step.videoUrl.startsWith("VIDEO_URL")) { e.preventDefault(); alert("動画URLは準備中です。script内の設定値から差し替えられます。"); } }}>▶　実際の操作方法を動画で見る</a><p className="small-note">動画URLは準備中です</p></>;
  if (screen.type === "checklist") return <><Lead text={screen.lead} /><Checklist items={screen.items || []} prefix={screenKey} saved={saved} update={updateCheck} /></>;
  if (screen.type === "multiChecklist") { let offset = 0; return <><Lead text={screen.lead} /><div className="multi-checks">{Object.entries(MULTI_CHECKS).map(([group, items]) => { const start = offset; offset += items.length; return <section key={group}><h3>{group}のチェック</h3><Checklist items={items} prefix={screenKey} offset={start} saved={saved} update={updateCheck}/></section>})}</div></> }
  if (screen.type === "form") return <><Lead text={screen.lead} /><div className="form-grid">{FORM_FIELDS.map((field, i) => <label key={field} className={i === 3 || i === 8 ? "wide" : ""}><span>{field}</span>{i === 3 || i === 8 ? <textarea value={saved.form[field] || ""} onChange={e => updateForm(field,e.target.value)} placeholder="短い言葉で書いてください" /> : <input value={saved.form[field] || ""} onChange={e => updateForm(field,e.target.value)} placeholder="ここに入力" />}</label>)}</div><p className="save-note">✓ 入力内容は自動保存されます</p></>;
  return <><Lead text={screen.lead} />{screen.items && <CardList items={screen.items} type={screen.type} />}{screen.image && <Placeholder label={screen.image} />}</>;
}

function Lead({ text }: { text?: string }) { return text ? <p className="lesson-lead">{text}</p> : null; }
function Flow({ steps }: { steps: string[] }) { return <div className="flow">{steps.map((s,i) => <div key={s}><span>{String(i+1).padStart(2,"0")}</span><strong>{s}</strong>{i < steps.length-1 && <b>↓</b>}</div>)}</div> }
function CardList({ items, type }: { items: string[]; type: string }) { return <div className={`info-grid ${type}`}>{items.map((x,i)=><div key={x}><span>{type === "mistakes" ? "!" : type === "points" ? "✓" : String(i+1).padStart(2,"0")}</span><p>{x}</p></div>)}</div> }
function Compare({ ok, ng }: { ok:string[]; ng:string[] }) { return <div className="compare"><section className="ok"><h3><span>OK</span> この場合は対象</h3>{ok.map(x=><p key={x}>✓　{x}</p>)}</section><section className="ng"><h3><span>NG</span> この場合は対象外</h3>{ng.map(x=><p key={x}>×　{x}</p>)}</section></div> }
function Decision({ steps, hint }: { steps:string[]; hint:string }) { return <><div className="decision">{steps.map((s,i)=><div className="decision-row" key={s}><div className="question"><small>確認 {i+1}</small><strong>{s}</strong></div><div className="answer yes"><b>YES</b><span>{i === steps.length-1 ? "記入・次の作業へ" : "次の確認へ ↓"}</span></div><div className="answer no"><b>NO</b><span>対象外・見直す</span></div></div>)}</div><div className="decision-result">判断のしかた：{hint}</div></> }
function Placeholder({ label }: { label:string }) { return <div className="placeholder"><div>▧</div><strong>ここに説明画像を入れる</strong><span>{label}</span></div> }
function Checklist({ items, prefix, offset=0, saved, update }: { items:string[]; prefix:string; offset?:number; saved:SavedState; update:(k:string,v:boolean)=>void }) { return <div className="checklist">{items.map((x,i)=>{const key=`${prefix}-${i+offset}`; return <label key={key} className={saved.checks[key] ? "checked" : ""}><input type="checkbox" checked={!!saved.checks[key]} onChange={e=>update(key,e.target.checked)} /><span className="fake-check">✓</span><strong>{x}</strong></label>})}</div> }

function Celebration({ basic, completed=[], onHome, onNext }: { basic?:boolean; completed?:number[]; onHome:()=>void; onNext?:()=>void }) {
  const levels = STEPS.map(s => s.outcome);
  return <main className="celebration"><header className="topbar"><button className="brand-button" onClick={onHome}><span className="brand-mark">S</span><span>SNSお仕事マニュアル</span></button></header><section className="celebrate-hero"><div className="seal">✓</div><p className="eyebrow">{basic ? "BASIC COURSE COMPLETE" : "ALL COURSE COMPLETE"}</p><h1>{basic ? "基本編クリア" : "あなたができるようになったこと"}</h1><p>{basic ? "4つの基本スキルが身につきました。次は、自分で考えて作る仕事に挑戦できます。" : "ここまで進めた経験が、SNSのお仕事を一人で進める力になります。"}</p></section><section className="level-list">{levels.map((x,i)=>{const done=basic ? i<4 : completed.includes(i+1); return <div key={x} className={done?"cleared":""}><span>LEVEL {i+1}</span><strong>{x}</strong><em>{done?"✓ CLEAR":"未完了"}</em></div>})}</section><div className="celebrate-actions"><button className="secondary-button" onClick={onHome}>トップへ戻る</button>{basic && onNext && <button className="primary-button" onClick={onNext}>高難易度編へ進む →</button>}</div></main>
}
