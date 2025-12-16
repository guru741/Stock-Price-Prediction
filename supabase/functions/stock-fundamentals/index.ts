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
    console.log('Fetching fundamentals score for:', ticker);

    const summaryUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=financialData,defaultKeyStatistics,summaryDetail`;
    const response = await fetch(summaryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.warn(`Yahoo Finance API error: ${response.status}`);
      // Return mock fundamental data
      const mockScore = 72;
      return new Response(
        JSON.stringify({ 
          ticker,
          aiScore: mockScore,
          scoreColor: 'green',
          metrics: {
            eps: '5.80',
            peRatio: '24.50',
            roe: '18.50',
            debtToEquity: '0.65',
            profitMargin: '17.30',
            dividendYield: '1.25',
            revenueGrowth: '12.50',
            earningsGrowth: '15.20',
          },
          radarData: [
            { metric: 'EPS Growth', value: 85 },
            { metric: 'P/E Health', value: 65 },
            { metric: 'ROE', value: 92 },
            { metric: 'Low Debt', value: 78 },
            { metric: 'Profit Margin', value: 86 },
            { metric: 'Div Yield', value: 45 },
          ],
          aiCommentary: `${ticker} demonstrates strong fundamentals with an AI score of ${mockScore}/100. The company shows robust ROE and healthy profit margins, indicating efficient capital allocation and strong operational performance.`,
          isMockData: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const result = data.quoteSummary?.result?.[0];
    
    if (!result) {
      throw new Error('Invalid data structure');
    }

    const financialData = result.financialData || {};
    const keyStats = result.defaultKeyStatistics || {};
    const summary = result.summaryDetail || {};

    const getValue = (val: any) => val?.raw !== undefined ? val.raw : val;

    // Calculate AI Fundamentals Score (0-100)
    const metrics = {
      eps: getValue(keyStats.trailingEps) || 0,
      peRatio: getValue(summary.trailingPE) || 0,
      roe: getValue(financialData.returnOnEquity) || 0,
      debtToEquity: getValue(financialData.debtToEquity) || 0,
      profitMargin: getValue(financialData.profitMargins) || 0,
      dividendYield: getValue(summary.dividendYield) || 0,
      revenueGrowth: getValue(financialData.revenueGrowth) || 0,
      earningsGrowth: getValue(financialData.earningsGrowth) || 0,
    };

    // Scoring logic (0-100)
    let score = 50; // Base score

    // EPS: positive is good
    if (metrics.eps > 0) score += 10;
    if (metrics.eps > 5) score += 5;

    // P/E Ratio: 15-25 is healthy
    if (metrics.peRatio > 0 && metrics.peRatio < 30) score += 10;
    if (metrics.peRatio >= 10 && metrics.peRatio <= 20) score += 5;

    // ROE: >15% is excellent
    if (metrics.roe > 0.15) score += 10;
    if (metrics.roe > 0.20) score += 5;

    // Debt to Equity: <1 is healthy
    if (metrics.debtToEquity < 1) score += 10;
    if (metrics.debtToEquity < 0.5) score += 5;

    // Profit Margin: >10% is good
    if (metrics.profitMargin > 0.10) score += 10;
    if (metrics.profitMargin > 0.20) score += 5;

    // Revenue Growth: positive is good
    if (metrics.revenueGrowth > 0) score += 5;
    if (metrics.revenueGrowth > 0.10) score += 5;

    // Earnings Growth: positive is good
    if (metrics.earningsGrowth > 0) score += 5;
    if (metrics.earningsGrowth > 0.15) score += 5;

    score = Math.min(Math.max(score, 0), 100);

    // Use Lovable AI for commentary
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let aiCommentary = "Fundamental analysis complete.";

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
            content: `Generate a brief 1-2 sentence insight for ${ticker} based on: AI Score: ${score}/100, ROE: ${(metrics.roe * 100).toFixed(1)}%, Profit Margin: ${(metrics.profitMargin * 100).toFixed(1)}%, P/E: ${metrics.peRatio.toFixed(1)}, Debt/Equity: ${metrics.debtToEquity.toFixed(2)}.`
          }],
        }),
      });
      const aiData = await aiResponse.json();
      aiCommentary = aiData.choices?.[0]?.message?.content || aiCommentary;
    }

    const fundamentals = {
      ticker,
      aiScore: Math.round(score),
      scoreColor: score >= 70 ? 'green' : score >= 50 ? 'yellow' : 'red',
      metrics: {
        eps: metrics.eps.toFixed(2),
        peRatio: metrics.peRatio.toFixed(2),
        roe: (metrics.roe * 100).toFixed(2),
        debtToEquity: metrics.debtToEquity.toFixed(2),
        profitMargin: (metrics.profitMargin * 100).toFixed(2),
        dividendYield: (metrics.dividendYield * 100).toFixed(2),
        revenueGrowth: (metrics.revenueGrowth * 100).toFixed(2),
        earningsGrowth: (metrics.earningsGrowth * 100).toFixed(2),
      },
      radarData: [
        { metric: 'EPS Growth', value: Math.min((metrics.eps / 10) * 100, 100) },
        { metric: 'P/E Health', value: metrics.peRatio > 0 ? Math.max(100 - metrics.peRatio * 2, 0) : 0 },
        { metric: 'ROE', value: metrics.roe * 500 },
        { metric: 'Low Debt', value: Math.max(100 - metrics.debtToEquity * 50, 0) },
        { metric: 'Profit Margin', value: metrics.profitMargin * 500 },
        { metric: 'Div Yield', value: metrics.dividendYield * 1000 },
      ],
      aiCommentary,
    };

    return new Response(JSON.stringify(fundamentals), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in stock-fundamentals:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
