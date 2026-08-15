const fs = require('fs');
const code = fs.readFileSync('script.js', 'utf8');
try {
  new Function(code);
  console.log("No syntax errors found by Function constructor.");
} catch(e) {
  console.log(e.toString());
}
