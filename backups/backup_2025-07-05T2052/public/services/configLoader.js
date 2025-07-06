/*
  CONFIGLOADER.JS
  Version: 5
  AppName: MultiChat_Chatty [v5]
  Updated: 7/5/2025 @8:45PM
  Created by Paul Welby
*/

export async function loadConfig() {
  const response = await fetch('/config/config.json');
  if (!response.ok) throw new Error('Failed to load config');
  return response.json();
}
