import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Technical indicator calculations
function calculateSMA(data: number[], period: number): number {
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function calculateEMA(data: number[], period: number): number {
  const k = 2 / (period + 1);
  let ema = data[0];
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateRSI(closes: number[], period = 14): number {
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd = ema12 - ema26;
  
  const macdLine: number[] = [];
  for (let i = 26; i < closes.length; i++) {
    const slice = closes.slice(0, i + 1);
    macdLine.push(calculateEMA(slice, 12) - calculateEMA(slice, 26));
  }
  
  const signal = calculateEMA(macdLine, 9);
  const histogram = macd - signal;
  
  return { macd, signal, histogram };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker } = await req.json();
    console.log('Analyzing stock:', ticker);

    // Fetch 6 months of historical data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    const period1 = Math.floor(startDate.getTime() / 1000);
    const period2 = Math.floor(endDate.getTime() / 1000);

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d`;
    const response = await fetch(yahooUrl);
    const data = await response.json();

    if (!data.chart?.result?.[0]) {
      throw new Error('Unable to fetch stock data');
    }

    const result = data.chart.result[0];
    const quotes = result.indicators.quote[0];
    const timestamps = result.timestamp;
    const meta = result.meta;
    
    const closes = quotes.close.filter((c: number | null) => c !== null);
    const highs = quotes.high.filter((h: number | null) => h !== null);
    const lows = quotes.low.filter((l: number | null) => l !== null);
    const volumes = quotes.volume.filter((v: number | null) => v !== null);
    const currentPrice = closes[closes.length - 1];

    // Calculate all technical indicators
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const rsi = calculateRSI(closes);
    const macd = calculateMACD(closes);
    
    // Price momentum
    const priceChange1d = ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]) * 100;
    const priceChange7d = ((closes[closes.length - 1] - closes[closes.length - 8]) / closes[closes.length - 8]) * 100;
    const priceChange30d = ((closes[closes.length - 1] - closes[closes.length - 30]) / closes[closes.length - 30]) * 100;
    
    // Volume analysis
    const avgVolume = calculateSMA(volumes, 20);
    const volumeChange = ((volumes[volumes.length - 1] / avgVolume - 1) * 100);

    // Prepare chart data (last 60 days)
    const chartData = timestamps.slice(-60).map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      price: quotes.close[closes.length - 60 + i],
      volume: quotes.volume[volumes.length - 60 + i],
      high: quotes.high[highs.length - 60 + i],
      low: quotes.low[lows.length - 60 + i],
    }));

    // Use Lovable AI for comprehensive analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert financial analyst. Analyze technical indicators and market sentiment to provide actionable insights. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: `Comprehensive analysis for ${ticker}:

PRICE DATA:
- Current: $${currentPrice.toFixed(2)}
- 1D Change: ${priceChange1d.toFixed(2)}%
- 7D Change: ${priceChange7d.toFixed(2)}%
- 30D Change: ${priceChange30d.toFixed(2)}%

TECHNICAL INDICATORS:
- SMA(20): $${sma20.toFixed(2)}
- SMA(50): $${sma50.toFixed(2)}
- EMA(12): $${ema12.toFixed(2)}
- EMA(26): $${ema26.toFixed(2)}
- RSI(14): ${rsi.toFixed(2)}
- MACD: ${macd.macd.toFixed(2)}
- MACD Signal: ${macd.signal.toFixed(2)}
- MACD Histogram: ${macd.histogram.toFixed(2)}

VOLUME:
- Current vs Avg: ${volumeChange.toFixed(2)}%

Provide JSON response:
{
  "prediction": <tomorrow's predicted price as number>,
  "confidence": <0-1 as number>,
  "sentiment": <"bullish"/"bearish"/"neutral">,
  "technicalAnalysis": "<2-3 sentence analysis of indicators>",
  "sentimentScore": <-1 to 1 as number, based on overall market sentiment>,
  "recommendation": "<buy/hold/sell with brief reasoning>",
  "keySignals": ["<signal1>", "<signal2>", "<signal3>"]
}`
          }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    const aiAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      prediction: currentPrice * 1.01,
      confidence: 0.5,
      sentiment: 'neutral',
      technicalAnalysis: 'Analysis unavailable',
      sentimentScore: 0,
      recommendation: 'Hold - insufficient data',
      keySignals: []
    };

    const resultData = {
      ticker,
      currentPrice,
      meta: {
        companyName: meta.longName || meta.shortName || ticker,
        currency: meta.currency || 'USD',
        exchange: meta.exchangeName || 'Unknown'
      },
      prediction: aiAnalysis.prediction,
      confidence: aiAnalysis.confidence,
      sentiment: aiAnalysis.sentiment,
      sentimentScore: aiAnalysis.sentimentScore,
      technicalAnalysis: aiAnalysis.technicalAnalysis,
      recommendation: aiAnalysis.recommendation,
      keySignals: aiAnalysis.keySignals,
      indicators: {
        sma20,
        sma50,
        ema12,
        ema26,
        rsi,
        macd: macd.macd,
        macdSignal: macd.signal,
        macdHistogram: macd.histogram,
      },
      priceChanges: {
        day1: priceChange1d,
        day7: priceChange7d,
        day30: priceChange30d,
      },
      volume: {
        current: volumes[volumes.length - 1],
        average: avgVolume,
        changePercent: volumeChange,
      },
      chartData,
    };

    console.log('Analysis complete for:', ticker);

    return new Response(JSON.stringify(resultData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in predict-stock function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
