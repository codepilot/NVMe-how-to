const regs = {
  CAP:    {start: 0x0000n, end: 0x0007n, desc: 'Controller Capabilities'},
  VS:     {start: 0x0008n, end: 0x000Bn, desc: 'Version'},
  INTMS:  {start: 0x000Cn, end: 0x000Fn, desc: 'Interrupt Mask Set'},
  INTMC:  {start: 0x0010n, end: 0x0013n, desc: 'Interrupt Mask Clear'},
  CC:     {start: 0x0014n, end: 0x0017n, desc: 'Controller Configuration'},
  CSTS:   {start: 0x001Cn, end: 0x001Fn, desc: 'Controller Status'},
  NSSR:   {start: 0x0020n, end: 0x0023n, desc: 'NVM Subsystem Reset (Optional)'},
  AQA:    {start: 0x0024n, end: 0x0027n, desc: 'Admin Queue Attributes'},
  ASQ:    {start: 0x0028n, end: 0x002Fn, desc: 'Admin Submission Queue Base Address'},
  ACQ:    {start: 0x0030n, end: 0x0037n, desc: 'Admin Completion Queue Base Address'},
  CMBLOC: {start: 0x0038n, end: 0x003Bn, desc: 'Controller Memory Buffer Location (Optional)'},
  CMBSZ:  {start: 0x003Cn, end: 0x003Fn, desc: 'Controller Memory Buffer Size (Optional)'},
  BPINFO: {start: 0x0040n, end: 0x0043n, desc: 'Boot Partition Information (Optional)'},
  BPRSEL: {start: 0x0044n, end: 0x0047n, desc: 'Boot Partition Read Select (Optional)'},
  BPMBL:  {start: 0x0048n, end: 0x004Fn, desc: 'Boot Partition Memory Buffer Location (Optional)'},
  CMBMSC: {start: 0x0050n, end: 0x0057n, desc: 'Controller Memory Buffer Memory Space Control (Optional)'},
  CMBSTS: {start: 0x0058n, end: 0x005Bn, desc: 'Controller Memory Buffer Status (Optional)'},
  PMRCAP: {start: 0x0E00n, end: 0x0E03n, desc: 'Persistent Memory Capabilities (Optional)'},
  PMRCTL: {start: 0x0E04n, end: 0x0E07n, desc: 'Persistent Memory Region Control (Optional)'},
  PMRSTS: {start: 0x0E08n, end: 0x0E0Bn, desc: 'Persistent Memory Region Status (Optional)'},
  PMREBS: {start: 0x0E0Cn, end: 0x0E0Fn, desc: 'Persistent Memory Region Elasticity Buffer Size'},
  PMRSWT: {start: 0x0E10n, end: 0x0E13n, desc: 'Persistent Memory Region Sustained Write Throughput'},
  PMRMSC: {start: 0x0E14n, end: 0x0E1Bn, desc: 'Persistent Memory Region Controller Memory Space Control (Optional)'},
};

const RO = Symbol('Readonly');
const pageSizesMapping      = ({value, area})=> 1n << (12n + value);
const doorbellStrideMapping = ({value, area})=> 1n << (2n + value);
const identityMapping       = ({value, area})=> value;
const zerosBasedMapping     = ({value, area})=> value + 1n;
const booleanMapping        = ({value, area})=> value !== 0n;
const bitsetMapping         = ({value, area})=> new Array(Number(area[0] - area[1]) + 1).fill(0).map((v, i)=> ((value >> BigInt(i)) & 1n) !== 0n);

const mappings = {
  pageSizesMapping,
  doorbellStrideMapping,
  identityMapping,
  booleanMapping,
  bitsetMapping,
};

const subregs = {
  CAP: {
    CMBS:   {area: 57n,       RO, mapping: booleanMapping,        units: 'bool',     desc: 'Controller Memory Buffer Supported (CMBS)'},
    PMRS:   {area: 56n,       RO, mapping: booleanMapping,        units: 'bool',     desc: 'Persistent Memory Region Supported (PMRS)'},
    MPSMAX: {area: [55n,52n], RO, mapping: pageSizesMapping,      units: 'bytes',    desc: 'Memory Page Size Maximum (MPSMAX)'},
    MPSMIN: {area: [51n,48n], RO, mapping: pageSizesMapping,      units: 'bytes',    desc: 'Memory Page Size Minimum (MPSMIN)'},
    BPS:    {area: 45n,       RO, mapping: booleanMapping,        units: 'bool',     desc: 'Boot Partition Support (BPS)'},
    CSS:    {area: [44n,37n], RO, mapping: bitsetMapping,         units: 'bool',     desc: 'Command Sets Supported (CSS)'},
    NSSRS:  {area: 36n,       RO, mapping: booleanMapping,        units: 'bool',     desc: 'NVM Subsystem Reset Supported (NSSRS)'},
    DSTRD:  {area: [35n,32n], RO, mapping: doorbellStrideMapping, units: 'bytes',    desc: 'Doorbell Stride (DSTRD)'},
    TO:     {area: [31n,24n], RO, mapping: identityMapping,       units: '500ms',    desc: 'Timeout (TO)'},
    AMS:    {area: [18n,17n], RO, mapping: bitsetMapping,         units: 'bool',     desc: 'Arbitration Mechanism Supported (AMS)'},
    CQR:    {area: 16n,       RO, mapping: booleanMapping,        units: 'bool',     desc: 'Contiguous Queues Required (CQR)'},
    MQES:   {area: [15n,0n],  RO, mapping: zerosBasedMapping,     units: 'quantity', desc: 'Maximum Queue Entries Supported (MQES)'},
  }
};

Object.assign(module.exports, {
  regs,
  mappings,
  subregs,
});