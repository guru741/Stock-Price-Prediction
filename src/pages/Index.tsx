import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import StockPredictor from "@/components/StockPredictor";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <StockPredictor />
    </div>
  );
};

export default Index;
