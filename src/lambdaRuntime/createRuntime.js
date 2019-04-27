const ArchiveBuilder = require('../../node_modules/stratc/util/archiveBuilder');
const stdPath = require('path');
const hostPrefab = stdPath.resolve(__dirname, 'prefab');
const substrateDir = stdPath.resolve(__dirname, '../SubstrateImpl');
const fs = require('fs');

module.exports = async (host, targetFunctions) => {
  const runtimeConfig = createConfig(host, targetFunctions);
  const bundle = new ArchiveBuilder();
  await bundle.copyDirectory(hostPrefab);
  bundle.addDataAsFile(Buffer.from(JSON.stringify(runtimeConfig)), 'config.json');
  host.artifacts.forEach(artifact => {
    const data = getDataFrom(artifact);
    bundle.addDataAsFile(data, artifact.saPath);
  });
  return bundle.data();
};

function createConfig (host, targetFunctions) {
  return {
    hostName: host.name,
    onHost: host.artifacts
      .toMap(artifact => `./${artifact.saPath}`, artifact => artifact.name),
    ranged: (targetFunctions || [])
      .toMap(tfn => tfn.functionName, tfn => tfn.service)
  };
}

function getDataFrom (artifact) {
  if (artifact.name.indexOf('.$SUBSTRATE-') > -1) {
    const substrateFn = artifact.name.split('.$SUBSTRATE-')[1];
    try {
      return fs.readFileSync(stdPath.resolve(substrateDir, `${substrateFn}.js`));  
    } catch (e) {
      throw new Error(`Could not load $SUBSTRATE.${substrateFn}.
  ${e.stack}`);
    }
  }
  return artifact.data;
}
