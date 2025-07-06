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
          {/* Quick Stats Header Skeleton */}
          <div className="p-2 space-y-2 border-b border-slate-200/60 dark:border-slate-700/60">
            {/* Daily Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Skeleton className="h-3 w-3 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                <Skeleton className="h-3 w-8 rounded" />
              </div>
              <Skeleton className="w-full h-1.5 rounded-full" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              {/* Words Saved */}
              <div className="text-center p-1 rounded bg-[rgba(23,6,100,0.06)] dark:bg-[rgba(23,6,100,0.12)]">
                <div className="flex justify-center mb-0.5">
                  <Skeleton className="h-3 w-3 rounded" />
                </div>
                <Skeleton className="h-4 w-6 mx-auto mb-0.5 rounded" />
                <Skeleton className="h-2.5 w-8 mx-auto rounded" />
              </div>

              {/* Chat Sessions */}
              <div className="text-center p-1 rounded bg-[rgba(23,6,100,0.06)] dark:bg-[rgba(23,6,100,0.12)]">
                <div className="flex justify-center mb-0.5">
                  <Skeleton className="h-3 w-3 rounded" />
                </div>
                <Skeleton className="h-4 w-6 mx-auto mb-0.5 rounded" />
                <Skeleton className="h-2.5 w-8 mx-auto rounded" />
              </div>

              {/* Current Streak */}
              <div className="text-center p-1 rounded bg-[rgba(23,6,100,0.06)] dark:bg-[rgba(23,6,100,0.12)]">
                <div className="flex justify-center mb-0.5">
                  <Skeleton className="h-3 w-3 rounded" />
                </div>
                <Skeleton className="h-4 w-6 mx-auto mb-0.5 rounded" />
                <Skeleton className="h-2.5 w-8 mx-auto rounded" />
              </div>
            </div>

            {/* Analytics Button */}
            <div className="pb-0">
              <Skeleton className="w-full h-8 rounded" />
            </div>

            {/* Wordlist Button */}
            <div className="pt-0 -mt-1">
              <Skeleton className="w-full h-8 rounded" />
            </div>
          </div>

          <SidebarGroup>
            <SidebarGroupContent className="p-0.5">
              {/* Bookmarked Section */}
              <div className="mb-4">
                <SidebarGroupLabel className="text-sm font-semibold mb-2 px-2">
                  <Skeleton className="h-4 w-20 rounded" />
                </SidebarGroupLabel>

                {/* Bookmarked Chat Items */}
                <ul className="space-y-0 flex flex-col">
                  {[1, 2].map((i) => (
                    <li
                      key={i}
                      className="group flex items-stretch justify-between border-b border-slate-300/60 dark:border-slate-600/60 last:border-b-0 py-1.5 mx-1"
                    >
                      <div className="flex-grow overflow-hidden pr-0.5 min-w-0">
                        <Skeleton className="h-4 w-32 mb-1 rounded" />
                        <div className="flex justify-between items-center gap-2">
                          <Skeleton className="h-5 w-12 rounded-full" />
                          <div className="text-right flex-shrink-0">
                            <Skeleton className="h-2.5 w-8 mb-0.5 rounded" />
                            <Skeleton className="h-2.5 w-6 rounded" />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col justify-between items-end shrink-0 ml-0.5">
                        <Skeleton className="h-4 w-4 mb-1 rounded" />
                        <div className="flex gap-0.5">
                          <Skeleton className="h-4 w-4 rounded" />
                          <Skeleton className="h-4 w-4 rounded" />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recent Chats Section */}
              <div>
                <SidebarGroupLabel className="text-sm font-semibold mb-2 px-2">
                  <Skeleton className="h-4 w-24 rounded" />
                </SidebarGroupLabel>

                {/* Recent Chat Items */}
                <ul className="space-y-0 flex flex-col">
                  {[1, 2, 3, 4].map((i) => (
                    <li
                      key={i}
                      className="group flex items-stretch justify-between border-b border-slate-300/60 dark:border-slate-600/60 last:border-b-0 py-1.5 mx-1"
                    >
                      <div className="flex-grow overflow-hidden pr-0.5 min-w-0">
                        <Skeleton className="h-4 w-28 mb-1 rounded" />
                        <div className="flex justify-between items-center gap-2">
                          <Skeleton className="h-5 w-14 rounded-full" />
                          <div className="text-right flex-shrink-0">
                            <Skeleton className="h-2.5 w-8 mb-0.5 rounded" />
                            <Skeleton className="h-2.5 w-6 rounded" />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col justify-between items-end shrink-0 ml-0.5">
                        <Skeleton className="h-4 w-4 mb-1 rounded" />
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
                  <Skeleton className="h-3.5 w-24 rounded" />
                  <Skeleton className="h-2.5 w-32 rounded" />
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
