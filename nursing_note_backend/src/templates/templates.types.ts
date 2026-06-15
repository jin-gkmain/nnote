export const TEMPLATE_FIELD_TYPES = [
  'text_short',
  'text_long',
  'number',
  'date',
  'datetime',
  'boolean',
  'single_select',
  'multi_select',
  'computed',
  'image',
  'section_note',
] as const;

export type TemplateFieldType = (typeof TEMPLATE_FIELD_TYPES)[number];

export interface TemplateFieldOption {
  optionKey: string;
  label: string;
  allowFreeText: boolean;
  displayOrder: number;
}

export interface TemplateFieldCondition {
  conditionType: 'free_text_when_option';
  triggerFieldKey: string;
  triggerOptionKey: string;
  targetFieldKey: string;
}

export interface TemplateField {
  fieldKey: string;
  label: string;
  type: TemplateFieldType;
  description: string;
  aiHint: string;
  inputSources: string[];
  sourceRow: number;
  sourceDefinition: string;
  displayOrder: number;
  options: TemplateFieldOption[];
  conditions: TemplateFieldCondition[];
}

export interface TemplateSection {
  sectionKey: string;
  title: string;
  displayOrder: number;
  repeatable: boolean;
  fields: TemplateField[];
}

export interface TemplateCatalogForm {
  templateId: string;
  title: string;
  sourceSheet: string;
  institution: string;
  sections: TemplateSection[];
}

export interface TemplateListItem {
  templateId: string;
  title: string;
  version: number;
  sourceSheet: string;
  institution: string;
  isActive: boolean;
  sectionCount: number;
  fieldCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDetail extends TemplateListItem {
  sections: TemplateSection[];
}
