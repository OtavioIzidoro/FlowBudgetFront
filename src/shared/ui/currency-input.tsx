import * as React from 'react';
import { formatCurrencyInput } from '@/shared/lib/format';
import { Input } from '@/shared/ui/input';

interface CurrencyInputProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Input>, 'defaultValue' | 'onChange' | 'type' | 'value'> {
  value?: string;
  onValueChange: (value: string) => void;
  emptyWhenZero?: boolean;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ emptyWhenZero = true, onValueChange, value = '', ...props }, ref) => {
    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(event) => onValueChange(formatCurrencyInput(event.target.value, { emptyWhenZero }))}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
