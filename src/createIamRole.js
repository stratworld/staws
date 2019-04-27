const AWS = require('aws-sdk');
const IAM = new AWS.IAM();
const config = require('./config');
const p = require('util').promisify
const roles = config.roles || {};
const region = config.config.region;
const promisify = function (method) {
  return p(IAM[method]).bind(IAM);
}

const sdk = {
  createRole: promisify('createRole'),
  putRolePolicy: promisify('putRolePolicy'),
  getRole: promisify('getRole')
}

module.exports = async function (host, targetFunctionNames) {
  const account = await getAccountId();
  const targetObjs = targetFunctionNames
    .map(fnName => {
      return {
        action: 'lambda:InvokeFunction',
        arn: `arn:aws:lambda:${region}:${account}:function:${fnName}`
      }
    })
    .concat(getAdditionalPerms(host.containers));

  const roleName = `Strat-${host.name}-${host.id}`;
  console.log(`Creating role ${roleName}`);
  return createRole('lambda.amazonaws.com', roleName, targetObjs);
};

async function createRole (assumeService, roleName, targets) {
  const role = await createRoleIdempotent(roleName);
  if (targets.length > 0) {
    const policies = {
      Version: "2012-10-17",
      Statement: (targets || [])
        .map(target => {
          return {
            Effect:"Allow",
            Action: Array.isArray(target.action) ? target.action : [ target.action ],
            Resource: target.arn
          }
        })
    };

    const putPolicyParams = {
      PolicyDocument: JSON.stringify(policies),
      PolicyName: `${roleName}invocations`, 
      RoleName: roleName
    };
    
    console.log(`Allowing ${roleName} to invoke:
  ${targets.map(target => target.arn).join('\n  ')}`);

    await sdk.putRolePolicy(putPolicyParams);
  }

  // console.log('Sleeping for 3 seconds because IAM is terrible');
  //https://stackoverflow.com/questions/36419442/the-role-defined-for-the-function-cannot-be-assumed-by-lambda
  await new Promise(function (resolve, reject) {
    setTimeout(resolve, 3000);
  });

  return role.Role.Arn;
}

async function createRoleIdempotent (roleName) {
  var createRoleParams = {
    AssumeRolePolicyDocument: JSON.stringify({
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "Service": [ 'lambda.amazonaws.com' ]
          },
          "Action": "sts:AssumeRole"
        }
      ]
    }), 
    Path: "/", 
    RoleName: roleName
  };

  try {
    return await sdk.createRole(createRoleParams);
  } catch (e) {
    if (e.message.indexOf('already exists.') > -1)  {
      return sdk.getRole({ RoleName: roleName });
    } else {
      throw e;
    }
  }
}

function getAdditionalPerms (containers) {
  return roles.intersect(containers)
    .values()
    .flat();
}

async function getAccountId () {
  var sts = new AWS.STS();
  return new Promise(function (resolve, reject) {
    sts.getCallerIdentity({}, function(e, r) {
      if (e) {
        reject(e);
      } else {
        resolve(r.Account);
      }
    });
  });
}
