import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

// The schema of the plan parameters the LLM is allowed to produce
export const PLAN_TOOL_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "Name of the plan (e.g. Starter, Professional)" },
    monthly_price: { type: "number", description: "Monthly price in USD" },
    yearly_price: { type: "number", description: "Yearly price in USD (usually 10x monthly)" },
    currency: { type: "string", description: "Currency, usually 'usd'" },
    description: { type: "string", description: "Short description of the plan" },
    system_limits: {
      type: "object",
      properties: {
        limits: {
          type: "object",
          properties: {
            integrations: { type: ["number", "null"], description: "Max integrations (null for unlimited)" },
            platform_keys: { type: ["number", "null"], description: "Max platform keys (null for unlimited)" },
            alert_rules: { type: ["number", "null"], description: "Max alert rules (null for unlimited)" },
            budget_rules: { type: ["number", "null"], description: "Max budget rules (null for unlimited)" },
            team_members: { type: ["number", "null"], description: "Max team members (null for unlimited)" },
            monthly_spend_usd: { type: ["number", "null"], description: "Max monthly spend in USD (null for unlimited)" }
          }
        },
        usage: {
          type: "object",
          properties: {
            warning_threshold_percent: { type: "number", description: "Warning threshold percentage (e.g. 80)" }
          }
        },
        features: {
          type: "object",
          properties: {
            api_gateway: { type: "boolean" },
            analytics: { type: "boolean" },
            advanced_analytics: { type: "boolean" },
            alerts: { type: "boolean" },
            budget_manager: { type: "boolean" },
            ai_playground: { type: "boolean" },
            benchmarks: { type: "boolean" },
            roi_calculator: { type: "boolean" },
            reports: { type: "boolean" },
            csv_export: { type: "boolean" },
            pdf_export: { type: "boolean" },
            premium_models: { type: "boolean" },
            webhooks: { type: "boolean" },
            slack_alerts: { type: "boolean" },
            cost_spike_detection: { type: "boolean" },
            anomaly_detection: { type: "boolean" }
          }
        },
        rate_limits: {
          type: "object",
          properties: {
            requests_per_minute: { type: ["number", "null"], description: "RPM limit (null for unlimited)" },
            concurrent_requests: { type: ["number", "null"], description: "Concurrency limit (null for unlimited)" }
          }
        },
        model_access: {
          type: "object",
          properties: {
            tier: { type: "string", enum: ["basic", "standard", "premium", "all"] }
          }
        }
      },
      required: ["limits", "usage", "features", "rate_limits", "model_access"]
    }
  },
  required: ["name", "monthly_price", "system_limits"]
};

// Primary: Dahl LLM provider (OpenAI-compatible) via LLM_API_KEY / LLM_BASE_URL
const dahlClient = process.env.LLM_API_KEY
  ? new OpenAI({
      apiKey: process.env.LLM_API_KEY,
      baseURL: process.env.LLM_BASE_URL || 'https://inference.dahl.global/v1',
    })
  : null;

// Optional fallback providers (disabled unless their keys are explicitly set)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

// Dahl provider model priority list for the pricing agent
const DAHL_AGENT_MODELS = [
  ...(process.env.LLM_DEFAULT_MODEL ? [process.env.LLM_DEFAULT_MODEL] : []),
  'Atria-Dawn-Preview', // Added based on user preference
  'zai-org/GLM-5.3-Flash',
  'deepseek-ai/DeepSeek-V4-Flash-0731',
  'MiniMaxAI/MiniMax-M2.7',
];

/**
 * Calls Dahl LLM first (primary provider), then falls back to OpenAI, then Anthropic.
 */
export async function callAgentLLM(prompt, existingPlansContext) {
  const systemPrompt = `You are the Ordisum Pricing & Subscription AI Agent.
Your job is to parse the user's natural language request and determine how to create or update a subscription plan.
You have the power to create new plans or update existing ones.
If updating, make sure to retain properties that the user didn't mention changing, based on the existing plans context provided.

Existing Plans Context:
${JSON.stringify(existingPlansContext, null, 2)}

You must return a tool call: either 'create_plan' or 'update_plan'.
Make sure system_limits strictly follows the schema. Ensure 'null' is used for unlimited numeric values, not 9999 or -1.`;

  const tools = [
    {
      type: 'function',
      function: {
        name: 'create_plan',
        description: 'Create a new subscription plan',
        parameters: PLAN_TOOL_SCHEMA
      }
    },
    {
      type: 'function',
      function: {
        name: 'update_plan',
        description: 'Update an existing subscription plan',
        parameters: {
          type: 'object',
          properties: {
            plan_id: { type: 'string', description: 'The UUID of the plan to update' },
            updates: PLAN_TOOL_SCHEMA
          },
          required: ['plan_id', 'updates']
        }
      }
    }
  ];

  let lastError = null;

  // 1. Try Dahl (primary provider) across supported models
  if (dahlClient) {
    for (const model of DAHL_AGENT_MODELS) {
      try {
        console.log(`[PricingAgent] Attempting with Dahl model: ${model}...`);
        const completion = await dahlClient.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          tools,
          tool_choice: 'required'
        });

        let actionName, argsObj;

        if (completion.choices[0].message.tool_calls && completion.choices[0].message.tool_calls.length > 0) {
          const toolCall = completion.choices[0].message.tool_calls[0];
          actionName = toolCall.function.name;
          argsObj = JSON.parse(toolCall.function.arguments);
        } else if (completion.choices[0].message.content) {
          // Fallback: Some providers return the tool call as a raw JSON string in the content
          let content = completion.choices[0].message.content.trim();
          if (content.startsWith('```json')) content = content.replace(/```json/g, '').replace(/```/g, '').trim();
          else if (content.startsWith('```')) content = content.replace(/```/g, '').trim();
          
          argsObj = JSON.parse(content);
          // Infer action based on presence of plan_id
          actionName = argsObj.plan_id ? 'update_plan' : 'create_plan';
          
          // If the model wrapped the payload in 'updates', extract it
          if (actionName === 'create_plan' && argsObj.updates) {
             argsObj = argsObj.updates;
          }
        } else {
           throw new Error('LLM returned an empty response without tool calls');
        }

        return {
          action: actionName,
          args: argsObj,
          provider: `dahl/${model}`
        };
      } catch (err) {
        lastError = err;
        console.warn(`[PricingAgent] Dahl model ${model} failed: ${err.message}. Trying next...`);
      }
    }
    console.error('[PricingAgent] All Dahl models exhausted. Trying fallback providers...');
  }

  // 2. Try OpenAI fallback
  if (openai) {
    try {
      console.log('[PricingAgent] Attempting with OpenAI fallback (gpt-4o)...');
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        tools,
        tool_choice: 'required'
      });

      const toolCall = completion.choices[0].message.tool_calls[0];
      return {
        action: toolCall.function.name,
        args: JSON.parse(toolCall.function.arguments),
        provider: 'openai'
      };
    } catch (err) {
      lastError = err;
      console.error('[PricingAgent] OpenAI fallback failed:', err.message);
    }
  }

  // 2. Try Anthropic (Fallback)
  if (anthropic) {
    try {
      console.log('[PricingAgent] Attempting with Anthropic (claude-3-5-sonnet)...');
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            name: 'create_plan',
            description: 'Create a new subscription plan',
            input_schema: PLAN_TOOL_SCHEMA
          },
          {
            name: 'update_plan',
            description: 'Update an existing subscription plan',
            input_schema: {
              type: 'object',
              properties: {
                plan_id: { type: 'string', description: 'The UUID of the plan to update' },
                updates: PLAN_TOOL_SCHEMA
              },
              required: ['plan_id', 'updates']
            }
          }
        ],
        tool_choice: { type: 'any' }
      });

      const toolCall = response.content.find(c => c.type === 'tool_use');
      if (!toolCall) throw new Error('Anthropic did not return a tool call');

      return {
        action: toolCall.name,
        args: toolCall.input,
        provider: 'anthropic'
      };
    } catch (err) {
      console.error('[PricingAgent] Anthropic failed:', err.message);
      lastError = err;
    }
  }

  if (lastError) {
    throw new Error(`LLM API request failed: ${lastError.message}`);
  }

  throw new Error('No LLM API keys configured for Pricing Agent. Set LLM_API_KEY to use the Dahl provider.');
}
