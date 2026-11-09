import { ALL_PRACTICE_VIDEOS } from "./step-five-materials";

export type MediaAsset = { id: string; path: string; type: string; filename: string };
// Supplementary instruction; it is not one of the 24 curriculum assets.
export const ZOOM_GUIDE_ASSET: MediaAsset = { id: "zoom-operation-guide", path: "/guides/zoom-operation.mp4", type: "video/mp4", filename: "ズームの操作方法.mp4" };
export const MEDIA_ASSETS: MediaAsset[] = [
  { id: "step4-reference", path: "/step4-reference.mp4", type: "video/mp4", filename: "見本動画.mp4" },
  { id: "step4-guide", path: "/step4-operation-guide.mp4", type: "video/mp4", filename: "Step4操作説明.mp4" },
  { id: "step4-images", path: "/step4-image-materials.zip", type: "application/zip", filename: "Step4画像素材.zip" },
  { id: "step4-audio", path: "/step4-audio-material.mp4", type: "video/mp4", filename: "Step4音声素材.mp4" },
  ...ALL_PRACTICE_VIDEOS.flatMap((video, i) => {
    const prefix = `Step${i < 6 ? 5 : 6}_${i < 6 ? i + 1 : i - 5}本目_${video.title}`;
    return [
      { id: `${video.contentId}-reference`, path: video.referenceVideo!.src, type: "video/mp4", filename: `${prefix}_見本動画.mp4` },
      { id: `${video.contentId}-images`, path: video.editingMaterials[0].href, type: "application/zip", filename: `${prefix}_編集画像.zip` },
    ];
  }),
];
// Only explicitly registered assets can be read. No caller-supplied object paths.
export const findMedia = (id: string) => id === ZOOM_GUIDE_ASSET.id ? ZOOM_GUIDE_ASSET : MEDIA_ASSETS.find(asset => asset.id === id);
export function mediaUrl(path: string) {
  const asset = path === ZOOM_GUIDE_ASSET.path ? ZOOM_GUIDE_ASSET : MEDIA_ASSETS.find(asset => asset.path === path);
  if (!asset) throw new Error("Unregistered review media");
  return `/api/${process.env.NEXT_PUBLIC_REVIEW_MODE === "true" ? "review-media" : "media"}/${asset.id}`;
}
