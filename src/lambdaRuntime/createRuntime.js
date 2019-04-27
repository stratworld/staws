const ArchiveBuilder = require('../../util/archiveBuilder');
const stdPath = require('path');
const hostPrefab = stdPath.resolve(__dirname, 'prefab');
module.exports = async (host, targetFunctions) => {
  const runtimeConfig = createConfig(host, targetFunctions);
  const bundle = new ArchiveBuilder();
  await bundle.copyDirectory(hostPrefab);
  bundle.addDataAsFile(Buffer.from(JSON.stringify(runtimeConfig)), 'config.json');
  host.artifacts.forEach(artifact => {
    bundle.addDataAsFile(artifact.data, artifact.saPath);
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
