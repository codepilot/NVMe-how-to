const {
  regs,
  mappings,
  subregs,
} = require('./regs');

function readAll(obj) {
  return Object.fromEntries([...Object.entries(obj)].map(([k, v])=> [k, v]));
}

module.exports.NVMe = class NVMe {
  constructor(options={/*Driver, PCIeDev*/}) {
    Object.assign(this, options);

    const registers = {};

    Object.defineProperty(this, 'bar01_ui32', {value: new Uint32Array(options.PCIeDev.Bar01.buffer)});
    Object.defineProperty(this, 'bar01_ui64', {value: new BigUint64Array(options.PCIeDev.Bar01.buffer)});
    for(let [k, {start, end, description}] of Object.entries(regs)) {
      if(end - start === 3n) {
        const ui32Index = Number(start >> 2n);
        const buf = this.bar01_ui32.slice(ui32Index, ui32Index + 1);
        Object.defineProperty(registers, k, {
          get: ()=> BigInt(buf[0]),
          set: (v)=> buf[0] = Number(v),
          enumerable: true,
        });
      }
      if(end - start === 7n) {
        const ui64Index = Number(start >> 3n);
        const buf = this.bar01_ui64.slice(ui64Index, ui64Index + 1);
        Object.defineProperty(registers, k, {
          get: ()=> buf[0],
          set: (v)=> buf[0] = v,
        });
      }

      for(let [sr, {area, RO, mapping}] of Object.entries(subregs[k] || {})) {
        if(RO) {
          if(!Array.isArray(area)) {
            area = [area, area];
          }
          const shift = area[1];
          const bits = 1n + (area[0] - shift);
          const mask = (1n << bits) - 1n;

          Object.defineProperty(registers, sr, {enumerable: true, get: ()=> {
            const rawValue = (registers[k] >> shift) & mask;
            let value = mapping({value: rawValue, area});
            return value;
          }});
        }
      }
    }

    const submission = [];
    const completion = [];

    {
      const cached_DSTRD = registers.DSTRD;
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
      submission: {value: submission, enumerable: true},
      completion: {value: completion, enumerable: true},
    });

    Object.freeze(this);
    console.log(this);
    console.log(readAll(registers));

  }
};