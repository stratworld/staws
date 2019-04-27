const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();
const defaults = require('./lambdaDefaults');
const createRuntime = require('./lambdaRuntime/createRuntime');

module.exports = async (host, targetFunctions) => {
  host.runtime = await createRuntime(host, targetFunctions);
  return create(host);
};

async function create (host) {
  const params = Object.assign({
    Runtime: 'nodejs8.10'
  }, defaults);

  //todo: upload this to s3 first
  params.Code = { ZipFile: host.runtime }
  params.FunctionName = host.functionName;
  params.Role = host.roleArn;

  async function attemptToCreateLambda (backoff) {
    var result;
    try {
      result = await new Promise(function(resolve, reject) {
        lambda.createFunction(params, function (err, res) {
          if (err) reject(err);
          else {
            resolve({ [host.name]: {
              functionName: res.FunctionName,
              functionArn: res.FunctionArn
            } });
          }
        });
      });
    } catch (e) {
      if (e.message === 'The role defined for the function cannot be assumed by Lambda.') {
        if (backoff > 16000) {
          throw new Error(`IAM roles still not assumable after exponential backoff retrys.
Try to do this again later.  Error: ${e.stack}`);
        }
        console.log(`IAM roles not assumable yet; waiting ${backoff / 1000} seconds.`);
        await new Promise(function (resolve, reject) {
          setTimeout(resolve, backoff);
        });
        return attemptToCreateLambda(backoff * 2);
      }
      throw e;
    }
    return result;
  }
  console.log(`Creating lambda ${host.functionName}`);
  return attemptToCreateLambda(2000);
}
