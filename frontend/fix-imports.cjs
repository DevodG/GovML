const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const typeImports = ['Column', 'Action', 'FilterConfig', 'FilterOption'];
      const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]*components\/ui)['"]/g;
      
      let modified = false;
      content = content.replace(importRegex, (match, importsStr, modulePath) => {
        const imports = importsStr.split(',').map(s => s.trim()).filter(Boolean);
        const types = [];
        const values = [];
        
        for (const imp of imports) {
          if (typeImports.includes(imp)) {
            types.push(imp);
          } else {
            values.push(imp);
          }
        }
        
        if (types.length > 0) {
          modified = true;
          let result = '';
          if (values.length > 0) {
            result += `import { ${values.join(', ')} } from '${modulePath}'\n`;
          }
          result += `import type { ${types.join(', ')} } from '${modulePath}'`;
          return result;
        }
        
        return match;
      });
      
      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed', fullPath);
      }
    }
  }
}

processDir('./src/pages');
processDir('./src/layouts');
