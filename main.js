const { Command } = require('commander');
const program = new Command();

program
  .requiredOption('-h, --host <host>', 'Server host')
  .requiredOption('-p, --port <port>', 'Server port')
  .requiredOption('-c, --cache <path>', 'Cache directory');

program.parse(process.argv);

console.log("Host:", program.opts().host);
console.log("Port:", program.opts().port);
console.log("Cache:", program.opts().cache);
