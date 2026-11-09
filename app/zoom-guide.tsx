"use client";

import { useEffect, useId, useRef, useState } from "react";
import { mediaUrl, ZOOM_GUIDE_ASSET } from "./media-catalog";

function ZoomGuidePlayer() {
  const [failed, setFailed] = useState(false);
  return <div className="zoom-guide-player">
    <video controls playsInline preload="metadata" aria-label="ズームの操作方法のお手本動画" onError={() => setFailed(true)}>
      <source src={mediaUrl(ZOOM_GUIDE_ASSET.path)} type="video/mp4" onError={() => setFailed(true)} />
      お使いのブラウザーは動画の再生に対応していません。
    </video>
    {failed && <p role="alert">動画を読み込めませんでした。通信状況を確認してから開き直してください。続く場合は職員にお知らせください。</p>}
    <p>止めたり、少し戻したりしながら、自分のペースで確認しましょう。</p>
  </div>;
}

export function ZoomGuideCard() {
  const titleId = useId();
  return <section className="zoom-guide-card" aria-labelledby={titleId}>
    <div className="zoom-guide-heading"><span aria-hidden="true">▶</span><div><p>応用編を始める前に</p><h2 id={titleId}>ズームの操作方法</h2></div><span className="zoom-guide-tag">お手本動画</span></div>
    <p>ズーム編集の操作を動画で確認しましょう。何度でも見返せます。</p>
    <ZoomGuidePlayer />
    <div className="zoom-guide-actions"><a className="primary-button" href="#step6-course">Step6 応用編へ進む →</a></div>
  </section>;
}

export function ZoomGuideEntry() {
  const [open, setOpen] = useState(false);
  return <aside className="zoom-guide-entry" aria-label="ズーム編集のお手本">
    <div><strong>ズームの操作方法</strong><p>操作に迷ったら、お手本動画で確認しましょう。</p></div>
    <button type="button" className="secondary-button" aria-haspopup="dialog" onClick={() => setOpen(true)}>ズームの操作方法を見る ▶</button>
    {open && <ZoomGuideDialog onClose={() => setOpen(false)} />}
  </aside>;
}

function ZoomGuideDialog({onClose}: {onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="zoom-guide-dialog" aria-labelledby={titleId} onClose={onClose}>
    <div className="zoom-guide-dialog-heading"><h2 id={titleId}>ズームの操作方法</h2><button type="button" className="secondary-button" onClick={() => dialog.current?.close()}>閉じる ×</button></div>
    <p>動画を閉じると、見ていた教材の続きに戻れます。</p>
    <ZoomGuidePlayer />
  </dialog>;
}
