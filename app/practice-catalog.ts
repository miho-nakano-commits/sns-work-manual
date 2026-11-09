// Stable content IDs: never derive saved submissions from a video's position.
export const BASIC_VIDEO_IDS = ["fruit", "sweets-house", "quiz", "space", "future", "tidying"] as const;
export const ADVANCED_VIDEO_IDS = ["seasons", "psychology", "dream-home", "healing"] as const;
export const ALL_VIDEO_IDS = [...BASIC_VIDEO_IDS, ...ADVANCED_VIDEO_IDS];
export const practiceIds = (step: number) => step === 6 ? ADVANCED_VIDEO_IDS : BASIC_VIDEO_IDS;
export const practiceKey = (contentId: string) => `practice:${contentId}:submitted`;
export const practiceIndexKey = (step: number) => `practiceStep${step}ContentId`;
