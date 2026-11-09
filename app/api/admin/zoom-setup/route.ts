import { mediaError } from "../../../media-response";
// Closed unconditionally after the approved single-video placement.
export async function PUT() { return mediaError(404, "Not found"); }
