//so ghetto
const ArchiveBuilder = require('../node_modules/stratc/util/archiveBuilder');
const createRole = require('./createIamRole');
const createLambda = require('./createLambda');

module.exports = async saBuf => {
  try {
    const hosts = await ingest(saBuf);
    hosts.values().forEach(setLambdaName);
    await createRolesForHosts(hosts);
    //replace substrate fns
    await deployLambdas(hosts);
    await birth(hosts);
  } catch (e) {
    console.log(e.stack)
  }

  //birth
    //http connection
    // I think we're going to want to create a role for api gateway way here

  //http reception
}

async function createRolesForHosts (hosts) {
  return await Promise.all(hosts.values().map(async host => {
    const targets = host.inScope
      .keys()
      .map(target => hosts
        .values()
        .filter(candidateTargetHost =>
          candidateTargetHost.containers[target]
          && candidateTargetHost.name !== host.name)
        .map(host => host.functionName)
        [0])
      .purge()
      .constantMapping(true)
      .keys();
    host.roleArn = await createRole(host, targets);
  }));
}

async function deployLambdas (hosts) {
  return await Promise.all(hosts.values().map(async host => {
    const targets = host.inScope
      .keys()
      .map(target => {
        return {
          service: target,
          functionName: hosts
            .values()
            .filter(host => host.containers[target])
            .map(host => host.functionName)
            [0]
        };
      });
    return await createLambda(host, targets);
  }));
}

async function birth (hosts) {

}

function setLambdaName (host) {
  host.functionName = `Strat-${host.name}-${host.id}`;
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
