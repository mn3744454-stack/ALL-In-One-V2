import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Horse {
  id: string;
  name: string;
  name_ar?: string | null;
  gender: string;
  status?: string | null;
  breed?: string | null;
  color?: string | null;
  birth_date?: string | null;
  microchip_number?: string | null;
  passport_number?: string | null;
}

interface HorseExportProps {
  horses: Horse[];
}

export const HorseExport = ({ horses }: HorseExportProps) => {
  const exportToCSV = () => {
    if (horses.length === 0) {
      toast({
        title: "No data to export",
        description: "Add some horses first to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Name",
      "Name (Arabic)",
      "Gender",
      "Status",
      "Breed",
      "Color",
      "Birth Date",
      "Microchip",
      "Passport",
    ];

    const rows = horses.map((horse) => [
      horse.name,
      horse.name_ar || "",
      horse.gender,
      horse.status || "",
      horse.breed || "",
      horse.color || "",
      horse.birth_date || "",
      horse.microchip_number || "",
      horse.passport_number || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `horses_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Exported ${horses.length} horses to CSV.`,
    });
  };

  const exportToExcel = () => {
    // For Excel, we'll use the same CSV approach but with .xls extension
    // This will open in Excel as a CSV
    if (horses.length === 0) {
      toast({
        title: "No data to export",
        description: "Add some horses first to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Name",
      "Name (Arabic)",
      "Gender",
      "Status",
      "Breed",
      "Color",
      "Birth Date",
      "Microchip",
      "Passport",
    ];

    const rows = horses.map((horse) => [
      horse.name,
      horse.name_ar || "",
      horse.gender,
      horse.status || "",
      horse.breed || "",
      horse.color || "",
      horse.birth_date || "",
      horse.microchip_number || "",
      horse.passport_number || "",
    ]);

    // Tab-separated for better Excel compatibility
    const content = [
      headers.join("\t"),
      ...rows.map((row) => row.join("\t")),
    ].join("\n");

    const blob = new Blob([content], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `horses_${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Exported ${horses.length} horses to Excel.`,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV} className="gap-2">
          <FileText className="w-4 h-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel} className="gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
