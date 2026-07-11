import { CompletedQuestion } from '../firebase';
import { INSURANCE_SCHEMA } from '../constants';

export interface TopicPracticed {
  topic: string;
  count: number;
}

export function analyzeTopicDistribution(completed: CompletedQuestion[]): TopicPracticed[] {
  const topics = INSURANCE_SCHEMA.map(t => t.name);
  const distribution: Record<string, number> = {};
  
  // Initialize topics
  topics.forEach(t => distribution[t] = 0);
  
  // Count topics in completed questions
  // We look for table names in descriptions or titles
  completed.forEach(item => {
    const text = (item.questionTitle + ' ' + item.questionDescription + ' ' + (item.userSql || '')).toLowerCase();
    topics.forEach(t => {
      if (text.includes(t.toLowerCase())) {
        distribution[t]++;
      }
    });
  });
  
  return Object.entries(distribution)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => a.count - b.count); // Lowest count first
}

export function getUnderPracticedTopics(completed: CompletedQuestion[], limit: number = 3): string[] {
  const distribution = analyzeTopicDistribution(completed);
  return distribution.slice(0, limit).map(d => d.topic);
}
