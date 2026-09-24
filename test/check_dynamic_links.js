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
const allHrefMatches = [];
const hrefRegex = /href=["']([^"']+)["']/g;
const formRegex = /action=["']([^"']+)["']/g;

for (const file of ejsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = hrefRegex.exec(content)) !== null) {
    allHrefMatches.push({ file: path.relative(viewsDir, file), target: match[1] });
  }
  while ((match = formRegex.exec(content)) !== null) {
    allHrefMatches.push({ file: path.relative(viewsDir, file), target: match[1], isAction: true });
  }
}

// Filter internal links
const internalLinks = allHrefMatches.filter(m => {
  const t = m.target;
  return t.startsWith('/') && !t.startsWith('//') && !t.startsWith('/css') && !t.startsWith('/js') && !t.startsWith('/uploads') && !t.startsWith('/manifest.json');
});

console.log(`Extracted ${internalLinks.length} internal links/actions across ${ejsFiles.length} files.`);

// Normalize dynamic parameters (e.g. /doctor/patient/<%= p._id %> -> /doctor/patient/:id)
const normalizedRoutes = new Set();
for (const item of internalLinks) {
  let norm = item.target.split('?')[0];
  norm = norm.replace(/<%=[^%]+%>/g, ':param');
  normalizedRoutes.add(norm);
}

console.log('Normalized unique link patterns:');
console.log([...normalizedRoutes].sort());
