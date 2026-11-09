import { useContext } from "react";
import { DriveContext, DrivePanel } from "./drive-ui";
import { PracticeMedia } from "./practice-media";
import type { Screen } from "./curriculum";
import { STEP5_VIDEO_COUNT, practiceCompletedCount, legacySubmissionNumbers, type SavedState } from "./progress";
import { currentPracticeVideo, firstUnsubmittedVideo } from "./step-five-progress";
import { practiceVideos, type PracticeVideo } from "./step-five-materials";

import { practiceKey } from "./practice-catalog";

export function StepFiveContent({ stepId = 5, type, saved, legacySaved = saved, update, onSelectVideo, onExplanation, onShowClear }: {
  stepId?: number; type: Screen["type"]; saved: SavedState; legacySaved?: SavedState; update: (key: string, value: boolean) => void;
  onSelectVideo: (index: number) => void; onExplanation: () => void; onShowClear: () => void;
}) {
  const videos = practiceVideos(stepId);
  const total = videos.length;
  const count = practiceCompletedCount(saved.checks, stepId);
  const done = count === total;
  if (type === "practiceVideo") {
    const index = currentPracticeVideo(saved, stepId);
    return <><LegacyReview stepId={stepId} saved={legacySaved} /><PracticeVideoLesson key={index} stepId={stepId} total={total} video={videos[index]} count={count}
      checked={saved.checks[practiceKey(videos[index].contentId!)] === true}
      onCheck={checked => update(practiceKey(videos[index].contentId!), checked)}
      onPrevious={() => index === 0 ? onExplanation() : onSelectVideo(index - 1)}
      onNext={() => index === total - 1 ? onShowClear() : onSelectVideo(index + 1)} /></>;
  }
  return done ? <section className="practice-clear" role="status">
    <div className="practice-medal" aria-hidden="true">★</div>
    <p className="eyebrow">STEP {stepId} COMPLETE</p>
    <h3>おめでとうございます！<br />{total}本の動画が完成しました！</h3>
    <p>動画編集の練習を最後までやり遂げました！</p>
    <p>1本ずつ積み重ねた経験を、これからの動画づくりに活かしましょう。</p>
    <PracticeProgress count={count} total={total} stepId={stepId} />
    <button type="button" className="secondary-button" onClick={() => onSelectVideo(0)}>保存した動画を確認する</button>
  </section> : <><PracticeProgress count={count} total={total} stepId={stepId} /><p className="practice-note">あと{total - count}本です。続きの動画を完成させ、Googleドライブに保存しましょう。</p><button type="button" className="primary-button" onClick={() => onSelectVideo(firstUnsubmittedVideo(saved, stepId))}>続きの動画へ</button></>;
}

export function PracticeVideoLesson({ stepId = 5, total = STEP5_VIDEO_COUNT, video, count, checked, onCheck, onPrevious, onNext }: {
  stepId?: number; total?: number; video: PracticeVideo; count: number; checked: boolean; onCheck: (value: boolean) => void; onPrevious: () => void; onNext: () => void;
}) {
  const last = video.id === total;
  const drive = useContext(DriveContext);
  return <section className="practice-single" aria-label={`${video.id}本目の動画制作`}>
    <h3 className="practice-video-heading">{video.id}本目の動画を作ろう{video.title && `：${video.title}`}</h3>
    <PracticeProgress count={count} total={total} stepId={stepId} />
    <Encouragement count={count} checked={checked} />
    <PracticeMedia video={video} />
    <p className="practice-note">この動画用の素材と見本を使います。準備中の場合は職員に確認してください。完成した動画をMP4形式で書き出し、自分のGoogleドライブフォルダに保存してから、下のチェックを付けましょう。</p>
    <DrivePanel />
    <section className={`practice-item ${checked ? "submitted" : ""}`}>
      <div><h4>Googleドライブへの保存</h4><span className="practice-status">{checked ? "✓ 保存完了" : "保存未確認"}</span></div>
      <label><input type="checkbox" checked={checked} disabled={!drive.ready || drive.busy || (!drive.folderUrl && !checked)} onChange={event => onCheck(event.target.checked)} aria-label={`${video.id}本目：Googleドライブに保存できました`} /><span>Googleドライブに保存できました</span></label>
    </section>
    <p className="practice-note">間違えてチェックした場合は、チェックを外せます。前の動画へ戻っても、保存状況は残ります。</p>
    <div className="lesson-actions practice-navigation">
      <button type="button" className="secondary-button" onClick={onPrevious}>{video.id === 1 ? "説明へ戻る" : "前の動画へ"}</button>
      <button type="button" className="primary-button" onClick={onNext} disabled={!checked || (last && count < total)}>{last ? "クリア画面へ" : "次の動画へ"}</button>
    </div>
    {!checked && <p className="disabled-note">保存完了チェックを付けると、次へ進めます。</p>}
  </section>;
}

export function PracticeProgress({ count, total = STEP5_VIDEO_COUNT, stepId = 5 }: { count: number; total?: number; stepId?: number }) {
  return <div className="practice-progress">
    <p aria-live="polite">現在 <strong>{count}/{total}本</strong> 完成！</p>
    <div className="progress-track" role="progressbar" aria-label={`STEP${stepId}の動画保存完了数`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={count}><span style={{ width: `${count / total * 100}%` }} /></div>
  </div>;
}

export function Encouragement({ count, checked = false }: { count: number; checked?: boolean }) {
  return <p className="practice-cheer" role="status"><span aria-hidden="true">✦ </span>{checked ? "保存できましたね。ひとつずつ、できることが増えています！" : count === 0 ? "自分のペースで大丈夫！一つずつ進めていこう！" : "その調子！途中で休んでも大丈夫。つまずいたら職員に聞いてみよう！"}</p>;
}
function LegacyReview({stepId,saved}:{stepId:number;saved:SavedState}) {
 const count=practiceCompletedCount(saved.checks,stepId);const numbers=legacySubmissionNumbers(saved.checks);
 if(!count&&!numbers.length&&!saved.completed.includes(stepId))return null;
 return <details className="legacy-practice"><summary>以前の提出記録（保管）</summary><p>旧方式：{count}本の提出チェックを保管しています。{numbers.length>0&&`番号だけの旧記録も${numbers.length}件保管しています。`}</p><p>旧方式の完了とGoogleドライブ保存完了は別です。自動では引き継いでいません。実際に保存できたことを確認してから新しいチェックを付けてください。</p></details>;
}
