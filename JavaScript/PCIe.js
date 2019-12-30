module.exports.PCIe = class PCIe {
  constructor(options={/*Driver, PCIeBase, Bus*/}) {
    Object.assign(this, options);
    const PCIeDevOffset = this.Bus << 20n;
    this.Regs = this.Driver.mapPhysical(Number(this.PCIeBase + PCIeDevOffset), 4096);
    this.Bar01 = this.Driver.mapPhysical(Number(this.Bar01Addr), 8192);
  }
  get Bar01Addr() {
    return this.Regs.getBigUint64(16, true) & 0xFFFFFFFFFFFFFFF0n;
  }
};