const ArchiveBuilder = require('stratc').archiveBuilder;
const stdPath = require('path');
const hostPrefab = stdPath.resolve(__dirname, 'prefab');
const substrateDir = stdPath.resolve(__dirname, '../SubstrateImpl');
const fs = require('fs');

module.exports = async (host, targetFunctions, substrateImpls) => {
  const runtimeConfig = createConfig(host, targetFunctions);
  const bundle = new ArchiveBuilder();
  bundle.addDataAsFile(Buffer.from(getStratHijack()), 'node_modules/strat/index.js');
  bundle.addDataAsFile(Buffer.from(getRuntimeText()), 'stratRuntime.js');
  bundle.addDataAsFile(Buffer.from(JSON.stringify(runtimeConfig)), 'config.json');
  host.artifacts.forEach(artifact => {
    const data = getDataFrom(artifact, substrateImpls);
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
      .toMap(tfn => tfn.functionName, tfn => tfn.service),
    resources: host.artifacts
      .filter(artifact => artifact.isResource)
      .map(artifact => artifact.name)
      .constantMapping(true)
  };
}

function getDataFrom (artifact, substrateImpls) {
  if (artifact.name.indexOf('.$SUBSTRATE-') > -1) {
    const substrateFn = artifact.name.split('.$SUBSTRATE-')[1];
    const substrateFnObj = substrateImpls.get(substrateFn);
    if (substrateFnObj === undefined) {
      throw new Error(`Could not load $SUBSTRATE.${substrateFn}.`);
    }
    return substrateFnObj.data;
  }
  return artifact.data;
}

//copy this to the lambda as /node_modules/strat/index.js
function getStratHijack () {
  return `
const strat = require('../../stratRuntime');
const domo = strat.getMajordomo();
module.exports = {
  //this needs to return the majordomo
  //without any closures because of stack traces
  getResolver: function () {
    return domo;
  }
};`;
}

//copy this to the lambda as /stratRuntime.js
function getRuntimeText () {
  return `
//config will be placed inside the lambda
const config = require('./config.json');
const cat = require('util').promisify(require('fs').readFile);
const domoFactory = require(config.onHost['Strat.majordomo']);
var domo;
module.exports = {
  //this won't get called until we've created the domo on line 11
  getMajordomo: function () {
    return domo;
  },
  handler: async function (event, context, callback) {
    domo = await domoFactory(invoke, config.hostName);
    try {
      callback(null, await domo.dispatch(event));
    } catch (e) {
      callback(e);
    }
  }
};

async function invoke (reference, event) {
  const onHostFile = config.onHost[reference]
  if (onHostFile !== undefined) {
    if (config.resources[reference]) {
      const fileData = await cat(onHostFile);
      return (fileData || Buffer.from('')).toString();
    }
    return require(onHostFile)(event);
  }
  const service = (reference || '').split('.')[0];
  if (service !== undefined) {
    return await callLambda(config.ranged[service], event);
  } else {
    throw new Error(\`Cannot invoke reference \${reference}\`);
  }
}

async function callLambda (functionName, event) {
  const AWS = require('aws-sdk');
  const lambda = new AWS.Lambda();
  const invoke = require('util').promisify(lambda.invoke.bind(lambda));

  const response = await invoke({
    InvocationType: 'RequestResponse',
    FunctionName: functionName,
    Payload: Buffer.from(JSON.stringify(event))
  });

  return JSON.parse(response.Payload);
}`;
}
