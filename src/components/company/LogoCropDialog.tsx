'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { detectContentBBox, loadImage } from '@/lib/image-trim';
import { LOGO_EXPORT_MAX_DIMENSION } from '@/lib/logo-constraints';
import { Maximize2, RotateCcw, RotateCw, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const VIEWPORT_WIDTH = 320;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DEFAULT_ZOOM = 1.15;

type AspectPreset = 'square' | 'wide' | 'original';

interface CropState {
    rotation: number; // degrees, any value — UI only offers 90-degree steps
    zoom: number;
    panX: number;
    panY: number;
}

const INITIAL_STATE: CropState = { rotation: 0, zoom: DEFAULT_ZOOM, panX: 0, panY: 0 };

function aspectRatioFor(preset: AspectPreset, rotation: number, naturalW: number, naturalH: number): number {
    if (preset === 'square') return 1;
    if (preset === 'wide') return 49.07 / 16; // matches the QTB report's reserved logo box
    const swapped = ((rotation / 90) % 2 + 2) % 2 !== 0;
    const w = swapped ? naturalH : naturalW;
    const h = swapped ? naturalW : naturalH;
    return w / h || 1;
}

/** Draws the image into `canvas` (sized vw x vh) applying rotation/zoom/pan — shared by preview and export. */
function drawCrop(
    img: HTMLImageElement,
    canvas: HTMLCanvasElement,
    state: CropState,
    vw: number,
    vh: number,
): void {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const rad = (state.rotation * Math.PI) / 180;
    const swapped = ((state.rotation / 90) % 2 + 2) % 2 !== 0;
    const rotW = swapped ? ih : iw;
    const rotH = swapped ? iw : ih;
    const baseScale = Math.max(vw / rotW, vh / rotH);
    const scale = baseScale * state.zoom;

    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(vw / 2 + state.panX, vh / 2 + state.panY);
    ctx.rotate(rad);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -iw / 2, -ih / 2);
    ctx.restore();
}

function clampPan(state: CropState, img: HTMLImageElement, vw: number, vh: number): CropState {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const swapped = ((state.rotation / 90) % 2 + 2) % 2 !== 0;
    const rotW = swapped ? ih : iw;
    const rotH = swapped ? iw : ih;
    const baseScale = Math.max(vw / rotW, vh / rotH);
    const scale = baseScale * state.zoom;
    const maxPanX = Math.max(0, (rotW * scale - vw) / 2);
    const maxPanY = Math.max(0, (rotH * scale - vh) / 2);
    return {
        ...state,
        panX: Math.min(maxPanX, Math.max(-maxPanX, state.panX)),
        panY: Math.min(maxPanY, Math.max(-maxPanY, state.panY)),
    };
}

export interface LogoCropDialogProps {
    open: boolean;
    file: File | null;
    onCancel: () => void;
    onCropped: (file: File) => void;
}

export default function LogoCropDialog({ open, file, onCancel, onCropped }: LogoCropDialogProps) {
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [preset, setPreset] = useState<AspectPreset>('original');
    const [state, setState] = useState<CropState>(INITIAL_STATE);
    const [busy, setBusy] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

    useEffect(() => {
        if (!open || !file) { setImg(null); return; }
        let cancelled = false;
        setLoadError(null);
        const url = URL.createObjectURL(file);
        loadImage(url)
            .then((loaded) => { if (!cancelled) { setImg(loaded); setPreset('original'); setState(INITIAL_STATE); } })
            .catch(() => { if (!cancelled) setLoadError('Could not read this image file.'); })
            .finally(() => URL.revokeObjectURL(url));
        return () => { cancelled = true; };
    }, [open, file]);

    const aspect = useMemo(() => {
        if (!img) return 1;
        return aspectRatioFor(preset, state.rotation, img.naturalWidth, img.naturalHeight);
    }, [preset, state.rotation, img]);

    const vw = VIEWPORT_WIDTH;
    const vh = useMemo(() => Math.round(Math.min(360, Math.max(120, VIEWPORT_WIDTH / aspect))), [aspect]);

    const redraw = useCallback(() => {
        if (!img || !canvasRef.current) return;
        drawCrop(img, canvasRef.current, state, vw, vh);
    }, [img, state, vw, vh]);

    useEffect(() => { redraw(); }, [redraw]);

    const updateState = useCallback((updater: (prev: CropState) => CropState) => {
        setState((prev) => {
            if (!img) return updater(prev);
            return clampPan(updater(prev), img, vw, vh);
        });
    }, [img, vw, vh]);

    const rotateBy = (deg: number) => {
        updateState((prev) => ({ ...prev, rotation: prev.rotation + deg, zoom: DEFAULT_ZOOM, panX: 0, panY: 0 }));
    };

    const handlePresetChange = (next: AspectPreset) => {
        setPreset(next);
        updateState((prev) => ({ ...prev, zoom: DEFAULT_ZOOM, panX: 0, panY: 0 }));
    };

    const handleReset = () => {
        setState(INITIAL_STATE);
    };

    const handleAutoFit = () => {
        if (!img) return;
        const bbox = detectContentBBox(img);
        if (!bbox) return;

        const cx = bbox.x + bbox.width / 2 - img.naturalWidth / 2;
        const cy = bbox.y + bbox.height / 2 - img.naturalHeight / 2;
        const swapped = ((state.rotation / 90) % 2 + 2) % 2 !== 0;
        const rotW = swapped ? img.naturalHeight : img.naturalWidth;
        const rotH = swapped ? img.naturalWidth : img.naturalHeight;
        const baseScale = Math.max(vw / rotW, vh / rotH);

        const rad = (state.rotation * Math.PI) / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);

        const effW = Math.abs(bbox.width * cos) + Math.abs(bbox.height * sin);
        const effH = Math.abs(bbox.width * sin) + Math.abs(bbox.height * cos);
        const finalScale = Math.max(vw / effW, vh / effH);
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, finalScale / baseScale));
        const appliedScale = baseScale * zoom;

        const panX = -(cx * cos - cy * sin) * appliedScale;
        const panY = -(cx * sin + cy * cos) * appliedScale;

        updateState(() => ({ rotation: state.rotation, zoom, panX, panY }));
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        dragRef.current = { startX: e.clientX, startY: e.clientY, panX: state.panX, panY: state.panY };
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!dragRef.current || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = vw / rect.width;
        const scaleY = vh / rect.height;
        const dx = (e.clientX - dragRef.current.startX) * scaleX;
        const dy = (e.clientY - dragRef.current.startY) * scaleY;
        updateState((prev) => ({ ...prev, panX: dragRef.current!.panX + dx, panY: dragRef.current!.panY + dy }));
    };

    const handlePointerUp = () => { dragRef.current = null; };

    const handleApply = async () => {
        if (!img) return;
        setBusy(true);
        try {
            const outW = LOGO_EXPORT_MAX_DIMENSION;
            const outH = Math.round(outW / aspect);
            const exportScale = outW / vw;
            const exportCanvas = document.createElement('canvas');
            drawCrop(
                img,
                exportCanvas,
                { ...state, panX: state.panX * exportScale, panY: state.panY * exportScale },
                outW,
                outH,
            );
            const blob: Blob | null = await new Promise((resolve) => exportCanvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Export failed');
            const croppedFile = new File([blob], 'logo.png', { type: 'image/png' });
            onCropped(croppedFile);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Adjust logo</DialogTitle>
                    <DialogDescription>Crop, rotate, and zoom before saving.</DialogDescription>
                </DialogHeader>

                {loadError && <p className="text-sm text-destructive">{loadError}</p>}

                {img && (
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <canvas
                                ref={canvasRef}
                                width={vw}
                                height={vh}
                                style={{ width: vw, height: vh, touchAction: 'none' }}
                                className="rounded-md border cursor-move bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]"
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerLeave={handlePointerUp}
                            />
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                            {(['original', 'square', 'wide'] as AspectPreset[]).map((p) => (
                                <Button
                                    key={p}
                                    type="button"
                                    size="sm"
                                    variant={preset === p ? 'default' : 'outline'}
                                    className="h-7 text-xs px-2.5"
                                    onClick={() => handlePresetChange(p)}
                                >
                                    {p === 'original' ? 'Original' : p === 'square' ? 'Square' : 'Wide (report)'}
                                </Button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-10 shrink-0">Zoom</span>
                            <input
                                type="range"
                                min={MIN_ZOOM}
                                max={MAX_ZOOM}
                                step={0.01}
                                value={state.zoom}
                                onChange={(e) => updateState((prev) => ({ ...prev, zoom: Number(e.target.value) }))}
                                className="flex-1"
                            />
                        </div>

                        <div className="flex items-center justify-center gap-2">
                            <Button type="button" size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => rotateBy(-90)}>
                                <RotateCcw size={13} /> Rotate
                            </Button>
                            <Button type="button" size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => rotateBy(90)}>
                                <RotateCw size={13} /> Rotate
                            </Button>
                            <Button type="button" size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={handleAutoFit}>
                                <Wand2 size={13} /> Fit to content
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="gap-1.5 h-8 text-xs" onClick={handleReset}>
                                <Maximize2 size={13} /> Reset
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                            Drag the image to reposition it — e.g. if the logo mark sits in a corner, drag it toward the
                            center of the frame. Zoom in for more room to move. &ldquo;Fit to content&rdquo; does this
                            automatically by trimming empty padding around the mark.
                        </p>
                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
                    <Button type="button" onClick={handleApply} disabled={!img || busy}>
                        {busy ? 'Saving…' : 'Apply'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
