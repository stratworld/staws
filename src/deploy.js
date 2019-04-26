const ArchiveBuilder = require('../util/archiveBuilder');

module.exports = async saBuf => {
  try {
    const hosts = await ingest(saBuf);
    hosts.values().forEach(setLambdaName);
  } catch (e) {
    console.log(e.stack)
  }



  //make roles
  //make lambda bundles
    //make runtime
    //create zip
  //deploy lambda bundles
  //birth
    //http connection

  //http reception
}

function setLambdaName (host) {
  host.functionName = `Strat-${host.name}@${host.id}`;
}

async function ingest (saBuf) {
  const sa = new ArchiveBuilder(saBuf);
  var hosts;
  try {
    hosts = JSON.parse(sa.read('hosts.json').toString());  
  } catch (e) {
    throw new Error(`Could not parse the hosts from the sa file. ${e}`);
  }

  hosts.values()
    .forEach(host => {
      (host.artifacts || []).forEach(artifact => {
        const error = new Error(`Could not open the artifact for ${artifact.name}`);
        try {
          artifact.data = sa.read(artifact.saPath);
        } catch (e) {
          throw error;
        }
        if (artifact.data === undefined) {
          throw error;
        }
      });
    });  

  return hosts;
}
