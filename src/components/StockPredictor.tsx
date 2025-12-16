import { useState, useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { TrendingUp, Search, Loader2, Sparkles, LineChart, Building2, Activity, Newspaper, Users, Brain, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, Bar, BarChart, ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from "recharts";
import { useCurrency, Currency } from "@/contexts/CurrencyContext";
import { formatPrice, convertPrice, getCurrencySymbol } from "@/utils/currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PredictionResult {
  ticker: string;
  currentPrice: number;
  meta: {
    companyName: string;
    currency: string;
    exchange: string;
  };
  prediction: number;
  confidence: number;
  sentiment: string;
  sentimentScore: number;
  technicalAnalysis: string;
  recommendation: string;
  keySignals: string[];
  indicators: {
    sma20: number;
    sma50: number;
    ema12: number;
    ema26: number;
    rsi: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
  };
  priceChanges: {
    day1: number;
    day7: number;
    day30: number;
  };
  volume: {
    current: number;
    average: number;
    changePercent: number;
  };
  chartData: Array<{
    date: string;
    price: number;
    volume: number;
    high: number;
    low: number;
  }>;
}

interface FinancialsResult {
  ticker: string;
  marketCap: string;
  marketCapRaw?: number;
  revenue: string;
  revenueRaw?: number;
  netIncome: string;
  netIncomeRaw?: number;
  profitMargin: string;
  peRatio: string;
  eps: string;
  epsRaw?: number;
  debtToEquity: string;
  currentRatio: string;
  operatingCashFlow: string;
  operatingCashFlowRaw?: number;
  freeCashFlow: string;
  freeCashFlowRaw?: number;
  revenueGrowth: string;
  earningsGrowth: string;
  targetPrice: string;
  targetPriceRaw?: number;
  recommendationKey: string;
  bookValue: string;
  bookValueRaw?: number;
  priceToBook: string;
  dividendYield: string;
  beta: string;
  earningsHistory: Array<{
    quarter: string;
    epsActual: string;
    epsActualRaw?: number;
    epsEstimate: string;
    epsEstimateRaw?: number;
    surprise: string;
  }>;
}

interface FundamentalsResult {
  ticker: string;
  aiScore: number;
  scoreColor: string;
  metrics: {
    eps: string;
    peRatio: string;
    roe: string;
    debtToEquity: string;
    profitMargin: string;
    dividendYield: string;
    revenueGrowth: string;
    earningsGrowth: string;
  };
  radarData: Array<{ metric: string; value: number }>;
  aiCommentary: string;
}

interface NewsItem {
  date: string;
  headline: string;
  publisher: string;
  link: string;
  sentiment: string;
  sentimentScore: number;
}

interface OwnershipResult {
  ticker: string;
  shareholding: {
    insiders: number;
    institutions: number;
    retail: number;
  };
  pieData: Array<{ name: string; value: number; color: string }>;
  floatHeldByInstitutions: number;
  aiCommentary: string;
}

const StockPredictor = () => {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [chartDays, setChartDays] = useState<number>(60);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [financials, setFinancials] = useState<FinancialsResult | null>(null);
  const [fundamentals, setFundamentals] = useState<FundamentalsResult | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [ownership, setOwnership] = useState<OwnershipResult | null>(null);
  const { toast } = useToast();
  const { currency } = useCurrency();

  const filteredChartData = useMemo(() => {
    if (!prediction?.chartData) return [];
    return prediction.chartData.slice(-chartDays);
  }, [prediction?.chartData, chartDays]);

  const formatLargePrice = (value: number, currency: Currency): string => {
    const converted = convertPrice(value, currency);
    const symbol = getCurrencySymbol(currency);
    
    if (converted >= 1e12) return `${symbol}${(converted / 1e12).toFixed(2)}T`;
    if (converted >= 1e9) return `${symbol}${(converted / 1e9).toFixed(2)}B`;
    if (converted >= 1e6) return `${symbol}${(converted / 1e6).toFixed(2)}M`;
    return `${symbol}${converted.toFixed(2)}`;
  };

  const handlePredict = async () => {
    if (!ticker.trim()) {
      toast({
        title: "Enter a ticker",
        description: "Please enter a stock ticker symbol (e.g., AAPL)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setPrediction(null);
    setFinancials(null);
    setFundamentals(null);
    setNews([]);
    setOwnership(null);

    try {
      // Fetch prediction and technical analysis
      const { data, error } = await supabase.functions.invoke("predict-stock", {
        body: { ticker: ticker.toUpperCase() },
      });

      if (error) throw error;

      setPrediction(data);
      
      // Fetch all data in parallel
      setLoadingFinancials(true);
      
      const [finResult, fundResult, newsResult, ownerResult] = await Promise.allSettled([
        supabase.functions.invoke("company-financials", { body: { ticker: ticker.toUpperCase() } }),
        supabase.functions.invoke("stock-fundamentals", { body: { ticker: ticker.toUpperCase() } }),
        supabase.functions.invoke("stock-news", { body: { ticker: ticker.toUpperCase() } }),
        supabase.functions.invoke("stock-ownership", { body: { ticker: ticker.toUpperCase() } }),
      ]);

      if (finResult.status === 'fulfilled' && finResult.value.data && !finResult.value.data.error) {
        setFinancials(finResult.value.data);
      }
      
      if (fundResult.status === 'fulfilled' && fundResult.value.data && !fundResult.value.data.error) {
        setFundamentals(fundResult.value.data);
      }
      
      if (newsResult.status === 'fulfilled' && newsResult.value.data && !newsResult.value.data.error) {
        setNews(newsResult.value.data.news || []);
      }
      
      if (ownerResult.status === 'fulfilled' && ownerResult.value.data && !ownerResult.value.data.error) {
        setOwnership(ownerResult.value.data);
      }

      toast({
        title: "Analysis complete",
        description: `Comprehensive Stock analysis for ${ticker.toUpperCase()} is ready`,
      });
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to generate analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingFinancials(false);
    }
  };

  return (
    <section id="predictions" className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold">
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Stock Price Predictions
              </span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Enter any stock ticker to see real-time analysis and Stock Price Predictions
            </p>
          </div>

          <Card className="p-8 shadow-[0_8px_40px_hsl(224_76%_48%/0.1)]">
            <div className="flex gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Enter stock ticker (e.g., AAPL, TSLA, GOOGL)"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handlePredict()}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <Button
                variant="hero"
                size="lg"
                onClick={handlePredict}
                disabled={loading}
                className="px-8"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Predict
                  </>
                )}
              </Button>
            </div>

            {prediction && (
              <Tabs defaultValue="overview" className="space-y-6 animate-in fade-in duration-500">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="overview"><Sparkles className="w-4 h-4 mr-2" />Overview</TabsTrigger>
                  <TabsTrigger value="technical"><Activity className="w-4 h-4 mr-2" />Technical</TabsTrigger>
                  <TabsTrigger value="charts"><LineChart className="w-4 h-4 mr-2" />Charts</TabsTrigger>
                  <TabsTrigger value="financials"><Building2 className="w-4 h-4 mr-2" />Financials</TabsTrigger>
                  <TabsTrigger value="fundamentals"><Brain className="w-4 h-4 mr-2" />AI Score</TabsTrigger>
                  <TabsTrigger value="news"><Newspaper className="w-4 h-4 mr-2" />News</TabsTrigger>
                  <TabsTrigger value="ownership"><Users className="w-4 h-4 mr-2" />Ownership</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
                      <p className="text-sm text-muted-foreground mb-2">Current Price</p>
                      <p className="text-3xl font-bold text-primary">
                        {formatPrice(prediction.currentPrice, currency)}
                      </p>
                      <p className={`text-sm mt-2 ${prediction.priceChanges.day1 >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {prediction.priceChanges.day1 >= 0 ? '↑' : '↓'} {Math.abs(prediction.priceChanges.day1).toFixed(2)}% today
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-xl p-6 border border-secondary/20">
                      <p className="text-sm text-muted-foreground mb-2">Predicted Price</p>
                      <p className="text-3xl font-bold text-secondary">
                        {formatPrice(prediction.prediction, currency)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {((prediction.prediction - prediction.currentPrice) / prediction.currentPrice * 100).toFixed(2)}% change
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl p-6 border border-accent/20">
                      <p className="text-sm text-muted-foreground mb-2">Confidence</p>
                      <p className="text-3xl font-bold text-accent">
                        {(prediction.confidence * 100).toFixed(0)}%
                      </p>
                      <p className="text-sm text-muted-foreground mt-2 capitalize">
                        {prediction.sentiment} sentiment
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl p-6 border border-purple-500/20">
                      <p className="text-sm text-muted-foreground mb-2">Sentiment Score</p>
                      <p className="text-3xl font-bold text-purple-500">
                        {(prediction.sentimentScore * 100).toFixed(0)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Market sentiment
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">Technical Analysis</h4>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                          {prediction.technicalAnalysis}
                        </p>
                        <div className="bg-background/50 rounded-lg p-4">
                          <p className="font-semibold mb-2">Recommendation: {prediction.recommendation}</p>
                          {prediction.keySignals.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm text-muted-foreground mb-2">Key Signals:</p>
                              <ul className="space-y-1">
                                {prediction.keySignals.map((signal, i) => (
                                  <li key={i} className="text-sm flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    <span>{signal}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground mb-2">7-Day Change</p>
                      <p className={`text-2xl font-bold ${prediction.priceChanges.day7 >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {prediction.priceChanges.day7 >= 0 ? '+' : ''}{prediction.priceChanges.day7.toFixed(2)}%
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground mb-2">30-Day Change</p>
                      <p className={`text-2xl font-bold ${prediction.priceChanges.day30 >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {prediction.priceChanges.day30 >= 0 ? '+' : ''}{prediction.priceChanges.day30.toFixed(2)}%
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground mb-2">Volume vs Avg</p>
                      <p className={`text-2xl font-bold ${prediction.volume.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {prediction.volume.changePercent >= 0 ? '+' : ''}{prediction.volume.changePercent.toFixed(2)}%
                      </p>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="technical" className="space-y-6">
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground mb-2">RSI (14)</p>
                      <p className="text-2xl font-bold">{prediction.indicators.rsi.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {prediction.indicators.rsi > 70 ? 'Overbought' : prediction.indicators.rsi < 30 ? 'Oversold' : 'Neutral'}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground mb-2">MACD</p>
                      <p className="text-2xl font-bold">{prediction.indicators.macd.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Signal: {prediction.indicators.macdSignal.toFixed(2)}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground mb-2">SMA (20)</p>
                      <p className="text-2xl font-bold">{formatPrice(prediction.indicators.sma20, currency)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {prediction.currentPrice > prediction.indicators.sma20 ? 'Above' : 'Below'} price
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground mb-2">SMA (50)</p>
                      <p className="text-2xl font-bold">{formatPrice(prediction.indicators.sma50, currency)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {prediction.currentPrice > prediction.indicators.sma50 ? 'Above' : 'Below'} price
                      </p>
                    </Card>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground mb-2">EMA (12)</p>
                      <p className="text-2xl font-bold">${prediction.indicators.ema12.toFixed(2)}</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground mb-2">EMA (26)</p>
                      <p className="text-2xl font-bold">${prediction.indicators.ema26.toFixed(2)}</p>
                    </Card>
                  </div>

                  <Card className="p-6">
                    <h4 className="font-semibold mb-4">MACD Histogram</h4>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${prediction.indicators.macdHistogram >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(Math.abs(prediction.indicators.macdHistogram) * 10, 100)}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {prediction.indicators.macdHistogram.toFixed(4)} - {prediction.indicators.macdHistogram >= 0 ? 'Bullish momentum' : 'Bearish momentum'}
                    </p>
                  </Card>
                </TabsContent>

                <TabsContent value="charts" className="space-y-6">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Price Chart</h4>
                      <Select value={chartDays.toString()} onValueChange={(val) => setChartDays(Number(val))}>
                        <SelectTrigger className="w-[140px] h-9">
                          <Calendar className="w-4 h-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="20">20 Days</SelectItem>
                          <SelectItem value="30">30 Days</SelectItem>
                          <SelectItem value="60">60 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={filteredChartData}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))' 
                          }} 
                        />
                        <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorPrice)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card className="p-6">
                    <h4 className="font-semibold mb-4">Volume Analysis</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={filteredChartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))' 
                          }} 
                        />
                        <Bar dataKey="volume" fill="hsl(var(--secondary))" opacity={0.7} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card className="p-6">
                    <h4 className="font-semibold mb-4">Price Range (High/Low)</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={filteredChartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))' 
                          }} 
                        />
                        <Line type="monotone" dataKey="high" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="low" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                        <Legend />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Card>
                </TabsContent>

                <TabsContent value="financials" className="space-y-6">
                  {loadingFinancials ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                      <p className="text-muted-foreground">Loading financial data...</p>
                    </div>
                  ) : financials && (financials as any).unavailable ? (
                    <Card className="p-12 text-center border-yellow-500/20 bg-yellow-500/5">
                      <Building2 className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
                      <h4 className="font-semibold mb-2 text-yellow-600">Financial Data Unavailable</h4>
                      <p className="text-muted-foreground text-sm mb-4">
                        {(financials as any).error || 'Unable to fetch company financials at this time'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Technical and price predictions are still available in other tabs
                      </p>
                    </Card>
                  ) : financials ? (
                    <>
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">Market Cap</p>
                          <p className="text-2xl font-bold">
                            {financials.marketCapRaw ? formatLargePrice(financials.marketCapRaw, currency) : financials.marketCap}
                          </p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">Revenue (TTM)</p>
                          <p className="text-2xl font-bold">
                            {financials.revenueRaw ? formatLargePrice(financials.revenueRaw, currency) : financials.revenue}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Growth: {financials.revenueGrowth}</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">P/E Ratio</p>
                          <p className="text-2xl font-bold">{financials.peRatio}</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">EPS</p>
                          <p className="text-2xl font-bold">
                            {financials.epsRaw ? formatPrice(financials.epsRaw, currency) : financials.eps}
                          </p>
                        </Card>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">Profit Margin</p>
                          <p className="text-xl font-bold">{financials.profitMargin}</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">Debt to Equity</p>
                          <p className="text-xl font-bold">{financials.debtToEquity}</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">Current Ratio</p>
                          <p className="text-xl font-bold">{financials.currentRatio}</p>
                        </Card>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">Operating Cash Flow</p>
                          <p className="text-xl font-bold">
                            {financials.operatingCashFlowRaw ? formatLargePrice(financials.operatingCashFlowRaw, currency) : financials.operatingCashFlow}
                          </p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">Free Cash Flow</p>
                          <p className="text-xl font-bold">
                            {financials.freeCashFlowRaw ? formatLargePrice(financials.freeCashFlowRaw, currency) : financials.freeCashFlow}
                          </p>
                        </Card>
                      </div>

                      <Card className="p-6">
                        <h4 className="font-semibold mb-4">Recent Earnings History</h4>
                        <div className="space-y-4">
                          {financials.earningsHistory.map((earning, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                              <div>
                                <p className="font-medium">{earning.quarter}</p>
                                <p className="text-sm text-muted-foreground">
                                  Actual: {earning.epsActualRaw ? formatPrice(earning.epsActualRaw, currency) : earning.epsActual} | 
                                  Est: {earning.epsEstimateRaw ? formatPrice(earning.epsEstimateRaw, currency) : earning.epsEstimate}
                                </p>
                              </div>
                              <div className={`text-right ${earning.surprise.startsWith('-') ? 'text-red-500' : 'text-green-500'}`}>
                                <p className="font-bold">{earning.surprise}</p>
                                <p className="text-xs">Surprise</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>

                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">Target Price</p>
                          <p className="text-xl font-bold">
                            {financials.targetPriceRaw ? formatPrice(financials.targetPriceRaw, currency) : `$${financials.targetPrice}`}
                          </p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">Recommendation</p>
                          <p className="text-xl font-bold capitalize">{financials.recommendationKey}</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">Beta</p>
                          <p className="text-xl font-bold">{financials.beta}</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">Dividend Yield</p>
                          <p className="text-xl font-bold">{financials.dividendYield}</p>
                        </Card>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Financial data unavailable</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="fundamentals" className="space-y-6">
                  {loadingFinancials ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                      <p className="text-muted-foreground">Calculating AI fundamentals score...</p>
                    </div>
                  ) : fundamentals ? (
                    <>
                      <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-secondary/5">
                        <h3 className="text-sm text-muted-foreground mb-2">AI Fundamentals Score</h3>
                        <div className={`text-6xl font-bold mb-4 ${
                          fundamentals.scoreColor === 'green' ? 'text-green-500' : 
                          fundamentals.scoreColor === 'yellow' ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {fundamentals.aiScore}/100
                        </div>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                          {fundamentals.aiCommentary}
                        </p>
                      </Card>

                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">EPS</p>
                          <p className="text-2xl font-bold">{fundamentals.metrics.eps}</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">P/E Ratio</p>
                          <p className="text-2xl font-bold">{fundamentals.metrics.peRatio}</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">ROE</p>
                          <p className="text-2xl font-bold">{fundamentals.metrics.roe}%</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">Debt/Equity</p>
                          <p className="text-2xl font-bold">{fundamentals.metrics.debtToEquity}</p>
                        </Card>
                      </div>

                      <Card className="p-6">
                        <h4 className="font-semibold mb-4">Fundamental Metrics Radar</h4>
                        <ResponsiveContainer width="100%" height={400}>
                          <RadarChart data={fundamentals.radarData}>
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </Card>

                      <div className="grid md:grid-cols-2 gap-4">
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">Profit Margin</p>
                          <p className="text-xl font-bold">{fundamentals.metrics.profitMargin}%</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">Dividend Yield</p>
                          <p className="text-xl font-bold">{fundamentals.metrics.dividendYield}%</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">Revenue Growth</p>
                          <p className="text-xl font-bold">{fundamentals.metrics.revenueGrowth}%</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">Earnings Growth</p>
                          <p className="text-xl font-bold">{fundamentals.metrics.earningsGrowth}%</p>
                        </Card>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Fundamentals analysis unavailable</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="news" className="space-y-6">
                  {loadingFinancials ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                      <p className="text-muted-foreground">Fetching latest news...</p>
                    </div>
                  ) : news.length > 0 ? (
                    <div className="space-y-4">
                      {news.map((item, i) => (
                        <Card key={i} className="p-6 hover:shadow-lg transition-shadow">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  item.sentiment === 'positive' ? 'bg-green-500/10 text-green-500' :
                                  item.sentiment === 'negative' ? 'bg-red-500/10 text-red-500' :
                                  'bg-gray-500/10 text-gray-500'
                                }`}>
                                  {item.sentiment}
                                </span>
                                <span className="text-xs text-muted-foreground">{item.publisher}</span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">{item.date}</span>
                              </div>
                              <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                <h4 className="font-semibold mb-2 text-foreground">{item.headline}</h4>
                              </a>
                            </div>
                            <Newspaper className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No recent news available</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="ownership" className="space-y-6">
                  {loadingFinancials ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                      <p className="text-muted-foreground">Analyzing ownership structure...</p>
                    </div>
                  ) : ownership ? (
                    <>
                      <Card className="p-6">
                        <h4 className="font-semibold mb-4 text-center">Shareholding Pattern</h4>
                        <ResponsiveContainer width="100%" height={400}>
                          <PieChart>
                            <Pie
                              data={ownership.pieData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value }) => `${name}: ${value}%`}
                              outerRadius={120}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {ownership.pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </Card>

                      <div className="grid md:grid-cols-3 gap-4">
                        <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                          <p className="text-sm text-muted-foreground mb-2">Insiders/Promoters</p>
                          <p className="text-3xl font-bold text-blue-500">{ownership.shareholding.insiders}%</p>
                        </Card>
                        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-500/5">
                          <p className="text-sm text-muted-foreground mb-2">Institutional Investors</p>
                          <p className="text-3xl font-bold text-green-500">{ownership.shareholding.institutions}%</p>
                        </Card>
                        <Card className="p-6 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
                          <p className="text-sm text-muted-foreground mb-2">Retail Investors</p>
                          <p className="text-3xl font-bold text-yellow-500">{ownership.shareholding.retail}%</p>
                        </Card>
                      </div>

                      <Card className="p-6 bg-muted/30">
                        <div className="flex items-start gap-3">
                          <Users className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                          <div>
                            <h4 className="font-semibold mb-2">Ownership Analysis</h4>
                            <p className="text-muted-foreground">{ownership.aiCommentary}</p>
                            <p className="text-sm text-muted-foreground mt-3">
                              Float held by institutions: {ownership.floatHeldByInstitutions}%
                            </p>
                          </div>
                        </div>
                      </Card>
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Ownership data unavailable</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}

            {!prediction && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Enter a stock ticker above to see Stock Predictions</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
};

export default StockPredictor;
