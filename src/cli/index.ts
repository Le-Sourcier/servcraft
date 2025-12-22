#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { generateCommand } from './commands/generate.js';
import { addModuleCommand } from './commands/add-module.js';
import { dbCommand } from './commands/db.js';
import { docsCommand } from './commands/docs.js';
import { listCommand } from './commands/list.js';
import { removeCommand } from './commands/remove.js';
import { doctorCommand } from './commands/doctor.js';
import { updateCommand } from './commands/update.js';
import { completionCommand } from './commands/completion.js';
import { scaffoldCommand } from './commands/scaffold.js';

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

// Documentation commands
program.addCommand(docsCommand);

// List modules
program.addCommand(listCommand);

// Remove module
program.addCommand(removeCommand);

// Diagnose project
program.addCommand(doctorCommand);

// Update modules
program.addCommand(updateCommand);

// Shell completion
program.addCommand(completionCommand);

// Scaffold resource
program.addCommand(scaffoldCommand);

program.parse();
