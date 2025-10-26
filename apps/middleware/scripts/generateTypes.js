// scripts/generate-types-simple.js
const fs = require("fs");
const path = require("path");

class SimpleJSDocParser {
  constructor(sourceFilePath) {
    this.sourceFilePath = sourceFilePath;
    this.documentTypes = new Map();
    this.responseTypes = new Map();
    this.requestTypes = new Map();

    this.documentRequiresResponseTypes = false;
    this.documentRequiresRequestTypes = false;

    this.responseRequiresRequestTypes = false;

    this.requestRequiresResponseTypes = false;
  }

  parseFile() {
    const content = fs.readFileSync(this.sourceFilePath, "utf8");
    const lines = content.split("\n");

    let i = 0;
    while (i < lines.length) {
      // find interface
      let start = i;
      while (
        start < lines.length &&
        !lines[start].trim().startsWith("interface ")
      ) {
        start++;
      }

      let end = start;
      while (end < lines.length && !lines[end].trim().includes("}")) {
        end++;
      }

      for (let k = start; k < end; ) {
        let j = k;
        while (
          j < lines.length &&
          !(lines[j].trim().includes(":") && !lines[j].trim().includes("//"))
        ) {
          j++;
        }

        const memberFieldLine = lines[j].trim();
        console.log(j, memberFieldLine);
        if (memberFieldLine.includes(":") && !memberFieldLine.includes("//")) {
          const comments = [];

          // Collect comments for the member field
          for (let l = k; l < j; l++) {
            const line = lines[l].trim();
            console.log(l, line);

            if (line.includes("//")) {
              comments.push(line.substring(2).trim());
            }
          }

          const [propName, propType] = memberFieldLine.split(":");

          const fieldInfo = {
            name: propName,
            type: propType.replace(";", "").trim(),
            comment: comments,
          };

          for (let l = k; l < j; l++) {
            const line = lines[l].trim();
            if (line.startsWith("/** @")) {
              // Extract annotations
              const annotation = line.match(/@\w+/g)[0] || "";

              const interfaceName = annotation.substring(1);
              if (annotation.includes("Document")) {
                if (!this.documentTypes.has(interfaceName)) {
                  this.documentTypes.set(interfaceName, []);
                }

                let pt = fieldInfo.type;
                if (fieldInfo.type.includes("Response")) {
                  pt = `ResponseTypes.${fieldInfo.type}`;
                  this.documentRequiresResponseTypes = true;
                }
                if (fieldInfo.type.includes("Request")) {
                  pt = `RequestTypes.${newFieldInfo.type}`;
                  this.documentRequiresRequestTypes = true;
                }
                this.documentTypes
                  .get(interfaceName)
                  .push({ name: propName, type: pt, comment: comments });
              }
              if (annotation.includes("Response")) {
                if (!this.responseTypes.has(interfaceName)) {
                  this.responseTypes.set(interfaceName, []);
                }
                let pt = fieldInfo.type;
                if (fieldInfo.type.includes("Request")) {
                  pt = `RequestTypes.${fieldInfo.type}`;
                  this.responseRequiresRequestTypes = true;
                }
                this.responseTypes.get(interfaceName).push({ name: propName, type: pt, comment: comments });
              }
              if (annotation.includes("Request")) {
                if (!this.requestTypes.has(interfaceName)) {
                  this.requestTypes.set(interfaceName, []);
                }
                let pt = fieldInfo.type;
                if (fieldInfo.type.includes("Response")) {
                  pt = `ResponseTypes.${fieldInfo.type}`;
                  this.requestRequiresResponseTypes = true;
                }
                this.requestTypes.get(interfaceName).push({ name: propName, type: pt, comment: comments });
              }
            }
          }

          k = j + 1;
        }
      }

      i = end + 1;
    }
  }

  generateDocumentTypesFile(paths) {
    let content = "// Generated Document Types\n\n";
    const outputPath = paths.document;

    if (this.documentRequiresResponseTypes) {
      content += `import * as ResponseTypes from "./responseTypes"\n`;
    }
    if (this.documentRequiresRequestTypes) {
      content += `import * as RequestTypes from "./requestTypes"\n`;
    }
    content += `\n`;

    this.documentTypes.forEach((fields, interfaceName) => {
      content += `export interface ${interfaceName} {\n`;

      fields.forEach((field) => {
        if (field.comment) {
          content += `  // ${field.comment}\n`;
        }
        content += `  ${field.name}: ${field.type};\n`;
      });

      content += "}\n\n";
    });

    const p1 = path.join(outputPath, "ezauth/src/__generated__/documentTypes.ts");
    const p2 = path.join(outputPath, "ezstack/src/__generated__/documentTypes.ts");
    // const p3 = path.join(outputPath, "ezstack-site/src/__generated__/documentTypes.ts");

    fs.writeFileSync(p1, content);
    fs.writeFileSync(p2, content);
    // fs.writeFileSync(p3, content);
    console.log(`Generated document types file: ${outputPath}`);
  }

  generateResponseTypesFile(paths) {
    const outputPath = paths.response;
    let content = "// Generated Response Types\n\n";

    if (this.responseRequiresRequestTypes) {
      content += `import * as RequestTypes from "./requestTypes"\n`;
    }
    content += `\n`;

    this.responseTypes.forEach((fields, interfaceName) => {
      content += `export interface ${interfaceName} {\n`;

      fields.forEach((field) => {
        if (field.comment) {
          content += `  // ${field.comment}\n`;
        }
        content += `  ${field.name}: ${field.type};\n`;
      });

      content += "}\n\n";
    });

    const p1 = path.join(outputPath, "ezauth/src/__generated__/responseTypes.ts");
    const p2 = path.join(outputPath, "ezstack/src/__generated__/responseTypes.ts");
    const p3 = path.join(outputPath, "ezstack-site/src/__generated__/responseTypes.ts");

    fs.writeFileSync(p1, content);
    fs.writeFileSync(p2, content);
    fs.writeFileSync(p3, content);
    console.log(`Generated response types file: ${outputPath}`);
  }

  generateRequestTypesFile(paths) {
    const outputPath = paths.request;
    let content = "// Generated Request Types\n\n";

    if (this.requestRequiresResponseTypes) {
      content += `import * as ResponseTypes from "./responseTypes"\n`;
    }
    content += `\n`;

    this.requestTypes.forEach((fields, interfaceName) => {
      content += `export interface ${interfaceName} {\n`;

      fields.forEach((field) => {
        if (field.comment) {
          content += `  // ${field.comment}\n`;
        }
        content += `  ${field.name}: ${field.type};\n`;
      });

      content += "}\n\n";
    });

    const p1 = path.join(outputPath, "ezauth/src/__generated__/requestTypes.ts");
    const p2 = path.join(outputPath, "ezstack/src/__generated__/requestTypes.ts");
    const p3 = path.join(outputPath, "ezstack-site/src/__generated__/requestTypes.ts");

    fs.writeFileSync(p1, content);
    fs.writeFileSync(p2, content);
    fs.writeFileSync(p3, content);
    console.log(`Generated Request types file: ${outputPath}`);
  }

  generateFiles(outputDir) {
    this.parseFile();

    const paths = {
      document: outputDir,
      response: outputDir,
      request: outputDir,
    };

    this.generateDocumentTypesFile(paths);
    this.generateResponseTypesFile(paths);
    this.generateRequestTypesFile(paths);

    console.log("Type generation completed!");
    console.log(`Document types: ${this.documentTypes.size} interfaces`);
    console.log(`Response types: ${this.responseTypes.size} interfaces`);
  }
}

// Usage
const generator = new SimpleJSDocParser(
  "apps/middleware/types/ezstackTypes.ts"
);
generator.generateFiles("apps/");
