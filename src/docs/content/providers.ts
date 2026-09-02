import { DocPage } from './types'

export const providersPage: DocPage = {
  slug: 'providers',
  title: 'Supported Providers',
  description: 'See every AI provider Ordisum tracks cost for, and how to connect each.',

  sections: [
    {
      id: 'supported-providers',
      heading: 'Supported Providers',
      table: {
        headers: ['Provider', 'Status', 'Notes'],
        rows: [
          ['OpenAI',       'GA',       'Full model-level breakdown'],
          ['Anthropic',    'GA',       'Full model-level breakdown'],
          ['Google Gemini','GA',       'Full model-level breakdown'],
          ['Azure OpenAI', 'GA',       'Includes whisper and embeddings'],
          ['AWS Bedrock',  'GA',       'Includes Llama, Claude on AWS'],
          ['Mistral',      'GA',       'Standard breakdown by model'],
          ['Groq',         'GA',       'Standard breakdown by model'],
          ['Cohere',       'Beta',     'Standard breakdown by model'],
        ],
      },
    },
    {
      id: 'how-connection-works',
      heading: 'How Connection Works',
      body:
        'Each provider connection uses a read-only API key that you provide. ' +
        'Ordisum calls the provider\'s official usage or billing API — ' +
        'the same endpoints the provider exposes for their own dashboard.\n\n' +
        'No proxy, no middleware, no code changes. ' +
        'We never send traffic through our servers.',
      callout: {
        type: 'info',
        title: 'Read-only access',
        text:
          'All API keys used by Ordisum require read-only permissions at minimum. ' +
          'Never use admin keys. We only read cost and usage data.',
      },
    },
    {
      id: 'openai',
      heading: 'OpenAI',
      body:
        '1. Go to platform.openai.com/api_keys\n' +
        '2. Create a new key with the "Billing" read permission\n' +
        '3. Copy and paste it into Ordisum\n' +
        '4. Wait 5 minutes for data to populate',
      callout: {
        type: 'tip',
        title: 'Organization vs. project keys',
        text:
          'If you use OpenAI projects, use a project-level key for project-scoped costs, ' +
          'or an org-level key for org-wide totals. The two are additive, not duplicates.',
      },
    },
    {
      id: 'anthropic',
      heading: 'Anthropic',
      body:
        '1. Go to console.anthropic.com/settings/keys\n' +
        '2. Create a key — no special scopes needed, read-only is default\n' +
        '3. Paste into Ordisum\n' +
        '4. Anthropic usage data updates every 5 minutes',
    },
    {
      id: 'google-gemini',
      heading: 'Google Gemini',
      body:
        '1. Go to aistudio.google.com/app/apikey\n' +
        '2. Create a new API key with no restrictions (or restrict to your domain)\n' +
        '3. Paste into Ordisum\n' +
        '4. For cost data, ensure billing is enabled on your Google Cloud project',
      callout: {
        type: 'warning',
        title: 'Gemini pricing model',
        text:
          'Google charges for tokens based on input and output size. ' +
          'Ordisum reads the official Cloud Billing export, ' +
          'which may have up to a 24-hour delay vs. the AI Studio usage dashboard.',
      },
    },
    {
      id: 'azure-openai',
      heading: 'Azure OpenAI',
      body:
        '1. Go to portal.azure.com → AI Services → Keys and Endpoint\n' +
        '2. Copy the Key and Endpoint values\n' +
        '3. Paste both into Ordisum\n' +
        '4. Azure is available to all Azure AI customers at no additional cost',
      callout: {
        type: 'info',
        title: 'Multi-region support',
        text:
          'If you use Azure OpenAI across multiple regions, ' +
          'add a separate connection for each region endpoint.',
      },
    },
    {
      id: 'aws-bedrock',
      heading: 'AWS Bedrock',
      body:
        '1. In AWS Console, go to IAM → Users → Create User\n' +
        '2. Attach the ReadOnlyAccess and BedrockReadOnly managed policies\n' +
        '3. Create an access key (Access Key ID + Secret Access Key)\n' +
        '4. Paste both into Ordisum\n' +
        '5. Ordisum will discover which Bedrock models you have enabled',
      callout: {
        type: 'info',
        title: 'Cross-region inference',
        text:
          'If you use Bedrock in multiple AWS regions, ' +
          'add a separate connection for each region.',
      },
    },
    {
      id: 'rotating-keys',
      heading: 'Rotating API Keys',
      body:
        'If you need to rotate a provider key, go to Providers, click the provider, ' +
        'and select "Update Key". The old key will be replaced immediately. ' +
        'Data will continue flowing within 5 minutes.',
    },
  ],

  prev: { label: 'Quickstart',    path: '/docs/quickstart'      },
  next: { label: 'Dashboard',     path: '/docs/dashboard'       },
}