const Strat = require('strat').getResolver();
const emit = Strat('this.emit');

module.exports = async e => {
  try {
    const res = await emit({
      method: e.httpMethod.toLowerCase(),
      path: e.path,
      body: e.body,
      headers: e.headers
    });

    const contentType = (res.headers|| {})["Content-Type"];
    var body = contentType === 'application/json'
      ? JSON.stringify(res.body)
      : res.body;
    body = apiGatewayHack(e, body, contentType);
    return {
      statusCode: res.status,
      isBase64Encoded: false,
      headers: res.headers || {},
      body: body
    };
  } catch (e) {
    return {
      statusCode: 500,
      isBase64Encoded: false,
      headers: {'Content-Type': 'text/plain'},
      body: e.stack
    };
  }
};

/*
  AWS APIGateway's development stages insert the stage name as
  a path section.  EX: .execute-api.us-west-2.amazonaws.com/Client
  This is hell and completely breaks html imports like:
    <link rel="stylesheet" type="text/css" href="root.css">
  I have figured out two workarounds for this:
    A) duplicate every html import and deal with the 403s:
      1) <link rel="stylesheet" type="text/css" href="root.css">
      2) <link rel="stylesheet" type="text/css" href="Client/root.css">
    B) rewrite the html to include a base href 
  This is a function that does B.  Its awful and I hate it.
*/
function apiGatewayHack (event, body, contentType) {
  if (contentType !== 'text/html'
    || event === undefined
    || event.requestContext === undefined
    || event.path === event.requestContext.path) {
    return body;
  }
  return body.replace('<head>', `<head><base href="https://${event.requestContext.domainName}${event.requestContext.path}/">`);
}