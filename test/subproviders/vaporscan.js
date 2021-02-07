const sha3 = require('vaporyjs-util').sha3;
const test = require('tape')
const ProviderEngine = require('../../index.js')
const createPayload = require('../../util/create-payload.js')
const VaporscanSubprovider = require('../../subproviders/vaporscan')

test('vaporscan vap_getBlockTransactionCountByNumber', function(t) {
  t.plan(3)

  var engine = new ProviderEngine()
  var vaporscan = new VaporscanSubprovider()
  engine.addProvider(vaporscan)
  engine.start()
  engine.sendAsync(createPayload({
    method: 'vap_getBlockTransactionCountByNumber',
    params: [
      '0x132086'
    ],
  }), function(err, response){
    t.ifError(err, 'throw no error')
    t.ok(response, 'has response')
    t.equal(response.result, '0x8')
    t.end()
  })
})

test('vaporscan vap_getTransactionByHash', function(t) {
  t.plan(3)

  var engine = new ProviderEngine()
  var vaporscan = new VaporscanSubprovider()
  engine.addProvider(vaporscan)
  engine.start()
  engine.sendAsync(createPayload({
    method: 'vap_getTransactionByHash',
    params: [
      '0xe420d77c4f8b5bf95021fa049b634d5e3f051752a14fb7c6a8f1333c37cdf817'
    ],
  }), function(err, response){
    t.ifError(err, 'throw no error')
    t.ok(response, 'has response')
    t.equal(response.result.nonce, '0xd', 'nonce matches known nonce')
    t.end()
  })
})

test('vaporscan vap_blockNumber', function(t) {
  t.plan(3)

  var engine = new ProviderEngine()
  var vaporscan = new VaporscanSubprovider()
  engine.addProvider(vaporscan)
  engine.start()
  engine.sendAsync(createPayload({
    method: 'vap_blockNumber',
    params: [],
  }), function(err, response){
    t.ifError(err, 'throw no error')
    t.ok(response, 'has response')
    t.notEqual(response.result, '0x', 'block number does not equal 0x')
    t.end()
  })
})

test('vaporscan vap_getBlockByNumber', function(t) {
  t.plan(3)

  var engine = new ProviderEngine()
  var vaporscan = new VaporscanSubprovider()
  engine.addProvider(vaporscan)
  engine.start()
  engine.sendAsync(createPayload({
    method: 'vap_getBlockByNumber',
    params: [
      '0x149a2a',
      true
    ],
  }), function(err, response){
    t.ifError(err, 'throw no error')
    t.ok(response, 'has response')
    t.equal(response.result.nonce, '0x80fdd9b71954f9fc', 'nonce matches known nonce')
    t.end()
  })
})

test('vaporscan vap_getBalance', function(t) {
  t.plan(3)

  var engine = new ProviderEngine()
  var vaporscan = new VaporscanSubprovider()
  engine.addProvider(vaporscan)
  engine.start()
  engine.sendAsync(createPayload({
    method: 'vap_getBalance',
    params: [
      '0xa601ea86ae7297e78a54f4b6937fbc222b9d87f4',
      'latest'
    ],
  }), function(err, response){
    t.ifError(err, 'throw no error')
    t.ok(response, 'has response')
    t.notEqual(response.result, '0', 'balance does not equal zero')
    t.end()
  })
})

test('vaporscan vap_call', function(t) {
  t.plan(3)

  var signature = Buffer.concat([sha3("getLatestBlock()", 256)], 4).toString('hex');
  var engine = new ProviderEngine()
  var vaporscan = new VaporscanSubprovider()
  engine.addProvider(vaporscan)
  engine.start()
  engine.sendAsync(createPayload({
    method: 'vap_call',
    params: [{
      to: '0x4EECf99D543B278106ac0c0e8ffe616F2137f10a',
      data : signature
    },
      'latest'
    ],
  }), function(err, response){
    t.ifError(err, 'throw no error')
    t.ok(response, 'has response')
    t.notEqual(response.result, '0x', 'vap_call to getLatestBlock() does not equal 0x')
    t.end()
  })
})
