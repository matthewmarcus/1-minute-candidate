export type VideoSlotType = 'issue' | 'endorsement';

export function countSlots(
  purchases: { product_type: string }[],
  videos: { video_type: string; status: string }[],
  type: VideoSlotType
): { purchased: number; used: number; remaining: number } {
  const purchased = purchases.filter(p =>
    p.product_type === (type === 'issue' ? 'issue_video' : 'endorsement_video')
  ).length;
  const used = videos.filter(v =>
    v.video_type === type &&
    (v.status === 'submitted' || v.status === 'under_review' || v.status === 'approved')
  ).length;
  return { purchased, used, remaining: Math.max(0, purchased - used) };
}

export function countOverviewSlots(
  purchases: { product_type: string }[],
  videos: { video_type: string; status: string }[]
): { purchased: number; used: number; remaining: number } {
  const purchased = purchases.filter(
    p => p.product_type === 'profile_setup' || p.product_type === 'overview_rerecord'
  ).length;
  const used = videos.filter(
    v => v.video_type === 'overview' &&
         ['submitted', 'under_review', 'approved'].includes(v.status)
  ).length;
  return { purchased, used, remaining: Math.max(0, purchased - used) };
}
