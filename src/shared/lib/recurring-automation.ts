import type { RecurringTemplate } from '@/entities/recurring-template/types';

const STORAGE_KEY = 'flowbudget-recurring-automation';

interface RecurringAutomationSettings {
  autoCreateOnDueDateById: Record<string, boolean>;
}

function readSettings(): RecurringAutomationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { autoCreateOnDueDateById: {} };
    }

    const parsed = JSON.parse(raw) as Partial<RecurringAutomationSettings>;
    return {
      autoCreateOnDueDateById: parsed.autoCreateOnDueDateById ?? {},
    };
  } catch {
    return { autoCreateOnDueDateById: {} };
  }
}

function writeSettings(settings: RecurringAutomationSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    //
  }
}

export function isRecurringAutoCreateOnDueDateEnabled(recurringTemplateId: string): boolean {
  return readSettings().autoCreateOnDueDateById[recurringTemplateId] ?? false;
}

export function setRecurringAutoCreateOnDueDate(
  recurringTemplateId: string,
  enabled: boolean
): void {
  const settings = readSettings();

  if (enabled) {
    settings.autoCreateOnDueDateById[recurringTemplateId] = true;
  } else {
    delete settings.autoCreateOnDueDateById[recurringTemplateId];
  }

  writeSettings(settings);
}

export function removeRecurringAutomationSettings(recurringTemplateId: string): void {
  setRecurringAutoCreateOnDueDate(recurringTemplateId, false);
}

export function mergeRecurringAutomationSettings(
  templates: RecurringTemplate[]
): RecurringTemplate[] {
  return templates.map((template) => ({
    ...template,
    autoCreateOnDueDate: isRecurringAutoCreateOnDueDateEnabled(template.id),
  }));
}
