import { Copy, Plug } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useGetSettingsPublic } from '@/api/generated/settings/settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const CLIENT_DOCS_URL = 'https://github.com/troioi-vn/meo-mcp/blob/main/docs/clients.md'
const AGENT_SKILL_URL = 'https://github.com/troioi-vn/meo-mcp-skill'

/**
 * The agent hand-off block. Deliberately untranslated: it is pasted into an AI
 * agent, not read by the person copying it, and the tool names it references
 * only exist in English.
 */
function buildAgentPrompt(endpoint: string): string {
  return [
    `Connect to the Meo Mai Moi MCP server at ${endpoint}`,
    '',
    'It is a remote Streamable HTTP MCP server that authenticates with OAuth.',
    'Do not ask me for an API key or a bearer token: add the server to your MCP',
    'client configuration, then complete the browser sign-in when prompted.',
    '',
    'Once connected, call list_pets to confirm access before anything else.',
    'Read a record before you change it, and re-read it afterwards to confirm',
    'the change landed.',
    '',
    `Connection guide: ${CLIENT_DOCS_URL}`,
    `Agent skill: ${AGENT_SKILL_URL}`,
  ].join('\n')
}

export default function McpSection() {
  const { t } = useTranslation('settings')
  const { data: publicSettings } = useGetSettingsPublic()
  const baseUrl = publicSettings?.mcp_base_url

  if (!baseUrl) {
    return null
  }

  const endpoint = `${baseUrl}/mcp`
  const agentPrompt = buildAgentPrompt(endpoint)

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast(t('developer.mcp.copySuccess'))
    } catch {
      toast.error(t('developer.mcp.copyError'))
    }
  }

  const steps = t('developer.mcp.steps', { returnObjects: true })
  const stepList = Array.isArray(steps) ? (steps as string[]) : []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5" />
          {t('developer.mcp.title')}
        </CardTitle>
        <CardDescription>{t('developer.mcp.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <div className="space-y-2">
          <p className="font-medium">{t('developer.mcp.endpointLabel')}</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-3 py-2 font-mono text-xs">
              {endpoint}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void copy(endpoint)}
              aria-label={t('developer.mcp.copyEndpoint')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground">{t('developer.mcp.noTokenNeeded')}</p>
        </div>

        <div className="space-y-2">
          <p className="font-medium">{t('developer.mcp.stepsTitle')}</p>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            {stepList.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="space-y-2">
          <p className="font-medium">{t('developer.mcp.agentPromptTitle')}</p>
          <p className="text-muted-foreground">{t('developer.mcp.agentPromptDescription')}</p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-3 font-mono text-xs">
            {agentPrompt}
          </pre>
          <Button type="button" variant="outline" size="sm" onClick={() => void copy(agentPrompt)}>
            <Copy className="mr-2 h-4 w-4" />
            {t('developer.mcp.copyAgentPrompt')}
          </Button>
        </div>

        <div className="space-y-1">
          <a
            className="block text-primary underline"
            href={CLIENT_DOCS_URL}
            target="_blank"
            rel="noreferrer"
          >
            {t('developer.mcp.docsLink')}
          </a>
          <a
            className="block text-primary underline"
            href={AGENT_SKILL_URL}
            target="_blank"
            rel="noreferrer"
          >
            {t('developer.mcp.skillLink')}
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
