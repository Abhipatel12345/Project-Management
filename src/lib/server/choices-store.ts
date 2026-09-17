import fs from 'fs';
import path from 'path';
import {
  CharterChoicesConfig,
  DEFAULT_CHARTER_CHOICES,
  MasterChoicesConfig,
  DEFAULT_MASTER_CHOICES,
} from '@/config/charter-choices.config';

const CHOICES_FILE = path.join(process.cwd(), '.data', 'master_choices.json');
const LEGACY_CHARTER_FILE = path.join(process.cwd(), '.data', 'charter_choices.json');

export function getMasterChoices(): MasterChoicesConfig {
  try {
    if (!fs.existsSync(CHOICES_FILE)) {
      const dir = path.dirname(CHOICES_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Check legacy file if exists
      let initial = { ...DEFAULT_MASTER_CHOICES };
      if (fs.existsSync(LEGACY_CHARTER_FILE)) {
        try {
          const legData = JSON.parse(fs.readFileSync(LEGACY_CHARTER_FILE, 'utf-8'));
          initial = { ...initial, ...legData };
        } catch {
          // ignore
        }
      }

      fs.writeFileSync(CHOICES_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }

    const data = fs.readFileSync(CHOICES_FILE, 'utf-8');
    const parsed = JSON.parse(data);

    return {
      project_types: parsed.project_types?.length ? parsed.project_types : DEFAULT_MASTER_CHOICES.project_types,
      regions: parsed.regions?.length ? parsed.regions : DEFAULT_MASTER_CHOICES.regions,
      countries: parsed.countries?.length ? parsed.countries : DEFAULT_MASTER_CHOICES.countries,
      manufacturing_plants: parsed.manufacturing_plants?.length ? parsed.manufacturing_plants : DEFAULT_MASTER_CHOICES.manufacturing_plants,
      board_functions: parsed.board_functions?.length ? parsed.board_functions : DEFAULT_MASTER_CHOICES.board_functions,
      pdt_roles: parsed.pdt_roles?.length ? parsed.pdt_roles : DEFAULT_MASTER_CHOICES.pdt_roles,
      team_types: parsed.team_types?.length ? parsed.team_types : DEFAULT_MASTER_CHOICES.team_types,
      skipped_tasks: parsed.skipped_tasks?.length ? parsed.skipped_tasks : DEFAULT_MASTER_CHOICES.skipped_tasks,
      gate_board_members: parsed.gate_board_members?.length ? parsed.gate_board_members : DEFAULT_MASTER_CHOICES.gate_board_members,
      kgd_statuses: parsed.kgd_statuses?.length ? parsed.kgd_statuses : DEFAULT_MASTER_CHOICES.kgd_statuses,
      gates: parsed.gates?.length ? parsed.gates : DEFAULT_MASTER_CHOICES.gates,
      design_reviews: parsed.design_reviews?.length ? parsed.design_reviews : DEFAULT_MASTER_CHOICES.design_reviews,
      product_groups: parsed.product_groups?.length ? parsed.product_groups : DEFAULT_MASTER_CHOICES.product_groups,
      groups: parsed.groups?.length ? parsed.groups : DEFAULT_MASTER_CHOICES.groups,
      rm_choices: parsed.rm_choices?.length ? parsed.rm_choices : DEFAULT_MASTER_CHOICES.rm_choices,
      dr_statuses: parsed.dr_statuses?.length ? parsed.dr_statuses : DEFAULT_MASTER_CHOICES.dr_statuses,
      dr_completion_statuses: parsed.dr_completion_statuses?.length ? parsed.dr_completion_statuses : DEFAULT_MASTER_CHOICES.dr_completion_statuses,
      dr_decisions: parsed.dr_decisions?.length ? parsed.dr_decisions : DEFAULT_MASTER_CHOICES.dr_decisions,
      pdt_recommendations: parsed.pdt_recommendations?.length ? parsed.pdt_recommendations : DEFAULT_MASTER_CHOICES.pdt_recommendations,
      project_statuses: parsed.project_statuses?.length ? parsed.project_statuses : DEFAULT_MASTER_CHOICES.project_statuses,
    };
  } catch (error) {
    console.error('[Choices Store] Failed to read choices, falling back to defaults:', error);
    return DEFAULT_MASTER_CHOICES;
  }
}

export function saveMasterChoices(choices: Partial<MasterChoicesConfig>): MasterChoicesConfig {
  const current = getMasterChoices();
  const updated: MasterChoicesConfig = {
    ...current,
    ...choices,
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

export function getCharterChoices(): CharterChoicesConfig {
  const master = getMasterChoices();
  return {
    project_types: master.project_types,
    regions: master.regions,
    countries: master.countries,
    manufacturing_plants: master.manufacturing_plants,
  };
}

export function saveCharterChoices(choices: Partial<CharterChoicesConfig>): CharterChoicesConfig {
  saveMasterChoices(choices);
  return getCharterChoices();
}
