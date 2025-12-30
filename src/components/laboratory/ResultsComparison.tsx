import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  GitCompare, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  Info
} from "lucide-react";
import { useLabResults } from "@/hooks/laboratory/useLabResults";
import { useLabTemplates } from "@/hooks/laboratory/useLabTemplates";
import { useHorses } from "@/hooks/useHorses";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ResultsComparison() {
  const [selectedHorseId, setSelectedHorseId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [comparisonMode, setComparisonMode] = useState<'historical' | 'side-by-side'>('historical');

  const { horses, loading: horsesLoading } = useHorses();
  const { templates, loading: templatesLoading } = useLabTemplates();
  const { results, loading: resultsLoading } = useLabResults();

  // Filter results for selected horse and template
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const matchesHorse = !selectedHorseId || r.sample?.horse?.id === selectedHorseId;
      const matchesTemplate = !selectedTemplateId || r.template_id === selectedTemplateId;
      return matchesHorse && matchesTemplate;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [results, selectedHorseId, selectedTemplateId]);

  // Get template fields for chart
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const templateFields = (selectedTemplate?.fields as Array<{ id: string; name: string; type: string }>) || [];
  const numericFields = templateFields.filter(f => f.type === 'number');
  const normalRanges = (selectedTemplate?.normal_ranges as Record<string, { min?: number; max?: number }>) || {};

  // Prepare chart data
  const chartData = useMemo(() => {
    return filteredResults.slice(0, 10).reverse().map(result => {
      const data = result.result_data as Record<string, number>;
      return {
        date: format(new Date(result.created_at), "MMM d"),
        fullDate: format(new Date(result.created_at), "MMM d, yyyy"),
        ...data,
      };
    });
  }, [filteredResults]);

  const loading = horsesLoading || templatesLoading || resultsLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Results Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Horse</label>
              <Select value={selectedHorseId} onValueChange={setSelectedHorseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select horse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Horses</SelectItem>
                  {horses.map((horse) => (
                    <SelectItem key={horse.id} value={horse.id}>
                      {horse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Test Type</label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select test type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {templates.filter(t => t.is_active).map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">View Mode</label>
              <Select value={comparisonMode} onValueChange={(v) => setComparisonMode(v as 'historical' | 'side-by-side')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="historical">Historical Trend</SelectItem>
                  <SelectItem value="side-by-side">Side by Side</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredResults.length === 0 ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No results found for the selected criteria. Try selecting a different horse or test type.
          </AlertDescription>
        </Alert>
      ) : comparisonMode === 'historical' ? (
        <>
          {/* Trend Chart */}
          {selectedTemplateId && numericFields.length > 0 && chartData.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trend Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      {numericFields.slice(0, 4).map((field, index) => (
                        <Line
                          key={field.id}
                          type="monotone"
                          dataKey={field.id}
                          name={field.name}
                          stroke={['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'][index]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historical Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historical Results ({filteredResults.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Horse</th>
                      <th className="text-left p-2">Test</th>
                      <th className="text-center p-2">Status</th>
                      <th className="text-center p-2">Flag</th>
                      {selectedTemplateId && numericFields.slice(0, 3).map(field => (
                        <th key={field.id} className="text-center p-2">{field.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredResults.slice(0, 20).map((result, index) => {
                      const prevResult = filteredResults[index + 1];
                      const resultData = result.result_data as Record<string, number>;
                      const prevData = prevResult?.result_data as Record<string, number>;

                      return (
                        <tr key={result.id} className="hover:bg-muted/50">
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span>{format(new Date(result.created_at), "MMM d, yyyy")}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            {result.sample?.horse?.name || 'Unknown'}
                          </td>
                          <td className="p-2">
                            {result.template?.name || 'Unknown'}
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant="outline" className="text-xs">
                              {result.status}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">
                            {result.flags && (
                              <Badge 
                                variant="outline"
                                className={`text-xs ${
                                  result.flags === 'critical' ? 'border-red-500 text-red-500' :
                                  result.flags === 'abnormal' ? 'border-orange-500 text-orange-500' :
                                  'border-green-500 text-green-500'
                                }`}
                              >
                                {result.flags}
                              </Badge>
                            )}
                          </td>
                          {selectedTemplateId && numericFields.slice(0, 3).map(field => {
                            const value = resultData?.[field.id];
                            const prevValue = prevData?.[field.id];
                            const range = normalRanges[field.id];
                            
                            let trend: 'up' | 'down' | 'same' | null = null;
                            if (value !== undefined && prevValue !== undefined) {
                              if (value > prevValue) trend = 'up';
                              else if (value < prevValue) trend = 'down';
                              else trend = 'same';
                            }

                            const isOutOfRange = range && value !== undefined && (
                              (range.min !== undefined && value < range.min) ||
                              (range.max !== undefined && value > range.max)
                            );

                            return (
                              <td key={field.id} className="p-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <span className={isOutOfRange ? 'text-red-600 font-medium' : ''}>
                                    {value !== undefined ? value : '-'}
                                  </span>
                                  {trend === 'up' && <TrendingUp className="h-3 w-3 text-red-500" />}
                                  {trend === 'down' && <TrendingDown className="h-3 w-3 text-blue-500" />}
                                  {trend === 'same' && <Minus className="h-3 w-3 text-muted-foreground" />}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Side by Side Comparison */
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Side by Side Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredResults.length < 2 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Need at least 2 results to compare side by side.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredResults.slice(0, 2).map((result, index) => (
                  <div key={result.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        {index === 0 ? "Latest" : "Previous"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(result.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="font-medium">{result.sample?.horse?.name}</p>
                      <p className="text-sm text-muted-foreground">{result.template?.name}</p>
                      
                      <div className="mt-4 space-y-2">
                        {templateFields.map(field => {
                          const value = (result.result_data as Record<string, unknown>)?.[field.id];
                          return (
                            <div key={field.id} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{field.name}</span>
                              <span className="font-mono">{value !== undefined ? String(value) : '-'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
