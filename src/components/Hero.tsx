import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import heroBg from "@/assets/hero-bg.jpg";
import aiSparkle from "@/assets/ai-sparkle.png";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      
      {/* Animated Lines */}
      <div className="absolute top-20 right-0 w-1/2 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-pulse" />
      <div className="absolute bottom-40 left-0 w-1/3 h-1 bg-gradient-to-r from-transparent via-secondary/50 to-transparent animate-pulse delay-1000" />
      
      {/* Sparkles */}
      <div className="absolute top-1/4 right-1/4 w-4 h-4 animate-pulse">
        <Sparkles className="w-full h-full text-primary" />
      </div>
      <div className="absolute bottom-1/3 right-1/3 w-4 h-4 animate-pulse delay-700">
        <Sparkles className="w-full h-full text-secondary" />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
              <TrendingUp className="w-3 h-3 mr-1" />
              Trusted by 50,000+ Traders
            </Badge>
            
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              Smart market forecasting{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                 designed to guide your next financial step
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-xl">
              Real-time predictions, personalized alerts, and data-driven decisions. 
              Join thousands of traders maximizing returns with AI.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button variant="hero" size="lg" className="gap-2">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="heroOutline" size="lg">
                See in Action
              </Button>
            </div>
          </div>
          
          {/* Right Content - Stats Card */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-[0_8px_40px_hsl(224_76%_48%/0.2)]">
              <div className="absolute inset-0 bg-gradient-to-br from-card/95 to-card/90 backdrop-blur-xl" />
              
              <div className="relative p-8 space-y-6">
                {/* Active Traders Stat */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Active Traders</p>
                    <h2 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      50K+
                    </h2>
                  </div>
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded-full border-2 border-card bg-gradient-to-br from-primary/30 to-secondary/30"
                      />
                    ))}
                  </div>
                </div>
                
                {/* AI Insights Card */}
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6 border border-primary/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <img src={aiSparkle} alt="AI" className="w-12 h-12" />
                    <span className="font-semibold">Powerful Insights</span>
                  </div>
                  <p className="text-foreground font-medium">Strong upward momentum detected</p>
                </div>
                
                {/* Chart Visualization */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Try Interactive Demo</p>
                  <div className="grid grid-cols-5 gap-2 items-end h-32">
                    {[60, 75, 70, 85, 95].map((height, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-t from-primary to-secondary rounded-t-lg transition-all duration-500 hover:scale-105"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
