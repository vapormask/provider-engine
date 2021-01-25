const test = require('tape')
const Transaction = require('vaporyjs-tx')
const vapUtil = require('vaporyjs-util')
const ProviderEngine = require('../index.js')
const FixtureProvider = require('../subproviders/fixture.js')
const NonceTracker = require('../subproviders/nonce-tracker.js')
const HookedWalletProvider = require('../subproviders/hooked-wallet.js')
const HookedWalletTxProvider = require('../subproviders/hooked-wallet-vaptx.js')
const TestBlockProvider = require('./util/block.js')
const createPayload = require('../util/create-payload.js')
const injectMetrics = require('./util/inject-metrics')


test('tx sig', function(t){
  t.plan(12)

  var privateKey = new Buffer('cccd8f4d88de61f92f3747e4a9604a0395e6ad5138add4bec4a2ddf231ee24f9', 'hex')
  var address = new Buffer('1234362ef32bcd26d3dd18ca749378213625ba0b', 'hex')
  var addressHex = '0x'+address.toString('hex')

  // sign all tx's
  var providerA = injectMetrics(new HookedWalletProvider({
    getAccounts: function(cb){
      cb(null, [addressHex])
    },
    signTransaction: function(txParams, cb){
      var tx = new Transaction(txParams)
      tx.sign(privateKey)
      var rawTx = '0x'+tx.serialize().toString('hex')
      cb(null, rawTx)
    },
  }))

  // handle nonce requests
  var providerB = injectMetrics(new NonceTracker())
  // handle all bottom requests
  var providerC = injectMetrics(new FixtureProvider({
    vap_gasPrice: '0x1234',
    vap_getTransactionCount: '0x00',
    vap_sendRawTransaction: function(payload, next, done){
      var rawTx = vapUtil.toBuffer(payload.params[0])
      var tx = new Transaction(rawTx)
      var hash = '0x'+tx.hash().toString('hex')
      done(null, hash)
    },
  }))
  // handle block requests
  var providerD = injectMetrics(new TestBlockProvider())

  var engine = new ProviderEngine()
  engine.addProvider(providerA)
  engine.addProvider(providerB)
  engine.addProvider(providerC)
  engine.addProvider(providerD)

  var txPayload = {
    method: 'vap_sendTransaction',
    params: [{
      from: addressHex,
      to: addressHex,
      value: '0x01',
      gas: '0x1234567890',
    }]
  }

  engine.start()
  engine.sendAsync(createPayload(txPayload), function(err, response){
    t.ifError(err, 'did not error')
    t.ok(response, 'has response')

    // intial tx request
    t.equal(providerA.getWitnessed('vap_sendTransaction').length, 1, 'providerA did see "signTransaction"')
    t.equal(providerA.getHandled('vap_sendTransaction').length, 1, 'providerA did handle "signTransaction"')

    // tx nonce
    t.equal(providerB.getWitnessed('vap_getTransactionCount').length, 1, 'providerB did see "vap_getTransactionCount"')
    t.equal(providerB.getHandled('vap_getTransactionCount').length, 0, 'providerB did NOT handle "vap_getTransactionCount"')
    t.equal(providerC.getWitnessed('vap_getTransactionCount').length, 1, 'providerC did see "vap_getTransactionCount"')
    t.equal(providerC.getHandled('vap_getTransactionCount').length, 1, 'providerC did handle "vap_getTransactionCount"')

    // gas price
    t.equal(providerC.getWitnessed('vap_gasPrice').length, 1, 'providerB did see "vap_gasPrice"')
    t.equal(providerC.getHandled('vap_gasPrice').length, 1, 'providerB did handle "vap_gasPrice"')

    // send raw tx
    t.equal(providerC.getWitnessed('vap_sendRawTransaction').length, 1, 'providerC did see "vap_sendRawTransaction"')
    t.equal(providerC.getHandled('vap_sendRawTransaction').length, 1, 'providerC did handle "vap_sendRawTransaction"')

    engine.stop()
    t.end()
  })

})

test('no such account', function(t){
  t.plan(1)

  var addressHex = '0x1234362ef32bcd26d3dd18ca749378213625ba0b'
  var otherAddressHex = '0x4321362ef32bcd26d3dd18ca749378213625ba0c'

  // sign all tx's
  var providerA = injectMetrics(new HookedWalletProvider({
    getAccounts: function(cb){
      cb(null, [addressHex])
    },
  }))

  // handle nonce requests
  var providerB = injectMetrics(new NonceTracker())
  // handle all bottom requests
  var providerC = injectMetrics(new FixtureProvider({
    vap_gasPrice: '0x1234',
    vap_getTransactionCount: '0x00',
    vap_sendRawTransaction: function(payload, next, done){
      var rawTx = vapUtil.toBuffer(payload.params[0])
      var tx = new Transaction(rawTx)
      var hash = '0x'+tx.hash().toString('hex')
      done(null, hash)
    },
  }))
  // handle block requests
  var providerD = injectMetrics(new TestBlockProvider())

  var engine = new ProviderEngine()
  engine.addProvider(providerA)
  engine.addProvider(providerB)
  engine.addProvider(providerC)
  engine.addProvider(providerD)

  var txPayload = {
    method: 'vap_sendTransaction',
    params: [{
      from: otherAddressHex,
      to: addressHex,
      value: '0x01',
      gas: '0x1234567890',
    }]
  }

  engine.start()
  engine.sendAsync(createPayload(txPayload), function(err, response){
    t.ok(err, 'did error')

    engine.stop()
    t.end()
  })

})


test('sign message', function(t){
  t.plan(3)

  var privateKey = new Buffer('cccd8f4d88de61f92f3747e4a9604a0395e6ad5138add4bec4a2ddf231ee24f9', 'hex')
  var addressHex = '0x1234362ef32bcd26d3dd18ca749378213625ba0b'

  var message = 'haay wuurl'
  var signature = '0x2c865e6843caf741a694522f86281c9ee86294ade3c8cd1889c9f2c9a24e20802b2b6eb79ba49412661bdbf40245d9b01abb393a843734e5be79b38e7dd408ef1c'

  // sign all messages
  var providerA = injectMetrics(new HookedWalletTxProvider({
    getAccounts: function(cb){
      cb(null, [addressHex])
    },
    getPrivateKey: function(address, cb){
      cb(null, privateKey)
    },
  }))

  // handle block requests
  var providerB = injectMetrics(new TestBlockProvider())

  var engine = new ProviderEngine()
  engine.addProvider(providerA)
  engine.addProvider(providerB)

  var payload = {
    method: 'vap_sign',
    params: [
      addressHex,
      message,
    ],
  }

  engine.start()
  engine.sendAsync(createPayload(payload), function(err, response){
    t.ifError(err, 'did not error')
    t.ok(response, 'has response')

    t.equal(response.result, signature, 'signed response is correct')

    engine.stop()
    t.end()
  })

})

// personal_sign was declared without an explicit set of test data
// so I made a script out of gvap's internals to create this test data
// https://gist.github.com/kumavis/461d2c0e9a04ea0818e423bb77e3d260

signatureTest({
  testLabel: 'kumavis fml manual test I',
  method: 'personal_sign',
  // "hello world"
  message: '0x68656c6c6f20776f726c64',
  signature: '0x3cb0f033b611bccf8f725987c02470c316e47b35b522bc5985b2dbcf5a60c5d655a009b6e18dc528eec82971b2dcd0656f7d691632fceae292d6689b708b01871b',
  addressHex: '0xbe93f9bacbcffc8ee6663f2647917ed7a20a57bb',
  privateKey: new Buffer('6969696969696969696969696969696969696969696969696969696969696969', 'hex'),
})

signatureTest({
  testLabel: 'kumavis fml manual test II',
  method: 'personal_sign',
  // some random binary message from parity's test
  message: '0x0cc175b9c0f1b6a831c399e26977266192eb5ffee6ae2fec3ad71c777531578f',
  signature: '0x13e51b6edb9c2a54121cf4140c2d1aa471ac8deb651db17dcace602b370410b14424e7c1d7561ef64195f6b0e05c8ddedbb77a70b13bf5721eee793f60dfaff91c',
  addressHex: '0xbe93f9bacbcffc8ee6663f2647917ed7a20a57bb',
  privateKey: new Buffer('6969696969696969696969696969696969696969696969696969696969696969', 'hex'),
})

signatureTest({
  testLabel: 'kumavis fml manual test III',
  method: 'personal_sign',
  // random binary message data and pk from parity's test
  // https://github.com/ethcore/parity/blob/5369a129ae276d38f3490abb18c5093b338246e0/rpc/src/v1/tests/mocked/eth.rs#L301-L317
  // note: their signature result is incorrect (last byte moved to front) due to a parity bug
  message: '0x0cc175b9c0f1b6a831c399e26977266192eb5ffee6ae2fec3ad71c777531578f',
  signature: '0x8e615af8b011272daa8fb7a579d7e85b89fdb577827d36945ebdb81f8504a82a136dc6da33edbb2ba5778e7e670d4797c811324f65333a98e1359cae3d39a58b1b',
  addressHex: '0xe0da1edcea030875cd0f199d96eb70f6ab78faf2',
  privateKey: new Buffer('4545454545454545454545454545454545454545454545454545454545454545', 'hex'),
})

recoverTest({
  testLabel: 'gvap kumavis manual I recover',
  method: 'personal_ecRecover',
  // "hello world"
  message: '0x68656c6c6f20776f726c64',
  signature: '0x3cb0f033b611bccf8f725987c02470c316e47b35b522bc5985b2dbcf5a60c5d655a009b6e18dc528eec82971b2dcd0656f7d691632fceae292d6689b708b01871b',
  addressHex: '0xbe93f9bacbcffc8ee6663f2647917ed7a20a57bb',
})

recoverTest({
  testLabel: 'gvap kumavis manual II recover',
  method: 'personal_ecRecover',
  // message from parity's test - note result is different than what they are testing against
  // https://github.com/ethcore/parity/blob/5369a129ae276d38f3490abb18c5093b338246e0/rpc/src/v1/tests/mocked/eth.rs#L301-L317
  message: '0x0cc175b9c0f1b6a831c399e26977266192eb5ffee6ae2fec3ad71c777531578f',
  signature: '0x13e51b6edb9c2a54121cf4140c2d1aa471ac8deb651db17dcace602b370410b14424e7c1d7561ef64195f6b0e05c8ddedbb77a70b13bf5721eee793f60dfaff91c',
  addressHex: '0xbe93f9bacbcffc8ee6663f2647917ed7a20a57bb',
})

signatureTest({
  testLabel: 'sign typed message',
  method: 'vap_signTypedData',
  message: [
    {
      type: 'string',
      name: 'message',
      value: 'Hi, Alice!'
    }
  ],
  signature: '0xb2c9c7bdaee2cc73f318647c3f6e24792fca86a9f2736d9e7537e64c503545392313ebbbcb623c828fd8f99fd1fb48f8f4da8cb1d1a924e28b21de018c826e181c',
  addressHex: '0xbe93f9bacbcffc8ee6663f2647917ed7a20a57bb',
  privateKey: new Buffer('6969696969696969696969696969696969696969696969696969696969696969', 'hex'),
})

test('sender validation, with mixed-case', function(t){
  t.plan(1)

  var senderAddress = '0xE4660fdAb2D6Bd8b50C029ec79E244d132c3bc2B'

  var providerA = injectMetrics(new HookedWalletTxProvider({
    getAccounts: function(cb){
      cb(null, [senderAddress])
    },
    getPrivateKey: function(address, cb){
      t.pass('correctly validated sender')
      engine.stop()
      t.end()
    },
  }))
  var providerB = injectMetrics(new TestBlockProvider())
  // handle all bottom requests
  var providerC = injectMetrics(new FixtureProvider({
    vap_gasPrice: '0x1234',
    vap_estimateGas: '0x1234',
    vap_getTransactionCount: '0x00',
  }))

  var engine = new ProviderEngine()
  engine.addProvider(providerA)
  engine.addProvider(providerB)
  engine.addProvider(providerC)

  engine.start()
  engine.sendAsync({
    method: 'vap_sendTransaction',
    params: [{
      from: senderAddress.toLowerCase(),
    }]
  }, function(err){
    t.notOk(err, 'error was present')
    engine.stop()
    t.end()
  })

})


function signatureTest({ testLabel, method, privateKey, addressHex, message, signature }) {
  // sign all messages
  var providerA = injectMetrics(new HookedWalletTxProvider({
    getAccounts: function(cb){
      cb(null, [addressHex])
    },
    getPrivateKey: function(address, cb){
      cb(null, privateKey)
    },
  }))

  // handle block requests
  var providerB = injectMetrics(new TestBlockProvider())

  var engine = new ProviderEngine()
  engine.addProvider(providerA)
  engine.addProvider(providerB)

  var payload = {
    method: method,
    params: [message, addressHex],
  }

  singleRpcTest({
    testLabel: `sign message ${method} - ${testLabel}`,
    payload,
    engine,
    expectedResult: signature,
  })

  // Personal sign is supposed to have params
  // ordered in this direction, not the other.
  if (payload.method === 'personal_sign') {
    var payload = {
      method: method,
      params: [message, addressHex],
    }

    singleRpcTest({
      testLabel: `sign message ${method} - ${testLabel}`,
      payload,
      engine,
      expectedResult: signature,
    })
  }
}

function recoverTest({ testLabel, method, addressHex, message, signature }) {

  // sign all messages
  var providerA = injectMetrics(new HookedWalletTxProvider({
    getAccounts: function(cb){
      cb(null, [addressHex])
    },
    getPrivateKey: function(address, cb){
      cb(null, privateKey)
    },
  }))

  // handle block requests
  var blockProvider = injectMetrics(new TestBlockProvider())

  var engine = new ProviderEngine()
  engine.addProvider(providerA)
  engine.addProvider(blockProvider)

  var payload = {
    method: method,
    params: [message, signature],
  }

  singleRpcTest({
    testLabel: `recover message ${method} - ${testLabel}`,
    payload,
    engine,
    expectedResult: addressHex,
  })

}

function singleRpcTest({ testLabel, payload, expectedResult, engine }) {
  test(testLabel, function(t){
    t.plan(3)

    engine.start()
    engine.sendAsync(createPayload(payload), function(err, response){
      if (err) {
        console.log('bad payload:', payload)
        console.error(err)
      }
      t.ifError(err)
      t.ok(response, 'has response')

      t.equal(response.result, expectedResult, 'rpc result is as expected')

      engine.stop()
      t.end()
    })

  })
}
