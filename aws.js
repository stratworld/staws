require('./util/jsExtensions');
const stdPath = require('path');
const cat = require('util').promisify(require('fs').readFile);
const deploy = require('./src/deploy.js');

var filenameOrV = process.argv[2];
if (filenameOrV === '-v' || filenameOrV === '--version') {
  const packageJson = require('./package.json');
  console.log(packageJson.version);
  process.exit(0);
}

if (filenameOrV === '-h'
  || filenameOrV === '--help'
  || filenameOrV === undefined) {
  printHelp();
}

var filename = stdPath.resolve(process.cwd(), process.argv[2]);

try {
  cat(filename)
    .then(deploy)
    .catch(asyncError => {
      console.log(asyncError.stack);
      process.exit(1);
    })
} catch (syncError) {
  console.log(syncError.stack);
  process.exit(1);
}


function printHelp () {
  console.log(`Usage for staws:

  -v or --version   prints the version of staws
  -h or --help      prints this documentation
  .sa file          deploys the contents of the .sa file
                      EX: staws HelloWorld.sa
`);
  process.exit(0);
}
