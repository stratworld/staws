const absoluteCat = require('util').promisify(require('fs').readFile);
const path = require('path');
const cat = relative => absoluteCat(path.resolve(__dirname, relative));
module.exports = async function () {
  const impls = await buildImpls();

  return {
    get: artifactName => {
      return impls.keys()
        .filter(name => artifactName.indexOf(name) > -1)
        .map(foundKey => {
          return {
            data: impls[foundKey],
            path: `${artifactName}/${artifactName}.js`
          };
        })[0]
    }
  }
};

async function buildImpls () {
  var bundledContext = false;
  try {
    // if webpack has replaced this require with text, this won't fail
    // if we're not running from a webpack bundle, this will fail
    // because require('strat') will fail, and we need to load these
    // files with cat manually
    const x = require('./SubstrateImpl/httpReception');
    bundledContext = true;
  } catch (e) {}
  
  return {
    'httpConnection': bundledContext
      ? require('./SubstrateImpl/httpConnection.js')
      : await cat('./SubstrateImpl/httpConnection.js'),
    'httpReception': bundledContext
      ? require('./SubstrateImpl/httpReception.js')
      : await cat('./SubstrateImpl/httpReception.js')
  };
}
