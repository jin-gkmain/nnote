import { toRecordDate, toRecordTime } from "@/app/data/nursingRecords";

interface BuildRecordPayloadOptions {
  documentNumber?: string;
  /** 알 수 없는 서식명을 허용하고 공통 필드 기반으로 저장 */
  allowUnknownFormType?: boolean;
  /** 템플릿 UI 설정으로 확정된 저장 키 목록 (우선 적용) */
  templateFieldKeys?: string[];
}

interface BuiltRecordPayload {
  documentNumber: string;
  recordDate: string;
  recordTime: string;
  data: Record<string, unknown>;
}

/**
 * 기록 편집/저장 시 폼 데이터를 API payload 형태로 표준화한다.
 * - 화면별 중복 매핑 로직을 한 곳으로 모아 유지보수성을 높인다.
 */
export function buildRecordPayload(
  content: Record<string, unknown>,
  formType: string,
  options: BuildRecordPayloadOptions = {},
): BuiltRecordPayload {
  const recordDate =
    (content.recordDate as string | undefined) ??
    toRecordDate((content.date as string) ?? "");
  const recordTime =
    (content.recordTime as string | undefined) ??
    toRecordTime((content.time as string) ?? "");
  const documentNumber =
    options.documentNumber ?? String(Math.floor(Math.random() * 9000) + 1000);

  const dynamicFieldKeys = (options.templateFieldKeys ?? []).filter(
    (key) => key && key !== "recordDate" && key !== "recordTime" && key !== "date" && key !== "time",
  );
  if (dynamicFieldKeys.length > 0) {
    const fields: Record<string, unknown> = {};
    for (const key of dynamicFieldKeys) {
      fields[key] = content[key] ?? "";
    }
    return {
      documentNumber,
      recordDate,
      recordTime,
      data: {
        schemaVersion: 2,
        templateVersion: Number(content.__templateVersion ?? 2),
        fields,
      },
    };
  }

  let data: Record<string, unknown>;
  if (formType === "간호기록지") {
    data = {
      situation: content.situation ?? "",
      objective: content.objective ?? "",
      assessment: content.assessment ?? "",
      plan: content.plan ?? "",
      intervention: content.intervention ?? "",
      evaluation: content.evaluation ?? "",
    };
  } else if (formType === "간호인계기록지") {
    data = {
      작성자: content.작성자 ?? "",
      situation: content.situation ?? "",
      background: content.background ?? "",
      assessment: content.assessment ?? "",
      recommendation: content.recommendation ?? "",
    };
  } else if (formType === "SOAP") {
    data = {
      situation: content.situation ?? "",
      objective: content.objective ?? "",
      assessment: content.assessment ?? "",
      plan: content.plan ?? "",
    };
  } else if (formType === "SOAPIE") {
    data = {
      situation: content.situation ?? "",
      objective: content.objective ?? "",
      assessment: content.assessment ?? "",
      plan: content.plan ?? "",
      intervention: content.intervention ?? "",
      evaluation: content.evaluation ?? "",
    };
  } else if (formType === "SBAR") {
    data = {
      작성자: content.작성자 ?? "",
      situation: content.situation ?? "",
      background: content.background ?? "",
      assessment: content.assessment ?? "",
      recommendation: content.recommendation ?? "",
    };
  } else if (formType === "임상관찰기록지") {
    data = {
      진료일시: content.진료일시 ?? "",
      작성자성명: content.작성자성명 ?? "",
      진료과: content.진료과 ?? "",
      내과세부진료과목: content.내과세부진료과목 ?? "",
      활력징후: content.활력징후 ?? {},
      신체계측: content.신체계측 ?? {},
      섭취배설: content.섭취배설 ?? {},
      기타관찰: content.기타관찰 ?? {},
      추가정보: content.추가정보 ?? {},
    };
  } else if (options.allowUnknownFormType) {
    data = {
      작성자: content.작성자 ?? "",
      situation: content.situation ?? "",
      objective: content.objective ?? "",
      assessment: content.assessment ?? "",
      plan: content.plan ?? "",
      intervention: content.intervention ?? "",
      evaluation: content.evaluation ?? "",
      background: content.background ?? "",
      recommendation: content.recommendation ?? "",
    };
  } else {
    throw new Error("알 수 없는 기록 유형입니다.");
  }

  return { documentNumber, recordDate, recordTime, data };
}
