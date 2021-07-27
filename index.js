#!/usr/bin/env node
const json2md = require('json2md');
const globby = require('globby');
const path = require('path');
const { lstat, writeFile, readFile } = require('fs/promises');
const pkgUp = require('pkg-up');
const regexEscape = require('regex-escape');
const flat = require('flat');

const logging = {
  verbose: false,
};

function replaceBlock(blockName, string) {
  logging.verbose && console.log(`Creating block <!-- ${blockName} -->`);
  const reBlock = regexEscape(blockName);
  const regExp = new RegExp(
    `<!--\\s+${reBlock}\\s+-->([\\s\\n]*)(.*?([\\s\\n]*)<!-- ${reBlock} end -->)?`,
    'gsm',
  );

  return (template) => {
    let match = template.match(regExp);
    if (match) {
      logging.verbose && console.log(`Found <!-- ${blockName} -->, replacing`);
      return template.replace(
        regExp,
        `<!-- ${blockName} -->$1${string.trim()}$3<!-- ${blockName} end -->`,
      );
    } else {
      return template;
    }
  };
}

async function loadCustomBlocks(custom, project) {
  if (custom) {
    let customBlocksModule = require(path.resolve(project, custom));
    let customBlocksDefinitions =
      typeof customBlocksModule === 'function' ? await customBlocksModule() : customBlocksModule;

    return Object.entries(customBlocksDefinitions).map(([name, contents]) => {
      return replaceBlock(name, typeof contents === 'string' ? contents : json2md(contents));
    });
  } else {
    return [];
  }
}

async function buildReadme(argv) {
  const {
    packages,
    outFile,
    project = path.dirname(await pkgUp()),
    dry,
    recursive,
    create,
    custom,
    contextLinkBlocks = [],
  } = argv;
  const packageJsons = packages
    ? await globby([path.join(path.resolve(project, packages), '*', 'package.json')])
    : [];

  const outFilePath = path.resolve(project, outFile);

  logging.verbose && console.log('Processing', outFilePath);

  const customBlocks = await loadCustomBlocks(custom, project);

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
              ? [
                  {
                    link: {
                      title: packageDetails.name,
                      source: path.relative(path.dirname(outFilePath), packageReadmeFile),
                    },
                  },
                ]
              : [`\`${packageDetails.name}\``]),
          ],
        },
        ...(packageDetails.description ? [{ p: packageDetails.description }] : []),
      ];
    }),
  );

  const projectPackageFile = path.join(project, 'package.json');
  const projectPackageDetails = require(projectPackageFile);

  const titleBlock = [{ h1: projectPackageDetails.name }];

  const flatPackage = flat(projectPackageDetails);

  const rootPackageJsonBlocks = [
    ...Object.keys(flatPackage)
      .filter((key) => typeof flatPackage[key] === 'string' || typeof flatPackage[key] === 'number')
      .map((key) => replaceBlock(key, json2md([{ p: flatPackage[key] }]))),
    replaceBlock('title', json2md(titleBlock)),
  ];

  const outFileContents = await readFile(outFilePath)
    .catch((e) => {
      if (create && e.errno === -2) {
        return readFile(path.resolve(__dirname, 'README.example.md'));
      } else {
        throw e;
      }
    })
    .then((data) => data.toString());

  const linkBlocks =
    packageJsons.length > 0
      ? await Promise.all(
          packageJsons.map(async (packageFile) => {
            const packageDir = path.dirname(packageFile);
            const dirName = path.basename(packageDir);

            return replaceBlock(
              `link ${dirName}`,
              json2md([{ link: { title: dirName, source: `#${dirName}` } }]),
            );
          }),
        )
      : [];

  const thisBlock = [{ p: outFile }];
  const linkThisBlock = [{ link: { title: outFile, source: outFile } }];

  const mdResult = [
    ...rootPackageJsonBlocks,
    replaceBlock('packages', json2md(packagesBlock)),
    replaceBlock('this', json2md(thisBlock)),
    replaceBlock('link this', json2md(linkThisBlock)),
    ...linkBlocks,
    ...contextLinkBlocks,
    ...customBlocks,
  ].reduce((template, mutator) => mutator(template), outFileContents);

  if (dry) {
    console.log('--- ', outFilePath);
    console.log(mdResult);
  } else {
    console.log('Writing', path.relative(process.cwd(), outFilePath));
    await writeFile(outFilePath, mdResult);
  }
  if (recursive) {
    for (const packageFile of packageJsons) {
      const packageDir = path.dirname(packageFile);
      const dirName = path.basename(packageDir);
      const packageDetails = require(packageFile);
      const packageReadmeFile = path.join(packageDir, packageDetails.readme || 'README.md');
      try {
        await buildReadme({
          recursive: false,
          packages: false,
          outFile: packageReadmeFile,
          project: packageDir,
          create: false,
          contextLinkBlocks: [...contextLinkBlocks, ...linkBlocks],
          dry,
        });
      } catch (e) {
        if (e.errno === -2) {
          logging.verbose &&
            console.log(`Ignoring ${dirName} from recursive building, missing readme file.`);
        } else {
          throw e;
        }
      }
    }
  }
}

async function main() {
  const { argv } = require('yargs')
    .option('outFile', {
      alias: 'o',
      required: true,
      default: 'README.md',
      describe: 'output file path. Can be relative to project root or absolute',
    })
    .option('packages', {
      required: false,
      default: 'packages/',
      describe: 'packages directory location',
    })
    .option('project', {
      required: false,
      describe: 'root project location',
    })
    .option('dry', {
      boolean: true,
      describe: 'do not write output file, print results to stdout instead',
    })
    .option('recursive', {
      alias: 'r',
      default: true,
      describe: 'should also update readme files in packages',
    })
    .option('create', {
      default: true,
      describe: 'create readme file if one does not exist yet',
    })
    .option('verbose', {
      alias: 'v',
      boolean: true,
      default: false,

      describe: 'display verbose output',
    })
    .option('custom', {
      required: false,
      describe: 'load custom block definitions from file (js or json)',
    })

    .help();

  logging.verbose = argv.verbose && !argv.dry;

  await buildReadme(argv);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
