import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export function ChartPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/25">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">
              Chart visualization will be displayed here
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Ready for data integration
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
