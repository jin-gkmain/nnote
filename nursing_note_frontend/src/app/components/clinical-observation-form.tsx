/** 임상관찰기록지 data 객체를 필드별 폼으로 표시·편집 (recordPayload 스키마와 동일 키) */

interface ClinicalObservationFormProps {
  readonly data: Record<string, unknown>;
  readonly readOnly: boolean;
  readonly onChange: (path: string[], value: string) => void;
}

function readStringAt(
  root: Record<string, unknown>,
  path: string[],
): string {
  let cur: unknown = root;
  for (const key of path) {
    if (cur == null || typeof cur !== "object" || Array.isArray(cur)) {
      return "";
    }
    cur = (cur as Record<string, unknown>)[key];
  }
  if (typeof cur === "string") {
    return cur;
  }
  if (typeof cur === "number" || typeof cur === "boolean") {
    return String(cur);
  }
  return "";
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="mb-3 border-b border-gray-200 pb-2 text-sm font-bold text-gray-900">
      {children}
    </h3>
  );
}

function FieldRow({
  label,
  path,
  data,
  readOnly,
  onChange,
  multiline,
  rows,
}: {
  label: string;
  path: string[];
  data: Record<string, unknown>;
  readOnly: boolean;
  onChange: (path: string[], value: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  const value = readStringAt(data, path);
  const id = path.join("__");
  if (multiline) {
    return (
      <div className="sm:col-span-2">
        <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-600">
          {label}
        </label>
        <textarea
          id={id}
          readOnly={readOnly}
          value={value}
          rows={rows ?? 4}
          onChange={
            readOnly
              ? undefined
              : (e) => {
                  onChange(path, e.target.value);
                }
          }
          className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 read-only:bg-white"
        />
      </div>
    );
  }
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </label>
      <input
        id={id}
        readOnly={readOnly}
        value={value}
        onChange={
          readOnly
            ? undefined
            : (e) => {
                onChange(path, e.target.value);
              }
        }
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 read-only:bg-white"
      />
    </div>
  );
}

const TOP_FIELDS: { key: string; label: string }[] = [
  { key: "진료일시", label: "진료일시" },
  { key: "작성자성명", label: "작성자 성명" },
  { key: "진료과", label: "진료과" },
  { key: "내과세부진료과목", label: "내과 세부 진료과목" },
];

const VITAL_FIELDS: { key: string; label: string }[] = [
  { key: "측정일시", label: "측정일시" },
  { key: "혈압", label: "혈압" },
  { key: "맥박", label: "맥박" },
  { key: "체온", label: "체온" },
  { key: "호흡", label: "호흡" },
  { key: "산소포화도", label: "산소포화도" },
  { key: "혈당", label: "혈당" },
];

const BODY_FIELDS: { key: string; label: string }[] = [
  { key: "측정일시", label: "측정일시" },
  { key: "체중", label: "체중" },
  { key: "신장", label: "신장" },
  { key: "두위", label: "두위" },
  { key: "흉위", label: "흉위" },
  { key: "복위", label: "복위" },
  { key: "특이사항", label: "특이사항" },
];

const INTAKE_FIELDS: { key: string; label: string }[] = [
  { key: "측정시작일시", label: "측정 시작 일시" },
  { key: "측정종료일시", label: "측정 종료 일시" },
  { key: "특이사항", label: "특이사항" },
  { key: "섭취_총량", label: "섭취 총량" },
  { key: "섭취_정맥", label: "섭취 정맥" },
  { key: "섭취_기타", label: "섭취 기타" },
  { key: "배설_총량", label: "배설 총량" },
  { key: "배설_배뇨", label: "배설 배뇨" },
  { key: "배설_기타", label: "배설 기타" },
];

const OTHER_FIELDS: { key: string; label: string; multiline?: boolean; rows?: number }[] = [
  { key: "측정일시", label: "측정일시" },
  { key: "항목명", label: "항목명" },
  { key: "관찰내용", label: "관찰내용" },
  { key: "특이사항", label: "특이사항", multiline: true, rows: 8 },
];

const EXTRA_FIELDS: { key: string; label: string }[] = [
  { key: "간병유무", label: "간병 유무" },
  { key: "도뇨관리", label: "도뇨 관리" },
];

export function ClinicalObservationForm({
  data,
  readOnly,
  onChange,
}: ClinicalObservationFormProps) {
  const hasPatientInfo = Object.prototype.hasOwnProperty.call(data, "환자정보");
  const attachRaw = data["첨부파일"];
  const hasAttach =
    attachRaw !== undefined &&
    attachRaw !== null &&
    (Array.isArray(attachRaw) || typeof attachRaw === "object");

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>기본</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {TOP_FIELDS.map(({ key, label }) => (
            <FieldRow
              key={key}
              label={label}
              path={[key]}
              data={data}
              readOnly={readOnly}
              onChange={onChange}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>활력징후</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {VITAL_FIELDS.map(({ key, label }) => (
            <FieldRow
              key={key}
              label={label}
              path={["활력징후", key]}
              data={data}
              readOnly={readOnly}
              onChange={onChange}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>신체계측</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {BODY_FIELDS.map(({ key, label }) => (
            <FieldRow
              key={key}
              label={label}
              path={["신체계측", key]}
              data={data}
              readOnly={readOnly}
              onChange={onChange}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>섭취·배설</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {INTAKE_FIELDS.map(({ key, label }) => (
            <FieldRow
              key={key}
              label={label}
              path={["섭취배설", key]}
              data={data}
              readOnly={readOnly}
              onChange={onChange}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>기타 관찰</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {OTHER_FIELDS.map(({ key, label, multiline, rows }) => (
            <FieldRow
              key={key}
              label={label}
              path={["기타관찰", key]}
              data={data}
              readOnly={readOnly}
              onChange={onChange}
              multiline={multiline}
              rows={rows}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>추가 정보</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {EXTRA_FIELDS.map(({ key, label }) => (
            <FieldRow
              key={key}
              label={label}
              path={["추가정보", key]}
              data={data}
              readOnly={readOnly}
              onChange={onChange}
            />
          ))}
        </div>
      </section>

      {hasPatientInfo ? (
        <section>
          <SectionTitle>환자 정보</SectionTitle>
          <FieldRow
            label="환자 정보 (텍스트)"
            path={["환자정보"]}
            data={data}
            readOnly={readOnly}
            onChange={onChange}
            multiline
            rows={5}
          />
        </section>
      ) : null}

      {hasAttach ? (
        <section>
          <SectionTitle>첨부 파일</SectionTitle>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-800">
            {typeof attachRaw === "string"
              ? attachRaw
              : JSON.stringify(attachRaw, null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
