export type PracticeDownload = { label: string; href: string; downloadName?: string };
export type PracticeVideo = {
  id: number;
  title?: string;
  contentId?: string;
  operation?: string;
  instructions?: string[];
  editingMaterials: PracticeDownload[];
  materialNote?: string;
  referenceNote?: string;
  referenceVideo: { src: string; mimeType?: string; downloadName?: string } | null;
};

// User-confirmed order. Empty materials/null references still render 準備中.
// Healing keeps its original asset URLs so the original files remain untouched.
export const ORIGINAL_PRACTICE_VIDEOS: PracticeVideo[] = [
  {
    "id": 1,
    "title": "フルーツ雑学",
    "materialNote": "「フルーツ雑学」の編集に使う画像5枚です。ZIPをダウンロードして「すべて展開」で画像を取り出してください。見本動画はこのZIPには含まれません。",
    "editingMaterials": [
      {
        "label": "「フルーツ雑学」の画像5枚をダウンロード（ZIP）",
        "href": "/step5/fruit/editing-images.zip",
        "downloadName": "Step5_1本目_フルーツ雑学_編集画像.zip"
      }
    ],
    "referenceNote": "完成イメージを確認する見本動画「フルーツ雑学」（約28秒）です。編集用の画像素材とは別に表示しています。",
    "referenceVideo": {
      "src": "/step5/fruit/reference.mp4",
      "mimeType": "video/mp4",
      "downloadName": "Step5_1本目_フルーツ雑学_見本動画.mp4"
    }
  },
  {
    "id": 2,
    "title": "お菓子の家",
    "materialNote": "「お菓子の家」の編集に使う画像6枚です。ZIPをダウンロードして「すべて展開」で画像を取り出してください。見本動画はこのZIPには含まれません。",
    "editingMaterials": [
      {
        "label": "「お菓子の家」の画像6枚をダウンロード（ZIP）",
        "href": "/step5/sweets-house/editing-images.zip",
        "downloadName": "Step5_2本目_お菓子の家_編集画像.zip"
      }
    ],
    "referenceNote": "完成イメージを確認する見本動画「お菓子の家」（約30秒）です。編集用の画像素材とは別に表示しています。",
    "referenceVideo": {
      "src": "/step5/sweets-house/reference.mp4",
      "mimeType": "video/mp4",
      "downloadName": "Step5_2本目_お菓子の家_見本動画.mp4"
    }
  },
  {
    "id": 3,
    "title": "クイズ",
    "materialNote": "「クイズ」の編集に使う画像7枚です。ZIPをダウンロードして「すべて展開」で画像を取り出してください。見本動画はこのZIPには含まれません。",
    "editingMaterials": [
      {
        "label": "「クイズ」の画像7枚をダウンロード（ZIP）",
        "href": "/step5/quiz/editing-images.zip",
        "downloadName": "Step5_3本目_クイズ_編集画像.zip"
      }
    ],
    "referenceNote": "完成イメージを確認する見本動画「クイズ」（約25秒）です。編集用の画像素材とは別に表示しています。",
    "referenceVideo": {
      "src": "/step5/quiz/reference.mp4",
      "mimeType": "video/mp4",
      "downloadName": "Step5_3本目_クイズ_見本動画.mp4"
    }
  },
  {
    "id": 4,
    "title": "宇宙",
    "materialNote": "「宇宙」の編集に使う画像7枚です。ZIPをダウンロードして「すべて展開」で画像を取り出してください。見本動画はこのZIPには含まれません。",
    "editingMaterials": [
      {
        "label": "「宇宙」の画像7枚をダウンロード（ZIP）",
        "href": "/step5/space/editing-images.zip",
        "downloadName": "Step5_4本目_宇宙_編集画像.zip"
      }
    ],
    "referenceNote": "完成イメージを確認する見本動画「宇宙」（約29秒）です。編集用の画像素材とは別に表示しています。",
    "referenceVideo": {
      "src": "/step5/space/reference.mp4",
      "mimeType": "video/mp4",
      "downloadName": "Step5_4本目_宇宙_見本動画.mp4"
    }
  },
  {
    "id": 5,
    "title": "100年後",
    "materialNote": "「100年後」の編集に使う画像7枚です。ZIPをダウンロードして「すべて展開」で画像を取り出してください。見本動画はこのZIPには含まれません。",
    "editingMaterials": [
      {
        "label": "「100年後」の画像7枚をダウンロード（ZIP）",
        "href": "/step5/future/editing-images.zip",
        "downloadName": "Step5_5本目_100年後_編集画像.zip"
      }
    ],
    "referenceNote": "完成イメージを確認する見本動画「100年後」（約30秒）です。編集用の画像素材とは別に表示しています。",
    "referenceVideo": {
      "src": "/step5/future/reference.mp4",
      "mimeType": "video/mp4",
      "downloadName": "Step5_5本目_100年後_見本動画.mp4"
    }
  },
  {
    "id": 6,
    "title": "片付け",
    "materialNote": "「片付け」の編集に使う画像8枚です。ZIPをダウンロードして「すべて展開」で画像を取り出してください。見本動画はこのZIPには含まれません。",
    "editingMaterials": [
      {
        "label": "「片付け」の画像8枚をダウンロード（ZIP）",
        "href": "/step5/tidying/editing-images.zip",
        "downloadName": "Step5_6本目_片付け_編集画像.zip"
      }
    ],
    "referenceNote": "完成イメージを確認する見本動画「片付け」（約30秒）です。編集用の画像素材とは別に表示しています。",
    "referenceVideo": {
      "src": "/step5/tidying/reference.mp4",
      "mimeType": "video/mp4",
      "downloadName": "Step5_6本目_片付け_見本動画.mp4"
    }
  },
  {
    "id": 7,
    "title": "四季",
    "materialNote": "「四季」の編集に使う画像7枚です。ZIPをダウンロードして「すべて展開」で画像を取り出してください。見本動画はこのZIPには含まれません。",
    "editingMaterials": [
      {
        "label": "「四季」の画像7枚をダウンロード（ZIP）",
        "href": "/step5/seasons/editing-images.zip",
        "downloadName": "Step5_7本目_四季_編集画像.zip"
      }
    ],
    "referenceNote": "完成イメージを確認する見本動画「四季」（約30秒）です。編集用の画像素材とは別に表示しています。",
    "referenceVideo": {
      "src": "/step5/seasons/reference.mp4",
      "mimeType": "video/mp4",
      "downloadName": "Step5_7本目_四季_見本動画.mp4"
    }
  },
  {
    "id": 8,
    "title": "心理テスト",
    "materialNote": "「心理テスト」の編集に使う画像5枚です。ZIPをダウンロードして「すべて展開」で画像を取り出してください。見本動画はこのZIPには含まれません。",
    "editingMaterials": [
      {
        "label": "「心理テスト」の画像5枚をダウンロード（ZIP）",
        "href": "/step5/psychology/editing-images.zip",
        "downloadName": "Step5_8本目_心理テスト_編集画像.zip"
      }
    ],
    "referenceNote": "完成イメージを確認する見本動画「心理テスト」（約26秒）です。編集用の画像素材とは別に表示しています。",
    "referenceVideo": {
      "src": "/step5/psychology/reference.mp4",
      "mimeType": "video/mp4",
      "downloadName": "Step5_8本目_心理テスト_見本動画.mp4"
    }
  },
  {
    "id": 9,
    "title": "住みたい",
    "materialNote": "「住みたい」の編集に使う画像5枚です。ZIPをダウンロードして「すべて展開」で画像を取り出してください。見本動画はこのZIPには含まれません。",
    "editingMaterials": [
      {
        "label": "「住みたい」の画像5枚をダウンロード（ZIP）",
        "href": "/step5/dream-home/editing-images.zip",
        "downloadName": "Step5_9本目_住みたい_編集画像.zip"
      }
    ],
    "referenceNote": "完成イメージを確認する見本動画「住みたい」（約28秒）です。編集用の画像素材とは別に表示しています。",
    "referenceVideo": {
      "src": "/step5/dream-home/reference.mp4",
      "mimeType": "video/mp4",
      "downloadName": "Step5_9本目_住みたい_見本動画.mp4"
    }
  },
  {
    "id": 10,
    "title": "癒し",
    "materialNote": "「癒し」の編集に使う画像5枚です。ZIPをダウンロードして「すべて展開」で画像を取り出してください。見本動画はこのZIPには含まれません。",
    "editingMaterials": [
      {
        "label": "「癒し」の画像5枚をダウンロード（ZIP）",
        "href": "/step5/healing/editing-images.zip",
        "downloadName": "Step5_10本目_癒し_編集画像.zip"
      }
    ],
    "referenceNote": "完成イメージを確認する見本動画「癒し」（約20秒）です。編集用の画像素材とは別に表示しています。",
    "referenceVideo": {
      "src": "/step5/video-01/reference.mp4",
      "mimeType": "video/mp4",
      "downloadName": "Step5_10本目_癒し_見本動画.mp4"
    }
  }
];

const contentIds = ["fruit", "sweets-house", "quiz", "space", "future", "tidying", "seasons", "psychology", "dream-home", "healing"];
export const ALL_PRACTICE_VIDEOS = ORIGINAL_PRACTICE_VIDEOS.map((video, i) => ({ ...video, contentId: contentIds[i] }));
export const PRACTICE_VIDEOS: PracticeVideo[] = ALL_PRACTICE_VIDEOS.slice(0, 6);
const zoomInstructions = ["見本動画で、画像がゆっくり大きくなるところを見てみましょう。", "編集ソフトで画像を置き、ズームを始める位置と終える位置を決めます。", "始めは全体が見える大きさ、終わりは少し大きい大きさにします。『キーフレーム』（大きさを記録する目印）がある場合は、この2か所に付けます。", "再生して、急に大きくなったり、文字や顔が画面からはみ出したりしないか確認しましょう。操作名が違う場合は職員に聞いてみましょう。"];
export const ADVANCED_PRACTICE_VIDEOS: PracticeVideo[] = ALL_PRACTICE_VIDEOS.slice(6).map((video, i) => ({
  ...video, id: i + 1, title: i === 2 ? "住みたい世界（住めるなら？）" : video.title,
  operation: i === 3 ? "音声編集" : "ズーム編集",
  instructions: i === 3 ? ["見本動画を聞き、音が入るタイミングと音量を確かめましょう。", "用意された見本動画を音声素材として読み込み、編集ソフトの『音声を抽出』『音声を分離』などの機能で音を取り出します。見つからないときは職員に聞いてみましょう。", "画像に合わせて音声を置き、長すぎる部分を切り、聞きやすい音量にします。", "始めと終わりの音量をゆっくり変える『フェードイン・フェードアウト』を試します。最後まで再生し、大きすぎる音や途切れがないか確認しましょう。"] : zoomInstructions,
  editingMaterials: video.editingMaterials.map(file => ({ ...file, downloadName: `Step6_${i + 1}本目_${video.title}_編集画像.zip` })),
  referenceVideo: video.referenceVideo && { ...video.referenceVideo, downloadName: `Step6_${i + 1}本目_${video.title}_見本動画.mp4` },
}));
export const practiceVideos = (step: number) => step === 6 ? ADVANCED_PRACTICE_VIDEOS : PRACTICE_VIDEOS;
