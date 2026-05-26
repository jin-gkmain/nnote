import type { TemplateCatalogForm } from './templates.types';

/**
 * Seed catalog derived from /Users/blisian/workspace/nnote/record4.xlsx.
 * The app does not read the workbook at runtime; this normalized catalog is the source shipped with the backend.
 */
export const EXCEL_TEMPLATE_CATALOG: TemplateCatalogForm[] = [
  {
    "templateId": "간호정보조사지",
    "title": "간호정보조사지",
    "sourceSheet": "1. 간호정보조사지",
    "institution": "세브란스",
    "sections": [
      {
        "sectionKey": "내원-시-환자-상태",
        "title": "내원 시 환자 상태",
        "displayOrder": 1,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r3_f1",
            "label": "통증",
            "type": "single_select",
            "description": "입원 시 통증 초기평가를 수행한다",
            "aiHint": "통증(범주형 - 없음/있음/입원 전에 있었음) & if 있음 or 입원 전에 있었음 == yes",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 3,
            "sourceDefinition": "통증(범주형 - 없음/있음/입원 전에 있었음) & if 있음 or 입원 전에 있었음 == yes",
            "displayOrder": 1,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "있음",
                "label": "있음",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "입원 전에 있었음",
                "label": "입원 전에 있었음",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r3_f2",
            "label": "통증부위",
            "type": "single_select",
            "description": "입원 시 통증 초기평가를 수행한다",
            "aiHint": "통증부위(범주형 - 전신통/흉통/복통/관절통/두통/요통/상세부위) & if 상세부위 ==",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 3,
            "sourceDefinition": "통증부위(범주형 - 전신통/흉통/복통/관절통/두통/요통/상세부위) & if 상세부위 ==",
            "displayOrder": 2,
            "options": [
              {
                "optionKey": "전신통",
                "label": "전신통",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "흉통",
                "label": "흉통",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "복통",
                "label": "복통",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "관절통",
                "label": "관절통",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "두통",
                "label": "두통",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "요통",
                "label": "요통",
                "allowFreeText": false,
                "displayOrder": 6
              },
              {
                "optionKey": "상세부위",
                "label": "상세부위",
                "allowFreeText": false,
                "displayOrder": 7
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r3_f3",
            "label": "yes",
            "type": "text_long",
            "description": "입원 시 통증 초기평가를 수행한다",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 3,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 3,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r3_f4",
            "label": "통증평가도구",
            "type": "single_select",
            "description": "입원 시 통증 초기평가를 수행한다",
            "aiHint": "통증평가도구(범주형 - NPIS(The Numerical Pain Intensity Scale/The FLACC pain Scale/The Wong-Baker Faces Pain Rating Scale/CPOT(Critical-Care Pain Observation Tool)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 3,
            "sourceDefinition": "통증평가도구(범주형 - NPIS(The Numerical Pain Intensity Scale/The FLACC pain Scale/The Wong-Baker Faces Pain Rating Scale/CPOT(Critical-Care Pain Observation Tool)",
            "displayOrder": 4,
            "options": [
              {
                "optionKey": "NPIS(The Numerical Pain Intensity Scale",
                "label": "NPIS(The Numerical Pain Intensity Scale",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "The FLACC pain Scale",
                "label": "The FLACC pain Scale",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "The Wong-Baker Faces Pain Rating Scale",
                "label": "The Wong-Baker Faces Pain Rating Scale",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "CPOT(Critical-Care Pain Observation Tool",
                "label": "CPOT(Critical-Care Pain Observation Tool",
                "allowFreeText": false,
                "displayOrder": 4
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r3_f5",
            "label": "통증 강도",
            "type": "number",
            "description": "입원 시 통증 초기평가를 수행한다",
            "aiHint": "통증 강도 (수치형, 0-10점 선택)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 3,
            "sourceDefinition": "통증 강도 (수치형, 0-10점 선택)",
            "displayOrder": 5,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r3_f6",
            "label": "통증양상",
            "type": "single_select",
            "description": "입원 시 통증 초기평가를 수행한다",
            "aiHint": "통증양상(범주형 - 둔함/쑤심/퍼짐/예리함/찌르는듯함/기타) & if 기타 ==",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 3,
            "sourceDefinition": "통증양상(범주형 - 둔함/쑤심/퍼짐/예리함/찌르는듯함/기타) & if 기타 ==",
            "displayOrder": 6,
            "options": [
              {
                "optionKey": "둔함",
                "label": "둔함",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "쑤심",
                "label": "쑤심",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "퍼짐",
                "label": "퍼짐",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "예리함",
                "label": "예리함",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "찌르는듯함",
                "label": "찌르는듯함",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 6
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r3_f7",
            "label": "yes",
            "type": "text_long",
            "description": "입원 시 통증 초기평가를 수행한다",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 3,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 7,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r3_f8",
            "label": "시작시기",
            "type": "text_long",
            "description": "입원 시 통증 초기평가를 수행한다",
            "aiHint": "시작시기(자유서술형)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 3,
            "sourceDefinition": "시작시기(자유서술형)",
            "displayOrder": 8,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r3_f9",
            "label": "빈도",
            "type": "single_select",
            "description": "입원 시 통증 초기평가를 수행한다",
            "aiHint": "빈도(범주형 - 지속적/간헐적) & if 간헐적 ==",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 3,
            "sourceDefinition": "빈도(범주형 - 지속적/간헐적) & if 간헐적 ==",
            "displayOrder": 9,
            "options": [
              {
                "optionKey": "지속적",
                "label": "지속적",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "간헐적",
                "label": "간헐적",
                "allowFreeText": false,
                "displayOrder": 2
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r3_f10",
            "label": "yes",
            "type": "text_long",
            "description": "입원 시 통증 초기평가를 수행한다",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 3,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 10,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r3_f11",
            "label": "지속기간",
            "type": "text_long",
            "description": "입원 시 통증 초기평가를 수행한다",
            "aiHint": "지속기간(자유서술형)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 3,
            "sourceDefinition": "지속기간(자유서술형)",
            "displayOrder": 11,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r3_f12",
            "label": "악화요인",
            "type": "text_long",
            "description": "입원 시 통증 초기평가를 수행한다",
            "aiHint": "악화요인(자유서술형)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 3,
            "sourceDefinition": "악화요인(자유서술형)",
            "displayOrder": 12,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r3_f13",
            "label": "완화요인",
            "type": "text_long",
            "description": "입원 시 통증 초기평가를 수행한다",
            "aiHint": "완화요인(자유서술형)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 3,
            "sourceDefinition": "완화요인(자유서술형)",
            "displayOrder": 13,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "퇴원",
        "title": "퇴원",
        "displayOrder": 2,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r4_f1",
            "label": "퇴원 후 보호자",
            "type": "single_select",
            "description": "입원시점에 환자의 상태에 따라 퇴원계획을 수립하고, 이를 기록한다.",
            "aiHint": "퇴원 후 보호자(범주형 - 배우자/부/모/자녀/조부/조모/형제/자매/간병인/기타/없음)",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 4,
            "sourceDefinition": "퇴원 후 보호자(범주형 - 배우자/부/모/자녀/조부/조모/형제/자매/간병인/기타/없음)",
            "displayOrder": 1,
            "options": [
              {
                "optionKey": "배우자",
                "label": "배우자",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "부",
                "label": "부",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "모",
                "label": "모",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "자녀",
                "label": "자녀",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "조부",
                "label": "조부",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "조모",
                "label": "조모",
                "allowFreeText": false,
                "displayOrder": 6
              },
              {
                "optionKey": "형제",
                "label": "형제",
                "allowFreeText": false,
                "displayOrder": 7
              },
              {
                "optionKey": "자매",
                "label": "자매",
                "allowFreeText": false,
                "displayOrder": 8
              },
              {
                "optionKey": "간병인",
                "label": "간병인",
                "allowFreeText": false,
                "displayOrder": 9
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 10
              },
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 11
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r5_f1",
            "label": "퇴원 예정지",
            "type": "single_select",
            "description": "입원시점에 환자의 상태에 따라 퇴원계획을 수립하고, 이를 기록한다.",
            "aiHint": "퇴원 예정지(범주형 - 자택/친척집/타병원/요양 시설/기타) if 기타 ==",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 5,
            "sourceDefinition": "퇴원 예정지(범주형 - 자택/친척집/타병원/요양 시설/기타) if 기타 ==",
            "displayOrder": 2,
            "options": [
              {
                "optionKey": "자택",
                "label": "자택",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "친척집",
                "label": "친척집",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "타병원",
                "label": "타병원",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "요양 시설",
                "label": "요양 시설",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 5
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r5_f2",
            "label": "yes",
            "type": "text_long",
            "description": "입원시점에 환자의 상태에 따라 퇴원계획을 수립하고, 이를 기록한다.",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 5,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 3,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r6_f1",
            "label": "퇴원 예정 교통 수단",
            "type": "single_select",
            "description": "입원시점에 환자의 상태에 따라 퇴원계획을 수립하고, 이를 기록한다.",
            "aiHint": "퇴원 예정 교통 수단(범주형 - 자가/대중 교통/항공/구급차/기타) & if 기타 ==",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 6,
            "sourceDefinition": "퇴원 예정 교통 수단(범주형 - 자가/대중 교통/항공/구급차/기타) & if 기타 ==",
            "displayOrder": 4,
            "options": [
              {
                "optionKey": "자가",
                "label": "자가",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "대중 교통",
                "label": "대중 교통",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "항공",
                "label": "항공",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "구급차",
                "label": "구급차",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 5
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r6_f2",
            "label": "yes",
            "type": "text_long",
            "description": "입원시점에 환자의 상태에 따라 퇴원계획을 수립하고, 이를 기록한다.",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 6,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 5,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "영양-상태-작성-시-영양팀으로-전송",
        "title": "영양 상태 - 작성 시 영양팀으로 전송",
        "displayOrder": 3,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r8_f1",
            "label": "1개월간 체중변화",
            "type": "single_select",
            "description": "영양관리 규정이 있다. (임상영양관리 지침 : 환자의 영양평가)",
            "aiHint": "1개월간 체중변화(범주형 - 없음/증가함/감소함)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 8,
            "sourceDefinition": "1개월간 체중변화(범주형 - 없음/증가함/감소함)",
            "displayOrder": 1,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "증가함",
                "label": "증가함",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "감소함",
                "label": "감소함",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r9_f1",
            "label": "최근 1주일간 식사량 변화",
            "type": "single_select",
            "description": "영양관리 규정이 있다. (임상영양관리 지침 : 환자의 영양평가)",
            "aiHint": "최근 1주일간 식사량 변화(범주형 - 없음/증가/감소)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 9,
            "sourceDefinition": "최근 1주일간 식사량 변화(범주형 - 없음/증가/감소)",
            "displayOrder": 2,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "증가",
                "label": "증가",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "감소",
                "label": "감소",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r10_f1",
            "label": "식이 주의 사항",
            "type": "single_select",
            "description": "영양관리 규정이 있다. (임상영양관리 지침 : 환자의 영양평가)",
            "aiHint": "식이 주의 사항(범주형 - 없음/열량 조절/체중 조절/염분 제한/수분 제한/단백질 제한/지방 제한/기타) & if 기타 ==",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 10,
            "sourceDefinition": "식이 주의 사항(범주형 - 없음/열량 조절/체중 조절/염분 제한/수분 제한/단백질 제한/지방 제한/기타) & if 기타 ==",
            "displayOrder": 3,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "열량 조절",
                "label": "열량 조절",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "체중 조절",
                "label": "체중 조절",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "염분 제한",
                "label": "염분 제한",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "수분 제한",
                "label": "수분 제한",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "단백질 제한",
                "label": "단백질 제한",
                "allowFreeText": false,
                "displayOrder": 6
              },
              {
                "optionKey": "지방 제한",
                "label": "지방 제한",
                "allowFreeText": false,
                "displayOrder": 7
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 8
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r10_f2",
            "label": "yes",
            "type": "text_long",
            "description": "영양관리 규정이 있다. (임상영양관리 지침 : 환자의 영양평가)",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 10,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 4,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "현병력-의사-입원기록-참고해서-작성",
        "title": "현병력 - 의사 입원기록 참고해서 작성",
        "displayOrder": 4,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r11_f1",
            "label": "주 증상 및 내원 과정",
            "type": "text_long",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "주 증상 및 내원 과정(자유서술형)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 11,
            "sourceDefinition": "주 증상 및 내원 과정(자유서술형)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r12_f1",
            "label": "주 증상 및 내원 과정",
            "type": "text_long",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "주 증상 및 내원 과정(자유서술형)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 12,
            "sourceDefinition": "주 증상 및 내원 과정(자유서술형)",
            "displayOrder": 2,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "과거력",
        "title": "과거력",
        "displayOrder": 5,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r13_f1",
            "label": "입원시 진단명 및 수술명/입원 및 수술 시기",
            "type": "text_long",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "입원시 진단명 및 수술명/입원 및 수술 시기(자유서술형)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 13,
            "sourceDefinition": "입원시 진단명 및 수술명/입원 및 수술 시기(자유서술형)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r14_f1",
            "label": "가족력",
            "type": "single_select",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "가족력(범주형 - 없음/있음/기타) & if 기타 ==",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 14,
            "sourceDefinition": "가족력(범주형 - 없음/있음/기타) & if 기타 ==",
            "displayOrder": 2,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "있음",
                "label": "있음",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r14_f2",
            "label": "yes",
            "type": "text_long",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 14,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 3,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r15_f1",
            "label": "가족력",
            "type": "single_select",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "가족력(범주형 - 없음/있음/기타) & if 기타 ==",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 15,
            "sourceDefinition": "가족력(범주형 - 없음/있음/기타) & if 기타 ==",
            "displayOrder": 4,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "있음",
                "label": "있음",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r15_f2",
            "label": "yes",
            "type": "text_long",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 15,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 5,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r16_f1",
            "label": "가족력",
            "type": "single_select",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "가족력(범주형 - 없음/있음/기타) & if 기타 ==",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 16,
            "sourceDefinition": "가족력(범주형 - 없음/있음/기타) & if 기타 ==",
            "displayOrder": 6,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "있음",
                "label": "있음",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r16_f2",
            "label": "yes",
            "type": "text_long",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 16,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 7,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r17_f1",
            "label": "가족력",
            "type": "single_select",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "가족력(범주형 - 없음/있음/기타) & if 기타 ==",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 17,
            "sourceDefinition": "가족력(범주형 - 없음/있음/기타) & if 기타 ==",
            "displayOrder": 8,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "있음",
                "label": "있음",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r17_f2",
            "label": "yes",
            "type": "text_long",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 17,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 9,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r18_f1",
            "label": "가족력",
            "type": "single_select",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "가족력(범주형 - 없음/있음/기타) & if 기타 ==",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 18,
            "sourceDefinition": "가족력(범주형 - 없음/있음/기타) & if 기타 ==",
            "displayOrder": 10,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "있음",
                "label": "있음",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r18_f2",
            "label": "yes",
            "type": "text_long",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 18,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 11,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r19_f1",
            "label": "입원 및 수술 이력",
            "type": "single_select",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "입원 및 수술 이력(범주형 - 없음/있음/알 수 없음) & if 있음 == yes (입원시 진단명 및 수술명/입원 및 수술 시기 - 자유서술형)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 19,
            "sourceDefinition": "입원 및 수술 이력(범주형 - 없음/있음/알 수 없음) & if 있음 == yes (입원시 진단명 및 수술명/입원 및 수술 시기 - 자유서술형)",
            "displayOrder": 12,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "있음",
                "label": "있음",
                "allowFreeText": true,
                "displayOrder": 2
              },
              {
                "optionKey": "알 수 없음",
                "label": "알 수 없음",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": [
              {
                "conditionType": "free_text_when_option",
                "triggerFieldKey": "r19_f1",
                "triggerOptionKey": "있음",
                "targetFieldKey": "r19_f1_free_text"
              }
            ]
          },
          {
            "fieldKey": "r20_f1",
            "label": "입원 및 수술 이력",
            "type": "single_select",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "입원 및 수술 이력(범주형 - 없음/있음/알 수 없음) & if 있음 == yes (입원시 진단명 및 수술명/입원 및 수술 시기 - 자유서술형)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 20,
            "sourceDefinition": "입원 및 수술 이력(범주형 - 없음/있음/알 수 없음) & if 있음 == yes (입원시 진단명 및 수술명/입원 및 수술 시기 - 자유서술형)",
            "displayOrder": 13,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "있음",
                "label": "있음",
                "allowFreeText": true,
                "displayOrder": 2
              },
              {
                "optionKey": "알 수 없음",
                "label": "알 수 없음",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": [
              {
                "conditionType": "free_text_when_option",
                "triggerFieldKey": "r20_f1",
                "triggerOptionKey": "있음",
                "targetFieldKey": "r20_f1_free_text"
              }
            ]
          },
          {
            "fieldKey": "r23_f1",
            "label": "과거병력",
            "type": "single_select",
            "description": "",
            "aiHint": "과거병력(범주형 - 없음/있음/고혈압/당뇨/결핵/암/간염/경련/기타) & if 기타 ==",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 23,
            "sourceDefinition": "과거병력(범주형 - 없음/있음/고혈압/당뇨/결핵/암/간염/경련/기타) & if 기타 ==",
            "displayOrder": 14,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "있음",
                "label": "있음",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "고혈압",
                "label": "고혈압",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "당뇨",
                "label": "당뇨",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "결핵",
                "label": "결핵",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "암",
                "label": "암",
                "allowFreeText": false,
                "displayOrder": 6
              },
              {
                "optionKey": "간염",
                "label": "간염",
                "allowFreeText": false,
                "displayOrder": 7
              },
              {
                "optionKey": "경련",
                "label": "경련",
                "allowFreeText": false,
                "displayOrder": 8
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 9
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r23_f2",
            "label": "yes",
            "type": "text_long",
            "description": "",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 23,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 15,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r27_f1",
            "label": "Allergy",
            "type": "single_select",
            "description": "",
            "aiHint": "Allergy(범주형 - 없음/약/식품) & if 약 == yes; 의약품부작용보고 화면으로 자동 이동 후 투약내역(약품명/용량/횟수/일수/투약기간 시작일/투약기간 종료일/조제구역 - 자유서술형)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "Allergy(범주형 - 없음/약/식품) & if 약 == yes; 의약품부작용보고 화면으로 자동 이동 후 투약내역(약품명/용량/횟수/일수/투약기간 시작일/투약기간 종료일/조제구역 - 자유서술형)",
            "displayOrder": 16,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "약",
                "label": "약",
                "allowFreeText": true,
                "displayOrder": 2
              },
              {
                "optionKey": "식품",
                "label": "식품",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": [
              {
                "conditionType": "free_text_when_option",
                "triggerFieldKey": "r27_f1",
                "triggerOptionKey": "약",
                "targetFieldKey": "r27_f1_free_text"
              }
            ]
          },
          {
            "fieldKey": "r27_f2",
            "label": "부작용>전신반응",
            "type": "single_select",
            "description": "",
            "aiHint": "부작용>전신반응(범주형 - 발열/전신쇠약/무기력증/말초부종/전신부종/독감유사증후근/아나필락시스/약물과민반응/체중감소/체중증가)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "부작용>전신반응(범주형 - 발열/전신쇠약/무기력증/말초부종/전신부종/독감유사증후근/아나필락시스/약물과민반응/체중감소/체중증가)",
            "displayOrder": 17,
            "options": [
              {
                "optionKey": "발열",
                "label": "발열",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "전신쇠약",
                "label": "전신쇠약",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "무기력증",
                "label": "무기력증",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "말초부종",
                "label": "말초부종",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "전신부종",
                "label": "전신부종",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "독감유사증후근",
                "label": "독감유사증후근",
                "allowFreeText": false,
                "displayOrder": 6
              },
              {
                "optionKey": "아나필락시스",
                "label": "아나필락시스",
                "allowFreeText": false,
                "displayOrder": 7
              },
              {
                "optionKey": "약물과민반응",
                "label": "약물과민반응",
                "allowFreeText": false,
                "displayOrder": 8
              },
              {
                "optionKey": "체중감소",
                "label": "체중감소",
                "allowFreeText": false,
                "displayOrder": 9
              },
              {
                "optionKey": "체중증가",
                "label": "체중증가",
                "allowFreeText": false,
                "displayOrder": 10
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f3",
            "label": "부작용>피부",
            "type": "single_select",
            "description": "",
            "aiHint": "부작용>피부(범주형 - 가려움증/두드러기/혈관부종/발진/여드름성 발진/수족증후군/주사부위반응/정맥염/스티븐스존슨증후군/독성표피괴사용해/피부변색/피부박리/수포/습진/탈모)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "부작용>피부(범주형 - 가려움증/두드러기/혈관부종/발진/여드름성 발진/수족증후군/주사부위반응/정맥염/스티븐스존슨증후군/독성표피괴사용해/피부변색/피부박리/수포/습진/탈모)",
            "displayOrder": 18,
            "options": [
              {
                "optionKey": "가려움증",
                "label": "가려움증",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "두드러기",
                "label": "두드러기",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "혈관부종",
                "label": "혈관부종",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "발진",
                "label": "발진",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "여드름성 발진",
                "label": "여드름성 발진",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "수족증후군",
                "label": "수족증후군",
                "allowFreeText": false,
                "displayOrder": 6
              },
              {
                "optionKey": "주사부위반응",
                "label": "주사부위반응",
                "allowFreeText": false,
                "displayOrder": 7
              },
              {
                "optionKey": "정맥염",
                "label": "정맥염",
                "allowFreeText": false,
                "displayOrder": 8
              },
              {
                "optionKey": "스티븐스존슨증후군",
                "label": "스티븐스존슨증후군",
                "allowFreeText": false,
                "displayOrder": 9
              },
              {
                "optionKey": "독성표피괴사용해",
                "label": "독성표피괴사용해",
                "allowFreeText": false,
                "displayOrder": 10
              },
              {
                "optionKey": "피부변색",
                "label": "피부변색",
                "allowFreeText": false,
                "displayOrder": 11
              },
              {
                "optionKey": "피부박리",
                "label": "피부박리",
                "allowFreeText": false,
                "displayOrder": 12
              },
              {
                "optionKey": "수포",
                "label": "수포",
                "allowFreeText": false,
                "displayOrder": 13
              },
              {
                "optionKey": "습진",
                "label": "습진",
                "allowFreeText": false,
                "displayOrder": 14
              },
              {
                "optionKey": "탈모",
                "label": "탈모",
                "allowFreeText": false,
                "displayOrder": 15
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f4",
            "label": "부작용>두경부",
            "type": "single_select",
            "description": "",
            "aiHint": "부작용>두경부(범주형 - 구내염/입마름증/목소리 변경/미각장애/안면홍조/시각장애/안압상승/귀울림/청력장애/얼굴부종/구강칸디다증)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "부작용>두경부(범주형 - 구내염/입마름증/목소리 변경/미각장애/안면홍조/시각장애/안압상승/귀울림/청력장애/얼굴부종/구강칸디다증)",
            "displayOrder": 19,
            "options": [
              {
                "optionKey": "구내염",
                "label": "구내염",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "입마름증",
                "label": "입마름증",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "목소리 변경",
                "label": "목소리 변경",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "미각장애",
                "label": "미각장애",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "안면홍조",
                "label": "안면홍조",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "시각장애",
                "label": "시각장애",
                "allowFreeText": false,
                "displayOrder": 6
              },
              {
                "optionKey": "안압상승",
                "label": "안압상승",
                "allowFreeText": false,
                "displayOrder": 7
              },
              {
                "optionKey": "귀울림",
                "label": "귀울림",
                "allowFreeText": false,
                "displayOrder": 8
              },
              {
                "optionKey": "청력장애",
                "label": "청력장애",
                "allowFreeText": false,
                "displayOrder": 9
              },
              {
                "optionKey": "얼굴부종",
                "label": "얼굴부종",
                "allowFreeText": false,
                "displayOrder": 10
              },
              {
                "optionKey": "구강칸디다증",
                "label": "구강칸디다증",
                "allowFreeText": false,
                "displayOrder": 11
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f5",
            "label": "부작용>심혈관",
            "type": "single_select",
            "description": "",
            "aiHint": "부작용>심혈관(범주형 - 가슴고통/부정맥/심계항진/느린 맥/빠른 맥/저혈압/혈압상승/실신/심근병증) 부작용>간",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "부작용>심혈관(범주형 - 가슴고통/부정맥/심계항진/느린 맥/빠른 맥/저혈압/혈압상승/실신/심근병증) 부작용>간",
            "displayOrder": 20,
            "options": [
              {
                "optionKey": "가슴고통",
                "label": "가슴고통",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "부정맥",
                "label": "부정맥",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "심계항진",
                "label": "심계항진",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "느린 맥",
                "label": "느린 맥",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "빠른 맥",
                "label": "빠른 맥",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "저혈압",
                "label": "저혈압",
                "allowFreeText": false,
                "displayOrder": 6
              },
              {
                "optionKey": "혈압상승",
                "label": "혈압상승",
                "allowFreeText": false,
                "displayOrder": 7
              },
              {
                "optionKey": "실신",
                "label": "실신",
                "allowFreeText": false,
                "displayOrder": 8
              },
              {
                "optionKey": "심근병증",
                "label": "심근병증",
                "allowFreeText": false,
                "displayOrder": 9
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f6",
            "label": "췌담도",
            "type": "single_select",
            "description": "",
            "aiHint": "췌담도(범주형 - 간염/간효소 증가/빌리루빈 증가/췌장염)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "췌담도(범주형 - 간염/간효소 증가/빌리루빈 증가/췌장염)",
            "displayOrder": 21,
            "options": [
              {
                "optionKey": "간염",
                "label": "간염",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "간효소 증가",
                "label": "간효소 증가",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "빌리루빈 증가",
                "label": "빌리루빈 증가",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "췌장염",
                "label": "췌장염",
                "allowFreeText": false,
                "displayOrder": 4
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f7",
            "label": "부작용>호흡기",
            "type": "single_select",
            "description": "",
            "aiHint": "부작용>호흡기(범주형 - 기침/폐부종/호흡곤란/폐렴)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "부작용>호흡기(범주형 - 기침/폐부종/호흡곤란/폐렴)",
            "displayOrder": 22,
            "options": [
              {
                "optionKey": "기침",
                "label": "기침",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "폐부종",
                "label": "폐부종",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "호흡곤란",
                "label": "호흡곤란",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "폐렴",
                "label": "폐렴",
                "allowFreeText": false,
                "displayOrder": 4
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f8",
            "label": "부작용>혈액-전해질",
            "type": "single_select",
            "description": "",
            "aiHint": "부작용>혈액-전해질(범주형 - 백혈구감소증/응고장애/빈혈/혈소판감소증/호산구증가증/고칼륨혈증/저칼륨혈증/혈당증가/전해질이상/저나트륨혈증)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "부작용>혈액-전해질(범주형 - 백혈구감소증/응고장애/빈혈/혈소판감소증/호산구증가증/고칼륨혈증/저칼륨혈증/혈당증가/전해질이상/저나트륨혈증)",
            "displayOrder": 23,
            "options": [
              {
                "optionKey": "백혈구감소증",
                "label": "백혈구감소증",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "응고장애",
                "label": "응고장애",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "빈혈",
                "label": "빈혈",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "혈소판감소증",
                "label": "혈소판감소증",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "호산구증가증",
                "label": "호산구증가증",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "고칼륨혈증",
                "label": "고칼륨혈증",
                "allowFreeText": false,
                "displayOrder": 6
              },
              {
                "optionKey": "저칼륨혈증",
                "label": "저칼륨혈증",
                "allowFreeText": false,
                "displayOrder": 7
              },
              {
                "optionKey": "혈당증가",
                "label": "혈당증가",
                "allowFreeText": false,
                "displayOrder": 8
              },
              {
                "optionKey": "전해질이상",
                "label": "전해질이상",
                "allowFreeText": false,
                "displayOrder": 9
              },
              {
                "optionKey": "저나트륨혈증",
                "label": "저나트륨혈증",
                "allowFreeText": false,
                "displayOrder": 10
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f9",
            "label": "부작용>신장",
            "type": "single_select",
            "description": "",
            "aiHint": "부작용>신장(범주형 - 단백뇨/신기능장애/혈중크레아티닌증가/혈뇨/BUN증가)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "부작용>신장(범주형 - 단백뇨/신기능장애/혈중크레아티닌증가/혈뇨/BUN증가)",
            "displayOrder": 24,
            "options": [
              {
                "optionKey": "단백뇨",
                "label": "단백뇨",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "신기능장애",
                "label": "신기능장애",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "혈중크레아티닌증가",
                "label": "혈중크레아티닌증가",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "혈뇨",
                "label": "혈뇨",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "BUN증가",
                "label": "BUN증가",
                "allowFreeText": false,
                "displayOrder": 5
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f10",
            "label": "부작용>신경",
            "type": "single_select",
            "description": "",
            "aiHint": "부작용>신경(범주형 - 두통/졸림/어지러움/사지떨림/경련/신경병증/피부저림/추체외로장애/운동이상증/의식저하/언어장애/보행 어려움/기억력장애)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "부작용>신경(범주형 - 두통/졸림/어지러움/사지떨림/경련/신경병증/피부저림/추체외로장애/운동이상증/의식저하/언어장애/보행 어려움/기억력장애)",
            "displayOrder": 25,
            "options": [
              {
                "optionKey": "두통",
                "label": "두통",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "졸림",
                "label": "졸림",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "어지러움",
                "label": "어지러움",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "사지떨림",
                "label": "사지떨림",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "경련",
                "label": "경련",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "신경병증",
                "label": "신경병증",
                "allowFreeText": false,
                "displayOrder": 6
              },
              {
                "optionKey": "피부저림",
                "label": "피부저림",
                "allowFreeText": false,
                "displayOrder": 7
              },
              {
                "optionKey": "추체외로장애",
                "label": "추체외로장애",
                "allowFreeText": false,
                "displayOrder": 8
              },
              {
                "optionKey": "운동이상증",
                "label": "운동이상증",
                "allowFreeText": false,
                "displayOrder": 9
              },
              {
                "optionKey": "의식저하",
                "label": "의식저하",
                "allowFreeText": false,
                "displayOrder": 10
              },
              {
                "optionKey": "언어장애",
                "label": "언어장애",
                "allowFreeText": false,
                "displayOrder": 11
              },
              {
                "optionKey": "보행 어려움",
                "label": "보행 어려움",
                "allowFreeText": false,
                "displayOrder": 12
              },
              {
                "optionKey": "기억력장애",
                "label": "기억력장애",
                "allowFreeText": false,
                "displayOrder": 13
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f11",
            "label": "부작용>정신",
            "type": "single_select",
            "description": "",
            "aiHint": "부작용>정신(범주형 - 불면증/불안/섬망/우울/과다행동)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "부작용>정신(범주형 - 불면증/불안/섬망/우울/과다행동)",
            "displayOrder": 26,
            "options": [
              {
                "optionKey": "불면증",
                "label": "불면증",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "불안",
                "label": "불안",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "섬망",
                "label": "섬망",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "우울",
                "label": "우울",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "과다행동",
                "label": "과다행동",
                "allowFreeText": false,
                "displayOrder": 5
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f12",
            "label": "부작용>근골격계",
            "type": "single_select",
            "description": "",
            "aiHint": "부작용>근골격계(범주형 - 근육통/관절통/골다공증/근육강직/CK증가/턱뼈괴사)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "부작용>근골격계(범주형 - 근육통/관절통/골다공증/근육강직/CK증가/턱뼈괴사)",
            "displayOrder": 27,
            "options": [
              {
                "optionKey": "근육통",
                "label": "근육통",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "관절통",
                "label": "관절통",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "골다공증",
                "label": "골다공증",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "근육강직",
                "label": "근육강직",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "CK증가",
                "label": "CK증가",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "턱뼈괴사",
                "label": "턱뼈괴사",
                "allowFreeText": false,
                "displayOrder": 6
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f13",
            "label": "부작용>비뇨기계",
            "type": "single_select",
            "description": "",
            "aiHint": "부작용>비뇨기계(범주형 - 배뇨장애/성기능이상/성욕감소)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "부작용>비뇨기계(범주형 - 배뇨장애/성기능이상/성욕감소)",
            "displayOrder": 28,
            "options": [
              {
                "optionKey": "배뇨장애",
                "label": "배뇨장애",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "성기능이상",
                "label": "성기능이상",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "성욕감소",
                "label": "성욕감소",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f14",
            "label": "부작용>기타",
            "type": "text_long",
            "description": "",
            "aiHint": "부작용>기타(자유서술형 - 기타증상) elseif 식품 == yes; 식품 알러지 관리 화면으로 이동 후 식품내역>곡류/",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "부작용>기타(자유서술형 - 기타증상) elseif 식품 == yes; 식품 알러지 관리 화면으로 이동 후 식품내역>곡류/",
            "displayOrder": 29,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r27_f15",
            "label": "콩류",
            "type": "single_select",
            "description": "",
            "aiHint": "콩류(범주형 - 메밀/밀가루/콩류) 식품내역>육류/해산물/난류(갑각류(새우, 게 등)/고등어/달걀/닭고기/돼지고기/등푸른 생선/조개류(굴 등)) 식품내역>채소/과일류(마/망고/버섯류/복숭아/사과/오이/자두/키위/토마토) 식품내역>유제품/견과류 등(들깨/땅콩/우유 및 유제품/호두/기타) & if 기타 ==",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "콩류(범주형 - 메밀/밀가루/콩류) 식품내역>육류/해산물/난류(갑각류(새우, 게 등)/고등어/달걀/닭고기/돼지고기/등푸른 생선/조개류(굴 등)) 식품내역>채소/과일류(마/망고/버섯류/복숭아/사과/오이/자두/키위/토마토) 식품내역>유제품/견과류 등(들깨/땅콩/우유 및 유제품/호두/기타) & if 기타 ==",
            "displayOrder": 30,
            "options": [
              {
                "optionKey": "메밀",
                "label": "메밀",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "밀가루",
                "label": "밀가루",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "콩류",
                "label": "콩류",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f16",
            "label": "yes",
            "type": "text_long",
            "description": "",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 31,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r27_f17",
            "label": "이상반응>증상발현일",
            "type": "date",
            "description": "",
            "aiHint": "이상반응>증상발현일(날짜형)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "이상반응>증상발현일(날짜형)",
            "displayOrder": 32,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r27_f18",
            "label": "이상반응>전신반응",
            "type": "single_select",
            "description": "",
            "aiHint": "이상반응>전신반응(범주형 - 아나필라시스)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "이상반응>전신반응(범주형 - 아나필라시스)",
            "displayOrder": 33,
            "options": [
              {
                "optionKey": "아나필라시스",
                "label": "아나필라시스",
                "allowFreeText": false,
                "displayOrder": 1
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f19",
            "label": "이상반응>피부",
            "type": "single_select",
            "description": "",
            "aiHint": "이상반응>피부(범주형 - 피부/두드러기/가려움증/혈관부종)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "이상반응>피부(범주형 - 피부/두드러기/가려움증/혈관부종)",
            "displayOrder": 34,
            "options": [
              {
                "optionKey": "피부",
                "label": "피부",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "두드러기",
                "label": "두드러기",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "가려움증",
                "label": "가려움증",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "혈관부종",
                "label": "혈관부종",
                "allowFreeText": false,
                "displayOrder": 4
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f20",
            "label": "이상반응>호흡기",
            "type": "single_select",
            "description": "",
            "aiHint": "이상반응>호흡기(범주형 - 기침/천명/그렁거림/호흡곤란)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "이상반응>호흡기(범주형 - 기침/천명/그렁거림/호흡곤란)",
            "displayOrder": 35,
            "options": [
              {
                "optionKey": "기침",
                "label": "기침",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "천명",
                "label": "천명",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "그렁거림",
                "label": "그렁거림",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "호흡곤란",
                "label": "호흡곤란",
                "allowFreeText": false,
                "displayOrder": 4
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f21",
            "label": "이상반응>심혈관",
            "type": "single_select",
            "description": "",
            "aiHint": "이상반응>심혈관(범주형 - 저혈압/실신)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "이상반응>심혈관(범주형 - 저혈압/실신)",
            "displayOrder": 36,
            "options": [
              {
                "optionKey": "저혈압",
                "label": "저혈압",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "실신",
                "label": "실신",
                "allowFreeText": false,
                "displayOrder": 2
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f22",
            "label": "이상반응>위장관",
            "type": "single_select",
            "description": "",
            "aiHint": "이상반응>위장관(범주형 -복통/설사/구토)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "이상반응>위장관(범주형 -복통/설사/구토)",
            "displayOrder": 37,
            "options": [
              {
                "optionKey": "복통",
                "label": "복통",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "설사",
                "label": "설사",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "구토",
                "label": "구토",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r27_f23",
            "label": "이상반응>기타",
            "type": "text_long",
            "description": "",
            "aiHint": "이상반응>기타(자유서술형)",
            "inputSources": [
              "STT",
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "이상반응>기타(자유서술형)",
            "displayOrder": 38,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r28_f1",
            "label": "음주력",
            "type": "single_select",
            "description": "",
            "aiHint": "음주력(범주형 - nondrinker/ex-drinker/current drinker) & if ex-drinker or current drinker == yes (음주력(종류/양/횟수/wk)/음주 시작 시기/끊은 시기 - 자유서술형 입력)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 28,
            "sourceDefinition": "음주력(범주형 - nondrinker/ex-drinker/current drinker) & if ex-drinker or current drinker == yes (음주력(종류/양/횟수/wk)/음주 시작 시기/끊은 시기 - 자유서술형 입력)",
            "displayOrder": 39,
            "options": [
              {
                "optionKey": "nondrinker",
                "label": "nondrinker",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "ex-drinker",
                "label": "ex-drinker",
                "allowFreeText": true,
                "displayOrder": 2
              },
              {
                "optionKey": "current drinker",
                "label": "current drinker",
                "allowFreeText": true,
                "displayOrder": 3
              }
            ],
            "conditions": [
              {
                "conditionType": "free_text_when_option",
                "triggerFieldKey": "r28_f1",
                "triggerOptionKey": "ex-drinker",
                "targetFieldKey": "r28_f1_free_text"
              },
              {
                "conditionType": "free_text_when_option",
                "triggerFieldKey": "r28_f1",
                "triggerOptionKey": "current drinker",
                "targetFieldKey": "r28_f1_free_text"
              }
            ]
          },
          {
            "fieldKey": "r29_f1",
            "label": "흡연력",
            "type": "single_select",
            "description": "",
            "aiHint": "흡연력(범주형 - nonsmoker/ex-smoker/current smoker) & if ex-smoker or current smoker == yes (하루의 흡연량 ( )갑/일/흡연 시작시기/끊은 시기 - 자유서술형)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 29,
            "sourceDefinition": "흡연력(범주형 - nonsmoker/ex-smoker/current smoker) & if ex-smoker or current smoker == yes (하루의 흡연량 ( )갑/일/흡연 시작시기/끊은 시기 - 자유서술형)",
            "displayOrder": 40,
            "options": [
              {
                "optionKey": "nonsmoker",
                "label": "nonsmoker",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "ex-smoker",
                "label": "ex-smoker",
                "allowFreeText": true,
                "displayOrder": 2
              },
              {
                "optionKey": "current smoker",
                "label": "current smoker",
                "allowFreeText": true,
                "displayOrder": 3
              }
            ],
            "conditions": [
              {
                "conditionType": "free_text_when_option",
                "triggerFieldKey": "r29_f1",
                "triggerOptionKey": "ex-smoker",
                "targetFieldKey": "r29_f1_free_text"
              },
              {
                "conditionType": "free_text_when_option",
                "triggerFieldKey": "r29_f1",
                "triggerOptionKey": "current smoker",
                "targetFieldKey": "r29_f1_free_text"
              }
            ]
          }
        ]
      },
      {
        "sectionKey": "현병력",
        "title": "현병력",
        "displayOrder": 6,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r21_f1",
            "label": "복용중인 약",
            "type": "computed",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "복용중인 약(범주형 - 없음/있음)",
            "inputSources": [
              "EMR",
              "IMAGE",
              "AUTO"
            ],
            "sourceRow": 21,
            "sourceDefinition": "복용중인 약(범주형 - 없음/있음)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r22_f1",
            "label": "투약 상태",
            "type": "computed",
            "description": "간호 초기평가 : 일반정보(성별, 나이 등), 입원정보(주호소, 입원동기, 입원경로 등), 가족력, 최근 투약력, 입원 및 수술 경험, 알러지 여부, 신체사정, 문화적ㆍ종교적 특수성 등을 작성한다.",
            "aiHint": "투약 상태(자유서술형 - 약품명/1회 투여량/1회 투여단위/횟수/용법 및 투여시간/약품 코드/유효함량)",
            "inputSources": [
              "EMR",
              "IMAGE",
              "AUTO"
            ],
            "sourceRow": 22,
            "sourceDefinition": "투약 상태(자유서술형 - 약품명/1회 투여량/1회 투여단위/횟수/용법 및 투여시간/약품 코드/유효함량)",
            "displayOrder": 2,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "일반정보",
        "title": "일반정보",
        "displayOrder": 7,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r24_f1",
            "label": "결혼 상태",
            "type": "single_select",
            "description": "",
            "aiHint": "결혼 상태(범주형 - 미혼/기혼/별거/이혼/사별/해당 없음)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 24,
            "sourceDefinition": "결혼 상태(범주형 - 미혼/기혼/별거/이혼/사별/해당 없음)",
            "displayOrder": 1,
            "options": [
              {
                "optionKey": "미혼",
                "label": "미혼",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "기혼",
                "label": "기혼",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "별거",
                "label": "별거",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "이혼",
                "label": "이혼",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "사별",
                "label": "사별",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "해당 없음",
                "label": "해당 없음",
                "allowFreeText": false,
                "displayOrder": 6
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r25_f1",
            "label": "종교",
            "type": "single_select",
            "description": "",
            "aiHint": "종교(범주형 - 없음/기독교/천주교/불교/기타) & if 기타 ==",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 25,
            "sourceDefinition": "종교(범주형 - 없음/기독교/천주교/불교/기타) & if 기타 ==",
            "displayOrder": 2,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "기독교",
                "label": "기독교",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "천주교",
                "label": "천주교",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "불교",
                "label": "불교",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 5
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r25_f2",
            "label": "yes",
            "type": "text_long",
            "description": "",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 25,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 3,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r26_f1",
            "label": "원목 연락",
            "type": "single_select",
            "description": "",
            "aiHint": "원목 연락(범주형 - 원함/원하지 않음, 원하지 않음이 기본으로 체크되어 있음)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 26,
            "sourceDefinition": "원목 연락(범주형 - 원함/원하지 않음, 원하지 않음이 기본으로 체크되어 있음)",
            "displayOrder": 4,
            "options": [
              {
                "optionKey": "원함",
                "label": "원함",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "원하지 않음",
                "label": "원하지 않음",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "원하지 않음이 기본으로 체크되어 있음",
                "label": "원하지 않음이 기본으로 체크되어 있음",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r30_f1",
            "label": "보호자",
            "type": "single_select",
            "description": "",
            "aiHint": "보호자(범주형 - 없음/배우자/부/모/자녀/조부/조모/형제/자매/간병인/기타) & if 기타 ==",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 30,
            "sourceDefinition": "보호자(범주형 - 없음/배우자/부/모/자녀/조부/조모/형제/자매/간병인/기타) & if 기타 ==",
            "displayOrder": 5,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "배우자",
                "label": "배우자",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "부",
                "label": "부",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "모",
                "label": "모",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "자녀",
                "label": "자녀",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "조부",
                "label": "조부",
                "allowFreeText": false,
                "displayOrder": 6
              },
              {
                "optionKey": "조모",
                "label": "조모",
                "allowFreeText": false,
                "displayOrder": 7
              },
              {
                "optionKey": "형제",
                "label": "형제",
                "allowFreeText": false,
                "displayOrder": 8
              },
              {
                "optionKey": "자매",
                "label": "자매",
                "allowFreeText": false,
                "displayOrder": 9
              },
              {
                "optionKey": "간병인",
                "label": "간병인",
                "allowFreeText": false,
                "displayOrder": 10
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 11
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r30_f2",
            "label": "yes",
            "type": "text_long",
            "description": "",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT"
            ],
            "sourceRow": 30,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 6,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "신체사정",
        "title": "신체사정",
        "displayOrder": 8,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r31_f1",
            "label": "소화기계>소화기 관련증상",
            "type": "single_select",
            "description": "",
            "aiHint": "소화기계>소화기 관련증상(범주형 - 없음/있음) & if 있음 ==",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 31,
            "sourceDefinition": "소화기계>소화기 관련증상(범주형 - 없음/있음) & if 있음 ==",
            "displayOrder": 1,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "있음",
                "label": "있음",
                "allowFreeText": false,
                "displayOrder": 2
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r31_f2",
            "label": "yes",
            "type": "multi_select",
            "description": "",
            "aiHint": "yes (범주형 - 연하곤란/오심/구토/토혈/소화불량/속쓰림/통증/복부팽만/복수/기타) if 기타 ==",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 31,
            "sourceDefinition": "yes (범주형 - 연하곤란/오심/구토/토혈/소화불량/속쓰림/통증/복부팽만/복수/기타) if 기타 ==",
            "displayOrder": 2,
            "options": [
              {
                "optionKey": "연하곤란",
                "label": "연하곤란",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "오심",
                "label": "오심",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "구토",
                "label": "구토",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "토혈",
                "label": "토혈",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "소화불량",
                "label": "소화불량",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "속쓰림",
                "label": "속쓰림",
                "allowFreeText": false,
                "displayOrder": 6
              },
              {
                "optionKey": "통증",
                "label": "통증",
                "allowFreeText": false,
                "displayOrder": 7
              },
              {
                "optionKey": "복부팽만",
                "label": "복부팽만",
                "allowFreeText": false,
                "displayOrder": 8
              },
              {
                "optionKey": "복수",
                "label": "복수",
                "allowFreeText": false,
                "displayOrder": 9
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 10
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r31_f3",
            "label": "yes",
            "type": "text_long",
            "description": "",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 31,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 3,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r32_f1",
            "label": "호흡기계 >호흡기 관련증상",
            "type": "single_select",
            "description": "",
            "aiHint": "호흡기계 >호흡기 관련증상(범주형 - 없음/있음) & if 있음 == yes",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 32,
            "sourceDefinition": "호흡기계 >호흡기 관련증상(범주형 - 없음/있음) & if 있음 == yes",
            "displayOrder": 4,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "있음",
                "label": "있음",
                "allowFreeText": false,
                "displayOrder": 2
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r32_f2",
            "label": "호흡기 관련증상",
            "type": "single_select",
            "description": "",
            "aiHint": "호흡기 관련증상(범주형 - 호흡곤란/객담/기침/기좌호흡/기타) & if 기타 ==",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 32,
            "sourceDefinition": "호흡기 관련증상(범주형 - 호흡곤란/객담/기침/기좌호흡/기타) & if 기타 ==",
            "displayOrder": 5,
            "options": [
              {
                "optionKey": "호흡곤란",
                "label": "호흡곤란",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "객담",
                "label": "객담",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "기침",
                "label": "기침",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "기좌호흡",
                "label": "기좌호흡",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 5
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r32_f3",
            "label": "yes",
            "type": "text_long",
            "description": "",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 32,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 6,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r32_f4",
            "label": "객담 색",
            "type": "single_select",
            "description": "",
            "aiHint": "객담 색(범주형 - Clear/Yellow/Green/Creamy/Purulent/Blood)",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 32,
            "sourceDefinition": "객담 색(범주형 - Clear/Yellow/Green/Creamy/Purulent/Blood)",
            "displayOrder": 7,
            "options": [
              {
                "optionKey": "Clear",
                "label": "Clear",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "Yellow",
                "label": "Yellow",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "Green",
                "label": "Green",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "Creamy",
                "label": "Creamy",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "Purulent",
                "label": "Purulent",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "Blood",
                "label": "Blood",
                "allowFreeText": false,
                "displayOrder": 6
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r32_f5",
            "label": "객담 양",
            "type": "single_select",
            "description": "",
            "aiHint": "객담 양(범주형 - 소량/보통/많음)",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 32,
            "sourceDefinition": "객담 양(범주형 - 소량/보통/많음)",
            "displayOrder": 8,
            "options": [
              {
                "optionKey": "소량",
                "label": "소량",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "보통",
                "label": "보통",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "많음",
                "label": "많음",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r32_f6",
            "label": "기침 양상",
            "type": "single_select",
            "description": "",
            "aiHint": "기침 양상(범주형 - Dry/Effective/Ineffective/Paroxysmal/Persistent)",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 32,
            "sourceDefinition": "기침 양상(범주형 - Dry/Effective/Ineffective/Paroxysmal/Persistent)",
            "displayOrder": 9,
            "options": [
              {
                "optionKey": "Dry",
                "label": "Dry",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "Effective",
                "label": "Effective",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "Ineffective",
                "label": "Ineffective",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "Paroxysmal",
                "label": "Paroxysmal",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "Persistent",
                "label": "Persistent",
                "allowFreeText": false,
                "displayOrder": 5
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r32_f7",
            "label": "악화요인",
            "type": "text_long",
            "description": "",
            "aiHint": "악화요인(자유서술형)",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 32,
            "sourceDefinition": "악화요인(자유서술형)",
            "displayOrder": 10,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r32_f8",
            "label": "완화요인",
            "type": "text_long",
            "description": "",
            "aiHint": "완화요인(자유서술형)",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 32,
            "sourceDefinition": "완화요인(자유서술형)",
            "displayOrder": 11,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r32_f9",
            "label": "증상 시작시기",
            "type": "text_long",
            "description": "",
            "aiHint": "증상 시작시기(자유서술형)",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 32,
            "sourceDefinition": "증상 시작시기(자유서술형)",
            "displayOrder": 12,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r33_f1",
            "label": "순환기계>Pacemaker",
            "type": "single_select",
            "description": "",
            "aiHint": "순환기계>Pacemaker(범주형 - 없음/있음)",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 33,
            "sourceDefinition": "순환기계>Pacemaker(범주형 - 없음/있음)",
            "displayOrder": 13,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "있음",
                "label": "있음",
                "allowFreeText": false,
                "displayOrder": 2
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r34_f1",
            "label": "순환기계>부종",
            "type": "single_select",
            "description": "",
            "aiHint": "순환기계>부종(범주형 - 없음/있음) & if 부종 == yes",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 34,
            "sourceDefinition": "순환기계>부종(범주형 - 없음/있음) & if 부종 == yes",
            "displayOrder": 14,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "있음",
                "label": "있음",
                "allowFreeText": false,
                "displayOrder": 2
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r34_f2",
            "label": "부종 부위",
            "type": "single_select",
            "description": "",
            "aiHint": "부종 부위(범주형 - 전신/얼굴/목/오른팔/오른손/왼팔/왼손/가슴/복부/오른쪽다리/오른발/왼쪽 다리/왼발) 부종 부위(기타)(자유서술형)",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 34,
            "sourceDefinition": "부종 부위(범주형 - 전신/얼굴/목/오른팔/오른손/왼팔/왼손/가슴/복부/오른쪽다리/오른발/왼쪽 다리/왼발) 부종 부위(기타)(자유서술형)",
            "displayOrder": 15,
            "options": [
              {
                "optionKey": "전신",
                "label": "전신",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "얼굴",
                "label": "얼굴",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "목",
                "label": "목",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "오른팔",
                "label": "오른팔",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "오른손",
                "label": "오른손",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "왼팔",
                "label": "왼팔",
                "allowFreeText": false,
                "displayOrder": 6
              },
              {
                "optionKey": "왼손",
                "label": "왼손",
                "allowFreeText": false,
                "displayOrder": 7
              },
              {
                "optionKey": "가슴",
                "label": "가슴",
                "allowFreeText": false,
                "displayOrder": 8
              },
              {
                "optionKey": "복부",
                "label": "복부",
                "allowFreeText": false,
                "displayOrder": 9
              },
              {
                "optionKey": "오른쪽다리",
                "label": "오른쪽다리",
                "allowFreeText": false,
                "displayOrder": 10
              },
              {
                "optionKey": "오른발",
                "label": "오른발",
                "allowFreeText": false,
                "displayOrder": 11
              },
              {
                "optionKey": "왼쪽 다리",
                "label": "왼쪽 다리",
                "allowFreeText": false,
                "displayOrder": 12
              },
              {
                "optionKey": "왼발",
                "label": "왼발",
                "allowFreeText": false,
                "displayOrder": 13
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r35_f1",
            "label": "순환기계>순환기 관련증상",
            "type": "single_select",
            "description": "",
            "aiHint": "순환기계>순환기 관련증상(범주형 - 없음/있음) & if 있음 == yes",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 35,
            "sourceDefinition": "순환기계>순환기 관련증상(범주형 - 없음/있음) & if 있음 == yes",
            "displayOrder": 16,
            "options": [
              {
                "optionKey": "없음",
                "label": "없음",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "있음",
                "label": "있음",
                "allowFreeText": false,
                "displayOrder": 2
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r35_f2",
            "label": "순환기 관련증상",
            "type": "single_select",
            "description": "",
            "aiHint": "순환기 관련증상(범주형 - 흉통/심계항진/식은땀/흉부불편감/기타) if 기타 ==",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 35,
            "sourceDefinition": "순환기 관련증상(범주형 - 흉통/심계항진/식은땀/흉부불편감/기타) if 기타 ==",
            "displayOrder": 17,
            "options": [
              {
                "optionKey": "흉통",
                "label": "흉통",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "심계항진",
                "label": "심계항진",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "식은땀",
                "label": "식은땀",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "흉부불편감",
                "label": "흉부불편감",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 5
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r35_f3",
            "label": "yes",
            "type": "text_long",
            "description": "",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "STT",
              "MANUAL"
            ],
            "sourceRow": 35,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 18,
            "options": [],
            "conditions": []
          }
        ]
      }
    ]
  },
  {
    "templateId": "퇴원간호기록지",
    "title": "퇴원간호기록지",
    "sourceSheet": "2. 퇴원간호기록지",
    "institution": "세브란스",
    "sections": [
      {
        "sectionKey": "퇴원-시-상태",
        "title": "퇴원 시 상태",
        "displayOrder": 1,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r3_f1",
            "label": "퇴원일",
            "type": "computed",
            "description": "일반적 항목>퇴원 정보",
            "aiHint": "퇴원일(날짜형)",
            "inputSources": [
              "EMR",
              "AUTO"
            ],
            "sourceRow": 3,
            "sourceDefinition": "퇴원일(날짜형)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r25_f1",
            "label": "교통 수단",
            "type": "single_select",
            "description": "5. 퇴원 정보",
            "aiHint": "교통 수단 (범주형 - 자가/대중 교통/항공/구급차/기타) & if 기타 ==",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 25,
            "sourceDefinition": "교통 수단 (범주형 - 자가/대중 교통/항공/구급차/기타) & if 기타 ==",
            "displayOrder": 2,
            "options": [
              {
                "optionKey": "자가",
                "label": "자가",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "대중 교통",
                "label": "대중 교통",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "항공",
                "label": "항공",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "구급차",
                "label": "구급차",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 5
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r25_f2",
            "label": "yes",
            "type": "text_long",
            "description": "5. 퇴원 정보",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 25,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 3,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r25_f3",
            "label": "퇴원 방법",
            "type": "single_select",
            "description": "5. 퇴원 정보",
            "aiHint": "퇴원 방법 (범주형 - 도보/휠체어/이동침대/보호자가 안고/유모차)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 25,
            "sourceDefinition": "퇴원 방법 (범주형 - 도보/휠체어/이동침대/보호자가 안고/유모차)",
            "displayOrder": 4,
            "options": [
              {
                "optionKey": "도보",
                "label": "도보",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "휠체어",
                "label": "휠체어",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "이동침대",
                "label": "이동침대",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "보호자가 안고",
                "label": "보호자가 안고",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "유모차",
                "label": "유모차",
                "allowFreeText": false,
                "displayOrder": 5
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r26_f1",
            "label": "퇴원후 갈 곳",
            "type": "single_select",
            "description": "5. 퇴원 정보",
            "aiHint": "퇴원후 갈 곳 (범주형 - 자택/친척집/타병원/기타) & if 기타 ==",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 26,
            "sourceDefinition": "퇴원후 갈 곳 (범주형 - 자택/친척집/타병원/기타) & if 기타 ==",
            "displayOrder": 5,
            "options": [
              {
                "optionKey": "자택",
                "label": "자택",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "친척집",
                "label": "친척집",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "타병원",
                "label": "타병원",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 4
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r26_f2",
            "label": "yes",
            "type": "text_long",
            "description": "5. 퇴원 정보",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 26,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 6,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r27_f1",
            "label": "퇴원 후 보호자 (없음/배우자/부/모/자녀/조부/조모/형제/자매/간병인/기타) & if 기타 == yes",
            "type": "text_long",
            "description": "5. 퇴원 정보",
            "aiHint": "퇴원 후 보호자 (없음/배우자/부/모/자녀/조부/조모/형제/자매/간병인/기타) & if 기타 == yes (자유서술형 입력 가능)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 27,
            "sourceDefinition": "퇴원 후 보호자 (없음/배우자/부/모/자녀/조부/조모/형제/자매/간병인/기타) & if 기타 == yes (자유서술형 입력 가능)",
            "displayOrder": 7,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r28_f1",
            "label": "의식상태",
            "type": "text_long",
            "description": "5. 퇴원 정보",
            "aiHint": "의식상태 (체크리스트형 - 명료/기면/혼미/반혼수/혼수/혼동/진정/불안)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 28,
            "sourceDefinition": "의식상태 (체크리스트형 - 명료/기면/혼미/반혼수/혼수/혼동/진정/불안)",
            "displayOrder": 8,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "검사-예약-검사-예약화면과-자동-연동",
        "title": "검사 예약 - 검사 예약화면과 자동 연동",
        "displayOrder": 2,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r4_f1",
            "label": "예약 검사일",
            "type": "date",
            "description": "1. 검사 예약",
            "aiHint": "예약 검사일(날짜형)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 4,
            "sourceDefinition": "예약 검사일(날짜형)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r5_f1",
            "label": "검사 장소",
            "type": "text_long",
            "description": "1. 검사 예약",
            "aiHint": "검사 장소(자유서술형)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 5,
            "sourceDefinition": "검사 장소(자유서술형)",
            "displayOrder": 2,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r6_f1",
            "label": "예약 검사명",
            "type": "text_long",
            "description": "1. 검사 예약",
            "aiHint": "예약 검사명(자유서술형)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 6,
            "sourceDefinition": "예약 검사명(자유서술형)",
            "displayOrder": 3,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r7_f1",
            "label": "검사시 주의사항",
            "type": "text_long",
            "description": "1. 검사 예약",
            "aiHint": "검사시 주의사항(자유서술형)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 7,
            "sourceDefinition": "검사시 주의사항(자유서술형)",
            "displayOrder": 4,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r8_f1",
            "label": "운영시간 안내",
            "type": "text_long",
            "description": "1. 검사 예약",
            "aiHint": "운영시간 안내(자유서술형)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 8,
            "sourceDefinition": "운영시간 안내(자유서술형)",
            "displayOrder": 5,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "외래-예약-외래-예약화면과-자동-연동",
        "title": "외래 예약 - 외래 예약화면과 자동 연동",
        "displayOrder": 3,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r9_f1",
            "label": "외래예약시간",
            "type": "datetime",
            "description": "2. 외래 방문 예약",
            "aiHint": "외래예약시간(날짜형)/",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 9,
            "sourceDefinition": "외래예약시간(날짜형)/",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r9_f2",
            "label": "요일",
            "type": "text_long",
            "description": "2. 외래 방문 예약",
            "aiHint": "요일(자유서술형)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 9,
            "sourceDefinition": "요일(자유서술형)",
            "displayOrder": 2,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r10_f1",
            "label": "진료과",
            "type": "text_long",
            "description": "2. 외래 방문 예약",
            "aiHint": "진료과(자유서술형)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 10,
            "sourceDefinition": "진료과(자유서술형)",
            "displayOrder": 3,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r10_f2",
            "label": "진료 의사",
            "type": "text_long",
            "description": "2. 외래 방문 예약",
            "aiHint": "진료 의사(자유서술형)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 10,
            "sourceDefinition": "진료 의사(자유서술형)",
            "displayOrder": 4,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r10_f3",
            "label": "진료 장소",
            "type": "text_long",
            "description": "2. 외래 방문 예약",
            "aiHint": "진료 장소(자유서술형)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 10,
            "sourceDefinition": "진료 장소(자유서술형)",
            "displayOrder": 5,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r11_f1",
            "label": "외래 전화 번호",
            "type": "text_long",
            "description": "2. 외래 방문 예약",
            "aiHint": "외래 전화 번호(자유서술형)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 11,
            "sourceDefinition": "외래 전화 번호(자유서술형)",
            "displayOrder": 6,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "퇴원약-의사-처방과-자동-연동-퇴원약-지급할-때",
        "title": "퇴원약 - 의사 처방과 자동 연동(퇴원약 지급할 때)",
        "displayOrder": 4,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r12_f1",
            "label": "약품명 [용량/단위]",
            "type": "text_long",
            "description": "3. 퇴원약 투약",
            "aiHint": "약품명 [용량/단위](자유서술형)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 12,
            "sourceDefinition": "약품명 [용량/단위](자유서술형)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r13_f1",
            "label": "1회 투약량",
            "type": "text_long",
            "description": "3. 퇴원약 투약",
            "aiHint": "1회 투약량(자유서술형)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 13,
            "sourceDefinition": "1회 투약량(자유서술형)",
            "displayOrder": 2,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r14_f1",
            "label": "1일 투여횟수",
            "type": "text_long",
            "description": "3. 퇴원약 투약",
            "aiHint": "1일 투여횟수(자유서술형)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 14,
            "sourceDefinition": "1일 투여횟수(자유서술형)",
            "displayOrder": 3,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r15_f1",
            "label": "총 투약일수",
            "type": "text_long",
            "description": "3. 퇴원약 투약",
            "aiHint": "총 투약일수(자유서술형)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 15,
            "sourceDefinition": "총 투약일수(자유서술형)",
            "displayOrder": 4,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r16_f1",
            "label": "용법",
            "type": "text_long",
            "description": "3. 퇴원약 투약",
            "aiHint": "용법(자유서술형)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 16,
            "sourceDefinition": "용법(자유서술형)",
            "displayOrder": 5,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r17_f1",
            "label": "처방 분류",
            "type": "text_long",
            "description": "3. 퇴원약 투약",
            "aiHint": "처방 분류(자유서술형)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 17,
            "sourceDefinition": "처방 분류(자유서술형)",
            "displayOrder": 6,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r18_f1",
            "label": "지급 대상자",
            "type": "single_select",
            "description": "3. 퇴원약 투약",
            "aiHint": "지급 대상자(범주형 - 환자/보호자/기타) if 기타 ==",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 18,
            "sourceDefinition": "지급 대상자(범주형 - 환자/보호자/기타) if 기타 ==",
            "displayOrder": 7,
            "options": [
              {
                "optionKey": "환자",
                "label": "환자",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "보호자",
                "label": "보호자",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r18_f2",
            "label": "yes",
            "type": "text_long",
            "description": "3. 퇴원약 투약",
            "aiHint": "yes(자유서술형 입력 가능)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 18,
            "sourceDefinition": "yes(자유서술형 입력 가능)",
            "displayOrder": 8,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "퇴원-후-관리-General-Instruction",
        "title": "퇴원 후 관리 (General Instruction)",
        "displayOrder": 5,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r19_f1",
            "label": "활동 범위",
            "type": "single_select",
            "description": "4. 의료기관에 문의를 요하는 증상 & 추후관리",
            "aiHint": "활동 범위 (범주형 - 일상 생활 가능/재활 치료 필요/정기적 운동 필요)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 19,
            "sourceDefinition": "활동 범위 (범주형 - 일상 생활 가능/재활 치료 필요/정기적 운동 필요)",
            "displayOrder": 1,
            "options": [
              {
                "optionKey": "일상 생활 가능",
                "label": "일상 생활 가능",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "재활 치료 필요",
                "label": "재활 치료 필요",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "정기적 운동 필요",
                "label": "정기적 운동 필요",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r20_f1",
            "label": "식사",
            "type": "single_select",
            "description": "4. 의료기관에 문의를 요하는 증상 & 추후관리",
            "aiHint": "식사 (범주형 - 일반식/제한 사항) & if 제한 사항 ==",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 20,
            "sourceDefinition": "식사 (범주형 - 일반식/제한 사항) & if 제한 사항 ==",
            "displayOrder": 2,
            "options": [
              {
                "optionKey": "일반식",
                "label": "일반식",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "제한 사항",
                "label": "제한 사항",
                "allowFreeText": false,
                "displayOrder": 2
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r20_f2",
            "label": "yes",
            "type": "text_long",
            "description": "4. 의료기관에 문의를 요하는 증상 & 추후관리",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 20,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 3,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r21_f1",
            "label": "목욕",
            "type": "single_select",
            "description": "4. 의료기관에 문의를 요하는 증상 & 추후관리",
            "aiHint": "목욕 (범주형 - 샤워/통목욕/침상목욕/주의 사항, 2개 이상 체크 가능) & if 주의 사항 ==",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 21,
            "sourceDefinition": "목욕 (범주형 - 샤워/통목욕/침상목욕/주의 사항, 2개 이상 체크 가능) & if 주의 사항 ==",
            "displayOrder": 4,
            "options": [
              {
                "optionKey": "샤워",
                "label": "샤워",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "통목욕",
                "label": "통목욕",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "침상목욕",
                "label": "침상목욕",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "주의 사항",
                "label": "주의 사항",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "2개 이상 체크 가능",
                "label": "2개 이상 체크 가능",
                "allowFreeText": false,
                "displayOrder": 5
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r21_f2",
            "label": "yes",
            "type": "text_long",
            "description": "4. 의료기관에 문의를 요하는 증상 & 추후관리",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 21,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 5,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r22_f1",
            "label": "향후 치료계획 (없음/가정 간호/외래/검사/입원예정/기타, 외래/검사 기본으로 선택되어있음) & if 기타 == yes",
            "type": "text_long",
            "description": "4. 의료기관에 문의를 요하는 증상 & 추후관리",
            "aiHint": "향후 치료계획 (없음/가정 간호/외래/검사/입원예정/기타, 외래/검사 기본으로 선택되어있음) & if 기타 == yes (자유서술형 입력 가능)",
            "inputSources": [
              "EMR"
            ],
            "sourceRow": 22,
            "sourceDefinition": "향후 치료계획 (없음/가정 간호/외래/검사/입원예정/기타, 외래/검사 기본으로 선택되어있음) & if 기타 == yes (자유서술형 입력 가능)",
            "displayOrder": 6,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "퇴원-후-관리-Post-discharge-management",
        "title": "퇴원 후 관리(Post discharge management)",
        "displayOrder": 6,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r23_f1",
            "label": "관리 항목",
            "type": "single_select",
            "description": "4. 의료기관에 문의를 요하는 증상 & 추후관리",
            "aiHint": "관리 항목(범주형 - 감염예방/지참약/당뇨조절/혈압조절/체위변경/구강간호/튜브관리/좌욕 등 - 부서별 세트 존재함)",
            "inputSources": [
              "MANUAL"
            ],
            "sourceRow": 23,
            "sourceDefinition": "관리 항목(범주형 - 감염예방/지참약/당뇨조절/혈압조절/체위변경/구강간호/튜브관리/좌욕 등 - 부서별 세트 존재함)",
            "displayOrder": 1,
            "options": [
              {
                "optionKey": "감염예방",
                "label": "감염예방",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "지참약",
                "label": "지참약",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "당뇨조절",
                "label": "당뇨조절",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "혈압조절",
                "label": "혈압조절",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "체위변경",
                "label": "체위변경",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "구강간호",
                "label": "구강간호",
                "allowFreeText": false,
                "displayOrder": 6
              },
              {
                "optionKey": "튜브관리",
                "label": "튜브관리",
                "allowFreeText": false,
                "displayOrder": 7
              },
              {
                "optionKey": "좌욕 등 - 부서별 세트 존재함",
                "label": "좌욕 등 - 부서별 세트 존재함",
                "allowFreeText": false,
                "displayOrder": 8
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r24_f1",
            "label": "관리 내용",
            "type": "text_long",
            "description": "4. 의료기관에 문의를 요하는 증상 & 추후관리",
            "aiHint": "관리 내용(자유서술형 - 부서별 세트 존재함)",
            "inputSources": [
              "MANUAL"
            ],
            "sourceRow": 24,
            "sourceDefinition": "관리 내용(자유서술형 - 부서별 세트 존재함)",
            "displayOrder": 2,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "의사-기록-참고-필요",
        "title": "의사 기록 참고 필요",
        "displayOrder": 7,
        "repeatable": false,
        "fields": []
      }
    ]
  },
  {
    "templateId": "CPR 기록지",
    "title": "CPR 기록지",
    "sourceSheet": "3. CPR 기록지",
    "institution": "세브란스",
    "sections": [
      {
        "sectionKey": "심폐소생술이-요구되는-환자에게-양질의-의료서비스를-제공한다-심폐소생술에-관련된-규정이-",
        "title": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
        "displayOrder": 1,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r3_f1",
            "label": "심정지 날짜",
            "type": "date",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "심정지 날짜(날짜형)",
            "inputSources": [
              "EMR",
              "AUTO"
            ],
            "sourceRow": 3,
            "sourceDefinition": "심정지 날짜(날짜형)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r3_f2",
            "label": "입원과",
            "type": "text_long",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "입원과(자유서술형), 입원주치의(직원 검색하여 입력)",
            "inputSources": [
              "EMR",
              "AUTO"
            ],
            "sourceRow": 3,
            "sourceDefinition": "입원과(자유서술형), 입원주치의(직원 검색하여 입력)",
            "displayOrder": 2,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "심정지-발생",
        "title": "심정지 발생",
        "displayOrder": 2,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r4_f1",
            "label": "발견시각",
            "type": "datetime",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "발견시각(날짜형 -시-분)",
            "inputSources": [
              "MANUAL"
            ],
            "sourceRow": 4,
            "sourceDefinition": "발견시각(날짜형 -시-분)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r4_f2",
            "label": "목격여부",
            "type": "single_select",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "목격여부(범주형 - 목격/발견)",
            "inputSources": [
              "MANUAL"
            ],
            "sourceRow": 4,
            "sourceDefinition": "목격여부(범주형 - 목격/발견)",
            "displayOrder": 2,
            "options": [
              {
                "optionKey": "목격",
                "label": "목격",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "발견",
                "label": "발견",
                "allowFreeText": false,
                "displayOrder": 2
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r5_f1",
            "label": "발견장소",
            "type": "single_select",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "발견장소(범주형 - 응급진료센터/병동/중환자실/검사실/기타) & if 기타 ==",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 5,
            "sourceDefinition": "발견장소(범주형 - 응급진료센터/병동/중환자실/검사실/기타) & if 기타 ==",
            "displayOrder": 3,
            "options": [
              {
                "optionKey": "응급진료센터",
                "label": "응급진료센터",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "병동",
                "label": "병동",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "중환자실",
                "label": "중환자실",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "검사실",
                "label": "검사실",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 5
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r5_f2",
            "label": "yes",
            "type": "text_long",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 5,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 4,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r6_f1",
            "label": "발견자",
            "type": "single_select",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "발견자(범주형 - 의사/간호사/기타) & if 기타 ==",
            "inputSources": [
              "MANUAL"
            ],
            "sourceRow": 6,
            "sourceDefinition": "발견자(범주형 - 의사/간호사/기타) & if 기타 ==",
            "displayOrder": 5,
            "options": [
              {
                "optionKey": "의사",
                "label": "의사",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "간호사",
                "label": "간호사",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r6_f2",
            "label": "yes",
            "type": "text_long",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "MANUAL"
            ],
            "sourceRow": 6,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 6,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "심폐소생술-시행",
        "title": "심폐소생술 시행",
        "displayOrder": 3,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r7_f1",
            "label": "최초 심전도 확인 시각",
            "type": "datetime",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "최초 심전도 확인 시각 (날짜형 -시/-분)",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 7,
            "sourceDefinition": "최초 심전도 확인 시각 (날짜형 -시/-분)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r7_f2",
            "label": "흉부압박시행시각",
            "type": "datetime",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "흉부압박시행시각(날짜형 -시/-분)",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 7,
            "sourceDefinition": "흉부압박시행시각(날짜형 -시/-분)",
            "displayOrder": 2,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r8_f1",
            "label": "심폐소생팀 도착 시각",
            "type": "datetime",
            "description": "심폐소생술 팀을 운영한다",
            "aiHint": "심폐소생팀 도착 시각 (날짜형 -시/-분)",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 8,
            "sourceDefinition": "심폐소생팀 도착 시각 (날짜형 -시/-분)",
            "displayOrder": 3,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r9_f1",
            "label": "심폐소생팀 도착 시각",
            "type": "datetime",
            "description": "심폐소생술 팀을 운영한다",
            "aiHint": "심폐소생팀 도착 시각 (날짜형 -시/-분)",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 9,
            "sourceDefinition": "심폐소생팀 도착 시각 (날짜형 -시/-분)",
            "displayOrder": 4,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r18_f1",
            "label": "shackable",
            "type": "single_select",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "shackable (범주형 - VF/VT)",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 18,
            "sourceDefinition": "shackable (범주형 - VF/VT)",
            "displayOrder": 5,
            "options": [
              {
                "optionKey": "VF",
                "label": "VF",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "VT",
                "label": "VT",
                "allowFreeText": false,
                "displayOrder": 2
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r18_f2",
            "label": "nonshockable",
            "type": "single_select",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "nonshockable (범주형 - PEA/Asystole)",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 18,
            "sourceDefinition": "nonshockable (범주형 - PEA/Asystole)",
            "displayOrder": 6,
            "options": [
              {
                "optionKey": "PEA",
                "label": "PEA",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "Asystole",
                "label": "Asystole",
                "allowFreeText": false,
                "displayOrder": 2
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r24_f1",
            "label": "최초 제세동",
            "type": "text_long",
            "description": "적시에 제세동기를 사용할 수 있다",
            "aiHint": "최초 제세동 (시행시각, 에너지(J), 제세동 전 심전도)",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 24,
            "sourceDefinition": "최초 제세동 (시행시각, 에너지(J), 제세동 전 심전도)",
            "displayOrder": 7,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r25_f1",
            "label": "최초 제세동",
            "type": "text_long",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "최초 제세동 (시행시각, 에너지(J), 제세동 전 심전도)",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 25,
            "sourceDefinition": "최초 제세동 (시행시각, 에너지(J), 제세동 전 심전도)",
            "displayOrder": 8,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r26_f1",
            "label": "최초 제세동",
            "type": "text_long",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "최초 제세동 (시행시각, 에너지(J), 제세동 전 심전도)",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 26,
            "sourceDefinition": "최초 제세동 (시행시각, 에너지(J), 제세동 전 심전도)",
            "displayOrder": 9,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r27_f1",
            "label": "종류",
            "type": "number",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "종류 (free text), 시행시각(-시/-분)",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 27,
            "sourceDefinition": "종류 (free text), 시행시각(-시/-분)",
            "displayOrder": 10,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r27_f2",
            "label": "심폐소생술 시행",
            "type": "number",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "(수치형)mg",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 27,
            "sourceDefinition": "(수치형)mg",
            "displayOrder": 11,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r28_f1",
            "label": "종류",
            "type": "number",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "종류 (free text), 시행시각(-시/-분)",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 28,
            "sourceDefinition": "종류 (free text), 시행시각(-시/-분)",
            "displayOrder": 12,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r28_f2",
            "label": "심폐소생술 시행",
            "type": "number",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "(수치형)mg",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 28,
            "sourceDefinition": "(수치형)mg",
            "displayOrder": 13,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r29_f1",
            "label": "종류",
            "type": "number",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "종류 (free text), 시행시각(-시/-분)",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 29,
            "sourceDefinition": "종류 (free text), 시행시각(-시/-분)",
            "displayOrder": 14,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r29_f2",
            "label": "심폐소생술 시행",
            "type": "number",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "(수치형)mg",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 29,
            "sourceDefinition": "(수치형)mg",
            "displayOrder": 15,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "경과기록-약의-사용에-따른-심전도-변화-및-기도확보-포함",
        "title": "경과기록(약의 사용에 따른 심전도 변화 및 기도확보 포함)",
        "displayOrder": 4,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r19_f1",
            "label": "경과기록(약의 사용에 따른 심전도 변화 및 기도확보 포함)",
            "type": "text_long",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "자유서술형",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 19,
            "sourceDefinition": "자유서술형",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r20_f1",
            "label": "경과기록(약의 사용에 따른 심전도 변화 및 기도확보 포함)",
            "type": "text_long",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "자유서술형",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 20,
            "sourceDefinition": "자유서술형",
            "displayOrder": 2,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r30_f1",
            "label": "경과기록(약의 사용에 따른 심전도 변화 및 기도확보 포함)",
            "type": "text_long",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "자유서술형",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 30,
            "sourceDefinition": "자유서술형",
            "displayOrder": 3,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r31_f1",
            "label": "경과기록(약의 사용에 따른 심전도 변화 및 기도확보 포함)",
            "type": "text_long",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "자유서술형",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 31,
            "sourceDefinition": "자유서술형",
            "displayOrder": 4,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "없음",
        "title": "없음",
        "displayOrder": 5,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r23_f1",
            "label": "CPR 지속시간",
            "type": "number",
            "description": "심폐소생술이 요구되는 환자에게 양질의 의료서비스를 제공한다 심폐소생술에 관련된 규정이 있다",
            "aiHint": "CPR 지속시간 (자유서술형 -분)",
            "inputSources": [
              "STT",
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 23,
            "sourceDefinition": "CPR 지속시간 (자유서술형 -분)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "심폐소생술-결과",
        "title": "심폐소생술 결과",
        "displayOrder": 6,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r32_f1",
            "label": "자발순환회복",
            "type": "number",
            "description": "심폐소생술 관련 지표를 관리한다",
            "aiHint": "자발순환회복(+) - 시간 (-시/-분), BP, PR, 심전도",
            "inputSources": [
              "MANUAL"
            ],
            "sourceRow": 32,
            "sourceDefinition": "자발순환회복(+) - 시간 (-시/-분), BP, PR, 심전도",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r33_f1",
            "label": "자발순환회복",
            "type": "number",
            "description": "심폐소생술 관련 지표를 관리한다",
            "aiHint": "자발순환회복 (-) - 시간 (-시/-분)",
            "inputSources": [
              "MANUAL"
            ],
            "sourceRow": 33,
            "sourceDefinition": "자발순환회복 (-) - 시간 (-시/-분)",
            "displayOrder": 2,
            "options": [],
            "conditions": []
          }
        ]
      }
    ]
  },
  {
    "templateId": "욕창간호기록지",
    "title": "욕창간호기록지",
    "sourceSheet": "4. 욕창간호기록지",
    "institution": "세브란스",
    "sections": [
      {
        "sectionKey": "1-욕창위험도평가기록지",
        "title": "1. 욕창위험도평가기록지",
        "displayOrder": 1,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r3_f1",
            "label": "1. 욕창위험도평가기록지",
            "type": "section_note",
            "description": "1. 욕창위험도평가기록지",
            "aiHint": "1. 욕창위험도평가기록지",
            "inputSources": [
              "MANUAL"
            ],
            "sourceRow": 3,
            "sourceDefinition": "1. 욕창위험도평가기록지",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "욕창-위험도-구분",
        "title": "욕창 위험도 구분",
        "displayOrder": 2,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r4_f1",
            "label": "욕창 위험도 구분",
            "type": "single_select",
            "description": "욕창 위험 평가도구",
            "aiHint": "범주형 - Branden scale/Neonata/Infant Braden Q scale",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 4,
            "sourceDefinition": "범주형 - Branden scale/Neonata/Infant Braden Q scale",
            "displayOrder": 1,
            "options": [
              {
                "optionKey": "Branden scale",
                "label": "Branden scale",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "Neonata",
                "label": "Neonata",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "Infant Braden Q scale",
                "label": "Infant Braden Q scale",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "감각인지",
        "title": "감각인지",
        "displayOrder": 3,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r5_f1",
            "label": "감각인지",
            "type": "text_long",
            "description": "욕창 위험 평가도구",
            "aiHint": "감각인지 (1. 전혀 없음/ 2. 매우 제한됨 / 3. 약간 제한됨 / 4. 장애 없음)",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 5,
            "sourceDefinition": "감각인지 (1. 전혀 없음/ 2. 매우 제한됨 / 3. 약간 제한됨 / 4. 장애 없음)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "습기",
        "title": "습기",
        "displayOrder": 4,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r6_f1",
            "label": "습기",
            "type": "text_long",
            "description": "욕창 위험 평가도구",
            "aiHint": "습기 (피부가 습기에 노출되어 있는 정도) (1. 지속적으로 습함/ 2. 습함 / 3. 때때로 습함 / 4. 거의 습하지 않음)",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 6,
            "sourceDefinition": "습기 (피부가 습기에 노출되어 있는 정도) (1. 지속적으로 습함/ 2. 습함 / 3. 때때로 습함 / 4. 거의 습하지 않음)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "활동",
        "title": "활동",
        "displayOrder": 5,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r7_f1",
            "label": "활동",
            "type": "text_long",
            "description": "욕창 위험 평가도구",
            "aiHint": "활동 (신체 활동 정도) (1. 침상안정 / 2. 의자에 앉을 수 있음 / 3. 때때로 보행 / 4. 정상)",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 7,
            "sourceDefinition": "활동 (신체 활동 정도) (1. 침상안정 / 2. 의자에 앉을 수 있음 / 3. 때때로 보행 / 4. 정상)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "움직임",
        "title": "움직임",
        "displayOrder": 6,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r8_f1",
            "label": "움직임",
            "type": "text_long",
            "description": "욕창 위험 평가도구",
            "aiHint": "움직임 (체위를 변경하고 조절할 수 있는 능력) (1. 전혀 없음/ 2. 매우 제한됨 / 3. 약간 제한됨 / 4. 정상)",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 8,
            "sourceDefinition": "움직임 (체위를 변경하고 조절할 수 있는 능력) (1. 전혀 없음/ 2. 매우 제한됨 / 3. 약간 제한됨 / 4. 정상)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "영양상태",
        "title": "영양상태",
        "displayOrder": 7,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r9_f1",
            "label": "영양상태",
            "type": "text_long",
            "description": "욕창 위험 평가도구",
            "aiHint": "영양상태 (평소 음식 섭취 양상) (1. 불량 / 2. 부적절함 / 3. 적절함 / 4. 양호)",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 9,
            "sourceDefinition": "영양상태 (평소 음식 섭취 양상) (1. 불량 / 2. 부적절함 / 3. 적절함 / 4. 양호)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "마찰력과-전단력",
        "title": "마찰력과 전단력",
        "displayOrder": 8,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r10_f1",
            "label": "마찰력과 전단력",
            "type": "text_long",
            "description": "욕창 위험 평가도구",
            "aiHint": "마찰력과 전단력 (1. 문제 있음 / 2. 잠재적 문제 있음 / 3. 문제 없음)",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 10,
            "sourceDefinition": "마찰력과 전단력 (1. 문제 있음 / 2. 잠재적 문제 있음 / 3. 문제 없음)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "욕창분류기준",
        "title": "욕창분류기준",
        "displayOrder": 9,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r11_f1",
            "label": "합계",
            "type": "computed",
            "description": "욕창분류기준",
            "aiHint": "합계 (욕창위험도)",
            "inputSources": [
              "AUTO"
            ],
            "sourceRow": 11,
            "sourceDefinition": "합계 (욕창위험도)",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "위험요인",
        "title": "위험요인",
        "displayOrder": 10,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r14_f1",
            "label": "의식 상태",
            "type": "single_select",
            "description": "평가결과에 따른 욕창 예방활동",
            "aiHint": "의식 상태 (범주형 - 1. 명료함/2. 격양/안절부절함/혼돈/3. 무감동/반응은 있으나 진정수면상태/4. 혼수/무반응/목적 없는 움직임이 있음)",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 14,
            "sourceDefinition": "의식 상태 (범주형 - 1. 명료함/2. 격양/안절부절함/혼돈/3. 무감동/반응은 있으나 진정수면상태/4. 혼수/무반응/목적 없는 움직임이 있음)",
            "displayOrder": 1,
            "options": [
              {
                "optionKey": "1. 명료함",
                "label": "1. 명료함",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "2. 격양",
                "label": "2. 격양",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "안절부절함",
                "label": "안절부절함",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "혼돈",
                "label": "혼돈",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "3. 무감동",
                "label": "3. 무감동",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "반응은 있으나 진정수면상태",
                "label": "반응은 있으나 진정수면상태",
                "allowFreeText": false,
                "displayOrder": 6
              },
              {
                "optionKey": "4. 혼수",
                "label": "4. 혼수",
                "allowFreeText": false,
                "displayOrder": 7
              },
              {
                "optionKey": "무반응",
                "label": "무반응",
                "allowFreeText": false,
                "displayOrder": 8
              },
              {
                "optionKey": "목적 없는 움직임이 있음",
                "label": "목적 없는 움직임이 있음",
                "allowFreeText": false,
                "displayOrder": 9
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r15_f1",
            "label": "나이",
            "type": "single_select",
            "description": "평가결과에 따른 욕창 예방활동",
            "aiHint": "나이(범주형 - 12개월~13세/14세 ~ 49세/50세 ~ 64세/65세 ~ 74세/75세 ~ 80세/81세 이상）",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 15,
            "sourceDefinition": "나이(범주형 - 12개월~13세/14세 ~ 49세/50세 ~ 64세/65세 ~ 74세/75세 ~ 80세/81세 이상）",
            "displayOrder": 2,
            "options": [
              {
                "optionKey": "12개월~13세",
                "label": "12개월~13세",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "14세 ~ 49세",
                "label": "14세 ~ 49세",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "50세 ~ 64세",
                "label": "50세 ~ 64세",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "65세 ~ 74세",
                "label": "65세 ~ 74세",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "75세 ~ 80세",
                "label": "75세 ~ 80세",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "81세 이상）",
                "label": "81세 이상）",
                "allowFreeText": false,
                "displayOrder": 6
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r16_f1",
            "label": "위생상태 유지",
            "type": "single_select",
            "description": "평가결과에 따른 욕창 예방활동",
            "aiHint": "위생상태 유지(범주형 - 도움 없이 가능/약간의 보조 필요/많은 보조 필요/전적인 의존)",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 16,
            "sourceDefinition": "위생상태 유지(범주형 - 도움 없이 가능/약간의 보조 필요/많은 보조 필요/전적인 의존)",
            "displayOrder": 3,
            "options": [
              {
                "optionKey": "도움 없이 가능",
                "label": "도움 없이 가능",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "약간의 보조 필요",
                "label": "약간의 보조 필요",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "많은 보조 필요",
                "label": "많은 보조 필요",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "전적인 의존",
                "label": "전적인 의존",
                "allowFreeText": false,
                "displayOrder": 4
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r17_f1",
            "label": "혈역학적 상태",
            "type": "single_select",
            "description": "평가결과에 따른 욕창 예방활동",
            "aiHint": "혈역학적 상태(범주형 - 안정적임/강심제 보조하면서 안정적임/강심제 보조함에도 불안정/강심제 보조함에도 위독함）",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 17,
            "sourceDefinition": "혈역학적 상태(범주형 - 안정적임/강심제 보조하면서 안정적임/강심제 보조함에도 불안정/강심제 보조함에도 위독함）",
            "displayOrder": 4,
            "options": [
              {
                "optionKey": "안정적임",
                "label": "안정적임",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "강심제 보조하면서 안정적임",
                "label": "강심제 보조하면서 안정적임",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "강심제 보조함에도 불안정",
                "label": "강심제 보조함에도 불안정",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "강심제 보조함에도 위독함）",
                "label": "강심제 보조함에도 위독함）",
                "allowFreeText": false,
                "displayOrder": 4
              }
            ],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "작성일",
        "title": "작성일",
        "displayOrder": 11,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r18_f1",
            "label": "작성일",
            "type": "date",
            "description": "평가주기",
            "aiHint": "날짜형",
            "inputSources": [
              "MANUAL",
              "AUTO"
            ],
            "sourceRow": 18,
            "sourceDefinition": "날짜형",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "욕창-위험도-평가-사유",
        "title": "욕창 위험도 평가 사유",
        "displayOrder": 12,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r19_f1",
            "label": "욕창 위험도 평가 사유",
            "type": "single_select",
            "description": "평가주기",
            "aiHint": "범주형 - 입원/정규 재평가/병동 이동/수술/침습적 시술/장애 발생시/상태 변화",
            "inputSources": [
              "MANUAL",
              "AUTO"
            ],
            "sourceRow": 19,
            "sourceDefinition": "범주형 - 입원/정규 재평가/병동 이동/수술/침습적 시술/장애 발생시/상태 변화",
            "displayOrder": 1,
            "options": [
              {
                "optionKey": "입원",
                "label": "입원",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "정규 재평가",
                "label": "정규 재평가",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "병동 이동",
                "label": "병동 이동",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "수술",
                "label": "수술",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "침습적 시술",
                "label": "침습적 시술",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "장애 발생시",
                "label": "장애 발생시",
                "allowFreeText": false,
                "displayOrder": 6
              },
              {
                "optionKey": "상태 변화",
                "label": "상태 변화",
                "allowFreeText": false,
                "displayOrder": 7
              }
            ],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "2-욕창기록지",
        "title": "2. 욕창기록지",
        "displayOrder": 13,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r20_f1",
            "label": "2. 욕창기록지",
            "type": "section_note",
            "description": "2. 욕창기록지",
            "aiHint": "2. 욕창기록지",
            "inputSources": [
              "MANUAL"
            ],
            "sourceRow": 20,
            "sourceDefinition": "2. 욕창기록지",
            "displayOrder": 1,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "Assessment",
        "title": "Assessment",
        "displayOrder": 14,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r21_f1",
            "label": "Location",
            "type": "single_select",
            "description": "욕창 위험 평가도구를 이용하여 정기적인 재평가를 수행한다.",
            "aiHint": "Location (범주형 - Coccyx/Sacrum/Back/Occipital/Trochanter (Lt/Rt)/Ischium (Lt/Rt)/Malleolus (Lt/Rt)/Heel (Lt/Rt)/Buttock (Lt/Rt)/기타/Medical Device Related Pressure Injury)",
            "inputSources": [
              "IMAGE",
              "MANUAL"
            ],
            "sourceRow": 21,
            "sourceDefinition": "Location (범주형 - Coccyx/Sacrum/Back/Occipital/Trochanter (Lt/Rt)/Ischium (Lt/Rt)/Malleolus (Lt/Rt)/Heel (Lt/Rt)/Buttock (Lt/Rt)/기타/Medical Device Related Pressure Injury)",
            "displayOrder": 1,
            "options": [
              {
                "optionKey": "Coccyx",
                "label": "Coccyx",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "Sacrum",
                "label": "Sacrum",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "Back",
                "label": "Back",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "Occipital",
                "label": "Occipital",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "Trochanter (Lt",
                "label": "Trochanter (Lt",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "Rt",
                "label": "Rt",
                "allowFreeText": false,
                "displayOrder": 6
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r22_f1",
            "label": "Location",
            "type": "single_select",
            "description": "욕창 위험 평가도구를 이용하여 정기적인 재평가를 수행한다.",
            "aiHint": "Location (범주형 - Coccyx/Sacrum/Back/Occipital/Trochanter (Lt/Rt)/Ischium (Lt/Rt)/Malleolus (Lt/Rt)/Heel (Lt/Rt)/Buttock (Lt/Rt)/기타/Medical Device Related Pressure Injury)",
            "inputSources": [
              "IMAGE",
              "MANUAL"
            ],
            "sourceRow": 22,
            "sourceDefinition": "Location (범주형 - Coccyx/Sacrum/Back/Occipital/Trochanter (Lt/Rt)/Ischium (Lt/Rt)/Malleolus (Lt/Rt)/Heel (Lt/Rt)/Buttock (Lt/Rt)/기타/Medical Device Related Pressure Injury)",
            "displayOrder": 2,
            "options": [
              {
                "optionKey": "Coccyx",
                "label": "Coccyx",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "Sacrum",
                "label": "Sacrum",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "Back",
                "label": "Back",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "Occipital",
                "label": "Occipital",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "Trochanter (Lt",
                "label": "Trochanter (Lt",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "Rt",
                "label": "Rt",
                "allowFreeText": false,
                "displayOrder": 6
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r23_f1",
            "label": "Size",
            "type": "number",
            "description": "욕창 위험 평가도구를 이용하여 정기적인 재평가를 수행한다.",
            "aiHint": "Size (자유서술형 - 가로( ) X 세로( ) X 깊이 ( ) cm)",
            "inputSources": [
              "IMAGE",
              "MANUAL"
            ],
            "sourceRow": 23,
            "sourceDefinition": "Size (자유서술형 - 가로( ) X 세로( ) X 깊이 ( ) cm)",
            "displayOrder": 3,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r23_f2",
            "label": "Assessment",
            "type": "single_select",
            "description": "욕창 위험 평가도구를 이용하여 정기적인 재평가를 수행한다.",
            "aiHint": "(범주형 - Undermining/Tunneling/기타) if 기타 ==",
            "inputSources": [
              "IMAGE",
              "MANUAL"
            ],
            "sourceRow": 23,
            "sourceDefinition": "(범주형 - Undermining/Tunneling/기타) if 기타 ==",
            "displayOrder": 4,
            "options": [
              {
                "optionKey": "Undermining",
                "label": "Undermining",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "Tunneling",
                "label": "Tunneling",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r23_f3",
            "label": "yes",
            "type": "text_long",
            "description": "욕창 위험 평가도구를 이용하여 정기적인 재평가를 수행한다.",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "IMAGE",
              "MANUAL"
            ],
            "sourceRow": 23,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 5,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r24_f1",
            "label": "Stage",
            "type": "single_select",
            "description": "욕창 위험 평가도구를 이용하여 정기적인 재평가를 수행한다.",
            "aiHint": "Stage (범주형 - 1/2/3/4/Unstageable/DTPI + 자유서술형)",
            "inputSources": [
              "IMAGE",
              "MANUAL"
            ],
            "sourceRow": 24,
            "sourceDefinition": "Stage (범주형 - 1/2/3/4/Unstageable/DTPI + 자유서술형)",
            "displayOrder": 6,
            "options": [
              {
                "optionKey": "1",
                "label": "1",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "2",
                "label": "2",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "3",
                "label": "3",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "4",
                "label": "4",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "Unstageable",
                "label": "Unstageable",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "DTPI + 자유서술형",
                "label": "DTPI + 자유서술형",
                "allowFreeText": false,
                "displayOrder": 6
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r25_f1",
            "label": "Infection",
            "type": "single_select",
            "description": "욕창 위험 평가도구를 이용하여 정기적인 재평가를 수행한다.",
            "aiHint": "Infection(범주형 - No/Yes + 자유서술형)",
            "inputSources": [
              "IMAGE",
              "MANUAL"
            ],
            "sourceRow": 25,
            "sourceDefinition": "Infection(범주형 - No/Yes + 자유서술형)",
            "displayOrder": 7,
            "options": [
              {
                "optionKey": "No",
                "label": "No",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "Yes + 자유서술형",
                "label": "Yes + 자유서술형",
                "allowFreeText": false,
                "displayOrder": 2
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r26_f1",
            "label": "Periwound(wound edges)",
            "type": "single_select",
            "description": "욕창 위험 평가도구를 이용하여 정기적인 재평가를 수행한다.",
            "aiHint": "Periwound(wound edges)(범주형 - Intact/Maceration/Erythema/Induration/기타) & if 기타 == yes (자유서술형 입력 가능)",
            "inputSources": [
              "IMAGE",
              "MANUAL"
            ],
            "sourceRow": 26,
            "sourceDefinition": "Periwound(wound edges)(범주형 - Intact/Maceration/Erythema/Induration/기타) & if 기타 == yes (자유서술형 입력 가능)",
            "displayOrder": 8,
            "options": [
              {
                "optionKey": "Intact",
                "label": "Intact",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "Maceration",
                "label": "Maceration",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "Erythema",
                "label": "Erythema",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "Induration",
                "label": "Induration",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": true,
                "displayOrder": 5
              }
            ],
            "conditions": [
              {
                "conditionType": "free_text_when_option",
                "triggerFieldKey": "r26_f1",
                "triggerOptionKey": "기타",
                "targetFieldKey": "r26_f1_free_text"
              }
            ]
          },
          {
            "fieldKey": "r27_f1",
            "label": "Exudate amount",
            "type": "single_select",
            "description": "욕창 위험 평가도구를 이용하여 정기적인 재평가를 수행한다.",
            "aiHint": "Exudate amount(범주형 - 0-None/1-Minimal/2-Moderate/3-Large)",
            "inputSources": [
              "IMAGE",
              "MANUAL"
            ],
            "sourceRow": 27,
            "sourceDefinition": "Exudate amount(범주형 - 0-None/1-Minimal/2-Moderate/3-Large)",
            "displayOrder": 9,
            "options": [
              {
                "optionKey": "0-None",
                "label": "0-None",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "1-Minimal",
                "label": "1-Minimal",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "2-Moderate",
                "label": "2-Moderate",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "3-Large",
                "label": "3-Large",
                "allowFreeText": false,
                "displayOrder": 4
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r28_f1",
            "label": "Tissue type",
            "type": "single_select",
            "description": "욕창 위험 평가도구를 이용하여 정기적인 재평가를 수행한다.",
            "aiHint": "Tissue type(범주형 - 0 - Healed/1 - Epithelial/2 - Granulation/3 - Slough/4 - Necrotic)",
            "inputSources": [
              "IMAGE",
              "MANUAL"
            ],
            "sourceRow": 28,
            "sourceDefinition": "Tissue type(범주형 - 0 - Healed/1 - Epithelial/2 - Granulation/3 - Slough/4 - Necrotic)",
            "displayOrder": 10,
            "options": [
              {
                "optionKey": "0 - Healed",
                "label": "0 - Healed",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "1 - Epithelial",
                "label": "1 - Epithelial",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "2 - Granulation",
                "label": "2 - Granulation",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "3 - Slough",
                "label": "3 - Slough",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "4 - Necrotic",
                "label": "4 - Necrotic",
                "allowFreeText": false,
                "displayOrder": 5
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r29_f1",
            "label": "Push tool 점수: 총점",
            "type": "computed",
            "description": "욕창 위험 평가도구를 이용하여 정기적인 재평가를 수행한다.",
            "aiHint": "Push tool 점수: 총점: ( ) 점",
            "inputSources": [
              "AUTO"
            ],
            "sourceRow": 29,
            "sourceDefinition": "Push tool 점수: 총점: ( ) 점",
            "displayOrder": 11,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "Dressing-Recommendation",
        "title": "Dressing Recommendation",
        "displayOrder": 15,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r30_f1",
            "label": "Dressing cycle",
            "type": "single_select",
            "description": "욕창이 발생한 환자에게 욕창 관리활동을 수행한다.",
            "aiHint": "Dressing cycle(범주형 - BID/QD/QOD/Q3D/Prevention dressing/기타) & if 기타 ==",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 30,
            "sourceDefinition": "Dressing cycle(범주형 - BID/QD/QOD/Q3D/Prevention dressing/기타) & if 기타 ==",
            "displayOrder": 1,
            "options": [
              {
                "optionKey": "BID",
                "label": "BID",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "QD",
                "label": "QD",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "QOD",
                "label": "QOD",
                "allowFreeText": false,
                "displayOrder": 3
              },
              {
                "optionKey": "Q3D",
                "label": "Q3D",
                "allowFreeText": false,
                "displayOrder": 4
              },
              {
                "optionKey": "Prevention dressing",
                "label": "Prevention dressing",
                "allowFreeText": false,
                "displayOrder": 5
              },
              {
                "optionKey": "기타",
                "label": "기타",
                "allowFreeText": false,
                "displayOrder": 6
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r30_f2",
            "label": "yes",
            "type": "text_long",
            "description": "욕창이 발생한 환자에게 욕창 관리활동을 수행한다.",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 30,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 2,
            "options": [],
            "conditions": []
          },
          {
            "fieldKey": "r31_f1",
            "label": "Wound bed preparation",
            "type": "single_select",
            "description": "욕창이 발생한 환자에게 욕창 관리활동을 수행한다.",
            "aiHint": "Wound bed preparation(범주형 - Saline cleansing/Betadine cleansing/Debridement)",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 31,
            "sourceDefinition": "Wound bed preparation(범주형 - Saline cleansing/Betadine cleansing/Debridement)",
            "displayOrder": 3,
            "options": [
              {
                "optionKey": "Saline cleansing",
                "label": "Saline cleansing",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "Betadine cleansing",
                "label": "Betadine cleansing",
                "allowFreeText": false,
                "displayOrder": 2
              },
              {
                "optionKey": "Debridement",
                "label": "Debridement",
                "allowFreeText": false,
                "displayOrder": 3
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r32_f1",
            "label": "Dressing",
            "type": "single_select",
            "description": "욕창이 발생한 환자에게 욕창 관리활동을 수행한다.",
            "aiHint": "Dressing(범주형 - Gauze soaking (Saline/Betadine)/ Pad/Silicone Foam/Non adhesive Foam/Hydrofiber/Hydrocolloid/NPWT/기타) & if NPWT or 기타 ==",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 32,
            "sourceDefinition": "Dressing(범주형 - Gauze soaking (Saline/Betadine)/ Pad/Silicone Foam/Non adhesive Foam/Hydrofiber/Hydrocolloid/NPWT/기타) & if NPWT or 기타 ==",
            "displayOrder": 4,
            "options": [
              {
                "optionKey": "Gauze soaking (Saline",
                "label": "Gauze soaking (Saline",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "Betadine",
                "label": "Betadine",
                "allowFreeText": false,
                "displayOrder": 2
              }
            ],
            "conditions": []
          },
          {
            "fieldKey": "r32_f2",
            "label": "yes",
            "type": "text_long",
            "description": "욕창이 발생한 환자에게 욕창 관리활동을 수행한다.",
            "aiHint": "yes (자유서술형 입력 가능)",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 32,
            "sourceDefinition": "yes (자유서술형 입력 가능)",
            "displayOrder": 5,
            "options": [],
            "conditions": []
          }
        ]
      },
      {
        "sectionKey": "Intervention",
        "title": "Intervention",
        "displayOrder": 16,
        "repeatable": false,
        "fields": [
          {
            "fieldKey": "r33_f1",
            "label": "Intervention",
            "type": "single_select",
            "description": "욕창이 발생한 환자에게 욕창 관리활동을 수행한다.",
            "aiHint": "범주형 - 체위변경 격려, 지지면 확인(공기침대 확인), 피부보호, 실금과 습기관리/환자 안위증진, 시트 교환 등 일반간호 /드레싱 적용/보호자 상담 및 교육: 현재 욕창 상태 설명, 치료계획 공유 및 관리방법 교육/교육평가(이해함/이해못함/재교육 필요)",
            "inputSources": [
              "EMR",
              "MANUAL"
            ],
            "sourceRow": 33,
            "sourceDefinition": "범주형 - 체위변경 격려, 지지면 확인(공기침대 확인), 피부보호, 실금과 습기관리/환자 안위증진, 시트 교환 등 일반간호 /드레싱 적용/보호자 상담 및 교육: 현재 욕창 상태 설명, 치료계획 공유 및 관리방법 교육/교육평가(이해함/이해못함/재교육 필요)",
            "displayOrder": 1,
            "options": [
              {
                "optionKey": "체위변경 격려",
                "label": "체위변경 격려",
                "allowFreeText": false,
                "displayOrder": 1
              },
              {
                "optionKey": "지지면 확인(공기침대 확인",
                "label": "지지면 확인(공기침대 확인",
                "allowFreeText": false,
                "displayOrder": 2
              }
            ],
            "conditions": []
          }
        ]
      }
    ]
  }
];
