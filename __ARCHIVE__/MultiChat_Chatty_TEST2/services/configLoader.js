export async function loadConfig() {
  const response = await fetch('/config.json');
  if (!response.ok) throw new Error('Failed to load config');
  return response.json();
}
