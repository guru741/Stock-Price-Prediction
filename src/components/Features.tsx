import { Brain, LineChart, Bell, Shield } from "lucide-react";
import { Card } from "./ui/card";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description: "Advanced machine learning models analyze market patterns and predict price movements with high accuracy.",
  },
  {
    icon: LineChart,
    title: "Real-Time Predictions",
    description: "Get instant stock predictions powered by live market data and sentiment analysis.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description: "Receive personalized notifications when AI detects significant trading opportunities.",
  },
  {
    icon: Shield,
    title: "Data-Driven Decisions",
    description: "Make informed trading decisions backed by comprehensive data analysis and AI insights.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl font-bold">
            Powerful{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AI Features
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Advanced technology that helps you make smarter trading decisions
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-6 hover:shadow-[0_8px_40px_hsl(224_76%_48%/0.15)] transition-all duration-300 hover:-translate-y-1 border-border/50"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
