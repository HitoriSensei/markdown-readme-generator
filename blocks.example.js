const { execSync } = require('child_process');
const usageContent = execSync('node . --help').toString();

module.exports = {
  // you can use https://www.npmjs.com/package/json2md notation
  asJsonMD: [
    {
      code: {
        language: 'bash',
        content: [usageContent],
      },
    },
  ],

  // or literal markdown
  asLiteralMd: `
    \`\`\`bash
    ${usageContent}
    \`\`\`
  `,
};
