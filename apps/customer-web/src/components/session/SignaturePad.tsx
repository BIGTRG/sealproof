'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface SignaturePadProps {
  signerName: string;
  onSign: (sig: { signaturePng?: string; typedName?: string }) => Promise<void> | void;
  disabled?: boolean;
}

/**
 * In-session signature capture: draw with mouse/touch, or type the legal name.
 * Emits a PNG data URL (drawn) or the typed name; the server stamps it on the PDF.
 */
export function SignaturePad({ signerName, onSign, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [hasInk, setHasInk] = useState(false);
  const [typed, setTyped] = useState(signerName);
  const [busy, setBusy] = useState(false);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    const ctx = c.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0F1B2D';
  }, [mode]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    drawing.current = true;
    last.current = pos(e);
    canvasRef.current!.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setHasInk(true);
  };
  const end = () => { drawing.current = false; last.current = null; };

  const clear = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext('2d')!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    setHasInk(false);
  };

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === 'draw') {
        // Export on a white background so the stamp is legible on any page
        const c = canvasRef.current!;
        const out = document.createElement('canvas');
        out.width = c.width; out.height = c.height;
        const octx = out.getContext('2d')!;
        octx.fillStyle = '#FFFFFF';
        octx.fillRect(0, 0, out.width, out.height);
        octx.drawImage(c, 0, 0);
        await onSign({ signaturePng: out.toDataURL('image/png') });
      } else {
        await onSign({ typedName: typed.trim() });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1 mb-3 text-xs">
        <button onClick={() => setMode('draw')} className={`px-3 py-1.5 rounded-full border ${mode === 'draw' ? 'bg-navy-700 text-white border-navy-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Draw</button>
        <button onClick={() => setMode('type')} className={`px-3 py-1.5 rounded-full border ${mode === 'type' ? 'bg-navy-700 text-white border-navy-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Type</button>
      </div>

      {mode === 'draw' ? (
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-36 rounded-lg border border-dashed border-gray-300 bg-white touch-none cursor-crosshair"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
          />
          {!hasInk && <span className="pointer-events-none absolute left-4 bottom-3 text-xs text-gray-300">Sign here</span>}
          <div className="pointer-events-none absolute left-4 right-4 bottom-8 border-b border-gray-200" />
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="w-full border-b border-gray-300 pb-1 text-3xl font-script text-navy-700 focus:outline-none"
          />
          <p className="mt-2 text-[11px] text-gray-400">Typing your name adopts it as your electronic signature.</p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        {mode === 'draw' ? (
          <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
        ) : <span />}
        <Button
          variant="gold"
          size="sm"
          onClick={submit}
          loading={busy}
          disabled={disabled || (mode === 'draw' ? !hasInk : typed.trim().length < 2)}
        >
          Apply Signature
        </Button>
      </div>
    </div>
  );
}
