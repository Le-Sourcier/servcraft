/* eslint-disable no-console */
/* eslint-disable no-useless-escape */
import { Command } from 'commander';

const bashScript = `
# servcraft bash completion script
_servcraft_completions() {
  local cur prev words cword
  _init_completion || return

  # Main commands
  local commands="init add generate list remove doctor update completion docs --version --help"

  # Generate subcommands
  local generate_subcommands="module controller service repository types schema routes m c s r t"

  case "\${words[1]}" in
    generate|g)
      if [[ \${cword} -eq 2 ]]; then
        COMPREPLY=( \$(compgen -W "\${generate_subcommands}" -- "\${cur}") )
      fi
      ;;
    add|remove|rm|update)
      if [[ \${cword} -eq 2 ]]; then
        # Get available modules
        local modules="auth cache rate-limit notification payment oauth mfa queue websocket upload"
        COMPREPLY=( \$(compgen -W "\${modules}" -- "\${cur}") )
      fi
      ;;
    completion)
      if [[ \${cword} -eq 2 ]]; then
        COMPREPLY=( \$(compgen -W "bash zsh" -- "\${cur}") )
      fi
      ;;
    *)
      if [[ \${cword} -eq 1 ]]; then
        COMPREPLY=( \$(compgen -W "\${commands}" -- "\${cur}") )
      fi
      ;;
  esac
}

complete -F _servcraft_completions servcraft
`;

const zshScript = `
#compdef servcraft

_servcraft() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C \\
    '1: :_servcraft_commands' \\
    '*::arg:->args'

  case $state in
    args)
      case $line[1] in
        generate|g)
          _servcraft_generate
          ;;
        add|remove|rm|update)
          _servcraft_modules
          ;;
        completion)
          _arguments '1: :(bash zsh)'
          ;;
      esac
      ;;
  esac
}

_servcraft_commands() {
  local commands
  commands=(
    'init:Initialize a new ServCraft project'
    'add:Add a pre-built module to your project'
    'generate:Generate code files (controller, service, etc.)'
    'list:List available and installed modules'
    'remove:Remove an installed module'
    'doctor:Diagnose project configuration'
    'update:Update installed modules'
    'completion:Generate shell completion scripts'
    'docs:Open documentation'
    '--version:Show version'
    '--help:Show help'
  )
  _describe 'command' commands
}

_servcraft_generate() {
  local subcommands
  subcommands=(
    'module:Generate a complete module (controller + service + routes)'
    'controller:Generate a controller'
    'service:Generate a service'
    'repository:Generate a repository'
    'types:Generate TypeScript types'
    'schema:Generate validation schema'
    'routes:Generate routes file'
    'm:Alias for module'
    'c:Alias for controller'
    's:Alias for service'
    'r:Alias for repository'
    't:Alias for types'
  )
  _describe 'subcommand' subcommands
}

_servcraft_modules() {
  local modules
  modules=(
    'auth:Authentication & Authorization'
    'cache:Redis caching'
    'rate-limit:Rate limiting'
    'notification:Email/SMS notifications'
    'payment:Payment integration'
    'oauth:OAuth providers'
    'mfa:Multi-factor authentication'
    'queue:Background jobs'
    'websocket:WebSocket support'
    'upload:File upload handling'
  )
  _describe 'module' modules
}

_servcraft "$@"
`;

export const completionCommand = new Command('completion')
  .description('Generate shell completion scripts')
  .argument('<shell>', 'Shell type (bash or zsh)')
  .action((shell: string) => {
    const shellLower = shell.toLowerCase();

    if (shellLower === 'bash') {
      console.log(bashScript);
    } else if (shellLower === 'zsh') {
      console.log(zshScript);
    } else {
      console.error(`Unsupported shell: ${shell}`);
      console.error('Supported shells: bash, zsh');
      process.exit(1);
    }
  });
