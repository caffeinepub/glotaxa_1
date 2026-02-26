import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Transaction } from "@/pages/Transaction";
import { Invoice } from "@/pages/Invoice";
import { RegionSelect } from "@/pages/RegionSelect";
import { ApiDocs } from "@/pages/ApiDocs";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export interface LineItemEntry {
  description: string;
  netAmount: number | "";
  vatCategory: string;
}

const DEFAULT_LINE_ITEMS: LineItemEntry[] = [
  { description: "", netAmount: "", vatCategory: "Others" },
  { description: "", netAmount: "", vatCategory: "Others" },
  { description: "", netAmount: "", vatCategory: "Others" },
];

function App() {
  const [activeTab, setActiveTab] = useState("country");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [calculationData, setCalculationData] = useState<any>(null);
  const [lineItems, setLineItems] = useState<LineItemEntry[]>(DEFAULT_LINE_ITEMS);

  const handleSelectCountry = (country: string) => {
    setSelectedCountry(country);
    setActiveTab("transaction");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="country">Country</TabsTrigger>
            <TabsTrigger value="transaction">Transaction</TabsTrigger>
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
            <TabsTrigger value="api-docs">API Docs</TabsTrigger>
          </TabsList>

          <TabsContent value="country">
            <RegionSelect selectCountry={handleSelectCountry} />
          </TabsContent>

          <TabsContent value="transaction">
            <Transaction
              selectedCountry={selectedCountry}
              onCalculationChange={setCalculationData}
              lineItems={lineItems}
              setLineItems={setLineItems}
            />
          </TabsContent>

          <TabsContent value="invoice">
            <Invoice
              calculationData={calculationData}
              selectedCountry={selectedCountry}
              lineItems={lineItems}
            />
          </TabsContent>

          <TabsContent value="api-docs">
            <ApiDocs />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

export default App;
