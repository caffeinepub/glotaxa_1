import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CompliancePanelProps {
  vatRate: number;
  vatType: string;
  complianceScore: number;
  warnings: string[];
  isOSS: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 90) return "default";
  if (score >= 70) return "secondary";
  return "destructive";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Needs Attention";
}

export function CompliancePanel({
  vatRate,
  vatType,
  complianceScore,
  warnings,
  isOSS,
}: CompliancePanelProps) {
  return (
    <div className="space-y-4">
      {/* Transaction Result */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            Transaction Result
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center py-1.5 border-b border-border/50">
            <span className="text-sm text-muted-foreground">VAT Applied</span>
            <span className="font-semibold text-sm">{vatRate}%</span>
          </div>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-sm text-muted-foreground">VAT Type</span>
            <Badge variant={vatType === "OSS VAT" ? "default" : "secondary"} className="text-xs">
              {vatType}
            </Badge>
          </div>
          {isOSS && (
            <div className="mt-2 p-2 bg-primary/10 rounded-md text-xs text-primary font-medium">
              🌍 This transaction may require EU OSS VAT reporting.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Score */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Compliance Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-3xl font-bold ${getScoreColor(complianceScore)}`}>
              {complianceScore}
              <span className="text-lg text-muted-foreground font-normal"> / 100</span>
            </span>
            <Badge variant={getScoreBadgeVariant(complianceScore)}>
              {getScoreLabel(complianceScore)}
            </Badge>
          </div>
          <Progress
            value={complianceScore}
            className="h-2"
          />
        </CardContent>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              Warnings ({warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                  <span className="text-muted-foreground">{warning}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* All clear */}
      {warnings.length === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <AlertDescription className="text-sm text-emerald-700 dark:text-emerald-400">
            No compliance warnings detected for this transaction.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
