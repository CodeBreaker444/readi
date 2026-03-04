import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TableCell, TableRow } from "../ui/table";

export const TableSkeleton = ({ columns, isDark }: { columns: number; isDark: boolean }) => {
  return (
    <>
      {[...Array(10)].map((_, i) => (
        <TableRow key={i} className={isDark ? "border-slate-800" : "border-slate-100"}>
          {[...Array(columns)].map((_, j) => (
            <TableCell key={j} className="px-3 py-3">
              <Skeleton className={cn(
                "h-4 w-full",
                isDark ? "bg-slate-800" : "bg-slate-100"
              )} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
};