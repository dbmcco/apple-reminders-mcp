# Apple Reminders MCP Server

A Model Context Protocol (MCP) server that provides seamless integration between Claude and macOS Apple Reminders app. Built with TypeScript and AppleScript for reliable, native Reminders access.

## Features

- **Complete Reminders Management**: Create, read, update, and delete reminders
- **List Management**: Access and organize reminders across multiple lists
- **Advanced Filtering**: Search by text, filter by completion status, or target specific lists
- **Rich Metadata**: Due dates, priorities, notes, creation/modification timestamps
- **Native Integration**: Direct AppleScript integration with zero external dependencies
- **Type-Safe**: Built with TypeScript for reliability and maintainability

## Requirements

- **macOS**: This server uses AppleScript and requires macOS with the Reminders app
- **Node.js**: Version 16 or higher
- **Claude Desktop** or **Claude Code CLI**: For MCP integration

## Installation

### From Source

1. Clone this repository:
```bash
git clone https://github.com/dbmcco/apple-reminders-mcp.git
cd apple-reminders-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the server:
```bash
npm run build
```

## Configuration

### For Claude Desktop

Add this to your Claude Desktop configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "reminders": {
      "command": "node",
      "args": ["/absolute/path/to/apple-reminders-mcp/dist/index.js"]
    }
  }
}
```

### For Claude Code CLI

Run this command:
```bash
claude mcp add -s user reminders node /absolute/path/to/apple-reminders-mcp/dist/index.js
```

**Important**: Replace `/absolute/path/to/apple-reminders-mcp` with the actual path where you cloned this repository.

## Available MCP Tools

### `list_reminder_lists`
Get all available reminder lists.

**Returns**: Array of lists with `name` and `id` properties.

**Example**:
```javascript
// Response:
[
  {"name": "Reminders", "id": "x-apple-reminder://..."},
  {"name": "Work", "id": "x-apple-reminder://..."},
  {"name": "Personal", "id": "x-apple-reminder://..."}
]
```

### `get_reminders`
Retrieve reminders with optional filtering.

**Parameters**:
- `listName` (string, optional): Filter by specific list name
- `completed` (boolean, optional): Filter by completion status
- `searchTerm` (string, optional): Search in names and bodies

**Returns**: Array of reminder objects with full metadata.

**Examples**:
```javascript
// Get all incomplete reminders
get_reminders(undefined, false)

// Get all reminders from "Work" list
get_reminders("Work")

// Get completed reminders from "Personal" list
get_reminders("Personal", true)

// Search for reminders containing "meeting"
get_reminders(undefined, undefined, "meeting")
```

### `create_reminder`
Create a new reminder in a specified list.

**Parameters**:
- `name` (string, required): Reminder title
- `listName` (string, required): Target list name
- `body` (string, optional): Notes/description
- `dueDate` (string, optional): Due date in format "MM/DD/YYYY HH:MM AM/PM"
- `priority` (number, optional): 0=none, 1=high, 5=medium, 9=low

**Returns**: ID of the created reminder.

**Examples**:
```javascript
// Simple reminder
create_reminder("Buy groceries", "Personal")

// Reminder with due date and priority
create_reminder(
  "Submit report",
  "Work",
  "Include Q4 metrics",
  "12/31/2025 5:00 PM",
  1
)

// Reminder with notes
create_reminder(
  "Call dentist",
  "Personal",
  "Schedule annual checkup"
)
```

### `update_reminder`
Update an existing reminder.

**Parameters**:
- `reminderId` (string, required): ID of the reminder to update
- `name` (string, optional): New title
- `body` (string, optional): New notes
- `completed` (boolean, optional): Completion status
- `dueDate` (string, optional): New due date
- `priority` (number, optional): New priority

**Examples**:
```javascript
// Mark reminder as complete
update_reminder("x-apple-reminder://...", {completed: true})

// Update due date
update_reminder("x-apple-reminder://...", {
  dueDate: "01/15/2026 2:00 PM"
})

// Update multiple fields
update_reminder("x-apple-reminder://...", {
  name: "Updated title",
  body: "New notes",
  priority: 1
})
```

### `delete_reminder`
Delete a reminder permanently.

**Parameters**:
- `reminderId` (string, required): ID of the reminder to delete

**Example**:
```javascript
delete_reminder("x-apple-reminder://...")
```

### `search_reminders`
Search for reminders by text in names or bodies.

**Parameters**:
- `searchTerm` (string, required): Text to search for

**Returns**: Array of matching reminder objects.

**Example**:
```javascript
// Find all reminders mentioning "Claude"
search_reminders("Claude")
```

## Usage Examples

### Example 1: Daily Task Management
```
You: Show me all incomplete tasks from my "Today" list
Claude: [uses get_reminders("Today", false)]

You: Mark the first one as complete
Claude: [uses update_reminder with completed: true]
```

### Example 2: Quick Capture
```
You: Remind me to call John tomorrow at 2pm
Claude: [uses create_reminder with due date]
```

### Example 3: Project Organization
```
You: Show me all reminders related to the "Website" project
Claude: [uses search_reminders("Website")]

You: Move them all to the "Work" list
Claude: [uses update_reminder for each result]
```

### Example 4: Weekly Review
```
You: What did I complete this week in my "Personal" list?
Claude: [uses get_reminders("Personal", true)]
```

## Data Model

### Reminder Object
```typescript
{
  id: string;                 // Unique reminder ID
  name: string;               // Reminder title
  body?: string;              // Optional notes/description
  completed: boolean;         // Completion status
  list: string;               // Parent list name
  dueDate?: string;           // Optional due date
  priority: number;           // 0=none, 1=high, 5=medium, 9=low
  creationDate: string;       // When reminder was created
  modificationDate: string;   // When last modified
}
```

### RemindersList Object
```typescript
{
  name: string;  // List display name
  id: string;    // Unique list ID
}
```

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run dev
```

### Run Server Directly
```bash
npm run start
```

## Architecture

This MCP server uses a clean architecture:

1. **MCP Server Layer** (`index.ts`): Handles MCP protocol communication
2. **AppleScript Executor** (`applescript-executor.ts`): Manages all Reminders app interactions
3. **Type Safety**: Zod validation and TypeScript for reliability

The AppleScript integration uses `osascript` for direct system integration, avoiding external dependencies and app translocation issues.

## Troubleshooting

### Permission Issues
If you get permission errors, ensure:
1. Terminal (or your app) has Automation permissions for Reminders
2. Go to System Preferences > Security & Privacy > Privacy > Automation
3. Enable access for the app running this server

### Date Format Issues
Due dates must use the format: `"MM/DD/YYYY HH:MM AM/PM"`

Examples:
- `"12/25/2025 9:00 AM"`
- `"01/01/2026 11:30 PM"`

### Reminder IDs
Reminder IDs are system-generated Apple URLs (e.g., `x-apple-reminder://...`). They're not portable across systems but are stable within a single macOS installation.

## Credits

Built with Claude (Anthropic) using the Model Context Protocol SDK.

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
