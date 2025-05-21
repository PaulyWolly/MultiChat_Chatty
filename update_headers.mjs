import fs from 'fs';
import path from 'path';
import pkg from 'enquirer';
const { prompt } = pkg;

const FILES = [
  'public/js/app.js',
  'public/js/dom.js',
  'public/js/config.js',
  'public/js/modules/audio/audioManager.js',
  'public/js/modules/jokes/jokeManager.js',
  'public/js/modules/recipe/recipeManager.js',
  'public/js/modules/speech/speechRecognition.js',
  'public/js/modules/utils/helpers.js',
  'public/js/modules/youtube/youtubeManager.js',
  'server.js',
  'public/styles.css',
  'public/index.html',
  'package.json'
];

function getHeader(content) {
  const match = content.match(/\/\*[\s\S]*?\*\//);
  return match ? match[0] : null;
}

function parseHeader(header) {
  return {
    Version: (header.match(/Version:\s*(.*)/) || [])[1]?.trim(),
    AppName: (header.match(/AppName:\s*(.*)/) || [])[1]?.trim(),
    Updated: (header.match(/Updated:\s*(.*)/) || [])[1]?.trim(),
    CreatedBy: (header.match(/Created by\s*:? (.*)/) || [])[1]?.trim(),
  };
}

function sanitizeNpmName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-._~]/g, '-') // replace invalid chars with dash
    .replace(/-+/g, '-')            // collapse multiple dashes
    .replace(/^-+|-+$/g, '');       // trim leading/trailing dashes
}

function makeExitValidator(field) {
  return (input) => {
    if (['q', 'x', 'quit', 'exit'].includes(input.trim().toLowerCase())) {
      console.log(`\nExiting gracefully from "${field}". No changes made to this or remaining files.`);
      process.exit(0);
    }
    return true;
  };
}

async function promptForHeader(current) {
  // Prompt for Version first
  const { Version } = await prompt({
    type: 'input',
    name: 'Version',
    message: `Version: (type 'Q' or 'X' to exit)`,
    initial: current.Version || '23.0.0',
    validate: makeExitValidator('Version'),
  });

  // Now use Version in the defaults for the other prompts
  const answers = await prompt([
    {
      type: 'input',
      name: 'AppName',
      message: `Display App Name (for UI, headers, etc.): (type 'Q' or 'X' to exit)`,
      initial: `Multi-Chat [v${Version}]`,
      validate: makeExitValidator('AppName'),
    },
    {
      type: 'input',
      name: 'NpmName',
      message: `npm package name (for package.json): (type 'Q' or 'X' to exit)`,
      initial: sanitizeNpmName(`multichat-v${Version}-working`),
      validate: input =>
        /^[a-z0-9-._~]+$/.test(input.trim()) ||
        'Invalid npm package name! Use only lowercase letters, numbers, dashes, dots, underscores, or tildes.',
    },
    {
      type: 'input',
      name: 'Date',
      message: `Date (MM/DD/YYYY): (type 'Q' or 'X' to exit)`,
      initial: current.Updated ? current.Updated.split('@')[0].trim() : '5/16/2025',
      validate: input => {
        if (makeExitValidator('Date')(input) !== true) return false;
        const dateRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/\d{4}$/;
        return dateRegex.test(input) || 'Please enter a valid date in MM/DD/YYYY format';
      }
    },
    {
      type: 'input',
      name: 'Time',
      message: `Time (HH:MM[AM|PM]): (type 'Q' or 'X' to exit)`,
      initial: current.Updated ? current.Updated.split('@')[1].trim() : '1:00PM',
      validate: input => {
        if (makeExitValidator('Time')(input) !== true) return false;
        const timeRegex = /^(1[0-2]|0?[1-9]):(00|30)(AM|PM)$/i;
        if (!timeRegex.test(input)) {
          return 'Please enter a valid time in HH:MM[AM|PM] format (e.g., 1:00PM, 2:30AM).\nOnly :00 and :30 minute values are allowed.';
        }
        // Standardize the format (ensure proper capitalization)
        const [time, meridiem] = input.split(/(?=[AP]M)/i);
        return time + meridiem.toUpperCase();
      },
      result: input => {
        // Ensure consistent formatting
        const [time, meridiem] = input.split(/(?=[AP]M)/i);
        return time + meridiem.toUpperCase();
      }
    },
    {
      type: 'input',
      name: 'CreatedBy',
      message: `Created by: (type 'Q' or 'X' to exit)`,
      initial: current.CreatedBy || 'Paul Welby',
      validate: makeExitValidator('Created by'),
    },
  ]);

  // Combine date and time
  const Updated = `${answers.Date} @${answers.Time}`;
  return { ...answers, Version, Updated };
}

function updateHeaderInText(content, newHeader) {
  const oldHeader = getHeader(content);
  if (!oldHeader) return content; // No header found
  return content.replace(oldHeader, newHeader);
}

function updateIndexHtml(content, { AppName, Version, Updated }) {
  const newHeader = [
    '<!--',
    `  INDEX.html`,
    `  Version: ${Version}`,
    `  AppName: ${AppName}`,
    `  Updated: ${Updated}`,
    '  Created by Paul Welby',
    '-->'
  ].join('\n');

  // If an HTML comment header exists, replace it; otherwise, insert at the top
  if (/<!--[\s\S]*?Created by Paul Welby[\s\S]*?-->/.test(content)) {
    content = content.replace(/<!--[\s\S]*?Created by Paul Welby[\s\S]*?-->/, newHeader);
  } else {
    content = newHeader + '\n\n' + content;
  }

  // Update <title>
  content = content.replace(/<title>.*?<\/title>/i, `<title>${AppName}</title>`);

  // Update <h3> (first one found)
  content = content.replace(
    /<h3>.*?<\/h3>/i,
    `<h3>${AppName.replace(/\[v[^\]]+\]/, `[v${Version}]`)} ${Updated.replace('@', '@')}</h3>`
  );

  return content;
}

async function main() {
  console.log("=== Interactive Header Updater ===");
  console.log("Type 'Q' or 'X' at any prompt to exit gracefully.\n");

  // Use the first file with a header as the template for defaults
  let firstHeader = { Version: '', AppName: '', Updated: '', CreatedBy: '' };
  for (const filePath of FILES) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const header = getHeader(content);
      if (header) {
        firstHeader = parseHeader(header);
        break;
      }
    }
  }

  // Prompt ONCE for all values
  const updated = await promptForHeader(firstHeader);

  const changes = [];
  for (const filePath of FILES) {
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, 'utf8');
    let oldHeader = getHeader(content);

    if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('server.js')) {
      // Build new header
      const newHeader = [
        '/*',
        `  ${path.basename(filePath).toUpperCase()}`,
        `  Version: ${updated.Version}`,
        `  AppName: ${updated.AppName}`,
        `  Updated: ${updated.Updated}`,
        `  Created by ${updated.CreatedBy}`,
        '*/'
      ].join('\n');
      content = updateHeaderInText(content, newHeader);
      fs.writeFileSync(filePath, content, 'utf8');
      changes.push({ file: filePath, old: oldHeader, new: newHeader });
    } else if (filePath.endsWith('index.html')) {
      const newContent = updateIndexHtml(content, updated);
      fs.writeFileSync(filePath, newContent, 'utf8');
      changes.push({ file: filePath, old: oldHeader, new: getHeader(newContent) });
    } else if (filePath.endsWith('package.json')) {
      const pkg = JSON.parse(content);
      pkg.version = updated.Version;
      pkg.name = updated.NpmName;
      fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2), 'utf8');
      changes.push({ file: filePath, old: `name: ${pkg.name}, version: ${pkg.version}`, new: `name: ${pkg.name}, version: ${pkg.version}` });
    }
  }

  // Report
  console.log('\n=== Update Summary ===');
  changes.forEach(({ file, old, new: n }) => {
    console.log(`\nFile: ${file}\n--- Old Header ---\n${old}\n--- New Header ---\n${n}`);
  });
  console.log('\nAll headers and metadata updated!');
}

main();
