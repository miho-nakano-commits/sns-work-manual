import { jsonError } from "../../../server-auth";
import { requireStaffReviewer } from "../../../server-staff-review";

export async function GET() {
  try {
    await requireStaffReviewer();
    return Response.json({ allowed: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const response = jsonError(error);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
