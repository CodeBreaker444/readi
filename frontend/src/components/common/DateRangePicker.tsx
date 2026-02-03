'use client';

import { useState } from 'react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
}: DateRangePickerProps) {
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStart(e.target.value);
    onChange(e.target.value, end);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnd(e.target.value);
    onChange(start, e.target.value);
  };

  return (
    <div className="input-group">
      <span className="input-group-text">From</span>
      <input
        type="date"
        className="form-control"
        placeholder="Start"
        value={start}
        onChange={handleStartChange}
      />
      <span className="input-group-text">to</span>
      <input
        type="date"
        className="form-control rounded-end"
        placeholder="End"
        value={end}
        onChange={handleEndChange}
      />
    </div>
  );
}