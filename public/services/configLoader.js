/*
  CONFIGLOADER.JS
  Version: 7
  AppName: MultiChat_Chatty [v7]
  Updated: 7/12/2025 @5:40AM
  Created by Paul Welby
*/

export async function loadConfig() {
  const response = await fetch('/config/config.json');
  if (!response.ok) throw new Error('Failed to load config');
  return response.json();
}
