/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Category = 'certification' | 'activity' | 'competition' | 'custom';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

export interface GoalEvent {
  id: string;
  title: string;
  date: string; // ISO string
  type: 'exam' | 'schedule' | 'deadline';
}

export interface Goal {
  id: string;
  title: string;
  category: Category;
  description: string;
  progress: number;
  tasks: Task[];
  info?: string;
  deadline?: string;
  events?: GoalEvent[];
  createdAt: string;
}

export interface User {
  name: string;
  school: string;
  grade: string;
  location: string;
}

export interface StudyGroup {
  id: string;
  goalId: string;
  title: string;
  location: string;
  members: string[];
  maxMembers: number;
  description: string;
  createdAt: string;
}

export interface Review {
  id: string;
  goalTitle: string;
  author: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prepPeriod: string;
  studyMethod: string;
  content: string;
  rating: number;
  createdAt: string;
}

export interface ExploreItem {
  id: string;
  title: string;
  category: Category;
  tags: string[];
  description: string;
  link?: string;
}
