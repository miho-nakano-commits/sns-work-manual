"use client";
import { useEffect, useState } from "react";

export function StaffReviewLink() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch("/api/staff-review/access", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) return false;
        const body = await response.json() as { allowed?: unknown };
        return body.allowed === true;
      })
      .then(value => { if (active) setAllowed(value); })
      .catch(() => { if (active) setAllowed(false); });
    return () => { active = false; };
  }, []);
  return allowed ? <div className="staff-review-entry"><a className="secondary-button" href="/staff-review">職員用：Step5・Step6の教材を確認する</a><span>閲覧専用・進捗は変更されません</span></div> : null;
}
