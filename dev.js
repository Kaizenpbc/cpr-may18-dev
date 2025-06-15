const concurrently = require('concurrently');
const chalk = require('chalk');

// Function to format timestamp
const timestamp = () => new Date().toLocaleTimeString();

// Function to create a logger for each process
const createLogger = (name, color) => {
  return (message) => {
    console.log(chalk[color](`[${timestamp()}] ${name}: ${message}`));
  };
};

concurrently([
  { 
    command: 'cd backend && npm run dev',
    name: 'backend',
    prefixColor: 'blue',
    onOutput: createLogger('Backend', 'blue')
  },
  { 
    command: 'cd frontend && npm run dev',
    name: 'frontend',
    prefixColor: 'green',
    onOutput: createLogger('Frontend', 'green')
  }
], {
  prefix: 'name',
  killOthers: ['failure', 'success'],
  restartTries: 3,
  restartDelay: 1000,
  maxRestarts: 5,
  handleInput: true,
  raw: true,
  timestampFormat: 'HH:mm:ss',
}).then(
  () => {
    console.log(chalk.yellow('\n[Shutdown] All processes completed successfully'));
    process.exit(0);
  },
  (error) => {
    console.error(chalk.red('\n[Error] Process failed:'), error);
    process.exit(1);
  }
); 