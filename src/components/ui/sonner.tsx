"use client"

import {
  CircleCheckIcon,
  CopyIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { toast, Toaster as Sonner, type ToasterProps } from "sonner"

const textOf = (v: unknown): string =>
  typeof v === "string" || typeof v === "number" ? String(v) : ""

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    document.body.appendChild(ta)
    ta.select()
    document.execCommand("copy")
    document.body.removeChild(ta)
  }
}

const PATCH_FLAG = "__copyErrorPatched"
if (typeof window !== "undefined" && !(toast as any)[PATCH_FLAG]) {
  const originalError = toast.error.bind(toast)
  ;(toast as any)[PATCH_FLAG] = true
  toast.error = ((message: any, data?: any) => {
    if (data?.action) return originalError(message, data)
    const body = [textOf(message), textOf(data?.description)]
      .filter(Boolean)
      .join("\n")
    if (!body) return originalError(message, data)
    return originalError(message, {
      ...data,
      classNames: {
        ...data?.classNames,
        actionButton:
          "bg-transparent! text-foreground! border! border-gray-300! dark:border-gray-600! rounded-md! px-2.5! h-7! text-xs! font-medium! shadow-none! transition-colors hover:bg-gray-100! dark:hover:bg-gray-800!",
      },
      action: {
        label: (
          <span className="inline-flex items-center gap-1.5">
            <CopyIcon className="size-3.5" />
            Copy
          </span>
        ),
        onClick: (e: React.MouseEvent) => {
          e.preventDefault() // keep the toast open
          void copyText(`${body}\n\nPage: ${window.location.href}\nTime: ${new Date().toISOString()}`)
          toast.success("Error details copied", { duration: 1500 })
        },
      },
    })
  }) as typeof toast.error
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
