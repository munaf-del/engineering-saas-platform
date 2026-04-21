export type TemplateObjectDefinition<TType extends string = string> = {
  defaultOrder: number;
  label: string;
  maxSizeRatio: {
    height: number;
    width: number;
  };
  minSizeMm: {
    height: number;
    width: number;
  };
  required?: boolean;
  singleton?: boolean;
  type: TType;
};

export function indexTemplateObjectDefinitions<TType extends string>(
  definitions: ReadonlyArray<TemplateObjectDefinition<TType>>,
) {
  return definitions.reduce(
    (accumulator, definition) => {
      accumulator[definition.type] = definition;
      return accumulator;
    },
    {} as Record<TType, TemplateObjectDefinition<TType>>,
  );
}

export function ensureRequiredTemplateObjects<TObject extends { type: TType }, TType extends string>(args: {
  createDefaultObject: (type: TType) => TObject;
  definitions: ReadonlyArray<TemplateObjectDefinition<TType>>;
  objects: TObject[];
}) {
  const presentTypes = new Set(args.objects.map((object) => object.type));
  const missingRequired = args.definitions
    .filter((definition) => definition.required && !presentTypes.has(definition.type))
    .map((definition) => args.createDefaultObject(definition.type));

  return [...args.objects, ...missingRequired];
}
