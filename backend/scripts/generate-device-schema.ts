import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { jsonSchemaToZod } from 'json-schema-to-zod'

type JsonSchema = Record<string, unknown>

const scriptDirectory = dirname(__filename)
const repositoryRoot = resolve(scriptDirectory, '../..')
const schemaPath = resolve(
  repositoryRoot,
  'backend/db/catalog/schema/device-schemas.json'
)
const outputPath = resolve(
  repositoryRoot,
  'backend/db/catalog/schema/generated-schema.ts'
)

const resolveLocalReferences = (
  value: unknown,
  rootSchema: JsonSchema,
  resolving = new Set<string>()
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) =>
      resolveLocalReferences(item, rootSchema, resolving)
    )
  }

  if (value === null || typeof value !== 'object') {
    return value
  }

  const schema = value as JsonSchema
  const reference = schema.$ref

  if (typeof reference === 'string') {
    if (!reference.startsWith('#/')) {
      throw new Error(`Unsupported schema reference: ${reference}`)
    }
    if (resolving.has(reference)) {
      throw new Error(`Circular schema reference: ${reference}`)
    }

    const target = reference
      .slice(2)
      .split('/')
      .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
      .reduce<unknown>((current, part) => {
        if (
          current === null ||
          typeof current !== 'object' ||
          !(part in current)
        ) {
          throw new Error(`Unresolved schema reference: ${reference}`)
        }
        return (current as JsonSchema)[part]
      }, rootSchema)

    const siblings = Object.fromEntries(
      Object.entries(schema).filter(([key]) => key !== '$ref')
    )
    const nextResolving = new Set(resolving).add(reference)
    const resolvedTarget = resolveLocalReferences(
      target,
      rootSchema,
      nextResolving
    )
    const resolvedSiblings = resolveLocalReferences(
      siblings,
      rootSchema,
      nextResolving
    )

    if (
      resolvedTarget !== null &&
      typeof resolvedTarget === 'object' &&
      !Array.isArray(resolvedTarget) &&
      resolvedSiblings !== null &&
      typeof resolvedSiblings === 'object' &&
      !Array.isArray(resolvedSiblings)
    ) {
      return { ...resolvedTarget, ...resolvedSiblings }
    }
    if (Object.keys(siblings).length > 0) {
      return { allOf: [resolvedTarget, resolvedSiblings] }
    }
    return resolvedTarget
  }

  return Object.fromEntries(
    Object.entries(schema).map(([key, item]) => [
      key,
      resolveLocalReferences(item, rootSchema, resolving),
    ])
  )
}

async function main() {
  const schemaText = await readFile(schemaPath, 'utf8')
  const sourceSchema: unknown = JSON.parse(schemaText)

  if (
    sourceSchema === null ||
    typeof sourceSchema !== 'object' ||
    Array.isArray(sourceSchema)
  ) {
    throw new Error('The device schema document must contain a JSON object.')
  }

  const resolvedSchema = resolveLocalReferences(
    sourceSchema,
    sourceSchema as JsonSchema
  )

  if (
    resolvedSchema === null ||
    typeof resolvedSchema !== 'object' ||
    Array.isArray(resolvedSchema)
  ) {
    throw new Error('Resolving the device schema did not produce an object.')
  }

  const conversionSchema = { ...resolvedSchema } as JsonSchema
  const categorySchemas = conversionSchema.oneOf

  if (Array.isArray(categorySchemas)) {
    const findCategoryDiscriminator = (categorySchema: unknown): unknown => {
      if (
        categorySchema === null ||
        typeof categorySchema !== 'object' ||
        Array.isArray(categorySchema)
      ) {
        return undefined
      }
      const schema = categorySchema as JsonSchema
      const properties = schema.properties
      if (
        properties !== null &&
        typeof properties === 'object' &&
        !Array.isArray(properties)
      ) {
        const category = (properties as JsonSchema).category
        if (
          category !== null &&
          typeof category === 'object' &&
          !Array.isArray(category)
        ) {
          return (category as JsonSchema).const
        }
      }
      if (Array.isArray(schema.allOf)) {
        return schema.allOf
          .map(findCategoryDiscriminator)
          .find((category) => category !== undefined)
      }
      return undefined
    }

    const categories = categorySchemas.map(findCategoryDiscriminator)

    if (
      categories.every((category) => typeof category === 'string') &&
      new Set(categories).size === categories.length
    ) {
      delete conversionSchema.oneOf
      conversionSchema.anyOf = categorySchemas
    }
  }

  const generatedSource = jsonSchemaToZod(conversionSchema, {
    name: 'generatedDeviceSchemas',
    module: 'esm',
    withJsdocs: true,
  })
  const completeSource = `${generatedSource.trimEnd()}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export const deviceSchemas = generatedDeviceSchemas.superRefine((device, ctx) => {
  const requireSfpFormFactor = (specs: unknown, path: string[]) => {
    if (
      isRecord(specs) &&
      typeof specs.sfp_ports === 'number' &&
      specs.sfp_ports >= 1 &&
      specs.sfp_form_factor === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'sfp_form_factor'],
        message: 'Required when sfp_ports is greater than 0.',
      })
    }
  }

  if (device.category === 'gateway_router') {
    requireSfpFormFactor(device.gateway_router_specs, ['gateway_router_specs'])

    if (device.switch_specs !== undefined) {
      requireSfpFormFactor(device.switch_specs, ['switch_specs'])

      if (device.gateway_router_specs.lan_ports !== 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['gateway_router_specs', 'lan_ports'],
          message: 'Must be 0 when switch_specs is present.',
        })
      }
    }
  } else if (device.category === 'switch') {
    requireSfpFormFactor(device.switch_specs, ['switch_specs'])
  }
})

export type DeviceSchemas = z.infer<typeof deviceSchemas>
`

  await writeFile(outputPath, completeSource, 'utf8')
  console.log(`Generated ${outputPath}`)
}

void main()
