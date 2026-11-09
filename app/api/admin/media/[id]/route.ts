import { mediaError } from "../../../../media-response";
// Placement is only available in the separately approved preparation version.
// A runtime flag cannot reopen uploads in the completed manual.
export async function PUT() { return mediaError(404, "Not found"); }
