/*
  CONFIGLOADER.JS
  Version: 7
  AppName: MultiChat_Chatty [v7]
  Updated: 7/13/2025 @7:30PM
  Created by Paul Welby
*/

export async function loadConfig() {
  const response = await fetch('/config/config.json');
  if (!response.ok) throw new Error('Failed to load config');
  return response.json();
}
