const { readFileSync } = require('fs');

const blocksCustom = require('./blocks.example');

blocksCustom.jsonExample = [
  {
    code: {
      language: 'bash',
      content: [
        JSON.stringify(
          {
            ...blocksCustom,
          },
          null,
          2,
        ),
      ],
    },
  },
];

blocksCustom.jsExample = [
  { code: { language: 'bash', content: [readFileSync('./blocks.example.js').toString()] } },
];

module.exports = () => blocksCustom;
