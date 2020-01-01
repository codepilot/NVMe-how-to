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
  get MQES() { return this.PCIeDev.Bar01.getUint16(0, true); }


  //Start End Symbol Description
  get CAP() { return this.bar01_ui64[0]; } // (ui64[0]) 0h 7h CAP Controller Capabilities
  // 8h Bh VS Version
  // Ch Fh INTMS Interrupt Mask Set
  // 10h 13h INTMC Interrupt Mask Clear
  // 14h 17h CC Controller Configuration
  // 18h 1Bh Reserved Reserved
  // 1Ch 1Fh CSTS Controller Status
  // 20h 23h NSSR NVM Subsystem Reset (Optional)
  // 24h 27h AQA Admin Queue Attributes
  get ASQ() { return this.bar01_ui64[0x5]; } // 28h 2Fh ASQ Admin Submission Queue Base Address
  get ACQ() { return this.bar01_ui64[0x6]; } // 30h 37h ACQ Admin Completion Queue Base Address
  // 38h 3Bh CMBLOC Controller Memory Buffer Location (Optional)
  // 3Ch 3Fh CMBSZ Controller Memory Buffer Size (Optional)
  // 40h 43h BPINFO Boot Partition Information (Optional)
  // 44h 47h BPRSEL Boot Partition Read Select (Optional)
  // 48h 4Fh BPMBL Boot Partition Memory Buffer Location (Optional)
  // 50h 57h CMBMSC Controller Memory Buffer Memory Space Control (Optional)
  // 58h 5Bh CMBSTS Controller Memory Buffer Status (Optional)
  // 5Ch DFFh Reserved Reserved
  // E00h E03h PMRCAP Persistent Memory Capabilities (Optional)
  // E04h E07h PMRCTL Persistent Memory Region Control (Optional)
  // E08h E0Bh PMRSTS Persistent Memory Region Status (Optional)
  // E0Ch E0Fh PMREBS Persistent Memory Region Elasticity Buffer Size
  // E10h E13h PMRSWTP Persistent Memory Region Sustained Write Throughput
  // E14h E1Bh PMRMSC Persistent Memory Region Controller Memory Space Control (Optional)
  // E1Ch FFFh Reserved Command Set Specific
  // 1000h 1003h SQ0TDBL Submission Queue 0 Tail Doorbell (Admin)
  // 1000h + (1 * (4 << CAP.DSTRD))
  // 1003h + (1 * (4 << CAP.DSTRD)) CQ0HDBL Completion Queue 0 Head Doorbell (Admin)

  toJSON() {
    return {
      MQES: this.MQES,
    };
  }
};