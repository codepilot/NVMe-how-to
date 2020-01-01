'use strict';

function readAll(obj) {
  if(Array.isArray(obj)) { return obj; }
  if(typeof(obj) === 'object') {
    return Object.fromEntries([...Object.entries(obj)].map(([k, v])=> [k, readAll(v)]));
  }
  return obj;
}

const {defineRegisters} = require('./defineRegisters');

module.exports.NVMe = class NVMe {
  constructor(options={/*Driver, PCIeDev*/}) {
    Object.assign(this, options);

    const bar01 = options.PCIeDev.Bar01.buffer;

    const {registers, registerBuffers, subregisters} = defineRegisters({srcBuf: bar01});

    const submission = [];
    const completion = [];

    {
      const cached_DSTRD = subregisters.CAP.DSTRD;
      const queueBuf = bar01.slice(0x1000);
      for(let y = 0n; y < 65536n; y++) {
        const submission_offset = (2n * y) * cached_DSTRD;
        const completion_offset = submission_offset + cached_DSTRD;
        if(submission_offset + cached_DSTRD * 2n > queueBuf.byteLength) {
          break;
        }
        submission[y] = new Uint32Array(queueBuf, Number(submission_offset), 1);
        completion[y] = new Uint32Array(queueBuf, Number(completion_offset), 1);
      }
    }

    console.log(submission);
    Object.freeze(submission);
    Object.freeze(completion);
    Object.defineProperties(this, {
      registers: {value: registers, enumerable: true},
      registerBuffers: { value: registerBuffers, enumerable: true},
      subregisters: {value: subregisters, enumerable: true},
      submission: {value: submission, enumerable: true},
      completion: {value: completion, enumerable: true},
    });

    Object.freeze(this);
    console.log(readAll(registers));
    console.log(readAll(subregisters));
  }
};