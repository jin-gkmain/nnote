/** STT/전사문을 음성기록 페이지와 동일한 화자 블록으로 표시 */
import type { SttSegment } from "@/app/data/ai-api";

export interface TranscriptBlock {
  type: "speech" | "gap";
  speakerKey: number;
  text: string;
  segmentId?: string;
  startSec?: number;
  endSec?: number;
}

const SPEAKER_LINE_WITH_BODY =
  /^(?:사람\s*(\d+)|Speaker\s*(\d+)|화자\s*(\d+))\s*[:：]\s*(.*)$/i;

function parseTranscriptLine(line: string): { speakerKey: number; text: string } {
  const m = line.match(SPEAKER_LINE_WITH_BODY);
  if (!m) {
    return { speakerKey: 0, text: line.trim() };
  }
  const rawNum = m[1] || m[2] || m[3];
  const n = rawNum ? parseInt(rawNum, 10) : 0;
  const speakerKey = Number.isFinite(n) && n > 0 ? n : 0;
  return { speakerKey, text: (m[4] ?? "").trim() };
}

export function transcriptToBlocks(transcript: string): TranscriptBlock[] {
  const raw = transcript.replace(/\r\n/g, "\n").trim();
  if (!raw) return [];
  const lines = raw.split("\n");
  const out: TranscriptBlock[] = [];
  for (const line of lines) {
    if (!line.trim()) {
      const last = out[out.length - 1];
      if (last && last.type !== "gap") {
        out.push({ type: "gap", speakerKey: 0, text: "" });
      }
      continue;
    }
    const { speakerKey, text } = parseTranscriptLine(line);
    out.push({ type: "speech", speakerKey, text });
  }
  return out;
}

function parseSpeakerKey(rawSpeaker: string): number {
  const matched = rawSpeaker.match(/(\d+)/);
  if (!matched) return 0;
  const parsed = Number(matched[1]);
  return Number.isFinite(parsed) ? parsed + 1 : 0;
}

export function segmentsToBlocks(segments: SttSegment[]): TranscriptBlock[] {
  return segments.map((segment) => ({
    type: "speech",
    speakerKey: parseSpeakerKey(segment.speaker),
    text: segment.text,
    segmentId: segment.id,
    startSec: segment.startSec,
    endSec: segment.endSec,
  }));
}

function speakerAccentBarClass(speakerKey: number): string {
  if (speakerKey <= 0) return "bg-gray-300";
  if (speakerKey % 2 === 1) return "bg-blue-500";
  return "bg-lime-500";
}

function speakerLabelKo(speakerKey: number): string {
  if (speakerKey <= 0) return "화자 미표기";
  return `화자 ${speakerKey}`;
}

export interface VoiceTranscriptBlocksProps {
  readonly transcript?: string;
  readonly segments?: SttSegment[];
  readonly activeSegmentId?: string | null;
  readonly onSelectSegment?: (segment: SttSegment) => void;
  readonly className?: string;
}

export function VoiceTranscriptBlocks({
  transcript = "",
  segments,
  activeSegmentId,
  onSelectSegment,
  className,
}: VoiceTranscriptBlocksProps) {
  const blocks =
    Array.isArray(segments) && segments.length > 0
      ? segmentsToBlocks(segments)
      : transcript.trim()
        ? transcriptToBlocks(transcript)
        : [];
  if (blocks.length === 0) {
    return (
      <p className="text-sm text-gray-500">전사된 음성 원문이 없습니다.</p>
    );
  }
  return (
    <div className={className ?? "space-y-2.5"}>
      {blocks.map((block, idx) => {
        if (block.type === "gap") {
          return <div key={`g-${idx}`} className="h-2 shrink-0" aria-hidden />;
        }
        const barClass = speakerAccentBarClass(block.speakerKey);
        const segment =
          block.segmentId && Array.isArray(segments)
            ? segments.find((item) => item.id === block.segmentId)
            : null;
        const isActive = Boolean(activeSegmentId) && block.segmentId === activeSegmentId;
        return (
          <button
            key={`b-${idx}`}
            type="button"
            onClick={() => {
              if (segment && onSelectSegment) onSelectSegment(segment);
            }}
            className={`flex w-full gap-3 rounded-md py-2 pl-0.5 text-left ${
              isActive ? "bg-blue-50" : "bg-transparent"
            }`}
            disabled={!segment || !onSelectSegment}
          >
            <div
              className={`mt-0.5 w-[3px] shrink-0 self-stretch rounded-full ${barClass}`}
              title={speakerLabelKo(block.speakerKey)}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              {block.speakerKey > 0 ? (
                <p className="mb-1 text-[11px] font-semibold text-gray-500">
                  {speakerLabelKo(block.speakerKey)}
                </p>
              ) : null}
              <p className="text-sm leading-relaxed text-gray-800">
                {block.text.length > 0 ? block.text : "—"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
