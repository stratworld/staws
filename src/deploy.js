const ArchiveBuilder = require('stratc').archiveBuilder;
const createRole = require('./createIamRole');
const createLambda = require('./createLambda');
const local = require('stratc').local;
const stdPath = require('path');
const config = require('./config');
const region = config.config.region;
const getSubstrateImpls = require('./getSubstrateImpls');

module.exports = async (saBuf, fileName) => {
  const hosts = await ingest(saBuf);
  hosts.values().forEach(setLambdaName);
  await createRolesForHosts(hosts);
  const substrateImpls = await getSubstrateImpls();
  const lambdas = await deployLambdas(hosts, substrateImpls);
  await birth(saBuf, lambdas, fileName, substrateImpls);
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

async function deployLambdas (hosts, substrateImpls) {
  const lambdaResults = await Promise.all(hosts.values().map(async host => {
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
    return await createLambda(host, targets, substrateImpls);
  }));
  return lambdaResults
    .reduce((aggregate, nextResult) => Object.assign(aggregate, nextResult),
      {});
}

async function birth (saBuf, lambdas, fileName, substrateImpls) {
  await local(saBuf, substrateImpls, {
    region: region,
    lambdas: lambdas,
    fileName: fileName
  });
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
