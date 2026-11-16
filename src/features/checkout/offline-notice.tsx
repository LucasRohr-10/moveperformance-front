import { Notice } from "@/components/ui/notice";

import type { NoticeSegment } from "./present-checkout";

// Next to the plan it talks about, not in the pay card: the key words are bold, as in the mockup.
export function OfflineNotice({ segments }: { segments: NoticeSegment[] }) {
  return (
    <Notice tone="warning">
      {segments.map(({ text, isStrong }) =>
        isStrong ? (
          <strong key={text} className="font-semibold text-white">
            {text}
          </strong>
        ) : (
          <span key={text}>{text}</span>
        ),
      )}
    </Notice>
  );
}
