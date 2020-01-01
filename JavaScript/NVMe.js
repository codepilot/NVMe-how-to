'use strict';

function readAll(obj) {
  if(Array.isArray(obj)) { return obj; }
  if(typeof(obj) === 'object') {
    return Object.fromEntries([...Object.entries(obj)].map(([k, v])=> [k, readAll(v)]));
  }
  return obj;
}

function makeObject(descriptorEntries) {
  return Object.freeze(Object.create(null, Object.fromEntries(descriptorEntries)));
}

function defineSubregisters({registerBuffer, subregs, k}) {
  const subregister_descriptor_entries = Object.entries(subregs[k]).map(([sr, {area, RO, mapping}]) => {
    if(RO) {
      area = Array.isArray(area)?area:[area, area];
      const shift = area[1];
      const bits = 1n + (area[0] - shift);
      const mask = (1n << bits) - 1n;

      if(registerBuffer instanceof Uint32Array) {
        const descriptor = {
          enumerable: true,
          get: ()=> {
            const rawValue = (BigInt(registerBuffer[0]) >> shift) & mask;
            let value = mapping({value: rawValue, area});
            return value;
          }
        };
        return [sr, descriptor];
      }
      if(registerBuffer instanceof BigUint64Array) {
        const descriptor = {
          enumerable: true,
          get: ()=> {
            const rawValue = (registerBuffer[0] >> shift) & mask;
            let value = mapping({value: rawValue, area});
            return value;
          }
        };
        return [sr, descriptor];
      }
    }
  });
  return makeObject(subregister_descriptor_entries);
}

function createBufferAccessorsUI32({registerBuffer}) {
  const descriptor = {
    get: ()=> BigInt(registerBuffer[0]),
    set: (v)=> registerBuffer[0] = Number(v),
  };
  return descriptor;
}

function createBufferAccessorsUI64({registerBuffer}) {
  const descriptor = {
    get: ()=> registerBuffer[0],
    set: (v)=> registerBuffer[0] = v,
  };
  return descriptor;
}

function createBufferAccessors({registerBuffer, start, end}) {
  const byteSize = (end - start) + 1n;
  if(byteSize === 4n) {
    return createBufferAccessorsUI32({registerBuffer, start});
  }
  if(byteSize === 8n) {
    return createBufferAccessorsUI64({registerBuffer, start});
  }
}

function createBuffer({srcBuf, start, end}) {
  const byteSize = (end - start) + 1n;
  if(byteSize === 4n) {
    return new Uint32Array(srcBuf, Number(start), 1);
  }
  if(byteSize === 8n) {
    return new BigUint64Array(srcBuf, Number(start), 1);
  }
}

function defineRegisters({srcBuf}) {
  const {
    regs,
    subregs,
  } = require('./regs');

  const registerBuffers = makeObject(Object.entries(regs).map(([k, {start, end}])=> [k, {
    enumerable: true,
    value: createBuffer({k, srcBuf, start, end}),
  }]));

  const registers = makeObject(Object.entries(regs).map(([k, {start, end}])=> [k, {
    enumerable: true,
    ...createBufferAccessors({k, registerBuffer: registerBuffers[k], start, end}),
  }]));

  const subregisters = makeObject(Object.keys(subregs).map(k=> [k, {
    enumerable: true,
    value: defineSubregisters({registerBuffer: registerBuffers[k], subregs, k}),
  }]));

  return {registers, registerBuffers, subregisters};
}

module.exports.NVMe = class NVMe {
  constructor(options={/*Driver, PCIeDev*/}) {
    Object.assign(this, options);

    const bar01 = options.PCIeDev.Bar01.buffer;

    const {registers, registerBuffers, subregisters} = defineRegisters({srcBuf: bar01});

    const submission = [];
    const completion = [];

    {
      const cached_DSTRD = subregisters.CAP.DSTRD;
      for(let y = 0n; y < 65536n; y++) {
        const submission_offset = 0x1000n + (2n * y) * cached_DSTRD;
        const completion_offset = submission_offset + cached_DSTRD;
        if(submission_offset + cached_DSTRD * 2n > bar01.byteLength) {
          break;
        }
        submission[y] = new Uint32Array(bar01, Number(submission_offset), 1);
        completion[y] = new Uint32Array(bar01, Number(completion_offset), 1);
      }
    }

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