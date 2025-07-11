/*
  CONFIGLOADER.JS
  Version: 7
  AppName: MultiChat_Chatty [v7]
  Updated: 7/11/2025 @3:40PM
  Created by Paul Welby
*/

export async function loadConfig() {
  const response = await fetch('/config/config.json');
  if (!response.ok) throw new Error('Failed to load config');
  return response.json();
}
