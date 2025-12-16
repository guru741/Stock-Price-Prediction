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
    console.log('Fetching news for:', ticker);

    // Fetch news from Yahoo Finance
    const newsUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${ticker}&quotesCount=0&newsCount=10`;
    const response = await fetch(newsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Unable to fetch news' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const newsItems = data.news || [];

    // Use Lovable AI for sentiment analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const processedNews = [];
    
    for (let i = 0; i < Math.min(newsItems.length, 8); i++) {
      const item = newsItems[i];
      let sentiment = 'neutral';
      let sentimentScore = 0;

      if (LOVABLE_API_KEY) {
        try {
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
                content: `Analyze sentiment of this headline (respond with only: positive, negative, or neutral): "${item.title}"`
              }],
            }),
          });
          
          const aiData = await aiResponse.json();
          const aiSentiment = aiData.choices?.[0]?.message?.content.toLowerCase() || 'neutral';
          
          if (aiSentiment.includes('positive')) {
            sentiment = 'positive';
            sentimentScore = 0.7;
          } else if (aiSentiment.includes('negative')) {
            sentiment = 'negative';
            sentimentScore = -0.7;
          } else {
            sentiment = 'neutral';
            sentimentScore = 0;
          }
        } catch (e) {
          console.error('Sentiment analysis error:', e);
        }
      }

      processedNews.push({
        date: new Date(item.providerPublishTime * 1000).toISOString().split('T')[0],
        headline: item.title,
        publisher: item.publisher,
        link: item.link,
        sentiment,
        sentimentScore,
      });
    }

    return new Response(JSON.stringify({ ticker, news: processedNews }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in stock-news:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
