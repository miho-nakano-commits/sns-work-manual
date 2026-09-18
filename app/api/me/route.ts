import { getSessionUser, jsonError } from "../../server-auth";

export async function GET() {
  try {
    return Response.json({ user: await getSessionUser() });
  } catch (error) {
    return jsonError(error);
  }
}
