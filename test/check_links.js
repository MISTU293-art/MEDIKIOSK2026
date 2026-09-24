const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, '..', 'views');

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else if (file.endsWith('.ejs')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const ejsFiles = getFiles(viewsDir);
console.log(`Found ${ejsFiles.length} EJS files.`);

const links = new Set();
const linkOccurrences = [];

const hrefRegex = /href=["']([^"'#][^"']*)["']/g;
const actionRegex = /action=["']([^"'#][^"']*)["']/g;

for (const file of ejsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = hrefRegex.exec(content)) !== null) {
    const link = match[1];
    if (link.startsWith('/') && !link.includes('<%') && !link.startsWith('//')) {
      links.add(link.split('?')[0]);
      linkOccurrences.push({ file: path.relative(viewsDir, file), link });
    }
  }
  while ((match = actionRegex.exec(content)) !== null) {
    const action = match[1];
    if (action.startsWith('/') && !action.includes('<%') && !action.startsWith('//')) {
      links.add(action.split('?')[0]);
      linkOccurrences.push({ file: path.relative(viewsDir, file), action });
    }
  }
}

console.log(`Found ${links.size} unique internal routes:`);
const sortedLinks = [...links].sort();
console.log(sortedLinks);
