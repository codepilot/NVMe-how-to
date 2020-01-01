'use strict';

const {
  regs,
  subregs,
} = require('./regs');

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

module.exports.NVMe = class NVMe {
  static defineSubregisters({registerBuffer, k}) {
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

  static createBufferAccessorsUI32({registerBuffer}) {
    const descriptor = {
      get: ()=> BigInt(registerBuffer[0]),
      set: (v)=> registerBuffer[0] = Number(v),
    };
    return descriptor;
  }

  static createBufferAccessorsUI64({registerBuffer}) {
    const descriptor = {
      get: ()=> registerBuffer[0],
      set: (v)=> registerBuffer[0] = v,
    };
    return descriptor;
  }

  static createBufferAccessors({registerBuffer, start, end}) {
    const byteSize = (end - start) + 1n;
    if(byteSize === 4n) {
      return NVMe.createBufferAccessorsUI32({registerBuffer, start});
    }
    if(byteSize === 8n) {
      return NVMe.createBufferAccessorsUI64({registerBuffer, start});
    }
  }

  static createBuffer({srcBuf, start, end}) {
    const byteSize = (end - start) + 1n;
    if(byteSize === 4n) {
      return new Uint32Array(srcBuf, Number(start), 1);
    }
    if(byteSize === 8n) {
      return new BigUint64Array(srcBuf, Number(start), 1);
    }
  }

  static defineRegisters({srcBuf}) {
    const registerBuffers = makeObject(Object.entries(regs).map(([k, {start, end}])=> [k, {
      enumerable: true,
      value: NVMe.createBuffer({k, srcBuf, start, end}),
    }]));

    const registers = makeObject(Object.entries(regs).map(([k, {start, end}])=> [k, {
      enumerable: true,
      ...NVMe.createBufferAccessors({k, registerBuffer: registerBuffers[k], start, end}),
    }]));

    const subregisters = makeObject(Object.keys(subregs).map(k=> [k, {
      enumerable: true,
      value: NVMe.defineSubregisters({registerBuffer: registerBuffers[k], k}),
    }]));

    return {registers, registerBuffers, subregisters};
  }

  constructor(options={/*Driver, PCIeDev*/}) {
    Object.assign(this, options);

    Object.defineProperty(this, 'bar01', {value: options.PCIeDev.Bar01.buffer});
    Object.defineProperty(this, 'bar01_ui32', {value: new Uint32Array(this.bar01)});
    Object.defineProperty(this, 'bar01_ui64', {value: new BigUint64Array(this.bar01)});

    const {registers, registerBuffers, subregisters} = NVMe.defineRegisters({srcBuf: this.bar01});

    const submission = [];
    const completion = [];

    {
      const cached_DSTRD = subregisters.CAP.DSTRD;
      for(let y = 0n; y < 65536n; y++) {
        const submission_offset = 0x1000n + (2n * y) * cached_DSTRD;
        const completion_offset = submission_offset + cached_DSTRD;
        const submission_ui32Index = Number(submission_offset >> 2n);
        const completion_ui32Index = Number(completion_offset >> 2n);
        submission[y] = this.bar01_ui32.slice(submission_ui32Index, submission_ui32Index + 1);
        completion[y] = this.bar01_ui32.slice(completion_ui32Index, completion_ui32Index + 1);
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
    //console.log(this);
    console.log(readAll(registers));
    console.log(readAll(registerBuffers));
    console.log(readAll(subregisters));


  }
};