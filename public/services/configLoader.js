/*
  CONFIGLOADER.JS
  Version: 6
  AppName: MultiChat_Chatty [v6]
  Updated: 7/9/2025 @7:15AM
  Created by Paul Welby
*/

export async function loadConfig() {
  const response = await fetch('/config/config.json');
  if (!response.ok) throw new Error('Failed to load config');
  return response.json();
}
