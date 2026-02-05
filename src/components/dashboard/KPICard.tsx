import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  tooltip?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'accent' | 'warning' | 'negative';
  onClick?: () => void;
}
export function KPICard({
  title,
  value,
  icon: Icon,
  subtitle,
  tooltip,
  trend,
  variant = 'default',
  onClick
}: KPICardProps) {
  const CardWrapper = onClick ? 'button' : 'div';
  const content = <CardWrapper onClick={onClick} className={cn("kpi-card text-left w-full mx-0 shadow-md", variant === 'accent' && "kpi-card-accent", variant === 'warning' && "border-warning/30 bg-warning/5", variant === 'negative' && "border-destructive/30 bg-destructive/5", onClick && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]")}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={cn("kpi-value", variant === 'negative' && "text-destructive")}>
            {value}
          </p>
          <p className="kpi-label">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {trend && <div className={cn("flex items-center gap-1 mt-2 text-sm font-medium", trend.isPositive ? "text-success" : "text-destructive")}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-normal">vs last week</span>
            </div>}
        </div>
        <div className={cn("flex items-center justify-center w-12 h-12 rounded-lg", variant === 'accent' ? "bg-accent text-accent-foreground" : variant === 'warning' ? "bg-warning/20 text-warning" : variant === 'negative' ? "bg-destructive/20 text-destructive" : "bg-primary/10 text-primary")}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </CardWrapper>;
  if (tooltip) {
    return <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>;
  }
  return content;
}