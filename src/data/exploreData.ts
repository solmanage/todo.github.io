/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExploreItem } from '../types';

export const exploreItems: ExploreItem[] = [
  {
    id: 'cert-1',
    title: 'TOEIC (토익)',
    category: 'certification',
    tags: ['영어', '공인인증', '필수'],
    description: '취업의 기본이 되는 영어 공인인증 시험입니다.',
  },
  {
    id: 'cert-2',
    title: '컴퓨터활용능력 1급',
    category: 'certification',
    tags: ['IT', '국가기술자격', '사무'],
    description: '엑셀과 엑세스 능력을 평가하는 국가기술자격증입니다.',
  },
  {
    id: 'cert-3',
    title: 'SQLD',
    category: 'certification',
    tags: ['데이터', 'IT', '개발'],
    description: '데이터베이스 SQL 활용 능력을 검증하는 자격증입니다.',
  },
  {
    id: 'act-1',
    title: 'KOICA 해외봉사단',
    category: 'activity',
    tags: ['해외활동', '봉사', '정부지원'],
    description: '한국국제협력단에서 운영하는 글로벌 봉사 활동입니다.',
  },
  {
    id: 'act-2',
    title: '네이버 커넥트재단 부스트캠프',
    category: 'activity',
    tags: ['IT', '코딩', '무료교육'],
    description: '실무 역량 중심의 소프트웨어 엔지니어 양성 과정입니다.',
  },
  {
    id: 'comp-1',
    title: '현대자동차 자율주행 경진대회',
    category: 'competition',
    tags: ['모빌리티', 'AI', '대회'],
    description: '자율주행 소프트웨어 역량을 겨루는 대학생 경진대회입니다.',
  },
  {
    id: 'comp-2',
    title: '제일기획 아이디어 페스티벌',
    category: 'competition',
    tags: ['광고', '기획', '마케팅'],
    description: '국내 최대 규모의 대학생 광고 공모전입니다.',
  },
];
