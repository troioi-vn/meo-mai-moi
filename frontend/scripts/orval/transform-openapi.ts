/**
 * Orval transformer to strip the /api prefix from paths and fix spec issues.
 */
export default (schema: any) => {
  // Fix OpenAPI 3.0.0 vs 3.1.0 issues: remove 'type: null' which is invalid in 3.0.0
  // and replace with 'nullable: true'
  // Also strip operationId if it is a hash (32 hex chars) to get better function names
  const stringified = JSON.stringify(schema)
  const fixed = stringified
    .replace(/"type":\s*"null"/g, '"type": "string", "nullable": true')
    .replace(/"operationId":\s*"[a-f0-9]{32}"/g, '"x-original-operationId": "REMOVED"')
  const newSchema = JSON.parse(fixed)

  // Strip THE OUTER { success, data, message } envelope from component schemas
  if (newSchema.components?.schemas) {
    Object.keys(newSchema.components.schemas).forEach((key) => {
      const s = newSchema.components.schemas[key]
      if (s && s.properties && s.properties.data && !key.endsWith('Request')) {
        const props = Object.keys(s.properties)
        const isEnvelope = props.every((p) => ['success', 'data', 'message'].includes(p))
        if (isEnvelope) {
          newSchema.components.schemas[key] = s.properties.data
        }
      }
    })
  }

  // Strip THE OUTER { success, data, message } envelope from inline response schemas
  Object.values(newSchema.paths).forEach((pathItem: any) => {
    ;['get', 'post', 'put', 'patch', 'delete'].forEach((verb) => {
      const responses = pathItem[verb]?.responses
      if (responses) {
        Object.values(responses).forEach((response: any) => {
          const content = response.content?.['application/json']
          if (content?.schema) {
            const s = content.schema
            if (s && s.properties && s.properties.data) {
              const props = Object.keys(s.properties)
              const isEnvelope = props.every((p) => ['success', 'data', 'message'].includes(p))
              if (isEnvelope) {
                content.schema = s.properties.data
              }
            }
          }
        })
      }
    })
  })

  const newPaths: Record<string, any> = {}

  Object.keys(newSchema.paths).forEach((path) => {
    let newPath = path
    if (path.startsWith('/api/')) {
      newPath = path.replace('/api/', '/')
    } else if (path === '/api') {
      newPath = '/'
    }
    newPaths[newPath] = newSchema.paths[path]
  })

  newSchema.paths = newPaths

  return newSchema
}
