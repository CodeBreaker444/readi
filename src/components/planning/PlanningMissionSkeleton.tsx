import { Skeleton } from "../ui/skeleton"

export const PlanningMissionSkeleton = () =>{
    return(
        <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
}