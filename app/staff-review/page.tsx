import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "../server-auth";
import { canStaffReview } from "../server-staff-review";
import { StaffReviewClient } from "../staff-review-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StaffReviewPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (!canStaffReview(user)) notFound();
  return <StaffReviewClient />;
}
