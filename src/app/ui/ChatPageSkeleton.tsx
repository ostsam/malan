"use client";

import React from 'react';

const ChatPageSkeleton = () => {
  return (
    <div className="flex flex-col w-full max-w-xl py-8 mx-auto stretch min-h-screen items-center animate-pulse">
      {/* Placeholder for Messages Area */}
      <div className="relative w-full max-w-[80%] overflow-y-auto pb-32 flex-grow">
        <div className="flex flex-col items-start space-y-1 mb-4">
          <div className="max-w-[70%] rounded-3xl my-1 p-4 h-16 bg-gray-300 dark:bg-gray-700 w-3/4"></div>
          <div className="max-w-[70%] rounded-3xl my-1 p-4 h-12 bg-gray-300 dark:bg-gray-700 w-1/2"></div>
        </div>
        <div className="flex flex-col items-end space-y-1 mb-4">
          <div className="max-w-[70%] rounded-3xl my-1 p-4 h-12 bg-sky-200 dark:bg-sky-800 w-2/3 self-end"></div>
        </div>
        <div className="flex flex-col items-start space-y-1">
          <div className="max-w-[70%] rounded-3xl my-1 p-4 h-20 bg-gray-300 dark:bg-gray-700 w-full"></div>
        </div>
      </div>

      {/* Placeholder for Microphone Button Area */}
      <div className="fixed bottom-0 left-0 right-0 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-4">
        <div className="w-25 h-25 bg-gray-300 dark:bg-gray-700 rounded-full mb-2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
      </div>
    </div>
  );
};

export default ChatPageSkeleton;
