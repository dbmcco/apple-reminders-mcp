// ABOUTME: MCP server for macOS Reminders app integration using AppleScript

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { AppleScriptExecutor } from './applescript-executor.js';

class RemindersServer {
  private server: Server;
  private executor: AppleScriptExecutor;

  constructor() {
    this.server = new Server(
      {
        name: 'reminders-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.executor = new AppleScriptExecutor();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_reminder_lists',
            description: 'Get all reminder lists available in the Reminders app',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_reminders',
            description: 'Get reminders from a specific list or all lists, with optional filtering',
            inputSchema: {
              type: 'object',
              properties: {
                listName: {
                  type: 'string',
                  description: 'Name of the reminder list to search in (optional)',
                },
                completed: {
                  type: 'boolean',
                  description: 'Filter by completion status (optional)',
                },
                searchTerm: {
                  type: 'string',
                  description: 'Search term to filter reminders by name or body (optional)',
                },
              },
            },
          },
          {
            name: 'create_reminder',
            description: 'Create a new reminder in a specified list',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the reminder',
                },
                listName: {
                  type: 'string',
                  description: 'Name of the list to add the reminder to',
                },
                body: {
                  type: 'string',
                  description: 'Optional body/notes for the reminder',
                },
                dueDate: {
                  type: 'string',
                  description: 'Optional due date in format "MM/DD/YYYY HH:MM AM/PM"',
                },
                priority: {
                  type: 'number',
                  description: 'Priority level (0=none, 1=high, 5=medium, 9=low)',
                },
              },
              required: ['name', 'listName'],
            },
          },
          {
            name: 'update_reminder',
            description: 'Update an existing reminder',
            inputSchema: {
              type: 'object',
              properties: {
                reminderId: {
                  type: 'string',
                  description: 'ID of the reminder to update',
                },
                name: {
                  type: 'string',
                  description: 'New name for the reminder',
                },
                body: {
                  type: 'string',
                  description: 'New body/notes for the reminder',
                },
                completed: {
                  type: 'boolean',
                  description: 'Mark reminder as completed or not',
                },
                dueDate: {
                  type: 'string',
                  description: 'New due date in format "MM/DD/YYYY HH:MM AM/PM"',
                },
                priority: {
                  type: 'number',
                  description: 'New priority level (0=none, 1=high, 5=medium, 9=low)',
                },
              },
              required: ['reminderId'],
            },
          },
          {
            name: 'delete_reminder',
            description: 'Delete a reminder by ID',
            inputSchema: {
              type: 'object',
              properties: {
                reminderId: {
                  type: 'string',
                  description: 'ID of the reminder to delete',
                },
              },
              required: ['reminderId'],
            },
          },
          {
            name: 'search_reminders',
            description: 'Search for reminders by name or body content',
            inputSchema: {
              type: 'object',
              properties: {
                searchTerm: {
                  type: 'string',
                  description: 'Term to search for in reminder names and bodies',
                },
              },
              required: ['searchTerm'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'list_reminder_lists': {
            const lists = await this.executor.getReminderLists();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(lists, null, 2),
                },
              ],
            };
          }

          case 'get_reminders': {
            const { listName, completed, searchTerm } = request.params.arguments as {
              listName?: string;
              completed?: boolean;
              searchTerm?: string;
            };

            let reminders;
            if (searchTerm) {
              reminders = await this.executor.searchReminders(searchTerm);
              // Further filter by list and completion status if specified
              if (listName) {
                reminders = reminders.filter(r => r.list === listName);
              }
              if (completed !== undefined) {
                reminders = reminders.filter(r => r.completed === completed);
              }
            } else {
              reminders = await this.executor.getReminders(listName, completed);
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(reminders, null, 2),
                },
              ],
            };
          }

          case 'create_reminder': {
            const { name, listName, body, dueDate, priority } = request.params.arguments as {
              name: string;
              listName: string;
              body?: string;
              dueDate?: string;
              priority?: number;
            };

            const reminderId = await this.executor.createReminder(
              name,
              listName,
              body,
              dueDate,
              priority
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Reminder created successfully with ID: ${reminderId}`,
                },
              ],
            };
          }

          case 'update_reminder': {
            const { reminderId, ...updates } = request.params.arguments as {
              reminderId: string;
              name?: string;
              body?: string;
              completed?: boolean;
              dueDate?: string;
              priority?: number;
            };

            await this.executor.updateReminder(reminderId, updates);

            return {
              content: [
                {
                  type: 'text',
                  text: `Reminder ${reminderId} updated successfully`,
                },
              ],
            };
          }

          case 'delete_reminder': {
            const { reminderId } = request.params.arguments as {
              reminderId: string;
            };

            await this.executor.deleteReminder(reminderId);

            return {
              content: [
                {
                  type: 'text',
                  text: `Reminder ${reminderId} deleted successfully`,
                },
              ],
            };
          }

          case 'search_reminders': {
            const { searchTerm } = request.params.arguments as {
              searchTerm: string;
            };

            const reminders = await this.executor.searchReminders(searchTerm);

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(reminders, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Reminders MCP server running on stdio');
  }
}

const server = new RemindersServer();
server.run().catch(console.error);