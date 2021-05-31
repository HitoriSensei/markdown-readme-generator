#!/usr/bin/env node
const json2md = require('json2md');
const globby = require('globby');
const path = require('path');
const { lstat, writeFile, readFile } = require('fs/promises');
const pkgUp = require('pkg-up');
const regexEscape = require('regex-escape');

function replaceBlock(blockName, string) {
  return (template) =>
    template.replace(
      new RegExp(
        `<!-- ${regexEscape(blockName)} -->(.*?<!-- ${regexEscape(blockName)} end -->)?`,
        'gs',
      ),
      `<!-- ${blockName} -->\n${string}\n<!-- ${blockName} end -->`,
    );
}

async function main() {
  const { argv } = require('yargs')
    .option('outFile', {
      alias: 'o',
      required: true,
      default: 'README.md',
      describe: 'output file',
    })
    .option('packages', {
      required: true,
      default: 'packages/',
      describe: 'packages directory location',
    })
    .option('project', {
      required: true,
      default: path.dirname(await pkgUp()),
      describe: 'root project location',
    })
    .option('dry', {
      describe: 'do not write output file, print results to stdout instead',
    })

    .help();

  const { packages, outFile, project, dry } = argv;
  const packageJsons = await globby([
    path.join(path.resolve(project, packages), '*', 'package.json'),
  ]);
  const packagesBlock = await Promise.all(
    packageJsons.map(async (packageFile) => {
      const packageDir = path.dirname(packageFile);
      const dirName = path.basename(packageDir);
      const packageDetails = require(packageFile);
      const packageReadmeFile = path.join(packageDir, packageDetails.readme || 'README.md');
      const packageReadmeExists = await lstat(packageReadmeFile)
        .then(() => true)
        .catch(() => false);

      return [
        { h2: dirName },
        {
          p: [
            ...(packageReadmeExists
              ? [{ link: { title: packageDetails.name, source: path.relative(outFile) } }]
              : [`\`${packageDetails.name}\``]),
          ],
        },
        ...(packageDetails.description ? [{ p: packageDetails.description }] : []),
      ];
    }),
  );

  const projectPackageFile = path.join(project, 'package.json');
  const projectPackageDetails = require(projectPackageFile);

  const mainBlock = [
    ...(projectPackageDetails.description ? [{ p: projectPackageDetails.description }] : []),
  ];

  const outFilePath = path.resolve(project, outFile);

  const outFileContents = await readFile(outFilePath)
    .catch((e) => {
      if (e.errno === -2) {
        return readFile(path.resolve(__dirname, 'README.example.md'));
      } else {
        console.error(e);
        process.exit(2);
      }
    })
    .then((data) => data.toString());

  const mdResult = [
    replaceBlock('main', json2md(mainBlock)),
    replaceBlock('packages', json2md(packagesBlock)),
  ].reduce((template, mutator) => mutator(template), outFileContents);

  if (dry) {
    console.log(mdResult);
  } else {
    await writeFile(outFilePath, mdResult);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
