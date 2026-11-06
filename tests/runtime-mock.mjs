export const env = {};
export const cookieValues = new Map();
export function redirect(url) { throw new Response(null, { status: 307, headers: { Location: url } }); }
export function notFound() { throw new Response(null, { status: 404 }); }
export async function cookies() {
  return {
    get: key => cookieValues.has(key) ? { value: cookieValues.get(key) } : undefined,
    set: (key, value, options) => options?.maxAge === 0 ? cookieValues.delete(key) : cookieValues.set(key, value),
  };
}
