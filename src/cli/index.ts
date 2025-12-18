#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { generateCommand } from './commands/generate.js';
import { addModuleCommand } from './commands/add-module.js';
import { dbCommand } from './commands/db.js';

const program = new Command();

program
  .name('servcraft')
  .description('Servcraft - A modular Node.js backend framework CLI')
  .version('0.1.0');

// Initialize new project
program.addCommand(initCommand);

// Generate resources (controller, service, model, etc.)
program.addCommand(generateCommand);

// Add pre-built modules
program.addCommand(addModuleCommand);

// Database commands
program.addCommand(dbCommand);

program.parse();
