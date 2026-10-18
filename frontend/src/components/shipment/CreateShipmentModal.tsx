import React, { useState } from 'react';
import { PackagePlus, Sparkles, AlertCircle, Calendar, Truck, Anchor, Plane, Train } from 'lucide-react';
import { BusinessPriority, Shipment, TransportMode } from '../../types';
import { shipmentService } from '../../services';
import { Button, Modal } from '../common';

interface CreateShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newShipment: Shipment) => void;
}

export const CreateShipmentModal: React.FC<CreateShipmentModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const getDefaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  };

  const generateRandomTrackingNumber = () => {
    const num = Math.floor(200 + Math.random() * 800);
    return `SHP-${num}`;
  };

  const [trackingNumber, setTrackingNumber] = useState(generateRandomTrackingNumber());
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [mode, setMode] = useState<TransportMode>('SEA');
  const [carrierId, setCarrierId] = useState('MAERSK_LINE');
  const [promisedDate, setPromisedDate] = useState(getDefaultDate());
  const [priority, setPriority] = useState<BusinessPriority>('HIGH');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const CARRIER_PRESETS: Record<TransportMode, string[]> = {
    SEA: ['MAERSK_LINE', 'COSCO_SHIPPING', 'MSC_MEDITERRANEAN', 'HAPAG_LLOYD', 'EVERGREEN'],
    AIR: ['FEDEX_EXPRESS', 'LUFTHANSA_CARGO', 'EMIRATES_SKYCARGO', 'CATHAY_CARGO', 'DHL_AVIATION'],
    ROAD: ['SCHNEIDER_NATIONAL', 'SWIFT_TRANSPORT', 'JB_HUNT', 'FEDEX_FREIGHT', 'UPS_GROUND'],
    RAIL: ['BNSF_RAILWAY', 'UNION_PACIFIC', 'DB_CARGO', 'CANADIAN_NATIONAL'],
  };

  const handleModeChange = (newMode: TransportMode) => {
    setMode(newMode);
    const presets = CARRIER_PRESETS[newMode];
    if (presets && presets.length > 0) {
      setCarrierId(presets[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!trackingNumber.trim()) {
      setErrorMessage('Tracking number is required.');
      return;
    }
    if (!origin.trim()) {
      setErrorMessage('Origin location is required.');
      return;
    }
    if (!destination.trim()) {
      setErrorMessage('Destination location is required.');
      return;
    }
    if (!promisedDate) {
      setErrorMessage('Promised delivery date is required.');
      return;
    }

    try {
      setIsLoading(true);
      const created = await shipmentService.createShipment({
        tracking_number: trackingNumber.trim().toUpperCase(),
        origin: origin.trim(),
        destination: destination.trim(),
        mode,
        carrier_id: carrierId.trim().toUpperCase(),
        promised_delivery_date: promisedDate,
        business_priority: priority,
      });

      onCreated(created);
      onClose();

      // Reset form
      setTrackingNumber(generateRandomTrackingNumber());
      setOrigin('');
      setDestination('');
    } catch (err: any) {
      console.error('Error creating shipment:', err);
      setErrorMessage(
        err?.message || 'Failed to register shipment. Verify tracking number uniqueness.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register New Shipment"
      description="Create a live freight record with automated milestone tracking and bottleneck monitoring."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
        {errorMessage && (
          <div className="p-3 rounded bg-coral-400/15 border border-coral-400/40 text-coral-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tracking Number & Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slateText-secondary font-mono mb-1">
              Tracking Number *
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                required
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                placeholder="e.g. SHP-201"
                className="w-full bg-navy-900 border border-navy-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => setTrackingNumber(generateRandomTrackingNumber())}
                className="px-2 py-1 bg-navy-800 border border-navy-700 rounded hover:bg-navy-700 text-cyan-400 font-mono text-[11px] shrink-0"
                title="Generate Random Tracking ID"
              >
                Auto
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slateText-secondary font-mono mb-1">
              Transport Mode *
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(['SEA', 'AIR', 'ROAD', 'RAIL'] as TransportMode[]).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className={`py-2 px-1 rounded border text-[11px] font-mono font-semibold flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    mode === m
                      ? 'bg-cyan-400/15 border-cyan-400 text-cyan-300'
                      : 'bg-navy-900 border-navy-700 text-slateText-muted hover:text-white'
                  }`}
                >
                  {m === 'SEA' && <Anchor className="w-3.5 h-3.5" />}
                  {m === 'AIR' && <Plane className="w-3.5 h-3.5" />}
                  {m === 'ROAD' && <Truck className="w-3.5 h-3.5" />}
                  {m === 'RAIL' && <Train className="w-3.5 h-3.5" />}
                  <span>{m}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Origin & Destination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slateText-secondary font-mono mb-1">
              Origin Location *
            </label>
            <input
              type="text"
              required
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Mumbai Port (INBOM) or Dallas DC"
              className="w-full bg-navy-900 border border-navy-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-slateText-secondary font-mono mb-1">
              Destination Location *
            </label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Rotterdam Port (NLRTM) or Austin Hub"
              className="w-full bg-navy-900 border border-navy-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Carrier & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slateText-secondary font-mono mb-1">
              Carrier Assignment *
            </label>
            <select
              value={carrierId}
              onChange={(e) => setCarrierId(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
            >
              {CARRIER_PRESETS[mode].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slateText-secondary font-mono mb-1">
              Business Priority *
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as BusinessPriority)}
              className="w-full bg-navy-900 border border-navy-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH (Standard Export)</option>
              <option value="CRITICAL">CRITICAL (Cold-chain / Strict SLA)</option>
            </select>
          </div>
        </div>

        {/* Promised Delivery Date */}
        <div>
          <label className="block text-slateText-secondary font-mono mb-1">
            Promised Delivery Date (SLA Target) *
          </label>
          <div className="relative">
            <input
              type="date"
              required
              value={promisedDate}
              onChange={(e) => setPromisedDate(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-navy-700">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            leftIcon={<PackagePlus className="w-3.5 h-3.5" />}
          >
            Register Shipment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
