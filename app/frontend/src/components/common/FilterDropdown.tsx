'use client';

interface FilterDropdownProps {
  id: string;
  value: number;
  options: Array<{ id: number; name: string }>;
  onChange: (value: number) => void;
  placeholder?: string;
}

export default function FilterDropdown({
  id,
  value,
  options,
  onChange,
  placeholder = 'Select...',
}: FilterDropdownProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent outline-none transition-all"
    >
      <option value={0}>{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  );
}