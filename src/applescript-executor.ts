// ABOUTME: AppleScript execution utility for Reminders app integration

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface RemindersList {
  name: string;
  id: string;
}

export interface Reminder {
  id: string;
  name: string;
  body?: string;
  completed: boolean;
  list: string;
  dueDate?: string;
  priority: number;
  creationDate: string;
  modificationDate: string;
}

export class AppleScriptExecutor {
  private async executeScript(script: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "\\'")}'`);
      return stdout.trim();
    } catch (error) {
      throw new Error(`AppleScript execution failed: ${error}`);
    }
  }

  async getReminderLists(): Promise<RemindersList[]> {
    const script = `
      tell application "Reminders"
        set listNames to {}
        set listIds to {}
        repeat with reminderList in every list
          set end of listNames to name of reminderList
          set end of listIds to id of reminderList
        end repeat
        return listNames & "|||" & listIds
      end tell
    `;
    
    const result = await this.executeScript(script);
    const [namesStr, idsStr] = result.split('|||');
    const names = namesStr.split(', ');
    const ids = idsStr.split(', ');
    
    return names.map((name, index) => ({
      name: name.trim(),
      id: ids[index]?.trim() || ''
    }));
  }

  async getReminders(listName?: string, completed?: boolean): Promise<Reminder[]> {
    const listFilter = listName ? `in list "${listName}"` : '';
    const completedFilter = completed !== undefined ? 
      `whose completed is ${completed}` : '';
    
    const script = `
      tell application "Reminders"
        set reminderData to {}
        set targetReminders to every reminder ${listFilter} ${completedFilter}
        repeat with rem in targetReminders
          set reminderInfo to (name of rem) & "§§§" & ¬
            (body of rem) & "§§§" & ¬
            (completed of rem) & "§§§" & ¬
            (name of container of rem) & "§§§" & ¬
            (id of rem) & "§§§" & ¬
            (creation date of rem) & "§§§" & ¬
            (modification date of rem) & "§§§" & ¬
            (priority of rem)
          try
            set dueInfo to due date of rem
            set reminderInfo to reminderInfo & "§§§" & dueInfo
          on error
            set reminderInfo to reminderInfo & "§§§"
          end try
          set end of reminderData to reminderInfo
        end repeat
        return reminderData
      end tell
    `;
    
    const result = await this.executeScript(script);
    if (!result) return [];
    
    const reminderLines = result.split('\n').filter(line => line.trim());
    return reminderLines.map(line => {
      const parts = line.split('§§§');
      return {
        name: parts[0] || '',
        body: parts[1] || undefined,
        completed: parts[2] === 'true',
        list: parts[3] || '',
        id: parts[4] || '',
        creationDate: parts[5] || '',
        modificationDate: parts[6] || '',
        priority: parseInt(parts[7]) || 0,
        dueDate: parts[8] || undefined
      };
    });
  }

  async createReminder(
    name: string,
    listName: string,
    body?: string,
    dueDate?: string,
    priority?: number
  ): Promise<string> {
    const bodyScript = body ? `set body of newReminder to "${body}"` : '';
    const dueDateScript = dueDate ? `set due date of newReminder to date "${dueDate}"` : '';
    const priorityScript = priority ? `set priority of newReminder to ${priority}` : '';
    
    const script = `
      tell application "Reminders"
        set targetList to list "${listName}"
        set newReminder to make new reminder in targetList
        set name of newReminder to "${name}"
        ${bodyScript}
        ${dueDateScript}
        ${priorityScript}
        return id of newReminder
      end tell
    `;
    
    return await this.executeScript(script);
  }

  async updateReminder(
    reminderId: string,
    updates: {
      name?: string;
      body?: string;
      completed?: boolean;
      dueDate?: string;
      priority?: number;
    }
  ): Promise<void> {
    const updateCommands = [];
    
    if (updates.name) updateCommands.push(`set name of targetReminder to "${updates.name}"`);
    if (updates.body !== undefined) updateCommands.push(`set body of targetReminder to "${updates.body}"`);
    if (updates.completed !== undefined) updateCommands.push(`set completed of targetReminder to ${updates.completed}`);
    if (updates.dueDate) updateCommands.push(`set due date of targetReminder to date "${updates.dueDate}"`);
    if (updates.priority !== undefined) updateCommands.push(`set priority of targetReminder to ${updates.priority}`);
    
    const script = `
      tell application "Reminders"
        set targetReminder to reminder id "${reminderId}"
        ${updateCommands.join('\n        ')}
      end tell
    `;
    
    await this.executeScript(script);
  }

  async deleteReminder(reminderId: string): Promise<void> {
    const script = `
      tell application "Reminders"
        delete reminder id "${reminderId}"
      end tell
    `;
    
    await this.executeScript(script);
  }

  async searchReminders(searchTerm: string): Promise<Reminder[]> {
    const script = `
      tell application "Reminders"
        set foundReminders to {}
        set allReminders to every reminder
        repeat with rem in allReminders
          if (name of rem) contains "${searchTerm}" or (body of rem) contains "${searchTerm}" then
            set reminderInfo to (name of rem) & "§§§" & ¬
              (body of rem) & "§§§" & ¬
              (completed of rem) & "§§§" & ¬
              (name of container of rem) & "§§§" & ¬
              (id of rem) & "§§§" & ¬
              (creation date of rem) & "§§§" & ¬
              (modification date of rem) & "§§§" & ¬
              (priority of rem)
            try
              set dueInfo to due date of rem
              set reminderInfo to reminderInfo & "§§§" & dueInfo
            on error
              set reminderInfo to reminderInfo & "§§§"
            end try
            set end of foundReminders to reminderInfo
          end if
        end repeat
        return foundReminders
      end tell
    `;
    
    const result = await this.executeScript(script);
    if (!result) return [];
    
    const reminderLines = result.split('\n').filter(line => line.trim());
    return reminderLines.map(line => {
      const parts = line.split('§§§');
      return {
        name: parts[0] || '',
        body: parts[1] || undefined,
        completed: parts[2] === 'true',
        list: parts[3] || '',
        id: parts[4] || '',
        creationDate: parts[5] || '',
        modificationDate: parts[6] || '',
        priority: parseInt(parts[7]) || 0,
        dueDate: parts[8] || undefined
      };
    });
  }
}