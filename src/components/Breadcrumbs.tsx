"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { Home } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

interface BreadcrumbItemData {
  label: string;
  href: string | null;
}

interface BreadcrumbsProps {
  items: BreadcrumbItemData[];
  isDark?: boolean;
}

export default function Breadcrumbs({ items, isDark }: BreadcrumbsProps) {
  const linkStyles = cn(
    "transition-colors text-xs font-medium",
    isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
  );

  const activeStyles = cn(
    "text-xs font-semibold",
    isDark ? "text-slate-100" : "text-slate-900"
  );

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild className={linkStyles}>
            <Link href="/">
              <Home className="h-3.5 w-3.5" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={index}>
              <BreadcrumbSeparator className={isDark ? "text-slate-700" : "text-slate-300"} />
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage className={activeStyles}>
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild className={linkStyles}>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}