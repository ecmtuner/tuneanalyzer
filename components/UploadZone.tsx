'use client';
import { useCallback, useState } from 'react';
import { Platform } from '@/lib/columns';
import { FuelType, MotorType } from '@/lib/scorer';

interface Props {
  onFile: (content: string, platform: Platform, fuel: FuelType, motor: MotorType) => void;
  loading: boolean;
}

const PLATFORMS: { value: Platform; label: string; desc: string }[] = [
  { value: 'bm3',     label: 'bootmod3 (BM3)', desc: 'BMW — most common' },
  { value: 'mhd',     label: 'MHD Flasher',    desc: 'BMW E/F/G series' },
  { value: 'mgflash', label: 'MG Flasher',      desc: 'BMW M cars' },
  { value: 'ecutek',  label: 'EcuTek',          desc: 'Various brands' },
  { value: 'generic', label: 'Generic CSV',     desc: 'Other / Unknown' },
];

const FUELS: { value: FuelType; label: string; color: string }[] = [
  { value: 'pump', label: 'Pump (E0–E10)', color: 'bg-blue-500' },
  { value: 'e30',  label: 'E30',           color: 'bg-green-500' },
  { value: 'e40',  label: 'E40',           color: 'bg-yellow-500' },
  { value: 'e45',  label: 'E45',           color: 'bg-orange-500' },
  { value: 'e85',  label: 'E85',           color: 'bg-red-500' },
];

export default function UploadZone({ onFile, loading }: Props) {
  const [platform, setPlatform] = useState<Platform>('bm3');
  const [fuel, setFuel] = useState<FuelType>('pump');
  const [motor, setMotor] = useState<MotorType>('stock');
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) onFile(text, platform, fuel, motor);
    };
    reader.readAsText(file);
  }, [onFile, platform, fuel, motor]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-6">
      {/* Platform selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Logging Platform</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p.value}
              onClick={() => setPlatform(p.value)}
              className={`px-3 py-2 rounded-lg border text-left transition-all ${
                platform === p.value
                  ? 'border-blue-500 bg-blue-500/10 text-white'
                  : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500'
              }`}
            >
              <div className="font-medium text-sm">{p.label}</div>
              <div className="text-xs opacity-60">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Fuel selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Fuel Type</label>
        <div className="flex flex-wrap gap-2">
          {FUELS.map(f => (
            <button
              key={f.value}
              onClick={() => setFuel(f.value)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                fuel === f.value
                  ? `border-transparent ${f.color} text-white shadow-lg`
                  : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Motor type toggle */}
      <div>
        <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Motor</label>
        <div className="flex gap-2">
          <button
            onClick={() => setMotor('stock')}
            className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
              motor === 'stock'
                ? 'border-gray-400 bg-gray-600/40 text-white'
                : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500'
            }`}
          >
            <div className="text-base mb-0.5">🔩</div>
            <div>Stock Internals</div>
            <div className="text-xs opacity-60 font-normal mt-0.5">Standard thresholds</div>
          </button>
          <button
            onClick={() => setMotor('built')}
            className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
              motor === 'built'
                ? 'border-orange-500 bg-orange-500/10 text-orange-300'
                : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500'
            }`}
          >
            <div className="text-base mb-0.5">🏗️</div>
            <div>Built Motor</div>
            <div className="text-xs opacity-60 font-normal mt-0.5">Relaxed tolerances</div>
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
          dragging
            ? 'border-blue-400 bg-blue-500/10'
            : 'border-gray-700 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50'
        }`}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input
          id="fileInput"
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={onInput}
        />
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">Analyzing log...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl">📂</div>
            <p className="text-white font-medium">Drop your CSV log here</p>
            <p className="text-gray-500 text-sm">or click to browse</p>
            <p className="text-gray-600 text-xs mt-1">Supports {PLATFORMS.find(p => p.value === platform)?.label} format</p>
          </div>
        )}
      </div>
    </div>
  );
}
