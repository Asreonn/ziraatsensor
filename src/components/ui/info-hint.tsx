import { CircleHelp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface InfoHintProps {
  label: string;
}

export function InfoHint({ label }: InfoHintProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/80 bg-white/75 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={label}
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-56 rounded-xl border-border/80 bg-card/95 text-xs leading-5 text-muted-foreground">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
