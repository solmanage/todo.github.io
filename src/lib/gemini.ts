/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function getGoalInformation(goalName: string, description: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    return `"${goalName}"에 대한 정보를 찾을 수 없습니다. (API 키 필요)`;
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `대학생 커리어 목표: "${goalName}" (${description})
이 목표(자격증, 대외활동, 공모전 등)에 대해 다음 정보를 상세히 알려줘:
1. 주요 일정 (접수 기간, 시험/활동 일자) - 가능한 최신 정보 기준
2. 응시료 또는 참가비
3. 준비 난이도 및 평균 준비 기간
4. 주요 평가 항목 또는 시험 과목
5. 달성 시 혜택 (가산점, 상금 등)
6. 대학생을 위한 꿀팁

답변은 깔끔한 Markdown 형식으로 작성해줘.`,
    });

    return response.text || "정보를 불러오는 데 실패했습니다.";
  } catch (error) {
    console.error("Error getting goal info:", error);
    return "정보를 가져오는 중 오류가 발생했습니다. 나중에 다시 시도해주세요.";
  }
}
