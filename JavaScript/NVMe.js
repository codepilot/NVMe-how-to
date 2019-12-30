module.exports.NVMe = class NVMe {
  constructor(options={/*Driver, PCIeDev*/}) {
    Object.assign(this, options);
  }
  get MQES() {
    return this.PCIeDev.Bar01.getUint16(0, true);
  }
  toJSON() {
    return {
      MQES: this.MQES,
    };
  }
};