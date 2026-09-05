import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Block, ProgressBlock, ToolBlock } from "../../types/agent";
import { ToolBlockItem } from "./ToolCallPanel";

interface AgentProcessPanelProps {
  blocks: Array<ProgressBlock | ToolBlock>;
  startedAtMs: number;
  endedAtMs?: number;
  isActive: boolean;
  activity?: string;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function isProcessBlock(block: Block): block is ProgressBlock | ToolBlock {
  return block.type === "progress" || block.type === "tool";
}

export function getProcessBlocks(blocks: Block[]) {
  return blocks.filter(isProcessBlock);
}

export function AgentProcessPanel({ blocks, startedAtMs, endedAtMs, isActive, activity }: AgentProcessPanelProps) {
  const [open, setOpen] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isActive) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isActive]);

  useEffect(() => {
    if (isActive) {
      setOpen(true);
      return;
    }
    setOpen(false);
  }, [isActive]);

  const duration = useMemo(
    () => formatDuration((endedAtMs || now) - startedAtMs),
    [endedAtMs, now, startedAtMs],
  );

  if (blocks.length === 0 && !isActive) return null;

  const canToggle = !isActive && blocks.length > 0;
  const activityText = activity || (isActive ? "正在思考" : "");

  return (
    <div className="w-full pt-2 pb-2">
      <button
        type="button"
        onClick={() => canToggle && setOpen(prev => !prev)}
        className={`group flex w-full items-center gap-2 text-left text-neutral-500 transition-colors ${
          canToggle ? "hover:text-neutral-700 cursor-pointer" : "cursor-default"
        }`}
      >
        <span className="text-[15px] font-normal text-neutral-400">已处理 {duration}</span>
        {canToggle && (
          open ? (
            <ChevronDown size={16} className="text-neutral-400 group-hover:text-neutral-600" />
          ) : (
            <ChevronRight size={16} className="text-neutral-400 group-hover:text-neutral-600" />
          )
        )}
      </button>

      <div className="mt-4 h-px w-full bg-neutral-200/70" aria-hidden="true" />

      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          open && blocks.length > 0 ? "max-h-[9999px] opacity-100 pt-7" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-6">
          {isActive && activityText && (
            <div className="text-[13px] leading-6 text-neutral-400">
              {activityText}
            </div>
          )}
          {blocks.map((block, index) => {
            if (block.type === "progress") {
              return (
                <div key={`progress-${index}`} className="text-[13px] leading-6 text-neutral-900 whitespace-pre-wrap break-words">
                  {block.content}
                </div>
              );
            }
            return <ToolBlockItem key={block.toolId || index} tool={block} />;
          })}
        </div>
      </div>
    </div>
  );
}
