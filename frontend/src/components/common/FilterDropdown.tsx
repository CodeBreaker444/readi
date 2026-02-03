'use client';

interface FilterOption {
  id: number;
  name: string;
  value?: any;
}

interface FilterDropdownProps {
  id: string;
  value: number;
  options: FilterOption[];
  onChange: (value: number) => void;
  placeholder?: string;
}

export default function FilterDropdown({
  id,
  value,
  options,
  onChange,
  placeholder = 'Select',
}: FilterDropdownProps) {
  return (
    <select
      id={id}
      className="form-select"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      <option value={0}>{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name || option.value}
        </option>
      ))}
    </select>
  );
}