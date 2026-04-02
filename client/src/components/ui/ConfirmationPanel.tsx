import React from 'react';
import { CheckCircle2, AlertCircle, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ConfirmationField {
  label: string;
  value: string | React.ReactNode;
  highlight?: boolean;
}

export interface ConfirmationSection {
  title: string;
  icon?: React.ReactNode;
  fields: ConfirmationField[];
  onEdit?: () => void;
}

interface ConfirmationPanelProps {
  sections: ConfirmationSection[];
  title?: string;
  description?: string;
  status?: 'review' | 'success' | 'error';
  statusMessage?: string;
  className?: string;
}

export function ConfirmationPanel({
  sections,
  title = 'Review Your Information',
  description = 'Please review your details before submitting.',
  status = 'review',
  statusMessage,
  className = '',
}: ConfirmationPanelProps) {
  return (
    <div className={`space-y-4 ${className}`} data-testid="confirmation-panel">
      <div className="flex items-start gap-3">
        {status === 'success' && (
          <CheckCircle2 className="w-6 h-6 text-green-500 mt-0.5 shrink-0" />
        )}
        {status === 'error' && (
          <AlertCircle className="w-6 h-6 text-red-500 mt-0.5 shrink-0" />
        )}
        <div>
          <h3 className="font-semibold text-base text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {statusMessage || description}
          </p>
        </div>
      </div>

      {sections.map((section, sIdx) => (
        <div
          key={sIdx}
          className="rounded-xl border border-border bg-card/50 overflow-hidden"
          data-testid={`confirmation-section-${sIdx}`}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              {section.icon && (
                <span className="text-primary">{section.icon}</span>
              )}
              <span className="text-sm font-semibold text-foreground">{section.title}</span>
            </div>
            {section.onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={section.onEdit}
                className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary/80"
                data-testid={`button-edit-section-${sIdx}`}
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </Button>
            )}
          </div>
          <div className="px-4 py-3">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {section.fields.map((field, fIdx) => (
                <div key={fIdx} data-testid={`confirmation-field-${sIdx}-${fIdx}`}>
                  <dt className="text-xs text-muted-foreground">{field.label}</dt>
                  <dd
                    className={`text-sm font-medium mt-0.5 ${
                      field.highlight ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {field.value || <span className="text-muted-foreground italic">Not provided</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ConfirmationPanel;
