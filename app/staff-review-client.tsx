"use client";
import { useState } from "react";
import { PracticeMedia } from "./practice-media";
import { practiceVideos } from "./step-five-materials";

export function StaffReviewClient() {
  const [step, setStep] = useState(5);
  const [index, setIndex] = useState(0);
  const videos = practiceVideos(step);
  const video = videos[index];
  const chooseStep = (value: number) => { setStep(value); setIndex(0); };
  return <main className="staff-review-page">
    <header className="topbar"><a className="brand-button" href="/">SNSお仕事マニュアルへ戻る</a><strong>職員用・閲覧専用</strong></header>
    <div className="staff-review-wrap">
      <h1>Step5・Step6の教材を確認する</h1>
      <p className="staff-review-notice">職員用の閲覧専用画面です。保存先が未設定でも、すべての動画を確認できます。閲覧しても学習の進捗・保存完了チェック・完成本数は変更されません。</p>
      <nav className="staff-review-steps" aria-label="確認するStep">
        {[5, 6].map(id => <button key={id} type="button" className={step === id ? "primary-button" : "secondary-button"} aria-pressed={step === id} onClick={() => chooseStep(id)}>Step{id}：{id === 5 ? "基本編6本" : "応用編4本"}</button>)}
      </nav>
      <nav className="staff-review-videos" aria-label="確認する動画">
        {videos.map((item, i) => <button key={item.contentId} type="button" aria-current={i === index ? "true" : undefined} onClick={() => setIndex(i)}>{i + 1}本目：{item.title}</button>)}
      </nav>
      <section className="practice-single" aria-label="閲覧中の教材">
        <p className="eyebrow">STEP {step} ・ 教材 {index + 1}/{videos.length}</p>
        <h2>{index + 1}本目：{video.title}</h2>
        <PracticeMedia key={video.contentId} video={video} />
        <div className="lesson-actions practice-navigation">
          <button type="button" className="secondary-button" disabled={index === 0} onClick={() => setIndex(value => value - 1)}>前の動画へ</button>
          <button type="button" className="primary-button" disabled={index === videos.length - 1} onClick={() => setIndex(value => value + 1)}>次の動画へ</button>
        </div>
        <p>確認したい動画は上の一覧からいつでも選べます。画面を閉じると閲覧位置はリセットされます。</p>
      </section>
    </div>
  </main>;
}
