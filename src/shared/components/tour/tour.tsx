import { useEffect, useState, useCallback } from 'react';
import { useTourStore } from '@/shared/store/tour-store';
import { Button } from '@/shared/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export function Tour() {
  const { isActive, currentStep, steps, next, prev, skip, complete } =
    useTourStore();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updateTargetRect = useCallback(() => {
    const step = steps[currentStep];
    if (!step) return;
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [steps, currentStep]);

  useEffect(() => {
    if (!isActive) return;
    updateTargetRect();
    const onResize = () => updateTargetRect();
    const onScroll = () => updateTargetRect();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    const t = setTimeout(updateTargetRect, 100);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
      clearTimeout(t);
    };
  }, [isActive, currentStep, updateTargetRect]);

  if (!isActive || !steps[currentStep]) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;
  const padding = 8;

  const handleNext = () => {
    if (isLast) complete();
    else next();
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div className="pointer-events-auto fixed inset-0">
        {targetRect ? (
          <>
            <div
              className="absolute left-0 top-0 right-0 bg-black/60"
              style={{ height: Math.max(0, targetRect.top - padding) }}
            />
            <div
              className="absolute left-0 right-0 bottom-0 bg-black/60"
              style={{
                top: targetRect.bottom + padding,
                height: Math.max(0, window.innerHeight - targetRect.bottom - padding),
              }}
            />
            <div
              className="absolute bg-black/60"
              style={{
                left: 0,
                top: targetRect.top - padding,
                width: Math.max(0, targetRect.left - padding),
                height: targetRect.height + padding * 2,
              }}
            />
            <div
              className="absolute bg-black/60"
              style={{
                right: 0,
                top: targetRect.top - padding,
                left: targetRect.right + padding,
                height: targetRect.height + padding * 2,
              }}
            />
            <div
              className="absolute pointer-events-none ring-4 ring-primary ring-offset-4 ring-offset-background rounded-lg transition-all duration-200"
              style={{
                left: targetRect.left - padding,
                top: targetRect.top - padding,
                width: targetRect.width + padding * 2,
                height: targetRect.height + padding * 2,
              }}
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-black/60" />
        )}
      </div>
      <div
        className="pointer-events-auto fixed left-1/2 w-full max-w-sm p-4 bg-card border rounded-lg shadow-lg z-[10000] mx-4"
        style={{
          top: targetRect
            ? Math.min(
                targetRect.bottom + 16,
                window.innerHeight - 200
              )
            : '50%',
          transform: targetRect
            ? 'translateX(-50%)'
            : 'translate(-50%, -50%)',
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-base">{step.title}</h3>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={skip}
            aria-label="Fechar tour"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{step.content}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} / {steps.length}
          </span>
          <div className="flex gap-2">
            {!isFirst && (
              <Button type="button" variant="outline" size="sm" onClick={prev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            )}
            <Button type="button" size="sm" onClick={handleNext}>
              {isLast ? (
                'Concluir'
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
