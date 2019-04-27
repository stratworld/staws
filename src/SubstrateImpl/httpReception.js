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
    return {
      statusCode: res.status,
      isBase64Encoded: false,
      headers: res.headers || {},
      body: typeof res.body === 'string' ? res.body : JSON.stringify(res.body)
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