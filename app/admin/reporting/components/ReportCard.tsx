import React, { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ReportCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  onExport?: () => void;
  canExport?: boolean;
}

export function ReportCard({ 
  title, 
  description, 
  children, 
  onExport, 
  canExport = true 
}: ReportCardProps) {
  return (
    <Card className="w-full shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl text-primary font-bold">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {onExport && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onExport}
            disabled={!canExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportieren
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
