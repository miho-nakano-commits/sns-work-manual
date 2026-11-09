import { mediaUrl } from "./media-catalog";
import type { PracticeVideo } from "./step-five-materials";

export function PracticeMedia({ video }: { video: PracticeVideo }) {
  return <>
    {video.instructions && <section className="practice-operation"><h4>今回の練習：{video.operation}</h4><ol>{video.instructions.map(text => <li key={text}>{text}</li>)}</ol><p>まずは短い部分で試してみましょう。つまずいたら職員に聞いてみよう！</p></section>}
    <div className="editing-resources">
      <section><span aria-hidden="true">01</span><div><h4>{video.id}本目の編集素材{video.title && `（${video.title}）`}</h4>
        {video.materialNote && <p className="practice-asset-note">{video.materialNote}</p>}
        {video.editingMaterials.length ? video.editingMaterials.map(file => <a key={file.href} href={mediaUrl(file.href)} download={file.downloadName || true}>{file.label}</a>) : <p className="material-pending">準備中</p>}
      </div></section>
      <section><span aria-hidden="true">02</span><div><h4>{video.id}本目の見本動画{video.title && `（${video.title}）`}</h4>
        {video.referenceNote && <p className="practice-asset-note">{video.referenceNote}</p>}
        {video.referenceVideo ? <div className="reference-video"><video controls playsInline preload="metadata" aria-label={`${video.id}本目の見本動画`}><source src={mediaUrl(video.referenceVideo.src)} type={video.referenceVideo.mimeType} />お使いのブラウザは動画の再生に対応していません。</video><a href={mediaUrl(video.referenceVideo.src)} download={video.referenceVideo.downloadName || true}>見本動画をダウンロード</a></div> : <p className="material-pending">準備中</p>}
      </div></section>
    </div>
  </>;
}
