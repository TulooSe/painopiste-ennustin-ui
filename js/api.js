export async function apiGet(route, params = {}) {
  const query = new URLSearchParams({ route, ...params }).toString();

  const res = await fetch(`${BASE_URL}?${query}`);
  if (!res.ok) throw new Error("API error");

  return await res.json();
}


export async function haeLennokit() {
  return apiGet("lennokit");
}
