
const fs = require("fs");
let lines = fs.readFileSync("routes/orders.js", "utf8").split("\n");

// Remove the double }); at line 361
let newLines = [];
for (let i = 0; i < lines.length; i++) {
  if (i >= 356 && i <= 362) {
    if (lines[i].trim() === "});") {
       // keep only one
       if (newLines[newLines.length - 1] && newLines[newLines.length - 1].trim() === "});") {
          continue; // skip duplicate
       }
    }
  }
  newLines.push(lines[i]);
}

let text = newLines.join("\n");
text = text.replace(/\/\/\s*\.\.\.\s*\n\n\}\);\n\n\n\}\);/g, "});"); // fallback
// The actual lines were:
// // ...
//
// });
// 
// 
// });

// I\x27ll just use a robust regex
text = text.replace(/\n\}\);\n\s*\n\s*\}\);\n/g, "\n});\n\n");
text = text.replace(/\/\/\s*\.\.\.\s*\n\s*\}\);\n/g, "");

// End of profit-30d
if (!text.includes("} catch (err) {")) {
  // wait, profit-30d has try block
  text = text.replace(
    /top_products\n\s+\}\);\n\nmodule\.exports = router;/,
    "top_products\n  });\n  } catch (err) { res.status(500).json({error: err.message}); }\n});\n\nmodule.exports = router;"
  );
}

fs.writeFileSync("routes/orders.js", text);

