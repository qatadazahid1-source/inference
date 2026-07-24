// ============================================================================
// Generate Report — creates PDF/CSV reports from usage data
// ============================================================================
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { reportId } = await req.json()
    if (!reportId) {
      return new Response(JSON.stringify({ error: 'Missing reportId' }), { status: 400 })
    }

    // Get report config
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return new Response(JSON.stringify({ error: 'Report not found' }), { status: 404 })
    }

    // Update status to generating
    await supabase.from('reports').update({ status: 'generating' }).eq('id', reportId)

    // Gather data based on report type
    const params = report.parameters as Record<string, any> || {}
    const orgId = report.organization_id
    const startDate = params.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const endDate = params.end_date || new Date().toISOString()

    let data: any[] = []

    if (report.type === 'executive_summary') {
      // Aggregate spend by provider
      const { data: spendData } = await supabase
        .from('api_usage_logs')
        .select('provider, cost_usd, total_tokens')
        .eq('organization_id', orgId)
        .gte('logged_at', startDate)
        .lte('logged_at', endDate)

      if (spendData) {
        const byProvider: Record<string, { cost: number; tokens: number; count: number }> = {}
        for (const row of spendData) {
          if (!byProvider[row.provider]) byProvider[row.provider] = { cost: 0, tokens: 0, count: 0 }
          byProvider[row.provider].cost += Number(row.cost_usd)
          byProvider[row.provider].tokens += Number(row.total_tokens)
          byProvider[row.provider].count++
        }

        const totalCost = Object.values(byProvider).reduce((sum, p) => sum + p.cost, 0)
        const totalTokens = Object.values(byProvider).reduce((sum, p) => sum + p.tokens, 0)

        // Get top models
        const { data: modelData } = await supabase
          .from('api_usage_logs')
          .select('model, cost_usd')
          .eq('organization_id', orgId)
          .gte('logged_at', startDate)
          .lte('logged_at', endDate)
          .order('cost_usd', { ascending: false })
          .limit(10)

        data = [{
          period: `${startDate.split('T')[0]} to ${endDate.split('T')[0]}`,
          total_spend: totalCost,
          total_tokens: totalTokens,
          providers: byProvider,
          top_models: modelData || [],
          generated_at: new Date().toISOString(),
        }]
      }
    } else if (report.type === 'finance') {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', orgId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })

      data = invoices || []
    } else {
      // Raw usage data
      const { data: usageData } = await supabase
        .from('api_usage_logs')
        .select('*')
        .eq('organization_id', orgId)
        .gte('logged_at', startDate)
        .lte('logged_at', endDate)
        .order('logged_at', { ascending: false })
        .limit(params.limit || 1000)

      data = usageData || []
    }

    // Generate file content
    let fileUrl: string | null = null
    let fileSize: number | null = null

    if (report.format === 'csv') {
      const csvContent = generateCSV(data)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(`${orgId}/${reportId}.csv`, csvContent, {
          contentType: 'text/csv',
          upsert: true,
        })

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('reports')
          .getPublicUrl(`${orgId}/${reportId}.csv`)
        fileUrl = urlData?.publicUrl || null
        fileSize = new TextEncoder().encode(csvContent).length
      }
    } else {
      // JSON format (PDF would need a PDF generation library)
      const jsonContent = JSON.stringify(data, null, 2)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(`${orgId}/${reportId}.json`, jsonContent, {
          contentType: 'application/json',
          upsert: true,
        })

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('reports')
          .getPublicUrl(`${orgId}/${reportId}.json`)
        fileUrl = urlData?.publicUrl || null
        fileSize = new TextEncoder().encode(jsonContent).length
      }
    }

    // Update report with results
    await supabase.from('reports').update({
      status: 'ready',
      file_url: fileUrl,
      file_size_bytes: fileSize,
      completed_at: new Date().toISOString(),
    }).eq('id', reportId)

    return new Response(JSON.stringify({ success: true, file_url: fileUrl }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error generating report:', err)
    // Mark report as failed
    try {
      const { reportId } = await req.json()
      if (reportId) {
        await supabase.from('reports').update({ status: 'failed' }).eq('id', reportId)
      }
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

function generateCSV(data: any[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const lines = [headers.join(',')]

  for (const row of data) {
    const values = headers.map((h) => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      // Escape commas and quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
    lines.push(values.join(','))
  }

  return lines.join('\n')
}
