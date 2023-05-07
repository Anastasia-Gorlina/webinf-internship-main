const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const IGNORE_FILE_PATH = '.stylelintignore';

function isIgnoredFile(filePath) {
  const ignorePatterns = fs.readFileSync(IGNORE_FILE_PATH, 'utf-8').split('\n');
  for (const pattern of ignorePatterns) {
    if (!pattern || pattern.startsWith('#')) {
        
      continue;
    }
    const isMatch = filePath.match(new RegExp(pattern));
    if (isMatch) {
      return true;
    }
  }
  return false;
}

function hasErrors(filePath) {
  try {
    execSync(`npx stylelint ${filePath}`, { stdio: 'ignore' });
    return false;
  } catch (error) {
    return true;
  }
}

function optimizeIgnoreFile() {
  const ignorePatterns = fs.readFileSync(IGNORE_FILE_PATH, 'utf-8').split('\n');
  const optimizedPatterns = [];
  for (const pattern of ignorePatterns) {
    if (!pattern || pattern.startsWith('#')) {
      
      optimizedPatterns.push(pattern);
      continue;
    }
    const filePath = path.join(__dirname, pattern);
    if (!fs.existsSync(filePath) || !hasErrors(filePath)) {
      console.log(`Exclude ${pattern}`);
      continue;
    }
    optimizedPatterns.push(pattern);
  }
  const optimizedContent = optimizedPatterns.join('\n');
  fs.writeFileSync(IGNORE_FILE_PATH, optimizedContent, 'utf-8');
  console.log(`Optimized ${IGNORE_FILE_PATH}: ${optimizedContent.length} bytes`);
}

optimizeIgnoreFile();
