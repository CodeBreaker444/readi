import { ChecklistRenderer } from '@/components/checklist/ChecklistRenderer';

export function ChecklistPreview({
  checklistJson,
  isDark,
}: {
  checklistJson: string;
  isDark: boolean;
}) {
  return (
    <div className="checklist-preview-container">
      <ChecklistRenderer
        checklistJson={checklistJson}
        isDark={isDark}
      />
    </div>
  );
}