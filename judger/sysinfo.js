const path = require('path');
const systeminformation = require('systeminformation');
const { judge } = require('./judger/run');
const { TEMP_DIR } = require('./config');
const { mkdirp, rmdir } = require('./utils');
const tmpfs = require('./tmpfs');

function size(s, base = 1) {
    s *= base;
    const unit = 1024;
    const unitNames = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    for (const unitName of unitNames) {
        if (s < unit) return '{0} {1}'.format(Math.round(s * 10) / 10, unitName);
        s /= unit;
    }
    return '{0} {1}'.format(Math.round(s * unit), unitNames[unitNames.length - 1]);
}

const cache = {};

async function stackSize() {
    let output = '';
    const context = {
        lang: 'ccWithoutO2',
        code: `
#include <iostream>
using namespace std;
int i=1;
int main(){
    char a[1048576]={'1'};
    cout<<" "<<i<<flush;
    i++;
    if (i>256) return 0;
    main();
}`,
        config: {
            time: 3000,
            memory: 256,
        },
        stat: {},
        clean: [],
        next: () => { },
        end: (data) => {
            if (data.stdout) output = data.stdout;
        },
    };
    context.tmpdir = path.resolve(TEMP_DIR, 'tmp', 'sysinfo');
    mkdirp(context.tmpdir);
    tmpfs.mount(context.tmpdir, '64m');
    await judge(context).catch((e) => console.error(e));
    // eslint-disable-next-line no-await-in-loop
    for (const clean of context.clean) await clean().catch();
    tmpfs.umount(context.tmpdir);
    await rmdir(context.tmpdir);
    const a = output.split(' ');
    return parseInt(a[a.length - 1]);
}

async function get() {
    const [
        Cpu, Memory, OsInfo,
        CurrentLoad, CpuFlags, CpuTemp,
        Battery, stack,
    ] = await Promise.all([
        systeminformation.cpu(),
        systeminformation.mem(),
        systeminformation.osInfo(),
        systeminformation.currentLoad(),
        systeminformation.cpuFlags(),
        systeminformation.cpuTemperature(),
        systeminformation.battery(),
        stackSize(),
    ]);
    const cpu = `${Cpu.manufacturer} ${Cpu.brand}`;
    const memory = `${size(Memory.active)}/${size(Memory.total)}`;
    const osinfo = `${OsInfo.distro} ${OsInfo.release} ${OsInfo.codename} ${OsInfo.kernel} ${OsInfo.arch}`;
    const load = `${CurrentLoad.avgload}`;
    const flags = CpuFlags;
    let battery;
    if (!Battery.hasbattery) battery = 'No battery';
    else battery = `${Battery.type} ${Battery.model} ${Battery.percent}%${Battery.ischarging ? ' Charging' : ''}`;
    const mid = OsInfo.serial;
    cache.cpu = cpu;
    cache.osinfo = osinfo;
    cache.flags = flags;
    cache.mid = mid;
    cache.stack = stack;
    return {
        mid, cpu, memory, osinfo, load, flags, CpuTemp, battery, stack,
    };
}

async function update() {
    const [Memory, CurrentLoad, CpuTemp, Battery] = await Promise.all([
        systeminformation.mem(),
        systeminformation.currentLoad(),
        systeminformation.cpuTemperature(),
        systeminformation.battery(),
    ]);
    const {
        mid, cpu, osinfo, flags, stack,
    } = cache;
    const memory = `${size(Memory.active)}/${size(Memory.total)}`;
    const load = `${CurrentLoad.avgload}`;
    let battery;
    if (!Battery.hasbattery) battery = 'No battery';
    else battery = `${Battery.type} ${Battery.model} ${Battery.percent}%${Battery.ischarging ? ' Charging' : ''}`;
    return [
        mid,
        {
            memory, load, battery, CpuTemp,
        },
        {
            mid, cpu, memory, osinfo, load, flags, battery, CpuTemp, stack,
        },
    ];
}

module.exports = { get, update };
