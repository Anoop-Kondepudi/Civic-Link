import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tableData = [
  {
    id: "LOC-001",
    name: "San Francisco",
    status: "active",
    users: 124,
    lastUpdate: "2 min ago",
  },
  {
    id: "LOC-002",
    name: "New York",
    status: "active",
    users: 89,
    lastUpdate: "5 min ago",
  },
  {
    id: "LOC-003",
    name: "London",
    status: "inactive",
    users: 56,
    lastUpdate: "1 hour ago",
  },
  {
    id: "LOC-004",
    name: "Tokyo",
    status: "active",
    users: 234,
    lastUpdate: "3 min ago",
  },
  {
    id: "LOC-005",
    name: "Sydney",
    status: "active",
    users: 67,
    lastUpdate: "10 min ago",
  },
];

export function DataTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Locations</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Last Update</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.id}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>
                  <Badge
                    variant={row.status === "active" ? "default" : "secondary"}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell>{row.users}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.lastUpdate}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
