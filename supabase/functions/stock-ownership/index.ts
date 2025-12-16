import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker } = await req.json();
    console.log('Fetching ownership data for:', ticker);

    const ownershipUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=institutionOwnership,fundOwnership,majorHoldersBreakdown`;
    const response = await fetch(ownershipUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.warn(`Yahoo Finance API error: ${response.status}`);
      // Return mock ownership data
      return new Response(
        JSON.stringify({ 
          ticker,
          shareholding: {
            insiders: 15.50,
            institutions: 65.30,
            retail: 19.20,
          },
          pieData: [
            { name: 'Insiders/Promoters', value: 15.50, color: '#3b82f6' },
            { name: 'Institutional Investors', value: 65.30, color: '#10b981' },
            { name: 'Retail Investors', value: 19.20, color: '#f59e0b' },
          ],
          floatHeldByInstitutions: 68.50,
          aiCommentary: `${ticker} shows strong institutional confidence with 65.3% institutional ownership, indicating professional investor trust. Healthy retail participation at 19.2% provides market liquidity.`,
          isMockData: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const result = data.quoteSummary?.result?.[0];
    
    if (!result) {
      throw new Error('Invalid ownership data');
    }

    const holders = result.majorHoldersBreakdown || {};
    const getValue = (val: any) => val?.raw !== undefined ? val.raw * 100 : 0;

    const insidersPercent = getValue(holders.insidersPercentHeld);
    const institutionsPercent = getValue(holders.institutionsPercentHeld);
    const floatPercent = getValue(holders.institutionsFloatPercentHeld);
    
    // Calculate estimated retail (remaining percentage)
    const retailPercent = Math.max(0, 100 - insidersPercent - institutionsPercent);

    // AI Commentary on ownership
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let aiCommentary = "Ownership analysis complete.";

    if (LOVABLE_API_KEY) {
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: `Generate 1 sentence insight for ${ticker}: Insiders: ${insidersPercent.toFixed(1)}%, Institutions: ${institutionsPercent.toFixed(1)}%, Retail: ${retailPercent.toFixed(1)}%. Focus on what this mix means for volatility or confidence.`
          }],
        }),
      });
      const aiData = await aiResponse.json();
      aiCommentary = aiData.choices?.[0]?.message?.content || aiCommentary;
    }

    const ownership = {
      ticker,
      shareholding: {
        insiders: parseFloat(insidersPercent.toFixed(2)),
        institutions: parseFloat(institutionsPercent.toFixed(2)),
        retail: parseFloat(retailPercent.toFixed(2)),
      },
      pieData: [
        { name: 'Insiders/Promoters', value: parseFloat(insidersPercent.toFixed(2)), color: '#3b82f6' },
        { name: 'Institutional Investors', value: parseFloat(institutionsPercent.toFixed(2)), color: '#10b981' },
        { name: 'Retail Investors', value: parseFloat(retailPercent.toFixed(2)), color: '#f59e0b' },
      ],
      floatHeldByInstitutions: parseFloat(floatPercent.toFixed(2)),
      aiCommentary,
    };

    return new Response(JSON.stringify(ownership), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in stock-ownership:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
