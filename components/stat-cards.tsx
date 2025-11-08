import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, HardHat, ShieldAlert, Clock } from "lucide-react";
import crimeData from "@/docs/crime.json";
import constructionData from "@/docs/construction.json";

// Calculate metrics from JSON data
const totalReports = crimeData.reports.length + constructionData.reports.length;
const constructionReports = constructionData.reports.length;
const crimeReports = crimeData.reports.length;

// Calculate reports today (2025-11-08)
const today = "2025-11-08";
const reportsToday = [...crimeData.reports, ...constructionData.reports].filter(
  (report) => report.timestamp.startsWith(today)
).length;

const stats = [
  {
    title: "Total Reports",
    value: totalReports.toString(),
    icon: FileText,
    trend: `${crimeReports} crime, ${constructionReports} construction`,
    trendUp: true,
  },
  {
    title: "Construction Reports",
    value: constructionReports.toString(),
    icon: HardHat,
    trend: `${Math.round((constructionReports / totalReports) * 100)}% of total`,
    trendUp: true,
  },
  {
    title: "Crime Reports",
    value: crimeReports.toString(),
    icon: ShieldAlert,
    trend: `${Math.round((crimeReports / totalReports) * 100)}% of total`,
    trendUp: false,
  },
  {
    title: "Reports Today",
    value: reportsToday.toString(),
    icon: Clock,
    trend: "Active reporting",
    trendUp: true,
  },
];

export function StatCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className={stat.trendUp ? "text-green-600" : "text-red-600"}>
                  {stat.trend}
                </span>
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
