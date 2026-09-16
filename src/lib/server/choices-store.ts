import fs from 'fs';
import path from 'path';
import { CharterChoicesConfig, DEFAULT_CHARTER_CHOICES } from '@/config/charter-choices.config';

const CHOICES_FILE = path.join(process.cwd(), '.data', 'charter_choices.json');

export function getCharterChoices(): CharterChoicesConfig {
  try {
    if (!fs.existsSync(CHOICES_FILE)) {
      const dir = path.dirname(CHOICES_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CHOICES_FILE, JSON.stringify(DEFAULT_CHARTER_CHOICES, null, 2), 'utf-8');
      return DEFAULT_CHARTER_CHOICES;
    }

    const data = fs.readFileSync(CHOICES_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      project_types: parsed.project_types?.length ? parsed.project_types : DEFAULT_CHARTER_CHOICES.project_types,
      regions: parsed.regions?.length ? parsed.regions : DEFAULT_CHARTER_CHOICES.regions,
      countries: parsed.countries?.length ? parsed.countries : DEFAULT_CHARTER_CHOICES.countries,
      manufacturing_plants: parsed.manufacturing_plants?.length ? parsed.manufacturing_plants : DEFAULT_CHARTER_CHOICES.manufacturing_plants,
    };
  } catch (error) {
    console.error('[Choices Store] Failed to read choices, falling back to defaults:', error);
    return DEFAULT_CHARTER_CHOICES;
  }
}

export function saveCharterChoices(choices: Partial<CharterChoicesConfig>): CharterChoicesConfig {
  const current = getCharterChoices();
  const updated: CharterChoicesConfig = {
    project_types: choices.project_types || current.project_types,
    regions: choices.regions || current.regions,
    countries: choices.countries || current.countries,
    manufacturing_plants: choices.manufacturing_plants || current.manufacturing_plants,
  };

  try {
    const dir = path.dirname(CHOICES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CHOICES_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Choices Store] Failed to save choices:', error);
  }

  return updated;
}
