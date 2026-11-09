export default function StaffReviewNotFound() {
  return <main className="auth-page"><section className="auth-card">
    <p className="eyebrow">職員用・閲覧専用</p>
    <h1>職員用画面を開く権限がありません</h1>
    <p>この画面は管理者と、閲覧を許可された職員だけが利用できます。</p>
    <p>一般利用者でログインしている場合は、トップページでログアウトし、管理者の氏名とPINでログインし直してください。</p>
    <p>職員アカウントを使う場合は、閲覧を許可する設定が必要です。</p>
    <a className="primary-button" href="/">トップページに戻る</a>
  </section></main>;
}
