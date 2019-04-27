const fs = require('fs');
const stdPath = require('path');
const path = stdPath.resolve(process.cwd(), './staws.json');
var cfg;
try {
  const cfgData = fs.readFileSync(path);
  try {
    cfg = JSON.parse(cfgData.toString());
  } catch (e) {
    throw new Error(`Failed to parse staws config at ${path}:
${e}`);
  }
} catch (notFound) {
  cfg = {
    config: {
      region: 'us-west-2'
    }
  }
}

if (typeof cfg.config !== 'object'
    || typeof cfg.config.region !== 'string') {
  throw new Error(`Invalid config at ${path}.  staws.json must be a map with a map property 'config' with a string property 'region'.  Ex:
{
  "config": {
    "region": "us-west-2"
  }
}
`);
}

module.exports = cfg;