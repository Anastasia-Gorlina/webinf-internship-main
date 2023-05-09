const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const ignoreFilePath = '.stylelintignore';

async function run() {
  const ignoreFileContent = await readFile(ignoreFilePath, 'utf-8');
  const ignoredFiles = ignoreFileContent.split('\n').filter(Boolean);
  const filesToLint = await getFilesToLint(ignoredFiles);

  for (const file of filesToLint) {
    const content = await readFile(file, 'utf-8');
    if (!isFileIgnored(content)) {
      const { stdout } = await exec(`npx stylelint ${file} --formatter json`);
      const result = JSON.parse(stdout);
      if (result.length) {
        const errorsByLine = groupErrorsByLine(result);
        const linesToAddIgnoreTo = Object.keys(errorsByLine);
        const linesToAddIgnoreToContent = linesToAddIgnoreTo.map(lineNumber => {
          const errors = errorsByLine[lineNumber];
          const ruleIds = errors.map(error => error.rule).join(', ');
          return `/* stylelint-disable-next-line ${ruleIds} */\n${content.split('\n')[lineNumber - 1]}`;
        });
        const updatedContent = content.split('\n').map((line, index) => {
          if (linesToAddIgnoreTo.includes(String(index + 1))) {
            return linesToAddIgnoreToContent.shift();
          }
          return line;
        }).join('\n');
        await writeFile(file, updatedContent, 'utf-8');
      }
    }
    await removeFromIgnore(file);
  }
}

async function getFilesToLint(ignoredFiles) {
  const allFiles = await getAllFiles('.');
  return allFiles.filter(file => !ignoredFiles.some(ignoredFile => file.startsWith(ignoredFile)));
}

async function getAllFiles(dirPath) {
  const dirents = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(dirents.map(dirent => {
    const filePath = path.join(dirPath, dirent.name);
    return dirent.isDirectory() ? getAllFiles(filePath) : filePath;
  }));
  return Array.prototype.concat(...files);
}

function isFileIgnored(content) {
  const matches = content.match(/\/\*\s*stylelint-disable\s*\*\//);
  return Boolean(matches && matches.length);
}

function groupErrorsByLine(errors) {
  const errorsByLine = {};
  for (const error of errors) {
    if (!errorsByLine[error.line]) {
      errorsByLine[error.line] = [];
    }
    errorsByLine[error.line].push(error);
  }
  return errorsByLine;
}

async function removeFromIgnore(filePath) {
    const ignoreFileContent = await readFile(ignoreFilePath, 'utf-8');
    const ignoredFiles = ignoreFileContent.split('\n').filter(Boolean);
    const updatedIgnoreFileContent = ignoredFiles.filter(file => file !== filePath).join('\n');
    await writeFile(ignoreFilePath, updatedIgnoreFileContent, 'utf-8');
    }
    
    async function readFile(filePath, encoding) {
    return fs.promises.readFile(filePath, encoding);
    }
    
    async function writeFile(filePath, content, encoding) {
    return fs.promises.writeFile(filePath, content, encoding);
    }