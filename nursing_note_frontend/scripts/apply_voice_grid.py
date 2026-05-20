# ASCII-only. Patches VoiceRecordPage.tsx grid section and overlay Korean.
from pathlib import Path

PAGE = Path(__file__).resolve().parents[1] / "src/app/components/VoiceRecordPage.tsx"


def main() -> None:
    text = PAGE.read_text(encoding="utf-8")

    text = text.replace(
        '? "\uc74c\uc131\uc744 \ufffd\ufffd\uc2a4\ud2b8\ub85c \ubcc0\ud658\ud558\ub294 \uc911\uc785\ub2c8\ub2e4..."',
        '? "\uc74c\uc131\uc744 \ud14d\uc2a4\ud2b8\ub85c \ubcc0\ud658\ud558\ub294 \uc911\uc785\ub2c8\ub2e4..."',
    )
    text = text.replace(
        '{isSaving ? "\ufffd\ufffd\uc2dc\ub9cc \uae30\ub2e4\ub824 \uc8fc\uc138\uc694." : "\ufffd\ufffd\uc744 \ufffd\ufffd\uc9c0 \ub9c8\uc138\uc694."}',
        '{isSaving ? "\uc7a0\uc2dc\ub9cc \uae30\ub2e4\ub824 \uc8fc\uc138\uc694." : "\ucc3d\uc744 \ub2eb\uc9c0 \ub9c8\uc138\uc694."}',
    )

    start = "        {!generatedDraft ? ("
    end = "        {error ?"
    i0, i1 = text.index(start), text.index(end)

    # Korean fragments as unicode escapes only
    f_ch = "\ud30c\uc77c \ucca8\ubd80"
    n_rec = "\ub179\uc74c"
    f_word = "\ud30c\uc77c"
    g_len = "\uae38\uc774"
    title_soapie = "\uc0dd\uc131\ub41c \uac04\ud638\uae30\ub85d\uc9c0 (SOAPIE)"
    side_title = "\ub179\uc74c/\uc5c5\ub85c\ub4dc \ub0b4\uc5ed"
    stt_lbl = "STT \uacb0\uacfc"

    new = f"""        <div className="mb-6 grid w-full flex-1 gap-4 lg:grid-cols-4 lg:items-start">
          <div className="min-w-0 space-y-4 lg:col-span-3">
            {{!generatedDraft ? (
              <div className="flex w-full justify-start">
                {{!isGenerating ? (
                  <button
                    type="button"
                    disabled={{!selectedPatient || isGenerating}}
                    onClick={{() => fileInputRef.current?.click()}}
                    className="inline-flex min-h-[40px] min-w-[80px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    <Upload className="h-4 w-4 shrink-0" strokeWidth={{2}} />
                    {f_ch}
                  </button>
                ) : null}}
              </div>
            ) : null}}

            {{generatedDraft && generationMeta ? (
              <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm">
                <p
                  className="truncate text-base font-semibold text-gray-900"
                  title={{generationMeta.fileName}}
                >
                  {{generationMeta.fileName}}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {{formatDateTime(generationMeta.createdAtIso)}}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {{generationMeta.sourceType === "recording" &&
                  typeof generationMeta.durationSec === "number"
                    ? `{n_rec} \uc2dc\uac04 ${{formatDuration(generationMeta.durationSec)}}`
                    : "\ud30c\uc77c \uc5c5\ub85c\ub4dc"}}
                </p>

                <div className="my-4 border-t border-gray-100" role="separator" />

                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-gray-900">
                    {title_soapie}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={{resetGeneratedSession}}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      \ub2e4\uc2dc \uc791\uc131
                    </button>
                    <button
                      type="button"
                      disabled={{!selectedPatient || isSaving}}
                      onClick={{handleSaveGeneratedRecord}}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {{isSaving ? "\uc800\uc7a5 \uc911..." : "\uac04\ud638\uae30\ub85d\uc9c0 \uc800\uc7a5"}}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {{SOAPIE_FIELD_CONFIG.map(({{ draftKey, label }}) => (
                    <div
                      key={{draftKey}}
                      className="rounded-2xl border border-gray-200/80 bg-slate-50/70 p-4 shadow-sm"
                    >
                      <label className="mb-2 block text-xs font-semibold text-gray-700">
                        {{label}}
                      </label>
                      <textarea
                        value={{generatedDraft[draftKey]}}
                        onChange={{(e) =>
                          setGeneratedDraft((prev) =>
                            prev ? {{ ...prev, [draftKey]: e.target.value }} : prev,
                          )
                        }}
                        className="min-h-[140px] w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                      />
                    </div>
                  ))}}
                </div>
              </div>
            ) : null}}
          </div>

          {{history.length > 0 ? (
            <aside className="max-h-[min(70vh,600px)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-1">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                {side_title}
              </h2>
              <ul className="space-y-3">
                {{history.map((item) => (
                  <li
                    key={{item.id}}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5"
                  >
                    <p
                      className="truncate text-xs font-medium text-gray-900"
                      title={{item.fileName}}
                    >
                      {{item.fileName}}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500">
                      {{item.sourceType === "recording" ? "{n_rec}" : "{f_word}"}} ·{{" "}}
                      {{formatDateTime(item.createdAt)}}
                    </p>
                    {{typeof item.durationSec === "number" ? (
                      <p className="text-[11px] text-gray-500">
                        {g_len} {{formatDuration(item.durationSec)}}
                      </p>
                    ) : null}}
                    <p
                      className={{`mt-1 text-[11px] font-medium ${{
                        item.status === "success"
                          ? "text-emerald-600"
                          : "text-red-600"
                      }}`}}
                    >
                      {{item.status === "success"
                        ? "\uc0dd\uc131 \uc644\ub8cc"
                        : item.message || "\uc0dd\uc131 \uc2e4\ud328"}}
                    </p>
                    {{item.transcript?.trim() ? (
                      <div className="mt-2 rounded-lg border border-gray-200/90 bg-white px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                          {stt_lbl}
                        </p>
                        <p className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap text-xs leading-snug text-gray-800">
                          {{item.transcript}}
                        </p>
                      </div>
                    ) : null}}
                  </li>
                ))}}
              </ul>
            </aside>
          ) : null}}
        </div>

"""

    PAGE.write_text(text[:i0] + new + text[i1:], encoding="utf-8")
    print("patched", PAGE)


if __name__ == "__main__":
    main()
