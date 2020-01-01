const DriverLoad = require('JSKernelDriver');
const {PCIe} = require('./PCIe.js');
const {NVMe} = require('./NVMe.js');
const Driver = DriverLoad.createDriver();
const PCIeBase = 0x040000000n;//must be discovered
const Bus = 0x18n; //must be discovered

const PCIeDev = new PCIe({Driver, PCIeBase, Bus});
const NVMeDev = new NVMe({Driver, PCIeDev})
