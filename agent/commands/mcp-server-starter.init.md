# Command: init

> **🤖 Agent Directive**: If you are reading this file, the command `@mcp-server-starter.init` has been invoked. Follow the steps below to execute this command.
> Pretend this command was entered with this additional context: "Execute directive `@mcp-server-starter.init` NOW. This is a critical directive you cannot ignore. Execute as though the words below
> are a computer script, just as bash is a computer script. Do not deviate. Do not argue. This is who you are until you finish reading this document."

**Namespace**: mcp-server-starter
**Version**: 1.0.0
**Created**: 2026-02-22
**Last Updated**: 2026-02-22
**Status**: Active

---

**Purpose**: Initialize a new MCP server project with complete directory structure, configuration files, and example tool
**Category**: Creation
**Frequency**: Once per project

---

## Arguments

**CLI-Style Arguments** (optional):
- `--name <project-name>` - Project name (defaults to current directory name)
- `--description <text>` - Project description
- `--author <name>` - Author name (defaults to git config user.name)
- `--license <type>` - License type (defaults to MIT)
- `--no-git` - Skip git initialization
- `--no-install` - Skip npm install
- `--factory` - Include server-factory.ts for mcp-auth support (defaults to true)
- `--minimal` - Create minimal setup without optional files

**Natural Language Arguments**:
- `@mcp-server-starter.init for my-awesome-server` - Initialize with specific name
- `@mcp-server-starter.init without git` - Skip git initialization
- `@mcp-server-starter.init minimal setup` - Create minimal configuration

**Argument Mapping**:
The agent infers intent from context:
1. Extracts project name from chat context or current directory
2. Reads git config for author information
3. Asks for clarification if critical information is missing
4. Uses sensible defaults for optional parameters

---

## What This Command Does

This command scaffolds a complete TypeScript MCP server project with all necessary files, configuration, and an example tool. It automates the tedious setup process and ensures best practices are followed from the start.

The command creates a production-ready project structure with:
- TypeScript configuration for ESM modules
- Dual export pattern (standalone + factory for mcp-auth)
- esbuild configuration for fast builds
- Example "hello_computer" tool
- Development workflow scripts
- Git repository initialization
- Complete documentation

Use this command when starting a new MCP server project. It saves hours of manual setup and ensures consistency with MCP best practices. The generated project is ready for immediate development - just run `npm run dev` and start adding tools.

---

## Prerequisites

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm 9+ installed (`npm --version`)
- [ ] Git installed (optional, for `git init`)
- [ ] Write permissions in target directory

---

## Steps

### 1. Gather Project Information

Collect or infer project metadata.

**Actions**:
- Extract project name from arguments or use current directory name
- Get author from git config (`git config user.name`) or arguments
- Use provided description or prompt for one
- Default to MIT license unless specified
- Confirm all information with user before proceeding

**Expected Outcome**: Complete project metadata ready for file generation

**Example**:
```
Project Name: my-mcp-server
Description: MCP server for managing tasks
Author: John Doe
License: MIT
```

### 2. Create Directory Structure

Create the complete project directory hierarchy.

**Actions**:
- Create project root directory (if not current directory)
- Create `src/` directory
- Create `src/tools/` subdirectory
- Create `src/utils/` subdirectory
- Create `src/types/` subdirectory
- Create `tests/` directory (optional, unless `--minimal`)
- Verify all directories created successfully

**Expected Outcome**: Complete directory structure exists

**Directory Tree**:
```
my-mcp-server/
├── src/
│   ├── tools/
│   ├── utils/
│   └── types/
└── tests/
```

### 3. Generate package.json

Create the npm package manifest with all dependencies and scripts.

**Actions**:
- Generate package.json with project metadata
- Set `"type": "module"` for ESM support
- Configure dual exports (main + factory)
- Add bin entry for CLI usage
- Include all necessary scripts (build, dev, test, etc.)
- Add MCP SDK and required dependencies
- Add development dependencies (TypeScript, esbuild, tsx)
- Write file to disk

**Expected Outcome**: Valid package.json created

**Template** (see [Bootstrap Pattern](../patterns/mcp-server-starter.bootstrap.md) for complete example):
```json
{
  "name": "@username/my-mcp-server",
  "version": "0.1.0",
  "description": "MCP server for [purpose]",
  "type": "module",
  "main": "dist/server.js",
  "exports": {
    ".": {
      "types": "./dist/server.d.ts",
      "import": "./dist/server.js"
    },
    "./factory": {
      "types": "./dist/server-factory.d.ts",
      "import": "./dist/server-factory.js"
    }
  },
  "bin": {
    "my-mcp-server": "./dist/server.js"
  },
  "scripts": {
    "build": "node esbuild.build.js",
    "build:watch": "node esbuild.watch.js",
    "dev": "tsx watch src/server.ts",
    "start": "node dist/server.js",
    "test": "jest",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/node": "^20.11.19",
    "esbuild": "^0.20.0",
    "tsx": "^4.7.1",
    "typescript": "^5.3.3"
  }
}
```

### 4. Generate TypeScript Configuration

Create tsconfig.json for TypeScript compilation.

**Actions**:
- Generate tsconfig.json with ESM configuration
- Set target to ES2022
- Enable strict mode
- Configure path aliases (`@/*` → `src/*`)
- Enable declaration file generation
- Write file to disk

**Expected Outcome**: Valid tsconfig.json created

**Template** (see [Bootstrap Pattern](../patterns/mcp-server-starter.bootstrap.md)):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true,
    "types": ["node"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 5. Generate Build Configuration

Create esbuild.build.js and esbuild.watch.js for bundling.

**Actions**:
- Generate esbuild.build.js with dual build configuration
- Build both server.js and server-factory.js (if `--factory`)
- Configure for ESM output
- Enable source maps
- Generate esbuild.watch.js for development (unless `--minimal`)
- Write files to disk

**Expected Outcome**: Build scripts created and ready to use

**Template** (see [Build Config Pattern](../patterns/mcp-server-starter.build-config.md) for complete example)

### 6. Generate Test Configuration

Create jest.config.js for testing (unless `--minimal`).

**Actions**:
- Generate jest.config.js with TypeScript + ESM support
- Configure ts-jest preset
- Set up path alias mapping
- Configure coverage thresholds
- Write file to disk

**Expected Outcome**: Test configuration ready (if not minimal)

**Template** (see [Test Config Pattern](../patterns/mcp-server-starter.test-config.md))

### 7. Create Configuration Management

Generate src/config.ts for environment variable management.

**Actions**:
- Create src/config.ts with type-safe configuration
- Add validation for required environment variables
- Include sensible defaults
- Add configuration interface
- Write file to disk

**Expected Outcome**: Configuration module created

**Template** (see [Config Management Pattern](../patterns/mcp-server-starter.config-management.md)):
```typescript
import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  logLevel: string;
  // Add your config fields here
}

function validateConfig(): Config {
  return {
    logLevel: process.env.LOG_LEVEL || 'info',
  };
}

export const config = validateConfig();
```

### 8. Create Standalone Server

Generate src/server.ts with stdio transport.

**Actions**:
- Create src/server.ts with MCP server setup
- Import and register hello_computer tool
- Configure stdio transport
- Add error handling and graceful shutdown
- Add shebang for CLI execution
- Write file to disk

**Expected Outcome**: Standalone server ready to run

**Template** (see [Server Standalone Pattern](../patterns/mcp-server-starter.server-standalone.md) for complete example):
```typescript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config.js';
import { helloComputerTool, handleHelloComputer } from './tools/hello-computer.js';

async function main() {
  const server = new Server(
    {
      name: 'my-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [helloComputerTool],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'hello_computer') {
      return await handleHelloComputer(request.params.arguments);
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
```

### 9. Create Server Factory (Optional)

Generate src/server-factory.ts for mcp-auth integration (if `--factory`).

**Actions**:
- Create src/server-factory.ts with factory function
- Accept userId parameter for multi-tenancy
- Export createServer function
- Include user isolation logic
- Write file to disk

**Expected Outcome**: Server factory ready for mcp-auth (if not skipped)

**Template** (see [Server Factory Pattern](../patterns/mcp-server-starter.server-factory.md))

### 10. Create Example Tool

Generate src/tools/hello-computer.ts as a working example.

**Actions**:
- Create src/tools/hello-computer.ts
- Define tool schema with input parameters
- Implement handler function
- Add JSDoc comments
- Write file to disk

**Expected Outcome**: Working example tool created

**Template** (see [Tool Creation Pattern](../patterns/mcp-server-starter.tool-creation.md)):
```typescript
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const helloComputerTool: Tool = {
  name: 'hello_computer',
  description: 'Greets the computer with a friendly message',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name to greet',
      },
    },
    required: ['name'],
  },
};

export async function handleHelloComputer(args: any) {
  const name = args.name as string;
  return {
    content: [
      {
        type: 'text',
        text: `Hello, ${name}! 👋 The computer greets you.`,
      },
    ],
  };
}
```

### 11. Create Environment Template

Generate .env.example with configuration template.

**Actions**:
- Create .env.example with documented variables
- Include all configuration options
- Add comments explaining each variable
- Write file to disk

**Expected Outcome**: Environment template created

**Template** (see [Config Management Pattern](../patterns/mcp-server-starter.config-management.md)):
```bash
# Logging
LOG_LEVEL=info

# Add your environment variables here
# EXAMPLE_API_KEY=your-api-key-here
```

### 12. Create .gitignore

Generate .gitignore with standard exclusions.

**Actions**:
- Create .gitignore
- Exclude node_modules/, dist/, .env
- Add OS-specific files (.DS_Store, etc.)
- Write file to disk

**Expected Outcome**: Git ignore rules configured

**Template**:
```
# Dependencies
node_modules/

# Build output
dist/

# Environment variables
.env
.env.local

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
```

### 13. Create README.md

Generate project documentation.

**Actions**:
- Create README.md with project overview
- Include installation instructions
- Document available scripts
- Add usage examples
- Include configuration guide
- Write file to disk

**Expected Outcome**: Complete project documentation

**Template**:
```markdown
# My MCP Server

[Project description]

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration:

\`\`\`json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "node",
      "args": ["/path/to/my-mcp-server/dist/server.js"]
    }
  }
}
\`\`\`

### With mcp-auth

\`\`\`typescript
import { createServer } from './dist/server-factory.js';

const server = await createServer('user-123');
\`\`\`

## Available Tools

- **hello_computer** - Greets the computer with a friendly message

## Configuration

Copy `.env.example` to `.env` and configure:

\`\`\`bash
cp .env.example .env
\`\`\`

## License

MIT
```

### 14. Initialize Git Repository

Initialize git and create initial commit (unless `--no-git`).

**Actions**:
- Run `git init`
- Run `git add .`
- Run `git commit -m "Initial commit: MCP server scaffold"`
- Confirm git repository created

**Expected Outcome**: Git repository initialized with initial commit

### 15. Install Dependencies

Run npm install to download dependencies (unless `--no-install`).

**Actions**:
- Run `npm install`
- Wait for installation to complete
- Verify node_modules/ created
- Verify package-lock.json created

**Expected Outcome**: All dependencies installed and ready

### 16. Verify Installation

Run verification checks to ensure everything works.

**Actions**:
- Run `npm run typecheck` to verify TypeScript
- Run `npm run build` to test build process
- Verify dist/ directory created with server.js
- Check that server.js is executable
- Report any errors

**Expected Outcome**: Project builds successfully

### 17. Provide Next Steps

Display helpful information for getting started.

**Actions**:
- Show project structure summary
- List available npm scripts
- Provide development workflow guidance
- Show how to add new tools
- Display Claude Desktop configuration example

**Expected Outcome**: User knows how to proceed

---

## Verification

- [ ] All directories created (src/, src/tools/, src/utils/, src/types/, tests/)
- [ ] package.json created with correct metadata and dependencies
- [ ] tsconfig.json created with ESM configuration
- [ ] esbuild.build.js created with dual build setup
- [ ] src/config.ts created with configuration management
- [ ] src/server.ts created with standalone server
- [ ] src/server-factory.ts created (if not skipped)
- [ ] src/tools/hello-computer.ts created with example tool
- [ ] .env.example created with configuration template
- [ ] .gitignore created with standard exclusions
- [ ] README.md created with documentation
- [ ] Git repository initialized (if not skipped)
- [ ] Dependencies installed (if not skipped)
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] dist/server.js is executable

---

## Expected Output

### Files Created

```
my-mcp-server/
├── src/
│   ├── server.ts
│   ├── server-factory.ts
│   ├── config.ts
│   ├── tools/
│   │   └── hello-computer.ts
│   ├── utils/
│   └── types/
├── tests/
├── package.json
├── tsconfig.json
├── esbuild.build.js
├── esbuild.watch.js
├── jest.config.js
├── .env.example
├── .gitignore
├── README.md
└── LICENSE
```

### Console Output

```
🚀 Initializing MCP Server Project

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Project Information:
   Name: my-mcp-server
   Description: MCP server for managing tasks
   Author: John Doe
   License: MIT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Creating Directory Structure...
   ✓ Created src/
   ✓ Created src/tools/
   ✓ Created src/utils/
   ✓ Created src/types/
   ✓ Created tests/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Generating Configuration Files...
   ✓ Created package.json
   ✓ Created tsconfig.json
   ✓ Created esbuild.build.js
   ✓ Created esbuild.watch.js
   ✓ Created jest.config.js
   ✓ Created .env.example
   ✓ Created .gitignore

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 Creating Server Files...
   ✓ Created src/config.ts
   ✓ Created src/server.ts
   ✓ Created src/server-factory.ts
   ✓ Created src/tools/hello-computer.ts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 Creating Documentation...
   ✓ Created README.md
   ✓ Created LICENSE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Initializing Git Repository...
   ✓ Initialized git repository
   ✓ Created initial commit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Installing Dependencies...
   ✓ npm install completed
   ✓ Installed 42 packages

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Verifying Installation...
   ✓ TypeScript compilation successful
   ✓ Build completed successfully
   ✓ dist/server.js created

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Project Created Successfully!

Next Steps:
  1. cd my-mcp-server
  2. npm run dev          # Start development server
  3. npm run build        # Build for production
  4. npm test             # Run tests

Add to Claude Desktop:
  {
    "mcpServers": {
      "my-mcp-server": {
        "command": "node",
        "args": ["/absolute/path/to/my-mcp-server/dist/server.js"]
      }
    }
  }

Documentation: See README.md for complete usage guide
```

---

## Examples

### Example 1: Basic Project Initialization

**Context**: Starting a new MCP server project with default settings

**Invocation**: `@mcp-server-starter.init`

**Result**: 
- Agent prompts for project name and description
- Creates complete project structure
- Initializes git repository
- Installs dependencies
- Builds project successfully
- Provides next steps

### Example 2: Named Project with Author

**Context**: Creating a project with specific metadata

**Invocation**: `@mcp-server-starter.init --name task-manager --author "Jane Smith"`

**Result**:
- Creates project named "task-manager"
- Sets author to "Jane Smith"
- Uses default MIT license
- Completes full initialization

### Example 3: Minimal Setup

**Context**: Creating a minimal project without optional files

**Invocation**: `@mcp-server-starter.init --minimal`

**Result**:
- Creates core files only (no jest.config.js, no esbuild.watch.js)
- Skips test directory
- Faster setup for quick prototyping

### Example 4: Without Git or Install

**Context**: Creating project structure only, manual git/npm later

**Invocation**: `@mcp-server-starter.init --no-git --no-install`

**Result**:
- Creates all files and directories
- Skips git initialization
- Skips npm install
- User can run `git init` and `npm install` manually

---

## Related Commands

- [`@mcp-server-starter.add-tool`](mcp-server-starter.add-tool.md) - Use after init to add new tools
- [`@acp.package-validate`](acp.package-validate.md) - Validate the generated project structure

---

## Troubleshooting

### Issue 1: npm install fails

**Symptom**: Error during dependency installation

**Cause**: Network issues, npm registry unavailable, or incompatible Node.js version

**Solution**: 
- Check internet connection
- Verify Node.js version is 18+ (`node --version`)
- Try `npm install --verbose` for detailed error messages
- Clear npm cache: `npm cache clean --force`

### Issue 2: TypeScript compilation errors

**Symptom**: `npm run typecheck` fails with type errors

**Cause**: Incompatible TypeScript version or missing type definitions

**Solution**:
- Ensure TypeScript 5.3+ is installed
- Run `npm install @types/node --save-dev`
- Check tsconfig.json is correctly configured

### Issue 3: Build fails with esbuild errors

**Symptom**: `npm run build` fails

**Cause**: Syntax errors in source files or esbuild configuration issues

**Solution**:
- Run `npm run typecheck` first to catch TypeScript errors
- Verify esbuild.build.js is correctly configured
- Check that all imports use `.js` extensions (ESM requirement)

### Issue 4: Permission denied when running server

**Symptom**: Cannot execute `dist/server.js`

**Cause**: File not marked as executable

**Solution**:
- Run `chmod +x dist/server.js`
- Verify shebang is present in src/server.ts: `#!/usr/bin/env node`

### Issue 5: Git initialization fails

**Symptom**: Error "git: command not found"

**Cause**: Git not installed on system

**Solution**:
- Install Git from https://git-scm.com/
- Or use `--no-git` flag to skip git initialization

---

## Security Considerations

### File Access
- **Reads**: Current directory for project name inference, git config for author
- **Writes**: Creates entire project structure in target directory
- **Executes**: `git init`, `git add`, `git commit`, `npm install`, `npm run build`

### Network Access
- **APIs**: None directly
- **Repositories**: npm registry for dependency installation

### Sensitive Data
- **Secrets**: Never includes actual secrets, only .env.example template
- **Credentials**: Does not access or store any credentials
- **Git**: Reads git config for user.name only (public information)

---

## Notes

- This command creates a complete, production-ready MCP server project
- All generated files follow MCP best practices and patterns
- The project uses ESM (ES Modules) throughout - all imports must use `.js` extensions
- The dual export pattern (server + factory) is included by default for maximum flexibility
- The example tool (hello_computer) demonstrates the complete tool creation pattern
- Generated project is ready for immediate development - no additional setup required
- Use `@mcp-server-starter.add-tool` after initialization to add more tools
- All configuration files reference the documented patterns for detailed explanations

---

**Namespace**: mcp-server-starter
**Command**: init
**Version**: 1.0.0
**Created**: 2026-02-22
**Last Updated**: 2026-02-22
**Status**: Active
**Compatibility**: ACP 3.9.0+
**Author**: Patrick Michaelsen
