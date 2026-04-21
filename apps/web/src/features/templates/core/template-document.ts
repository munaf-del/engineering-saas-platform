export type TemplateRectMm = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type TemplateSafeArea = {
  height: number;
  margin: number;
  width: number;
  x: number;
  y: number;
};

export type TemplateObjectBase<TType extends string = string> = TemplateRectMm & {
  id: string;
  locked: boolean;
  name: string;
  order: number;
  type: TType;
  visible: boolean;
};

export type TemplateDocument<TObject extends TemplateObjectBase = TemplateObjectBase> = {
  id: string;
  name: string;
  objects: TObject[];
  updatedAt: string;
};

export function createTemplateObjectId(prefix = 'template-object') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createTemplateDocumentId(prefix = 'template-document') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
