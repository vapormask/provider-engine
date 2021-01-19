const test = require('tape')
const ProviderEngine = require('../../index.js')
const createPayload = require('../../util/create-payload.js')
const SanitizerSubprovider = require('../../subproviders/sanitizer')
const MockSubprovider = require('../util/mock-subprovider')
const mockBlock = require('../util/mock_block.json')
const extend = require('xtend')

test('Sanitizer removes unknown keys', function(t) {
  t.plan(4)

  var engine = new ProviderEngine()

  var sanitizer = new SanitizerSubprovider()
  engine.addProvider(sanitizer)

  var mock = new MockSubprovider(function (payload, next, end) {
    t.ok(!('foo' in payload.params[0]))
    t.equal(payload.params[0].gas, '0x01')
    t.equal(payload.params[0].data, '0x01')

    if (payload.method === 'vap_getBlockByNumber') {
      return end(null, mockBlock.result)
    }

    return end(null, extend(mockBlock, {
      baz: 'bam',
    }))
  })
  engine.addProvider(mock)

  engine._fetchBlock = (str, cb) => {
    cb(null, mockBlock)
  }

  engine.start()

  var payload = {
    method: 'vap_estimateGas',
    params: [{
      foo: 'bar',
      gas: '0x01',
      data: '01',
    }],
  }
  engine.sendAsync(payload, function (err, result) {
    t.equal(result.result.baz, 'bam')
  })
})
