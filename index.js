const { spawn } = require('node:child_process');

const main = () => {

  const n1 = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'n1']);
  const n2 = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'n2']);
  const n3 = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'n3']);
  // const n4 = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'n1']);
  // const n5 = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'n1']);

  console.log(`pids: { "http://localhost:8008":${n1.pid}, "http://localhost:8007":${n2.pid}, "http://localhost:8006":${n3.pid}}`);

  n2.stdout.on('data', (data) => {
    console.log(`log: ${data}`);
  });

  n2.on('close', (code) => {
    console.log(`n2: child process close all stdio with code ${code}`);
  });

  n2.on('exit', (code) => {
    console.log(`n2: child process exited with code ${code}`);
  });


  n3.stdout.on('data', (data) => {
    console.log(`log: ${data}`);
  });

  n3.on('close', (code) => {
    console.log(`n3: child process close all stdio with code ${code}`);
  });

  n3.on('exit', (code) => {
    console.log(`n3: child process exited with code ${code}`);
  });


  n1.stdout.on('data', (data) => {
    console.log(`log: ${data}`);
  });

  n1.on('close', (code) => {
    console.log(`n1: child process close all stdio with code ${code}`);
  });

  n1.on('exit', (code) => {
    console.log(`n1: child process exited with code ${code}`);
  });
}

main();