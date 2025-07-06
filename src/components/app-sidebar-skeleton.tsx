"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function AppSidebarSkeleton() {
  return (
    <>
      <SidebarTrigger />
      <Sidebar
        side="left"
        collapsible="offcanvas"
        className="group animate-in fade-in-0 duration-150"
      >
        <SidebarContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200/40 dark:border-slate-700/40 shadow-xl">
          {/* QuickStats Skeleton */}
          <div className="p-2 space-y-2 border-b border-slate-200/60 dark:border-slate-700/60">
            {/* Daily Progress Skeleton */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="w-full h-1.5 rounded-full" />
            </div>
            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="text-center p-1 rounded bg-[rgba(23,6,100,0.06)] dark:bg-[rgba(23,6,100,0.12)]"
                >
                  <div className="flex justify-center mb-0.5">
                    <Skeleton className="h-3 w-3 rounded" />
                  </div>
                  <Skeleton className="h-4 w-8 mx-auto mb-1" />
                  <Skeleton className="h-2.5 w-8 mx-auto" />
                </div>
              ))}
            </div>
            {/* Streak Info Skeleton */}
            <div className="text-center">
              <Skeleton className="h-2.5 w-24 mx-auto" />
            </div>
            {/* Analytics Button Skeleton */}
            <div className="pt-1">
              <Skeleton className="w-full h-8 rounded" />
            </div>
            {/* Wordlist Button Skeleton */}
            <div className="pt-0.5">
              <Skeleton className="w-full h-8 rounded" />
            </div>
          </div>

          {/* Chat Sections Skeleton */}
          <SidebarGroup>
            <SidebarGroupContent className="p-0.5">
              {/* Bookmarked Section Skeleton */}
              <div className="mb-4">
                <SidebarGroupLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 px-2">
                  <Skeleton className="h-4 w-20" />
                </SidebarGroupLabel>
                <ul className="space-y-0 flex flex-col">
                  {[1, 2].map((i) => (
                    <li
                      key={i}
                      className="group flex items-stretch justify-between border-b border-slate-300/60 dark:border-slate-600/60 last:border-b-0 py-1.5 mx-1"
                    >
                      <div className="flex-grow overflow-hidden pr-0.5 min-w-0">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <div className="flex justify-between items-center gap-2">
                          <Skeleton className="h-5 w-16 rounded-full" />
                          <div className="text-right flex-shrink-0">
                            <Skeleton className="h-2.5 w-12 mb-0.5" />
                            <Skeleton className="h-2.5 w-10" />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col justify-between items-end shrink-0 ml-0.5">
                        <Skeleton className="h-4 w-4 rounded" />
                        <div className="flex gap-0.5">
                          <Skeleton className="h-4 w-4 rounded" />
                          <Skeleton className="h-4 w-4 rounded" />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Recent Chats Section Skeleton */}
              <div>
                <SidebarGroupLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 px-2">
                  <Skeleton className="h-4 w-16" />
                </SidebarGroupLabel>
                <ul className="space-y-0 flex flex-col">
                  {[1, 2, 3, 4].map((i) => (
                    <li
                      key={i}
                      className="group flex items-stretch justify-between border-b border-slate-300/60 dark:border-slate-600/60 last:border-b-0 py-1.5 mx-1"
                    >
                      <div className="flex-grow overflow-hidden pr-0.5 min-w-0">
                        <Skeleton className="h-4 w-28 mb-1" />
                        <div className="flex justify-between items-center gap-2">
                          <Skeleton className="h-5 w-14 rounded-full" />
                          <div className="text-right flex-shrink-0">
                            <Skeleton className="h-2.5 w-10 mb-0.5" />
                            <Skeleton className="h-2.5 w-8" />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col justify-between items-end shrink-0 ml-0.5">
                        <Skeleton className="h-4 w-4 rounded" />
                        <div className="flex gap-0.5">
                          <Skeleton className="h-4 w-4 rounded" />
                          <Skeleton className="h-4 w-4 rounded" />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer Skeleton */}
        <SidebarFooter className="border-t border-slate-200/40 dark:border-slate-700/40 bg-slate-50/60 dark:bg-slate-800/60 backdrop-blur-xl">
          <div className="p-0.5">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 min-w-0 space-y-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
              </div>
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
 