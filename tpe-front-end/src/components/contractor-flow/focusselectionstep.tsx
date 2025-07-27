
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Target, ArrowRight, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";

const focusAreaOptions = [
  {
    id: "greenfield_growth",
    title: "Greenfield Growth",
    description: "Expanding into new markets and territories",
    color: "bg-green-100 text-green-800 border-green-200"
  },
  {
    id: "closing_higher_percentage",
    title: "Closing Higher %",
    description: "Improving sales conversion rates",
    color: "bg-red-100 text-red-800 border-red-200"
  },
  {
    id: "controlling_lead_flow", 
    title: "Controlling Lead Flow",
    description: "Managing and optimizing lead generation",
    color: "bg-gray-100 text-gray-800 border-gray-200"
  },
  {
    id: "installation_quality",
    title: "Installation Quality", 
    description: "Enhancing service delivery standards",
    color: "bg-gray-100 text-gray-800 border-gray-200"
  },
  {
    id: "hiring_sales_leadership",
    title: "Hiring Sales/Leadership",
    description: "Building and scaling your team",
    color: "bg-gray-100 text-gray-800 border-gray-200"
  },
  {
    id: "marketing_automation",
    title: "Marketing Automation",
    description: "Streamlining marketing processes",
    color: "bg-gray-100 text-gray-800 border-gray-200"
  },
  {
    id: "customer_retention",
    title: "Customer Retention",
    description: "Building long-term client relationships", 
    color: "bg-gray-100 text-gray-800 border-gray-200"
  },
  {
    id: "operational_efficiency",
    title: "Operational Efficiency",
    description: "Optimizing internal processes",
    color: "bg-gray-100 text-gray-800 border-gray-200"
  },
  {
    id: "technology_integration",
    title: "Technology Integration", 
    description: "Implementing new tech solutions",
    color: "bg-gray-100 text-gray-800 border-gray-200"
  },
  {
    id: "financial_management",
    title: "Financial Management",
    description: "Improving cash flow and profitability",
    color: "bg-gray-100 text-gray-800 border-gray-200"
  }
];

export default function FocusSelectionStep({ data, onComplete, onBack }) {
  const [selectedAreas, setSelectedAreas] = useState(data.focus_areas || []);
  const [error, setError] = useState("");

  const toggleFocusArea = (areaId) => {
    setSelectedAreas(prev => {
      const newSelection = prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : prev.length < 3 
        ? [...prev, areaId]
        : prev;
      
      setError("");
      return newSelection;
    });
  };

  const handleContinue = () => {
    if (selectedAreas.length === 0) {
      setError("Please select at least one focus area");
      return;
    }
    
    if (selectedAreas.length > 3) {
      setError("Please select no more than 3 focus areas");
      return;
    }

    onComplete({
      focus_areas: selectedAreas,
      current_stage: "profiling"
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="bg-white/70 border-0 shadow-2xl">
        <CardHeader className="text-center pb-8">
          <div className="w-16 h-16 power100-red-gradient rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Target className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-black mb-3">
            What Are Your Top Focus Areas?
          </CardTitle>
          <p className="text-lg text-[var(--power100-grey)]">
            Select up to 3 areas where you want to grow your business over the next 12-18 months
          </p>
          
          {selectedAreas.length > 0 && (
            <div className="mt-4">
              <Badge variant="outline" className="text-[var(--power100-red)] border-red-300">
                {selectedAreas.length}/3 selected
              </Badge>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {focusAreaOptions.map((area, index) => (
              <motion.div
                key={area.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedAreas.includes(area.id)
                    ? 'border-[var(--power100-red)] bg-red-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => toggleFocusArea(area.id)}
              >
                <div className="flex items-start space-x-4">
                  <Checkbox
                    checked={selectedAreas.includes(area.id)}
                    onChange={() => toggleFocusArea(area.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-black">{area.title}</h3>
                      {selectedAreas.includes(area.id) && (
                        <Badge className={area.color}>Selected</Badge>
                      )}
                    </div>
                    <p className="text-sm text-[var(--power100-grey)]">{area.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {selectedAreas.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4"
            >
              <h4 className="font-semibold text-gray-800 mb-2">Your Selected Focus Areas:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedAreas.map(areaId => {
                  const area = focusAreaOptions.find(a => a.id === areaId);
                  return (
                    <Badge key={areaId} className={area.color}>
                      {area.title}
                    </Badge>
                  );
                })}
              </div>
            </motion.div>
          )}

          <div className="flex gap-4 pt-6">
            {onBack && (
              <Button
                variant="outline"
                onClick={onBack}
                className="flex-1 h-12 text-lg"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleContinue}
              disabled={selectedAreas.length === 0}
              className="flex-1 bg-[var(--power100-green)] hover:bg-[#009e54] transition-all duration-300 text-white shadow-lg h-12 text-lg font-semibold group"
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
