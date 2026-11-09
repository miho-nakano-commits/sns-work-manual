# SNSお仕事マニュアル

Step1〜Step6で、Instagramのリサーチと動画編集を学ぶ教材です。

## 今回の作業版

- 基点：main の `a8a9083e9396750729a89e8fe6972474c2d78378`
- ローカル作業ブランチ：`work/step1-5-manual-update`
- 本番公開・GitHubへのプッシュ・PR作成は、担当者の確認後に行います。
- 教材は `app/curriculum.ts`、画面は `app/page.tsx`、Step5・Step6は `app/step-five.tsx`、共通の進捗処理は `app/progress.ts` にあります。
- 既存素材は `public/` に維持しています。提供された10テーマの素材と見本を登録済みです。基本編6本・応用編4本に分けています。
- [分析シートの確認結果と追加候補](docs/analysis-sheet-review.md)

## ローカルでの確認

Node.js 22.13以上（今回の確認環境は24.19）とpnpmを使用します。既存のロックファイルを維持したままインストールします。

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm run typecheck
pnpm run build
pnpm run dev --port 4173
```

`npm`を利用できる環境では、インストールに`npm ci`、各コマンドに`npm run ...`も使用できます。ビルド・起動コマンドはWindowsでも動作するNodeスクリプト経由にしました。

自動テストは本番へ接続せず、メモリ内SQLiteに確認用アカウントと旧データの例を作ります。Google分析シートの作成APIはテスト応答へ置き換えます。`typecheck`はCloudflare公式の型を`work/`に生成するだけで、データベースへ接続しません。

ブラウザ確認をする場合は、確認用のローカルD1に`drizzle/`の既存SQLを適用します。空の確認用DBだけに適用し、本番に対して実行しないでください。既存の利用者情報をコピーする必要はありません。

## Step5・Step6の順番表示

Step5は基本編集6本、Step6はズーム・音声編集4本です。動画ごとの専用素材・見本・提出チェックを表示し、1本ずつ次へ進みます。現行の構成と安全な旧データの取り扱いは [Step5・Step6の設定と引き継ぎ](docs/step6-and-safe-progress.md) を参照してください。

## データ互換性

データベースの列追加・一括移行はありません。既存の`user_progress`のJSON欄を使います。新しい提出状況は`practice:seasons:submitted`などのテーマ固有IDで保存し、Step5・Step6それぞれの現在位置も別々に保持します。Step1〜4の完了記録、ページ位置、チェック、分析シートURLを保持します。過去のStep4完了記録も維持し、新しく完了する際は5項目の確認を必要にします。

旧Step5の番号別チェックはテーマ名がないため自動移行しません。原本を保持し、旧完了記録や位置なども`legacyPracticeSnapshot`として既存JSON欄に保管します。利用者がテーマを確認して提出済みとして引き継げます。別の動画へ誤って引き継がないための確認です。

全体進捗は「完了Step数÷6」です。Step1〜4だけ完了している場合は4/6＝67%です。管理者画面ではStep5は0〜6本、Step6は0〜4本を別々に集計します。各Stepの全動画を提出するとそのStepが完了になり、チェック解除で未完了に戻ります。

通信中にページを閉じた場合に備え、未保存分を利用者ID別にブラウザへ控えます。通信復旧時・次回ログイン時に再保存し、正常保存後に控えを削除します。通信できない場合は保存エラーと再試行ボタンを表示し、未保存のままログアウトしないようにしています。同じ利用者による複数タブ・複数端末の同時編集の競合解決は今回の対象外です。

## 元の開発基盤の説明

以下は既存の開発用説明です。教材は独自の氏名・PINログインを使用しており、ChatGPTログイン用ヘルパーは現在の画面では使用していません。

## vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` contains users, sessions, and progress tables
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Email and name are intended for display or contact purposes.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

Step4〜Step6のGoogleドライブ保存方式と追加DBテーブルについては [ローカル実装報告](docs/drive-saving.md) を参照してください。旧提出記録は保持し、新しい保存完了とは分けています。本番DBへの移行は未実施です。

確認専用サイトのローカル準備は [段階Aの説明](docs/review-stage-a.md) を参照してください。`npm run dev:review -- --port 4173` で確認用プレビュー、`npm run build:review` で分離した成果物を作成します。新規サイト・DB・R2の作成や公開は行いません。成果物には接続先の仮設定があり、そのままデプロイしないでください。

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: run the manual, progress, asset, and isolated API tests
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
